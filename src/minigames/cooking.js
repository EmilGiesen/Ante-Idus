// Minispiel „Kochen“: die Hitze im richtigen Bereich halten, während das Gericht gart
import { brush } from '../gfx/pixel.js';

const TIME = 12;

export const cooking = {
  title: 'Am Herd',
  hint: 'Halte Leertaste/E, um das Feuer anzufachen – lass los, damit es abkühlt. Bleib im grünen Bereich!',
  buttons: [{ label: 'Anfachen', action: 'action', hold: true }],

  init(opts) {
    return { t: 0, heat: 0.3, vel: 0, zone: 0.55, zoneV: 0, good: 0, done: false, label: opts.label || 'Gericht', flash: 0 };
  },

  update(s, dt, input, held) {
    if (s.done) { s.flash -= dt; return; }
    s.t += dt;
    s.zoneV += (Math.random() - 0.5) * 1.6 * dt;
    s.zoneV *= 0.97;
    s.zone = Math.max(0.3, Math.min(0.8, s.zone + s.zoneV * dt));
    s.vel += (held ? 0.9 : -0.7) * dt;
    s.vel *= 0.9;
    s.heat = Math.max(0, Math.min(1, s.heat + s.vel * dt));
    if (Math.abs(s.heat - s.zone) < 0.12) s.good += dt;
    if (s.t >= TIME) { s.done = true; s.flash = 0.6; }
  },

  result(s) {
    const q = s.good / TIME;
    const score = q > 0.75 ? 3 : q > 0.5 ? 2 : q > 0.25 ? 1 : 0;
    return {
      done: s.done && s.flash <= 0, score, max: 3, success: score >= 1, quality: score,
      text: ['Angebrannt …', 'Essbar.', 'Gut gelungen!', 'Ausgezeichnet – wie bei Apicius!'][score],
    };
  },

  draw(s, ctx, W, H) {
    const p = brush(ctx);
    p('#3a2618', 0, 0, W, H);
    p('#8d877a', 40, 100, 176, 60); p('#a9a294', 40, 100, 176, 4);
    const fl = 0.5 + s.heat * 0.8;
    for (let i = 0; i < 9; i++) {
      const h = Math.round((10 + Math.sin(s.t * 12 + i) * 4) * fl);
      p(i % 2 ? '#e8902a' : '#f4d24a', 70 + i * 13, 108 - h, 7, h);
    }
    p('#5a565c', 80, 62, 96, 40); p('#6e6a72', 80, 62, 96, 4); p('#2b1d16', 86, 66, 84, 6);
    p(s.heat > s.zone + 0.2 ? '#6a3a1a' : '#c9a03a', 88, 68, 80, 3);
    if (s.heat > 0.5) for (let i = 0; i < 4; i++) p('rgba(240,240,240,0.5)', 96 + i * 18, 52 - ((s.t * 20 + i * 7) % 16), 3, 3);
    // Hitzeskala
    const bx = 16, by = 20, bh = 120;
    p('#2b1d16', bx - 2, by - 2, 16, bh + 4); p('#5a4030', bx, by, 12, bh);
    p('#5fae4c', bx, by + (1 - s.zone - 0.12) * bh, 12, 0.24 * bh);
    p('#ffffff', bx - 3, by + (1 - s.heat) * bh - 1, 18, 3);
    p('#2b1d16', 40, 10, 176, 6); p('#f2c14e', 41, 11, Math.round(174 * Math.min(1, s.t / TIME)), 4);
    ctx.fillStyle = '#fff3d6'; ctx.font = '10px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(s.label, W / 2 + 10, 32);
  },
};
