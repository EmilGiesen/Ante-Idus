// Minispiel „Fischen am Tiber“: auf den Anbiss warten, anschlagen, dann die Schnur auf Spannung halten
import { brush } from '../gfx/pixel.js';

const CASTS = 3;

export const fishing = {
  title: 'Fischen am Tiber',
  hint: 'Warte, bis der Schwimmer abtaucht – dann schnell Leertaste/E. Beim Drillen halten, damit der Fisch im grünen Bereich bleibt.',
  buttons: [{ label: 'Anschlagen / Ziehen', action: 'action', hold: true }],

  init(opts) {
    return {
      opts, cast: 0, phase: 'wait', t: 0, bite: 1.5 + Math.random() * 3, catches: [], msg: '', flash: 0, done: false,
      fishPos: 0.5, fishVel: 0, bar: 0.5, barVel: 0, prog: 0.3, fish: null, wobble: 0,
    };
  },

  update(s, dt, input, held) {
    s.t += dt; s.wobble += dt;
    if (s.flash > 0) s.flash -= dt;
    if (s.done) return;
    if (s.phase === 'pause') { if (s.t > 0.9) { s.phase = 'wait'; s.t = 0; s.bite = 1.5 + Math.random() * 3; } return; }
    if (s.phase === 'wait') {
      if (input.confirmPressed()) return miss(s, 'Zu früh angeschlagen!');
      if (s.t > s.bite) { s.phase = 'bite'; s.t = 0; }
      return;
    }
    if (s.phase === 'bite') {
      if (input.confirmPressed()) { s.phase = 'reel'; s.t = 0; s.fish = pickFish(s.opts); s.prog = 0.3; s.bar = 0.5; s.fishPos = 0.5; return; }
      if (s.t > 0.9) return miss(s, 'Weg ist er …');
      return;
    }
    // Drillen: Balken mit Halten anheben, Fisch zappelt
    const f = s.fish;
    s.fishVel += (Math.random() - 0.5) * f.wild * 9 * dt;
    s.fishVel *= 0.96;
    s.fishPos += s.fishVel * dt;
    if (s.fishPos < 0.05 || s.fishPos > 0.95) { s.fishVel *= -0.8; s.fishPos = Math.max(0.05, Math.min(0.95, s.fishPos)); }
    s.barVel += (held ? 1.6 : -1.4) * dt;
    s.barVel *= 0.92;
    s.bar += s.barVel * dt;
    if (s.bar < 0.1) { s.bar = 0.1; s.barVel = 0; }
    if (s.bar > 0.9) { s.bar = 0.9; s.barVel = 0; }
    const inside = Math.abs(s.fishPos - s.bar) < 0.13;
    s.prog += (inside ? 0.32 : -0.22 * f.wild) * dt;
    if (s.prog >= 1) {
      s.catches.push(f.id);
      s.msg = `Gefangen: ${f.name}!`; s.flash = 1.2;
      next(s);
    } else if (s.prog <= 0) miss(s, 'Die Schnur ist gerissen …');
  },

  result(s) {
    const n = s.catches.length;
    return {
      done: s.done && s.flash <= 0, score: n, max: CASTS, success: n >= 1, items: s.catches.filter((c) => c !== 'nothing'),
      text: n ? `Fang: ${s.catches.map((c) => FISH_NAMES[c] || c).join(', ')}.` : 'Heute beißt nichts an.',
    };
  },

  draw(s, ctx, W, H) {
    const p = brush(ctx);
    p('#9cc8e0', 0, 0, W, 50);
    p('#86b04f', 0, 40, W, 12);
    p('#3f7fb5', 0, 52, W, H - 52);
    for (let i = 0; i < 10; i++) p('#5d9bcc', ((i * 29 + s.wobble * 12) % W), 60 + (i % 5) * 18, 10, 1);
    p('#a58f66', 0, H - 26, 70, 26); p('#9a6b42', 0, H - 30, 74, 4);
    // Angelrute
    ctx.strokeStyle = '#6b4426'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(30, H - 30); ctx.lineTo(120, 64); ctx.stroke();
    const bob = s.phase === 'bite' ? 6 : Math.sin(s.wobble * 3) * 1.5;
    ctx.strokeStyle = '#e8e0cc'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(120, 64); ctx.lineTo(170, 96 + bob); ctx.stroke();
    p('#c0392b', 168, 92 + bob, 5, 4); p('#f4eedc', 168, 92 + bob, 5, 1);
    if (s.phase === 'bite') { ctx.fillStyle = '#fff3d6'; ctx.font = 'bold 18px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('!', 170, 84); }
    if (s.phase === 'reel') {
      const bx = W - 34, by = 58, bh = 92;
      p('#2b1d16', bx - 2, by - 2, 16, bh + 4); p('#4f6f8a', bx, by, 12, bh);
      const zone = 0.26 * bh;
      p('#5fae4c', bx, by + (1 - s.bar) * bh - zone / 2, 12, zone);
      p('#f2c14e', bx + 2, by + (1 - s.fishPos) * bh - 3, 8, 6);
      p('#2b1d16', bx - 10, by, 6, bh); p('#f2c14e', bx - 9, by + bh * (1 - s.prog), 4, bh * s.prog);
    }
    for (let i = 0; i < CASTS; i++) {
      const c = s.catches[i];
      p(c === undefined ? (i < s.cast ? '#a3392c' : '#5a6a7a') : '#5fae4c', 6 + i * 11, 6, 8, 8);
    }
    if (s.flash > 0) { ctx.fillStyle = '#fff3d6'; ctx.font = 'bold 12px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(s.msg, W / 2 - 20, 30); }
  },
};

const FISH = [
  { id: 'piscis', name: 'Weißfisch', wild: 0.8, w: 10, lvl: 0 },
  { id: 'anguilla', name: 'Aal', wild: 1.2, w: 5, lvl: 2 },
  { id: 'lupus', name: 'Wolfsbarsch (lupus Tiberinus)', wild: 1.6, w: 3, lvl: 4, spot: 'insula' },
  { id: 'calceus', name: 'alte Sandale', wild: 0.3, w: 1.2, lvl: 0 },
];
const FISH_NAMES = Object.fromEntries(FISH.map((f) => [f.id, f.name]));

function pickFish(opts) {
  const lvl = opts.level || 0;
  const pool = FISH.filter((f) => f.lvl <= lvl && (!f.spot || f.spot === opts.spot));
  let r = Math.random() * pool.reduce((a, f) => a + f.w, 0);
  for (const f of pool) { r -= f.w; if (r <= 0) return { ...f, wild: f.wild * (lvl >= 6 ? 0.8 : 1) }; }
  return pool[0];
}
function miss(s, msg) { s.msg = msg; s.flash = 1; s.catches.push(undefined); s.catches.length = s.cast + 1; next(s, true); }
function next(s) {
  s.cast++;
  s.phase = 'pause'; s.t = 0;
  if (s.cast >= CASTS) { s.done = true; s.catches = s.catches.filter((c) => c); }
}
