// Zeitlich begrenzte Boni (z. B. nach Opfergaben oder gutem Essen). Dauer in Spielstunden.
import { G } from '../core/ctx.js';

const now = () => G.state.time.day * 24 + G.state.time.hour;

export function addBuff(id, name, hours, fx) {
  const s = G.state;
  s.buffs = (s.buffs || []).filter((b) => b.id !== id);
  s.buffs.push({ id, name, until: now() + hours, fx });
}

export function activeBuffs() {
  const s = G.state;
  if (!s.buffs) return [];
  const t = now();
  s.buffs = s.buffs.filter((b) => b.until > t);
  return s.buffs;
}

// Summe eines Effekts über alle aktiven Boni (z. B. 'pay' = +0.15 für 15 % mehr Lohn)
export function buffFx(key) {
  let v = 0;
  for (const b of activeBuffs()) v += b.fx[key] || 0;
  return v;
}

export const hoursLeft = (b) => Math.max(0, b.until - now());
