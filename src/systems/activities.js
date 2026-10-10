// Freiwillige Aktivitäten (Tagelohn, Lernen, Fischen, Kochen …) – Definitionen in data/activities.json
import { G } from '../core/ctx.js';
import { bus } from '../core/events.js';
import { AUTOMATE_AFTER } from '../core/config.js';
import { formatMoney } from '../core/util.js';
import * as M from './missions.js';
import * as Inv from './inventory.js';
import { checkCond, changeMoney, applyEffects } from './rules.js';
import { addXp, level } from './skills.js';
import { buffFx } from './buffs.js';
import { unlockLex } from './lexicon.js';
import { AUTO_RESULTS } from '../minigames/index.js';

export const actDef = (id) => G.data.activities[id];

// Sklaven haben nur abends frei – oder sind unterwegs auf einem Botengang
export const slaveFreeTime = () => G.state.time.hour >= 9.5 && G.state.time.hour < 12;

export function blockReason(id) {
  const d = actDef(id), s = G.state, h = s.time.hour;
  if (d.cls && !d.cls.includes(s.cls)) return (d.deny && d.deny[s.cls]) || 'Das ist nichts für dich.';
  if (s.cls === 'servus' && !s.flags.freed && !d.slaveAnytime && !slaveFreeTime() && !M.hasPermit()) {
    return 'Dafür hast du jetzt keine Zeit – der Haushalt braucht dich. Frei hast du erst ab Hora X, oder du erledigst es unterwegs auf einem Botengang.';
  }
  if (d.hours && !(h >= d.hours[0] && h < d.hours[1])) return d.closed || 'Jetzt ist hier niemand, der dich braucht.';
  if (d.req && !checkCond(d.req)) return d.reqText || 'Dafür fehlen dir noch Voraussetzungen.';
  if ((d.energy || 0) > 0 && s.needs.energy < d.energy + 3) return 'Du bist zu erschöpft dafür. Iss etwas oder schlaf dich aus.';
  if (d.cost && s.money < d.cost) return `Dafür brauchst du ${formatMoney(d.cost)}.`;
  for (const [it, n] of Object.entries(d.needs || {})) if (Inv.count(it) < n) return `Dafür brauchst du: ${Inv.itemDef(it).name}${n > 1 ? ` (${n}×)` : ''}.`;
  const per = d.perDay || (d.daily ? 1 : 0);
  const done = s.vars[`act_${id}`];
  if (per && done && done.day === s.time.day && done.n >= per) return d.dailyText || 'Für heute ist genug getan. Komm morgen wieder!';
  return null;
}

export function routineAvailable(id) {
  const d = actDef(id);
  if (!d.minigame || !AUTO_RESULTS[d.minigame]) return false;
  const need = level('handwerk') >= 4 ? AUTOMATE_AFTER - 1 : AUTOMATE_AFTER;
  return (G.state.mg[d.minigame]?.wins || 0) >= need;
}

export function payRange(id) {
  const d = actDef(id);
  if (!d.pay) return null;
  const mul = payMul(d);
  const lo = Math.round((d.pay.base || 0) * mul), hi = Math.round(((d.pay.base || 0) + (d.pay.perScore || 0) * (d.pay.maxScore || 0)) * mul);
  return lo === hi ? formatMoney(lo) : `${formatMoney(lo)} – ${formatMoney(hi)}`;
}

function payMul(d) {
  const lvl = d.skill ? level(d.skill) : 0;
  return (1 + lvl * (d.pay?.perLevel ?? 0.05)) * (1 + buffFx('pay') + (d.skill === 'handel' ? buffFx('handel') : 0));
}

// Angebot als kleiner Dialog mit Optionen
export function offer(id, npc) {
  const d = actDef(id);
  const why = blockReason(id);
  const info = [];
  if (d.duration) info.push(`Dauer: etwa ${d.duration} Std.`);
  const pr = payRange(id);
  if (pr) info.push(`Lohn: ${pr}`);
  if (d.cost) info.push(`Kosten: ${formatMoney(d.cost)}`);
  const pages = [d.desc, ...(info.length ? [info.join(' · ')] : [])];
  if (why) { G.ui.dialog.custom({ text: [...pages, why], name: d.name }, npc); return; }
  const opts = [{ t: d.minigame ? `${d.verb || 'Loslegen'} (Minispiel)` : d.verb || 'Loslegen', fn: () => run(id, false) }];
  if (routineAvailable(id)) opts.push({ t: 'Routiniert erledigen (ohne Minispiel)', fn: () => run(id, true) });
  opts.push({ t: 'Lieber nicht.' });
  G.ui.dialog.custom({ text: pages, opts, name: d.name }, npc);
}

export function run(id, auto) {
  const d = actDef(id);
  if (blockReason(id)) return;
  if (d.cost) changeMoney(-d.cost);
  for (const [it, n] of Object.entries(d.consumes || {})) Inv.remove(it, n);
  if (d.minigame && !auto) {
    G.game.playMinigame(d.minigame, { ...(d.mgOpts || {}), level: d.skill ? level(d.skill) : 0, money: G.state.money, luck: buffFx('luck'), day: G.state.time.day, hours: 0, energy: 0, dirt: 0, actId: id }).then((r) => {
      if (!r.aborted) finish(id, r);
      else if (d.cost) changeMoney(d.cost);
    });
  } else {
    const r = auto ? { ...AUTO_RESULTS[d.minigame], success: true, auto: true } : { score: d.pay?.maxScore || 0, success: true };
    G.ui.fade(() => finish(id, r), 350);
  }
}

function finish(id, r) {
  const d = actDef(id), s = G.state;
  const score = r.auto ? Math.round((d.pay?.maxScore || 0) * 0.6) : r.score || 0;
  let pay = d.pay ? Math.round(((d.pay.base || 0) + (d.pay.perScore || 0) * score) * payMul(d)) : 0;
  if (d.pay && r.pay !== undefined && d.pay.useMinigamePay) pay = Math.round(r.pay * payMul(d));
  if (d.pay && d.pay.useNet) pay = r.net || 0;
  G.game.passHours((d.duration || 1) * (r.auto ? 1.25 : 1));
  s.needs.energy = Math.max(0, s.needs.energy - (d.energy || 0));
  s.needs.hygiene = Math.max(0, s.needs.hygiene - (d.dirt || 0));
  if (d.skill) addXp(d.skill, Math.round(((d.xp || 10) + (d.xpPerScore || 0) * score) * (r.success ? 1 : 0.5) * (r.auto ? 0.5 : 1)));
  for (const it of r.items || []) Inv.add(it, 1);
  for (const [sk, n] of Object.entries(d.xpExtra || {})) addXp(sk, n);
  if (pay) changeMoney(pay);
  for (const g of d.gives || []) {
    if ((g.minScore || 0) <= score && Math.random() < (g.chance ?? 1)) Inv.add(g.id, g.n || 1);
  }
  if (d.lex) unlockLex(d.lex);
  if (d.do) applyEffects(d.do);
  const cnt = s.vars[`act_${id}`];
  s.vars[`act_${id}`] = cnt && cnt.day === s.time.day ? { day: cnt.day, n: cnt.n + 1 } : { day: s.time.day, n: 1 };
  s.vars.actCount = (s.vars.actCount || 0) + 1;
  bus.emit('activity', { id, score, success: r.success, pay });
  if (!d.pay?.useNet) G.ui.toast(`${d.doneText || `${d.name} – erledigt`}${pay ? ` – Lohn: ${formatMoney(pay)}` : ''}${s.cls === 'servus' && pay ? ' (fürs Peculium)' : ''}.`, 'done');
}
