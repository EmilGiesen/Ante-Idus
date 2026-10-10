// Fenster für Minispiele (eigener Pixel-Canvas, Tastatur, Maus und Touch)
import { el, clear } from './dom.js';
import { G } from '../core/ctx.js';

const W = 256, H = 160;

export class MinigameModal {
  constructor(root) {
    this.canvas = el('canvas', { class: 'mg-canvas px', width: W, height: H });
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.title = el('h2');
    this.hint = el('p', { class: 'mg-hint' });
    this.btns = el('div', { class: 'mg-btns' });
    this.result = el('div', { class: 'mg-result hidden' });
    this.box = el('div', { class: 'mg-box' }, this.title, el('div', { class: 'mg-stage' }, this.canvas, this.result), this.hint, this.btns,
      el('button', { class: 'btn small ghost mg-abort', onclick: () => this.abort() }, 'Abbrechen (Esc)'));
    this.back = el('div', { class: 'minigame hidden' }, this.box);
    root.append(this.back);
    this.open = false;
    this.pointerHeld = false;
    const down = (e) => { e.preventDefault(); this.pointerHeld = true; G.input.press('action'); };
    const up = () => { this.pointerHeld = false; };
    this.canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  start(game, opts, resolve) {
    this.game = game;
    this.st = game.init(opts || {});
    this.resolve = resolve;
    this.finished = null;
    this.open = true;
    this.title.textContent = game.title;
    this.hint.textContent = game.hint;
    clear(this.btns);
    for (const b of game.buttons || []) {
      this.btns.append(el('button', { class: 'btn small', onpointerdown: (e) => { e.preventDefault(); G.input.press(b.action); } }, b.label));
    }
    this.result.classList.add('hidden');
    this.back.classList.remove('hidden');
    G.input.endFrame();
  }

  update(dt, input) {
    if (this.finished) {
      if (input.confirmPressed() || input.wasPressed('menu')) this.finish();
      return;
    }
    if (input.wasPressed('menu')) { this.abort(); return; }
    const held = input.isDown('action') || input.isDown('interact') || input.isDown('confirm') || this.pointerHeld;
    this.game.update(this.st, dt, input, held);
    this.game.draw(this.st, this.ctx, W, H);
    const r = this.game.result(this.st);
    if (r.done) {
      this.finished = r;
      this.result.innerHTML = '';
      this.result.append(el('b', {}, r.success ? 'Gut gemacht!' : 'Nicht ganz …'), el('p', {}, r.text || ''),
        el('button', { class: 'btn', onclick: () => this.finish() }, 'Weiter (E)'));
      this.result.classList.remove('hidden');
    }
  }

  abort() {
    if (!this.open) return;
    this.finished = { done: true, aborted: true, success: false, score: 0, pay: 0, text: 'Abgebrochen.' };
    this.finish();
  }

  finish() {
    this.open = false;
    this.back.classList.add('hidden');
    G.input.endFrame();
    const r = this.finished;
    this.finished = null;
    this.resolve(r);
  }
}
