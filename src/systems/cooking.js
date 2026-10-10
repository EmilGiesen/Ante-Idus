// Kochen: Rezepte aus data/recipes.json, Zubereitung als kurzes Minispiel
import { G } from '../core/ctx.js';
import * as Inv from './inventory.js';
import { addXp, level } from './skills.js';
import { unlockLex } from './lexicon.js';

export const recipes = () => G.data.recipes;

export function missing(id) {
  const r = recipes()[id];
  const out = [];
  for (const [it, n] of Object.entries(r.in)) if (Inv.count(it) < n) out.push(`${Inv.itemDef(it).name}${n > 1 ? ` ×${n}` : ''}`);
  return out;
}

export const unlocked = (id) => level('kochen') >= (recipes()[id].level || 0);

export function cook(id, onDone) {
  const r = recipes()[id];
  if (!unlocked(id) || missing(id).length) return;
  for (const [it, n] of Object.entries(r.in)) Inv.remove(it, n);
  G.game.playMinigame('cooking', { label: r.name, hours: 0.5, energy: 3, dirt: 1 }).then((res) => {
    if (res.aborted) { for (const [it, n] of Object.entries(r.in)) Inv.add(it, n); return; }
    const q = res.quality || 0;
    const n = Math.max(1, (r.n || 1) + (q >= 2 ? 1 : 0) - (q === 0 ? 1 : 0));
    Inv.add(r.out, n);
    addXp('kochen', Math.round((r.xp || 8) * (0.5 + q / 3)));
    unlockLex('kochen');
    if (onDone) onDone();
  });
}
