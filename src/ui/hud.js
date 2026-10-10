// HUD: Datum, Uhrzeit, Bedürfnisse, Geld, Klassen-Ressourcen, Ort und aktuelles Ziel
import { el } from './dom.js';
import { G } from '../core/ctx.js';
import { dateOfPlayedDay, formatRoman, formatGerman, auc, season } from '../core/calendar.js';
import { hourLabel, hourHint, isNight } from '../core/time.js';
import { coins } from '../core/util.js';
import { NEED_NAMES } from '../systems/needs.js';
import { currentStep, mdef, targetOf } from '../systems/missions.js';
import { fmt } from '../systems/text.js';
import { festivalOf, isRaceDay } from '../systems/festivals.js';

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
    this.mini = el('canvas', { class: 'minimap px', width: 140, height: 104, title: 'Stadtplan: M' });
    this.right = el('div', { class: 'hud-box hud-right' }, this.zone, this.goal, this.mini);
    this.keys = el('div', { class: 'hud-keys' }, 'E sprechen/benutzen · Shift sprinten · I Inventar · C Charakter · L Logbuch · K Lexikon · M Stadtplan · Esc Menü');
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
    const fest = festivalOf(s.time.day);
    this.date.textContent = `${formatRoman(dt0)} · ${auc(dt0.year)} a.u.c.${fest ? ` · ${fest.name}` : ''}${isRaceDay(s.time.day) ? ' · Rennen' : ''}`;
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
    this.drawMini();
  }

  // Minikarte: Ausschnitt um die Spielfigur (2 Pixel pro Tile), Ziel als goldener Punkt
  drawMini() {
    const g = G.game, map = g.map, ctx = this.mini.getContext('2d');
    const W = this.mini.width, H = this.mini.height;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1b120c';
    ctx.fillRect(0, 0, W, H);
    let sc = 2, ox, oy;
    if (map.interior) {
      sc = Math.max(1, Math.floor(Math.min(W / map.w, H / map.h)));
      ox = Math.floor((W - map.w * sc) / 2); oy = Math.floor((H - map.h * sc) / 2);
      ctx.drawImage(map.mini, ox, oy, map.w * sc, map.h * sc);
      ox = -ox / sc; oy = -oy / sc;
    } else {
      ox = g.player.x / 16 - W / sc / 2; oy = g.player.y / 16 - H / sc / 2;
      ox = Math.max(0, Math.min(map.w - W / sc, ox)); oy = Math.max(0, Math.min(map.h - H / sc, oy));
      ctx.drawImage(map.mini, ox, oy, W / sc, H / sc, 0, 0, W, H);
    }
    const dot = (tx, ty, c, r) => { ctx.fillStyle = '#2b1b12'; ctx.fillRect(Math.round((tx - ox) * sc) - r - 1, Math.round((ty - oy) * sc) - r - 1, r * 2 + 2, r * 2 + 2); ctx.fillStyle = c; ctx.fillRect(Math.round((tx - ox) * sc) - r, Math.round((ty - oy) * sc) - r, r * 2, r * 2); };
    const s = G.state;
    const tgt = s.tracked && targetOf(s.tracked);
    if (tgt) {
      const p = tgt.map === map.id ? tgt : (map.interior ? null : g.doorFront(tgt.map));
      if (p) dot(p.x / 16, p.y / 16, '#f2c14e', 2);
    }
    dot(g.player.x / 16, g.player.y / 16, '#ffffff', 2);
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
