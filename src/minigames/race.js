// Minispiel „Wagenrennen“: Gespann und Einsatz wählen, dann sieben Runden zusehen (und anfeuern)
import { brush } from '../gfx/pixel.js';
import { mulberry32 } from '../core/rng.js';
import { shortMoney } from '../core/util.js';

const LAPS = 7;
const RACE_TIME = 18;

// Teilnehmer des Tages (aus dem Spieltag abgeleitet, damit Quoten am selben Tag gleich bleiben)
export function raceField(day) {
  const rng = mulberry32(day * 977 + 13);
  const base = [
    { name: 'Thallus', team: 'Rot', col: '#c0392b' }, { name: 'Eutyches', team: 'Rot', col: '#e0604a' },
    { name: 'Crescens', team: 'Weiß', col: '#f0ece0' }, { name: 'Ionius', team: 'Weiß', col: '#c8c0b0' },
  ];
  const field = base.map((c) => ({ ...c, form: 0.7 + rng() * 0.6 }));
  const sum = field.reduce((a, c) => a + c.form, 0);
  for (const c of field) c.odds = Math.max(1.3, Math.round((0.88 / (c.form / sum)) * 10) / 10);
  return field;
}

export const race = {
  title: 'Wagenrennen im Circus Maximus',
  hint: '←/→ Gespann wählen, ↑/↓ Einsatz, E wetten. Im Rennen: Leertaste drücken, um dein Gespann anzufeuern.',
  buttons: [{ label: '◀', action: 'left' }, { label: '▶', action: 'right' }, { label: '+', action: 'up' }, { label: '−', action: 'down' }, { label: 'Wetten / Anfeuern', action: 'action' }],

  init(opts) {
    const field = raceField(opts.day || 0);
    const maxStake = Math.max(1, Math.min(32, opts.money || 1));
    return { field, pick: 0, stake: Math.min(4, maxStake), maxStake, phase: 'bet', t: 0, pos: field.map(() => 0), cheer: 0, winner: -1, net: 0, done: false, luck: opts.luck || 0, endT: 0 };
  },

  update(s, dt, input) {
    s.t += dt;
    if (s.phase === 'bet') {
      if (input.wasPressed('left')) s.pick = (s.pick + 3) % 4;
      if (input.wasPressed('right')) s.pick = (s.pick + 1) % 4;
      if (input.wasPressed('up')) s.stake = Math.min(s.maxStake, s.stake + 1);
      if (input.wasPressed('down')) s.stake = Math.max(1, s.stake - 1);
      if (input.confirmPressed()) { s.phase = 'race'; s.t = 0; }
      return;
    }
    if (s.phase === 'race') {
      if (input.confirmPressed() && s.cheer < 6) s.cheer++;
      for (let i = 0; i < 4; i++) {
        const c = s.field[i];
        let v = (LAPS / RACE_TIME) * (0.85 + c.form * 0.2 + (Math.random() - 0.5) * 0.9);
        if (i === s.pick) v *= 1 + s.cheer * 0.004 + s.luck * 0.05;
        s.pos[i] += v * dt;
      }
      const lead = s.pos.indexOf(Math.max(...s.pos));
      if (s.pos[lead] >= LAPS) {
        s.winner = lead;
        s.net = lead === s.pick ? Math.round(s.stake * (s.field[lead].odds - 1)) : -s.stake;
        s.phase = 'end'; s.done = true;
      }
      return;
    }
    s.endT += dt;
  },

  result(s) {
    const w = s.field[s.winner];
    return {
      done: s.done && s.endT > 1.8, net: s.net, success: s.net > 0, score: s.net > 0 ? 1 : 0, max: 1,
      text: w ? `${w.name} (${w.team}) gewinnt! ${s.net > 0 ? `Du gewinnst ${shortMoney(s.net)}.` : `Dein Einsatz von ${shortMoney(-s.net)} ist verloren.`}` : '',
    };
  },

  draw(s, ctx, W, H) {
    const p = brush(ctx);
    p('#c8a878', 0, 0, W, H);
    p('#e3c98d', 16, 30, W - 32, 110);
    p('#d8cfb4', 50, 80, W - 100, 10); p('#c9a24a', 46, 78, 6, 14); p('#c9a24a', W - 52, 78, 6, 14);
    // Eier als Rundenzähler
    const lap = Math.min(LAPS, Math.floor(Math.max(...s.pos)));
    for (let i = 0; i < LAPS; i++) p(i < LAPS - lap ? '#f4eedc' : '#8a7a5a', 100 + i * 8, 82, 5, 6);
    ctx.font = '10px Georgia, serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#3b2416';
    if (s.phase === 'bet') {
      ctx.fillText(`Einsatz: ${shortMoney(s.stake)} – wähle dein Gespann:`, 12, 14);
      s.field.forEach((c, i) => {
        const y = 38 + i * 24;
        p(i === s.pick ? '#f2c14e' : '#a8875a', 24, y - 2, W - 48, 20);
        p(c.col, 30, y + 2, 12, 12);
        ctx.fillStyle = '#3b2416';
        ctx.fillText(`${c.name} (${c.team}) – Quote ${c.odds.toFixed(1)}`, 48, y + 12);
      });
      return;
    }
    // Ovalbahn: Position → Koordinaten
    const cx = W / 2, cy = 85, rx = 98, ry = 40;
    s.field.forEach((c, i) => {
      const a = (s.pos[i] % 1) * Math.PI * 2 - Math.PI / 2;
      const off = (i - 1.5) * 4;
      const x = Math.round(cx + Math.cos(a) * (rx + off)), y = Math.round(cy + Math.sin(a) * (ry + off * 0.5));
      p('#3b2416', x - 4, y - 3, 9, 7); p(c.col, x - 3, y - 2, 7, 5);
      if (i === s.pick) p('#f2c14e', x - 1, y - 6, 3, 2);
    });
    ctx.fillStyle = '#3b2416';
    ctx.fillText(`Runde ${Math.min(LAPS, lap + 1)}/${LAPS} · Dein Gespann: ${s.field[s.pick].name}`, 12, 14);
    if (s.cheer) ctx.fillText(`Anfeuern: ${'!'.repeat(s.cheer)}`, 12, 26);
    if (s.phase === 'end') {
      const w = s.field[s.winner];
      ctx.textAlign = 'center'; ctx.font = 'bold 12px Georgia, serif';
      ctx.fillText(`${w.name} (${w.team}) siegt!`, W / 2, 150);
    }
  },
};
