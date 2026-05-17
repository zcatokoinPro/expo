# ZAIDA QUANT NEXUS

Enterprise-style trading dashboard simulation with far broader utility and stronger UX than the earlier starter.

## What changed

- Renamed product shell to **ZAIDA QUANT NEXUS**
- Upgraded interface density and panel architecture
- Added execution metrics including latency, impact, max position checks
- Added risk controls (slippage, fee tier, max position)
- Added utility stack preview modules for roadmap clarity
- Added theme toggle and richer operations feed

## Run

```bash
cd apps/zaida-trader
python3 -m http.server 4180
```

Open `http://127.0.0.1:4180/index.html`

## Functional test flow

1. Connect wallet
2. Set risk profile in **Risk** dialog
3. Enter amount and click **Quote**
4. Review Smart Routes and Execution metrics
5. Click **Execute Sim** and inspect Ops Feed
6. Toggle theme and flip pair

## Production next steps

- integrate real Solana wallet-adapter
- integrate Jupiter quote/swap endpoints
- integrate signed transaction lifecycle and on-chain confirmations
