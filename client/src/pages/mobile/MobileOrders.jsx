import { useEffect, useState } from 'react';
import MobileNav from '../../components/mobile/MobileNav.jsx';
import MobileHeader from '../../components/mobile/MobileHeader.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { api } from '../../lib/api.js';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'EXECUTED', label: 'Filled' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export default function MobileOrders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    load();
    const i = setInterval(load, 3000);
    return () => clearInterval(i);
  }, []);

  function load() {
    api('/orders', { token }).then(setOrders).catch(() => {});
  }

  async function cancel(id) {
    try { await api(`/orders/${id}/cancel`, { method: 'POST', token }); } catch (e) { alert(e.message); }
    load();
  }

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="mshell">
      <MobileHeader title="Orders" />
      <div className="mfilter">
        {FILTERS.map((f) => (
          <button key={f.key} className={`mpill ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="mbody" style={{ paddingTop: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 16px', color: 'var(--muted)', textAlign: 'center', fontSize: 14 }}>
            No orders to show.
          </div>
        ) : (
          filtered.map((o) => (
            <div key={o.id} className="morder">
              <div className="morder-top">
                <div className="morder-sym">
                  <span className={`morder-side ${o.side === 'BUY' ? 'up' : 'down'}`}>{o.side}</span>
                  <strong>{o.symbol}</strong>
                  <span className="morder-type">{o.type}</span>
                </div>
                <span className={`morder-tag ${o.status.toLowerCase()}`}>{o.status}</span>
              </div>
              <div className="morder-mid">
                <span>{o.quantity} sh × ${(o.executed_price ?? o.limit_price ?? 0).toFixed(2)}</span>
                <strong>${((o.executed_price ?? o.limit_price ?? 0) * o.quantity).toFixed(2)}</strong>
              </div>
              <div className="morder-bot">
                <span>{new Date(o.created_at + 'Z').toLocaleString()}</span>
                {o.status === 'PENDING' && (
                  <button className="morder-cancel" onClick={() => cancel(o.id)}>Cancel</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <MobileNav />
    </div>
  );
}
