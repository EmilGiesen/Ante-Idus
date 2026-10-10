// Register aller Minispiele. Gemeinsame Schnittstelle:
// { title, hint, buttons?, init(opts) → state, update(state, dt, input, held), result(state) → {done, ...}, draw(state, ctx, W, H) }
import { baking } from './baking.js';
import { water } from './water.js';
import { haggle } from './haggle.js';
import { carry } from './carry.js';
import { build } from './build.js';
import { fishing } from './fishing.js';
import { cooking } from './cooking.js';
import { dice } from './dice.js';
import { race } from './race.js';

export const MINIGAMES = { baking, water, haggle, carry, build, fishing, cooking, dice, race };

// Durchschnittsergebnis für automatisierte Routinearbeit
export const AUTO_RESULTS = {
  baking: { score: 8, max: 12, pay: 12, success: true, text: 'Routiniert gebacken: solide Arbeit.' },
  water: { score: 2, max: 3, pay: 2, success: true, text: 'Routiniert geschöpft.' },
  carry: { score: 4, max: 6, success: true, text: 'Routiniert getragen.' },
  build: { score: 4, max: 6, success: true, text: 'Routiniert gebaut.' },
};
