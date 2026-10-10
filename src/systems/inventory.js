// Inventar: Gegenstände nach ID mit Anzahl
import { G } from '../core/ctx.js';
import { bus } from '../core/events.js';
import { clamp } from '../core/util.js';

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
    for (const [k, v] of Object.entries(def.food)) s.needs[k] = clamp((s.needs[k] || 0) + v, 0, 100);
    remove(id, 1);
    G.ui.toast(def.eatText || `Du verzehrst: ${def.name}.`);
    return true;
  }
  if (def.light) {
    s.light = s.light === id ? null : id;
    G.ui.toast(s.light ? `${def.name} angezündet – nachts siehst du mehr.` : `${def.name} gelöscht.`);
    return true;
  }
  return false;
}
