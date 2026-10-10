// Minispiel „Brot backen“: Brote im richtigen Moment aus dem Ofen holen (Timing)
import { brush, shade, mix } from '../gfx/pixel.js';

const LOAVES = 6;

export const baking = {
  title: 'Brot backen im Pistrinum',
  hint: 'Hol jedes Brot heraus, wenn es goldbraun ist: Leertaste / E / Tippen',

  init(opts) {
    return { i: 0, p: 0, speed: 0.4, results: [], flash: 0, msg: '', t: 0, done: false, wait: 0.6 };
  },

  update(s, dt, input) {
    s.t += dt;
    if (s.flash > 0) s.flash -= dt;
    if (s.done) return;
    if (s.wait > 0) {
      s.wait -= dt;
      if (s.wait <= 0) { s.p = 0; s.speed = 0.32 + Math.random() * 0.28 + s.i * 0.02; }
      return;
    }
    s.p += s.speed * dt;
    if (input.confirmPressed() || s.p > 1.15) {
      const q = s.p > 1.15 ? 0 : rate(s.p);
      s.lastP = s.p;
      s.results.push(q);
      s.msg = ['Verbrannt oder roh!', 'Gut!', 'Perfekt goldbraun!'][q];
      s.flash = 0.6;
      s.i++;
      s.wait = 0.7;
      if (s.i >= LOAVES) { s.done = true; s.wait = 0; }
    }
  },

  result(s) {
    const perfect = s.results.filter((q) => q === 2).length;
    const good = s.results.filter((q) => q === 1).length;
    const pay = perfect * 4 + good * 2;
    const success = perfect + good >= 4;
    return {
      done: s.done && s.flash <= 0,
      score: perfect * 2 + good, max: LOAVES * 2, pay, success,
      text: `${perfect} perfekt, ${good} gut, ${LOAVES - perfect - good} misslungen.`,
    };
  },

  draw(s, ctx, W, H) {
    const p = brush(ctx);
    p('#3a2618', 0, 0, W, H);
    // Ofenkuppel
    for (let i = 0; i < 70; i++) {
      const w = Math.round(90 * Math.sqrt(1 - ((70 - i) / 70) ** 2));
      p(i % 6 ? '#b8a890' : '#a09078', W / 2 - w, 20 + i, w * 2, 1);
    }
    p('#a09078', W / 2 - 90, 90, 180, 30);
    p('#1a100a', W / 2 - 40, 56, 80, 44);
    for (let i = 0; i < 10; i++) {
      const w = Math.round(40 * Math.sqrt(1 - ((10 - i) / 10) ** 2));
      p('#1a100a', W / 2 - w, 46 + i, w * 2, 1);
    }
    const glow = 0.5 + 0.2 * Math.sin(s.t * 6);
    p(`rgba(255,140,40,${glow * 0.5})`, W / 2 - 36, 84, 72, 14);
    p('#e8902a', W / 2 - 30, 92, 8, 4); p('#f4d24a', W / 2 + 14, 93, 6, 3);
    // Brot
    if (!s.done && s.wait <= 0) drawLoaf(p, W / 2, 80, s.p);
    else if (s.results.length) drawLoaf(p, W / 2, 124, s.lastP);
    // Bräunungsleiste
    const bx = 28, by = H - 22, bw = W - 56;
    for (let i = 0; i < bw; i++) p(loafColor((i / bw) * 1.15), bx + i, by, 1, 8);
    p('rgba(255,255,255,0.75)', bx + bw * (0.6 / 1.15), by - 3, 1, 14);
    p('rgba(255,255,255,0.75)', bx + bw * (0.8 / 1.15), by - 3, 1, 14);
    if (!s.done && s.wait <= 0) { p('#ffffff', bx + Math.min(bw - 2, bw * (s.p / 1.15)) - 1, by - 4, 3, 16); }
    // Ergebnisse
    for (let i = 0; i < LOAVES; i++) {
      const q = s.results[i];
      p(q === undefined ? '#5a4030' : ['#a3392c', '#c9a03a', '#5fae4c'][q], 10 + i * 12, 8, 9, 9);
    }
    if (s.flash > 0) {
      ctx.fillStyle = '#fff3d6';
      ctx.font = 'bold 12px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.msg, W / 2, 40);
    }
  },
};

function rate(p) {
  if (p >= 0.6 && p <= 0.8) return 2;
  if (p >= 0.48 && p <= 0.92) return 1;
  return 0;
}

function loafColor(p) {
  if (p < 0.4) return mix('#efe0c0', '#e8c890', p / 0.4);
  if (p < 0.7) return mix('#e8c890', '#d0903a', (p - 0.4) / 0.3);
  if (p < 0.9) return mix('#d0903a', '#8a5228', (p - 0.7) / 0.2);
  return mix('#8a5228', '#2a1a10', Math.min(1, (p - 0.9) / 0.25));
}

function drawLoaf(p, cx, cy, prog) {
  const c = loafColor(prog);
  for (let dy = -10; dy <= 10; dy++) {
    const w = Math.round(16 * Math.sqrt(1 - (dy / 11) ** 2));
    p(dy < -4 ? shade(c, 0.12) : c, cx - w, cy + dy, w * 2, 1);
  }
  const line = shade(c, -0.35);
  p(line, cx - 1, cy - 10, 2, 21);
  p(line, cx - 16, cy - 1, 32, 2);
  for (let i = -8; i <= 8; i += 2) { p(line, cx + i, cy + i, 1, 1); p(line, cx + i, cy - i, 1, 1); }
}
