import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';

export default function OrderSheet({ symbol, side: initialSide, currentPrice, onClose, onSubmitted }) {
  const { token } = useAuth();
  const [side, setSide] = useState(initialSide || 'BUY');
  const [type, setType] = useState('MARKET');
  const [qty, setQty] = useState(1);
  const [limit, setLimit] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const body = { symbol, side, type, quantity: parseInt(qty, 10) };
      if (type === 'LIMIT') body.limitPrice = parseFloat(limit);
      const order = await api('/orders', { method: 'POST', body, token });
      onSubmitted?.(order);
      onClose?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const est = ((parseFloat(qty) || 0) * (type === 'LIMIT' ? parseFloat(limit) || 0 : currentPrice || 0)).toFixed(2);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <div>
            <div className="sheet-title">{side === 'BUY' ? 'Buy' : 'Sell'} {symbol}</div>
            <div className="sheet-sub">Last ${currentPrice?.toFixed(2)}</div>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={submit} className="sheet-form">
          <div className="seg">
            <button type="button" className={`seg-btn ${side === 'BUY' ? 'active buy' : ''}`} onClick={() => setSide('BUY')}>Buy</button>
            <button type="button" className={`seg-btn ${side === 'SELL' ? 'active sell' : ''}`} onClick={() => setSide('SELL')}>Sell</button>
          </div>
          <div className="seg">
            <button type="button" className={`seg-btn ${type === 'MARKET' ? 'active' : ''}`} onClick={() => setType('MARKET')}>Market</button>
            <button type="button" className={`seg-btn ${type === 'LIMIT' ? 'active' : ''}`} onClick={() => setType('LIMIT')}>Limit</button>
          </div>
          <div className="sheet-field">
            <label>Quantity</label>
            <div className="qty-stepper">
              <button type="button" onClick={() => setQty(Math.max(1, parseInt(qty, 10) - 1))}>−</button>
              <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} required />
              <button type="button" onClick={() => setQty(parseInt(qty, 10) + 1)}>+</button>
            </div>
          </div>
          {type === 'LIMIT' && (
            <div className="sheet-field">
              <label>Limit Price (USD)</label>
              <input type="number" step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={currentPrice?.toFixed(2)} required />
            </div>
          )}
          <div className="sheet-est">
            <span>Estimated {side === 'BUY' ? 'cost' : 'proceeds'}</span>
            <strong>${est}</strong>
          </div>
          {err && <div className="err">{err}</div>}
          <button type="submit" className={`btn lg ${side === 'BUY' ? 'up' : 'down'}`} style={{ width: '100%', marginTop: 8 }} disabled={busy}>
            {busy ? 'Placing…' : `${side} ${qty} ${symbol}`}
          </button>
        </form>
      </div>
    </div>
  );
}
