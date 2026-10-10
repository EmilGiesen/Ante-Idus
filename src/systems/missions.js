// Missionen: Angebote statt Zwang. Schritte werden per Dialog-Effekt oder automatisch (Ort/Gegenstand) erfüllt.
import { G } from '../core/ctx.js';
import { bus } from '../core/events.js';
import { applyEffects, checkCond } from './rules.js';
import { fmt } from './text.js';
import * as Inv from './inventory.js';

export const mdef = (id) => G.data.missions[id];
const ms = (id) => G.state.missions[id];

export const isActive = (id) => ms(id)?.status === 'active';
export const timesDone = (id) => ms(id)?.count || 0;
export const currentStep = (id) => (isActive(id) ? mdef(id).steps[ms(id).step] : null);

export function canStart(id) {
  const d = mdef(id);
  if (!d) return false;
  const s = G.state;
  if (d.cls && !d.cls.includes(s.cls)) return false;
  const m = ms(id);
  if (m && m.status === 'active') return false;
  if (m && m.count > 0 && !d.repeat) return false;
  if (m && d.repeat && m.dayN && m.dayN.day === s.time.day && m.dayN.n >= (d.perDay || 1)) return false;
  if (d.req && !checkCond(d.req)) return false;
  return true;
}

export function startMission(id) {
  const d = mdef(id);
  if (!d) { console.warn('Unbekannte Mission', id); return; }
  if (isActive(id)) return;
  const prev = ms(id);
  G.state.missions[id] = { status: 'active', step: 0, count: prev?.count || 0, lastDay: prev?.lastDay ?? -1, dayN: prev?.dayN || null };
  G.state.tracked = id;
  if (!d.silent) G.ui.toast(`Neue Aufgabe: ${d.title}`, 'mission');
  applyEffects(d.onStart);
  stepStarted(id);
  bus.emit('missions');
}

function stepStarted(id) {
  const step = currentStep(id);
  if (step && step.onStart) applyEffects(step.onStart);
}

export function advanceMission(id) {
  if (!isActive(id)) return;
  const d = mdef(id);
  const m = ms(id);
  const step = d.steps[m.step];
  if (step && step.onDone) applyEffects(step.onDone);
  m.step++;
  if (m.step >= d.steps.length) completeMission(id);
  else {
    G.ui.toast(`Nächstes Ziel: ${fmt(d.steps[m.step].text)}`, 'mission');
    stepStarted(id);
  }
  bus.emit('missions');
}

export function completeMission(id) {
  const m = ms(id);
  if (!m) return;
  const d = mdef(id);
  m.status = 'done';
  m.count++;
  m.lastDay = G.state.time.day;
  m.dayN = m.dayN && m.dayN.day === m.lastDay ? { day: m.lastDay, n: m.dayN.n + 1 } : { day: m.lastDay, n: 1 };
  G.ui.toast(`✔ Aufgabe erledigt: ${d.title}`, 'done');
  applyEffects(d.reward);
  if (G.state.tracked === id) G.state.tracked = activeList()[0] || null;
  bus.emit('missions');
}

export function abandonMission(id) {
  const m = ms(id);
  if (!m || m.status !== 'active') return;
  const d = mdef(id);
  if (d.noAbandon) return;
  if (m.count > 0) m.status = 'done';
  else delete G.state.missions[id];
  for (const it of d.questItems || []) if (Inv.count(it)) Inv.remove(it, Inv.count(it));
  if (G.state.tracked === id) G.state.tracked = activeList()[0] || null;
  applyEffects(d.onAbandon);
  bus.emit('missions');
}

export const activeList = () => Object.keys(G.state.missions).filter(isActive);

export function availableList() {
  return Object.keys(G.data.missions).filter((id) => {
    const d = mdef(id);
    return !d.hidden && canStart(id);
  });
}

// Sklaven dürfen den Palatin nur mit Auftrag verlassen
export function hasPermit() {
  return activeList().some((id) => {
    const d = mdef(id);
    if (!d.permit) return false;
    return d.permit === true || d.permit.includes(ms(id).step);
  });
}

// Automatisch erfüllbare Schritte: Ort erreicht / Gegenstand vorhanden
export function checkAuto(mapId, tx, ty) {
  for (const id of activeList()) {
    const step = currentStep(id);
    if (!step || !step.auto) continue;
    const a = step.auto;
    if (a.area && mapId === (a.map || 'rom') && G.game.mapById(mapId).inArea(a.area, tx, ty)) advanceMission(id);
    else if (a.item && Inv.count(a.item) >= (a.n || 1)) advanceMission(id);
    else if (a.map && !a.area && mapId === a.map) advanceMission(id);
  }
}

// Ziel des verfolgten Auftrags (für Kompasspfeil)
export function targetOf(id) {
  const step = currentStep(id);
  if (!step || !step.target) return null;
  const t = step.target;
  if (t.npc) return G.game.npcs.whereIs(t.npc);
  if (t.area) {
    const map = t.map || 'rom';
    const r = (map === 'rom' ? G.data.map_rom.areas : G.data.interiors[map].areas)[t.area];
    if (!r) return null;
    return { map, x: (r[0] + r[2] / 2) * 16, y: (r[1] + r[3] / 2) * 16 + 8 };
  }
  if (t.at) return { map: t.map, x: t.at[0] * 16 + 8, y: t.at[1] * 16 + 12 };
  return null;
}

// Welche NPCs bekommen eine Markierung? „!“ = Angebot, „?“ = aktueller Schritt
export function npcMarker(npcId) {
  for (const id of activeList()) {
    const step = currentStep(id);
    if (step && step.target && step.target.npc === npcId) return '?';
  }
  for (const [id, d] of Object.entries(G.data.missions)) {
    if (d.giver === npcId && !d.hidden && canStart(id)) return '!';
  }
  return null;
}
