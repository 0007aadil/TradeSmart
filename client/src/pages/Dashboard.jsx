import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Watchlist from '../components/Watchlist.jsx';
import Chart from '../components/Chart.jsx';
import OrderPanel from '../components/OrderPanel.jsx';
import OrderBook from '../components/OrderBook.jsx';
import RecentTrades from '../components/RecentTrades.jsx';
import { useAuth } from '../lib/auth.jsx';
import { getSocket } from '../lib/socket.js';
import { api, API_BASE } from '../lib/api.js';

export default function Dashboard() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [prices, setPrices] = useState({});
  const [trades, setTrades] = useState([]);
  const [book, setBook] = useState({ bids: [], asks: [] });
  const [watchSyms, setWatchSyms] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [selected, setSelected] = useState(searchParams.get('symbol')?.toUpperCase() || 'AAPL');

  useEffect(() => {
    refreshWatchlist();
    refreshPortfolio();
  }, [token]);

  // Sync to URL ?symbol= changes (e.g. navigating from Portfolio holdings)
  useEffect(() => {
    const sym = searchParams.get('symbol');
    if (sym && sym.toUpperCase() !== selected) setSelected(sym.toUpperCase());
  }, [searchParams]);

  function refreshWatchlist() {
    api('/portfolio/watchlist', { token }).then((rows) => {
      const syms = rows.map((r) => r.symbol);
      setWatchSyms(syms);
      if (syms.length && !syms.includes(selected)) setSelected(syms[0]);
    });
  }

  function refreshPortfolio() {
    api('/portfolio', { token }).then(setPortfolio).catch(() => {});
  }

  function handleSearchSelect(sym) {
    setWatchSyms((cur) => (cur.includes(sym) ? cur : [...cur, sym]));
    setSelected(sym);
  }

  function handleWatchlistRemove(sym) {
    setWatchSyms((cur) => {
      const next = cur.filter((s) => s !== sym);
      if (selected === sym && next[0]) setSelected(next[0]);
      return next;
    });
  }

  useEffect(() => {
    const s = getSocket(token);
    s.on('snapshot', (snap) => {
      const map = {};
      snap.forEach((it) => { map[it.symbol] = { price: it.price, change: it.change }; });
      setPrices(map);
    });
    s.on('tick', (t) => {
      setPrices((p) => ({ ...p, [t.symbol]: { price: t.price, change: t.change } }));
    });
    s.on('trades', setTrades);
    s.on('trade', (t) => setTrades((cur) => [t, ...cur].slice(0, 30)));
    s.on('orderbook', (b) => { if (b.symbol === selected) setBook(b); });
    return () => {
      s.off('snapshot'); s.off('tick'); s.off('trades'); s.off('trade'); s.off('orderbook');
    };
  }, [token, selected]);

  useEffect(() => {
    const s = getSocket(token);
    s.emit('subscribe-book', selected);
    fetch(`${API_BASE}/api/market/orderbook/${selected}`).then((r) => r.json()).then(setBook);
  }, [selected, token]);

  const watchItems = useMemo(
    () => watchSyms.map((sym) => ({ symbol: sym, ...(prices[sym] || {}) })),
    [watchSyms, prices]
  );

  const currentPrice = prices[selected]?.price;

  return (
    <div className="shell">
      <Navbar onSearchSelect={handleSearchSelect} />
      <div className="dashboard">
        <Watchlist items={watchItems} selected={selected} onSelect={setSelected} onRemoved={handleWatchlistRemove} onAdded={handleSearchSelect} />
        <Chart symbol={selected} />
        <div className="right-col">
          <OrderPanel symbol={selected} currentPrice={currentPrice} onSubmitted={refreshPortfolio} />
          <OrderBook book={book} />
        </div>
        <div className="bottom">
          <RecentTrades trades={trades} />
          <div className="panel">
            <h3>Portfolio Summary</h3>
            <div className="panel-body">
              {portfolio ? (
                <>
                  <div className="summary-row"><span className="label">Total Value</span><span className="value">${portfolio.totalValue.toFixed(2)}</span></div>
                  <div className="summary-row">
                    <span className="label">Today's P&amp;L</span>
                    <span className={`value ${portfolio.todayPnl >= 0 ? 'up' : 'down'}`}>
                      {portfolio.todayPnl >= 0 ? '+' : ''}${portfolio.todayPnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="label">Total P&amp;L</span>
                    <span className={`value ${portfolio.totalPnl >= 0 ? 'up' : 'down'}`}>
                      {portfolio.totalPnl >= 0 ? '+' : ''}${portfolio.totalPnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="summary-row"><span className="label">Cash</span><span className="value">${portfolio.cash.toFixed(2)}</span></div>
                  <div className="summary-row"><span className="label">Invested</span><span className="value">${portfolio.invested.toFixed(2)}</span></div>
                </>
              ) : <div className="skeleton" style={{ height: 120 }} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
