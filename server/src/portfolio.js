import { Router } from 'express';
import { db } from './db.js';
import { authMiddleware } from './auth.js';
import { market } from './market.js';

const router = Router();

function computePortfolio(userId) {
  const user = db.prepare('SELECT cash FROM users WHERE id = ?').get(userId);
  if (!user) return null;
  const positions = db.prepare('SELECT symbol, quantity, avg_price FROM positions WHERE user_id = ?').all(userId);

  let invested = 0;
  let marketValue = 0;
  const enriched = positions.map((p) => {
    const cur = market.getPrice(p.symbol) || p.avg_price;
    const value = cur * p.quantity;
    const cost = p.avg_price * p.quantity;
    invested += cost;
    marketValue += value;
    return {
      symbol: p.symbol,
      quantity: p.quantity,
      avgPrice: +p.avg_price.toFixed(2),
      currentPrice: +cur.toFixed(2),
      marketValue: +value.toFixed(2),
      pnl: +(value - cost).toFixed(2),
      pnlPercent: cost > 0 ? +(((value - cost) / cost) * 100).toFixed(2) : 0,
    };
  });

  const totalValue = user.cash + marketValue;

  const dayStartMs = new Date();
  dayStartMs.setHours(0, 0, 0, 0);
  const openSnap = db.prepare(
    'SELECT total_value FROM portfolio_snapshots WHERE user_id = ? AND ts >= ? ORDER BY ts ASC LIMIT 1'
  ).get(userId, dayStartMs.getTime());
  const openingValue = openSnap?.total_value ?? totalValue;
  const todayPnl = totalValue - openingValue;
  const todayPnlPercent = openingValue > 0 ? (todayPnl / openingValue) * 100 : 0;

  return {
    cash: +user.cash.toFixed(2),
    invested: +invested.toFixed(2),
    marketValue: +marketValue.toFixed(2),
    totalValue: +totalValue.toFixed(2),
    totalPnl: +(marketValue - invested).toFixed(2),
    todayPnl: +todayPnl.toFixed(2),
    todayPnlPercent: +todayPnlPercent.toFixed(2),
    openingValue: +openingValue.toFixed(2),
    positions: enriched,
  };
}

router.get('/', authMiddleware, (req, res) => {
  const p = computePortfolio(req.user.id);
  if (!p) return res.status(404).json({ error: 'user not found' });
  res.json(p);
});

router.get('/history', authMiddleware, (req, res) => {
  const since = parseInt(req.query.since, 10) || (Date.now() - 24 * 60 * 60 * 1000);
  const rows = db.prepare(
    'SELECT ts, cash, invested, market_value as marketValue, total_value as totalValue FROM portfolio_snapshots WHERE user_id = ? AND ts >= ? ORDER BY ts ASC'
  ).all(req.user.id, since);
  res.json(rows);
});

router.get('/watchlist', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT symbol FROM watchlist WHERE user_id = ?').all(req.user.id);
  const enriched = rows.map((r) => {
    const price = market.getPrice(r.symbol);
    return { symbol: r.symbol, price: price ? +price.toFixed(2) : null };
  });
  res.json(enriched);
});

router.post('/watchlist', authMiddleware, (req, res) => {
  const sym = String(req.body?.symbol || '').toUpperCase().trim();
  if (!sym) return res.status(400).json({ error: 'symbol required' });
  db.prepare('INSERT OR IGNORE INTO watchlist (user_id, symbol) VALUES (?, ?)').run(req.user.id, sym);
  res.json({ symbol: sym });
});

router.delete('/watchlist/:symbol', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM watchlist WHERE user_id = ? AND symbol = ?').run(req.user.id, req.params.symbol.toUpperCase());
  res.json({ ok: true });
});

router.post('/watchlist/bulk', authMiddleware, (req, res) => {
  const syms = Array.isArray(req.body?.symbols) ? req.body.symbols : [];
  const clean = syms
    .map((s) => String(s || '').toUpperCase().trim())
    .filter((s) => /^[A-Z.\-]{1,8}$/.test(s));
  const ins = db.prepare('INSERT OR IGNORE INTO watchlist (user_id, symbol) VALUES (?, ?)');
  const tx = db.transaction(() => clean.forEach((s) => ins.run(req.user.id, s)));
  tx();
  res.json({ added: clean.length });
});

export function snapshotAllPortfolios() {
  const users = db.prepare('SELECT id FROM users').all();
  const insert = db.prepare(
    'INSERT INTO portfolio_snapshots (user_id, ts, cash, invested, market_value, total_value) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const ts = Date.now();
  for (const u of users) {
    const p = computePortfolio(u.id);
    if (p) insert.run(u.id, ts, p.cash, p.invested, p.marketValue, p.totalValue);
  }
  const cutoff = ts - 7 * 24 * 60 * 60 * 1000;
  db.prepare('DELETE FROM portfolio_snapshots WHERE ts < ?').run(cutoff);
}

export default router;
