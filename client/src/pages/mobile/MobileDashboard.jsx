import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MobileNav from '../../components/mobile/MobileNav.jsx';
import MobileHeader from '../../components/mobile/MobileHeader.jsx';
import OrderSheet from '../../components/mobile/OrderSheet.jsx';
import Chart from '../../components/Chart.jsx';
import OrderBook from '../../components/OrderBook.jsx';
import RecentTrades from '../../components/RecentTrades.jsx';
import CompanyLogo, { useCompanyProfile } from '../../components/CompanyLogo.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { getSocket } from '../../lib/socket.js';
import { api, API_BASE } from '../../lib/api.js';

function MarketListRow({ symbol, price, change, onClick, trailing }) {
  const profile = useCompanyProfile(symbol);
  return (
    <div className="mrow" onClick={onClick}>
      <CompanyLogo symbol={symbol} size={36} />
      <div className="mrow-left">
        <div className="mrow-sym">{symbol}</div>
        {profile?.name && profile.name !== symbol && (
          <div className="mrow-name">{profile.name}</div>
        )}
      </div>
      <div className="mrow-right">
        <div className="mrow-px">${price?.toFixed(2) ?? '—'}</div>
        {trailing}
        {typeof change === 'number' && !trailing && (
          <div className={`mrow-chg ${change >= 0 ? 'up' : 'down'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MobileDashboard() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [prices, setPrices] = useState({});
  const [trades, setTrades] = useState([]);
  const [book, setBook] = useState({ bids: [], asks: [] });
  const [watchSyms, setWatchSyms] = useState([]);
  const [allSymbols, setAllSymbols] = useState([]);
  const [view, setView] = useState('list'); // 'list' | 'detail'
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState('chart'); // chart | book | trades
  const [orderSide, setOrderSide] = useState(null); // null | 'BUY' | 'SELL'
  const [search, setSearch] = useState('');
  const detailProfile = useCompanyProfile(selected);

  useEffect(() => {
    api('/portfolio/watchlist', { token }).then((rows) => setWatchSyms(rows.map((r) => r.symbol)));
    fetch(`${API_BASE}/api/market/symbols`).then((r) => r.json()).then(setAllSymbols).catch(() => {});
  }, [token]);

  // Read ?symbol= from URL to open detail view (e.g. from Portfolio click)
  useEffect(() => {
    const sym = searchParams.get('symbol');
    if (sym) {
      setSelected(sym.toUpperCase());
      setView('detail');
      setDetailTab('chart');
    }
  }, [searchParams]);

  useEffect(() => {
    const s = getSocket(token);
    s.on('snapshot', (snap) => {
      const m = {};
      snap.forEach((it) => { m[it.symbol] = { price: it.price, change: it.change }; });
      setPrices(m);
    });
    s.on('tick', (t) => setPrices((p) => ({ ...p, [t.symbol]: { price: t.price, change: t.change } })));
    s.on('trades', setTrades);
    s.on('trade', (t) => setTrades((cur) => [t, ...cur].slice(0, 30)));
    s.on('orderbook', (b) => { if (b.symbol === selected) setBook(b); });
    return () => { s.off('snapshot'); s.off('tick'); s.off('trades'); s.off('trade'); s.off('orderbook'); };
  }, [token, selected]);

  useEffect(() => {
    if (!selected) return;
    const s = getSocket(token);
    s.emit('subscribe-book', selected);
    fetch(`${API_BASE}/api/market/orderbook/${selected}`).then((r) => r.json()).then(setBook);
  }, [selected, token]);

  const watchItems = useMemo(
    () => watchSyms.map((sym) => ({ symbol: sym, ...(prices[sym] || {}) })),
    [watchSyms, prices]
  );

  const suggested = useMemo(() => {
    const inList = new Set(watchSyms);
    return allSymbols.filter((s) => !inList.has(s));
  }, [allSymbols, watchSyms]);

  const filteredWatch = search ? watchItems.filter((i) => i.symbol.toUpperCase().includes(search.toUpperCase())) : watchItems;
  const filteredSugg = search ? suggested.filter((s) => s.toUpperCase().includes(search.toUpperCase())) : suggested;

  async function addToWatch(sym) {
    try { await api('/portfolio/watchlist', { method: 'POST', body: { symbol: sym }, token }); } catch {}
    setWatchSyms((cur) => (cur.includes(sym) ? cur : [...cur, sym]));
  }
  async function removeFromWatch(sym) {
    try { await api(`/portfolio/watchlist/${sym}`, { method: 'DELETE', token }); } catch {}
    setWatchSyms((cur) => cur.filter((s) => s !== sym));
  }

  function openDetail(sym) {
    setSelected(sym);
    setView('detail');
    setDetailTab('chart');
  }

  function back() {
    setView('list');
    setSelected(null);
  }

  const currentPrice = selected ? prices[selected]?.price : null;

  return (
    <div className="mshell">
      {view === 'list' ? (
        <>
          <MobileHeader title="Markets" />
          <div className="msearch">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></svg>
            <input
              placeholder="Search stocks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch('')} className="msearch-clear">×</button>}
          </div>
          <div className="mbody">
            {filteredWatch.length > 0 && (
              <>
                <div className="mlist-section">Watchlist</div>
                {filteredWatch.map((it) => (
                  <MarketListRow
                    key={it.symbol}
                    symbol={it.symbol}
                    price={it.price}
                    change={it.change}
                    onClick={() => openDetail(it.symbol)}
                  />
                ))}
              </>
            )}
            {filteredSugg.length > 0 && (
              <>
                <div className="mlist-section">All markets</div>
                {filteredSugg.map((sym) => {
                  const p = prices[sym];
                  return (
                    <MarketListRow
                      key={sym}
                      symbol={sym}
                      price={p?.price}
                      change={p?.change}
                      onClick={() => openDetail(sym)}
                      trailing={<button className="mrow-add" onClick={(e) => { e.stopPropagation(); addToWatch(sym); }}>+ Watch</button>}
                    />
                  );
                })}
              </>
            )}
          </div>
          <MobileNav />
        </>
      ) : (
        <>
          <header className="mhead">
            <button className="mhead-back" onClick={back} aria-label="Back">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="mhead-title">{selected}</div>
            <button
              className="mhead-back"
              onClick={() => watchSyms.includes(selected) ? removeFromWatch(selected) : addToWatch(selected)}
              aria-label="Watch"
              style={{ color: watchSyms.includes(selected) ? 'var(--accent)' : 'var(--muted)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={watchSyms.includes(selected) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" /></svg>
            </button>
          </header>
          <div className="mdetail-overview">
            <CompanyLogo symbol={selected} size={56} />
            <div className="mdetail-overview-info">
              <div className="mdetail-name">{detailProfile?.name || selected}</div>
              <div className="mdetail-sub">
                <span className="mdetail-tick">{selected}</span>
                {detailProfile?.exchange && <span>· {detailProfile.exchange}</span>}
              </div>
            </div>
          </div>
          <div className="mdetail-price">
            <div className="mdetail-px">${currentPrice?.toFixed(2)} <span className="mdetail-cur">USD</span></div>
            <div className={`mdetail-chg ${(prices[selected]?.change || 0) >= 0 ? 'up' : 'down'}`}>
              {(prices[selected]?.change || 0) >= 0 ? '▲' : '▼'} {(prices[selected]?.change || 0) >= 0 ? '+' : ''}
              {(prices[selected]?.change || 0).toFixed(2)} ({currentPrice ? ((prices[selected]?.change || 0) / currentPrice * 100).toFixed(2) : '0.00'}%)
            </div>
          </div>
          {(detailProfile?.industry || detailProfile?.marketCap) && (
            <div className="mdetail-stats">
              {detailProfile?.industry && (
                <div className="mdetail-stat">
                  <div className="mdetail-stat-label">Industry</div>
                  <div className="mdetail-stat-value">{detailProfile.industry}</div>
                </div>
              )}
              {detailProfile?.marketCap && (
                <div className="mdetail-stat">
                  <div className="mdetail-stat-label">Market Cap</div>
                  <div className="mdetail-stat-value">${(detailProfile.marketCap / 1000).toFixed(2)}B</div>
                </div>
              )}
              {detailProfile?.ipo && (
                <div className="mdetail-stat">
                  <div className="mdetail-stat-label">IPO</div>
                  <div className="mdetail-stat-value">{detailProfile.ipo}</div>
                </div>
              )}
            </div>
          )}
          <div className="mtabs">
            {['chart', 'book', 'trades'].map((t) => (
              <button key={t} className={`mtab ${detailTab === t ? 'active' : ''}`} onClick={() => setDetailTab(t)}>
                {t === 'chart' ? 'Chart' : t === 'book' ? 'Order Book' : 'Trades'}
              </button>
            ))}
          </div>
          <div className="mdetail-body">
            {detailTab === 'chart' && <div className="mdetail-chart"><Chart symbol={selected} isMobile={true} /></div>}
            {detailTab === 'book' && <OrderBook book={book} />}
            {detailTab === 'trades' && <RecentTrades trades={trades.filter((t) => t.symbol === selected)} />}
          </div>
          <div className="mdetail-cta">
            <button className="btn lg down" style={{ flex: 1 }} onClick={() => setOrderSide('SELL')}>Sell</button>
            <button className="btn lg up" style={{ flex: 1 }} onClick={() => setOrderSide('BUY')}>Buy</button>
          </div>
        </>
      )}

      {orderSide && (
        <OrderSheet
          symbol={selected}
          side={orderSide}
          currentPrice={currentPrice}
          onClose={() => setOrderSide(null)}
        />
      )}
    </div>
  );
}
