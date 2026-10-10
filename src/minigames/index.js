// Register aller Minispiele. Gemeinsame Schnittstelle:
// { title, hint, buttons?, init(opts) → state, update(state, dt, input, held), result(state) → {done, ...}, draw(state, ctx, W, H) }
import { baking } from './baking.js';
import { water } from './water.js';
import { haggle } from './haggle.js';

export const MINIGAMES = { baking, water, haggle };

// Durchschnittsergebnis für automatisierte Routinearbeit
export const AUTO_RESULTS = {
  baking: { score: 8, max: 12, pay: 12, success: true, text: 'Routiniert gebacken: solide Arbeit.' },
  water: { score: 2, max: 3, pay: 2, success: true, text: 'Routiniert geschöpft.' },
};
