// Bedingungen und Effekte für Dialoge, Missionen und Ereignisse (alles datengetrieben)
import { G } from '../core/ctx.js';
import { clamp, formatMoney } from '../core/util.js';
import { isNight } from '../core/time.js';
import * as M from './missions.js';
import * as Inv from './inventory.js';
import { unlockLex } from './lexicon.js';
import { fmt } from './text.js';
import { level as skillLevel, addXp } from './skills.js';
import { addBuff } from './buffs.js';

export const STAT_NAMES = {
  dignitas: 'Dignitas', caesariani: 'Caesarianer', optimates: 'Optimaten', fides: 'Vertrauen des Herrn',
  familia: 'Familie', vicinia: 'Nachbarschaft',
};

const cmp = (a, op, b) => (op === '>=' ? a >= b : op === '<=' ? a <= b : op === '>' ? a > b : op === '<' ? a < b : op === '==' ? a === b : a !== b);
const arr = (v) => (Array.isArray(v) ? v : [v, 1]);

export function checkCond(c) {
  if (!c) return true;
  const s = G.state;
  for (const [k, v] of Object.entries(c)) {
    switch (k) {
      case 'cls': if (!(Array.isArray(v) ? v.includes(s.cls) : s.cls === v)) return false; break;
      case 'gender': if (s.gender !== v) return false; break;
      case 'mission': if (!M.isActive(v)) return false; break;
      case 'step': if (!M.isActive(v[0]) || s.missions[v[0]].step !== v[1]) return false; break;
      case 'done': if (M.timesDone(v) < 1) return false; break;
      case 'notDone': if (M.timesDone(v) > 0) return false; break;
      case 'canStart': if (!M.canStart(v)) return false; break;
      case 'notActive': if (M.isActive(v)) return false; break;
      case 'item': { const [id, n] = arr(v); if (Inv.count(id) < n) return false; break; }
      case 'noItem': if (Inv.count(v) > 0) return false; break;
      case 'money': if (s.money < v) return false; break;
      case 'flag': if (!s.flags[v]) return false; break;
      case 'noFlag': if (s.flags[v]) return false; break;
      case 'today': if (s.flags[v] !== s.time.day) return false; break;
      case 'notToday': if (s.flags[v] === s.time.day) return false; break;
      case 'var': if (!cmp(s.vars[v[0]] ?? 0, v[1], v[2])) return false; break;
      case 'stat': if (!cmp(s.stats[v[0]] ?? 0, v[1], v[2])) return false; break;
      case 'need': if (!cmp(s.needs[v[0]] ?? 0, v[1], v[2])) return false; break;
      case 'hour': if (!(s.time.hour >= v[0] && s.time.hour < v[1])) return false; break;
      case 'night': if (isNight(s.time.hour) !== v) return false; break;
      case 'skill':   // Alias: Minispiel-Routine
      case 'routine': if ((s.mg[v[0]]?.wins || 0) < v[1]) return false; break;
      case 'level': if (skillLevel(v[0]) < v[1]) return false; break;
      case 'rentDue': if (!s.rent || (s.time.day >= s.rent.due) !== v) return false; break;
      case 'atHome': if ((G.game.map && G.game.map.id === s.home.map) !== v) return false; break;
      case 'map': if (!G.game.map || G.game.map.id !== v) return false; break;
      case 'any': if (!v.some((x) => checkCond(x))) return false; break;
      case 'not': if (checkCond(v)) return false; break;
      default: console.warn('Unbekannte Bedingung', k);
    }
  }
  return true;
}

export function changeMoney(n) {
  if (!n) return;
  G.state.money = Math.max(0, G.state.money + n);
  G.ui.toast(`${n > 0 ? '+' : '−'} ${formatMoney(Math.abs(n))}`, n > 0 ? 'money' : 'cost');
}

export function changeStat(name, add, silent) {
  const s = G.state.stats;
  s[name] = clamp((s[name] || 0) + add, -100, 100);
  if (!silent) G.ui.toast(`${STAT_NAMES[name] || name} ${add > 0 ? '+' : ''}${add}`, add > 0 ? 'stat' : 'cost');
}

// Führt Effekte aus. Spezialaktionen (Minispiel, Laden, Schlaf) werden in ctx.after zurückgegeben.
export function applyEffects(list, ctx = {}) {
  if (!list) return ctx;
  const s = G.state;
  for (const e of list) {
    const k = Object.keys(e)[0];
    const v = e[k];
    switch (k) {
      case 'start': M.startMission(v); break;
      case 'advance': M.advanceMission(v); break;
      case 'complete': M.completeMission(v); break;
      case 'abandon': M.abandonMission(v); break;
      case 'give': { const [id, n] = arr(v); Inv.add(id, n); break; }
      case 'take': { const [id, n] = arr(v); Inv.remove(id, n); break; }
      case 'money': changeMoney(v); break;
      case 'moneyVar': changeMoney(s.vars[v] || 0); break;
      case 'stat': for (const [n, a] of Object.entries(v)) changeStat(n, a); break;
      case 'rel': for (const [n, a] of Object.entries(v)) s.rel[n] = (s.rel[n] || 0) + a; break;
      case 'lex': for (const id of Array.isArray(v) ? v : [v]) unlockLex(id); break;
      case 'need': for (const [n, a] of Object.entries(v)) s.needs[n] = clamp((s.needs[n] || 0) + a, 0, 100); break;
      case 'flag': s.flags[v] = true; break;
      case 'unflag': delete s.flags[v]; break;
      case 'today': s.flags[v] = s.time.day; break;
      case 'var': s.vars[v[0]] = v[1]; break;
      case 'inc': s.vars[v[0]] = (s.vars[v[0]] || 0) + v[1]; break;
      case 'hours': G.game.passHours(v); break;
      case 'toast': G.ui.toast(fmt(v)); break;
      case 'payRent': G.game.payRent(); break;
      case 'xp': for (const [n, a] of Object.entries(v)) addXp(n, a); break;
      case 'buff': addBuff(v.id, v.name, v.hours, v.fx); G.ui.toast(`✦ ${v.name} (${v.hours} Std.)`, 'stat'); break;
      case 'activity': ctx.after = { type: 'activity', id: v }; break;
      case 'auto': G.game.autoMinigame(v, e.opts || {}); break;
      case 'minigame': ctx.after = { type: 'minigame', game: v, then: e.then, opts: e.opts || {} }; break;
      case 'shop': ctx.after = { type: 'shop', id: v }; break;
      case 'sleep': ctx.after = { type: 'sleep' }; break;
      default: console.warn('Unbekannter Effekt', k);
    }
  }
  return ctx;
}
