// Sammlungen (data/collections.json): Funde bei der Arbeit, Belohnung für vollständige Sammlungen
import { G } from '../core/ctx.js';
import * as Inv from './inventory.js';
import { applyEffects } from './rules.js';

export const colDefs = () => G.data.collections.sets;

export function found(setId) {
  const s = G.state;
  s.vars.coll ||= {};
  return s.vars.coll[setId] || [];
}

// Zufallsfund aus einer Sammlung (bevorzugt Fehlendes)
export function findFrom(setId) {
  const set = colDefs()[setId];
  if (!set) return;
  const have = found(setId);
  const missing = set.items.filter((i) => !have.includes(i));
  const pick = missing.length && Math.random() < 0.8 ? missing[Math.floor(Math.random() * missing.length)] : set.items[Math.floor(Math.random() * set.items.length)];
  Inv.add(pick, 1);
  if (!have.includes(pick)) {
    G.state.vars.coll[setId] = [...have, pick];
    G.ui.toast(`✧ Neu für die Sammlung „${set.name}“ (${G.state.vars.coll[setId].length}/${set.items.length})`, 'lex');
    if (G.state.vars.coll[setId].length === set.items.length) {
      G.ui.toast(`★ Sammlung „${set.name}“ vollständig!`, 'done');
      applyEffects(set.reward);
    }
  }
}

// Lexikon-Meilensteine
export function lexMilestone(count) {
  const s = G.state;
  for (const m of G.data.collections.lexicon) {
    if (count >= m.at && !s.flags[`lexm_${m.at}`]) {
      s.flags[`lexm_${m.at}`] = true;
      G.ui.toast(`★ ${m.at} Lexikon-Einträge entdeckt! ${m.text}`, 'done');
      applyEffects(m.reward);
    }
  }
}
