// Titelbildschirm und Charakterwahl
import { el, clear } from './dom.js';
import { G } from '../core/ctx.js';
import { getSheet, FW, FH } from '../gfx/sprites.js';
import { formatMoney } from '../core/util.js';

export class Screens {
  constructor(root) {
    this.root = el('div', { class: 'screen hidden' });
    root.append(this.root);
    this.timer = null;
  }

  hide() {
    this.root.classList.add('hidden');
    clear(this.root);
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.open = false;
  }

  title({ hasSave, onNew, onContinue, onHelp }) {
    this.hide();
    this.open = true;
    this.root.className = 'screen title-screen';
    this.root.append(el('div', { class: 'title-card' },
      el('div', { class: 'spqr' }, 'S · P · Q · R'),
      el('h1', {}, 'ROMA VIVIT'),
      el('p', { class: 'sub' }, 'Ein Leben im Rom Caesars · 46 – 44 v. Chr.'),
      el('div', { class: 'title-btns' },
        el('button', { class: 'btn big', onclick: onNew }, 'Neues Leben beginnen'),
        el('button', { class: 'btn big', disabled: !hasSave, onclick: onContinue }, hasSave ? 'Fortsetzen' : 'Kein Spielstand'),
        el('button', { class: 'btn ghost', onclick: onHelp }, 'Steuerung')),
      el('p', { class: 'fine' }, 'Frühjahr 708 a.u.c. – Caesar kämpft in Afrika, Rom wartet auf Nachrichten.'),
      el('p', { class: 'fine muted' }, 'Alle Grafiken werden im Code gezeichnet. Historische Hintergründe im Lexikon (K).')));
  }

  charSelect({ onStart, onBack }) {
    this.hide();
    this.open = true;
    this.root.className = 'screen select-screen';
    const classes = G.data.classes;
    const order = ['nobilis', 'plebs', 'servus'];
    let cls = 'plebs', gender = 'm';
    const nameInput = el('input', { class: 'name-input', maxlength: 24, 'aria-label': 'Name' });
    const previews = [];
    const cards = order.map((id) => {
      const c = classes[id];
      const cv = el('canvas', { class: 'px preview', width: FW, height: FH });
      previews.push({ id, cv });
      const card = el('button', { class: 'class-card', onclick: () => { cls = id; refresh(true); } },
        cv, el('h3', {}, c.label), el('p', { class: 'tagline' }, c.tagline),
        el('ul', {}, el('li', {}, el('b', {}, 'Start: '), c.startText), el('li', {}, el('b', {}, 'Geld: '), formatMoney(c.money)),
          el('li', {}, el('b', {}, 'Ziel: '), c.goalShort), el('li', {}, el('b', {}, 'Achtung: '), c.limits)));
      card.dataset.id = id;
      return card;
    });
    const gBtns = ['m', 'f'].map((g) => el('button', { class: 'btn small', onclick: () => { gender = g; refresh(true); } }, g === 'm' ? 'Mann' : 'Frau'));
    const start = () => {
      const name = nameInput.value.trim() || defaultName();
      onStart(cls, gender, name);
    };
    const defaultName = () => classes[cls].names[gender];
    const refresh = (resetName) => {
      cards.forEach((c) => c.classList.toggle('sel', c.dataset.id === cls));
      gBtns.forEach((b, i) => b.classList.toggle('sel', ['m', 'f'][i] === gender));
      if (resetName) nameInput.value = defaultName();
    };
    let frame = 0;
    const draw = () => {
      frame = (frame + 1) % 4;
      for (const p of previews) {
        const app = classes[p.id].app[gender];
        const ctx = p.cv.getContext('2d');
        ctx.clearRect(0, 0, FW, FH);
        ctx.drawImage(getSheet(app), (p.id === cls ? frame : 0) * FW, 0, FW, FH, 0, 0, FW, FH);
      }
    };
    this.timer = setInterval(draw, 180);
    this.root.append(el('div', { class: 'select-card' },
      el('h2', {}, 'Wähle deinen Lebensweg'),
      el('div', { class: 'class-cards' }, cards),
      el('div', { class: 'select-row' }, el('span', {}, 'Geschlecht:'), gBtns, el('span', {}, 'Name:'), nameInput),
      el('div', { class: 'select-row' },
        el('button', { class: 'btn ghost', onclick: onBack }, 'Zurück'),
        el('button', { class: 'btn big', onclick: start }, 'Leben beginnen'))));
    nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') start(); });
    refresh(true);
    draw();
  }
}
