// Lexikon („Schriftrolle des Wissens“): Einträge werden beim Spielen freigeschaltet
import { G } from '../core/ctx.js';
import { lexMilestone } from './collections.js';

export function unlockLex(id) {
  const s = G.state;
  const entry = G.data.lexicon.entries[id];
  if (!entry) { console.warn('Unbekannter Lexikon-Eintrag', id); return; }
  if (s.lex[id]) return;
  s.lex[id] = { new: true, day: s.time.day };
  G.ui.toast(`📜 Neu im Lexikon: ${entry.title}  (K)`, 'lex');
  lexMilestone(Object.keys(s.lex).length);
}

export function lexCount() {
  return { have: Object.keys(G.state.lex).length, total: Object.keys(G.data.lexicon.entries).length };
}
