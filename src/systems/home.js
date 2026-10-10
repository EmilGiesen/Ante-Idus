// Zuhause: Möbel auf festen Stellplätzen, Pflanzen ziehen, Gemütlichkeit. Zustand in state.homes[mapId].
import { G } from '../core/ctx.js';
import * as Inv from './inventory.js';
import { addXp, level } from './skills.js';
import { unlockLex } from './lexicon.js';

export const slotsOf = (mapId) => (G.data.interiors[mapId] && G.data.interiors[mapId].slots) || [];
export const homeState = (mapId) => {
  G.state.homes ||= {};
  return (G.state.homes[mapId] ||= { furniture: {}, plants: {} });
};
export const isHome = (mapId) => G.state.home.map === mapId;
export const furnDef = (id) => G.data.items[id];

// Möbel und Pflanzen in die Kartendaten übernehmen (Kollision, Interaktion, Zeichnung)
export function applyHome(map) {
  const slots = slotsOf(map.id);
  if (!slots.length) return;
  const hs = homeState(map.id);
  map.homeBase ||= {};
  for (const sl of slots) {
    const k = map.key(sl.at[0], sl.at[1]);
    if (!(k in map.homeBase)) map.homeBase[k] = { solid: map.solid[k], prop: map.props.get(k), it: map.interacts.get(k) };
    const base = map.homeBase[k];
    const fid = hs.furniture[sl.id];
    const plant = hs.plants[sl.id];
    if (sl.type === 'plant' && (sl.builtin || fid === 'vas_plantae')) {
      map.props.set(k, sl.builtin ? `bed_${plantStage(plant)}` : `pot_${plantStage(plant)}`);
      map.solid[k] = 1;
      map.interacts.set(k, { type: 'plant', slot: sl.id });
    } else if (fid) {
      map.props.set(k, furnDef(fid).prop);
      map.solid[k] = 1;
      map.interacts.set(k, { type: 'furniture', slot: sl.id, item: fid });
    } else {
      if (base.prop) map.props.set(k, base.prop); else map.props.delete(k);
      map.solid[k] = base.solid;
      if (isHome(map.id)) map.interacts.set(k, { type: 'slot', slot: sl.id }); else if (base.it) map.interacts.set(k, base.it); else map.interacts.delete(k);
    }
  }
  if (map.chunks) map.chunks.clear();
  map.extraLights = Object.entries(hs.furniture).filter(([, f]) => f === 'candelabrum').map(([sid]) => {
    const sl = slots.find((x) => x.id === sid);
    return sl ? { x: sl.at[0] * 16 + 8, y: sl.at[1] * 16, r: 46, warm: true } : null;
  }).filter(Boolean);
}

export function comfort(mapId = G.state.home.map) {
  const hs = homeState(mapId);
  return Object.values(hs.furniture).reduce((a, f) => a + ((furnDef(f) && furnDef(f).comfort) || 0), 0) + (G.data.interiors[mapId]?.comfort || 0);
}

export function freeSlotsFor(mapId, itemId) {
  const t = furnDef(itemId).slot || 'floor';
  const hs = homeState(mapId);
  return slotsOf(mapId).filter((sl) => sl.type === t && !hs.furniture[sl.id] && !sl.builtin);
}

export function place(slotId, itemId) {
  const map = G.game.map;
  const hs = homeState(map.id);
  if (hs.furniture[slotId] || Inv.count(itemId) < 1) return;
  Inv.remove(itemId, 1);
  hs.furniture[slotId] = itemId;
  applyHome(map);
  G.ui.toast(`${furnDef(itemId).name} aufgestellt. Gemütlichkeit: ${comfort(map.id)}`, 'stat');
  unlockLex('wohnen');
}

export function removeFurniture(slotId) {
  const map = G.game.map;
  const hs = homeState(map.id);
  const fid = hs.furniture[slotId];
  if (!fid) return;
  if (hs.plants[slotId]) { G.ui.toast('Erst die Pflanze ernten.', 'warn'); return; }
  delete hs.furniture[slotId];
  Inv.add(fid, 1);
  applyHome(map);
}

// ---------- Pflanzen ----------
export const seedDef = (id) => G.data.items[id] && G.data.items[id].seed;

export function plantStage(p) {
  if (!p) return 0;
  const need = growNeed(p.seed);
  return p.grown >= need ? 3 : p.grown >= need / 2 ? 2 : 1;
}
const growNeed = (seedId) => Math.max(1, seedDef(seedId).days - (level('gaertnern') >= 2 ? 1 : 0));

export function sow(slotId, seedId) {
  const map = G.game.map;
  const hs = homeState(map.id);
  if (hs.plants[slotId] || Inv.count(seedId) < 1) return;
  Inv.remove(seedId, 1);
  hs.plants[slotId] = { seed: seedId, grown: 0, watered: -1 };
  addXp('gaertnern', 5);
  applyHome(map);
  G.ui.toast('Gesät. Gieß die Pflanze jeden Tag, dann wächst sie.');
  unlockLex('garten');
}

export function water(slotId) {
  const map = G.game.map;
  const p = homeState(map.id).plants[slotId];
  if (!p) return;
  if (p.watered === G.state.time.day) { G.ui.toast('Heute schon gegossen.'); return; }
  p.watered = G.state.time.day;
  p.grown += 1;
  addXp('gaertnern', 4);
  applyHome(map);
  G.ui.toast(plantStage(p) === 3 ? 'Die Pflanze ist reif – du kannst ernten!' : 'Gegossen. Die Pflanze wächst.');
}

export function harvest(slotId) {
  const map = G.game.map;
  const hs = homeState(map.id);
  const p = hs.plants[slotId];
  if (!p || plantStage(p) < 3) return;
  const sd = seedDef(p.seed);
  const n = sd.yield + (level('gaertnern') >= 4 ? 1 : 0);
  Inv.add(sd.out, n);
  addXp('gaertnern', 12);
  delete hs.plants[slotId];
  applyHome(map);
}
