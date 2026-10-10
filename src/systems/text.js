// Platzhalter in Texten: {name}, {g:männlich|weiblich}, {money:var}, {var:name}, {rent}, {cash}
import { G } from '../core/ctx.js';
import { formatMoney } from '../core/util.js';

export function fmt(str) {
  if (!str) return '';
  const s = G.state;
  return str.replace(/\{(\w+)(?::([^}]*))?\}/g, (m, key, arg) => {
    switch (key) {
      case 'name': return s.name;
      case 'g': { const [male, female] = arg.split('|'); return s.gender === 'f' ? female : male; }
      case 'money': return formatMoney(s.vars[arg] ?? 0);
      case 'var': return String(s.vars[arg] ?? 0);
      case 'rent': return formatMoney(s.rent ? s.rent.amount : 0);
      case 'cash': return formatMoney(s.money);
      default: return m;
    }
  });
}
