// HUD: Datum, Uhrzeit, Bedürfnisse, Geld, Klassen-Ressourcen, Ort und aktuelles Ziel
import { el } from './dom.js';
import { G } from '../core/ctx.js';
import { dateOfPlayedDay, formatRoman, formatGerman, auc, season } from '../core/calendar.js';
import { hourLabel, hourHint, isNight } from '../core/time.js';
import { coins } from '../core/util.js';
import { NEED_NAMES } from '../systems/needs.js';
import { currentStep, mdef } from '../systems/missions.js';
import { fmt } from '../systems/text.js';

const ICON = { satiety: '🍞', energy: '⚡', health: '❤', hygiene: '💧' };

export class Hud {
  constructor(root) {
    this.bars = {};
    const needs = Object.keys(NEED_NAMES).map((k) => {
      const fill = el('i');
      this.bars[k] = fill;
      return el('div', { class: `need need-${k}`, title: NEED_NAMES[k] }, el('span', { class: 'ni' }, ICON[k]), el('b', {}, fill));
    });
    this.who = el('div', { class: 'hud-who' });
    this.date = el('div', { class: 'hud-date' });
    this.time = el('div', { class: 'hud-time' });
    this.money = el('div', { class: 'hud-money', title: '1 Denar = 4 Sesterzen = 16 Asse' });
    this.extra = el('div', { class: 'hud-extra' });
    this.left = el('div', { class: 'hud-box hud-left' }, this.who, this.date, this.time, el('div', { class: 'needs' }, needs), this.money, this.extra);
    this.zone = el('div', { class: 'hud-zone' });
    this.goal = el('div', { class: 'hud-goal' });
    this.right = el('div', { class: 'hud-box hud-right' }, this.zone, this.goal);
    this.keys = el('div', { class: 'hud-keys' }, 'E sprechen/benutzen · Shift sprinten · I Inventar · L Logbuch · K Lexikon · Esc Menü');
    this.root = el('div', { class: 'hud hidden' }, this.left, this.right, this.keys);
    root.append(this.root);
    this.t = 0;
  }

  show(v) { this.root.classList.toggle('hidden', !v); }

  update(dt, force) {
    this.t -= dt;
    if (this.t > 0 && !force) return;
    this.t = 0.25;
    const s = G.state;
    const cls = G.data.classes[s.cls];
    this.who.textContent = `${s.name} · ${s.gender === 'f' ? cls.title_f : cls.title_m}`;
    const dt0 = dateOfPlayedDay(s.time.day);
    this.date.textContent = `${formatRoman(dt0)} · ${auc(dt0.year)} a.u.c.`;
    this.date.title = `${formatGerman(dt0)} · ${season(dt0)}`;
    this.time.textContent = `${isNight(s.time.hour) ? '☾' : '☀'} ${hourLabel(s.time.hour)} – ${hourHint(s.time.hour)}`;
    for (const [k, fill] of Object.entries(this.bars)) {
      const v = s.needs[k];
      fill.style.width = `${v}%`;
      fill.parentElement.parentElement.classList.toggle('low', v < 22);
    }
    const c = coins(s.money);
    this.money.innerHTML = '';
    this.money.append(
      el('span', { class: 'coin den' }), `${c.den}`, el('span', { class: 'coin ses' }), `${c.ses}`, el('span', { class: 'coin as' }), `${c.as}`,
      el('small', {}, s.cls === 'servus' ? ' Peculium' : ''),
    );
    this.extra.textContent = this.extraText(s);
    const map = G.game.map;
    const z = map.interior ? null : map.zoneAt(Math.floor(G.game.player.x / 16), Math.floor(G.game.player.y / 16));
    this.zone.textContent = map.interior ? map.name : (z ? z.name : 'Roma');
    const id = s.tracked;
    const step = id && currentStep(id);
    this.goal.innerHTML = '';
    if (step) this.goal.append(el('b', {}, mdef(id).title), el('span', {}, fmt(step.text)));
    else this.goal.append(el('span', { class: 'muted' }, 'Kein Ziel verfolgt – L öffnet das Logbuch.'));
  }

  extraText(s) {
    const st = s.stats;
    if (s.cls === 'nobilis') return `Dignitas ${st.dignitas} · Caesarianer ${fmtRel(st.caesariani)} · Optimaten ${fmtRel(st.optimates)}`;
    if (s.cls === 'servus') return `Vertrauen ${st.fides}/100 · Ziel: Freilassung`;
    const left = s.rent ? s.rent.due - s.time.day : 0;
    const rent = !s.rent ? '' : left > 0 ? `Miete in ${left} Tg.` : 'Miete fällig!';
    return `Familie ${st.familia} · Nachbarn ${st.vicinia} · ${rent}`;
  }
}

const fmtRel = (v) => (v > 0 ? `+${v}` : `${v}`);
