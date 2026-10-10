// Prüft die Spieldaten: Querverweise, Begehbarkeit, Erreichbarkeit (node tools/validate.mjs)
import { readFileSync } from 'node:fs';
import { buildExterior, buildInterior } from '../src/world/mapgen.js';

const load = (n) => JSON.parse(readFileSync(new URL(`../src/data/${n}.json`, import.meta.url), 'utf8'));
const D = Object.fromEntries(['classes', 'items', 'npcs', 'dialogues', 'missions', 'lexicon', 'shops', 'map_rom', 'interiors'].map((n) => [n, load(n)]));
const errors = [];
const warn = [];
const err = (m) => errors.push(m);

// ---------- Karten ----------
const maps = { rom: buildExterior(D.map_rom) };
for (const [id, def] of Object.entries(D.interiors)) maps[id] = buildInterior(id, def);

function bfs(map, sx, sy) {
  const seen = new Uint8Array(map.w * map.h);
  const q = [[sx, sy]];
  seen[map.key(sx, sy)] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!map.inside(nx, ny) || map.isSolidTile(nx, ny)) continue;
      const k = map.key(nx, ny);
      if (seen[k]) continue;
      seen[k] = 1;
      if (!map.doors.has(k)) q.push([nx, ny]);
    }
  }
  return seen;
}
const reach = {};
const startRom = [58, 43];
if (maps.rom.isSolidTile(...startRom)) err('Startpunkt der Erreichbarkeitsprüfung ist blockiert');
reach.rom = bfs(maps.rom, ...startRom);
for (const [id, def] of Object.entries(D.interiors)) {
  const e = def.spawns.entry;
  if (maps[id].isSolidTile(e[0], e[1])) err(`${id}: Eingang ${e} ist blockiert`);
  reach[id] = bfs(maps[id], e[0], e[1]);
}
const reachable = (m, x, y) => !!reach[m] && reach[m][maps[m].key(x, y)] === 1;
const canReachAdj = (m, x, y) => [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => maps[m].inside(x + dx, y + dy) && reachable(m, x + dx, y + dy));

// Überlappende benannte Gebäude
const bs = D.map_rom.buildings;
for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
  const a = bs[i], b = bs[j];
  if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) err(`Gebäude überlappen: ${a.name || a.kind}@${a.x},${a.y} und ${b.name || b.kind}@${b.x},${b.y}`);
}
// Türen
for (const b of maps.rom.buildings) {
  if (!b.door) continue;
  const fx = b.doorTile.x, fy = b.doorTile.y + 1;
  if (maps.rom.isSolidTile(fx, fy)) err(`Tür von ${b.name} (${fx},${fy - 1}): Vorplatz blockiert`);
  else if (!reachable('rom', fx, fy)) err(`Tür von ${b.name}: nicht erreichbar`);
  if (b.door.to && !D.interiors[b.door.to]) err(`Tür von ${b.name}: Innenraum ${b.door.to} fehlt`);
  if (b.door.dialogue && !D.dialogues[b.door.dialogue]) err(`Tür von ${b.name}: Dialog ${b.door.dialogue} fehlt`);
  if (b.door.deny && !D.dialogues[b.door.deny]) err(`Tür von ${b.name}: Dialog ${b.door.deny} fehlt`);
}
for (const b of maps.rom.buildings) {
  if (b.interact) {
    let ok = false;
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (canReachAdj('rom', x, y)) ok = true;
    if (!ok) err(`${b.name}: Interaktion nicht erreichbar`);
  }
}
for (const [id, def] of Object.entries(D.interiors)) {
  const ex = def.exitTo;
  if (maps.rom.isSolidTile(ex[0], ex[1]) || !reachable('rom', ex[0], ex[1])) err(`${id}: exitTo ${ex} nicht begehbar/erreichbar`);
  const m = maps[id];
  if (![...m.doors.keys()].some((k) => canReachAdj(id, k % m.w, Math.floor(k / m.w)) || reach[id][k])) err(`${id}: Ausgang nicht erreichbar`);
  for (const [k, it] of m.interacts) if (it.type === 'bed' && !canReachAdj(id, k % m.w, Math.floor(k / m.w))) warn.push(`${id}: Bett bei ${k % m.w},${Math.floor(k / m.w)} nicht erreichbar`);
}
// Areas
for (const [id, r] of Object.entries(D.map_rom.areas)) {
  let ok = false;
  for (let y = r[1]; y < r[1] + r[3]; y++) for (let x = r[0]; x < r[0] + r[2]; x++) if (reachable('rom', x, y)) ok = true;
  if (!ok) err(`Bereich ${id} nicht erreichbar`);
}
// Klassen-Start
for (const [id, c] of Object.entries(D.classes)) {
  for (const p of [c.start, c.home]) {
    if (!maps[p.map]) { err(`Klasse ${id}: Karte ${p.map} fehlt`); continue; }
    if (maps[p.map].isSolidTile(...p.at) || !reachable(p.map, ...p.at)) err(`Klasse ${id}: Position ${p.map} ${p.at} blockiert/unerreichbar`);
  }
  if (!D.dialogues[c.intro]) err(`Klasse ${id}: Intro ${c.intro} fehlt`);
}
// NPCs
const npcIds = new Set(D.npcs.list.map((n) => n.id));
for (const n of D.npcs.list) {
  if (!D.dialogues[n.dialogue]) err(`NPC ${n.id}: Dialog ${n.dialogue} fehlt`);
  for (const s of n.sched) {
    const m = maps[s.map];
    if (!m) { err(`NPC ${n.id}: Karte ${s.map} fehlt`); continue; }
    const [x, y] = s.at;
    if (m.isSolidTile(x, y)) err(`NPC ${n.id}: steht auf festem Tile ${s.map} ${x},${y}`);
    else if (!reachable(s.map, x, y)) err(`NPC ${n.id}: Position ${s.map} ${x},${y} unerreichbar`);
  }
}
// ---------- Dialoge ----------
const lex = D.lexicon.entries;
const checkCond = (c, where) => {
  if (!c) return;
  for (const [k, v] of Object.entries(c)) {
    if (['mission', 'done', 'notDone', 'canStart', 'notActive'].includes(k) && !D.missions[v]) err(`${where}: Mission ${v} fehlt`);
    if (k === 'step' && !D.missions[v[0]]) err(`${where}: Mission ${v[0]} fehlt`);
    if (k === 'step' && D.missions[v[0]] && v[1] >= D.missions[v[0]].steps.length) err(`${where}: Schritt ${v[1]} von ${v[0]} existiert nicht`);
    if ((k === 'item' || k === 'noItem') && !D.items[Array.isArray(v) ? v[0] : v]) err(`${where}: Gegenstand ${v} fehlt`);
    if (k === 'any') v.forEach((x) => checkCond(x, where));
    if (k === 'not') checkCond(v, where);
  }
};
const checkEff = (list, where) => {
  for (const e of list || []) {
    const k = Object.keys(e)[0], v = e[k];
    if (['start', 'advance', 'complete', 'abandon'].includes(k) && !D.missions[v]) err(`${where}: Mission ${v} fehlt`);
    if ((k === 'give' || k === 'take') && !D.items[Array.isArray(v) ? v[0] : v]) err(`${where}: Gegenstand ${v} fehlt`);
    if (k === 'lex') [].concat(v).forEach((id) => { if (!lex[id]) err(`${where}: Lexikon ${id} fehlt`); });
    if (k === 'shop' && !D.shops[v]) err(`${where}: Laden ${v} fehlt`);
    if (k === 'minigame' && e.then && !D.dialogues[e.then]) err(`${where}: Folgeknoten ${e.then} fehlt`);
  }
};
const usedLex = new Set();
for (const [id, n] of Object.entries(D.dialogues)) {
  if (id === '_ambient') continue;
  for (const b of n.switch || []) { checkCond(b.if, id); if (!D.dialogues[b.go]) err(`${id}: switch-Ziel ${b.go} fehlt`); }
  if (n.next && !D.dialogues[n.next]) err(`${id}: next ${n.next} fehlt`);
  checkEff(n.do, id);
  for (const o of n.opts || []) {
    checkCond(o.if, id);
    checkEff(o.do, id);
    if (o.go && !D.dialogues[o.go]) err(`${id}: Option-Ziel ${o.go} fehlt`);
  }
  for (const e of [...(n.do || []), ...(n.opts || []).flatMap((o) => o.do || [])]) if (e.lex) [].concat(e.lex).forEach((x) => usedLex.add(x));
  if (!n.switch && !n.text) err(`${id}: kein Text`);
}
// ---------- Missionen ----------
for (const [id, m] of Object.entries(D.missions)) {
  if (m.giver && !npcIds.has(m.giver)) err(`Mission ${id}: Auftraggeber ${m.giver} fehlt`);
  checkCond(m.req, `Mission ${id}`);
  checkEff(m.reward, `Mission ${id}`); checkEff(m.onStart, `Mission ${id}`);
  for (const e of [...(m.reward || [])]) if (e.lex) [].concat(e.lex).forEach((x) => usedLex.add(x));
  m.steps.forEach((s, i) => {
    if (s.target?.npc && !npcIds.has(s.target.npc)) err(`Mission ${id}/${i}: Ziel-NPC ${s.target.npc} fehlt`);
    if (s.target?.area && !D.map_rom.areas[s.target.area]) err(`Mission ${id}/${i}: Bereich ${s.target.area} fehlt`);
    if (s.auto?.area && !D.map_rom.areas[s.auto.area]) err(`Mission ${id}/${i}: Bereich ${s.auto.area} fehlt`);
    if (s.auto?.item && !D.items[s.auto.item]) err(`Mission ${id}/${i}: Gegenstand ${s.auto.item} fehlt`);
  });
}
for (const [id, s] of Object.entries(D.shops)) for (const it of s.items) if (!D.items[it.id]) err(`Laden ${id}: Gegenstand ${it.id} fehlt`);
// Lexikon: Kategorien und Freischaltung
const cats = new Set(D.lexicon.categories.map((c) => c.id));
for (const [id, e] of Object.entries(lex)) {
  if (!cats.has(e.cat)) err(`Lexikon ${id}: Kategorie ${e.cat} unbekannt`);
  if (!e.sources || !e.sources.length) err(`Lexikon ${id}: keine Quellen`);
}
for (const z of D.map_rom.zones) if (z.lex) { usedLex.add(z.lex); if (!lex[z.lex]) err(`Zone ${z.id}: Lexikon ${z.lex} fehlt`); }
for (const b of D.map_rom.buildings) if (b.lex) { usedLex.add(b.lex); if (!lex[b.lex]) err(`Gebäude ${b.name}: Lexikon ${b.lex} fehlt`); }
for (const d of Object.values(D.interiors)) if (d.lex) usedLex.add(d.lex);
['kalender', 'sklaverei', 'nacht', 'preise'].forEach((x) => usedLex.add(x)); // im Code freigeschaltet
for (const id of Object.keys(lex)) if (!usedLex.has(id)) warn.push(`Lexikon ${id} wird nirgends freigeschaltet`);

for (const w of warn) console.log('Hinweis:', w);
if (errors.length) {
  for (const e of errors) console.log('FEHLER:', e);
  console.log(`\n${errors.length} Fehler gefunden.`);
  process.exit(1);
}
console.log(`Daten OK: ${Object.keys(D.dialogues).length} Dialogknoten, ${D.npcs.list.length} NPCs, ${Object.keys(D.missions).length} Missionen, ${Object.keys(lex).length} Lexikon-Einträge, ${maps.rom.buildings.length} Gebäude.`);
