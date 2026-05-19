import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';

import authRouter, { verifyToken } from './auth.js';
import ordersRouter, { tryFillPendingLimits } from './orders.js';
import portfolioRouter, { snapshotAllPortfolios } from './portfolio.js';
import { market, SYMBOLS } from './market.js';
import { setIo } from './notify.js';

const app = express();
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));
app.use(express.json());

app.get('/api/health', (_, res) => res.json({ ok: true, symbols: SYMBOLS, mode: process.env.FINNHUB_API_KEY ? 'finnhub' : 'simulated' }));

app.use('/api/auth', authRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/portfolio', portfolioRouter);

app.get('/api/market/symbols', (_, res) => res.json(SYMBOLS));
app.get('/api/market/snapshot', (_, res) => res.json(market.getSnapshot()));
app.get('/api/market/profile/:symbol', async (req, res) => {
  try {
    const profile = await market.getProfile(req.params.symbol);
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/api/market/news', async (_, res) => {
  try {
    res.json(await market.getNews());
  } catch {
    res.json([]);
  }
});
app.get('/api/market/top-returns', (req, res) => {
  res.json(market.getTopReturns(req.query.period || '1Y'));
});
app.get('/api/macro/inflation', async (_, res) => {
  try {
    res.json(await market.getInflation());
  } catch {
    res.json({});
  }
});
app.get('/api/market/history/:symbol', (req, res) => {
  const tf = req.query.timeframe || '1D';
  res.json(market.getHistory(req.params.symbol, tf));
});
app.get('/api/market/orderbook/:symbol', (req, res) => res.json(market.getOrderBook(req.params.symbol)));
app.get('/api/market/trades', (_, res) => res.json(market.getRecentTrades()));

const httpServer = createServer(app);
const io = new SocketServer(httpServer, { cors: { origin: '*' } });

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next();
  const decoded = verifyToken(token);
  if (decoded) socket.data.user = decoded;
  next();
});

io.on('connection', (socket) => {
  if (socket.data.user?.id) socket.join(`user:${socket.data.user.id}`);
  socket.emit('snapshot', market.getSnapshot());
  socket.emit('trades', market.getRecentTrades());

  socket.on('subscribe-book', (symbol) => {
    if (typeof symbol !== 'string') return;
    socket.data.bookSymbol = symbol.toUpperCase();
    socket.emit('orderbook', { symbol: socket.data.bookSymbol, ...market.getOrderBook(socket.data.bookSymbol) });
  });
});

setIo(io);

market.on('tick', (tick) => {
  io.emit('tick', tick);
  for (const [, sock] of io.sockets.sockets) {
    if (sock.data.bookSymbol === tick.symbol) {
      sock.emit('orderbook', { symbol: tick.symbol, ...market.getOrderBook(tick.symbol) });
    }
  }
});
market.on('trade', (trade) => io.emit('trade', trade));

setInterval(() => tryFillPendingLimits(), 2000);
setInterval(() => snapshotAllPortfolios(), 60_000);
setTimeout(() => snapshotAllPortfolios(), 2000);

market.start();

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] market mode: ${process.env.FINNHUB_API_KEY ? 'finnhub' : 'simulated'}`);
});
