import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine,
} from 'recharts';
import Navbar from '../components/Navbar.jsx';
import CompanyLogo, { useCompanyProfile } from '../components/CompanyLogo.jsx';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';

const COLORS = ['#2962ff', '#26a69a', '#ff9800', '#ef5350', '#9b5de5', '#00bbf9', '#fee440', '#f15bb5'];

function HoldingRow({ p, onClick }) {
  const profile = useCompanyProfile(p.symbol);
  return (
    <tr onClick={onClick} className="holding-row">
      <td>
        <div className="holding-name-cell">
          <CompanyLogo symbol={p.symbol} size={28} />
          <div>
            <div className="holding-sym">{p.symbol}</div>
            {profile?.name && profile.name !== p.symbol && (
              <div className="holding-fullname">{profile.name}</div>
            )}
          </div>
        </div>
      </td>
      <td>{p.quantity}</td>
      <td>${p.avgPrice.toFixed(2)}</td>
      <td>${p.currentPrice.toFixed(2)}</td>
      <td>${p.marketValue.toFixed(2)}</td>
      <td className={p.pnl >= 0 ? 'up' : 'down'}>{p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}</td>
      <td className={p.pnlPercent >= 0 ? 'up' : 'down'}>{p.pnlPercent >= 0 ? '+' : ''}{p.pnlPercent.toFixed(2)}%</td>
    </tr>
  );
}

export default function Portfolio() {
  const { token } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [token]);

  function load() {
    api('/portfolio', { token }).then(setData).catch(() => {});
    api('/portfolio/history', { token }).then(setHistory).catch(() => {});
  }

  if (!data) {
    return (
      <div className="shell">
        <Navbar />
        <div className="page-content">
          <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 24 }} />
          <div className="stats">
            {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 90 }} />)}
          </div>
          <div className="skeleton" style={{ height: 280, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 240 }} />
        </div>
      </div>
    );
  }

  const allocation = data.positions.map((p) => ({ name: p.symbol, value: p.marketValue }));
  const series = history.map((h) => ({
    t: h.ts,
    value: h.totalValue ?? h.marketValue + h.cash,
    invested: h.invested,
  }));
  const todayUp = data.todayPnl >= 0;
  const totalUp = data.totalPnl >= 0;

  const opening = series.length ? series[0].value : data.totalValue;
  const valueChange = data.totalValue - opening;
  const valuePct = opening > 0 ? (valueChange / opening) * 100 : 0;
  const seriesUp = valueChange >= 0;
  const accent = seriesUp ? '#26a69a' : '#ef5350';
  let yMin = opening, yMax = opening;
  for (const p of series) { if (p.value < yMin) yMin = p.value; if (p.value > yMax) yMax = p.value; }
  if (yMin === yMax) { yMin = opening * 0.998; yMax = opening * 1.002; }
  const yPad = (yMax - yMin) * 0.15 || opening * 0.001;
  const yDomain = [yMin - yPad, yMax + yPad];

  const fmtMoney = (v) => {
    if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
    return `$${v.toFixed(0)}`;
  };

  return (
    <div className="shell">
      <Navbar />
      <div className="page-content">
        <h2>Portfolio</h2>
        <div className="stats">
          <div className="stat-card">
            <div className="label">Total Value</div>
            <div className="value">${data.totalValue.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Today's P&amp;L</div>
            <div className={`value ${todayUp ? 'up' : 'down'}`}>
              {todayUp ? '+' : ''}${data.todayPnl.toFixed(2)}{' '}
              <span style={{ fontSize: 12, fontWeight: 500 }}>
                ({todayUp ? '+' : ''}{data.todayPnlPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="label">Total P&amp;L</div>
            <div className={`value ${totalUp ? 'up' : 'down'}`}>
              {totalUp ? '+' : ''}${data.totalPnl.toFixed(2)}
            </div>
          </div>
          <div className="stat-card">
            <div className="label">Cash Available</div>
            <div className="value">${data.cash.toFixed(2)}</div>
          </div>
        </div>

        <div className="portfolio-history">
          <div className="phist-header">
            <div>
              <h3 className="phist-title">Portfolio Value · 24h</h3>
              <div className="phist-sub">
                vs opening ${opening.toFixed(2)} · invested ${data.invested.toFixed(2)}
              </div>
            </div>
            <div className="phist-stats">
              <div className="phist-current">${data.totalValue.toFixed(2)}</div>
              <div className={`phist-change ${seriesUp ? 'up' : 'down'}`}>
                {seriesUp ? '▲' : '▼'} {seriesUp ? '+' : ''}${valueChange.toFixed(2)} ({seriesUp ? '+' : ''}{valuePct.toFixed(2)}%)
              </div>
            </div>
          </div>
          {series.length > 1 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-value" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(54, 58, 69, 0.5)" vertical={false} />
                <XAxis
                  dataKey="t"
                  tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  stroke="#787b86"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={50}
                />
                <YAxis
                  stroke="#787b86"
                  domain={yDomain}
                  tickFormatter={fmtMoney}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip
                  contentStyle={{ background: '#16191f', border: '1px solid #30343d', borderRadius: 6 }}
                  labelStyle={{ color: '#787b86', fontSize: 11 }}
                  labelFormatter={(t) => new Date(t).toLocaleString()}
                  formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Total Value']}
                />
                <ReferenceLine
                  y={opening}
                  stroke="#787b86"
                  strokeDasharray="4 4"
                  label={{ value: `Open $${opening.toFixed(0)}`, position: 'insideTopLeft', fill: '#787b86', fontSize: 11 }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={accent}
                  strokeWidth={2}
                  fill="url(#g-value)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: 'var(--muted)', padding: '60px 0', textAlign: 'center' }}>
              Building chart history… come back in a minute.
            </div>
          )}
        </div>

        <div className="portfolio-grid">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th><th>Qty</th><th>Avg Price</th><th>Current</th><th>Market Value</th><th>P&amp;L</th><th>%</th>
                </tr>
              </thead>
              <tbody>
                {data.positions.length === 0 && (
                  <tr><td colSpan="7" style={{ color: 'var(--muted)', textAlign: 'center' }}>No positions yet. Place an order from the dashboard.</td></tr>
                )}
                {data.positions.map((p) => (
                  <HoldingRow
                    key={p.symbol}
                    p={p}
                    onClick={() => nav(`/dashboard?symbol=${p.symbol}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="alloc-chart">
            <h3 style={{ color: 'var(--muted)', textTransform: 'uppercase', fontSize: 13, letterSpacing: 0.5 }}>Allocation</h3>
            {allocation.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={allocation} dataKey="value" nameKey="name" outerRadius={100} innerRadius={50}>
                    {allocation.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#16191f', border: '1px solid #30343d' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={{ color: 'var(--muted)' }}>No holdings to chart.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
