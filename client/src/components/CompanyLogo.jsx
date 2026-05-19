import { useEffect, useState } from 'react';

const profileCache = new Map();
const profilePromises = new Map();

export function fetchProfile(symbol) {
  if (!symbol) return Promise.resolve(null);
  if (profileCache.has(symbol)) return Promise.resolve(profileCache.get(symbol));
  if (profilePromises.has(symbol)) return profilePromises.get(symbol);
  const p = fetch(`/api/market/profile/${symbol}`)
    .then((r) => r.json())
    .then((d) => { profileCache.set(symbol, d); profilePromises.delete(symbol); return d; })
    .catch(() => { profilePromises.delete(symbol); const fb = { symbol, name: symbol, logo: null }; profileCache.set(symbol, fb); return fb; });
  profilePromises.set(symbol, p);
  return p;
}

export function useCompanyProfile(symbol) {
  const [profile, setProfile] = useState(() => (symbol ? profileCache.get(symbol) || null : null));
  useEffect(() => {
    if (!symbol) return;
    if (profileCache.has(symbol)) {
      setProfile(profileCache.get(symbol));
      return;
    }
    let cancelled = false;
    fetchProfile(symbol).then((p) => { if (!cancelled) setProfile(p); });
    return () => { cancelled = true; };
  }, [symbol]);
  return profile;
}

const FALLBACK_COLORS = ['#2962ff', '#26a69a', '#ff9800', '#9b5de5', '#ef5350', '#00bbf9', '#f15bb5', '#fee440'];

function pickColor(sym) {
  let hash = 0;
  for (let i = 0; i < sym.length; i++) hash = (hash * 31 + sym.charCodeAt(i)) >>> 0;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

export default function CompanyLogo({ symbol, size = 32, className = '' }) {
  const profile = useCompanyProfile(symbol);
  const [errored, setErrored] = useState(false);

  if (!symbol) return null;

  if (profile?.logo && !errored) {
    return (
      <img
        src={profile.logo}
        alt={symbol}
        className={`company-logo ${className}`}
        style={{ width: size, height: size }}
        onError={() => setErrored(true)}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`company-logo-fallback ${className}`}
      style={{
        width: size, height: size,
        background: pickColor(symbol),
        fontSize: Math.max(10, size * 0.42),
      }}
    >
      {symbol.charAt(0)}
    </div>
  );
}
