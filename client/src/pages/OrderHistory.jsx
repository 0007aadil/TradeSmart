import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import CompanyLogo, { useCompanyProfile } from '../components/CompanyLogo.jsx';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'EXECUTED', label: 'Filled' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

function OrderCard({ o, onCancel }) {
  const profile = useCompanyProfile(o.symbol);
  const price = o.executed_price ?? o.limit_price ?? 0;
  const total = price * o.quantity;
  return (
    <div className="order-card">
      <div className="order-card-left">
        <CompanyLogo symbol={o.symbol} size={36} />
        <div className="order-card-info">
          <div className="order-card-top">
            <span className={`order-side ${o.side === 'BUY' ? 'up' : 'down'}`}>{o.side}</span>
            <strong className="order-sym">{o.symbol}</strong>
            <span className="order-type">{o.type}</span>
          </div>
          <div className="order-card-name">{profile?.name && profile.name !== o.symbol ? profile.name : ` `}</div>
        </div>
      </div>
      <div className="order-card-mid">
        <div className="order-detail">
          <div className="order-detail-label">Quantity</div>
          <div className="order-detail-value">{o.quantity}</div>
        </div>
        <div className="order-detail">
          <div className="order-detail-label">Price</div>
          <div className="order-detail-value">${price.toFixed(2)}</div>
        </div>
        <div className="order-detail">
          <div className="order-detail-label">Total</div>
          <div className="order-detail-value">${total.toFixed(2)}</div>
        </div>
      </div>
      <div className="order-card-right">
        <div className="order-time">{new Date(o.created_at + 'Z').toLocaleString()}</div>
        <div className="order-card-status">
          <span className={`tag ${o.status.toLowerCase()}`}>{o.status}</span>
          {o.status === 'PENDING' && (
            <button className="btn" onClick={() => onCancel(o.id)}>Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrderHistory() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    load();
    const i = setInterval(load, 4000);
    return () => clearInterval(i);
  }, []);

  function load() {
    api('/orders', { token }).then(setOrders).catch(() => {});
  }

  async function cancel(id) {
    try { await api(`/orders/${id}/cancel`, { method: 'POST', token }); } catch (e) { alert(e.message); }
    load();
  }

  const filtered = useMemo(
    () => (filter === 'all' ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter]
  );

  const stats = useMemo(() => {
    const s = { all: orders.length, PENDING: 0, EXECUTED: 0, CANCELLED: 0 };
    for (const o of orders) s[o.status] = (s[o.status] || 0) + 1;
    return s;
  }, [orders]);

  return (
    <div className="shell">
      <Navbar />
      <div className="page-content">
        <div className="page-head">
          <h2>Order History</h2>
          <div className="page-sub">{orders.length} total · {stats.PENDING} pending · {stats.EXECUTED} filled</div>
        </div>
        <div className="filter-bar">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-pill ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="filter-count">{f.key === 'all' ? orders.length : (stats[f.key] || 0)}</span>
            </button>
          ))}
        </div>
        <div className="order-list">
          {filtered.length === 0 && (
            <div className="empty-state">No {filter === 'all' ? '' : filter.toLowerCase()} orders yet.</div>
          )}
          {filtered.map((o) => <OrderCard key={o.id} o={o} onCancel={cancel} />)}
        </div>
      </div>
    </div>
  );
}
