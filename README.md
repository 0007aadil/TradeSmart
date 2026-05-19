# TradeSmart — Real-Time Stock Trading Dashboard

A full-stack simulated trading platform with live prices, candlestick charts, order book depth, simulated order execution, and portfolio tracking.

## Stack
- **Frontend:** React + Vite, React Router, Lightweight Charts, Recharts, Socket.io client
- **Backend:** Node.js + Express, Socket.io, SQLite (better-sqlite3), JWT auth
- **Data:** Finnhub (live quotes) with simulated random-walk fallback

## Setup

```bash
# 1. Backend
cd server
npm install
cp .env.example .env
# Optional: add your FINNHUB_API_KEY to .env (get a free key at https://finnhub.io)
npm run dev          # http://localhost:4000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev          # http://localhost:5173
```

Open http://localhost:5173 and sign up — you'll start with $100,000 in virtual cash.

## What you get

- **Landing page** with live ticker, Login/Sign Up buttons
- **Auth flow:** signup, login, JWT stored in localStorage, protected routes
- **Dashboard:**
  - Watchlist with live prices (color-coded)
  - Interactive candlestick chart with 20-period SMA and 1D/1W/1M/3M/1Y timeframes
  - Buy/Sell order panel for Market and Limit orders
  - Real-time order book with bid/ask depth bars
  - Live recent-trades feed
  - Portfolio summary card
- **Portfolio page:** positions table with P&L, sector allocation pie chart
- **Order History:** all orders with cancel for pending limit orders

## Notes
- Without a Finnhub key the server generates plausible simulated ticks every 1.5s — fully functional offline.
- Limit orders fill automatically when the live price crosses the limit (checked every 2s).
- SQLite database file `server/data.db` is created on first run.
