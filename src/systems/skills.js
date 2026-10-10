// Fertigkeiten mit Stufen: steigen durch Tun (Erfahrungspunkte), schalten Möglichkeiten frei
import { G } from '../core/ctx.js';
import { buffFx } from './buffs.js';

export const skillDefs = () => G.data.skills.list;

export function xpOf(id) { return G.state.sk[id] || 0; }

export function level(id) {
  const t = G.data.skills.thresholds;
  const xp = xpOf(id);
  let l = 0;
  while (l < t.length && xp >= t[l]) l++;
  return l;
}

// Fortschritt zur nächsten Stufe (0..1)
export function progress(id) {
  const t = G.data.skills.thresholds;
  const l = level(id);
  if (l >= t.length) return 1;
  const lo = l === 0 ? 0 : t[l - 1];
  return (xpOf(id) - lo) / (t[l] - lo);
}

export function addXp(id, n) {
  if (!n || !skillDefs()[id]) return;
  const before = level(id);
  G.state.sk[id] = xpOf(id) + Math.round(n * (1 + buffFx('xp')));
  const after = level(id);
  if (after > before) {
    const def = skillDefs()[id];
    const perk = def.perks && def.perks[String(after)];
    G.ui.toast(`★ ${def.name}: Stufe ${after}!${perk ? ` – ${perk}` : ''}`, 'done');
  }
}

