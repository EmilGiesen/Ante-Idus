// Klassen-Extras (data/economy.json): Adel legt Geld an und hält Klienten, Plebejer führen einen eigenen Laden
import { G } from '../core/ctx.js';
import { formatMoney } from '../core/util.js';
import * as Inv from './inventory.js';
import { changeMoney, changeStat } from './rules.js';
import { addXp, level } from './skills.js';
import { unlockLex } from './lexicon.js';
import { repOf } from './social.js';

const ED = () => G.data.economy;
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// ---------- Anlagen (Adel) ----------
export const invDefs = () => ED().investments;
const inv = () => (G.state.invest ||= { own: {}, loans: [] });
export const owned = (id) => inv().own[id] || 0;
export const loans = () => inv().loans;

export function buyInvest(id) {
  const d = invDefs().find((x) => x.id === id);
  if (G.state.money < d.price) { G.ui.toast('Dafür reicht dein Vermögen nicht.', 'cost'); return false; }
  if (d.max && owned(id) >= d.max) { G.ui.toast('Mehr davon ist gerade nicht zu haben.', 'warn'); return false; }
  changeMoney(-d.price);
  if (d.kind === 'loan') inv().loans.push({ id, due: G.state.time.day + d.days, stake: d.price });
  else inv().own[id] = owned(id) + 1;
  unlockLex(d.lex);
  G.ui.toast(`Angelegt: ${d.name}`, 'done');
  return true;
}

export function dailyIncome() {
  if (G.state.cls !== 'nobilis') return;
  const I = inv();
  let sum = 0;
  const news = [];
  for (const d of invDefs()) {
    const n = owned(d.id);
    for (let i = 0; i < n; i++) {
      if (d.fire && Math.random() < d.fire) { sum -= d.repair; news.push(`Feuer in deiner ${d.short}! Reparatur ${formatMoney(d.repair)}.`); unlockLex('insula'); continue; }
      sum += rnd(d.income[0], d.income[1]);
    }
  }
  const day = G.state.time.day;
  for (const l of [...I.loans]) {
    if (l.due > day) continue;
    const d = invDefs().find((x) => x.id === l.id);
    I.loans = I.loans.filter((x) => x !== l);
    if (Math.random() < d.loss) news.push(`Schlechte Nachricht aus Ostia: Das Schiff ist gesunken – dein Seedarlehen ist verloren.`);
    else { const back = Math.round(l.stake * d.ret); sum += back; news.push(`Das Getreideschiff ist angekommen! Seedarlehen mit Zins zurück: ${formatMoney(back)}.`); }
  }
  for (const n of news) G.ui.toast(n, 'mission');
  if (sum > 0) G.ui.toast(`Einnahmen aus deinen Anlagen: ${formatMoney(sum)}`, 'money');
  if (sum) G.state.money = Math.max(0, G.state.money + sum);
}

// ---------- Salutatio (Adel) ----------
export const clients = () => G.state.vars.clients ?? ED().salutatio.start;

export function salutatio() {
  const S = ED().salutatio;
  const n = clients();
  const cost = n * S.costPer;
  G.state.flags.salut = G.state.time.day;
  if (G.state.money < cost) {
    G.ui.toast('Du kannst die Sportula nicht zahlen – einige Klienten gehen enttäuscht.', 'warn');
    G.state.vars.clients = Math.max(S.start, n - 1);
    return;
  }
  changeMoney(-cost);
  changeStat('dignitas', n >= S.bigAt ? 2 : 1);
  addXp('rhetorik', 4);
  G.ui.toast(`${n} Klienten haben dich begrüßt und ihre Sportula erhalten.`, 'stat');
  unlockLex('cliens');
}

export function addClients(k) {
  G.state.vars.clients = Math.min(ED().salutatio.max, clients() + k);
  G.ui.toast(`Neue Klienten! Jetzt ${clients()}.`, 'stat');
}

// ---------- Eigener Laden (Plebejer) ----------
const shop = () => (G.state.myshop ||= { stock: {}, till: 0, sold: 0 });
export const shopState = () => shop();
export const stockable = () => Inv.list().filter((x) => ED().myshop.cats.includes(x.def.cat) && x.def.price > 0);
export const shopPrice = (id) => Math.max(1, Math.round(Inv.itemDef(id).price * ED().myshop.markup * (1 + 0.03 * level('handel'))));
export const salesCap = () => ED().myshop.baseSales + Math.floor(level('handel') / 2) + (repOf('subura') >= 40 ? 1 : 0);

export function stock(id, n = 1) {
  if (Inv.count(id) < n) return;
  Inv.remove(id, n);
  shop().stock[id] = (shop().stock[id] || 0) + n;
}

export function unstock(id) {
  const n = shop().stock[id] || 0;
  if (!n) return;
  delete shop().stock[id];
  Inv.add(id, n);
}

export function collect() {
  const t = shop().till;
  if (!t) return;
  shop().till = 0;
  changeMoney(t);
}

export function dailySales() {
  if (!G.state.flags.myshop) return;
  const S = shop();
  let cap = salesCap(), sold = 0, earned = 0;
  while (cap-- > 0) {
    const ids = Object.keys(S.stock).filter((k) => S.stock[k] > 0);
    if (!ids.length) break;
    const id = ids[Math.floor(Math.random() * ids.length)];
    S.stock[id]--;
    if (!S.stock[id]) delete S.stock[id];
    earned += shopPrice(id);
    sold++;
  }
  if (!sold) { G.ui.toast('Dein Laden steht leer – leg Waren ins Regal!', 'warn'); return; }
  S.till += earned;
  S.sold += sold;
  addXp('handel', sold * 2);
  G.ui.toast(`Dein Laden hat ${sold} Waren verkauft – ${formatMoney(earned)} liegen in der Kasse.`, 'money');
}
