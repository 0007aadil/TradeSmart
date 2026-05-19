export default function OrderBook({ book }) {
  const bids = book?.bids || [];
  const asks = book?.asks || [];
  const maxQty = Math.max(1, ...bids.map((b) => b.qty), ...asks.map((a) => a.qty));

  return (
    <div className="panel orderbook">
      <h3>Order Book</h3>
      <div className="head">
        <div>Price</div>
        <div style={{ textAlign: 'right' }}>Qty</div>
        <div style={{ textAlign: 'right' }}>Total</div>
      </div>
      <div className="panel-body">
        {asks.slice().reverse().map((a, i) => (
          <div key={`a${i}`} className="ask" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className="bar" style={{ width: `${(a.qty / maxQty) * 100}%` }} />
            <div>{a.price.toFixed(2)}</div>
            <div className="qty">{a.qty}</div>
            <div className="qty">{(a.price * a.qty).toFixed(0)}</div>
          </div>
        ))}
        <div style={{ padding: '6px', textAlign: 'center', color: 'var(--muted)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', margin: '4px 0' }}>
          Spread: ${(asks[0] && bids[0] ? (asks[0].price - bids[0].price).toFixed(2) : '—')}
        </div>
        {bids.map((b, i) => (
          <div key={`b${i}`} className="bid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className="bar" style={{ width: `${(b.qty / maxQty) * 100}%` }} />
            <div>{b.price.toFixed(2)}</div>
            <div className="qty">{b.qty}</div>
            <div className="qty">{(b.price * b.qty).toFixed(0)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
