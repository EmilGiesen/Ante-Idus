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

const TITLES = { inventory: 'Inventar', log: 'Logbuch', lexicon: 'Schriftrolle des Wissens', menu: 'Menü', shop: 'Laden', help: 'Steuerung' };
const HOTKEY = { inventory: 'inventory', log: 'log', lexicon: 'lexicon' };

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
      ['K', 'Lexikon (Schriftrolle des Wissens)'], ['Esc', 'Menü / Fenster schließen'],
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
    const list = el('div', { class: 'shop-list' });
    shop.items.forEach((entry, i) => {
      const def = Inv.itemDef(entry.id);
      const price = entry.price ?? def.price;
      const can = s.money >= price;
      const buy = () => {
        if (G.state.money < price) { G.ui.toast('Dafür reicht dein Geld nicht.', 'cost'); return; }
        changeMoney(-price);
        Inv.add(entry.id, 1);
        this.render();
      };
      const row = el('div', { class: `shop-row${i === this.sel ? ' sel' : ''}` },
        pixelCanvas(getIcon(def), 2), el('div', { class: 'grow' }, el('b', {}, def.name), el('small', {}, def.desc || '')),
        el('span', { class: 'price' }, shortMoney(price)),
        el('button', { class: 'btn small', disabled: !can, onclick: buy }, 'Kaufen'),
        shop.haggle && price >= 4 ? el('button', { class: 'btn small ghost', onclick: () => { this.close(); G.game.haggleBuy(this.arg.id, entry.id, price, this.arg.npc); } }, 'Feilschen') : null);
      list.append(row);
      this.nav.push(buy);
    });
    this.body.append(list);
  }
}
