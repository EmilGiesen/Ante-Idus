// Modale Fenster: Inventar, Logbuch, Lexikon, Menü, Laden, Steuerung
import { el, clear, pixelCanvas } from './dom.js';
import { G } from '../core/ctx.js';
import { formatMoney, shortMoney } from '../core/util.js';
import { getIcon } from '../gfx/icons.js';
import * as Inv from '../systems/inventory.js';
import * as M from '../systems/missions.js';
import { fmt } from '../systems/text.js';
import { lexCount } from '../systems/lexicon.js';
import { changeMoney } from '../systems/rules.js';
import { level, progress, skillDefs } from '../systems/skills.js';
import { activeBuffs, hoursLeft, buffFx } from '../systems/buffs.js';
import * as Cook from '../systems/cooking.js';

import * as Market from '../systems/market.js';
import { addXp } from '../systems/skills.js';
const sellPrice = Market.sellPrice;

const TITLES = {
  inventory: 'Inventar', log: 'Logbuch', lexicon: 'Schriftrolle des Wissens', menu: 'Menü', shop: 'Laden', help: 'Steuerung',
  map: 'Stadtplan von Rom', travel: 'Sänfte (lectica)', char: 'Charakter', cook: 'Kochen', prices: 'Preistafel',
};
const HOTKEY = { inventory: 'inventory', log: 'log', lexicon: 'lexicon', map: 'map', char: 'char' };

const trendMark = (t) => (t < 0 ? el('span', { class: 'trend down', title: 'günstig' }, ' ↓') : t > 0 ? el('span', { class: 'trend up', title: 'teuer' }, ' ↑') : null);

export class Panels {
  constructor(root) {
    this.title = el('h2');
    this.body = el('div', { class: 'panel-body' });
    this.box = el('div', { class: 'panel' },
      el('div', { class: 'panel-head' }, this.title, el('button', { class: 'x', title: 'Schließen (Esc)', onclick: () => this.close() }, '✕')),
      this.body);
    this.back = el('div', { class: 'panel-back hidden', onclick: (e) => { if (e.target === this.back) this.close(); } }, this.box);
    root.append(this.back);
    this.open = null;
  }

  show(kind, arg) {
    this.open = kind;
    this.arg = arg;
    this.sel = 0;
    this.lexSel = this.lexSel || null;
    this.back.classList.remove('hidden');
    this.box.className = `panel panel-${kind}`;
    this.render();
  }

  close() {
    this.open = null;
    this.back.classList.add('hidden');
    G.input.endFrame();
    if (this.onClose) { const f = this.onClose; this.onClose = null; f(); }
  }

  update(input) {
    if (input.wasPressed('menu')) return this.close();
    for (const [kind, key] of Object.entries(HOTKEY)) {
      if (input.wasPressed(key)) { if (this.open === kind) this.close(); else this.show(kind); return; }
    }
    if (!this.nav || !this.nav.length) return;
    const moved = input.wasPressed('up') || input.wasPressed('left') ? -1 : input.wasPressed('down') || input.wasPressed('right') ? 1 : 0;
    if (moved) {
      this.sel = (this.sel + this.nav.length + moved) % this.nav.length;
      if (this.onNav) this.onNav(this.sel);
      this.render();
    }
    if (input.confirmPressed()) { const n = this.nav[this.sel]; if (n) n(); }
  }

  render() {
    this.title.textContent = this.open === 'shop' ? (G.data.shops[this.arg.id]?.name || 'Laden') : TITLES[this.open];
    clear(this.body);
    this.nav = [];
    this.onNav = null;
    this[`render_${this.open}`]();
  }

  // ---------- Inventar ----------
  render_inventory() {
    const items = Inv.list();
    const s = G.state;
    const grid = el('div', { class: 'inv-grid' });
    items.forEach((it, i) => {
      const cell = el('button', { class: `inv-cell${i === this.sel ? ' sel' : ''}`, title: it.def.name, onclick: () => { this.sel = i; this.render(); } },
        pixelCanvas(getIcon(it.def), 2), el('span', { class: 'cnt' }, it.n));
      grid.append(cell);
      this.nav.push(() => this.useSelected(items));
    });
    const info = el('div', { class: 'inv-info' });
    const cur = items[this.sel];
    if (cur) {
      info.append(el('h3', {}, cur.def.name), el('p', {}, cur.def.desc || ''));
      if (cur.def.food) info.append(el('p', { class: 'muted' }, 'Stillt: ' + Object.entries(cur.def.food).map(([k, v]) => `${({ satiety: 'Hunger', energy: 'Energie', health: 'Gesundheit', hygiene: 'Hygiene' })[k]} +${v}`).join(', ')));
      if (cur.def.food || cur.def.light) {
        const label = cur.def.food ? 'Essen / Trinken (E)' : s.light === cur.id ? 'Löschen (E)' : 'Anzünden (E)';
        info.append(el('button', { class: 'btn', onclick: () => this.useSelected(items) }, label));
      }
      if (cur.def.quest) info.append(el('p', { class: 'muted' }, 'Auftragsgegenstand'));
    } else info.append(el('p', { class: 'muted' }, 'Dein Beutel ist leer.'));
    const money = el('p', { class: 'money-line' }, `${s.cls === 'servus' ? 'Peculium' : 'Geldbeutel'}: ${formatMoney(s.money)}`);
    this.body.append(el('div', { class: 'inv-wrap' }, el('div', {}, grid, money), info));
  }

  useSelected(items) {
    const cur = items[this.sel];
    if (!cur) return;
    if (Inv.useItem(cur.id)) {
      if (this.sel >= Inv.list().length) this.sel = Math.max(0, Inv.list().length - 1);
      this.render();
    }
  }

  // ---------- Logbuch ----------
  render_log() {
    const s = G.state;
    const cls = G.data.classes[s.cls];
    this.body.append(el('div', { class: 'goal-box' }, el('b', {}, 'Lebensziel: '), fmt(cls.goal)));
    const active = M.activeList();
    this.body.append(el('h3', {}, 'Aktive Aufgaben'));
    if (!active.length) this.body.append(el('p', { class: 'muted' }, 'Keine. Sprich mit Leuten – Figuren mit „!“ haben Angebote für dich.'));
    for (const id of active) {
      const d = M.mdef(id), m = s.missions[id];
      const steps = el('ol', { class: 'steps' }, d.steps.slice(0, m.step + 1).map((st, i) => el('li', { class: i < m.step ? 'done' : 'cur' }, fmt(st.text))));
      const tracked = s.tracked === id;
      const btns = el('div', { class: 'row' },
        tracked ? el('span', { class: 'tag' }, '◆ verfolgt') : el('button', { class: 'btn small', onclick: () => { s.tracked = id; this.render(); } }, 'Verfolgen'),
        d.noAbandon ? null : el('button', { class: 'btn small ghost', onclick: () => { M.abandonMission(id); this.render(); } }, 'Aufgeben'));
      this.body.append(el('div', { class: `quest${tracked ? ' tracked' : ''}` }, el('h4', {}, d.title), el('p', {}, fmt(d.summary)), steps, btns));
      if (!tracked) this.nav.push(() => { s.tracked = id; this.render(); });
    }
    const avail = M.availableList();
    if (avail.length) {
      this.body.append(el('h3', {}, 'Angebote'));
      for (const id of avail) {
        const d = M.mdef(id);
        const giver = d.giver && G.data.npcs.list.find((n) => n.id === d.giver);
        this.body.append(el('div', { class: 'quest offer' }, el('h4', {}, d.title), el('p', {}, fmt(d.hint || d.summary)),
          giver ? el('p', { class: 'muted' }, `Ansprechpartner: ${giver.name}${giver.where ? ` (${giver.where})` : ''}`) : null));
      }
    }
    const done = Object.entries(s.missions).filter(([, m]) => m.count > 0);
    if (done.length) {
      this.body.append(el('h3', {}, 'Erledigt'));
      this.body.append(el('ul', { class: 'done-list' }, done.map(([id, m]) => el('li', {}, `${M.mdef(id).title}${m.count > 1 ? ` (${m.count}×)` : ''}`))));
    }
  }

  // ---------- Lexikon ----------
  render_lexicon() {
    const L = G.data.lexicon;
    const s = G.state;
    const { have, total } = lexCount();
    const list = el('div', { class: 'lex-list' });
    const ids = Object.keys(L.entries);
    const unlocked = ids.filter((id) => s.lex[id]);
    if (!this.lexSel || !s.lex[this.lexSel]) this.lexSel = unlocked[0] || null;
    for (const cat of L.categories) {
      const inCat = ids.filter((id) => L.entries[id].cat === cat.id);
      if (!inCat.length) continue;
      list.append(el('h4', {}, cat.name));
      for (const id of inCat) {
        const e = L.entries[id];
        const open = !!s.lex[id];
        const b = el('button', {
          class: `lex-item${this.lexSel === id ? ' sel' : ''}${open ? '' : ' locked'}${open && s.lex[id].new ? ' new' : ''}`,
          disabled: !open, onclick: () => { this.lexSel = id; this.render(); },
        }, open ? e.title : '? ? ?');
        list.append(b);
      }
    }
    const view = el('div', { class: 'lex-view' });
    if (this.lexSel) {
      const e = L.entries[this.lexSel];
      s.lex[this.lexSel].new = false;
      view.append(el('h3', {}, e.title));
      if (e.estimate) view.append(el('span', { class: 'tag est' }, 'enthält Schätzwerte'));
      for (const para of [].concat(e.text)) view.append(el('p', {}, para));
      if (e.sources && e.sources.length) view.append(el('div', { class: 'sources' }, el('b', {}, 'Quellen: '), e.sources.join(' · ')));
    } else view.append(el('p', { class: 'muted' }, 'Noch keine Einträge. Erkunde die Stadt, sprich mit Leuten und untersuche Gebäude (E).'));
    this.body.append(el('p', { class: 'muted small' }, `${have} von ${total} Einträgen entdeckt.`), el('div', { class: 'lex-wrap' }, list, view));
    unlocked.forEach((id) => this.nav.push(() => { this.lexSel = id; this.render(); }));
    this.sel = Math.max(0, unlocked.indexOf(this.lexSel));
    this.onNav = (i) => { this.lexSel = unlocked[i]; };
  }

  // ---------- Menü ----------
  render_menu() {
    const g = G.game;
    const items = [
      ['Weiterspielen', () => this.close()],
      ['Spiel speichern', () => { g.save(true); this.close(); }],
      ['Letzten Spielstand laden', () => { this.close(); g.loadSaved(); }],
      ['Steuerung', () => this.show('help')],
      ['Zum Titelbildschirm', () => { this.close(); g.toTitle(); }],
    ];
    const wrap = el('div', { class: 'menu-list' });
    items.forEach(([label, fn], i) => {
      wrap.append(el('button', { class: `btn wide${i === this.sel ? ' sel' : ''}`, onclick: fn }, label));
      this.nav.push(fn);
    });
    this.body.append(wrap, el('p', { class: 'muted small' }, 'Das Spiel speichert automatisch, wenn du schläfst. Ohne Browser-Speicher (z. B. im privaten Modus) kann nicht gespeichert werden.'));
  }

  render_help() {
    const rows = [
      ['WASD / Pfeiltasten', 'Laufen'], ['Shift (gedrückt)', 'Sprinten (kostet Energie)'], ['E', 'Sprechen, untersuchen, benutzen'],
      ['Leertaste / Enter', 'Bestätigen, im Minispiel handeln'], ['1–5', 'Antwort im Dialog wählen'], ['I', 'Inventar'], ['L', 'Logbuch'],
      ['K', 'Lexikon (Schriftrolle des Wissens)'], ['C', 'Charakter: Fertigkeiten, Boni'], ['M', 'Stadtplan'], ['Esc', 'Menü / Fenster schließen'],
    ];
    this.body.append(el('table', { class: 'keys' }, rows.map(([k, v]) => el('tr', {}, el('td', {}, el('kbd', {}, k)), el('td', {}, v)))),
      el('p', { class: 'muted small' }, 'Auf Touch-Geräten erscheinen Steuerkreuz und Knöpfe am Bildschirmrand.'));
    if (G.game.mode === 'play') this.nav.push(() => this.show('menu'));
  }

  // ---------- Laden ----------
  render_shop() {
    const shop = G.data.shops[this.arg.id];
    const s = G.state;
    this.body.append(el('p', { class: 'muted' }, fmt(shop.text || '')), el('p', { class: 'money-line' }, `Dein Geld: ${formatMoney(s.money)}`));
    const tab = this.arg.tab || 'buy';
    if (shop.buys) {
      this.body.append(el('div', { class: 'row tabs' },
        el('button', { class: `btn small${tab === 'buy' ? '' : ' ghost'}`, onclick: () => { this.arg.tab = 'buy'; this.sel = 0; this.render(); } }, 'Kaufen'),
        el('button', { class: `btn small${tab === 'sell' ? '' : ' ghost'}`, onclick: () => { this.arg.tab = 'sell'; this.sel = 0; this.render(); } }, 'Verkaufen')));
    }
    if (tab === 'sell') { this.renderSell(shop); return; }
    const list = el('div', { class: 'shop-list' });
    shop.items.forEach((entry, i) => {
      const def = Inv.itemDef(entry.id);
      const price = Market.buyPrice(shop, entry);
      const can = s.money >= price;
      const buy = () => {
        if (G.state.money < price) { G.ui.toast('Dafür reicht dein Geld nicht.', 'cost'); return; }
        changeMoney(-price);
        Inv.add(entry.id, 1);
        if (shop.market) Market.noteTrade(shop.market, entry.id, 'buy');
        this.render();
      };
      const row = el('div', { class: `shop-row${i === this.sel ? ' sel' : ''}` },
        pixelCanvas(getIcon(def), 2), el('div', { class: 'grow' }, el('b', {}, def.name), el('small', {}, def.desc || '')),
        el('span', { class: 'price' }, shortMoney(price), shop.market ? trendMark(Market.trend(shop.market, entry.id, 'buy')) : null),
        el('button', { class: 'btn small', disabled: !can, onclick: buy }, 'Kaufen'),
        shop.haggle && price >= 4 ? el('button', { class: 'btn small ghost', onclick: () => { this.close(); G.game.haggleBuy(this.arg.id, entry.id, price, this.arg.npc); } }, 'Feilschen') : null);
      list.append(row);
      this.nav.push(buy);
    });
    this.body.append(list);
  }

  renderSell(shop) {
    const list = el('div', { class: 'shop-list' });
    const items = Inv.list().filter((it) => sellPrice(shop, it.id) > 0);
    if (!items.length) list.append(el('p', { class: 'muted' }, 'Du hast nichts, was dieser Händler kaufen würde.'));
    items.forEach((it, i) => {
      const price = sellPrice(shop, it.id);
      const sell = () => {
        if (Inv.count(it.id) < 1) return;
        Inv.remove(it.id, 1);
        changeMoney(price);
        G.state.vars.sold = (G.state.vars.sold || 0) + price;
        if (shop.market) Market.noteTrade(shop.market, it.id, 'sell');
        if (it.def.cat === 'good' || it.def.cat === 'fish') addXp('handel', Math.ceil(price / 3));
        this.render();
      };
      list.append(el('div', { class: `shop-row${i === this.sel ? ' sel' : ''}` },
        pixelCanvas(getIcon(it.def), 2), el('div', { class: 'grow' }, el('b', {}, `${it.def.name} (${it.n}×)`), el('small', {}, it.def.desc || '')),
        el('span', { class: 'price' }, shortMoney(price), shop.market ? trendMark(Market.trend(shop.market, it.id, 'sell')) : null),
        el('button', { class: 'btn small', onclick: sell }, 'Verkaufen')));
      this.nav.push(sell);
    });
    this.body.append(list);
  }

  // ---------- Preistafel eines Marktes ----------
  render_prices() {
    const m = Market.marketDef(this.arg.market);
    const goods = m.board || [];
    this.title.textContent = `Preistafel – ${m.name}`;
    this.body.append(el('p', { class: 'muted' }, `${m.desc || ''} Jahreszeit: ${Market.currentSeason()}. ↓ günstig, ↑ teuer (verglichen mit üblichen Preisen).`));
    const t = el('table', { class: 'prices' }, el('tr', {}, el('th', {}, 'Ware'), el('th', {}, 'Hier kaufen'), el('th', {}, 'Hier verkaufen')));
    for (const id of goods) {
      t.append(el('tr', {}, el('td', {}, Inv.itemDef(id).name),
        el('td', {}, shortMoney(Market.marketPrice(this.arg.market, id, 'buy')), trendMark(Market.trend(this.arg.market, id, 'buy'))),
        el('td', {}, shortMoney(Market.marketPrice(this.arg.market, id, 'sell')), trendMark(Market.trend(this.arg.market, id, 'sell')))));
    }
    this.body.append(t, el('p', { class: 'muted small' }, 'Tipp: Am Emporium kauft man im Großhandel günstig ein, im Macellum zahlen die Reichen gut. Wer an einem Tag viel derselben Ware verkauft, drückt den Preis.'));
  }

  // ---------- Kochen ----------
  render_cook() {
    const list = el('div', { class: 'shop-list' });
    Object.entries(Cook.recipes()).forEach(([id, r], i) => {
      const lockedLvl = !Cook.unlocked(id);
      const miss = Cook.missing(id);
      const can = !lockedLvl && !miss.length;
      const go = () => { if (!can) return; this.close(); Cook.cook(id); };
      const need = Object.entries(r.in).map(([it, n]) => `${Inv.itemDef(it).name}${n > 1 ? ` ×${n}` : ''}`).join(', ');
      list.append(el('div', { class: `shop-row${i === this.sel ? ' sel' : ''}${lockedLvl ? ' locked' : ''}` },
        pixelCanvas(getIcon(Inv.itemDef(r.out)), 2),
        el('div', { class: 'grow' }, el('b', {}, lockedLvl ? `${r.name} (ab Kochen ${r.level})` : r.name), el('small', {}, `Zutaten: ${need}`),
          miss.length && !lockedLvl ? el('small', { class: 'warnline' }, `Es fehlt: ${miss.join(', ')}`) : null, r.desc ? el('small', { class: 'muted' }, r.desc) : null),
        el('button', { class: 'btn small', disabled: !can, onclick: go }, 'Kochen')));
      if (can) this.nav.push(go);
    });
    this.body.append(el('p', { class: 'muted' }, 'Zutaten kaufst du auf den Märkten; Fische fängst du selbst. Gut gekochte Gerichte geben mehr Portionen.'), list);
  }

  // ---------- Charakter ----------
  render_char() {
    const s = G.state;
    const cls = G.data.classes[s.cls];
    this.body.append(el('p', {}, el('b', {}, s.name), ` – ${s.gender === 'f' ? cls.title_f : cls.title_m}`));
    this.body.append(el('h3', {}, 'Fertigkeiten'));
    const grid = el('div', { class: 'skill-grid' });
    for (const [id, def] of Object.entries(skillDefs())) {
      const l = level(id);
      const next = def.perks && Object.entries(def.perks).find(([k]) => Number(k) > l);
      grid.append(el('div', { class: 'skill' },
        el('div', { class: 'row' }, el('b', {}, def.name), el('span', { class: 'tag' }, `Stufe ${l}`)),
        el('div', { class: 'bar' }, el('i', { style: { width: `${Math.round(progress(id) * 100)}%` } })),
        el('small', { class: 'muted' }, next ? `Stufe ${next[0]}: ${next[1]}` : def.desc)));
    }
    this.body.append(grid);
    this.body.append(el('h3', {}, 'Aktive Boni'));
    const buffs = activeBuffs();
    if (!buffs.length) this.body.append(el('p', { class: 'muted' }, 'Keine. Opfergaben in Tempeln oder gutes Essen geben zeitlich begrenzte Boni.'));
    for (const b of buffs) this.body.append(el('p', {}, `✦ ${b.name} – noch etwa ${Math.ceil(hoursLeft(b))} Std.`));
    if (this.extraChar) this.extraChar(this.body);
  }

  // ---------- Stadtplan ----------
  render_map() {
    const g = G.game;
    const rom = g.mapById('rom');
    const S = 4;
    const cv = el('canvas', { class: 'px citymap', width: rom.w * S, height: rom.h * S });
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(rom.mini, 0, 0, rom.w * S, rom.h * S);
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px Georgia, serif';
    for (const z of rom.zones) {
      if (z.hideLabel) continue;
      const x = (z.r[0] + z.r[2] / 2) * S, y = (z.r[1] + z.r[3] / 2) * S;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(243,230,196,0.85)'; ctx.strokeText(z.name, x, y);
      ctx.fillStyle = '#3b2416'; ctx.fillText(z.name, x, y);
    }
    for (const st of rom.stations) {
      ctx.fillStyle = '#a3392c'; ctx.fillRect(st.at[0] * S - 5, st.at[1] * S - 5, 10, 10);
      ctx.fillStyle = '#f2c14e'; ctx.fillRect(st.at[0] * S - 3, st.at[1] * S - 3, 6, 6);
    }
    const tgt = G.state.tracked && M.targetOf(G.state.tracked);
    const tpos = tgt && (tgt.map === 'rom' ? tgt : g.doorFront(tgt.map));
    if (tpos) { ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.arc(tpos.x / 16 * S, tpos.y / 16 * S, 8, 0, 7); ctx.fill(); ctx.strokeStyle = '#2b1b12'; ctx.lineWidth = 2; ctx.stroke(); }
    const pp = g.map.interior ? g.doorFront(g.map.id) : { x: g.player.x, y: g.player.y };
    if (pp) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(pp.x / 16 * S, pp.y / 16 * S, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(pp.x / 16 * S, pp.y / 16 * S, 4.5, 0, 7); ctx.fill(); }
    this.body.append(el('div', { class: 'citymap-wrap' }, cv),
      el('p', { class: 'muted small' }, '● du · ● goldener Kreis: aktuelles Ziel · ■ Sänftenträger (Schnellreise). Norden ist oben; die Stadt ist stark verkleinert.'));
  }

  // ---------- Sänfte ----------
  render_travel() {
    const g = G.game;
    const rom = g.mapById('rom');
    const from = rom.stations.find((x) => x.id === this.arg.from);
    const cost = g.travelCost();
    const why = g.canTravel();
    this.body.append(el('p', {}, cost ? `Die Träger bringen dich für ${formatMoney(cost)} an einen der Sammelplätze. Die Fahrt dauert etwas.` : 'Die Sänftenträger deines Hauses bringen dich, wohin du willst.'));
    if (why) this.body.append(el('p', { class: 'warnline' }, why));
    const list = el('div', { class: 'shop-list' });
    rom.stations.filter((x) => x !== from).forEach((st, i) => {
      const secs = from ? Math.round(Math.hypot(st.at[0] - from.at[0], st.at[1] - from.at[1]) / 5.5) : 0;
      const go = () => { this.close(); g.fastTravel(st.id); };
      list.append(el('div', { class: `shop-row${i === this.sel ? ' sel' : ''}` },
        el('div', { class: 'grow' }, el('b', {}, st.name), el('small', {}, `zu Fuß etwa ${secs} s`)),
        el('button', { class: 'btn small', disabled: !!why, onclick: go }, 'Hinbringen')));
      if (!why) this.nav.push(go);
    });
    this.body.append(list);
  }
}
