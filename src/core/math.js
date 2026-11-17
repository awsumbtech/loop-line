// Small number helpers shared across the game.

export const mod = (a, n) => ((a % n) + n) % n;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const isNum = v => typeof v === 'number' && Number.isFinite(v);

// A repeatable random number source: the same seed always gives the same numbers.
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1234 -> "1234", 15300 -> "15.3K"
export function formatNumber(n) {
  if (n < 1000) return String(Math.floor(n + 1e-9));
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi'];
  let i = -1;
  while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
  const digits = n >= 100 ? 0 : n >= 10 ? 1 : 2;
  const cut = Math.floor(n * Math.pow(10, digits) + 1e-9) / Math.pow(10, digits);
  return cut.toFixed(digits) + units[i];
}
