// Minispiel „Feilschen“: Angebot machen, Geduld des Händlers im Blick behalten
import { brush } from '../gfx/pixel.js';
import { getPortrait } from '../gfx/sprites.js';
import { shortMoney } from '../core/util.js';

export const haggle = {
  title: 'Feilschen auf dem Markt',
  hint: '←/→ Angebot ändern · E anbieten · 1 Kompliment · 2 so tun, als ob du gehst',
  buttons: [
    { label: '−', action: 'left' }, { label: '+', action: 'right' }, { label: 'Anbieten', action: 'interact' },
    { label: 'Kompliment', action: 'opt1' }, { label: 'Gehen?', action: 'opt2' },
  ],

  init(opts) {
    const fair = opts.fair || 12;
    return {
      fair, item: opts.label || 'Ware', ask: Math.round(fair * 1.6) + 1, min: Math.max(1, Math.round(fair * (0.72 + Math.random() * 0.14))),
      offer: Math.max(1, Math.round(fair * 0.6)), mood: 100, log: [`„${opts.greeting || 'Salve! Beste Ware, ganz frisch!'}“`, `Er verlangt ${shortMoney(Math.round(fair * 1.6) + 1)}.`],
      complimented: false, bluffed: false, done: false, price: null, t: 0, npcApp: opts.app, endT: 0, patience: opts.patience || 1,
    };
  },

  update(s, dt, input) {
    s.t += dt;
    if (s.done) { s.endT += dt; return; }
    if (input.wasPressed('left')) s.offer = Math.max(1, s.offer - 1);
    if (input.wasPressed('right')) s.offer = Math.min(s.ask, s.offer + 1);
    if (input.wasPressed('opt1') && !s.complimented) {
      s.complimented = true;
      s.mood = Math.min(100, s.mood + 20);
      s.ask = Math.max(s.min, s.ask - 1);
      say(s, 'Du lobst seine Ware.', '„Du hast ein gutes Auge, Freund!“');
    }
    if (input.wasPressed('opt2') && !s.bluffed) {
      s.bluffed = true;
      if (Math.random() < 0.55) { s.ask = Math.max(s.min, Math.round((s.ask + s.offer) / 2)); say(s, 'Du wendest dich ab …', `„Warte, warte! ${shortMoney(s.ask)}, mein letztes Wort!“`); }
      else { s.mood -= 30; say(s, 'Du wendest dich ab …', '„Dann geh doch! Andere zahlen gern.“'); }
    }
    if (input.wasPressed('interact') || input.wasPressed('confirm') || input.wasPressed('action')) {
      const o = s.offer;
      if (o >= s.ask || s.ask - o <= 1) return deal(s, Math.min(o + (s.ask - o > 0 ? 1 : 0), s.ask), '„Abgemacht!“');
      const ratio = o / s.fair;
      s.mood -= (ratio < 0.5 ? 34 : ratio < 0.7 ? 18 : 9) * s.patience;
      if (o >= s.min && Math.random() < 0.35 + s.mood / 200) return deal(s, o, '„Na gut – bei Merkur, abgemacht!“');
      s.ask = Math.max(s.min, Math.round(s.ask - (s.ask - o) * 0.35 - 1));
      say(s, `Du bietest ${shortMoney(o)}.`, ratio < 0.5 ? '„Willst du mich ruinieren?!“' : `„${shortMoney(s.ask)}. Weniger geht nicht.“`);
    }
    if (s.mood <= 0 && !s.done) deal(s, s.ask, '„Genug! Zahl den Preis oder geh.“ Du zahlst.');
  },

  result(s) {
    return {
      done: s.done && s.endT > 1.2, price: s.price, fair: s.fair, saved: s.fair - s.price,
      success: s.price <= s.fair, score: Math.max(0, s.fair - s.price), max: s.fair,
      text: `Preis: ${shortMoney(s.price)} (üblich wären etwa ${shortMoney(s.fair)}).`,
    };
  },

  draw(s, ctx, W, H) {
    const p = brush(ctx);
    p('#e8dcc0', 0, 0, W, H);
    p('#c0392b', 0, 0, W, 10);
    for (let i = 0; i < W; i += 16) p('#f0e6d0', i + 8, 0, 8, 10);
    if (s.npcApp) ctx.drawImage(getPortrait(s.npcApp), 8, 16, 48, 45);
    ctx.fillStyle = '#3b2416';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(s.item, 64, 26);
    ctx.font = '10px Georgia, serif';
    ctx.fillText(`Forderung: ${shortMoney(s.ask)}`, 64, 42);
    ctx.fillText(`Dein Angebot: ${shortMoney(s.offer)}`, 64, 56);
    ctx.fillText('Geduld:', 64, 70);
    p('#8a6a44', 104, 63, 102, 9);
    p(s.mood > 50 ? '#5fae4c' : s.mood > 25 ? '#c9a03a' : '#a3392c', 105, 64, Math.max(0, s.mood), 7);
    ctx.fillStyle = '#5a3a22';
    ctx.font = 'italic 10px Georgia, serif';
    s.log.slice(-4).forEach((l, i) => ctx.fillText(l, 10, 92 + i * 14, W - 20));
  },
};

function say(s, a, b) { s.log.push(a, b); }
function deal(s, price, line) { s.done = true; s.price = price; s.log.push(line); }
