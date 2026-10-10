// Spielzustand (vollständig serialisierbar) sowie Speichern/Laden via localStorage
import { SAVE_KEY, RENT_INTERVAL, TILE } from './config.js';

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
    skills: {},
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
