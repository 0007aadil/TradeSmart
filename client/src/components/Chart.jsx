import { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';
import CompanyLogo, { useCompanyProfile } from './CompanyLogo.jsx';

const TIMEFRAMES = ['1D', '1W', '1M', '3M', '1Y'];

function sma(data, period = 20) {
  const out = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
    out.push({ time: data[i].time, value: sum / period });
  }
  return out;
}

export default function Chart({ symbol }) {
  const hostRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const smaRef = useRef(null);
  const volumeRef = useRef(null);
  const [tf, setTf] = useState('1M');
  const [stats, setStats] = useState(null);
  const profile = useCompanyProfile(symbol);

  useEffect(() => {
    if (!hostRef.current) return;
    const chart = createChart(hostRef.current, {
      layout: {
        background: { color: 'rgba(0, 0, 0, 0)' },
        textColor: '#787b86',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(48, 52, 61, 0.4)' },
        horzLines: { color: 'rgba(48, 52, 61, 0.4)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#2962ff', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#2962ff' },
        horzLine: { color: '#2962ff', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#2962ff' },
      },
      rightPriceScale: {
        borderColor: 'transparent',
        scaleMargins: { top: 0.08, bottom: 0.28 },
      },
      timeScale: {
        borderColor: 'transparent',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: { mouseWheel: true, pinch: true },
      width: hostRef.current.clientWidth,
      height: hostRef.current.clientHeight,
    });

    const candle = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceLineWidth: 1,
      priceLineStyle: LineStyle.Dashed,
      priceLineColor: '#2962ff',
      lastValueVisible: true,
    });

    const smaLine = chart.addLineSeries({
      color: '#ff9800',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerRadius: 3,
    });

    const volume = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
      color: 'rgba(41, 98, 255, 0.4)',
    });
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    });

    chartRef.current = chart;
    candleRef.current = candle;
    smaRef.current = smaLine;
    volumeRef.current = volume;

    const ro = new ResizeObserver(() => {
      if (!hostRef.current) return;
      chart.applyOptions({ width: hostRef.current.clientWidth, height: hostRef.current.clientHeight });
    });
    ro.observe(hostRef.current);

    return () => { ro.disconnect(); chart.remove(); };
  }, []);

  useEffect(() => {
    if (!symbol || !candleRef.current) return;
    let cancelled = false;
    fetch(`/api/market/history/${symbol}?timeframe=${tf}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !candleRef.current) return;
        const seen = new Set();
        const clean = data
          .filter((b) => b && Number.isFinite(b.time) && !seen.has(b.time) && seen.add(b.time))
          .sort((a, b) => a.time - b.time);
        candleRef.current.setData(clean);
        smaRef.current.setData(sma(clean, 20));
        volumeRef.current.setData(
          clean.map((b) => ({
            time: b.time,
            value: b.volume || 0,
            color: b.close >= b.open ? 'rgba(38, 166, 154, 0.4)' : 'rgba(239, 83, 80, 0.4)',
          }))
        );
        chartRef.current.timeScale().fitContent();

        if (clean.length > 0) {
          const last = clean[clean.length - 1];
          const first = clean[0];
          const change = last.close - first.close;
          const pct = (change / first.close) * 100;
          setStats({
            price: last.close,
            change: +change.toFixed(2),
            pct: +pct.toFixed(2),
            high: Math.max(...clean.map((b) => b.high)),
            low: Math.min(...clean.map((b) => b.low)),
          });
        }
      });
    return () => { cancelled = true; };
  }, [symbol, tf]);

  const up = (stats?.change ?? 0) >= 0;

  return (
    <div className="panel chart-panel">
      <div className="chart-overview">
        <CompanyLogo symbol={symbol} size={44} />
        <div className="chart-overview-text">
          <div className="chart-overview-name">{profile?.name || symbol}</div>
          <div className="chart-overview-sub">
            <span className="chart-overview-tick">{symbol}</span>
            {profile?.exchange && <span>· {profile.exchange}</span>}
            {profile?.industry && <span>· {profile.industry}</span>}
            {profile?.marketCap && <span>· Mkt Cap ${(profile.marketCap / 1000).toFixed(2)}B</span>}
          </div>
        </div>
      </div>
      <div className="chart-header">
        <div className="chart-title">
          {stats && (
            <>
              <div className="chart-price">${stats.price.toFixed(2)}<span className="chart-cur"> USD</span></div>
              <div className={`chart-change ${up ? 'up' : 'down'}`}>
                {up ? '▲' : '▼'} {up ? '+' : ''}{stats.change.toFixed(2)} ({up ? '+' : ''}{stats.pct.toFixed(2)}%)
              </div>
              <div className="chart-meta">
                <span>H ${stats.high.toFixed(2)}</span>
                <span>L ${stats.low.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
        <div className="chart-controls">
          {TIMEFRAMES.map((t) => (
            <button key={t} className={tf === t ? 'active' : ''} onClick={() => setTf(t)}>{t}</button>
          ))}
        </div>
      </div>
      <div className="chart-legend">
        <span className="dot" style={{ background: '#ff9800' }} /> SMA 20
        <span className="dot" style={{ background: 'rgba(41, 98, 255, 0.6)', marginLeft: 12 }} /> Volume
      </div>
      <div ref={hostRef} className="chart-host" />
    </div>
  );
}
