// Bedürfnisse: Sättigung, Energie, Gesundheit, Hygiene – langsam sinkend, milde Folgen
import { G } from '../core/ctx.js';
import { clamp } from '../core/util.js';
import { isNight } from '../core/time.js';
import { buffFx } from './buffs.js';

export const NEED_NAMES = { satiety: 'Sättigung', energy: 'Energie', health: 'Gesundheit', hygiene: 'Hygiene' };

const WARN = {
  satiety: 'Dein Magen knurrt. Iss etwas (I → Inventar) oder kauf dir etwas in einer Garküche.',
  energy: 'Du bist erschöpft. Schlaf zu Hause oder sprinte weniger.',
  hygiene: 'Du riechst nicht mehr frisch. Wasch dich an einem Brunnen.',
  health: 'Du fühlst dich krank. Iss, ruh dich aus und pflege dich.',
};

export function updateNeeds(hours, sprinting) {
  const s = G.state;
  const n = s.needs;
  const night = isNight(s.time.hour);
  n.satiety = clamp(n.satiety - hours * (night ? 2 : 4) * (1 + buffFx('hunger')), 0, 100);
  n.energy = clamp(n.energy - hours * (sprinting ? 10 : 4.2) * (1 + buffFx('tired')), 0, 100);
  n.health = clamp(n.health + hours * buffFx('heal'), 0, 100);
  n.hygiene = clamp(n.hygiene - hours * 2.2, 0, 100);
  let dh = 0;
  if (n.satiety < 12) dh -= 3;
  if (n.energy < 8) dh -= 2;
  if (n.hygiene < 12) dh -= 1;
  if (dh === 0 && n.satiety > 45 && n.energy > 25) dh = 1.5;
  n.health = clamp(n.health + dh * hours, 0, 100);

  // Einmalige Warnungen beim Unterschreiten einer Schwelle
  s.warned ||= {};
  for (const k of Object.keys(WARN)) {
    const low = n[k] < 22;
    if (low && !s.warned[k]) { s.warned[k] = true; G.ui.toast(WARN[k], 'warn'); }
    if (n[k] > 40) s.warned[k] = false;
  }
  return n.health <= 0 || n.energy <= 0;
}
