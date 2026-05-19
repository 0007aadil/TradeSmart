import { useEffect, useState } from 'react';
import { api, API_BASE } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import CompanyLogo from './CompanyLogo.jsx';

export default function Watchlist({ items, selected, onSelect, onRemoved, onAdded }) {
  const { token } = useAuth();
  const [allSymbols, setAllSymbols] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/market/symbols`).then((r) => r.json()).then(setAllSymbols).catch(() => {});
  }, []);

  async function remove(e, symbol) {
    e.stopPropagation();
    try { await api(`/portfolio/watchlist/${symbol}`, { method: 'DELETE', token }); } catch {}
    onRemoved?.(symbol);
  }

  async function add(sym) {
    try { await api('/portfolio/watchlist', { method: 'POST', body: { symbol: sym }, token }); } catch {}
    onAdded?.(sym);
  }

  async function addAll() {
    const toAdd = suggested;
    if (toAdd.length === 0) return;
    try { await api('/portfolio/watchlist/bulk', { method: 'POST', body: { symbols: toAdd }, token }); } catch {}
    toAdd.forEach((s) => onAdded?.(s));
  }

  const inList = new Set(items.map((i) => i.symbol));
  const suggested = allSymbols.filter((s) => !inList.has(s));

  return (
    <div className="panel watchlist">
      <h3>Watchlist</h3>
      <div className="panel-body">
        {items.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 12, padding: 8 }}>
            Add stocks below or use the search bar.
          </div>
        )}
        {items.map((it) => (
          <div
            key={it.symbol}
            className={`watchlist-item ${selected === it.symbol ? 'active' : ''}`}
            onClick={() => onSelect(it.symbol)}
          >
            <CompanyLogo symbol={it.symbol} size={28} />
            <div className="sym">{it.symbol}</div>
            <div className="px">
              <div>${it.price?.toFixed(2) ?? '—'}</div>
              {typeof it.change === 'number' && (
                <div className={`change ${it.change >= 0 ? 'up' : 'down'}`}>
                  {it.change >= 0 ? '+' : ''}{it.change.toFixed(2)}
                </div>
              )}
            </div>
            <button className="watchlist-remove" onClick={(e) => remove(e, it.symbol)} aria-label={`Remove ${it.symbol}`}>×</button>
          </div>
        ))}

        {suggested.length > 0 && (
          <>
            <div className="watchlist-section">
              <span>SUGGESTED · {suggested.length}</span>
              <button className="watchlist-addall" onClick={addAll}>+ Add all</button>
            </div>
            {suggested.map((sym) => (
              <div key={sym} className="suggested-item" onClick={() => add(sym)}>
                <CompanyLogo symbol={sym} size={22} />
                <span className="sym">{sym}</span>
                <span className="suggested-add">+ Add</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
