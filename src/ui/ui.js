// UI-Verwaltung: hält alle Overlays zusammen und verteilt die Eingabe
import { el } from './dom.js';
import { Hud } from './hud.js';
import { DialogBox } from './dialogbox.js';
import { Panels } from './panels.js';
import { MinigameModal } from './minigame.js';
import { Screens } from './screens.js';
import { setupTouch } from './touch.js';

export class UI {
  constructor(root) {
    this.root = root;
    this.hud = new Hud(root);
    this.toasts = el('div', { class: 'toasts' });
    root.append(this.toasts);
    this.dialog = new DialogBox(root);
    this.panels = new Panels(root);
    this.mini = new MinigameModal(root);
    this.screens = new Screens(root);
    this.fadeEl = el('div', { class: 'fade' });
    root.append(this.fadeEl);
    this.banner = el('div', { class: 'banner hidden' });
    root.append(this.banner);
    this.touch = setupTouch(root);
    this.fading = false;
  }

  isBlocking() {
    return this.dialog.open || !!this.panels.open || this.mini.open || this.screens.open || this.fading;
  }

  setInGame(v) {
    this.inGame = v;
    this.hud.show(v);
    this.syncTouch();
  }

  // Touch-Steuerung nur zeigen, wenn gerade gelaufen werden kann
  syncTouch() {
    if (!this.touch) return;
    const show = this.inGame && !this.isBlocking();
    if (show !== this.touchShown) { this.touchShown = show; this.touch.classList.toggle('hidden', !show); }
  }

  update(dt, input) {
    if (this.mini.open) this.mini.update(dt, input);
    else if (this.dialog.open) this.dialog.update(dt, input);
    else if (this.panels.open) this.panels.update(input);
  }

  toast(text, kind = '') {
    const t = el('div', { class: `toast ${kind}` }, text);
    this.toasts.append(t);
    while (this.toasts.children.length > 5) this.toasts.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 3600);
    setTimeout(() => t.remove(), 4200);
  }

  // Großer Einblendtext (z. B. neuer Tag, Ortswechsel)
  showBanner(title, sub) {
    this.banner.innerHTML = '';
    this.banner.append(el('b', {}, title), sub ? el('span', {}, sub) : null);
    this.banner.classList.remove('hidden', 'out');
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => this.banner.classList.add('out'), 2600);
  }

  fade(mid, ms = 280) {
    return new Promise((resolve) => {
      this.fading = true;
      this.fadeEl.classList.add('on');
      setTimeout(() => {
        mid && mid();
        this.fadeEl.classList.remove('on');
        setTimeout(() => { this.fading = false; resolve(); }, ms);
      }, ms);
    });
  }
}
