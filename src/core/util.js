export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

export function roman(n) {
  let s = '';
  for (const [v, r] of ROMAN) while (n >= v) { s += r; n -= v; }
  return s;
}

// Geld: intern immer Asse. 1 Denar = 4 Sesterzen = 16 Asse
export function coins(asses) {
  const neg = asses < 0;
  let a = Math.abs(Math.round(asses));
  const den = Math.floor(a / 16); a -= den * 16;
  const ses = Math.floor(a / 4); a -= ses * 4;
  return { den, ses, as: a, neg };
}

export function formatMoney(asses) {
  const c = coins(asses);
  const parts = [];
  if (c.den) parts.push(`${c.den} Denar${c.den === 1 ? '' : 'e'}`);
  if (c.ses) parts.push(`${c.ses} Sesterz${c.ses === 1 ? '' : 'en'}`);
  if (c.as || !parts.length) parts.push(`${c.as} As${c.as === 1 ? '' : 'se'}`);
  return (c.neg ? '−' : '') + parts.join(', ');
}

export function shortMoney(asses) {
  const c = coins(asses);
  const parts = [];
  if (c.den) parts.push(`${c.den} Den.`);
  if (c.ses) parts.push(`${c.ses} HS`);
  if (c.as || !parts.length) parts.push(`${c.as} As`);
  return parts.join(' ');
}
