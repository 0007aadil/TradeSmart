import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

export default function OrderPanel({ symbol, currentPrice, onSubmitted }) {
  const { token } = useAuth();
  const [side, setSide] = useState('BUY');
  const [type, setType] = useState('MARKET');
  const [qty, setQty] = useState(1);
  const [limit, setLimit] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      const body = { symbol, side, type, quantity: parseInt(qty, 10) };
      if (type === 'LIMIT') body.limitPrice = parseFloat(limit);
      const order = await api('/orders', { method: 'POST', body, token });
      setMsg(`${order.status}: ${order.side} ${order.quantity} ${order.symbol}`);
      onSubmitted?.(order);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h3>Place Order · {symbol}</h3>
      <form className="order-form" onSubmit={submit}>
        <div className="toggle row">
          <button type="button" className={side === 'BUY' ? 'active buy' : ''} onClick={() => setSide('BUY')}>Buy</button>
          <button type="button" className={side === 'SELL' ? 'active sell' : ''} onClick={() => setSide('SELL')}>Sell</button>
        </div>
        <div className="field">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="MARKET">Market Order</option>
            <option value="LIMIT">Limit Order</option>
          </select>
        </div>
        <div className="field">
          <label style={{ color: 'var(--muted)', fontSize: 12 }}>Quantity</label>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} required />
        </div>
        {type === 'LIMIT' && (
          <div className="field">
            <label style={{ color: 'var(--muted)', fontSize: 12 }}>Limit Price</label>
            <input type="number" step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} required placeholder={currentPrice?.toFixed(2)} />
          </div>
        )}
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
          Est. cost: ${((parseFloat(qty) || 0) * (type === 'LIMIT' ? parseFloat(limit) || 0 : currentPrice || 0)).toFixed(2)}
        </div>
        <button type="submit" className={`btn ${side === 'BUY' ? 'up' : 'down'} submit`} disabled={busy}>
          {busy ? 'Placing...' : `${side} ${symbol}`}
        </button>
        {msg && <div style={{ fontSize: 12, marginTop: 8, color: 'var(--muted)' }}>{msg}</div>}
      </form>
    </div>
  );
}
