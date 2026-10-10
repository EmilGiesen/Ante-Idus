// Festtage und Renntage nach dem römischen Kalender (data/festivals.json)
import { G } from '../core/ctx.js';
import { DAYS_PER_PLAYED_DAY } from '../core/config.js';
import { dateFromOffset } from '../core/calendar.js';

// Fest, das in die Marktwoche des Spieltags fällt (oder null)
export function festivalOf(day) {
  for (let i = 0; i < DAYS_PER_PLAYED_DAY; i++) {
    const d = dateFromOffset(day * DAYS_PER_PLAYED_DAY + i);
    for (const f of G.data.festivals) {
      if (f.months.includes(d.month.name) && d.d >= f.from && d.d <= f.to) return f;
    }
  }
  return null;
}

// Wagenrennen: an Festtagen mit Circusspielen und zusätzlich jeden dritten Spieltag
export function isRaceDay(day) {
  const f = festivalOf(day);
  return (f && f.circus) || day % 3 === 2;
}
