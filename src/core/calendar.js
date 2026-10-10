// Römischer Kalender: vorjulianisch bis Ende 46 v. Chr., julianisch ab 1. Januar 45 v. Chr.
// 46 v. Chr. („Jahr der Verwirrung“) hatte 445 Tage: Mercedonius (23 T.) + zwei Schaltmonate (zus. 67 T.).
// Die Aufteilung der 67 Tage auf die beiden Schaltmonate ist unsicher (hier 33 + 34).
import { roman } from './util.js';
import { DAYS_PER_PLAYED_DAY } from './config.js';

const m = (name, de, abbr, len, extra = {}) => {
  const long = ['Martius', 'Maius', 'Quintilis', 'Iulius', 'October'].includes(name);
  return { name, de, abbr, len, nonae: long ? 7 : 5, idus: long ? 15 : 13, ...extra };
};

const PRE_46 = [
  m('Ianuarius', 'Januar', 'Ian.', 29), m('Februarius', 'Februar', 'Feb.', 28),
  m('Mercedonius', 'Schaltmonat Mercedonius', 'Merc.', 23, { inter: true }),
  m('Martius', 'März', 'Mart.', 31), m('Aprilis', 'April', 'Apr.', 29), m('Maius', 'Mai', 'Mai.', 31),
  m('Iunius', 'Juni', 'Iun.', 29), m('Quintilis', 'Quintilis', 'Quint.', 31), m('Sextilis', 'Sextilis', 'Sext.', 29),
  m('September', 'September', 'Sept.', 29), m('October', 'Oktober', 'Oct.', 31), m('November', 'November', 'Nov.', 29),
  m('Intercalaris prior', '1. Schaltmonat', 'Interc. pr.', 33, { inter: true }),
  m('Intercalaris posterior', '2. Schaltmonat', 'Interc. post.', 34, { inter: true }),
  m('December', 'Dezember', 'Dec.', 29),
];

function julian(year) {
  const quint = year >= -44 ? m('Iulius', 'Iulius (Juli)', 'Iul.', 31) : m('Quintilis', 'Quintilis', 'Quint.', 31);
  return [
    m('Ianuarius', 'Januar', 'Ian.', 31), m('Februarius', 'Februar', 'Feb.', 28), m('Martius', 'März', 'Mart.', 31),
    m('Aprilis', 'April', 'Apr.', 30), m('Maius', 'Mai', 'Mai.', 31), m('Iunius', 'Juni', 'Iun.', 30), quint,
    m('Sextilis', 'Sextilis', 'Sext.', 31), m('September', 'September', 'Sept.', 30), m('October', 'Oktober', 'Oct.', 31),
    m('November', 'November', 'Nov.', 30), m('December', 'Dezember', 'Dec.', 31),
  ];
}

export function monthsOf(year) { return year <= -46 ? PRE_46 : julian(year); }

// Spielstart: a.d. IX Kal. Mai. 708 a.u.c. (22. April 46 v. Chr., vorjulianisch)
export const START = { year: -46, m: 4, d: 22 };

export function dateFromOffset(off) {
  let y = START.year, mi = START.m, d = START.d + off;
  let months = monthsOf(y);
  while (d > months[mi].len) {
    d -= months[mi].len;
    mi++;
    if (mi >= months.length) { mi = 0; y = y === -1 ? 1 : y + 1; months = monthsOf(y); }
  }
  return { year: y, mi, d, month: months[mi], months };
}

export function dateOfPlayedDay(day) { return dateFromOffset(day * DAYS_PER_PLAYED_DAY); }

const before = (n, kind, abbr) => (n === 2 ? `prid. ${kind} ${abbr}` : `a.d. ${roman(n)} ${kind} ${abbr}`);

export function formatRoman(dt) {
  const { d, month, months, mi, year } = dt;
  if (month.inter) return `${roman(d)}. Tag, ${month.name}`;
  if (d === 1) return `Kal. ${month.abbr}`;
  if (d < month.nonae) return before(month.nonae - d + 1, 'Non.', month.abbr);
  if (d === month.nonae) return `Non. ${month.abbr}`;
  if (d < month.idus) return before(month.idus - d + 1, 'Id.', month.abbr);
  if (d === month.idus) return `Id. ${month.abbr}`;
  const next = months[mi + 1] || monthsOf(year + 1)[0];
  return before(month.len - d + 2, 'Kal.', next.abbr);
}

export function formatGerman(dt) {
  const yr = dt.year < 0 ? `${-dt.year} v. Chr.` : `${dt.year} n. Chr.`;
  if (dt.month.inter) return `${dt.d}. Tag im ${dt.month.de}, ${yr}`;
  return `${dt.d}. ${dt.month.de} ${yr}`;
}

export const auc = (year) => (year < 0 ? 754 + year : 753 + year);

export function season(dt) {
  const n = dt.month.name;
  if (['Martius', 'Aprilis', 'Maius'].includes(n)) return 'Frühling';
  if (['Iunius', 'Quintilis', 'Iulius', 'Sextilis'].includes(n)) return 'Sommer';
  if (['September', 'October', 'November'].includes(n)) return 'Herbst';
  return 'Winter';
}
