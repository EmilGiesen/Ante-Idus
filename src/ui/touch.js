// Einfache Touch-Steuerung (Steuerkreuz + Aktionsknöpfe), nur auf Touch-Geräten sichtbar
import { el } from './dom.js';
import { G } from '../core/ctx.js';

export function setupTouch(root) {
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (!coarse && !('ontouchstart' in window)) return null;
  const input = G.input;
  const pad = el('div', { class: 'tpad' });
  const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  for (const [d, [x, y]] of Object.entries(dirs)) {
    const b = el('button', { class: `tdir t-${d}`, 'aria-label': d }, { up: '▲', down: '▼', left: '◀', right: '▶' }[d]);
    const on = (e) => { e.preventDefault(); input.touchAxis = { x, y }; };
    const off = (e) => { e.preventDefault(); if (input.touchAxis.x === x && input.touchAxis.y === y) input.touchAxis = { x: 0, y: 0 }; };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerenter', (e) => { if (e.buttons) on(e); });
    b.addEventListener('pointerup', off);
    b.addEventListener('pointerleave', off);
    b.addEventListener('pointercancel', off);
    pad.append(b);
  }
  const act = (label, action, cls) => {
    const b = el('button', { class: `tbtn ${cls || ''}` }, label);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); input.press(action); input.down.add(action); });
    const up = () => input.down.delete(action);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointerleave', up);
    return b;
  };
  const sprint = el('button', { class: 'tbtn sprint' }, '»');
  sprint.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    input.touchSprint = !input.touchSprint;
    sprint.classList.toggle('on', input.touchSprint);
  });
  const acts = el('div', { class: 'tacts' }, act('E', 'interact', 'big'), sprint);
  const menu = el('div', { class: 'tmenu' }, act('I', 'inventory'), act('L', 'log'), act('K', 'lexicon'), act('☰', 'menu'));
  const wrap = el('div', { class: 'touch hidden' }, pad, acts, menu);
  root.append(wrap);
  return wrap;
}
