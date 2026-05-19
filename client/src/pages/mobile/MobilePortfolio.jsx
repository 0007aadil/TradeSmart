import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import MobileNav from '../../components/mobile/MobileNav.jsx';
import MobileHeader from '../../components/mobile/MobileHeader.jsx';
import CompanyLogo, { useCompanyProfile } from '../../components/CompanyLogo.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { api } from '../../lib/api.js';

function MobileHolding({ p, onClick }) {
  const profile = useCompanyProfile(p.symbol);
  return (
    <div className="mholding" onClick={onClick}>
      <CompanyLogo symbol={p.symbol} size={36} />
      <div className="mholding-info">
        <div className="mholding-sym">{p.symbol}</div>
        <div className="mholding-meta">
          {profile?.name && profile.name !== p.symbol ? `${profile.name} · ${p.quantity} sh` : `${p.quantity} sh · avg $${p.avgPrice.toFixed(2)}`}
        </div>
      </div>
      <div className="mholding-right">
        <div className="mholding-value">${p.marketValue.toFixed(2)}</div>
        <div className={`mholding-pnl ${p.pnl >= 0 ? 'up' : 'down'}`}>
          {p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)} ({p.pnlPercent >= 0 ? '+' : ''}{p.pnlPercent.toFixed(2)}%)
        </div>
      </div>
    </div>
  );
}

export default function MobilePortfolio() {
  const { token } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const load = () => {
      api('/portfolio', { token }).then(setData).catch(() => {});
      api('/portfolio/history', { token }).then(setHistory).catch(() => {});
    };
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [token]);

  if (!data) {
    return (
      <div className="mshell">
        <MobileHeader title="Portfolio" />
        <div className="mbody" style={{ padding: 16 }}>
          <div className="skeleton" style={{ height: 100, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 200, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 60 }} />
        </div>
        <MobileNav />
      </div>
    );
  }

  const series = history.map((h) => ({ t: h.ts, value: h.totalValue ?? h.marketValue + h.cash }));
  const opening = series.length ? series[0].value : data.totalValue;
  const change = data.totalValue - opening;
  const pct = opening > 0 ? (change / opening) * 100 : 0;
  const up = change >= 0;
  const accent = up ? '#26a69a' : '#ef5350';

  let yMin = opening, yMax = opening;
  for (const p of series) { if (p.value < yMin) yMin = p.value; if (p.value > yMax) yMax = p.value; }
  if (yMin === yMax) { yMin = opening * 0.998; yMax = opening * 1.002; }
  const pad = (yMax - yMin) * 0.15 || opening * 0.001;

  const todayUp = data.todayPnl >= 0;
  const totalUp = data.totalPnl >= 0;

  return (
    <div className="mshell">
      <MobileHeader title="Portfolio" />
      <div className="mbody" style={{ paddingBottom: 8 }}>
        <div className="mport-hero">
          <div className="mport-label">Total Value</div>
          <div className="mport-value">${data.totalValue.toFixed(2)}</div>
          <div className={`mport-change ${up ? 'up' : 'down'}`}>
            {up ? '▲' : '▼'} {up ? '+' : ''}${change.toFixed(2)} ({up ? '+' : ''}{pct.toFixed(2)}%)
            <span className="mport-sub"> · today</span>
          </div>
        </div>

        {series.length > 1 ? (
          <div className="mport-chart">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={series} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mp-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(48, 52, 61, 0.4)" vertical={false} />
                <XAxis dataKey="t" hide />
                <YAxis hide domain={[yMin - pad, yMax + pad]} />
                <Tooltip
                  contentStyle={{ background: '#16191f', border: '1px solid #30343d', borderRadius: 6, fontSize: 12 }}
                  labelFormatter={(t) => new Date(t).toLocaleTimeString()}
                  formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Value']}
                />
                <ReferenceLine y={opening} stroke="#787b86" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="value" stroke={accent} strokeWidth={2} fill="url(#mp-grad)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mport-chart" style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>
            Building chart history…
          </div>
        )}

        <div className="mstat-grid">
          <div className="mstat">
            <div className="mstat-label">Today's P&amp;L</div>
            <div className={`mstat-value ${todayUp ? 'up' : 'down'}`}>
              {todayUp ? '+' : ''}${data.todayPnl.toFixed(2)}
            </div>
          </div>
          <div className="mstat">
            <div className="mstat-label">Total P&amp;L</div>
            <div className={`mstat-value ${totalUp ? 'up' : 'down'}`}>
              {totalUp ? '+' : ''}${data.totalPnl.toFixed(2)}
            </div>
          </div>
          <div className="mstat">
            <div className="mstat-label">Cash</div>
            <div className="mstat-value">${data.cash.toFixed(2)}</div>
          </div>
          <div className="mstat">
            <div className="mstat-label">Invested</div>
            <div className="mstat-value">${data.invested.toFixed(2)}</div>
          </div>
        </div>

        <div className="mlist-section">Holdings ({data.positions.length})</div>
        {data.positions.length === 0 ? (
          <div style={{ padding: '24px 16px', color: 'var(--muted)', textAlign: 'center', fontSize: 14 }}>
            No positions yet. Buy stocks from Markets to build your portfolio.
          </div>
        ) : (
          data.positions.map((p) => (
            <MobileHolding
              key={p.symbol}
              p={p}
              onClick={() => nav(`/dashboard?symbol=${p.symbol}`)}
            />
          ))
        )}
      </div>
      <MobileNav />
    </div>
  );
}
