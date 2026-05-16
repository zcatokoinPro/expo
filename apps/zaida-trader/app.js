const RATES = {
  'SOL-ZAIDA': 42000,
  'USDC-ZAIDA': 36500,
  'ZAIDA-SOL': 1 / 42000,
  'ZAIDA-USDC': 1 / 36500,
  'SOL-USDC': 155,
  'USDC-SOL': 1 / 155,
};

const TOKENS = [
  { symbol: 'ZAIDA', price: 0.000027, change: 4.2 },
  { symbol: 'SOL', price: 155, change: 1.4 },
  { symbol: 'USDC', price: 1, change: 0 },
];

const quoteEl = document.getElementById('quote');
const watchlistEl = document.getElementById('watchlist');
const form = document.getElementById('swap-form');

function renderWatchlist() {
  watchlistEl.innerHTML = TOKENS.map(({ symbol, price, change }) => {
    const signal = change >= 0 ? '▲' : '▼';
    return `<p><strong>${symbol}</strong> $${price.toLocaleString()} <span>${signal} ${Math.abs(change)}%</span></p>`;
  }).join('');
}

function getRate(from, to) {
  if (from === to) return 1;
  return RATES[`${from}-${to}`] ?? 0;
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const from = document.getElementById('fromToken').value;
  const to = document.getElementById('toToken').value;
  const amount = Number(document.getElementById('amount').value);
  const rate = getRate(from, to);

  if (!amount || rate === 0) {
    quoteEl.textContent = 'Pair not supported in demo quote engine.';
    return;
  }

  const output = amount * rate;
  quoteEl.textContent = `${amount.toLocaleString()} ${from} ≈ ${output.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })} ${to}`;
});

renderWatchlist();
