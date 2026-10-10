// Handel: Preise je Markt, schwankend mit Jahreszeit, Ereignissen, Tageslaune und Sättigung
import { G } from '../core/ctx.js';
import { priceFactor } from './social.js';
import { hash2 } from '../core/rng.js';
import { dateOfPlayedDay, season } from '../core/calendar.js';
import * as Inv from './inventory.js';
import { level } from './skills.js';
import { buffFx } from './buffs.js';

const strHash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

export const marketDef = (id) => G.data.markets.markets[id];
export const goodDef = (id) => G.data.markets.goods[id];
export const currentSeason = () => season(dateOfPlayedDay(G.state.time.day));

// Heute bereits gehandelte Menge (für Sättigung)
function traded(market, id, mode) {
  const t = G.state.vars.trade;
  if (!t || t.day !== G.state.time.day) return 0;
  return t[`${market}|${id}|${mode}`] || 0;
}

export function noteTrade(market, id, mode, n = 1) {
  const s = G.state;
  if (!s.vars.trade || s.vars.trade.day !== s.time.day) s.vars.trade = { day: s.time.day };
  const k = `${market}|${id}|${mode}`;
  s.vars.trade[k] = (s.vars.trade[k] || 0) + n;
}

// Grundpreis × Markt × Jahreszeit × Ereignis × Tageslaune
export function marketPrice(market, id, mode) {
  const p = rawPrice(market, id, mode);
  if (mode !== 'sell' || !p) return p;
  // Am selben Markt bekommt man nie so viel, wie man selbst zahlen müsste
  const buy = rawPrice(market, id, 'buy', true);
  return Math.max(1, Math.min(p, buy - 1));
}

function rawPrice(market, id, mode, noSat) {
  const m = marketDef(market);
  const def = Inv.itemDef(id);
  const g = goodDef(id) || {};
  const base = g.base ?? def.price ?? 0;
  if (!m || !base) return 0;
  let p = base * (mode === 'buy' ? m.buy : m.sell);
  p *= 1 + ((g.season && g.season[currentSeason()]) || 0);
  if (mode === 'sell' && (m.demand || []).includes(id)) p *= 1.25;
  if (mode === 'buy' && (m.specialty || []).includes(id)) p *= 0.85;
  const n = hash2(G.state.time.day, strHash(id), strHash(market)) * 2 - 1;
  p *= 1 + n * 0.12 * (g.vol ?? 1);
  p *= (G.state.priceMods && G.state.priceMods[id]) || 1;
  if (mode === 'sell') {
    p *= 1 + 0.04 * level('handel') + buffFx('handel');
    p *= Math.max(0.4, 1 - 0.06 * traded(market, id, 'sell'));
  } else {
    if (market === 'emporium' && level('handel') >= 6) p *= 0.9;
    if (!noSat) p *= 1 + 0.04 * traded(market, id, 'buy');
  }
  return Math.max(1, Math.round(p));
}

// Preis im Laden: Märkte bestimmen den Preis, sonst fester Ladenpreis
export function buyPrice(shop, entry) {
  const p = shop.market && !entry.fixed ? marketPrice(shop.market, entry.id, 'buy') : entry.price ?? Inv.itemDef(entry.id).price;
  return Math.max(1, Math.round(p * priceFactor(shop, 'buy')));
}

export function sellPrice(shop, id) {
  const def = Inv.itemDef(id);
  if (def.quest || !def.price) return 0;
  const cats = shop.buys || [];
  if (!cats.includes(def.cat) && !cats.includes(id)) return 0;
  let p = shop.market ? marketPrice(shop.market, id, 'sell') : def.price * (shop.sellFactor ?? 0.5) * (1 + 0.04 * level('handel') + buffFx('handel'));
  p = Math.max(1, Math.round(p * priceFactor(shop, 'sell')));
  // nie teurer verkaufen, als derselbe Händler es anbietet
  const entry = shop.items.find((e) => e.id === id);
  if (entry) p = Math.min(p, buyPrice(shop, entry) - 1);
  return Math.max(1, p);
}

// Trend gegenüber dem Grundpreis: -1 billig, 0 normal, 1 teuer
export function trend(market, id, mode) {
  const g = goodDef(id) || {};
  const base = (g.base ?? Inv.itemDef(id).price) * (mode === 'buy' ? marketDef(market).buy : marketDef(market).sell);
  const p = marketPrice(market, id, mode);
  return p < base * 0.92 ? -1 : p > base * 1.08 ? 1 : 0;
}
