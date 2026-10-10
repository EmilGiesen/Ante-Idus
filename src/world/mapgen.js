// Baut Karten aus den JSON-Daten: Außenkarte aus festen Layern (Boden, Gebäude, Deko, Kollision)
// und Innenräume aus ASCII-Layouts. Zur Laufzeit wird nichts zufällig erzeugt.
import { GameMap } from './gamemap.js';
import { T, SOLID_GROUND, GROUND_CHARS, tileId } from './tiles.js';

export function buildExterior(def) {
  const map = new GameMap(def.id, def.w, def.h, { name: def.name, style: def.style });
  const legend = { ...GROUND_CHARS, ...(def.legend || {}) };
  for (let y = 0; y < def.h; y++) {
    const row = def.ground[y] || '';
    for (let x = 0; x < def.w; x++) {
      const name = legend[row[x] ?? '.'];
      if (!name) throw new Error(`Unbekanntes Bodenzeichen „${row[x]}“ bei ${x},${y}`);
      const k = map.key(x, y);
      map.ground[k] = tileId(name);
      map.solid[k] = SOLID_GROUND.has(map.ground[k]) ? 1 : 0;
    }
  }
  for (const b of def.buildings || []) placeBuilding(map, { ...b, layer: 'building' });
  for (const b of def.deco || []) placeBuilding(map, { ...b, layer: 'deco' });
  // Kollisions-Layer: '#' erzwingt fest, '_' erzwingt begehbar, '.' = automatisch
  (def.collision || []).forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') map.solid[map.key(x, y)] = 1;
      else if (row[x] === '_') map.solid[map.key(x, y)] = 0;
    }
  });
  map.zones = def.zones || [];
  map.areas = def.areas || {};
  map.anchors = def.anchors || {};
  map.stations = def.stations || [];
  map.lights = (def.lights || []).map(([x, y, r]) => ({ x: x * 16 + 8, y: y * 16 + 8, r: r || 40, warm: true }));
  for (let i = 0; i < map.ground.length; i++) if (map.ground[i] === T.water) map.water.push(i);
  return map;
}

export function placeBuilding(map, b) {
  const idx = map.buildings.length;
  map.buildings.push(b);
  const solid = b.solid !== false;
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
    if (!map.inside(x, y)) continue;
    const k = map.key(x, y);
    if (solid) map.solid[k] = 1;
    map.bidx[k] = idx;
    if (b.interact) map.interacts.set(k, { ...b.interact, building: b });
  }
  if (b.door) {
    const dx = b.door.dx ?? Math.floor(b.w / 2);
    const tx = b.x + dx, ty = b.y + b.h - 1;
    const door = { ...b.door, x: tx, y: ty, building: b };
    b.doorTile = { x: tx, y: ty };
    const k = map.key(tx, ty);
    if (door.to) { map.solid[k] = 0; map.doors.set(k, door); }
    else map.interacts.set(k, { type: 'door', door, building: b });
  }
  if (b.light) map.lights.push({ x: (b.x + b.light[0]) * 16 + 8, y: (b.y + b.light[1]) * 16 + 8, r: b.light[2] || 40, warm: true });
  return idx;
}

// ---------- Innenräume ----------
const LEGEND = {
  '#': { g: 'wall' }, '.': { g: 'mosaic' }, ',': { g: 'terracotta' }, '_': { g: 'plain' }, '-': { g: 'wood' },
  '~': { g: 'pool' }, 'g': { g: 'igrass' }, ' ': { g: 'void' }, 'X': { g: 'exit' },
  'C': { prop: 'column' }, 'B': { prop: 'bed', act: 'bed' }, 'm': { prop: 'mat', act: 'bed' },
  'T': { prop: 'table', act: 'table' }, 'K': { prop: 'hearth', act: 'hearth' }, 'L': { prop: 'lararium', act: 'lararium' },
  'S': { prop: 'shelf', act: 'shelf' }, 'P': { prop: 'plant' }, 'W': { prop: 'basin', act: 'wash' },
  'R': { prop: 'couch', act: 'couch' }, 'H': { prop: 'chest', act: 'chest' }, 'M': { prop: 'mill', act: 'mill' },
  'O': { prop: 'oven', act: 'oven' }, '=': { prop: 'counter' }, 'A': { prop: 'amphorae', act: 'shelf' },
};
const FLOOR_CH = new Set(['.', ',', '_', '-', 'g']);

function floorNear(rows, x, y) {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0]]) {
    const c = rows[y + dy] && rows[y + dy][x + dx];
    if (c && FLOOR_CH.has(c)) return LEGEND[c].g;
  }
  return 'plain';
}

export function buildInterior(id, def) {
  const rows = def.layout;
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const map = new GameMap(id, w, h, { interior: true, name: def.name, style: def.style || {} });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = rows[y][x] ?? ' ';
    const L = LEGEND[ch] || LEGEND[' '];
    const k = map.key(x, y);
    const g = L.prop ? floorNear(rows, x, y) : L.g;
    map.ground[k] = tileId(g);
    if (L.prop) map.props.set(k, L.prop);
    map.solid[k] = SOLID_GROUND.has(map.ground[k]) || L.prop ? 1 : 0;
    if (ch === 'X') map.doors.set(k, { exit: true, x, y });
    if (L.act) map.interacts.set(k, { type: L.act });
  }
  for (const [name, at] of Object.entries(def.spawns || {})) map.spawns[name] = at;
  map.areas = def.areas || {};
  map.lights = (def.lights || []).map(([x, y, r]) => ({ x: x * 16 + 8, y: y * 16 + 8, r: r || 44, warm: true }));
  return map;
}
