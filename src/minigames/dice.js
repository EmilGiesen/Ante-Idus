// Minispiel „Würfeln mit Tali“: vier Knöchel mit den Werten 1, 3, 4, 6.
// Venuswurf (alle verschieden) schlägt alles, „Hund“ (alle 1) verliert immer, sonst zählt die Summe.
import { brush } from '../gfx/pixel.js';
import { shortMoney } from '../core/util.js';

const FACES = [1, 3, 4, 6];
const ROUNDS = 3;

const roll = (luck) => {
  const r = () => FACES[Math.floor(Math.random() * 4)];
  let t = [r(), r(), r(), r()];
  if (luck && Math.random() < luck) { const t2 = [r(), r(), r(), r()]; if (value(t2) > value(t)) t = t2; }
  return t;
};
const isVenus = (t) => new Set(t).size === 4;
const isDog = (t) => t.every((v) => v === 1);
const value = (t) => (isVenus(t) ? 100 : isDog(t) ? -1 : t.reduce((a, b) => a + b, 0));
const label = (t) => (isVenus(t) ? 'Venuswurf!' : isDog(t) ? 'Hund!' : `Summe ${t.reduce((a, b) => a + b, 0)}`);

export const dice = {
  title: 'Würfeln mit Tali',
  hint: '←/→ Einsatz wählen, Leertaste/E werfen. Venuswurf (1-3-4-6) schlägt alles, vier Einsen („Hund“) verlieren.',
  buttons: [{ label: '−', action: 'left' }, { label: '+', action: 'right' }, { label: 'Werfen', action: 'action' }],

  init(opts) {
    const maxStake = Math.max(1, Math.min(8, opts.money || 1));
    return { round: 0, stake: Math.min(2, maxStake), maxStake, money: opts.money || 0, net: 0, phase: 'bet', t: 0, me: null, them: null, msg: '', done: false, luck: opts.luck || 0, log: [] };
  },

  update(s, dt, input) {
    s.t += dt;
    if (s.done) return;
    if (s.phase === 'bet') {
      const limit = Math.min(s.maxStake, s.money + s.net);
      if (input.wasPressed('left')) s.stake = Math.max(1, s.stake - 1);
      if (input.wasPressed('right')) s.stake = Math.min(limit, s.stake + 1);
      s.stake = Math.min(s.stake, Math.max(1, limit));
      if (input.confirmPressed()) { s.phase = 'roll'; s.t = 0; s.them = roll(0); s.me = roll(s.luck); }
      return;
    }
    if (s.phase === 'roll' && s.t > 1.4) {
      const a = value(s.me), b = value(s.them);
      if (a === b) { s.msg = 'Gleichstand – noch einmal!'; s.phase = 'bet'; s.t = 0; return; }
      const win = a > b;
      s.net += win ? s.stake : -s.stake;
      s.msg = `${win ? 'Gewonnen' : 'Verloren'}: ${shortMoney(s.stake)}`;
      s.log.push(win);
      s.round++;
      s.phase = 'show'; s.t = 0;
    }
    if (s.phase === 'show' && (s.t > 1.6 || input.confirmPressed())) {
      if (s.round >= ROUNDS || s.money + s.net <= 0) { s.done = true; s.t = 0; } else { s.phase = 'bet'; s.msg = ''; }
    }
  },

  result(s) {
    return {
      done: s.done && s.t > 0.5, net: s.net, score: s.log.filter(Boolean).length, max: ROUNDS, success: s.net > 0,
      text: s.net > 0 ? `Du hast ${shortMoney(s.net)} gewonnen.` : s.net < 0 ? `Du hast ${shortMoney(-s.net)} verloren.` : 'Plus minus null.',
    };
  },

  draw(s, ctx, W, H) {
    const p = brush(ctx);
    p('#5a3a22', 0, 0, W, H);
    p('#8a5a32', 20, 30, W - 40, 100); p('#a8743f', 20, 30, W - 40, 4); p('#6b4426', 20, 126, W - 40, 4);
    const drawSet = (t, y, rolling) => {
      for (let i = 0; i < 4; i++) {
        const v = rolling ? FACES[Math.floor((s.t * 20 + i * 3) % 4)] : t[i];
        const x = 76 + i * 28;
        p('#f0e6d0', x, y, 22, 18); p('#d8cfb4', x, y + 14, 22, 4); p('#3b2416', x + 2, y + 2, 1, 1);
        ctx.fillStyle = '#3b2416'; ctx.font = 'bold 11px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(String(v), x + 11, y + 13);
      }
    };
    ctx.fillStyle = '#f4eedc'; ctx.font = '10px Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText('Gegner', 26, 52); ctx.fillText('Du', 26, 102);
    if (s.them) drawSet(s.them, 40, s.phase === 'roll' && s.t < 0.9);
    if (s.me) drawSet(s.me, 90, s.phase === 'roll' && s.t < 1.2);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff3d6';
    if (s.them && s.phase !== 'roll') ctx.fillText(label(s.them), 192, 52);
    if (s.me && s.phase !== 'roll') ctx.fillText(label(s.me), 192, 102);
    ctx.textAlign = 'left'; ctx.fillStyle = '#f2c14e';
    ctx.fillText(`Runde ${Math.min(ROUNDS, s.round + 1)}/${ROUNDS} · Einsatz: ${shortMoney(s.stake)} · Bilanz: ${s.net >= 0 ? '+' : '−'}${shortMoney(Math.abs(s.net))}`, 10, 16);
    if (s.msg) { ctx.fillStyle = '#fff3d6'; ctx.font = 'bold 12px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(s.msg, W / 2, 148); }
  },
};
