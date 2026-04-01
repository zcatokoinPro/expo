"""
MOMENTUM DAY TRADER v1.1
Built for Alpaca Paper Trading with the Lumibot framework.
Strategy: RSI + MACD + Volume confluence on 5-minute bars.
"""

from datetime import datetime, timedelta

import numpy as np
from lumibot.backtesting import YahooDataBacktesting
from lumibot.brokers import Alpaca
from lumibot.strategies import Strategy
from lumibot.traders import Trader

# ============================================================
# ALPACA CREDENTIALS — Replace with your paper trading keys
# Get them at: https://app.alpaca.markets/paper/dashboard/overview
# ============================================================
ALPACA_CONFIG = {
    "API_KEY": "YOUR_PAPER_API_KEY",
    "API_SECRET": "YOUR_PAPER_API_SECRET",
    "PAPER": True,  # KEEP THIS TRUE — never go live without backtesting
}


class MomentumDayTrader(Strategy):
    """Confluence-based intraday momentum strategy.

    BUY conditions (all required):
    - RSI crosses up through oversold level (30)
    - MACD histogram flips from <= 0 to > 0
    - Current 5-minute volume is > 1.5x 20-bar average

    EXIT conditions:
    - Profit target (1.5%)
    - Stop loss (0.75%)
    - End-of-day liquidation
    """

    parameters = {
        "symbols": ["AAPL", "NVDA", "MSFT", "META", "GOOGL", "AMZN", "QQQ", "SPY"],
        "rsi_period": 14,
        "rsi_oversold": 30,
        "rsi_overbought": 70,
        "macd_fast": 12,
        "macd_slow": 26,
        "macd_signal": 9,
        "volume_multiplier": 1.5,
        "volume_lookback": 20,
        "profit_target_pct": 0.015,
        "stop_loss_pct": 0.0075,
        "max_position_pct": 0.10,
        "max_positions": 4,
        "market_open_buffer_min": 15,
        "market_close_buffer_min": 30,
    }

    def initialize(self):
        self.sleeptime = "1M"
        self.entry_prices = {}
        self.daily_trades = 0
        self.max_daily_trades = 10

    def on_trading_iteration(self):
        current_dt = self.get_datetime()
        market_open = current_dt.replace(hour=9, minute=30, second=0, microsecond=0)
        market_close = current_dt.replace(hour=16, minute=0, second=0, microsecond=0)

        buffer_open = market_open + timedelta(minutes=self.parameters["market_open_buffer_min"])
        buffer_close = market_close - timedelta(minutes=self.parameters["market_close_buffer_min"])

        if current_dt >= buffer_close:
            self._close_all_positions("EOD liquidation")
            return

        if current_dt < buffer_open:
            return

        self._manage_exits()

        if len(self.get_positions()) >= self.parameters["max_positions"]:
            return

        if self.daily_trades >= self.max_daily_trades:
            return

        for symbol in self.parameters["symbols"]:
            if self.get_position(symbol) is not None:
                continue

            if self._check_entry_signal(symbol) == "BUY":
                self._execute_entry(symbol)

    @staticmethod
    def _compute_rsi(prices, period=14):
        delta = prices.diff()
        gain = delta.where(delta > 0, 0.0)
        loss = -delta.where(delta < 0, 0.0)

        avg_gain = gain.rolling(window=period, min_periods=period).mean()
        avg_loss = loss.rolling(window=period, min_periods=period).mean()

        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))

    @staticmethod
    def _compute_macd(prices, fast=12, slow=26, signal=9):
        ema_fast = prices.ewm(span=fast, adjust=False).mean()
        ema_slow = prices.ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        return macd_line, signal_line, histogram

    def _check_entry_signal(self, symbol):
        try:
            # Pull enough 1-min bars to build stable 5-min indicators.
            bars = self.get_historical_prices(symbol, 300, "minute", quote=self.quote_asset)
            if bars is None or bars.df.empty:
                return None

            df = bars.df[["close", "volume"]].copy()
            if len(df) < 60:
                return None

            # Build canonical 5-minute bars from 1-minute feed.
            df_5m = (
                df.resample("5min")
                .agg({"close": "last", "volume": "sum"})
                .dropna()
            )
            if len(df_5m) < max(30, self.parameters["volume_lookback"] + 2):
                return None

            close = df_5m["close"]
            volume = df_5m["volume"]

            rsi = self._compute_rsi(close, self.parameters["rsi_period"])
            if np.isnan(rsi.iloc[-1]) or np.isnan(rsi.iloc[-2]):
                return None

            rsi_current = rsi.iloc[-1]
            rsi_prev = rsi.iloc[-2]
            rsi_cross_up = rsi_prev <= self.parameters["rsi_oversold"] and rsi_current > self.parameters["rsi_oversold"]

            _, _, histogram = self._compute_macd(
                close,
                self.parameters["macd_fast"],
                self.parameters["macd_slow"],
                self.parameters["macd_signal"],
            )
            macd_bullish = histogram.iloc[-1] > 0 and histogram.iloc[-2] <= 0

            avg_volume = volume.rolling(window=self.parameters["volume_lookback"]).mean().iloc[-1]
            if np.isnan(avg_volume):
                return None

            volume_surge = volume.iloc[-1] > avg_volume * self.parameters["volume_multiplier"]

            if rsi_cross_up and macd_bullish and volume_surge:
                self.log_message(
                    f"SIGNAL: {symbol} | RSI: {rsi_current:.1f} | "
                    f"MACD Hist: {histogram.iloc[-1]:.4f} | "
                    f"Vol: {volume.iloc[-1]:.0f} vs Avg: {avg_volume:.0f}"
                )
                return "BUY"

            return None

        except Exception as exc:
            self.log_message(f"Error checking {symbol}: {exc}")
            return None

    def _execute_entry(self, symbol):
        last_price = self.get_last_price(symbol)
        if last_price is None or last_price <= 0:
            return

        portfolio_value = self.get_portfolio_value()
        max_position_value = portfolio_value * self.parameters["max_position_pct"]
        quantity = int(max_position_value / last_price)
        if quantity < 1:
            return

        order = self.create_order(symbol, quantity, "buy")
        self.submit_order(order)

        self.entry_prices[symbol] = last_price
        self.daily_trades += 1

        self.log_message(
            f"ENTRY: {symbol} | Qty: {quantity} | "
            f"Price: ${last_price:.2f} | "
            f"TP: ${last_price * (1 + self.parameters['profit_target_pct']):.2f} | "
            f"SL: ${last_price * (1 - self.parameters['stop_loss_pct']):.2f}"
        )

    def _manage_exits(self):
        for position in self.get_positions():
            symbol = position.symbol
            if symbol not in self.entry_prices:
                continue

            current_price = self.get_last_price(symbol)
            entry_price = self.entry_prices[symbol]
            if current_price is None:
                continue

            pnl_pct = (current_price - entry_price) / entry_price

            if pnl_pct >= self.parameters["profit_target_pct"]:
                self.log_message(
                    f"TAKE PROFIT: {symbol} | Entry: ${entry_price:.2f} | "
                    f"Exit: ${current_price:.2f} | P&L: {pnl_pct * 100:.2f}%"
                )
                self.sell_all(symbol)
                del self.entry_prices[symbol]
            elif pnl_pct <= -self.parameters["stop_loss_pct"]:
                self.log_message(
                    f"STOP LOSS: {symbol} | Entry: ${entry_price:.2f} | "
                    f"Exit: ${current_price:.2f} | P&L: {pnl_pct * 100:.2f}%"
                )
                self.sell_all(symbol)
                del self.entry_prices[symbol]

    def _close_all_positions(self, reason):
        for position in self.get_positions():
            symbol = position.symbol
            self.log_message(f"CLOSING {symbol}: {reason}")
            self.sell_all(symbol)
        self.entry_prices = {}

    def on_abrupt_closing(self):
        self._close_all_positions("Abrupt shutdown")

    def before_market_opens(self):
        self.daily_trades = 0
        self.entry_prices = {}
        self.log_message("=== NEW TRADING DAY ===")


if __name__ == "__main__":
    MODE = "backtest"  # Change to "live" only for paper trading.

    if MODE == "backtest":
        backtesting_start = datetime(2024, 1, 1)
        backtesting_end = datetime(2025, 12, 31)

        results = MomentumDayTrader.backtest(
            YahooDataBacktesting,
            backtesting_start,
            backtesting_end,
            budget=100000,
            parameters={"symbols": ["QQQ", "SPY", "AAPL", "NVDA"]},
        )
        print(results)

    elif MODE == "live":
        broker = Alpaca(ALPACA_CONFIG)
        strategy = MomentumDayTrader(broker=broker)
        trader = Trader()
        trader.add_strategy(strategy)
        trader.run_all()
