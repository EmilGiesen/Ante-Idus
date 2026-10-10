// Einstiegspunkt: Daten laden, Systeme verbinden, Spielschleife starten
import { G } from './core/ctx.js';
import { loadData } from './core/data.js';
import { Input } from './core/input.js';
import { UI } from './ui/ui.js';
import { Game } from './game.js';

window.__errors = [];
function showError(msg) {
  window.__errors.push(String(msg));
  let box = document.getElementById('errbox');
  if (!box) {
    box = document.createElement('pre');
    box.id = 'errbox';
    document.body.append(box);
  }
  box.textContent = `Fehler: ${window.__errors.join('\n')}`;
}
window.addEventListener('error', (e) => showError(e.message + (e.filename ? ` (${e.filename.split('/').pop()}:${e.lineno})` : '')));
window.addEventListener('unhandledrejection', (e) => showError(e.reason && e.reason.stack ? e.reason.stack : e.reason));

async function boot() {
  const root = document.getElementById('ui');
  root.innerHTML = '<div class="loading">Rom wird erbaut …</div>';
  G.data = await loadData();
  root.innerHTML = '';
  G.input = new Input();
  G.ui = new UI(root);
  const game = new Game(document.getElementById('game'));
  G.game = game;
  window.__rv = { G, game };
  game.showTitle();

  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    try {
      game.frame(dt);
    } catch (err) {
      showError(err.stack || err);
      throw err;
    } finally {
      G.input.endFrame();
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot().catch((e) => showError(e.stack || e));
