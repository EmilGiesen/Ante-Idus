// Minispiel „Lasten tragen“: Amphore auf der Schulter im Gleichgewicht halten (←/→)
import { brush, shade } from '../gfx/pixel.js';

const TRIPS = 4, TRIP_TIME = 6, LIMIT = 1;

export const carry = {
  title: 'Lasten tragen am Emporium',
  hint: 'Halte die Amphore mit ←/→ (oder den Knöpfen) im Gleichgewicht, bis du die Lagerhalle erreichst.',
  buttons: [{ label: '◀', action: 'left', hold: true }, { label: '▶', action: 'right', hold: true }],

  init(opts) {
    return { trip: 0, t: 0, th: 0, om: 0, gust: 0, maxTh: 0, results: [], wait: 0.8, msg: '', flash: 0, done: false, walk: 0, steadier: opts.steadier || 0 };
  },

  update(s, dt, input) {
    s.walk += dt;
    if (s.flash > 0) s.flash -= dt;
    if (s.done) return;
    if (s.wait > 0) { s.wait -= dt; return; }
    s.t += dt;
    // Unebener Kai: zufällige Stöße, die sich langsam ändern
    s.gust += (Math.random() - 0.5) * 6 * dt;
    s.gust = Math.max(-1.6, Math.min(1.6, s.gust * 0.98));
    let ctrl = 0;
    if (input.isDown('left')) ctrl -= 4.2;
    if (input.isDown('right')) ctrl += 4.2;
    s.om += ((2.1 - s.steadier) * s.th + s.gust + ctrl) * dt;
    s.om *= 1 - 0.9 * dt;
    s.th += s.om * dt;
    s.maxTh = Math.max(s.maxTh, Math.abs(s.th));
    if (Math.abs(s.th) > LIMIT) return endTrip(s, 0, 'Abgerutscht! Die Amphore ist hin.');
    if (s.t >= TRIP_TIME) endTrip(s, s.maxTh < LIMIT * 0.5 ? 1.5 : 1, s.maxTh < LIMIT * 0.5 ? 'Ruhig und sicher abgeliefert!' : 'Abgeliefert.');
  },

  result(s) {
    const score = Math.round(s.results.reduce((a, b) => a + b, 0));
    return {
      done: s.done && s.flash <= 0, score, max: TRIPS * 1.5, success: s.results.filter((r) => r > 0).length >= 3,
      text: `${s.results.filter((r) => r > 0).length} von ${TRIPS} Ladungen abgeliefert.`,
    };
  },

  draw(s, ctx, W, H) {
    const p = brush(ctx);
    p('#8cc0e3', 0, 0, W, 70);
    p('#4f8fc0', 0, 70, W, 30);
    for (let i = 0; i < 8; i++) p('#79b2dc', ((i * 37 - s.walk * 20) % W + W) % W, 76 + (i % 3) * 7, 12, 1);
    p('#9a6b42', 0, 100, W, 60);
    for (let i = -1; i < 12; i++) { const x = Math.round(i * 24 - ((s.walk * 40) % 24)); p('#7f5634', x, 100, 1, 60); }
    p('#b8844f', 0, 100, W, 3);
    // Lagerhalle rechts, kommt mit Fortschritt näher
    const prog = s.wait > 0 ? 0 : Math.min(1, s.t / TRIP_TIME);
    const hx = Math.round(W - 30 + (1 - prog) * 60);
    p('#a65a3c', hx, 40, 80, 62); p('#9c4a2e', hx - 4, 32, 88, 10); p('#3a2618', hx + 10, 70, 18, 32);
    // Träger
    const cx = 90, cy = 100, bob = Math.round(Math.sin(s.walk * 10) * 1.5);
    p('#6b4426', cx - 5, cy - 14 + bob, 4, 14); p('#6b4426', cx + 2, cy - 14 - bob, 4, 14);
    p('#8c7a5c', cx - 7, cy - 34 + bob, 15, 22);
    p('#d9a47a', cx - 5, cy - 46 + bob, 11, 12); p('#2b1d14', cx - 5, cy - 46 + bob, 11, 3);
    // Amphore auf der Schulter, kippt mit dem Gleichgewicht
    ctx.save();
    ctx.translate(cx + 6, cy - 34 + bob);
    ctx.rotate(s.th * 0.9);
    const danger = Math.abs(s.th) / LIMIT;
    const col = danger > 0.75 ? '#c0503a' : '#b0603a';
    ctx.fillStyle = shade(col, -0.25); ctx.fillRect(-2, -20, 5, 3); ctx.fillRect(-5, -18, 2, 5); ctx.fillRect(4, -18, 2, 5);
    ctx.fillStyle = col; ctx.fillRect(-4, -17, 9, 13); ctx.fillRect(-2, -4, 5, 4);
    ctx.fillStyle = shade(col, 0.25); ctx.fillRect(-3, -15, 2, 9);
    ctx.restore();
    // Gleichgewichtsanzeige
    p('#3b2416', 40, 10, W - 80, 10);
    p('#5fae4c', W / 2 - (W - 84) * 0.25, 12, (W - 84) * 0.5, 6);
    p('#c9a03a', 42, 12, (W - 84) * 0.25, 6); p('#c9a03a', W / 2 + (W - 84) * 0.25, 12, (W - 84) * 0.25 - 2, 6);
    p('#ffffff', Math.round(W / 2 + (s.th / LIMIT) * (W - 84) / 2) - 1, 8, 3, 14);
    // Fortschritt der Ladung
    p('#3b2416', 40, 24, W - 80, 4); p('#f2c14e', 41, 25, Math.round((W - 82) * prog), 2);
    for (let i = 0; i < TRIPS; i++) {
      const r = s.results[i];
      p(r === undefined ? '#5a4030' : r === 0 ? '#a3392c' : r > 1 ? '#5fae4c' : '#c9a03a', 6 + i * 11, 36, 8, 8);
    }
    if (s.flash > 0) {
      ctx.fillStyle = '#fff3d6'; ctx.font = 'bold 12px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText(s.msg, W / 2, 140);
    }
  },
};

function endTrip(s, val, msg) {
  s.results.push(val);
  s.msg = msg; s.flash = 1;
  s.trip++; s.t = 0; s.th = (Math.random() - 0.5) * 0.1; s.om = 0; s.gust = 0; s.maxTh = 0; s.wait = 0.9;
  if (s.trip >= TRIPS) s.done = true;
}
