// Gesellschaft (data/social.json): Freundschaft mit NPCs, Geschenke, Heirat und Ruf in den Vierteln
import { G } from '../core/ctx.js';
import { clamp } from '../core/util.js';
import * as Inv from './inventory.js';
import { applyEffects, changeStat, checkCond } from './rules.js';
import { unlockLex } from './lexicon.js';
import { level } from './skills.js';
import { festivalOf } from './festivals.js';

const SD = () => G.data.social;
const today = () => G.state.time.day;
export const npcDef = (id) => G.data.npcs.list.find((n) => n.id === id);
const relDay = (id) => {
  G.state.relDay ||= {};
  return (G.state.relDay[id] ||= { talk: -1, gift: -1 });
};

// ---------- Freundschaft ----------
export const relOf = (id) => G.state.rel[id] || 0;
export const hearts = (id) => clamp(Math.floor(relOf(id) / 20), 0, 5);
export const relTitle = (id) => SD().levels[hearts(id)];

export function addRel(id, n) {
  const before = hearts(id);
  G.state.rel[id] = clamp(relOf(id) + n, -20, 100);
  const after = hearts(id);
  if (after > before) {
    G.ui.toast(`♥ ${npcDef(id)?.name || id}: ${SD().levels[after]}`, 'stat');
    checkPerks(id);
  }
}

function checkPerks(id) {
  for (const p of SD().perks[id] || []) {
    const f = `perk_${id}_${p.at}`;
    if (hearts(id) >= p.at && !G.state.flags[f]) {
      G.state.flags[f] = true;
      G.ui.toast(`♥ ${npcDef(id).name}: ${p.text}`, 'done');
      applyEffects(p.do);
    }
  }
}

// Erstes Gespräch des Tages bringt etwas Freundschaft
export function talked(id) {
  if (!npcDef(id) || SD().noRel.includes(id)) return;
  const rd = relDay(id);
  if (rd.talk === today()) return;
  rd.talk = today();
  addRel(id, 2 + (level('rhetorik') >= 3 ? 1 : 0));
  unlockLex('amicitia');
}

// ---------- Geschenke ----------
export function giftReaction(npcId, itemId) {
  const def = Inv.itemDef(itemId);
  const own = SD().gifts.npcs[npcId] || {};
  const base = SD().gifts.default;
  const lists = ['loves', 'likes', 'dislikes'];
  for (const k of lists) if ((own[k] || []).includes(itemId)) return k;
  for (const k of lists) if ((own[k] || []).includes(`cat:${def.cat}`)) return k;
  for (const k of lists) if ((base[k] || []).includes(itemId) || (base[k] || []).includes(`cat:${def.cat}`)) return k;
  return 'neutral';
}

export const giftable = () => Inv.list().filter((x) => !x.def.quest);
export const giftedToday = (npcId) => relDay(npcId).gift === today();
export const knownReaction = (npcId, itemId) => G.state.vars.giftKnown?.[npcId]?.[itemId] || null;

export function give(npcId, itemId) {
  const s = G.state;
  if (giftedToday(npcId)) { G.ui.toast('Heute hast du schon etwas geschenkt.', 'warn'); return null; }
  if (Inv.count(itemId) < 1) return null;
  Inv.remove(itemId, 1);
  relDay(npcId).gift = today();
  const r = giftReaction(npcId, itemId);
  let pts = SD().giftPoints[r];
  const fest = festivalOf(today());
  if (fest && fest.name === 'Saturnalia' && pts > 0) pts *= 2;
  addRel(npcId, pts);
  s.vars.giftKnown ||= {};
  (s.vars.giftKnown[npcId] ||= {})[itemId] = r;
  if (r === 'loves') { const z = npcZone(npcId); if (z) addRep(z, 1); }
  unlockLex('amicitia');
  const lines = (SD().lines[npcId] && SD().lines[npcId][r]) || SD().lines.default[r];
  return lines[Math.floor(Math.random() * lines.length)].replace('{item}', Inv.itemDef(itemId).name);
}

// ---------- Heirat ----------
export const spouse = () => G.state.flags.married || null;

export function canPropose(npcId) {
  const sp = SD().spouses[npcId];
  const s = G.state;
  if (!sp || spouse() || !sp.cls.includes(s.cls)) return false;
  return sp.sex !== (s.gender === 'f' ? 'f' : 'm') && hearts(npcId) >= 4;
}

export function propose(npcId) {
  const sp = SD().spouses[npcId];
  const s = G.state;
  const req = SD().marriage[s.cls];
  if (Inv.count(req.item) < 1) return req.noItem;
  if (req.cond && !checkCond(req.cond)) return req.notReady;
  if (hearts(npcId) < 5) return sp.wait;
  Inv.remove(req.item, 1);
  s.flags.married = npcId;
  s.vars.marriedDay = today();
  unlockLex('ehe');
  applyEffects(req.do);
  return sp.yes;
}

// Ehepartner kommt abends nach Hause und hilft mit
export function spouseSched(def) {
  if (spouse() !== def.id) return null;
  const h = G.state.time.hour;
  if (h < 11 && h >= 0.5) return null;
  const home = G.state.home;
  const at = G.data.interiors[home.map]?.spouseAt || home.at;
  spouseSched.cache ||= {};
  const k = `${home.map}:${at}`;
  return (spouseSched.cache[k] ||= { h: [11, 0.5], map: home.map, at, dir: 'down' });
}

export function spouseMorning() {
  const id = spouse();
  if (!id) return;
  const sp = SD().spouses[id];
  if (Math.random() < 0.6) {
    const it = sp.gives[Math.floor(Math.random() * sp.gives.length)];
    Inv.add(it, 1);
    G.ui.toast(`${npcDef(id).name} hat dir ${Inv.itemDef(it).name} hingestellt.`, 'stat');
  }
  if (G.state.cls === 'plebs') changeStat('familia', 1, true);
}

// ---------- Ruf im Viertel ----------
export const repOf = (z) => (G.state.rep && G.state.rep[z]) || 0;
export const zoneName = (z) => (G.game.mapById('rom').zones.find((x) => x.id === z) || {}).name || z;
export function repTitle(n) {
  let t = SD().repLevels[0].name;
  for (const l of SD().repLevels) if (n >= l.at) t = l.name;
  return t;
}

export function addRep(z, n, quiet) {
  if (!z) return;
  const s = G.state;
  s.rep ||= {};
  const before = repTitle(repOf(z));
  s.rep[z] = clamp(repOf(z) + n, -20, 100);
  const after = repTitle(repOf(z));
  if (!quiet) G.ui.toast(`Ruf in ${zoneName(z)} ${n > 0 ? '+' : ''}${n}`, n > 0 ? 'stat' : 'cost');
  if (after !== before && n > 0) { G.ui.toast(`In ${zoneName(z)} bist du jetzt: ${after}`, 'done'); unlockLex('ruf'); }
}

// Viertel an der aktuellen Position (in Innenräumen: das Viertel vor der Tür)
export function zoneHere() {
  const g = G.game;
  if (!g.map) return null;
  if (!g.map.interior) return g.map.zoneAt(Math.floor(g.player.x / 16), Math.floor((g.player.y - 3) / 16))?.id || null;
  const d = G.state.lastDoor;
  const rom = g.mapById('rom');
  if (d && d.from === g.map.id) return rom.zoneAt(Math.floor(d.x / 16), Math.floor(d.y / 16))?.id || null;
  const front = g.doorFront(g.map.id);
  return front ? rom.zoneAt(Math.floor(front.x / 16), Math.floor(front.y / 16))?.id || null : null;
}

// Viertel eines NPCs (nach seinem ersten Tagesplan-Eintrag)
export function npcZone(id) {
  const d = npcDef(id);
  const sc = d && d.sched && d.sched[0];
  if (!sc) return null;
  const g = G.game, rom = g.mapById('rom');
  if (sc.map === 'rom') {
    const at = typeof sc.at === 'string' ? rom.anchors[sc.at.slice(1)] : sc.at;
    return at ? rom.zoneAt(at[0], at[1])?.id || null : null;
  }
  const front = g.doorFront(sc.map);
  return front ? rom.zoneAt(Math.floor(front.x / 16), Math.floor(front.y / 16))?.id || null : null;
}

// Rabatt beim Händler: guter Ruf im Viertel und Freundschaft
export function priceFactor(shop, mode) {
  let disc = 0;
  const r = repOf(shop.zone);
  if (r >= 70) disc += 0.1; else if (r >= 40) disc += 0.05;
  const h = shop.npc ? hearts(shop.npc) : 0;
  if (h >= 5) disc += 0.1; else if (h >= 3) disc += 0.05;
  return mode === 'buy' ? 1 - disc : 1 + disc / 2;
}

export function greeting() {
  const z = zoneHere();
  const r = repOf(z);
  const name = G.state.name;
  const pick = (a) => a[Math.floor(Math.random() * a.length)].replace('{name}', name);
  if (r >= 40 && Math.random() < 0.5) return pick(SD().greet.good);
  if (r < 0 && Math.random() < 0.5) return pick(SD().greet.bad);
  return null;
}
