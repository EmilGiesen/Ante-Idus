// Minispiel „Auf der Baustelle“: Steinblöcke vom Kran passgenau auf die Mauer setzen
import { brush } from '../gfx/pixel.js';

const BLOCKS = 6, BW = 64, BH = 14, BASE_Y = 140;

export const build = {
  title: 'Auf der Baustelle helfen',
  hint: 'Der Kran schwenkt den Block hin und her – lass ihn mit Leertaste / E / Tippen genau über der Mauer los.',
  buttons: [{ label: 'Absetzen', action: 'action' }],

  init() {
    return { placed: [], x: 0, dir: 1, speed: 70, t: 0, fall: null, done: false, msg: '', flash: 0, score: 0, w: BW };
  },

  update(s, dt, input) {
    s.t += dt;
    if (s.flash > 0) s.flash -= dt;
    if (s.done) return;
    if (s.fall) {
      s.fall.y += 260 * dt;
      const targetY = BASE_Y - (s.placed.length + 1) * BH;
      if (s.fall.y >= targetY) landBlock(s);
      return;
    }
    s.x += s.dir * s.speed * dt;
    if (s.x < 20) { s.x = 20; s.dir = 1; }
    if (s.x + s.w > 236) { s.x = 236 - s.w; s.dir = -1; }
    if (input.confirmPressed()) s.fall = { x: s.x, y: 30, w: s.w };
  },

  result(s) {
    const score = Math.round(s.score);
    return {
      done: s.done && s.flash <= 0, score, max: BLOCKS, success: score >= 4,
      text: `${s.placed.length} Blöcke gesetzt – Passgenauigkeit ${Math.round((s.score / BLOCKS) * 100)} %.`,
    };
  },

  draw(s, ctx, W, H) {
    const p = brush(ctx);
    p('#a8d0e8', 0, 0, W, H);
    p('#c8a46e', 0, BASE_Y, W, H - BASE_Y);
    // Gerüst im Hintergrund
    for (let x = 30; x < W; x += 40) p('#9a7a52', x, 40, 3, BASE_Y - 40);
    for (let y = 60; y < BASE_Y; y += 26) p('#b08a5a', 20, y, W - 40, 2);
    // Fundament
    p('#8d877a', 96, BASE_Y, BW, 4);
    // gesetzte Blöcke
    s.placed.forEach((b, i) => stone(p, b.x, BASE_Y - (i + 1) * BH, b.w));
    // Kranarm und Seil
    p('#6b4a2e', 0, 14, W, 4);
    const bx = s.fall ? s.fall.x : s.x;
    if (!s.fall) { p('#d8d0c0', bx + s.w / 2, 18, 1, 14); stone(p, bx, 32, s.w); }
    else stone(p, s.fall.x, s.fall.y, s.fall.w);
    ctx.fillStyle = '#3b2416'; ctx.font = '10px Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText(`Block ${Math.min(BLOCKS, s.placed.length + 1)} / ${BLOCKS}`, 8, 12);
    if (s.flash > 0) { ctx.fillStyle = '#3b2416'; ctx.font = 'bold 12px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(s.msg, W / 2, 56); }
  },
};

function stone(p, x, y, w) {
  x = Math.round(x); y = Math.round(y);
  p('#a99f8c', x, y, w, BH); p('#c9c2b2', x, y, w, 3); p('#8d877a', x, y + BH - 2, w, 2);
  for (let i = 16; i < w; i += 16) p('#8d877a', x + i, y + 3, 1, BH - 5);
}

function landBlock(s) {
  const below = s.placed.length ? s.placed[s.placed.length - 1] : { x: 96, w: BW };
  const l = Math.max(below.x, s.fall.x), r = Math.min(below.x + below.w, s.fall.x + s.fall.w);
  const overlap = Math.max(0, r - l);
  const frac = overlap / BW;
  s.fall = null;
  if (overlap < 6) {
    s.msg = 'Daneben!'; s.flash = 0.9;
    s.placed.push({ x: below.x, w: below.w });
  } else {
    s.placed.push({ x: l, w: overlap });
    s.score += Math.min(1, frac / 0.92);
    s.msg = frac > 0.9 ? 'Passt genau!' : frac > 0.6 ? 'Gut gesetzt.' : 'Wackelig …'; s.flash = 0.7;
  }
  s.w = BW;
  s.speed += 16;
  if (s.placed.length >= BLOCKS) s.done = true;
}
