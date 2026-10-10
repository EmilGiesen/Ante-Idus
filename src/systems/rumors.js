// Gerüchte (data/rumors.json): in Tavernen und Bädern zu hören, schalten Aufträge und Wissen frei
import { G } from '../core/ctx.js';
import { checkCond, applyEffects } from './rules.js';

export function nextRumor(source) {
  const s = G.state;
  s.vars.rumors ||= [];
  const pool = G.data.rumors.filter((r) => !s.vars.rumors.includes(r.id) && (!r.where || r.where.includes(source)) && checkCond(r.if));
  if (!pool.length) return null;
  pool.sort((a, b) => (b.prio || 0) - (a.prio || 0));
  const top = pool.filter((r) => (r.prio || 0) === (pool[0].prio || 0));
  return top[Math.floor(Math.random() * top.length)];
}

export function tellRumor(source, npc) {
  const r = nextRumor(source);
  if (!r) {
    G.ui.dialog.custom({ text: G.data.dialogues._ambient.rumor_none[Math.floor(Math.random() * G.data.dialogues._ambient.rumor_none.length)] }, npc);
    return;
  }
  G.state.vars.rumors.push(r.id);
  G.ui.dialog.custom({ text: r.text, opts: [{ t: 'Interessant …', fn: () => applyEffects(r.do) }] }, npc);
}
