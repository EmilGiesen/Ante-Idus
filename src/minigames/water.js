// Minispiel „Wasser schöpfen“: Krug am Brunnen füllen und rechtzeitig loslassen
import { brush } from '../gfx/pixel.js';

const JARS = 3;

export const water = {
  title: 'Wasser am Lacus schöpfen',
  hint: 'Halte Leertaste / E / Finger gedrückt, um zu füllen – lass im grünen Bereich los',

  init() {
    return { i: 0, level: 0, holding: false, results: [], band: newBand(0), t: 0, wait: 0.4, msg: '', flash: 0, done: false, spill: 0 };
  },

  update(s, dt, input, held) {
    s.t += dt;
    if (s.flash > 0) s.flash -= dt;
    if (s.spill > 0) s.spill -= dt;
    if (s.done) return;
    if (s.wait > 0) { s.wait -= dt; if (held) s.blockHold = true; return; }
    if (s.blockHold) { if (!held) s.blockHold = false; return; }
    if (held) {
      s.level += dt * (0.36 + s.i * 0.08);
      s.holding = true;
      if (s.level > 1.06) { s.spill = 0.5; finish(s, 0, 'Übergelaufen!'); }
      return;
    }
    if (s.holding) {
      const ok = s.level >= s.band[0] && s.level <= s.band[1];
      finish(s, ok ? 2 : 1, ok ? 'Genau richtig!' : s.level < s.band[0] ? 'Zu wenig …' : 'Etwas zu voll.');
    }
  },

  result(s) {
    const good = s.results.filter((q) => q === 2).length;
    return {
      done: s.done && s.flash <= 0,
      score: good, max: JARS, success: good >= 1,
      pay: good,
      text: `${good} von ${JARS} Krügen perfekt gefüllt.`,
    };
  },

  draw(s, ctx, W, H) {
    const p = brush(ctx);
    p('#7fae4c', 0, 0, W, H);
    p('#cfc6ae', 0, H - 40, W, 40);
    // Brunnenstele mit Speier
    p('#cfc6ae', W / 2 - 50, 10, 30, 70); p('#e4dcc6', W / 2 - 50, 10, 30, 4);
    p('#6f8f6a', W / 2 - 42, 30, 14, 10); p('#3a3a3a', W / 2 - 37, 38, 5, 3);
    // Becken
    p('#b8ae96', W / 2 - 80, 80, 110, 34); p('#e4dcc6', W / 2 - 80, 80, 110, 4); p('#4f8fc0', W / 2 - 74, 88, 98, 20);
    // Wasserstrahl
    if (s.holding) {
      p('#8cc0e3', W / 2 - 36, 41, 4, 30);
      p('#d8eef5', W / 2 - 35, 41, 1, 30);
    } else p('#8cc0e3', W / 2 - 35, 41, 2, 40);
    // Krug (Hydria)
    const jx = W / 2 + 40, jy = 48, jw = 34, jh = 64;
    p('#8a4a2a', jx - 2, jy - 2, jw + 4, jh + 4);
    p('#b0603a', jx, jy, jw, jh);
    const fill = Math.min(1, s.level);
    p('#4f8fc0', jx + 3, jy + 3 + (jh - 6) * (1 - fill), jw - 6, (jh - 6) * fill);
    p('#79b2dc', jx + 3, jy + 3 + (jh - 6) * (1 - fill), jw - 6, 2);
    // Zielbereich
    const y0 = jy + 3 + (jh - 6) * (1 - s.band[1]), y1 = jy + 3 + (jh - 6) * (1 - s.band[0]);
    p('rgba(90,220,90,0.35)', jx + 3, y0, jw - 6, y1 - y0);
    p('#5fdc5f', jx - 6, y0, 4, y1 - y0);
    if (s.holding) { p('#8cc0e3', W / 2 - 34, 71, 74, 3); }
    if (s.spill > 0) for (let i = 0; i < 6; i++) p('#79b2dc', jx - 4 + i * 8, jy - 4 + (i % 2) * 3, 3, 3);
    for (let i = 0; i < JARS; i++) {
      const q = s.results[i];
      p(q === undefined ? '#5a6a4a' : ['#a3392c', '#c9a03a', '#5fae4c'][q], 10 + i * 12, 8, 9, 9);
    }
    if (s.flash > 0) {
      ctx.fillStyle = '#2b1b12';
      ctx.font = 'bold 12px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.msg, W / 2, H - 14);
    }
  },
};

function finish(s, q, msg) {
  s.holding = false;
  s.results.push(q);
  s.msg = msg;
  s.flash = 0.8;
  s.i++;
  s.level = 0;
  s.band = newBand(s.i);
  s.wait = 0.8;
  if (s.i >= JARS) s.done = true;
}

function newBand(i) {
  const size = 0.16 - i * 0.03;
  const lo = 0.62 + Math.random() * (0.3 - size);
  return [lo, lo + size];
}
