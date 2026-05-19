import { EventEmitter } from 'node:events';

const DEFAULT_SYMBOLS = [
  // Big tech
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'NFLX',
  // Semis
  'AMD', 'INTC', 'AVGO', 'QCOM', 'MU', 'TSM',
  // Software / fintech
  'ORCL', 'ADBE', 'CRM', 'IBM', 'CSCO', 'UBER', 'COIN', 'PYPL', 'SHOP', 'SQ',
  // Finance
  'JPM', 'BAC', 'GS', 'V', 'MA',
  // Consumer
  'WMT', 'COST', 'NKE', 'MCD', 'SBUX', 'KO', 'PEP', 'DIS',
  // Industrial / auto / ETFs
  'BA', 'GE', 'F', 'SPY', 'QQQ',
];

const SYMBOLS = (process.env.SYMBOLS || DEFAULT_SYMBOLS.join(','))
  .split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);

const SEED = {
  AAPL: 190, MSFT: 420, GOOGL: 170, AMZN: 185, TSLA: 245,
  NVDA: 880, META: 500, NFLX: 620, AMD: 165, INTC: 35,
  AVGO: 170, QCOM: 180, MU: 105, TSM: 195,
  ORCL: 165, ADBE: 480, CRM: 280, IBM: 215, CSCO: 50,
  UBER: 75, COIN: 250, PYPL: 75, SHOP: 105, SQ: 85,
  JPM: 215, BAC: 42, GS: 530, V: 295, MA: 530,
  WMT: 95, COST: 880, NKE: 80, MCD: 290, SBUX: 95,
  KO: 70, PEP: 165, DIS: 110,
  BA: 175, GE: 175, F: 11,
  SPY: 600, QQQ: 510,
  DEFAULT: 100,
};

const DAY = 86400;

class Market extends EventEmitter {
  constructor() {
    super();
    this.symbols = SYMBOLS;
    this.prices = new Map();
    this.lastChange = new Map();
    this.orderBooks = new Map();
    this.recentTrades = [];
    this.history = new Map();
    this.profiles = new Map();
    this.profilePromises = new Map();
    this.newsCache = { data: [], fetchedAt: 0 };
    this.inflationCache = { data: {}, fetchedAt: 0 };
    this.useReal = !!process.env.FINNHUB_API_KEY;

    for (const sym of this.symbols) {
      const seed = SEED[sym] ?? SEED.DEFAULT;
      const hist = this.#seedHistory(seed);
      this.history.set(sym, hist);
      const last = hist[hist.length - 1];
      this.prices.set(sym, last.close);
      this.lastChange.set(sym, +(last.close - last.open).toFixed(2));
      this.orderBooks.set(sym, this.#makeBook(last.close));
    }
  }

  start() {
    if (this.useReal) {
      this.#startFinnhub().catch((err) => {
        console.warn('[market] Finnhub failed, falling back to simulation:', err.message);
        this.useReal = false;
        this.#startSimulation();
      });
    } else {
      console.log('[market] No FINNHUB_API_KEY — using simulated prices.');
      this.#startSimulation();
    }
  }

  getSnapshot() {
    return this.symbols.map((s) => ({
      symbol: s,
      price: +this.prices.get(s).toFixed(2),
      change: +this.lastChange.get(s).toFixed(2),
    }));
  }

  getPrice(symbol) { return this.prices.get(symbol.toUpperCase()); }

  async getNews() {
    if (this.newsCache.data.length && Date.now() - this.newsCache.fetchedAt < 5 * 60 * 1000) {
      return this.newsCache.data;
    }
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return this.#mockNews();
    try {
      const r = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${apiKey}`);
      const data = await r.json();
      if (Array.isArray(data) && data.length) {
        this.newsCache = {
          data: data.slice(0, 30).map((n) => ({
            id: n.id,
            datetime: n.datetime,
            headline: n.headline,
            summary: n.summary,
            source: n.source,
            url: n.url,
            image: n.image,
            related: n.related,
          })),
          fetchedAt: Date.now(),
        };
      }
    } catch {}
    return this.newsCache.data.length ? this.newsCache.data : this.#mockNews();
  }

  #mockNews() {
    const now = Math.floor(Date.now() / 1000);
    return [
      { id: 1, datetime: now - 3600, headline: 'Markets Rally as Tech Stocks Lead Broad Gains', summary: 'Major indexes climbed as semiconductor and software names led the advance.', source: 'TradeSmart News', related: 'NVDA,MSFT,AAPL', url: '#' },
      { id: 2, datetime: now - 7200, headline: 'Fed Signals Cautious Path on Future Rate Decisions', summary: 'Officials emphasized data-dependence in latest minutes.', source: 'TradeSmart News', related: 'SPY', url: '#' },
      { id: 3, datetime: now - 10800, headline: 'AI Spending Powers Q4 Beat for Cloud Giants', summary: 'Hyperscalers report record capex tied to AI infrastructure buildout.', source: 'TradeSmart News', related: 'GOOGL,AMZN,MSFT', url: '#' },
      { id: 4, datetime: now - 14400, headline: 'Energy Stocks Pull Back After Crude Slides', summary: 'WTI prices retreated on oversupply concerns.', source: 'TradeSmart News', related: 'XOM', url: '#' },
      { id: 5, datetime: now - 18000, headline: 'Consumer Spending Holds Steady, Retailers Mixed', summary: 'Holiday season demand props up sector despite headwinds.', source: 'TradeSmart News', related: 'WMT,COST', url: '#' },
      { id: 6, datetime: now - 86400, headline: 'Tesla Production Targets Reaffirmed by CEO', summary: 'Company stands by quarterly delivery guidance.', source: 'TradeSmart News', related: 'TSLA', url: '#' },
    ];
  }

  async getInflation() {
    if (Object.keys(this.inflationCache.data).length && Date.now() - this.inflationCache.fetchedAt < 24 * 60 * 60 * 1000) {
      return this.inflationCache.data;
    }
    // World Bank API: FP.CPI.TOTL.ZG = inflation, consumer prices (annual %)
    // We try the most recent year that has data; fall back through years.
    const years = [new Date().getFullYear() - 1, new Date().getFullYear() - 2, new Date().getFullYear() - 3];
    const result = {};
    for (const year of years) {
      try {
        const url = `https://api.worldbank.org/v2/country/all/indicator/FP.CPI.TOTL.ZG?format=json&date=${year}&per_page=400`;
        const r = await fetch(url);
        const data = await r.json();
        if (Array.isArray(data) && data[1]) {
          for (const row of data[1]) {
            const code = row?.countryiso3code;
            const value = row?.value;
            if (code && typeof value === 'number' && !result[code]) {
              result[code] = +value.toFixed(2);
            }
          }
        }
      } catch {}
    }
    // Fallback hardcoded if API fails entirely
    if (Object.keys(result).length === 0) {
      Object.assign(result, {
        USA: 3.2, CAN: 2.9, MEX: 4.5, BRA: 4.6, ARG: 92.4, CHL: 5.0,
        GBR: 3.5, DEU: 2.6, FRA: 2.4, ITA: 1.4, ESP: 3.2, RUS: 8.5,
        TUR: 49.4, IRN: 38.0, EGY: 30.0, NGA: 28.0, ZAF: 5.2, IND: 5.0,
        CHN: 0.5, JPN: 2.7, AUS: 3.6, IDN: 2.5, KOR: 2.4, SAU: 1.7,
        PAK: 25.0, VNM: 3.2, THA: 0.8, COL: 6.6, PER: 2.5, VEN: 60.0,
      });
    }
    this.inflationCache = { data: result, fetchedAt: Date.now() };
    return result;
  }

  async getProfile(symbol) {
    const sym = symbol.toUpperCase();
    const cached = this.profiles.get(sym);
    if (cached && Date.now() - cached.fetchedAt < 86_400_000) return cached;
    if (this.profilePromises.has(sym)) return this.profilePromises.get(sym);

    const promise = (async () => {
      let data = { symbol: sym, name: sym, logo: null, industry: null, marketCap: null, exchange: null, weburl: null };
      const apiKey = process.env.FINNHUB_API_KEY;
      if (apiKey) {
        try {
          const r = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${sym}&token=${apiKey}`);
          const d = await r.json();
          if (d && (d.name || d.logo)) {
            data = {
              symbol: sym,
              name: d.name || sym,
              logo: d.logo || null,
              industry: d.finnhubIndustry || null,
              marketCap: d.marketCapitalization || null,
              shareOutstanding: d.shareOutstanding || null,
              exchange: d.exchange || null,
              weburl: d.weburl || null,
              ipo: d.ipo || null,
              currency: d.currency || 'USD',
            };
          }
        } catch {}
      }
      data.fetchedAt = Date.now();
      this.profiles.set(sym, data);
      this.profilePromises.delete(sym);
      return data;
    })();

    this.profilePromises.set(sym, promise);
    return promise;
  }
  getOrderBook(symbol) { return this.orderBooks.get(symbol.toUpperCase()) || this.#makeBook(100); }
  getRecentTrades() { return this.recentTrades.slice(0, 30); }

  getHistory(symbol, timeframe = '1D') {
    const all = this.history.get(symbol.toUpperCase()) || [];
    const map = { '1D': 60, '1W': 90, '1M': 180, '3M': 260, '1Y': 365 };
    const n = map[timeframe] || 200;
    return all.slice(-n);
  }

  getTopReturns(period = '1Y') {
    const lookback = period === '1Y' ? 365 : period === '3M' ? 90 : 30;
    const out = [];
    for (const sym of this.symbols) {
      const hist = this.history.get(sym);
      if (!hist || hist.length < lookback) continue;
      const past = hist[hist.length - lookback];
      const last = hist[hist.length - 1];
      const ret = ((last.close - past.close) / past.close) * 100;
      out.push({
        symbol: sym,
        price: +last.close.toFixed(2),
        change: +((last.close - hist[hist.length - 2]?.close ?? last.close) || 0).toFixed(2),
        changePercent: hist.length > 1 ? +(((last.close - hist[hist.length - 2].close) / hist[hist.length - 2].close) * 100).toFixed(2) : 0,
        returnPercent: +ret.toFixed(2),
      });
    }
    out.sort((a, b) => b.returnPercent - a.returnPercent);
    return out;
  }

  recordTrade(trade) {
    this.recentTrades.unshift(trade);
    if (this.recentTrades.length > 50) this.recentTrades.pop();
    this.emit('trade', trade);
  }

  #seedHistory(seed) {
    // Generate a backward random walk so history ENDS exactly at `seed`.
    // This way live ticks pick up naturally from the last historical close.
    const todayStart = Math.floor(Date.now() / 1000 / DAY) * DAY;
    const days = 365;
    const bars = [];
    let close = seed;
    for (let i = 0; i < days; i++) {
      const time = todayStart - i * DAY;
      const vol = seed * 0.012;
      const drift = (Math.random() - 0.5) * vol * 2;
      const open = Math.max(1, close - drift);
      const wick = Math.random() * seed * 0.006;
      const high = Math.max(open, close) + wick;
      const low = Math.max(1, Math.min(open, close) - wick);
      const volume = Math.floor((Math.random() * 0.6 + 0.4) * 1_000_000);
      bars.push({
        time, open: +open.toFixed(2), high: +high.toFixed(2),
        low: +low.toFixed(2), close: +close.toFixed(2), volume,
      });
      close = open;
    }
    return bars.reverse();
  }

  #rescaleHistory(sym, newClose) {
    const hist = this.history.get(sym);
    if (!hist?.length) return;
    const lastClose = hist[hist.length - 1].close;
    if (lastClose <= 0 || Math.abs(newClose / lastClose - 1) < 0.005) return;
    const factor = newClose / lastClose;
    for (const b of hist) {
      b.open = +(b.open * factor).toFixed(2);
      b.high = +(b.high * factor).toFixed(2);
      b.low = +(b.low * factor).toFixed(2);
      b.close = +(b.close * factor).toFixed(2);
    }
  }

  #makeBook(price) {
    const bids = [];
    const asks = [];
    for (let i = 1; i <= 8; i++) {
      bids.push({ price: +(price - i * 0.05).toFixed(2), qty: Math.floor(Math.random() * 800) + 50 });
      asks.push({ price: +(price + i * 0.05).toFixed(2), qty: Math.floor(Math.random() * 800) + 50 });
    }
    return { bids, asks };
  }

  #applyTick(sym, newPrice) {
    const prev = this.prices.get(sym);
    const change = newPrice - prev;
    this.prices.set(sym, newPrice);
    this.lastChange.set(sym, change);
    this.orderBooks.set(sym, this.#makeBook(newPrice));

    const hist = this.history.get(sym);
    const dayStart = Math.floor(Date.now() / 1000 / DAY) * DAY;
    const last = hist[hist.length - 1];
    const tradedVol = Math.floor(Math.random() * 20_000 + 5_000);

    if (last.time === dayStart) {
      last.close = +newPrice.toFixed(2);
      last.high = +Math.max(last.high, newPrice).toFixed(2);
      last.low = +Math.min(last.low, newPrice).toFixed(2);
      last.volume = (last.volume || 0) + tradedVol;
    } else {
      hist.push({
        time: dayStart,
        open: +prev.toFixed(2),
        high: +Math.max(prev, newPrice).toFixed(2),
        low: +Math.min(prev, newPrice).toFixed(2),
        close: +newPrice.toFixed(2),
        volume: tradedVol,
      });
      if (hist.length > 500) hist.shift();
    }

    this.emit('tick', { symbol: sym, price: +newPrice.toFixed(2), change: +change.toFixed(2) });

    if (Math.random() < 0.4) {
      this.recordTrade({
        symbol: sym, price: +newPrice.toFixed(2),
        qty: Math.floor(Math.random() * 200) + 1,
        side: change >= 0 ? 'BUY' : 'SELL', time: Date.now(),
      });
    }
  }

  #startSimulation() {
    setInterval(() => {
      for (const sym of this.symbols) {
        const cur = this.prices.get(sym);
        const vol = cur * 0.002;
        const next = Math.max(1, cur + (Math.random() - 0.5) * vol * 2);
        this.#applyTick(sym, next);
      }
    }, 1500);
  }

  async #startFinnhub() {
    const apiKey = process.env.FINNHUB_API_KEY;
    // Initial bootstrap: rescale historical chart for each symbol to live price.
    // Sequential with 150ms spacing to respect the 60 req/min free-tier limit.
    for (const sym of this.symbols) {
      try {
        const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${apiKey}`);
        const data = await r.json();
        if (data && data.c) {
          this.#rescaleHistory(sym, data.c);
          this.prices.set(sym, data.c);
          this.lastChange.set(sym, data.d || 0);
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 150));
    }

    // Rotating poller: one symbol per tick, ~1200ms apart.
    // For N=25 that's ~50 req/min and each symbol refreshes every ~30s.
    let idx = 0;
    setInterval(async () => {
      const sym = this.symbols[idx % this.symbols.length];
      idx += 1;
      try {
        const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${apiKey}`);
        const data = await r.json();
        if (data && data.c) this.#applyTick(sym, data.c);
      } catch {}
    }, 1200);
  }
}

export const market = new Market();
export { SYMBOLS };
