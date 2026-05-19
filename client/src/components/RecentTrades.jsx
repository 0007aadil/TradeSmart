export default function RecentTrades({ trades }) {
  return (
    <div className="panel trades-feed">
      <h3>Recent Trades</h3>
      <div className="panel-body">
        <div className="trade-row" style={{ color: 'var(--muted)', fontSize: 11 }}>
          <div>Side</div>
          <div>Symbol</div>
          <div style={{ textAlign: 'right' }}>Price</div>
          <div style={{ textAlign: 'right' }}>Qty</div>
        </div>
        {trades.map((t, i) => (
          <div key={i} className="trade-row">
            <div className={t.side === 'BUY' ? 'up' : 'down'}>{t.side}</div>
            <div>{t.symbol}</div>
            <div style={{ textAlign: 'right' }}>${t.price.toFixed(2)}</div>
            <div style={{ textAlign: 'right' }}>{t.qty}</div>
          </div>
        ))}
        {trades.length === 0 && <div style={{ color: 'var(--muted)', padding: 8 }}>Waiting for trades...</div>}
      </div>
    </div>
  );
}
