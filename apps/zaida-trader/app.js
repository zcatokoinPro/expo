const TOKENS = [
  { symbol: 'ZAIDA', price: 0.000027, change24h: 6.4, balance: 1234567 },
  { symbol: 'SOL', price: 158.24, change24h: 1.3, balance: 8.14 },
  { symbol: 'USDC', price: 1, change24h: 0, balance: 4900 },
  { symbol: 'BONK', price: 0.000032, change24h: -3.1, balance: 900000 },
];

const RATE_TABLE = {
  'SOL-ZAIDA': 5860740,
  'USDC-ZAIDA': 37037,
  'ZAIDA-SOL': 0.00000017,
  'ZAIDA-USDC': 0.000027,
  'SOL-USDC': 158,
  'USDC-SOL': 0.00632,
  'BONK-ZAIDA': 1.18,
  'ZAIDA-BONK': 0.847,
};

const state = {
  walletConnected: false,
  walletAddress: '',
  slippage: 0.5,
  feeTier: 'Medium',
  routes: [],
  activity: [],
};

const fromToken = document.getElementById('fromToken');
const toToken = document.getElementById('toToken');
const fromAmount = document.getElementById('fromAmount');
const toAmount = document.getElementById('toAmount');
const quoteStatus = document.getElementById('quoteStatus');

function optionMarkup(token) {
  return `<option value="${token.symbol}">${token.symbol}</option>`;
}

function initializeTokens() {
  fromToken.innerHTML = TOKENS.map(optionMarkup).join('');
  toToken.innerHTML = TOKENS.map(optionMarkup).join('');
  fromToken.value = 'SOL';
  toToken.value = 'ZAIDA';
}

function formatMoney(value) {
  return value >= 1 ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value.toFixed(8);
}

function renderBalances() {
  const container = document.getElementById('balances');
  container.innerHTML = TOKENS.map(token => {
    const usd = token.balance * token.price;
    return `<div class="item-row"><span>${token.symbol}</span><strong>${formatMoney(token.balance)} <small>($${formatMoney(usd)})</small></strong></div>`;
  }).join('');
}

function renderWatchlist() {
  const container = document.getElementById('watchlist');
  container.innerHTML = TOKENS.map(token => {
    const direction = token.change24h >= 0 ? '▲' : '▼';
    return `<div class="item-row"><span>${token.symbol}</span><strong>$${formatMoney(token.price)} ${direction} ${Math.abs(token.change24h)}%</strong></div>`;
  }).join('');
}

function generateRoutes(from, to, amount) {
  const base = RATE_TABLE[`${from}-${to}`] || 0;
  if (!base) return [];

  const output = amount * base;
  return [
    { name: 'Jupiter Ultra Route', hops: 1, impact: 0.12, fee: 0.0009, out: output },
    { name: 'Hybrid AMM Route', hops: 2, impact: 0.21, fee: 0.0016, out: output * 0.9988 },
    { name: 'Stable Priority Route', hops: 3, impact: 0.28, fee: 0.0019, out: output * 0.9981 },
  ];
}

function renderRoutes() {
  const container = document.getElementById('routes');
  if (!state.routes.length) {
    container.innerHTML = '<p class="muted">No quote yet. Request quote to compare routes.</p>';
    return;
  }

  container.innerHTML = state.routes.map((route, idx) => `
    <div class="route-card">
      <span>${idx + 1}. ${route.name}<br /><small>${route.hops} hop(s)</small></span>
      <strong>${formatMoney(route.out)} ${toToken.value}<br /><small>fee ${route.fee.toFixed(4)} SOL</small></strong>
    </div>
  `).join('');
}

function renderActivity() {
  const container = document.getElementById('activity');
  if (!state.activity.length) {
    container.innerHTML = '<p class="muted">No simulated swaps yet.</p>';
    return;
  }

  container.innerHTML = state.activity.slice(0, 6).map(item => `<div class="item-row"><span>${item.time}</span><strong>${item.text}</strong></div>`).join('');
}

function updateQuoteMetrics(bestRoute) {
  document.getElementById('bestRoute').textContent = bestRoute?.name || '—';
  document.getElementById('priceImpact').textContent = bestRoute ? `${bestRoute.impact.toFixed(2)}%` : '—';
  document.getElementById('feeLabel').textContent = bestRoute ? `${bestRoute.fee.toFixed(4)} SOL` : '—';
}

function doQuote() {
  if (!state.walletConnected) {
    quoteStatus.textContent = 'Connect wallet first.';
    return;
  }

  const amount = Number(fromAmount.value);
  if (!amount || amount <= 0) {
    quoteStatus.textContent = 'Enter valid amount.';
    return;
  }

  state.routes = generateRoutes(fromToken.value, toToken.value, amount);
  const best = state.routes[0];

  if (!best) {
    quoteStatus.textContent = 'Pair unavailable in demo engine.';
    toAmount.value = '';
    updateQuoteMetrics(null);
    renderRoutes();
    return;
  }

  toAmount.value = formatMoney(best.out * (1 - state.slippage / 100));
  quoteStatus.textContent = `Quote ready with ${state.routes.length} route(s).`;
  updateQuoteMetrics(best);
  renderRoutes();
}

function simulateSwap() {
  if (!state.routes.length) {
    quoteStatus.textContent = 'Request quote before swap.';
    return;
  }
  const best = state.routes[0];
  const event = {
    time: new Date().toLocaleTimeString(),
    text: `${fromAmount.value} ${fromToken.value} → ${formatMoney(best.out)} ${toToken.value}`,
  };
  state.activity.unshift(event);
  quoteStatus.textContent = `Swap simulated successfully (${event.time}).`;
  renderActivity();
}

function toggleWallet() {
  state.walletConnected = !state.walletConnected;
  const button = document.getElementById('walletButton');

  if (state.walletConnected) {
    state.walletAddress = '5Dy...ZAIDA...9Xp';
    button.textContent = state.walletAddress;
    quoteStatus.textContent = 'Wallet connected. Ready to quote.';
  } else {
    button.textContent = 'Connect Wallet';
    state.walletAddress = '';
    quoteStatus.textContent = 'Wallet disconnected.';
  }
}

function bindEvents() {
  document.getElementById('walletButton').addEventListener('click', toggleWallet);
  document.getElementById('quoteButton').addEventListener('click', doQuote);
  document.getElementById('swapButton').addEventListener('click', simulateSwap);
  document.getElementById('flipButton').addEventListener('click', () => {
    [fromToken.value, toToken.value] = [toToken.value, fromToken.value];
    doQuote();
  });

  const dialog = document.getElementById('settingsDialog');
  document.getElementById('settingsButton').addEventListener('click', () => dialog.showModal());
  document.getElementById('saveSettings').addEventListener('click', () => {
    state.slippage = Number(document.getElementById('slippageInput').value) || 0.5;
    state.feeTier = document.getElementById('feeTier').value;
    document.getElementById('slippageLabel').textContent = `${state.slippage.toFixed(2)}%`;
    quoteStatus.textContent = `Settings saved: ${state.slippage.toFixed(2)}% slippage, ${state.feeTier} fee.`;
  });
}

initializeTokens();
renderBalances();
renderWatchlist();
renderRoutes();
renderActivity();
bindEvents();
