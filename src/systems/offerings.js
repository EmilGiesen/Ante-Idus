// Opfergaben in Tempeln: kleine, zeitlich begrenzte Boni (data/offerings.json)
import { G } from '../core/ctx.js';
import { formatMoney } from '../core/util.js';
import { changeMoney } from './rules.js';
import { addBuff } from './buffs.js';
import { unlockLex } from './lexicon.js';
import { addXp } from './skills.js';

export const offeringDef = (id) => G.data.offerings[id];

export function offer(id) {
  const d = offeringDef(id);
  const s = G.state;
  const done = s.flags[`opfer_${id}`] === s.time.day;
  if (d.lex) unlockLex(d.lex);
  unlockLex('opfer');
  const pages = [d.text, `${d.deity}: ${d.effect}`];
  if (done) { G.ui.dialog.custom({ text: [...pages, 'Du hast hier heute schon geopfert.'], name: d.name }); return; }
  const opts = [];
  if (s.money >= d.cost) opts.push({ t: `${d.gift} opfern (${formatMoney(d.cost)})`, fn: () => sacrifice(id) });
  else pages.push(`Für ein Opfer brauchst du ${formatMoney(d.cost)}.`);
  opts.push({ t: 'Nur ein stilles Gebet' , fn: () => G.ui.toast('Du betest still. Die Götter hören – vielleicht.') });
  G.ui.dialog.custom({ text: pages, opts, name: d.name });
}

function sacrifice(id) {
  const d = offeringDef(id);
  const s = G.state;
  changeMoney(-d.cost);
  s.flags[`opfer_${id}`] = s.time.day;
  G.ui.fade(() => {
    G.game.passHours(0.3);
    addBuff(d.buff.id, d.buff.name, d.buff.hours, d.buff.fx);
    if (s.cls === 'nobilis') addXp('rhetorik', 2);
  }, 300).then(() => G.ui.toast(`✦ ${d.buff.name} (${d.buff.hours} Std.)`, 'stat'));
}
