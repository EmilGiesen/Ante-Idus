// Tageszeit: hour 0 = Sonnenaufgang, 0–12 = 12 Horae (Tag), 12–24 = 4 Vigiliae à 3 Stunden (Nacht)
import { DAY_REAL_SECONDS, NIGHT_REAL_SECONDS } from './config.js';
import { roman } from './util.js';

export const hourRate = (h) => (h < 12 ? 12 / DAY_REAL_SECONDS : 12 / NIGHT_REAL_SECONDS);

// Lässt die Uhr um dt Echtzeit-Sekunden laufen. Liefert vergangene Spielstunden und ob ein neuer Tag begann.
export function advanceClock(time, dt) {
  const gained = dt * hourRate(time.hour);
  time.hour += gained;
  let newDay = false;
  if (time.hour >= 24) { time.hour -= 24; time.day++; newDay = true; }
  return { gained, newDay };
}

export function advanceHours(time, hours) {
  time.hour += hours;
  let newDay = false;
  while (time.hour >= 24) { time.hour -= 24; time.day++; newDay = true; }
  return newDay;
}

export const isNight = (h) => h >= 12.4 && h < 23.7;

export function hourLabel(h) {
  if (h < 12) return `Hora ${roman(Math.floor(h) + 1)}`;
  return `Vigilia ${roman(Math.floor((h - 12) / 3) + 1)}`;
}

export function hourHint(h) {
  if (h < 1) return 'Sonnenaufgang';
  if (h < 3) return 'Morgen';
  if (h < 5) return 'Vormittag';
  if (h < 7) return 'Mittag';
  if (h < 10) return 'Nachmittag';
  if (h < 12) return 'Abend';
  if (h < 15) return 'Nacht';
  if (h < 21) return 'tiefe Nacht';
  return 'vor dem Morgengrauen';
}

// Lichtstimmung: dark = Abdunklung 0..1, tint = Farbton [r,g,b,a]
export function ambientLight(h) {
  let t;
  if (h < 1) { t = h; return { dark: 0.55 * (1 - t), tint: [255, 150, 80, 0.06 + 0.16 * (1 - t)] }; }
  if (h < 10.5) return { dark: 0, tint: null };
  if (h < 12) { t = (h - 10.5) / 1.5; return { dark: 0.25 * t, tint: [255, 130, 60, 0.22 * t] }; }
  if (h < 13) { t = h - 12; return { dark: 0.25 + 0.55 * t, tint: [120, 90, 160, 0.15] }; }
  if (h < 23) return { dark: 0.8, tint: null };
  t = h - 23;
  return { dark: 0.8 - 0.25 * t, tint: [150, 110, 170, 0.12 * t] };
}
