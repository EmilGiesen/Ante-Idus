// Spielzustand (vollständig serialisierbar) sowie Speichern/Laden via localStorage
import { SAVE_KEY, RENT_INTERVAL, TILE } from './config.js';

// Startfertigkeiten je Klasse: Stufe → Erfahrungspunkte
export function startSkills(cls, data) {
  const t = data.skills.thresholds;
  const out = {};
  for (const [id, lvl] of Object.entries(data.skills.start[cls] || {})) out[id] = lvl > 0 ? t[lvl - 1] : 0;
  return out;
}

// Ältere Spielstände an neue Felder anpassen
export function migrateState(s, data) {
  if (s.skills && !s.mg) { s.mg = s.skills; delete s.skills; }
  s.mg ||= {};
  s.sk ||= startSkills(s.cls, data);
  s.buffs ||= [];
  if (s.needs && s.needs.thirst === undefined) s.needs.thirst = 80;
  return s;
}

export const tileToPx = (tx, ty) => ({ x: tx * TILE + 8, y: ty * TILE + 14 });

export function newState(cls, gender, name, data) {
  const c = data.classes[cls];
  const pos = tileToPx(c.start.at[0], c.start.at[1]);
  return {
    v: 1,
    cls, gender, name,
    map: c.start.map, x: pos.x, y: pos.y, dir: 'down',
    time: { day: 0, hour: 0.4 },
    needs: { ...c.needs },
    money: c.money,
    inv: { ...c.inventory },
    missions: {},
    tracked: null,
    flags: {},
    vars: {},
    lex: {},
    stats: { ...c.stats },
    rel: {},
    sk: startSkills(cls, data),   // Fertigkeiten (Erfahrungspunkte)
    mg: {},                        // Minispiel-Statistik (Erfolge für Routine)
    buffs: [],
    rent: cls === 'plebs' ? { due: RENT_INTERVAL, amount: c.rent || 80 } : null,
    home: { map: c.home.map, at: c.home.at },
    light: null,
    playSeconds: 0,
  };
}

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.v === 1 ? s : null;
  } catch (e) {
    return null;
  }
}

export function deleteSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ohne Speicher spielbar */ }
}
