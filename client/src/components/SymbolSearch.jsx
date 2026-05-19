import { useEffect, useRef, useState } from 'react';
import { api, API_BASE } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

export default function SymbolSearch({ onSelect }) {
  const { token } = useAuth();
  const [all, setAll] = useState([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/market/symbols`).then((r) => r.json()).then(setAll).catch(() => {});
  }, []);

  useEffect(() => {
    function click(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, []);

  const matches = q.trim()
    ? all.filter((s) => s.toUpperCase().includes(q.toUpperCase())).slice(0, 8)
    : all.slice(0, 8);

  async function pick(sym) {
    try { await api('/portfolio/watchlist', { method: 'POST', body: { symbol: sym }, token }); } catch {}
    onSelect?.(sym);
    setQ('');
    setOpen(false);
  }

  return (
    <div className="symbol-search" ref={wrapRef}>
      <input
        placeholder="Search stocks…"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
      />
      {open && (
        <div className="search-dropdown">
          {matches.length === 0 && <div className="search-empty">No matches</div>}
          {matches.map((s) => (
            <div key={s} className="search-item" onClick={() => pick(s)}>
              <span className="search-sym">{s}</span>
              <span className="search-add">+ Add</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
