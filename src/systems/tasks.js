// Wandinschriften (dipinti) als Auftragsbrett (data/tasks.json): täglich neue kleine Aufträge
import { G } from '../core/ctx.js';
import { mulberry32, rint } from '../core/rng.js';
import { formatMoney } from '../core/util.js';
import { bus } from '../core/events.js';
import * as Inv from './inventory.js';
import { changeMoney } from './rules.js';
import { addXp } from './skills.js';
import { unlockLex } from './lexicon.js';
import { addRep, npcDef } from './social.js';

const TD = () => G.data.tasks;
const st = () => (G.state.tasks ||= { active: [], taken: {}, done: 0 });
const strHash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

function weighted(rng, list) {
  const sum = list.reduce((a, t) => a + (t.w || 1), 0);
  let r = rng() * sum;
  for (const t of list) { r -= t.w || 1; if (r <= 0) return t; }
  return list[list.length - 1];
}

// Die heutigen Inschriften an einer Wand (deterministisch je Tag und Wand)
export function boardTasks(boardId) {
  const day = G.state.time.day;
  const b = TD().boards[boardId];
  const rng = mulberry32(strHash(boardId) ^ Math.imul(day + 1, 2654435761));
  const out = [];
  const used = new Set();
  const okAct = (a) => { const d = G.data.activities[a]; return !d.cls || d.cls.includes(G.state.cls); };
  const temps = TD().templates.filter((t) => t.kind !== 'activity' || t.acts.some(okAct));
  for (let i = 0; i < TD().perBoard; i++) {
    const t = weighted(rng, temps);
    const task = { key: `${day}:${boardId}:${i}`, kind: t.kind, zone: b.zone, rep: t.rep || 1, giver: TD().givers[Math.floor(rng() * TD().givers.length)] };
    if (t.kind === 'activity') {
      const acts = t.acts.filter(okAct);
      task.act = acts[Math.floor(rng() * acts.length)];
      task.pay = rint(rng, t.pay[0], t.pay[1]);
    } else {
      const pool = t.npcs.filter((n) => !used.has(n));
      task.npc = pool[Math.floor(rng() * pool.length)];
      used.add(task.npc);
      if (t.kind === 'deliver') {
        task.item = t.items[Math.floor(rng() * t.items.length)];
        task.n = rint(rng, t.n[0], t.n[1]);
        task.pay = Inv.itemDef(task.item).price * task.n + rint(rng, t.bonus[0], t.bonus[1]);
      } else task.pay = rint(rng, t.pay[0], t.pay[1]);
    }
    task.title = fill(t.title, task);
    task.text = fill(t.text, task);
    out.push(task);
  }
  return out;
}

function fill(str, t) {
  const npc = t.npc && npcDef(t.npc);
  const act = t.act && G.data.activities[t.act];
  return str.replace('{npc}', npc ? npc.name : '').replace('{where}', npc ? npc.where || '' : act ? act.where || '' : '')
    .replace('{item}', t.item ? Inv.itemDef(t.item).name : '').replace('{n}', t.n || '').replace('{act}', act ? act.name : '')
    .replace('{pay}', formatMoney(t.pay)).replace('{Giver}', t.giver[0].toUpperCase() + t.giver.slice(1)).replace('{giver}', t.giver);
}

export const active = () => st().active;
export const isTaken = (key) => !!st().taken[key];

export function takeBlock() {
  const s = G.state;
  if (st().active.length >= TD().maxActive) return `Du hast schon ${TD().maxActive} Aufträge angenommen. Erledige erst einen davon.`;
  if (s.cls === 'servus' && !s.flags.freed && !G.game.isSlaveFree()) return 'Als Sklave kannst du nur in deiner freien Zeit nebenbei etwas verdienen.';
  return null;
}

export function take(task) {
  const why = takeBlock();
  if (why) { G.ui.toast(why, 'warn'); return false; }
  st().taken[task.key] = true;
  st().active.push({ ...task, due: G.state.time.day + TD().days });
  G.ui.toast(`Auftrag angenommen: ${task.title} (L)`, 'mission');
  unlockLex('dipinti');
  return true;
}

function complete(task) {
  const T = st();
  T.active = T.active.filter((t) => t.key !== task.key);
  T.done++;
  changeMoney(task.pay);
  addRep(task.zone, task.rep);
  addXp('rhetorik', 3);
  G.ui.toast(`✔ Wandauftrag erledigt: ${task.title}`, 'done');
  bus.emit('missions');
}

// Zusätzliche Antwortoptionen beim Gespräch mit einem NPC
export function npcOpts(npcId) {
  const opts = [];
  for (const t of st().active) {
    if (t.npc !== npcId) continue;
    if (t.kind === 'talk') opts.push({ t: `Nachricht von ${t.giver} überbringen`, fn: () => complete(t) });
    if (t.kind === 'deliver' && Inv.count(t.item) >= t.n) {
      opts.push({ t: `${t.n}× ${Inv.itemDef(t.item).name} abgeben (Auftrag)`, fn: () => { Inv.remove(t.item, t.n); complete(t); } });
    }
  }
  return opts;
}

export const marker = (npcId) => (st().active.some((t) => t.npc === npcId) ? '?' : null);

// Erledigte Arbeit zählt für passende Aufträge
bus.on('activity', ({ id, success }) => {
  if (!G.state || !success) return;
  for (const t of [...st().active]) if (t.kind === 'activity' && t.act === id) complete(t);
});

export function newDay() {
  const T = st();
  const day = G.state.time.day;
  const gone = T.active.filter((t) => t.due < day);
  if (gone.length) G.ui.toast(`${gone.length === 1 ? 'Ein Wandauftrag ist' : `${gone.length} Wandaufträge sind`} verfallen.`, 'warn');
  T.active = T.active.filter((t) => t.due >= day);
  for (const k of Object.keys(T.taken)) if (Number(k.split(':')[0]) < day - 1) delete T.taken[k];
}

export function targetText(t) {
  if (t.kind === 'activity') return `Arbeit: ${G.data.activities[t.act].name} (${G.data.activities[t.act].where || ''})`;
  const npc = npcDef(t.npc);
  return `${t.kind === 'deliver' ? `Bring ${t.n}× ${Inv.itemDef(t.item).name} zu` : 'Geh zu'} ${npc.name}${npc.where ? ` – ${npc.where}` : ''}`;
}
