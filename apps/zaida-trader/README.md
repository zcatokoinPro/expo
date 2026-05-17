# ZAIDA Trade Desk Pro Demo

A significantly more robust single-page trading simulator inspired by Jupiter/Phantom workflows.

## Included capabilities

- Wallet-style connect/disconnect interaction
- Trade settings dialog (slippage + priority fee tier)
- Route comparison panel with multiple simulated paths
- Swap panel with pair flipping and estimated output
- Portfolio balances and market watch sidebars
- Recent activity feed for simulated swaps
- Safety notice clarifying this is a non-custodial demo

## Run locally

```bash
cd apps/zaida-trader
python3 -m http.server 4180
```

Open:

- <http://127.0.0.1:4180/index.html>

## What this is / is not

- ✅ UX and product shell for feedback/testing
- ✅ A stronger architecture foundation than the initial basic starter
- ❌ Not connected to real wallets or Jupiter APIs yet
- ❌ Not executing real transactions

## Next production integrations

1. Solana wallet-adapter integration (Phantom/Solflare/Backpack)
2. Jupiter quote + swap API integration
3. On-chain transaction status and explorer deep links
4. Token metadata/logo list + search
5. Backend service for caching quotes and route analytics
