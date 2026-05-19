import { Router } from 'express';
import { db } from './db.js';
import { authMiddleware } from './auth.js';
import { market } from './market.js';
import { notifyUser } from './notify.js';

const router = Router();

const executeOrder = db.transaction((userId, order, price) => {
  const total = price * order.quantity;
  const user = db.prepare('SELECT cash FROM users WHERE id = ?').get(userId);
  if (!user) throw new Error('user not found');

  if (order.side === 'BUY') {
    if (user.cash < total) throw new Error('insufficient cash');
    db.prepare('UPDATE users SET cash = cash - ? WHERE id = ?').run(total, userId);

    const pos = db.prepare('SELECT quantity, avg_price FROM positions WHERE user_id = ? AND symbol = ?').get(userId, order.symbol);
    if (pos) {
      const newQty = pos.quantity + order.quantity;
      const newAvg = (pos.quantity * pos.avg_price + total) / newQty;
      db.prepare('UPDATE positions SET quantity = ?, avg_price = ? WHERE user_id = ? AND symbol = ?').run(newQty, newAvg, userId, order.symbol);
    } else {
      db.prepare('INSERT INTO positions (user_id, symbol, quantity, avg_price) VALUES (?, ?, ?, ?)').run(userId, order.symbol, order.quantity, price);
    }
  } else {
    const pos = db.prepare('SELECT quantity, avg_price FROM positions WHERE user_id = ? AND symbol = ?').get(userId, order.symbol);
    if (!pos || pos.quantity < order.quantity) throw new Error('insufficient shares');
    db.prepare('UPDATE users SET cash = cash + ? WHERE id = ?').run(total, userId);
    const newQty = pos.quantity - order.quantity;
    if (newQty === 0) db.prepare('DELETE FROM positions WHERE user_id = ? AND symbol = ?').run(userId, order.symbol);
    else db.prepare('UPDATE positions SET quantity = ? WHERE user_id = ? AND symbol = ?').run(newQty, userId, order.symbol);
  }
});

router.post('/', authMiddleware, (req, res) => {
  const { symbol, side, type, quantity, limitPrice } = req.body || {};
  const sym = String(symbol || '').toUpperCase();
  const qty = parseInt(quantity, 10);

  if (!sym || !['BUY', 'SELL'].includes(side) || !['MARKET', 'LIMIT'].includes(type) || !Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ error: 'invalid order' });
  }

  const currentPrice = market.getPrice(sym);
  if (!currentPrice) return res.status(400).json({ error: 'unknown symbol' });

  const userId = req.user.id;

  try {
    if (type === 'MARKET') {
      executeOrder(userId, { symbol: sym, side, quantity: qty }, currentPrice);
      const info = db.prepare(`
        INSERT INTO orders (user_id, symbol, side, type, quantity, limit_price, status, executed_price, executed_at)
        VALUES (?, ?, ?, ?, ?, NULL, 'EXECUTED', ?, datetime('now'))
      `).run(userId, sym, side, type, qty, currentPrice);
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid);
      market.recordTrade({ symbol: sym, price: +currentPrice.toFixed(2), qty, side, time: Date.now() });
      notifyUser(userId, { kind: side === 'BUY' ? 'success' : 'info', message: `${side} ${qty} ${sym} filled at $${currentPrice.toFixed(2)}` });
      return res.json(order);
    }

    const lp = parseFloat(limitPrice);
    if (!Number.isFinite(lp) || lp <= 0) return res.status(400).json({ error: 'limit price required' });

    const shouldFill = (side === 'BUY' && currentPrice <= lp) || (side === 'SELL' && currentPrice >= lp);
    if (shouldFill) {
      executeOrder(userId, { symbol: sym, side, quantity: qty }, currentPrice);
      const info = db.prepare(`
        INSERT INTO orders (user_id, symbol, side, type, quantity, limit_price, status, executed_price, executed_at)
        VALUES (?, ?, ?, ?, ?, ?, 'EXECUTED', ?, datetime('now'))
      `).run(userId, sym, side, type, qty, lp, currentPrice);
      market.recordTrade({ symbol: sym, price: +currentPrice.toFixed(2), qty, side, time: Date.now() });
      notifyUser(userId, { kind: 'success', message: `${side} ${qty} ${sym} limit filled at $${currentPrice.toFixed(2)}` });
      return res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid));
    }

    const info = db.prepare(`
      INSERT INTO orders (user_id, symbol, side, type, quantity, limit_price, status)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(userId, sym, side, type, qty, lp);
    notifyUser(userId, { kind: 'info', message: `${side} ${qty} ${sym} limit @ $${lp.toFixed(2)} placed` });
    res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    notifyUser(userId, { kind: 'error', message: `Order rejected: ${err.message}` });
    res.status(400).json({ error: err.message });
  }
});

router.get('/', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 200').all(req.user.id);
  res.json(rows);
});

router.post('/:id/cancel', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  if (row.status !== 'PENDING') return res.status(400).json({ error: 'order not pending' });
  db.prepare("UPDATE orders SET status = 'CANCELLED' WHERE id = ?").run(id);
  res.json({ ...row, status: 'CANCELLED' });
});

export function tryFillPendingLimits() {
  const pending = db.prepare("SELECT * FROM orders WHERE status = 'PENDING'").all();
  for (const o of pending) {
    const price = market.getPrice(o.symbol);
    if (!price) continue;
    const fill = (o.side === 'BUY' && price <= o.limit_price) || (o.side === 'SELL' && price >= o.limit_price);
    if (!fill) continue;
    try {
      executeOrder(o.user_id, { symbol: o.symbol, side: o.side, quantity: o.quantity }, price);
      db.prepare("UPDATE orders SET status = 'EXECUTED', executed_price = ?, executed_at = datetime('now') WHERE id = ?").run(price, o.id);
      market.recordTrade({ symbol: o.symbol, price: +price.toFixed(2), qty: o.quantity, side: o.side, time: Date.now() });
      notifyUser(o.user_id, { kind: 'success', message: `${o.side} ${o.quantity} ${o.symbol} limit filled at $${price.toFixed(2)}` });
    } catch (err) {
      db.prepare("UPDATE orders SET status = 'CANCELLED' WHERE id = ?").run(o.id);
      notifyUser(o.user_id, { kind: 'error', message: `${o.symbol} limit cancelled: ${err.message}` });
    }
  }
}

export default router;
