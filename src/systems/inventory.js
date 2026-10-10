// Inventar: Gegenstände nach ID mit Anzahl
import { G } from '../core/ctx.js';
import { bus } from '../core/events.js';
import { clamp } from '../core/util.js';
import { addBuff } from './buffs.js';
import { level } from './skills.js';

export const itemDef = (id) => G.data.items[id] || { name: id, icon: 'scroll' };
export const count = (id) => G.state.inv[id] || 0;

export function add(id, n = 1) {
  G.state.inv[id] = count(id) + n;
  G.ui.toast(`+${n} ${itemDef(id).name}`, 'item');
  bus.emit('inventory', id);
}

export function remove(id, n = 1) {
  const left = count(id) - n;
  if (left > 0) G.state.inv[id] = left;
  else delete G.state.inv[id];
  bus.emit('inventory', id);
}

export function list() {
  return Object.entries(G.state.inv).filter(([, n]) => n > 0).map(([id, n]) => ({ id, n, def: itemDef(id) }));
}

// Benutzen aus dem Inventar: Essen/Trinken oder Licht anzünden
export function useItem(id) {
  const def = itemDef(id);
  const s = G.state;
  if (def.food) {
    const mul = def.cat === 'dish' && level('kochen') >= 5 ? 1.2 : 1;
    for (const [k, v] of Object.entries(def.food)) s.needs[k] = clamp((s.needs[k] || 0) + Math.round(v * mul), 0, 100);
    remove(id, 1);
    G.ui.toast(def.eatText || `Du verzehrst: ${def.name}.`);
    if (def.buff) { addBuff(def.buff.id, def.buff.name, def.buff.hours, def.buff.fx); G.ui.toast(`✦ ${def.buff.name} (${def.buff.hours} Std.)`, 'stat'); }
    return true;
  }
  if (def.use === 'cook') {
    if (G.game.map.id !== s.home.map) { G.ui.toast('Das Kohlebecken stellst du nur zu Hause auf.', 'warn'); return false; }
    G.ui.panels.show('cook');
    return false;
  }
  if (def.light) {
    s.light = s.light === id ? null : id;
    G.ui.toast(s.light ? `${def.name} angezündet – nachts siehst du mehr.` : `${def.name} gelöscht.`);
    return true;
  }
  return false;
}
