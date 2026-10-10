// Entwurf der Stadtkarte Rom (46 v. Chr.) → src/data/map_rom.json
// Alle Hügel, Straßen, Tore, Brücken und Gebäude stehen hier mit festen Koordinaten (Tiles, Norden oben).
// Wohnviertel werden entlang eines festen Gassenrasters bebaut (deterministisch, ohne Zufall zur Laufzeit).
// Aufruf: node tools/build_map.mjs   (danach: npm run validate)
import { writeFileSync } from 'node:fs';
import { mulberry32 } from '../src/core/rng.js';

const W = 200, H = 170;
const G = Array.from({ length: H }, () => Array(W).fill('.'));
const ROAD = new Uint8Array(W * H);   // Straßen: hier wird nicht gebaut
const RES = new Uint8Array(W * H);    // reserviert (Türvorplätze, Plätze)
const OCC = new Int16Array(W * H).fill(-1);
const buildings = [], deco = [], warnings = [];
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const K = (x, y) => y * W + x;
const get = (x, y) => (inb(x, y) ? G[y][x] : null);
const WALKABLE = new Set(['.', ',', ':', 'd', 'p', 'f', 's', 'g', 'c', 'z', 'S', 'B', 'm', 'u', 'l', 'w']);
const BUILDABLE = new Set(['.', ',', ':', 'd', 'c', 'l', 'g', 'u', 'z', 'f', 'm']);

function set(x, y, c, only, skip) {
  if (!inb(x, y)) return;
  if (only && !only.includes(G[y][x])) return;
  if (skip && skip.includes(G[y][x])) return;
  G[y][x] = c;
}
function rect(x, y, w, h, c, only) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, c, only); }
function ellipse(cx, cy, rx, ry) {
  const out = [];
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 && inb(x, y)) out.push([x, y]);
  }
  return out;
}
// Dicke Linie (Straße, Fluss, Mauer)
function line(pts, w, c, opt = {}) {
  const lo = -Math.floor((w - 1) / 2), hi = Math.floor(w / 2);
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 || 1;
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / steps), y = Math.round(y0 + ((y1 - y0) * s) / steps);
      for (let oy = lo; oy <= hi; oy++) for (let ox = lo; ox <= hi; ox++) {
        const xx = x + ox, yy = y + oy;
        if (!inb(xx, yy)) continue;
        if (opt.skip && opt.skip.includes(G[yy][xx])) continue;
        if (opt.only && !opt.only.includes(G[yy][xx])) continue;
        G[yy][xx] = c;
        if (opt.road) ROAD[K(xx, yy)] = 1;
      }
    }
  }
}
const road = (pts, w, c = 'p') => line(pts, w, c, { road: true, skip: ['~', 'B'] });

// Steiler Hügel: Hochfläche mit Rand und sichtbarer Felswand nach Süden
function plateau(cx, cy, rx, ry) {
  const tiles = ellipse(cx, cy, rx, ry);
  const m = new Set(tiles.map(([x, y]) => K(x, y)));
  const inM = (x, y) => m.has(K(x, y));
  for (const [x, y] of tiles) {
    let c = ',';
    if (!inM(x, y + 1) || !inM(x, y + 2)) c = 'C';
    else if (!inM(x - 1, y) || !inM(x + 1, y) || !inM(x, y - 1)) c = 'R';
    G[y][x] = c;
  }
}
// Sanfter Hügel: begehbar, Ränder als Hang
function gentle(cx, cy, rx, ry) {
  const tiles = ellipse(cx, cy, rx, ry);
  const m = new Set(tiles.map(([x, y]) => K(x, y)));
  for (const [x, y] of tiles) {
    if (G[y][x] === '~') continue;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !m.has(K(x + dx, y + dy)));
    G[y][x] = edge ? 'l' : ',';
  }
}

// ---------- Gebäude & Deko ----------
let bid = 0;
function place(list, o, layer) {
  const id = bid++;
  for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) {
    if (!inb(x, y)) { warnings.push(`${o.name || o.kind}@${o.x},${o.y}: außerhalb der Karte`); continue; }
    const k = K(x, y);
    if (OCC[k] >= 0 && o.solid !== false) warnings.push(`${o.name || o.kind}@${o.x},${o.y}: überlappt anderes Objekt bei ${x},${y}`);
    if (ROAD[k] && o.solid !== false && !o.onRoad) warnings.push(`${o.name || o.kind}@${o.x},${o.y}: steht auf Straße bei ${x},${y}`);
    if (['~', 'C', 'R', 'W'].includes(G[y][x]) && !o.onWater && o.solid !== false && !['tower', 'boat'].includes(o.kind)) warnings.push(`${o.name || o.kind}@${o.x},${o.y}: steht auf ${G[y][x]} bei ${x},${y}`);
    if (o.solid !== false) OCC[k] = id;
  }
  if (o.door) {
    const dx = o.door.dx ?? Math.floor(o.w / 2);
    const fx = o.x + dx, fy = o.y + o.h;
    RES[K(fx, fy)] = 2;
    if (!inb(fx, fy) || !WALKABLE.has(G[fy][fx]) || OCC[K(fx, fy)] >= 0) warnings.push(`${o.name}: Türvorplatz ${fx},${fy} nicht begehbar`);
  }
  list.push(o);
  return o;
}
const B = (kind, x, y, w, h, extra = {}) => place(buildings, { kind, x, y, w, h, ...extra }, 'b');
const D = (kind, x, y, w = 1, h = 1, extra = {}) => place(deco, { kind, x, y, w, h, ...extra }, 'd');
const free = (x, y, w = 1, h = 1, soft = false) => {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    if (!inb(xx, yy) || OCC[K(xx, yy)] >= 0 || ROAD[K(xx, yy)] || RES[K(xx, yy)] >= (soft ? 2 : 1) || !BUILDABLE.has(G[yy][xx])) return false;
  }
  return true;
};
const reserve = (x, y, w, h) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (inb(xx, yy)) RES[K(xx, yy)] = 1; };

// Bebauung entlang eines Gassenrasters: Reihen von Parzellen, dazwischen Gassen
function lots(r, o) {
  const rng = mulberry32(o.seed);
  const [rx, ry, rw, rh] = r;
  const st = o.street ?? 1;
  if (o.base) for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) {
    if (inb(x, y) && !ROAD[K(x, y)] && OCC[K(x, y)] < 0 && ['.', ',', 'l', ':'].includes(G[y][x])) G[y][x] = o.base;
  }
  let y = ry;
  while (y < ry + rh) {
    const h = o.lotH[0] + Math.floor(rng() * (o.lotH[1] - o.lotH[0] + 1));
    let x = rx, inRow = 0;
    while (x < rx + rw) {
      const w = o.lotW[0] + Math.floor(rng() * (o.lotW[1] - o.lotW[0] + 1));
      const fits = x + w <= rx + rw && y + h <= ry + rh && free(x, y, w, h)
        && [...Array(w).keys()].every((i) => inb(x + i, y + h) && WALKABLE.has(G[y + h][x + i]) && OCC[K(x + i, y + h)] < 0);
      if (fits && rng() < (o.chance ?? 1)) {
        const kind = o.kinds[Math.floor(rng() * o.kinds.length)];
        B(kind, x, y, w, h, { filler: true, seed: Math.floor(rng() * 1e6) });
        x += w;
        inRow++;
        if (inRow >= (o.perBlock ?? 3)) { x += st; inRow = 0; }
      } else { x += 1; inRow = 0; }
    }
    y += h + st;
  }
}
// Verdichtung: füllt verbliebene Lücken; über und unter jedem Haus bleibt eine Gasse frei
function densify(r, o) {
  const rng = mulberry32(o.seed);
  const [rx, ry, rw, rh] = r;
  const rowFree = (x, y, w) => [...Array(w).keys()].every((i) => inb(x + i, y) && WALKABLE.has(G[y][x + i]) && OCC[K(x + i, y)] < 0);
  for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) {
    for (const [w, h] of o.sizes) {
      if (x + w > rx + rw || y + h > ry + rh) continue;
      if (!free(x, y, w, h) || !rowFree(x, y + h, w) || !rowFree(x, y - 1, w)) continue;
      B(o.kinds[Math.floor(rng() * o.kinds.length)], x, y, w, h, { filler: true, seed: Math.floor(rng() * 1e6) });
      break;
    }
  }
}

// Bäume und Büsche mit Abstand
function trees(r, n, kinds, seed, ground = ['.', ',', ':', 'g', 'l']) {
  const rng = mulberry32(seed);
  let placed = 0;
  for (let i = 0; i < n * 30 && placed < n; i++) {
    const x = r[0] + Math.floor(rng() * r[2]), y = r[1] + Math.floor(rng() * r[3]);
    let ok = true;
    for (let yy = y - 1; yy <= y + 1 && ok; yy++) for (let xx = x - 1; xx <= x + 1; xx++) {
      if (!inb(xx, yy) || OCC[K(xx, yy)] >= 0 || ROAD[K(xx, yy)] || RES[K(xx, yy)] || !ground.includes(G[yy][xx])) { ok = false; break; }
    }
    if (!ok) continue;
    D(kinds[Math.floor(rng() * kinds.length)], x, y, 1, 1, { seed: Math.floor(rng() * 1e6) });
    placed++;
  }
}
// Nächster freier Platz (für Wegweiser, Sänften)
function nearFree(x, y, w = 1, h = 1, radius = 6) {
  for (let r = 0; r <= radius; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const xx = x + dx, yy = y + dy;
    if (free(xx, yy, w, h, true) && [...Array(w).keys()].every((i) => inb(xx + i, yy + h) && WALKABLE.has(G[yy + h][xx + i]) && OCC[K(xx + i, yy + h)] < 0)) return [xx, yy];
  }
  return null;
}

// =====================================================================
// 1. Gelände
// =====================================================================
rect(0, 0, 46, 52, ':');                 // Ager Vaticanus (westlich des Flusses)
rect(40, 0, 58, 62, ':');                // Marsfeld (östlich, in der Flussbiegung)
gentle(124, 32, 24, 18);                 // Quirinal
gentle(168, 30, 13, 10);                 // Viminal
gentle(182, 78, 11, 24);                 // Esquilin
gentle(171, 118, 15, 10);                // Caelius
gentle(12, 84, 11, 34);                  // Ianiculum

// Tiber mit Biegung um das Marsfeld, verbreitert an der Tiberinsel
const RIVER = [[68, 0], [60, 10], [48, 22], [40, 36], [39, 50], [45, 62], [54, 70], [58, 80], [60, 94], [59, 108],
  [58, 120], [60, 134], [63, 150], [65, 170]];
line(RIVER, 7, '~');
for (const [x, y] of ellipse(56, 74, 8, 11)) G[y][x] = '~';
for (const [x, y] of ellipse(56, 74, 3.6, 6.6)) G[y][x] = '.';   // Tiberinsel

// Steile Hügel
plateau(99, 66, 9, 10);                  // Kapitol
plateau(126, 110, 22, 11);               // Palatin
plateau(110, 153, 25, 12);               // Aventin

// =====================================================================
// 2. Plätze und Viertel-Untergrund
// =====================================================================
rect(108, 88, 38, 6, 'f');               // Forumsplatz
rect(104, 84, 44, 1, 'z');
rect(115, 80, 9, 4, 'z');                // Comitium
rect(110, 57, 15, 15, 'd');              // Forum Iulium (Baustelle)
rect(111, 66, 13, 5, 'z');
rect(134, 66, 13, 10, 'z');              // Macellum
rect(66, 62, 21, 11, 'z');               // Forum Holitorium
rect(70, 86, 22, 15, 'z');               // Forum Boarium
rect(92, 86, 14, 13, 'd', ['.']);        // Velabrum
rect(62, 52, 24, 7, 'z');                // Circus Flaminius (offener Platz)
rect(63, 37, 17, 10, '.');               // Gärten der Porticus Pompeiana (Rasen, Bäume)
rect(151, 64, 14, 7, 'z');               // Platz in der Subura
rect(148, 44, 24, 37, 'c', ['.', ',', 'l']);   // Subura: Kopfsteinpflaster
rect(104, 127, 48, 8, 's');              // Rennbahn
rect(14, 132, 40, 36, 'g', ['.']);       // Gärten Caesars (wird unten aufgelockert)
for (let y = 132; y < 168; y++) for (let x = 14; x < 54; x++) if ((x * 7 + y * 13) % 5 < 2 && G[y][x] === 'g') G[y][x] = '.';

// =====================================================================
// 3. Servianische Mauer (vor den Straßen; Straßen öffnen die Tore)
// =====================================================================
const WALL = [[64, 79], [88, 76], [89, 58], [95, 51], [94, 30], [100, 10], [130, 4], [146, 6], [182, 14], [196, 30],
  [196, 104], [188, 134], [158, 140], [140, 166], [100, 167], [82, 150], [82, 128], [64, 124]];
line(WALL, 2, 'W', { skip: ['~'] });

// =====================================================================
// 4. Straßen (p = Basaltpflaster, d = Erdweg, c = Kopfstein)
// =====================================================================
road([[104, 86], [172, 86], [180, 84]], 3);                                        // Via Sacra
road([[104, 86], [98, 84], [96, 80]], 2);                                          // Clivus Capitolinus (unten)
road([[125, 86], [125, 74], [134, 64], [146, 58]], 3);                             // Argiletum
road([[146, 58], [172, 56], [196, 64], [199, 64]], 3);                             // Clivus Suburanus → Porta Esquilina
road([[131, 92], [131, 99], [106, 99], [100, 104], [96, 108]], 2);                 // Vicus Tuscus
road([[111, 96], [104, 96], [98, 92], [92, 84], [88, 77], [84, 72], [82, 70]], 2); // Vicus Iugarius → Porta Carmentalis
road([[95, 51], [104, 54], [109, 58], [109, 74], [107, 74], [107, 84]], 2);        // Clivus Argentarius
road([[95, 51], [90, 40], [87, 20], [85, 0]], 3);                                  // Via Flaminia (später Via Lata)
road([[122, 56], [128, 40], [136, 22], [146, 6], [146, 0]], 2);                    // Alta Semita → Porta Collina
road([[146, 6], [150, 3], [158, 0]], 2, 'd');                                      // Via Nomentana
road([[158, 56], [158, 40], [176, 22], [182, 14], [184, 0]], 2, 'c');              // Vicus Patricius → Porta Viminalis
road([[82, 70], [74, 74], [70, 80], [70, 88], [72, 104], [78, 116], [78, 130], [79, 169]], 3); // Uferstraße bis zum Emporium
road([[65, 88], [71, 88]], 2);                                                     // Zugang Pons Aemilius
road([[64, 71], [68, 71]], 2);                                                     // Zugang Pons Fabricius
road([[64, 117], [72, 112]], 2, 'd');                                              // Zugang Pons Sublicius
road([[54, 88], [44, 90], [34, 96], [28, 110], [30, 130]], 2);                     // Trans Tiberim
road([[34, 96], [24, 94], [0, 92]], 2, 'd');                                       // Via Aurelia über den Ianiculum
road([[52, 117], [40, 118], [30, 118]], 2, 'd');
road([[96, 108], [104, 122], [156, 122], [161, 130], [158, 140]], 2, 'd');          // Circus-Tal Nordseite → Porta Capena
road([[104, 138], [154, 138], [158, 140]], 2, 'd');                                // Circus-Tal Südseite
road([[158, 140], [176, 152], [199, 165]], 3);                                     // Via Appia
road([[120, 167], [120, 169]], 2, 'd');                                            // Richtung Via Ardeatina
road([[160, 138], [166, 124], [170, 110], [162, 96], [160, 90], [160, 88]], 2, 'd'); // Caelius
road([[180, 84], [184, 70], [184, 60]], 2, 'd');                                   // Esquilin
road([[84, 70], [84, 59], [84, 52]], 2, 'd');                                      // Marsfeld: Forum Holitorium → Circus Flaminius
road([[62, 50], [90, 48]], 2, 'd');                                                // Marsfeld: zur Via Flaminia
road([[87, 26], [70, 26]], 2, 'd');                                                // zu Saepta / Villa Publica
road([[84, 46], [84, 50]], 2, 'd');
road([[140, 88], [140, 98]], 2);                                                   // Clivus Palatinus (unten)
road([[100, 140], [96, 132], [96, 122]], 2, 'd');                                  // Clivus Publicius (unten)
road([[150, 140], [138, 150]], 2, 'd');                                            // Aventin Ost

// Tiberinsel, Brücken, Kai
rect(60, 71, 5, 2, 'B'); for (let x = 60; x < 65; x++) { ROAD[K(x, 71)] = 1; ROAD[K(x, 72)] = 1; }   // Pons Fabricius
rect(53, 88, 12, 2, 'B'); for (let x = 53; x < 65; x++) { ROAD[K(x, 88)] = 1; ROAD[K(x, 89)] = 1; } // Pons Aemilius
rect(53, 117, 11, 2, 'B'); for (let x = 53; x < 64; x++) { ROAD[K(x, 117)] = 1; ROAD[K(x, 118)] = 1; } // Pons Sublicius
// Erstes Landfeld östlich des Flusses in einer Zeile
const eastBank = (y) => { let x = 40; while (x < W && G[y][x] !== '~') x++; while (x < W && G[y][x] === '~') x++; return x; };
for (let y = 129; y < H; y++) {           // Kai des Emporiums (außerhalb der Porta Trigemina)
  const x = eastBank(y);
  for (let i = 0; i < 2; i++) if (G[y][x + i] !== 'W' && !ROAD[K(x + i, y)]) G[y][x + i] = 'w';
}

// Treppen auf die steilen Hügel
const stairs = (x, y, w, h) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { G[yy][xx] = 'S'; ROAD[K(xx, yy)] = 1; } };
stairs(95, 72, 3, 7);                     // Clivus Capitolinus
stairs(105, 70, 3, 6);                    // Scalae Gemoniae
stairs(140, 96, 2, 6);                    // Clivus Palatinus
stairs(103, 109, 5, 2);                   // Scalae Caci
stairs(146, 110, 4, 2);                   // Palatin Ost
stairs(124, 118, 2, 5);                   // Palatin Süd zum Circus
stairs(99, 136, 3, 7);                    // Clivus Publicius
stairs(134, 149, 4, 2);                   // Aventin Ost
stairs(119, 163, 3, 4);                   // Aventin Süd → Porta Raudusculana
// Wege auf den Hochflächen
road([[96, 72], [96, 71]], 2, 'z');
road([[106, 70], [106, 62], [103, 62]], 2, 'z');
road([[140, 102], [140, 110], [108, 110]], 2);                                     // Palatin-Hauptweg
road([[140, 110], [146, 110]], 2);
road([[124, 112], [124, 118]], 2, 'd');
road([[101, 142], [101, 156], [132, 156], [134, 150]], 2, 'd');
road([[120, 146], [120, 163]], 2, 'd');

// Uferstreifen (Schlamm) am Fluss
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!['.', ':'].includes(G[y][x])) continue;
  if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => get(x + dx, y + dy) === '~')) G[y][x] = 'u';
}

// =====================================================================
// 5. Tore (Bogen über der Straße, Türme auf der Mauer)
// =====================================================================
const gates = [
  ['Porta Carmentalis', 88, 77, 'mauer'], ['Porta Flumentana', 70, 78, 'mauer'], ['Porta Fontinalis', 95, 51, 'mauer'],
  ['Porta Collina', 146, 6, 'mauer'], ['Porta Viminalis', 182, 14, 'mauer'], ['Porta Esquilina', 196, 64, 'esquilin'],
  ['Porta Capena', 158, 140, 'via_appia'], ['Porta Raudusculana', 120, 166, 'mauer'], ['Porta Trigemina', 78, 127, 'emporium'],
];
for (const [name, gx, gy, lex] of gates) {
  // Torbogen über alle Straßenfelder in einem 7er-Fenster, Türme auf die nächsten Mauerfelder
  const span = [];
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (ROAD[K(gx + dx, gy + dy)] && inb(gx + dx, gy + dy)) span.push([gx + dx, gy + dy]);
  const walls = [];
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (get(gx + dx, gy + dy) === 'W') walls.push([gx + dx, gy + dy]);
  if (!walls.length) { warnings.push(`${name}: keine Mauer in der Nähe`); continue; }
  walls.sort((a, b) => Math.hypot(a[0] - gx, a[1] - gy) - Math.hypot(b[0] - gx, b[1] - gy));
  const t1 = walls[0];
  const t2 = walls.find((w) => Math.hypot(w[0] - t1[0], w[1] - t1[1]) > 3) || walls[1];
  for (const t of [t1, t2]) deco.push({ kind: 'tower', x: t[0], y: t[1], w: 1, h: 1, name, info: `${name} – ein Tor der Servianischen Mauer.`, lex });
  const xs = span.map((s) => s[0]), ys = span.map((s) => s[1]);
  const vert = Math.abs(t1[1] - t2[1]) > Math.abs(t1[0] - t2[0]);
  const ax = Math.min(...xs), ay = Math.round((Math.min(...ys) + Math.max(...ys)) / 2);
  deco.push({ kind: 'gatearch', x: vert ? Math.min(t1[0], t2[0]) : Math.min(t1[0], t2[0]) + 1, y: vert ? ay : Math.round((t1[1] + t2[1]) / 2),
    w: vert ? 2 : Math.max(2, Math.abs(t1[0] - t2[0]) - 1), h: 1, solid: false, style: { dir: vert ? 'v' : 'h', label: true }, name, lex,
    info: `${name} – ein Tor der Servianischen Mauer.` });
  void ax;
}

// =====================================================================
// 6. Forum Romanum (Detailplan)
// =====================================================================
B('carcer', 103, 79, 4, 5, { name: 'Carcer (Tullianum)', lex: 'carcer', info: 'Der Carcer, Roms Staatsgefängnis am Fuß des Kapitols. Gefangene warten hier auf ihr Urteil – oder ihre Hinrichtung.' });
B('temple', 109, 77, 6, 7, { name: 'Tempel der Concordia', lex: 'concordia', style: { cols: 4 }, door: { dx: 3, dialogue: 'door_concordia' } });
B('curia', 116, 73, 6, 7, { name: 'Curia Cornelia', lex: 'curia', info: 'Die Curia Cornelia, das Versammlungshaus des Senats. Faustus Sulla ließ sie nach dem Brand von 52 v. Chr. neu errichten.' });
B('rostra', 115, 82, 6, 2, { name: 'Rostra', lex: 'rostra', onRoad: true, interact: { type: 'activity', id: 'reden_hoeren' } });
B('shrine', 122, 80, 1, 2, { name: 'Ianus-Tor', lex: 'ianus', info: 'Der Durchgang des Ianus Geminus. Seine Türen stehen offen – das heißt: Rom ist im Krieg.' });
B('basilica', 128, 77, 16, 7, { name: 'Basilica Aemilia', lex: 'basilicae', info: 'Die Basilica Aemilia: Gerichte, Händler und Geldwechsler unter einem Dach.',
  door: { dx: 8, to: 'basilica_aemilia', planned: true, label: 'Basilica Aemilia' } });
B('temple', 106, 88, 6, 7, { name: 'Tempel des Saturn', lex: 'saturn', style: { cols: 4 },
  door: { dx: 3, to: 'tempel_saturn', label: 'Tempel des Saturn (Aerarium)' }, interact: { type: 'offer', id: 'saturn' } });
B('basilica', 113, 94, 17, 5, { name: 'Basilica Iulia (Baustelle)', lex: 'basilicae', style: { build: true, stone: '#ece4cc' },
  info: 'Die Basilica Iulia – Caesars neuer Prachtbau, noch eingerüstet.', interact: { type: 'activity', id: 'bau_basilica' } });
B('temple', 133, 92, 6, 7, { name: 'Tempel von Castor und Pollux', lex: 'forum_romanum', style: { cols: 5 }, interact: { type: 'offer', id: 'castor' } });
B('temple_round', 142, 91, 4, 4, { name: 'Tempel der Vesta', lex: 'vesta', light: [2, 2, 46], info: 'Der runde Vestatempel. Drinnen hüten die Vestalinnen das ewige Feuer Roms.' });
B('domus', 146, 88, 4, 4, { name: 'Regia', lex: 'vesta', style: { color: '#e8dcc0' }, info: 'Die Regia, uraltes Amtsgebäude des Pontifex maximus – heute ist das Caesar.' });
B('domus', 142, 95, 8, 5, { name: 'Atrium Vestae', lex: 'vesta', style: { color: '#f2ead6', socle: '#7a2f22' }, info: 'Das Haus der Vestalinnen.' });
B('domus', 151, 90, 7, 6, { name: 'Domus Publica', lex: 'domus_publica', style: { color: '#efe6d0', socle: '#7a2f22' }, door: { dx: 3, dialogue: 'door_domuspublica' }, light: [3, 6, 30] });
B('stall', 120, 91, 3, 1, { name: 'Getreideausgabe', style: { goods: 'bread', awning: '#d4a017' }, info: 'Ein Tisch der Getreideverwaltung.' });
D('statue', 113, 90, 1, 1, { name: 'Ehrenstatue', info: 'Eine Ehrenstatue. Auf dem Forum stehen Dutzende davon.' });
D('statue', 143, 86, 1, 1, { name: 'Ehrenstatue', style: { color: '#d8d0c0' }, info: 'Eine marmorne Ehrenstatue eines verdienten Bürgers.', onRoad: true });
D('altar', 126, 90, 2, 1, { name: 'Lacus Curtius', lex: 'forum_romanum', info: 'Der Lacus Curtius: ein eingefasster Fleck, an dem sich der Sage nach einst ein Abgrund öffnete.' });

// Forum Iulium (Baustelle) und Macellum
B('temple_build', 113, 57, 8, 8, { name: 'Tempel der Venus Genetrix (im Bau)', lex: 'forum_iulium', style: { cols: 8 },
  info: 'Hier entsteht Caesars neues Forum mit dem Tempel der Venus Genetrix.' });
D('crane', 121, 58, 2, 2, { name: 'Tretradkran', lex: 'forum_iulium', interact: { type: 'activity', id: 'bau_forum_iulium' } });
D('scaffold', 111, 58, 1, 7); D('scaffold', 123, 61, 1, 4); D('stones', 111, 66, 2, 1); D('drums', 120, 66, 3, 1); D('stones', 116, 69, 2, 1);
B('temple_round', 139, 67, 4, 4, { name: 'Tholos des Macellum', lex: 'macellum', style: { roof: '#b5532f' }, info: 'Der Rundbau in der Mitte des Macellum, des großen Lebensmittelmarkts.' });
D('stall', 135, 73, 3, 1, { name: 'Stand des Phileros', style: { goods: 'oil', awning: '#3f7f3f' } });
D('stall', 143, 73, 3, 1, { name: 'Stand der Verecunda', style: { goods: 'cheese', awning: '#d4a017' } });
D('stall', 143, 69, 3, 1, { name: 'Stand des Mago', style: { goods: 'wine', awning: '#8e44ad' } });
D('stall', 135, 69, 3, 1, { name: 'Stand der Thais', style: { goods: 'fish', awning: '#2e6da4' } });
D('amphorae', 146, 67); D('crates', 146, 74);

// =====================================================================
// 7. Kapitol
// =====================================================================
B('temple', 93, 63, 10, 7, { name: 'Tempel des Iuppiter Optimus Maximus', lex: 'kapitol', style: { cols: 6 }, info: 'Der größte Tempel Roms: Iuppiter, Iuno und Minerva werden hier gemeinsam verehrt.' });
B('temple', 97, 57, 5, 5, { name: 'Tempel der Iuno Moneta', lex: 'geld', style: { cols: 4 }, info: 'Der Tempel der Iuno Moneta auf der Arx. In der Nähe werden Münzen geprägt.' });
B('tabularium', 103, 64, 3, 5, { name: 'Tabularium', lex: 'kapitol', info: 'Das Tabularium, das Staatsarchiv. Hier lagern Gesetze und Verträge.' });
D('altar', 99, 72, 2, 1, { name: 'Altar des Iuppiter', light: [1, 0, 30], interact: { type: 'offer', id: 'iuppiter' } });
trees([91, 57, 16, 16], 4, ['olive', 'bush'], 11);

// =====================================================================
// 8. Palatin (weitläufig, Gärten)
// =====================================================================
B('domus', 112, 102, 9, 8, { name: 'Domus der Valerier', style: { color: '#efe6d0' },
  door: { dx: 4, to: 'domus_valeria', if: { cls: 'nobilis' }, deny: 'deny_domus_valeria' } });
B('domus', 123, 101, 10, 8, { name: 'Domus des Quintus Fabius Rufus', style: { color: '#e8d8b8', socle: '#5f7a52' },
  door: { dx: 5, to: 'domus_fabia', if: { cls: 'servus' }, deny: 'deny_domus_fabia' } });
B('domus', 134, 103, 5, 6, { name: 'Haus des Cicero', style: { color: '#f2ead6' }, door: { dx: 2, dialogue: 'door_cicero' } });
B('temple', 111, 112, 6, 4, { name: 'Tempel der Magna Mater', lex: 'magna_mater', style: { cols: 4 }, info: 'Der Tempel der Großen Mutter Kybele.' });
B('temple', 117, 112, 6, 5, { name: 'Tempel der Victoria', lex: 'palatin', style: { cols: 4 }, info: 'Der Tempel der Siegesgöttin Victoria.' });
B('hut', 127, 113, 3, 3, { name: 'Casa Romuli', lex: 'casa_romuli', info: 'Die Hütte des Romulus – sorgfältig gepflegt und immer wieder erneuert.' });
B('fountain', 131, 112, 2, 2, { name: 'Brunnen auf dem Palatin', lex: 'aquaedukte', interact: { type: 'fountain', dialogue: 'fountain_palatin' } });
B('domus', 134, 112, 6, 5, { name: 'Domus eines Ritters', style: { color: '#e3cfa8' }, info: 'Das Haus eines wohlhabenden Ritters (eques).' });
rect(121, 102, 1, 6, 'g', ['.', ',']);
trees([106, 100, 42, 20], 14, ['pine', 'pine', 'cypress', 'bush'], 12);

// =====================================================================
// 9. Circus Maximus und Aventin
// =====================================================================
B('carceres', 104, 124, 4, 14, { name: 'Carceres (Startboxen)', lex: 'circus_maximus', info: 'Die Startboxen der Rennwagen.' });
B('circus_n', 108, 124, 16, 3); B('circus_n', 127, 124, 13, 3); B('circus_n', 143, 124, 9, 3);
B('circus_n', 152, 124, 4, 14);
B('circus_s', 108, 135, 44, 3);
B('spina', 114, 130, 34, 2, { name: 'Spina mit Metae', lex: 'circus_maximus', info: 'Die Spina, die Mittelbarriere mit den Wendemarken (metae) und den Eiern als Rundenzähler.' });
B('temple', 88, 121, 6, 6, { name: 'Tempel der Ceres', lex: 'aventin', style: { cols: 4 }, interact: { type: 'offer', id: 'ceres' } });
B('temple', 88, 129, 5, 5, { name: 'Tempel des Merkur', lex: 'handel', style: { cols: 4 }, interact: { type: 'offer', id: 'mercurius' } });
B('temple', 104, 143, 7, 6, { name: 'Tempel der Diana', lex: 'aventin', style: { cols: 6 }, info: 'Der Tempel der Diana auf dem Aventin, ein uraltes Heiligtum.' });
B('temple', 124, 147, 6, 5, { name: 'Tempel der Iuno Regina', lex: 'aventin', style: { cols: 4 }, info: 'Der Tempel der Iuno Regina, 392 v. Chr. von Camillus aus Veji nach Rom geholt.' });
lots([88, 147, 46, 15], { seed: 31, kinds: ['insula', 'domus', 'insula'], lotW: [5, 7], lotH: [4, 5], street: 2, base: 'd', chance: 0.8 });
trees([86, 141, 48, 22], 10, ['pine', 'cypress', 'olive'], 13);

// =====================================================================
// 10. Forum Boarium, Velabrum, Forum Holitorium
// =====================================================================
B('temple', 74, 88, 4, 6, { name: 'Tempel des Portunus', lex: 'velabrum', style: { cols: 4 }, info: 'Der Tempel des Portunus, des Gottes der Häfen.' });
B('temple_round', 80, 89, 4, 4, { name: 'Rundtempel des Hercules Victor', lex: 'hercules', info: 'Der Rundtempel des Hercules Victor – aus griechischem Marmor.' });
D('altar', 86, 92, 2, 1, { name: 'Ara Maxima', lex: 'hercules', light: [1, 0, 32], interact: { type: 'offer', id: 'hercules' } });
B('temple_round', 88, 86, 4, 4, { name: 'Heiligtum der Fortuna', lex: 'opfer', style: { roof: '#b5532f' }, interact: { type: 'offer', id: 'fortuna' } });
D('fence', 76, 96, 9, 1); D('fence', 76, 100, 9, 1); D('fence', 76, 97, 1, 3); D('fence', 84, 97, 1, 2);
D('stall', 86, 96, 3, 1, { name: 'Viehhändler', style: { goods: 'veg', awning: '#c0392b' } });
D('crates', 73, 98); D('amphorae', 89, 99);
B('insula', 99, 88, 5, 3, { name: 'Ölhändler im Velabrum', style: { color: '#d6a56f' } });
B('insula', 92, 100, 6, 5, { style: { color: '#e0c9a0' } });
B('temple', 67, 62, 4, 5, { name: 'Tempel des Ianus', lex: 'forum_holitorium', style: { cols: 4 }, info: 'Einer von drei Tempeln am Gemüsemarkt.' });
B('temple', 72, 62, 4, 5, { name: 'Tempel der Spes', lex: 'forum_holitorium', style: { cols: 4 }, info: 'Der Tempel der Hoffnung (Spes).' });
B('temple', 77, 62, 4, 5, { name: 'Tempel der Iuno Sospita', lex: 'forum_holitorium', style: { cols: 4 }, info: 'Der Tempel der Iuno Sospita.' });
D('stall', 67, 69, 3, 1, { name: 'Gemüsestand', style: { goods: 'veg', awning: '#3f7f3f' } });
D('stall', 73, 69, 3, 1, { name: 'Gemüsestand', style: { goods: 'veg', awning: '#d4a017' } });
D('stall', 77, 69, 3, 1, { name: 'Obststand', style: { goods: 'cheese', awning: '#c0392b' } });
B('temple', 54, 70, 4, 4, { name: 'Tempel des Aesculapius', lex: 'tiber', style: { cols: 4 }, interact: { type: 'offer', id: 'aesculapius' }, onWater: true });

// =====================================================================
// 11. Emporium (vor der Porta Trigemina)
// =====================================================================
B('horrea', 68, 136, 9, 18, { name: 'Porticus Aemilia', lex: 'emporium', info: 'Die riesige Lagerhalle der Porticus Aemilia am Tiberhafen.' });
B('horrea', 70, 156, 7, 10, { name: 'Horrea Galbana', lex: 'emporium', info: 'Lagerhallen für Getreide, Öl und Wein.' });
for (const [y, k] of [[131, 'amphorae'], [134, 'crates'], [154, 'amphorae'], [168, 'crates']]) D(k, eastBank(y) + 1, y);
D('boat', 57, 140, 3, 1, { onWater: true, solid: true }); D('boat', 58, 158, 3, 1, { onWater: true, solid: true });
D('boat', 55, 100, 3, 1, { onWater: true, solid: true });

// =====================================================================
// 12. Subura (eng und dicht; feste Blöcke um den Platz)
// =====================================================================
B('insula', 149, 72, 6, 5, { name: 'Insula des Arrius', style: { color: '#d6a56f' }, door: { dx: 3, to: 'insula_arria' } });
B('insula', 156, 72, 6, 5, { name: 'Pistrinum des Felix', style: { color: '#e0c9a0' }, door: { dx: 3, to: 'pistrinum' }, light: [3, 4, 26] });
B('thermopolium', 158, 60, 7, 4, { name: 'Thermopolium der Asellina', lex: 'thermopolium', style: { color: '#c98a5e' }, light: [3, 4, 40] });
B('insula', 151, 60, 6, 4, { name: 'Balneum der Subura', lex: 'balneum', style: { color: '#e3cfa8' }, door: { dx: 3, to: 'balneum_subura', label: 'Balneum (Bad)' } });
B('insula', 163, 72, 5, 5, { name: 'Töpferladen', style: { color: '#c98a5e' }, door: { dx: 2, to: 'laden_subura', planned: true, label: 'Laden des Töpfers' } });
B('insula', 166, 64, 5, 6, { name: 'Popina (Taverne)', style: { color: '#b8754e' }, light: [2, 5, 36], door: { dx: 2, to: 'taberna_subura', label: 'Taverne' } });
B('fountain', 156, 65, 2, 2, { name: 'Lacus der Subura', lex: 'aquaedukte', interact: { type: 'fountain', dialogue: 'fountain_subura' } });
B('shrine', 162, 65, 1, 2, { name: 'Compitum-Schrein', lex: 'lararium', light: [0, 1, 24], info: 'Ein Schrein der Lares Compitales an der Kreuzung.' });
reserve(151, 64, 14, 7);
lots([148, 44, 24, 36], { seed: 41, kinds: ['insula', 'insula', 'insula', 'insula', 'thermopolium'], lotW: [4, 7], lotH: [4, 5], street: 1, perBlock: 4 });
densify([146, 42, 28, 38], { seed: 42, kinds: ['insula', 'insula', 'insula'], sizes: [[6, 5], [5, 5], [5, 4], [4, 4]] });

// =====================================================================
// 13. Wohnviertel: Velia/Carinae, Quirinal, Viminal, Esquilin, Caelius, Trans Tiberim
// =====================================================================
lots([150, 78, 30, 20], { seed: 51, kinds: ['domus', 'insula', 'domus'], lotW: [6, 8], lotH: [4, 5], street: 2, perBlock: 2, base: 'd' });
B('temple', 116, 22, 8, 6, { name: 'Tempel des Quirinus', lex: 'quirinal', style: { cols: 6 }, info: 'Der Tempel des Quirinus, des vergöttlichten Romulus.' });
B('temple', 135, 30, 6, 5, { name: 'Tempel der Salus', lex: 'quirinal', style: { cols: 4 }, info: 'Der Tempel der Salus, der Göttin des Wohlergehens.' });
lots([100, 14, 46, 42], { seed: 61, kinds: ['domus', 'domus', 'insula'], lotW: [6, 9], lotH: [4, 6], street: 2, perBlock: 2, base: 'd', chance: 0.75 });
lots([155, 18, 28, 24], { seed: 71, kinds: ['insula', 'domus'], lotW: [5, 7], lotH: [4, 5], street: 2, perBlock: 2, base: 'd', chance: 0.85 });
lots([172, 58, 22, 44], { seed: 81, kinds: ['domus', 'domus', 'insula'], lotW: [6, 8], lotH: [4, 6], street: 2, perBlock: 2, base: 'd', chance: 0.7 });
lots([156, 102, 32, 28], { seed: 91, kinds: ['domus', 'domus'], lotW: [7, 9], lotH: [5, 6], street: 3, perBlock: 1, base: 'd', chance: 0.65 });
lots([24, 68, 26, 60], { seed: 101, kinds: ['insula', 'insula', 'horrea', 'insula'], lotW: [5, 7], lotH: [4, 5], street: 1, perBlock: 2, base: 'd', chance: 0.9 });
B('domus', 26, 142, 12, 8, { name: 'Villa in den Gärten Caesars', lex: 'horti_caesaris', style: { color: '#f2ead6' }, info: 'Caesars Landhaus in seinen Gärten jenseits des Tibers.' });

// =====================================================================
// 14. Marsfeld (in der Flussbiegung, außerhalb der Mauer)
// =====================================================================
B('theater', 48, 32, 15, 18, { name: 'Theater des Pompeius', lex: 'theater_pompeius', info: 'Das Theater des Pompeius (55 v. Chr.), Roms erstes Theater aus Stein. Oben thront der Tempel der Venus Victrix.' });
B('colonnade', 63, 36, 18, 1, { name: 'Porticus Pompeiana', lex: 'theater_pompeius', info: 'Die Säulenhalle des Pompeius mit Gärten, Kunstwerken und schattigen Wegen.' });
B('colonnade', 63, 47, 18, 1, { name: 'Porticus Pompeiana', lex: 'theater_pompeius', info: 'Die Säulenhalle des Pompeius.' });
B('curia', 81, 37, 6, 9, { name: 'Curia Pompeia', lex: 'curia_pompeia', info: 'Die Curia Pompeia am Ende der Säulenhalle – hier tagt der Senat, wenn er auf dem Marsfeld zusammenkommt.',
  door: { dx: 3, to: 'curia_pompeia', planned: true, label: 'Curia Pompeia' } });
trees([64, 38, 16, 8], 8, ['pine', 'cypress', 'olive'], 14, ['.']);
B('saepta', 68, 14, 16, 10, { name: 'Saepta', lex: 'saepta', info: 'Die Saepta, die Wahlgehege des Volkes. Caesar plant einen Neubau aus Marmor.' });
B('domus', 72, 29, 8, 4, { name: 'Villa Publica', lex: 'marsfeld', style: { color: '#efe6d0' }, info: 'Die Villa Publica: Amtssitz der Zensoren und Unterkunft für Gesandte.' });
D('tomb', 76, 6, 3, 3, { name: 'Grab der Iulia', lex: 'marsfeld', style: { variant: 'drum' }, info: 'Das Grab der Iulia, Caesars Tochter und Ehefrau des Pompeius (gest. 54 v. Chr.).' });
D('tomb', 62, 18, 3, 3, { name: 'Grab des Sulla', lex: 'marsfeld', style: { variant: 'altar' }, info: 'Das Grab des Diktators Sulla.' });
D('statue', 73, 53, 1, 1, { name: 'Circus Flaminius', lex: 'circus_flaminius', info: 'Der Circus Flaminius: keine Rennbahn, sondern ein offener Platz für Märkte, Versammlungen und den Aufmarsch der Triumphzüge.' });
D('stall', 64, 55, 3, 1, { name: 'Marktstand', style: { goods: 'veg', awning: '#d4a017' } });
D('stall', 77, 55, 3, 1, { name: 'Marktstand', style: { goods: 'lamps', awning: '#2e6da4' } });
trees([44, 0, 52, 60], 26, ['pine', 'pine', 'cypress', 'olive'], 15, [':', '.']);

// Ager Vaticanus, Ianiculum, Gärten Caesars
B('hut', 8, 10, 3, 3, { name: 'Gehöft', lex: 'ager_vaticanus', info: 'Ein Bauernhof auf dem Ager Vaticanus, dem flachen Land jenseits des Tibers.' });
B('hut', 22, 26, 3, 3, { name: 'Gehöft', lex: 'ager_vaticanus', info: 'Ein Bauernhof auf dem Ager Vaticanus.' });
trees([0, 0, 44, 50], 18, ['olive', 'olive', 'pine', 'bush'], 16, [':', '.']);
trees([1, 50, 22, 68], 24, ['pine', 'pine', 'cypress', 'olive'], 17, [',', 'l', '.']);
trees([14, 130, 40, 38], 30, ['cypress', 'pine', 'olive', 'bush'], 18, ['g', '.']);
trees([150, 34, 46, 70], 14, ['pine', 'olive', 'cypress'], 19, ['.', ',', 'l', 'd']);
trees([152, 100, 40, 32], 14, ['pine', 'olive', 'cypress', 'bush'], 20, ['.', ',', 'l', 'd']);
trees([98, 6, 50, 50], 12, ['pine', 'cypress', 'olive'], 21, ['.', ',', 'l', 'd']);

// =====================================================================
// 15. Via Appia vor der Porta Capena: Gräber
// =====================================================================
D('tomb', 170, 141, 4, 3, { name: 'Grab der Scipionen', lex: 'via_appia', style: { variant: 'house' }, info: 'Das Familiengrab der Scipionen an der Via Appia.' });
for (const [x, y, w, v] of [[160, 148, 2, 'altar'], [174, 146, 3, 'drum'], [180, 158, 2, 'altar'], [186, 151, 3, 'drum'], [192, 164, 2, 'house'], [196, 156, 3, 'drum'], [172, 157, 2, 'altar']]) {
  D('tomb', x, y, w, w, { name: 'Grabmal', lex: 'via_appia', style: { variant: v }, info: 'Grabmäler säumen die Straßen vor der Stadt – Bestattungen innerhalb der Mauern sind verboten.' });
}
trees([160, 140, 40, 30], 10, ['cypress', 'pine'], 22, ['.', 'l', ',']);

// =====================================================================
// 15b. Orte für freiwillige Aktivitäten (activities.json)
// =====================================================================
function actAt(kind, x, y, w, h, id, extra = {}) {
  const p = nearFree(x, y, w, h, 6);
  if (!p) { warnings.push(`Aktivität ${id}: kein Platz bei ${x},${y}`); return; }
  D(kind, p[0], p[1], w, h, { ...extra, interact: { type: 'activity', id } });
}
actAt('stall', 129, 75, 3, 1, 'abschreiben', { name: 'Buchladen', style: { goods: 'scrolls', awning: '#7a2230' } });
actAt('bench', 131, 84, 1, 1, 'unterricht', { name: 'Schulbank' });
actAt('crates', 66, 129, 1, 1, 'lasten_emporium', { name: 'Warenstapel am Kai' });
actAt('stones', 118, 99, 2, 1, 'bau_basilica', { name: 'Steinblöcke für die Basilica Iulia' });
// Preistafeln (album) an den Märkten
function priceBoard(x, y, market) {
  const p = nearFree(x, y, 1, 1, 6);
  if (!p) { warnings.push(`Preistafel ${market}: kein Platz`); return; }
  D('sign', p[0], p[1], 1, 1, { name: 'Preistafel', interact: { type: 'prices', market } });
}
priceBoard(72, 129, 'emporium'); priceBoard(140, 74, 'macellum'); priceBoard(70, 71, 'holitorium');
priceBoard(90, 98, 'boarium'); priceBoard(164, 69, 'subura');
actAt('jetty', 64, 84, 1, 1, 'fischen_insula', { name: 'Angelsteg zwischen den Brücken' });
actAt('jetty', 47, 30, 1, 1, 'fischen_marsfeld', { name: 'Angelplatz am Marsfeld' });
actAt('jetty', 65, 133, 1, 1, 'fischen_emporium', { name: 'Angelplatz am Kai' });

// =====================================================================
// 16. Wegweiser, Sänften, Anker, Zonen, Bereiche
// =====================================================================
const stationsDef = [
  ['forum', 'Forum Romanum', 128, 91], ['subura', 'Subura (Platz)', 152, 69], ['palatin', 'Palatin', 128, 111],
  ['circus', 'Circus Maximus', 110, 120], ['marsfeld', 'Marsfeld (Theater des Pompeius)', 72, 49], ['boarium', 'Forum Boarium', 88, 98],
  ['emporium', 'Emporium', 74, 132], ['transtiberim', 'Trans Tiberim', 36, 98], ['capena', 'Porta Capena', 156, 134],
  ['esquilina', 'Porta Esquilina', 190, 62], ['fontinalis', 'Porta Fontinalis', 100, 52], ['collina', 'Porta Collina', 144, 10],
];
const stations = [];
for (const [id, name, x, y] of stationsDef) {
  const p = nearFree(x, y, 2, 1, 7);
  if (!p) { warnings.push(`Sänfte ${id}: kein Platz`); continue; }
  D('litter', p[0], p[1], 2, 1, { name: `Sänftenträger – ${name}`, interact: { type: 'travel', station: id } });
  stations.push({ id, name, at: [p[0], p[1]], arrive: [p[0], p[1] + 1] });
}
const DEST = [
  ['Forum Romanum', 126, 90], ['Subura', 158, 66], ['Palatin', 126, 110], ['Kapitol', 99, 66], ['Circus Maximus', 130, 131],
  ['Forum Boarium', 82, 94], ['Forum Holitorium', 76, 67], ['Marsfeld', 70, 40], ['Emporium', 72, 148], ['Trans Tiberim', 36, 100],
  ['Aventin', 110, 153], ['Esquilin', 182, 78], ['Quirinal', 124, 32], ['Caelius', 171, 118], ['Porta Capena', 158, 140],
  ['Forum Iulium', 117, 64], ['Macellum', 140, 72], ['Velia', 162, 88],
];
const ARROWS = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
const signsAt = [[126, 85], [146, 59], [140, 87], [104, 85], [96, 53], [89, 79], [73, 87], [78, 125], [104, 121], [157, 136],
  [150, 66], [172, 85], [77, 66], [86, 48], [44, 91], [109, 58], [100, 106], [139, 112], [70, 102], [159, 57]];
for (const [sx, sy] of signsAt) {
  const p = nearFree(sx, sy, 1, 1, 4);
  if (!p) { warnings.push(`Wegweiser bei ${sx},${sy}: kein Platz`); continue; }
  const near = DEST.map(([n, x, y]) => ({ n, x, y, d: Math.hypot(x - p[0], y - p[1]) })).filter((d) => d.d > 9).sort((a, b) => a.d - b.d).slice(0, 3);
  const text = near.map((d) => {
    const a = Math.round(Math.atan2(d.y - p[1], d.x - p[0]) / (Math.PI / 4));
    return `${ARROWS[(a + 8) % 8]} ${d.n} (≈ ${Math.max(2, Math.round(d.d / 5.5))} s)`;
  }).join('   ');
  D('sign', p[0], p[1], 1, 1, { interact: { type: 'sign', text } });
}

// Anker: feste Positionen für NPCs (werden in npcs.json als "@name" verwendet)
const anchors = {
  rubrius: [112, 85], atilius: [107, 85], praeco: [119, 88], frumentarius: [121, 90], argentarius: [140, 84], fabius_forum: [127, 89],
  prima: [68, 68], nicanor: [70, 131], statius: [87, 95],
  phileros: [136, 72], verecunda: [144, 72], mago: [144, 68], thais: [136, 68], asellina: [161, 64],
};
for (const [n, [x, y]] of Object.entries(anchors)) {
  if (!inb(x, y) || !WALKABLE.has(G[y][x]) || OCC[K(x, y)] >= 0) warnings.push(`Anker ${n} (${x},${y}) ist nicht begehbar (${G[y]?.[x]})`);
}

const zones = [
  { id: 'tiberinsel', name: 'Tiberinsel', sub: 'Insel des Aesculapius', r: [50, 64, 12, 20], lex: 'bruecken', amb: 2, roles: ['citizen', 'woman'], danger: 0.4 },
  { id: 'forum_iulium', name: 'Forum Iulium', sub: 'Caesars Baustelle', r: [109, 56, 17, 16], lex: 'forum_iulium', amb: 6, roles: ['worker', 'worker', 'slave'], danger: 0.6 },
  { id: 'argiletum', name: 'Argiletum & Macellum', sub: 'Buchhändler, Schuster, Lebensmittelmarkt', r: [126, 56, 22, 20], lex: 'macellum', amb: 8, roles: ['citizen', 'woman', 'slave', 'merchant'], danger: 0.8 },
  { id: 'forum', name: 'Forum Romanum', sub: 'Herz der Republik', r: [102, 72, 58, 28], lex: 'forum_romanum', amb: 16, roles: ['citizen', 'woman', 'senator', 'child', 'slave', 'citizen'], danger: 0.8 },
  { id: 'capitol', name: 'Kapitol', sub: 'Sitz des Iuppiter', r: [88, 54, 22, 24], lex: 'kapitol', amb: 3, roles: ['citizen', 'woman', 'senator'], danger: 0.5 },
  { id: 'palatin', name: 'Palatin', sub: 'Hügel der Reichen', r: [103, 98, 48, 24], lex: 'palatin', amb: 5, roles: ['citizen', 'woman', 'slave', 'senator'], danger: 0.4 },
  { id: 'circus', name: 'Circus Maximus', sub: 'Rennbahn im Tal', r: [96, 120, 66, 20], lex: 'circus_maximus', amb: 7, roles: ['citizen', 'child', 'worker', 'woman'], danger: 1 },
  { id: 'aventin', name: 'Aventin', sub: 'Hügel der Plebejer', r: [84, 140, 54, 30], lex: 'aventin', amb: 6, roles: ['citizen', 'woman', 'worker', 'child'], danger: 1.2 },
  { id: 'subura', name: 'Subura', sub: 'Enge Gassen, laute Nächte', r: [148, 42, 26, 38], lex: 'subura', amb: 18, roles: ['citizen', 'woman', 'child', 'worker', 'slave'], danger: 1.6 },
  { id: 'velia', name: 'Velia & Carinae', sub: 'Wohnviertel am Forum', r: [150, 80, 30, 20], lex: 'velia', amb: 6, roles: ['citizen', 'woman', 'slave'], danger: 1 },
  { id: 'viminal', name: 'Viminal', sub: 'Wohnhügel im Nordosten', r: [150, 12, 46, 30], lex: 'quirinal', amb: 4, roles: ['citizen', 'woman', 'child'], danger: 1 },
  { id: 'quirinal', name: 'Quirinal', sub: 'Hügel des Quirinus', r: [96, 6, 54, 50], lex: 'quirinal', amb: 7, roles: ['citizen', 'woman', 'slave', 'child'], danger: 0.8 },
  { id: 'esquilin', name: 'Esquilin', sub: 'Gärten und Häuser', r: [172, 42, 28, 64], lex: 'esquilin', amb: 5, roles: ['citizen', 'woman', 'slave'], danger: 1 },
  { id: 'via_appia', name: 'Via Appia', sub: 'Gräberstraße vor der Porta Capena', r: [158, 138, 42, 32], lex: 'via_appia', amb: 3, roles: ['citizen', 'worker'], danger: 1.4 },
  { id: 'caelius', name: 'Caelius', sub: 'Villen und Gärten', r: [152, 100, 46, 38], lex: 'caelius', amb: 4, roles: ['citizen', 'woman', 'slave'], danger: 0.8 },
  { id: 'velabrum', name: 'Velabrum', sub: 'Tal zwischen Kapitol und Palatin', r: [90, 84, 16, 22], lex: 'velabrum', amb: 5, roles: ['citizen', 'worker', 'woman'], danger: 1.2 },
  { id: 'forum_boarium', name: 'Forum Boarium', sub: 'Viehmarkt am Fluss', r: [62, 80, 40, 46], lex: 'velabrum', amb: 9, roles: ['worker', 'citizen', 'woman', 'worker'], danger: 1.2 },
  { id: 'forum_holitorium', name: 'Forum Holitorium', sub: 'Gemüsemarkt vor der Porta Carmentalis', r: [62, 60, 26, 18], lex: 'forum_holitorium', amb: 7, roles: ['citizen', 'woman', 'worker'], danger: 0.9 },
  { id: 'emporium', name: 'Emporium', sub: 'Hafen und Lagerhallen', r: [58, 126, 26, 44], lex: 'emporium', amb: 8, roles: ['worker', 'worker', 'slave', 'citizen'], danger: 1.3 },
  { id: 'marsfeld', name: 'Marsfeld', sub: 'Campus Martius in der Flussbiegung', r: [40, 0, 58, 60], lex: 'marsfeld', amb: 8, roles: ['citizen', 'child', 'senator', 'woman'], danger: 0.9 },
  { id: 'horti', name: 'Gärten Caesars', sub: 'Horti Caesaris jenseits des Tibers', r: [10, 128, 46, 42], lex: 'horti_caesaris', amb: 2, roles: ['slave', 'worker'], danger: 0.6 },
  { id: 'trans_tiberim', name: 'Trans Tiberim', sub: 'Jenseits des Flusses', r: [24, 56, 32, 72], lex: 'trans_tiberim', amb: 8, roles: ['worker', 'citizen', 'woman', 'child'], danger: 1.4 },
  { id: 'ianiculum', name: 'Ianiculum', sub: 'Hügel am Westufer', r: [0, 50, 24, 78], lex: 'ianiculum', amb: 2, roles: ['citizen', 'worker'], danger: 1 },
  { id: 'ager_vaticanus', name: 'Ager Vaticanus', sub: 'Offenes Land jenseits des Tibers', r: [0, 0, 46, 50], lex: 'ager_vaticanus', amb: 2, roles: ['worker'], danger: 0.8 },
  { id: 'tiber', name: 'Tiber', sub: 'Roms Lebensader', r: [0, 0, 200, 170], lex: 'tiber', amb: 0, danger: 0.5, hideLabel: true },
];
const areas = {
  concordia: [109, 84, 5, 2], frumentatio: [117, 88, 9, 5], macellum: [134, 66, 13, 10], argentarius: [137, 83, 6, 3],
  lacus_subura: [151, 64, 14, 7], lacus_palatin: [128, 112, 8, 5],
};
const lights = [[157, 67, 30], [132, 115, 24], [110, 85, 26], [136, 71, 22], [144, 71, 22], [159, 77, 22], [152, 77, 22],
  [96, 52, 26], [157, 139, 26], [78, 126, 24], [88, 78, 24], [196, 62, 24], [147, 8, 24]];
const animals = [
  { kind: 'cow', color: '#8a5a3a', r: [77, 97, 7, 3], n: 3 },
  { kind: 'dog', color: '#8a6a44', r: [148, 44, 24, 36], n: 3 },
  { kind: 'dog', color: '#3a3030', r: [24, 68, 26, 60], n: 2 },
  { kind: 'dog', color: '#d8c8a8', r: [106, 100, 40, 18], n: 1 },
  { kind: 'cat', color: '#c98a4a', r: [108, 88, 36, 6], n: 2 },
  { kind: 'cat', color: '#7a7068', r: [151, 64, 14, 7], n: 1 },
  { kind: 'chicken', color: '#f0ece0', r: [66, 62, 20, 10], n: 3 },
  { kind: 'chicken', color: '#a8743f', r: [151, 64, 14, 7], n: 2 },
  { kind: 'chicken', color: '#f0ece0', r: [4, 8, 20, 10], n: 3 },
  { kind: 'donkey', color: '#8a8078', r: [64, 128, 14, 8], n: 1 },
];

// =====================================================================
// Ausgabe
// =====================================================================
const out = {
  id: 'rom', name: 'Roma', w: W, h: H,
  note: 'Erzeugt von tools/build_map.mjs – Änderungen bitte dort vornehmen und neu erzeugen.',
  ground: G.map((r) => r.join('')),
  buildings, deco, zones, areas, anchors, stations, lights, animals,
};
writeFileSync(new URL('../src/data/map_rom.json', import.meta.url), JSON.stringify(out, null, 1));
for (const w of warnings) console.log('Warnung:', w);
console.log(`map_rom.json geschrieben: ${buildings.length} Gebäude, ${deco.length} Deko-Objekte, ${stations.length} Sänften, ${warnings.length} Warnungen.`);
