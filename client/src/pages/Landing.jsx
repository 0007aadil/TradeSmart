import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import CompanyLogo, { useCompanyProfile } from '../components/CompanyLogo.jsx';

/* ---------- Top Stories news section ---------- */

function formatRelative(ts) {
  const sec = Math.floor(Date.now() / 1000 - ts);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
  return `${Math.floor(sec / 86400)} day${Math.floor(sec / 86400) > 1 ? 's' : ''} ago`;
}

/* Detect Finnhub source-logo images we should hide (they render as ugly white blocks) */
const LOGO_DOMAINS = ['static2.finnhub.io', 'finnhub.io/api/logo', 'static.seekingalpha', 'media.zenfs.com'];
function isLikelyArticleImage(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.toLowerCase().includes('logo')) return false;
  if (LOGO_DOMAINS.some((d) => url.includes(d))) return false;
  return /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url);
}

function NewsThumb({ source, symbol }) {
  const colors = ['#2962ff', '#26a69a', '#ff9800', '#9b5de5', '#ef5350', '#00bbf9'];
  const key = symbol || source || 'N';
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const tint = colors[hash % colors.length];
  return (
    <div className="news-placeholder" style={{
      background: `linear-gradient(135deg, ${tint}55, ${tint}15 70%, rgba(0,0,0,0.5))`,
    }}>
      <div className="news-placeholder-label">{symbol || source?.split(' ')[0] || 'NEWS'}</div>
    </div>
  );
}

function NewsModal({ item, onClose }) {
  useEffect(() => {
    function esc(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!item) return null;
  const symList = item.related?.split(',').filter(Boolean).map((s) => s.trim()).slice(0, 4) || [];
  const useImage = isLikelyArticleImage(item.image);

  return (
    <div className="news-modal-backdrop" onClick={onClose}>
      <article className="news-modal" onClick={(e) => e.stopPropagation()}>
        <button className="news-modal-close" onClick={onClose} aria-label="Close">×</button>
        {useImage ? (
          <div className="news-modal-hero" style={{ backgroundImage: `url(${item.image})` }} />
        ) : (
          <NewsThumb source={item.source} symbol={symList[0]} />
        )}
        <div className="news-modal-body">
          <div className="news-modal-meta">
            <span className="news-source-chip">{item.source}</span>
            {symList.map((s) => <span key={s} className="news-chip">{s}</span>)}
            <span className="news-time">{formatRelative(item.datetime)}</span>
          </div>
          <h1 className="news-modal-headline">{item.headline}</h1>
          {item.summary && <p className="news-modal-summary">{item.summary}</p>}
          {item.url && item.url !== '#' && (
            <a className="btn primary lg news-modal-cta" href={item.url} target="_blank" rel="noopener noreferrer">
              Read full article on {item.source} →
            </a>
          )}
        </div>
      </article>
    </div>
  );
}

function TopStories() {
  const [news, setNews] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    fetch('/api/market/news').then((r) => r.json()).then(setNews).catch(() => setNews([]));
  }, []);

  if (!news || news.length === 0) return null;

  const [feature, ...rest] = news;
  const featureSym = feature?.related?.split(',')[0]?.trim();
  const featureHasImage = isLikelyArticleImage(feature?.image);

  return (
    <section className="news-section" id="news">
      <div className="section-head">
        <span className="kicker">Top Stories</span>
        <h2>All the most important headlines.</h2>
        <p>Live market news refreshed every five minutes.</p>
      </div>
      <div className="news-grid">
        <button type="button" className="news-feature" onClick={() => setOpen(feature)}>
          {featureHasImage ? (
            <div className="news-feature-img" style={{ backgroundImage: `url(${feature.image})` }} />
          ) : (
            <div className="news-feature-img news-feature-img-fallback">
              <NewsThumb source={feature.source} symbol={featureSym} />
            </div>
          )}
          <div className="news-feature-body">
            <div className="news-feature-meta">
              <span className="news-source-chip">{feature.source}</span>
              {featureSym && <span className="news-chip">{featureSym}</span>}
              <span className="news-time">{formatRelative(feature.datetime)}</span>
            </div>
            <h3 className="news-feature-headline">{feature.headline}</h3>
            {feature.summary && <p className="news-feature-summary">{feature.summary}</p>}
          </div>
        </button>
        <div className="news-list">
          {rest.slice(0, 5).map((n) => {
            const sym = n.related?.split(',')[0]?.trim();
            const ok = isLikelyArticleImage(n.image);
            return (
              <button type="button" key={n.id} className="news-card" onClick={() => setOpen(n)}>
                {ok ? (
                  <div className="news-card-img" style={{ backgroundImage: `url(${n.image})` }} />
                ) : (
                  <div className="news-card-img news-card-img-fallback">
                    <NewsThumb source={n.source} symbol={sym} />
                  </div>
                )}
                <div className="news-card-body">
                  <div className="news-card-meta">
                    <span className="news-source-chip">{n.source}</span>
                    {sym && <span className="news-chip">{sym}</span>}
                  </div>
                  <div className="news-card-headline">{n.headline}</div>
                  <div className="news-time">{formatRelative(n.datetime)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {open && <NewsModal item={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

/* ---------- Movers, Returns, Inflation Map ---------- */

function MoverRow({ item }) {
  const profile = useCompanyProfile(item.symbol);
  const up = (item.changePercent ?? item.change ?? 0) >= 0;
  return (
    <div className="mover-row">
      <CompanyLogo symbol={item.symbol} size={36} />
      <div className="mover-info">
        <div className="mover-name">{profile?.name || item.symbol}</div>
        <span className="news-chip">{item.symbol}</span>
      </div>
      <div className="mover-price">
        <div className="mover-px">${item.price?.toFixed(2)}</div>
        <div className={`mover-chg ${up ? 'up' : 'down'}`}>
          {up ? '+' : ''}{(item.changePercent ?? 0).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

function MoversCard({ title, items, subtitle }) {
  return (
    <div className="movers-card">
      <div className="movers-card-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="movers-list">
        {items.slice(0, 5).map((item) => (
          <MoverRow key={item.symbol} item={item} />
        ))}
      </div>
    </div>
  );
}

function MarketHighlights() {
  const [snapshot, setSnapshot] = useState([]);
  const [returns, setReturns] = useState([]);

  useEffect(() => {
    fetch('/api/market/snapshot').then((r) => r.json()).then(setSnapshot).catch(() => {});
    fetch('/api/market/top-returns').then((r) => r.json()).then(setReturns).catch(() => {});
    const i = setInterval(() => {
      fetch('/api/market/snapshot').then((r) => r.json()).then(setSnapshot).catch(() => {});
    }, 10000);
    return () => clearInterval(i);
  }, []);

  const enriched = snapshot.map((s) => ({
    symbol: s.symbol,
    price: s.price,
    change: s.change,
    changePercent: s.price > 0 ? (s.change / s.price) * 100 : 0,
  }));

  const mostActive = [...enriched].sort((a, b) => Math.abs(b.change || 0) - Math.abs(a.change || 0));
  const topGainers = [...enriched].sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
  const topLosers = [...enriched].sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0));

  if (snapshot.length === 0) return null;

  return (
    <>
      <section className="movers-section" id="highlights">
        <div className="section-head">
          <span className="kicker">Market Highlights</span>
          <h2>What's moving today.</h2>
          <p>Snapshot of the most active and biggest movers across our 40-ticker universe.</p>
        </div>
        <div className="movers-grid">
          <MoversCard title="Most active" subtitle="Largest absolute change" items={mostActive} />
          <MoversCard title="Top gainers" subtitle="Biggest % gain today" items={topGainers} />
          <MoversCard title="Top losers" subtitle="Biggest % drop today" items={topLosers} />
        </div>
      </section>

      {returns.length > 0 && (
        <section className="returns-section">
          <div className="section-head">
            <span className="kicker">Performance</span>
            <h2>Top performers across timeframes.</h2>
            <p>Computed from historical price data.</p>
          </div>
          <div className="returns-grid">
            <ReturnsTable title="Highest 1Y returns" rows={returns.slice(0, 6)} valueLabel="1Y Return" valueKey="returnPercent" />
            <ReturnsTable title="Biggest decliners" rows={[...returns].reverse().slice(0, 6)} valueLabel="1Y Return" valueKey="returnPercent" />
          </div>
        </section>
      )}
    </>
  );
}

function ReturnsTable({ title, rows, valueLabel, valueKey }) {
  return (
    <div className="returns-table">
      <div className="returns-table-head">
        <h3>{title}</h3>
      </div>
      <div className="returns-table-body">
        <div className="returns-row returns-row-head">
          <span>Symbol</span>
          <span>Price · Change</span>
          <span>{valueLabel}</span>
        </div>
        {rows.map((r) => (
          <ReturnsRow key={r.symbol} r={r} valueKey={valueKey} />
        ))}
      </div>
    </div>
  );
}

function ReturnsRow({ r, valueKey }) {
  const profile = useCompanyProfile(r.symbol);
  const v = r[valueKey];
  const up = (r.changePercent ?? 0) >= 0;
  return (
    <div className="returns-row">
      <div className="returns-sym-cell">
        <CompanyLogo symbol={r.symbol} size={28} />
        <div className="returns-sym-info">
          <div className="returns-sym-name">{profile?.name || r.symbol}</div>
          <span className="news-chip">{r.symbol}</span>
        </div>
      </div>
      <div className="returns-px-cell">
        <div className="returns-px">${r.price?.toFixed(2)}</div>
        <div className={`returns-chg ${up ? 'up' : 'down'}`}>
          {up ? '+' : ''}{r.changePercent?.toFixed(2)}%
        </div>
      </div>
      <div className={`returns-value ${v >= 0 ? 'up' : 'down'}`}>
        {v >= 0 ? '+' : ''}{v?.toFixed(2)}%
      </div>
    </div>
  );
}

/* ---------- Global Inflation Map (real World Bank data + TopoJSON) ---------- */

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
// world-atlas uses numeric IDs (UN M49). We need ISO3 to match World Bank data.
// Mapping: numericID -> { iso3, name }
// This covers all ~177 countries in the TopoJSON file.
const COUNTRY_MAP = {
  '004': { iso3: 'AFG', name: 'Afghanistan' }, '008': { iso3: 'ALB', name: 'Albania' }, '012': { iso3: 'DZA', name: 'Algeria' },
  '024': { iso3: 'AGO', name: 'Angola' }, '032': { iso3: 'ARG', name: 'Argentina' }, '036': { iso3: 'AUS', name: 'Australia' },
  '040': { iso3: 'AUT', name: 'Austria' }, '044': { iso3: 'BHS', name: 'Bahamas' }, '050': { iso3: 'BGD', name: 'Bangladesh' },
  '051': { iso3: 'ARM', name: 'Armenia' }, '056': { iso3: 'BEL', name: 'Belgium' }, '068': { iso3: 'BOL', name: 'Bolivia' },
  '070': { iso3: 'BIH', name: 'Bosnia and Herzegovina' }, '072': { iso3: 'BWA', name: 'Botswana' }, '076': { iso3: 'BRA', name: 'Brazil' },
  '084': { iso3: 'BLZ', name: 'Belize' }, '096': { iso3: 'BRN', name: 'Brunei' }, '100': { iso3: 'BGR', name: 'Bulgaria' },
  '104': { iso3: 'MMR', name: 'Myanmar' }, '108': { iso3: 'BDI', name: 'Burundi' }, '112': { iso3: 'BLR', name: 'Belarus' },
  '116': { iso3: 'KHM', name: 'Cambodia' }, '120': { iso3: 'CMR', name: 'Cameroon' }, '124': { iso3: 'CAN', name: 'Canada' },
  '140': { iso3: 'CAF', name: 'Central African Republic' }, '144': { iso3: 'LKA', name: 'Sri Lanka' }, '148': { iso3: 'TCD', name: 'Chad' },
  '152': { iso3: 'CHL', name: 'Chile' }, '156': { iso3: 'CHN', name: 'China' }, '170': { iso3: 'COL', name: 'Colombia' },
  '178': { iso3: 'COG', name: 'Congo' }, '180': { iso3: 'COD', name: 'DR Congo' }, '188': { iso3: 'CRI', name: 'Costa Rica' },
  '191': { iso3: 'HRV', name: 'Croatia' }, '192': { iso3: 'CUB', name: 'Cuba' }, '196': { iso3: 'CYP', name: 'Cyprus' },
  '203': { iso3: 'CZE', name: 'Czechia' }, '204': { iso3: 'BEN', name: 'Benin' }, '208': { iso3: 'DNK', name: 'Denmark' },
  '214': { iso3: 'DOM', name: 'Dominican Republic' }, '218': { iso3: 'ECU', name: 'Ecuador' }, '222': { iso3: 'SLV', name: 'El Salvador' },
  '226': { iso3: 'GNQ', name: 'Equatorial Guinea' }, '231': { iso3: 'ETH', name: 'Ethiopia' }, '232': { iso3: 'ERI', name: 'Eritrea' },
  '233': { iso3: 'EST', name: 'Estonia' }, '242': { iso3: 'FJI', name: 'Fiji' }, '246': { iso3: 'FIN', name: 'Finland' },
  '250': { iso3: 'FRA', name: 'France' }, '262': { iso3: 'DJI', name: 'Djibouti' }, '266': { iso3: 'GAB', name: 'Gabon' },
  '268': { iso3: 'GEO', name: 'Georgia' }, '270': { iso3: 'GMB', name: 'Gambia' }, '275': { iso3: 'PSE', name: 'Palestine' },
  '276': { iso3: 'DEU', name: 'Germany' }, '288': { iso3: 'GHA', name: 'Ghana' }, '300': { iso3: 'GRC', name: 'Greece' },
  '304': { iso3: 'GRL', name: 'Greenland' }, '320': { iso3: 'GTM', name: 'Guatemala' }, '324': { iso3: 'GIN', name: 'Guinea' },
  '328': { iso3: 'GUY', name: 'Guyana' }, '332': { iso3: 'HTI', name: 'Haiti' }, '340': { iso3: 'HND', name: 'Honduras' },
  '344': { iso3: 'HKG', name: 'Hong Kong' }, '348': { iso3: 'HUN', name: 'Hungary' }, '352': { iso3: 'ISL', name: 'Iceland' },
  '356': { iso3: 'IND', name: 'India' }, '360': { iso3: 'IDN', name: 'Indonesia' }, '364': { iso3: 'IRN', name: 'Iran' },
  '368': { iso3: 'IRQ', name: 'Iraq' }, '372': { iso3: 'IRL', name: 'Ireland' }, '376': { iso3: 'ISR', name: 'Israel' },
  '380': { iso3: 'ITA', name: 'Italy' }, '384': { iso3: 'CIV', name: "Côte d'Ivoire" }, '388': { iso3: 'JAM', name: 'Jamaica' },
  '392': { iso3: 'JPN', name: 'Japan' }, '398': { iso3: 'KAZ', name: 'Kazakhstan' }, '400': { iso3: 'JOR', name: 'Jordan' },
  '404': { iso3: 'KEN', name: 'Kenya' }, '408': { iso3: 'PRK', name: 'North Korea' }, '410': { iso3: 'KOR', name: 'South Korea' },
  '414': { iso3: 'KWT', name: 'Kuwait' }, '417': { iso3: 'KGZ', name: 'Kyrgyzstan' }, '418': { iso3: 'LAO', name: 'Laos' },
  '422': { iso3: 'LBN', name: 'Lebanon' }, '426': { iso3: 'LSO', name: 'Lesotho' }, '428': { iso3: 'LVA', name: 'Latvia' },
  '430': { iso3: 'LBR', name: 'Liberia' }, '434': { iso3: 'LBY', name: 'Libya' }, '440': { iso3: 'LTU', name: 'Lithuania' },
  '442': { iso3: 'LUX', name: 'Luxembourg' }, '450': { iso3: 'MDG', name: 'Madagascar' }, '454': { iso3: 'MWI', name: 'Malawi' },
  '458': { iso3: 'MYS', name: 'Malaysia' }, '466': { iso3: 'MLI', name: 'Mali' }, '478': { iso3: 'MRT', name: 'Mauritania' },
  '484': { iso3: 'MEX', name: 'Mexico' }, '496': { iso3: 'MNG', name: 'Mongolia' }, '498': { iso3: 'MDA', name: 'Moldova' },
  '499': { iso3: 'MNE', name: 'Montenegro' }, '504': { iso3: 'MAR', name: 'Morocco' }, '508': { iso3: 'MOZ', name: 'Mozambique' },
  '512': { iso3: 'OMN', name: 'Oman' }, '516': { iso3: 'NAM', name: 'Namibia' }, '524': { iso3: 'NPL', name: 'Nepal' },
  '528': { iso3: 'NLD', name: 'Netherlands' }, '540': { iso3: 'NCL', name: 'New Caledonia' }, '548': { iso3: 'VUT', name: 'Vanuatu' },
  '554': { iso3: 'NZL', name: 'New Zealand' }, '558': { iso3: 'NIC', name: 'Nicaragua' }, '562': { iso3: 'NER', name: 'Niger' },
  '566': { iso3: 'NGA', name: 'Nigeria' }, '578': { iso3: 'NOR', name: 'Norway' }, '586': { iso3: 'PAK', name: 'Pakistan' },
  '591': { iso3: 'PAN', name: 'Panama' }, '598': { iso3: 'PNG', name: 'Papua New Guinea' }, '600': { iso3: 'PRY', name: 'Paraguay' },
  '604': { iso3: 'PER', name: 'Peru' }, '608': { iso3: 'PHL', name: 'Philippines' }, '616': { iso3: 'POL', name: 'Poland' },
  '620': { iso3: 'PRT', name: 'Portugal' }, '624': { iso3: 'GNB', name: 'Guinea-Bissau' }, '626': { iso3: 'TLS', name: 'Timor-Leste' },
  '630': { iso3: 'PRI', name: 'Puerto Rico' }, '634': { iso3: 'QAT', name: 'Qatar' }, '642': { iso3: 'ROU', name: 'Romania' },
  '643': { iso3: 'RUS', name: 'Russia' }, '646': { iso3: 'RWA', name: 'Rwanda' }, '682': { iso3: 'SAU', name: 'Saudi Arabia' },
  '686': { iso3: 'SEN', name: 'Senegal' }, '688': { iso3: 'SRB', name: 'Serbia' }, '694': { iso3: 'SLE', name: 'Sierra Leone' },
  '703': { iso3: 'SVK', name: 'Slovakia' }, '704': { iso3: 'VNM', name: 'Vietnam' }, '705': { iso3: 'SVN', name: 'Slovenia' },
  '706': { iso3: 'SOM', name: 'Somalia' }, '710': { iso3: 'ZAF', name: 'South Africa' }, '716': { iso3: 'ZWE', name: 'Zimbabwe' },
  '724': { iso3: 'ESP', name: 'Spain' }, '728': { iso3: 'SSD', name: 'South Sudan' }, '729': { iso3: 'SDN', name: 'Sudan' },
  '740': { iso3: 'SUR', name: 'Suriname' }, '748': { iso3: 'SWZ', name: 'Eswatini' }, '752': { iso3: 'SWE', name: 'Sweden' },
  '756': { iso3: 'CHE', name: 'Switzerland' }, '760': { iso3: 'SYR', name: 'Syria' }, '762': { iso3: 'TJK', name: 'Tajikistan' },
  '764': { iso3: 'THA', name: 'Thailand' }, '768': { iso3: 'TGO', name: 'Togo' }, '780': { iso3: 'TTO', name: 'Trinidad and Tobago' },
  '784': { iso3: 'ARE', name: 'UAE' }, '788': { iso3: 'TUN', name: 'Tunisia' }, '792': { iso3: 'TUR', name: 'Turkey' },
  '795': { iso3: 'TKM', name: 'Turkmenistan' }, '800': { iso3: 'UGA', name: 'Uganda' }, '804': { iso3: 'UKR', name: 'Ukraine' },
  '807': { iso3: 'MKD', name: 'North Macedonia' }, '818': { iso3: 'EGY', name: 'Egypt' }, '826': { iso3: 'GBR', name: 'United Kingdom' },
  '834': { iso3: 'TZA', name: 'Tanzania' }, '840': { iso3: 'USA', name: 'United States' }, '854': { iso3: 'BFA', name: 'Burkina Faso' },
  '858': { iso3: 'URY', name: 'Uruguay' }, '860': { iso3: 'UZB', name: 'Uzbekistan' }, '862': { iso3: 'VEN', name: 'Venezuela' },
  '887': { iso3: 'YEM', name: 'Yemen' }, '894': { iso3: 'ZMB', name: 'Zambia' }, '158': { iso3: 'TWN', name: 'Taiwan' },
};

function inflationColor(value) {
  if (value == null) return '#1c1f28';
  if (value < 0) return '#fefce8';
  if (value < 2) return '#fef9c3';
  if (value < 4) return '#fde68a';
  if (value < 7) return '#fbbf24';
  if (value < 12) return '#f59e0b';
  if (value < 25) return '#ea580c';
  if (value < 50) return '#c2410c';
  return '#7c2d12';
}

function InflationMap() {
  const [features, setFeatures] = useState(null);
  const [inflation, setInflation] = useState({});
  const [hover, setHover] = useState(null);

  useEffect(() => {
    fetch(WORLD_TOPO_URL)
      .then((r) => r.json())
      .then((topo) => setFeatures(feature(topo, topo.objects.countries).features))
      .catch(() => {});
    fetch('/api/macro/inflation')
      .then((r) => r.json())
      .then(setInflation)
      .catch(() => {});
  }, []);

  const W = 1000, H = 520;
  const projection = useMemo(() => geoNaturalEarth1().scale(170).translate([W / 2, H / 2]), []);
  const pathGen = useMemo(() => geoPath(projection), [projection]);

  const top = useMemo(() => {
    const arr = Object.entries(inflation)
      .map(([iso3, value]) => {
        const meta = Object.values(COUNTRY_MAP).find((c) => c.iso3 === iso3);
        return { iso3, name: meta?.name || iso3, value };
      })
      .filter((c) => c.value != null && c.value < 1000)
      .sort((a, b) => b.value - a.value);
    return arr.slice(0, 10);
  }, [inflation]);

  return (
    <section className="inflation-section" id="inflation">
      <div className="section-head">
        <span className="kicker">Macro</span>
        <h2>Global inflation map.</h2>
        <p>Annual consumer-price inflation by country · World Bank data, updated daily.</p>
      </div>
      <div className="inflation-wrap">
        <div className="inflation-map">
          {features ? (
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="world-svg">
              <g>
                {features.map((c) => {
                  const idKey = String(c.id).padStart(3, '0');
                  const meta = COUNTRY_MAP[idKey];
                  const iso = meta?.iso3;
                  const value = iso ? inflation[iso] : null;
                  const d = pathGen(c);
                  if (!d) return null;
                  return (
                    <path
                      key={c.id}
                      d={d}
                      fill={inflationColor(value)}
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth="0.4"
                      className="world-country"
                      onMouseEnter={() => setHover({ name: meta?.name || `#${c.id}`, value })}
                      onMouseLeave={() => setHover(null)}
                    />
                  );
                })}
              </g>
            </svg>
          ) : (
            <div className="world-loading">Loading world map…</div>
          )}
          {hover && (
            <div className="world-tooltip">
              <strong>{hover.name}</strong>
              <span>{hover.value != null ? `${hover.value.toFixed(2)}%` : 'No data'}</span>
            </div>
          )}
          <div className="inflation-legend">
            <span className="inflation-legend-label">0%</span>
            {[1, 3, 6, 10, 20, 40, 70].map((v) => (
              <span key={v} className="inflation-legend-step" style={{ background: inflationColor(v) }} title={`${v}%`} />
            ))}
            <span className="inflation-legend-label">70%+</span>
          </div>
        </div>
        <div className="inflation-top">
          <h3>Highest inflation</h3>
          {top.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</div>}
          {top.map((c) => (
            <div key={c.iso3} className="inflation-row">
              <div className="inflation-row-left">
                <span className="inflation-dot" style={{ background: inflationColor(c.value) }} />
                <span className="inflation-country">{c.name}</span>
              </div>
              <div className="inflation-rate">{c.value.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Visual mockups (styled previews of the actual product) ---------- */

function ChartMock({ seed = 1 }) {
  const candles = useMemo(() => {
    const rng = mulberry32(seed);
    const out = [];
    let price = 100;
    for (let i = 0; i < 30; i++) {
      const open = price;
      const move = (rng() - 0.44) * 8;
      const close = open + move;
      const high = Math.max(open, close) + rng() * 3;
      const low = Math.min(open, close) - rng() * 3;
      out.push({ open, close, high, low });
      price = close;
    }
    return out;
  }, [seed]);

  const W = 600, H = 280;
  const min = Math.min(...candles.map((c) => c.low)) - 1;
  const max = Math.max(...candles.map((c) => c.high)) + 1;
  const sy = (v) => H - ((v - min) / (max - min)) * H;
  const cw = (W / candles.length) - 3;

  // SMA-5
  const sma = [];
  for (let i = 4; i < candles.length; i++) {
    const avg = (candles[i].close + candles[i - 1].close + candles[i - 2].close + candles[i - 3].close + candles[i - 4].close) / 5;
    sma.push({ x: i * (W / candles.length) + cw / 2, y: sy(avg) });
  }
  const smaPath = sma.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H + 40}`} className="mock-chart">
      <defs>
        <linearGradient id="mc-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2962ff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#2962ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((p) => (
        <line key={p} x1="0" y1={H * p} x2={W} y2={H * p} stroke="#22252d" strokeWidth="1" strokeDasharray="2 4" />
      ))}
      <path d={`${smaPath} L ${W} ${H} L 0 ${H} Z`} fill="url(#mc-grad)" />
      {candles.map((c, i) => {
        const x = i * (W / candles.length);
        const up = c.close >= c.open;
        const color = up ? '#26a69a' : '#ef5350';
        return (
          <g key={i}>
            <line x1={x + cw / 2} y1={sy(c.high)} x2={x + cw / 2} y2={sy(c.low)} stroke={color} strokeWidth="1.5" />
            <rect x={x} y={sy(Math.max(c.open, c.close))} width={cw} height={Math.max(1, Math.abs(sy(c.open) - sy(c.close)))} fill={color} />
          </g>
        );
      })}
      <path d={smaPath} fill="none" stroke="#ff9800" strokeWidth="2" />
      {candles.slice(20).map((c, i) => {
        const x = (20 + i) * (W / candles.length);
        return (
          <rect
            key={i}
            x={x}
            y={H + 6}
            width={cw}
            height={20 + Math.random() * 14}
            fill={c.close >= c.open ? 'rgba(22, 199, 132, 0.5)' : 'rgba(234, 57, 67, 0.5)'}
          />
        );
      })}
    </svg>
  );
}

function OrderBookMock() {
  const asks = [
    { p: 296.45, q: 540, w: 90 },
    { p: 296.32, q: 280, w: 50 },
    { p: 296.21, q: 815, w: 100 },
    { p: 296.10, q: 195, w: 35 },
    { p: 296.04, q: 472, w: 70 },
  ];
  const bids = [
    { p: 295.91, q: 600, w: 80 },
    { p: 295.84, q: 320, w: 45 },
    { p: 295.72, q: 905, w: 100 },
    { p: 295.61, q: 250, w: 40 },
    { p: 295.50, q: 412, w: 60 },
  ];
  return (
    <div className="mock-book">
      <div className="mock-book-head">
        <span>Price</span><span>Qty</span><span>Total</span>
      </div>
      {asks.map((a, i) => (
        <div key={`a${i}`} className="mock-book-row ask">
          <div className="mock-book-bar" style={{ width: `${a.w}%`, background: 'rgba(234, 57, 67, 0.18)' }} />
          <span className="px">{a.p.toFixed(2)}</span>
          <span>{a.q}</span>
          <span>{(a.p * a.q).toFixed(0)}</span>
        </div>
      ))}
      <div className="mock-book-spread">Spread $0.13 · Last $295.97</div>
      {bids.map((b, i) => (
        <div key={`b${i}`} className="mock-book-row bid">
          <div className="mock-book-bar" style={{ width: `${b.w}%`, background: 'rgba(22, 199, 132, 0.18)' }} />
          <span className="px">{b.p.toFixed(2)}</span>
          <span>{b.q}</span>
          <span>{(b.p * b.q).toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}

function PortfolioMock() {
  const points = useMemo(() => {
    const rng = mulberry32(7);
    const out = [];
    let v = 100000;
    for (let i = 0; i < 40; i++) {
      v += (rng() - 0.42) * 80;
      out.push(v);
    }
    return out;
  }, []);
  const W = 480, H = 140;
  const min = Math.min(...points) - 50;
  const max = Math.max(...points) + 50;
  const sy = (v) => H - ((v - min) / (max - min)) * H;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i / (points.length - 1)) * W} ${sy(p)}`).join(' ');
  const last = points[points.length - 1];
  const first = points[0];
  const up = last >= first;

  return (
    <div className="mock-portfolio">
      <div className="mock-port-stats">
        <div>
          <div className="mock-port-label">Total Value</div>
          <div className="mock-port-value">${last.toFixed(2)}</div>
        </div>
        <div>
          <div className="mock-port-label">Today's P&amp;L</div>
          <div className={`mock-port-value ${up ? 'up' : 'down'}`}>
            {up ? '▲ +' : '▼ '}${Math.abs(last - first).toFixed(2)}
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mock-port-chart">
        <defs>
          <linearGradient id="mp-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={up ? '#26a69a' : '#ef5350'} stopOpacity="0.35" />
            <stop offset="100%" stopColor={up ? '#26a69a' : '#ef5350'} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L ${W} ${H} L 0 ${H} Z`} fill="url(#mp-grad)" />
        <path d={path} fill="none" stroke={up ? '#26a69a' : '#ef5350'} strokeWidth="2" />
      </svg>
      <div className="mock-port-allocation">
        {[
          { sym: 'AAPL', pct: 32, color: '#2962ff' },
          { sym: 'NVDA', pct: 24, color: '#26a69a' },
          { sym: 'MSFT', pct: 18, color: '#ff9800' },
          { sym: 'TSLA', pct: 14, color: '#9b5de5' },
          { sym: 'META', pct: 12, color: '#ef5350' },
        ].map((a) => (
          <div key={a.sym} className="mock-port-alloc">
            <span className="dot" style={{ background: a.color }} />
            <span>{a.sym}</span>
            <span className="pct">{a.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderFormMock() {
  return (
    <div className="mock-orderform">
      <div className="mock-of-head">
        <span>Place Order</span>
        <span className="mock-of-sym">AAPL · $295.97</span>
      </div>
      <div className="mock-of-toggle">
        <div className="active-buy">Buy</div>
        <div>Sell</div>
      </div>
      <div className="mock-of-row">
        <div className="mock-of-field">
          <label>Type</label>
          <div className="mock-of-input">Market Order ▾</div>
        </div>
      </div>
      <div className="mock-of-row">
        <div className="mock-of-field">
          <label>Quantity</label>
          <div className="mock-of-input">100</div>
        </div>
      </div>
      <div className="mock-of-est">Est. cost: $29,597.00</div>
      <div className="mock-of-button">BUY AAPL</div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="hero-preview">
      <div className="hero-preview-glow" />
      <div className="hero-preview-frame">
        <div className="hero-preview-bar">
          <span className="hp-dot r" /><span className="hp-dot y" /><span className="hp-dot g" />
          <span className="hp-title">TradeSmart · Dashboard</span>
        </div>
        <div className="hero-preview-grid">
          <div className="hp-watch">
            <div className="hp-section">WATCHLIST</div>
            {[
              { s: 'AAPL', p: '295.97', d: '+0.32', up: true },
              { s: 'NVDA', p: '219.45', d: '-0.18', up: false },
              { s: 'TSLA', p: '406.39', d: '+1.24', up: true },
              { s: 'MSFT', p: '423.70', d: '-0.42', up: false },
              { s: 'GOOGL', p: '398.47', d: '+0.10', up: true },
            ].map((w) => (
              <div key={w.s} className={`hp-row ${w.s === 'AAPL' ? 'active' : ''}`}>
                <span>{w.s}</span>
                <span className="hp-px">${w.p} <em className={w.up ? 'up' : 'down'}>{w.d}</em></span>
              </div>
            ))}
          </div>
          <div className="hp-chart"><ChartMock seed={42} /></div>
          <div className="hp-order"><OrderFormMock /></div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Utilities ---------- */

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------- Main page ---------- */

export default function Landing() {
  const [snapshot, setSnapshot] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const load = () => fetch('/api/market/snapshot').then((r) => r.json()).then(setSnapshot).catch(() => {});
    load();
    const i = setInterval(load, 4000);
    return () => clearInterval(i);
  }, []);

  function closeMenu() { setMenuOpen(false); }

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">TradeSmart</div>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#markets">Markets</a>
            <a href="#highlights">Highlights</a>
            <a href="#inflation">Macro</a>
            <a href="#news">Top Stories</a>
            <a href="#how">How it works</a>
          </div>
          <div className="landing-nav-cta">
            <Link to="/login" className="btn ghost">Log in</Link>
            <Link to="/signup" className="btn primary">Get started free</Link>
          </div>
          <button className={`hamburger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
        {menuOpen && (
          <div className="mobile-menu">
            <a href="#features" onClick={closeMenu}>Features</a>
            <a href="#markets" onClick={closeMenu}>Markets</a>
            <a href="#highlights" onClick={closeMenu}>Highlights</a>
            <a href="#inflation" onClick={closeMenu}>Macro</a>
            <a href="#news" onClick={closeMenu}>Top Stories</a>
            <a href="#built-for" onClick={closeMenu}>Who it's for</a>
            <a href="#how" onClick={closeMenu}>How it works</a>
            <div className="mobile-menu-cta">
              <Link to="/login" className="btn ghost" onClick={closeMenu}>Log in</Link>
              <Link to="/signup" className="btn primary" onClick={closeMenu}>Get started free</Link>
            </div>
          </div>
        )}
      </nav>

      <div className="ticker">
        <div className="ticker-track">
          {snapshot.concat(snapshot).map((s, i) => (
            <span key={i} className="ticker-item">
              <strong>{s.symbol}</strong> ${s.price?.toFixed(2)}{' '}
              <span className={s.change >= 0 ? 'up' : 'down'}>
                ({s.change >= 0 ? '+' : ''}{s.change?.toFixed(2)})
              </span>
            </span>
          ))}
        </div>
      </div>

      <section className="hero">
        <div className="hero-grid-bg" />
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge">
              <span className="hero-dot" />
              Live market data · streaming now
            </div>
            <h1 className="hero-title">
              The trading dashboard <br />
              <span className="hero-title-accent">built for clarity.</span>
            </h1>
            <p className="hero-sub">
              Professional candlestick charts, live order book depth, instant order execution,
              and real-time portfolio analytics — all in one focused, distraction-free interface.
            </p>
            <div className="hero-cta">
              <Link to="/signup" className="btn primary lg">Start Trading Free →</Link>
              <Link to="/login" className="btn lg ghost">Log in</Link>
            </div>
            <div className="hero-trust">
              <span className="check">✓</span> $100k virtual cash
              <span className="check">✓</span> No credit card
              <span className="check">✓</span> 60-second signup
            </div>
          </div>
          <div className="hero-right">
            <DashboardPreview />
          </div>
        </div>
      </section>

      <section className="stats-bar">
        <div className="stats-bar-inner">
          <div className="stat-block"><strong>40+</strong><span>Live tickers</span></div>
          <div className="stat-block"><strong>5</strong><span>Chart timeframes</span></div>
          <div className="stat-block"><strong>1.2s</strong><span>Tick latency</span></div>
          <div className="stat-block"><strong>$100k</strong><span>Starting capital</span></div>
          <div className="stat-block"><strong>0¢</strong><span>Commissions</span></div>
        </div>
      </section>

      <section className="spotlight" id="features">
        <div className="spotlight-inner">
          <div className="spotlight-text">
            <span className="kicker">Charting</span>
            <h2>Professional candlestick charts you can actually read.</h2>
            <p>
              OHLC candles, 20-period SMA overlay, color-coded volume histogram, and five timeframes
              from intraday to one year. Every chart breathes in real time as ticks arrive — no
              refresh required.
            </p>
            <ul className="spotlight-list">
              <li>Lightweight Charts engine — buttery 60fps</li>
              <li>Live price line + period high/low markers</li>
              <li>Hover crosshair with precise OHLCV readout</li>
              <li>1D · 1W · 1M · 3M · 1Y timeframes</li>
            </ul>
          </div>
          <div className="spotlight-visual">
            <div className="visual-glow blue" />
            <div className="visual-frame">
              <div className="visual-frame-head">
                <strong>AAPL</strong> $295.97 <span className="up">▲ +0.32 (+0.11%)</span>
              </div>
              <ChartMock seed={1} />
            </div>
          </div>
        </div>
      </section>

      <section className="spotlight reverse">
        <div className="spotlight-inner">
          <div className="spotlight-visual">
            <div className="visual-glow green" />
            <div className="visual-frame narrow">
              <div className="visual-frame-head">
                <strong>Order Book</strong> <span className="muted">Level 2</span>
              </div>
              <OrderBookMock />
            </div>
          </div>
          <div className="spotlight-text">
            <span className="kicker">Depth & Execution</span>
            <h2>See the market before you trade it.</h2>
            <p>
              Watch bid and ask depth update in real time, with bar overlays that show exactly
              where the liquidity sits. Then place a market or limit order from the same panel —
              fills land in milliseconds.
            </p>
            <ul className="spotlight-list">
              <li>Live bid/ask ladder with quantity bars</li>
              <li>Spread, last trade, and recent prints</li>
              <li>Market & Limit order types</li>
              <li>Pending limits fill automatically when crossed</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="spotlight">
        <div className="spotlight-inner">
          <div className="spotlight-text">
            <span className="kicker">Portfolio</span>
            <h2>Track every dollar in real time.</h2>
            <p>
              Today's P&amp;L, total return, sector allocation, and a 24-hour value chart that
              updates as the market moves. Know exactly where you stand — without leaving the
              dashboard.
            </p>
            <ul className="spotlight-list">
              <li>Live total value &amp; daily P&amp;L</li>
              <li>Position-level cost basis &amp; gain</li>
              <li>Allocation pie + 24h value chart</li>
              <li>Full order history with cancel</li>
            </ul>
          </div>
          <div className="spotlight-visual">
            <div className="visual-glow purple" />
            <div className="visual-frame">
              <div className="visual-frame-head">
                <strong>My Portfolio</strong> <span className="muted">Live</span>
              </div>
              <PortfolioMock />
            </div>
          </div>
        </div>
      </section>

      <section className="markets-section" id="markets">
        <div className="section-head">
          <span className="kicker">Markets</span>
          <h2>40+ tickers, streaming live.</h2>
          <p>Tech, finance, consumer, semis, and ETFs — refreshed every second.</p>
        </div>
        <div className="market-grid">
          {snapshot.slice(0, 12).map((s) => (
            <div key={s.symbol} className="market-card">
              <div className="market-sym">{s.symbol}</div>
              <div className="market-price">${s.price?.toFixed(2)}</div>
              <div className={`market-change ${s.change >= 0 ? 'up' : 'down'}`}>
                {s.change >= 0 ? '▲' : '▼'} {s.change >= 0 ? '+' : ''}{s.change?.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="builtfor" id="built-for">
        <div className="section-head">
          <span className="kicker">Built For</span>
          <h2>Whoever you are at the screen.</h2>
        </div>
        <div className="builtfor-grid">
          <div className="bf-card">
            <div className="bf-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <h3>Day traders</h3>
            <p>Watch live order books, place market and limit orders, and track intraday P&amp;L without a single page refresh.</p>
          </div>
          <div className="bf-card">
            <div className="bf-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9l10-5 10 5-10 5-10-5z" />
                <path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5" />
              </svg>
            </div>
            <h3>Learners</h3>
            <p>Practice with $100k of virtual cash, study candlestick patterns, and feel how real-time markets behave — no risk.</p>
          </div>
          <div className="bf-card">
            <div className="bf-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <h3>Developers</h3>
            <p>Full-stack reference implementation: React, Node.js, WebSockets, SQLite, and a real broker-like order engine.</p>
          </div>
        </div>
      </section>

      <MarketHighlights />

      <InflationMap />

      <TopStories />


      <section className="how-section" id="how">
        <div className="section-head">
          <span className="kicker">Get Started</span>
          <h2>Trade in under 60 seconds.</h2>
        </div>
        <div className="steps">
          <div className="step">
            <div className="step-num">01</div>
            <h3>Create your account</h3>
            <p>Sign up with email and password. We hand you $100,000 in virtual cash.</p>
          </div>
          <div className="step">
            <div className="step-num">02</div>
            <h3>Pick your stocks</h3>
            <p>Add any of 40+ tracked tickers to your watchlist — one click each.</p>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <h3>Place your first trade</h3>
            <p>Buy at market or set a limit order. Watch your portfolio update in real time.</p>
          </div>
        </div>
      </section>

      <section className="cta-banner">
        <div className="cta-inner">
          <h2>Trade smarter today.</h2>
          <p>Free forever. Simulated. Ready in under a minute.</p>
          <Link to="/signup" className="btn primary lg">Create Your Account →</Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-col footer-brand">
            <div className="landing-logo">TradeSmart</div>
            <p>A real-time stock trading dashboard for the modern trader. Built with React, Node.js, and Socket.io.</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#markets">Markets</a>
            <a href="#built-for">Who it's for</a>
            <a href="#how">How it works</a>
          </div>
          <div className="footer-col">
            <h4>Account</h4>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </div>
          <div className="footer-col">
            <h4>Disclaimer</h4>
            <p className="footer-disclaimer">
              Simulated trading only. No real money. Prices may not reflect actual market values. Educational use only.
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 TradeSmart · All paper, no risk.</span>
          <span>v1.0 · Real-time fintech demo</span>
        </div>
      </footer>
    </div>
  );
}
