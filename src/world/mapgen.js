// Baut Karten aus den JSON-Daten: Außenkarte (Operationen + Gebäude + Füllbebauung) und Innenräume (ASCII-Layouts)
import { GameMap } from './gamemap.js';
import { T, SOLID_GROUND, tileId } from './tiles.js';
import { mulberry32, pick, rint } from '../core/rng.js';

const FILL_BUILDABLE = new Set([T.grass, T.hill, T.field]);
const SCATTER_OK = new Set([T.grass, T.hill, T.field, T.garden]);

export function buildExterior(def) {
  const map = new GameMap(def.id, def.w, def.h, { name: def.name, style: def.style });
  map.ground.fill(tileId(def.base || 'grass'));
  for (const op of def.ops || []) applyOp(map, op);
  for (const t of map.ground.keys()) if (SOLID_GROUND.has(map.ground[t])) map.solid[t] = 1;

  const reserved = new Set();
  (def.buildings || []).forEach((b) => placeBuilding(map, { ...b }, reserved));

  const rng = mulberry32(def.seed || 1234);
  for (const f of def.fills || []) {
    if (f.op === 'blocks') fillBlocks(map, f, rng, reserved);
    else if (f.op === 'scatter') scatter(map, f, rng, reserved);
  }

  map.zones = def.zones || [];
  map.areas = def.areas || {};
  map.spawns = def.spawns || {};
  map.lights = (def.lights || []).map(([x, y, r]) => ({ x: x * 16 + 8, y: y * 16 + 8, r: r || 40, warm: true }));
  for (let i = 0; i < map.ground.length; i++) if (map.ground[i] === T.water) map.water.push(i);
  return map;
}

function setTile(map, x, y, t, only) {
  if (!map.inside(x, y)) return;
  const k = map.key(x, y);
  if (only && !only.has(map.ground[k])) return;
  map.ground[k] = t;
}

function applyOp(map, op) {
  const only = op.only ? new Set(op.only.map(tileId)) : null;
  const t = op.tile ? tileId(op.tile) : null;
  switch (op.op) {
    case 'rect': {
      const [x, y, w, h] = op.r;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setTile(map, xx, yy, t, only);
      break;
    }
    case 'ellipse': {
      const [x, y, w, h] = op.r;
      const cx = x + w / 2, cy = y + h / 2;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
        const dx = (xx + 0.5 - cx) / (w / 2), dy = (yy + 0.5 - cy) / (h / 2);
        if (dx * dx + dy * dy <= 1) setTile(map, xx, yy, t, only);
      }
      break;
    }
    case 'line': {
      const w = op.w || 1;
      const lo = -Math.floor((w - 1) / 2), hi = Math.floor(w / 2);
      for (let i = 0; i < op.pts.length - 1; i++) {
        const [x0, y0] = op.pts[i], [x1, y1] = op.pts[i + 1];
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 || 1;
        for (let s = 0; s <= steps; s++) {
          const x = Math.round(x0 + ((x1 - x0) * s) / steps), y = Math.round(y0 + ((y1 - y0) * s) / steps);
          for (let oy = lo; oy <= hi; oy++) for (let ox = lo; ox <= hi; ox++) setTile(map, x + ox, y + oy, t, only);
        }
      }
      break;
    }
    case 'plateau': {
      // Hügel: Oberfläche „hill“, Ränder „rim“ (nicht begehbar), Südseite sichtbare Felswand „cliff“
      const [x, y, w, h] = op.r;
      const face = op.face ?? 2;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
        let tt = T.hill;
        if (yy >= y + h - face) tt = T.cliff;
        else if (xx === x || xx === x + w - 1 || yy === y) tt = T.rim;
        setTile(map, xx, yy, tt);
      }
      break;
    }
    default:
      console.warn('Unbekannte Karten-Operation', op.op);
  }
}

export function placeBuilding(map, b, reserved) {
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
    if (reserved) { reserved.add(map.key(tx, ty + 1)); reserved.add(map.key(tx, ty + 2)); }
  }
  if (b.light) map.lights.push({ x: (b.x + b.light[0]) * 16 + 8, y: (b.y + b.light[1]) * 16 + 8, r: b.light[2] || 40, warm: true });
  return idx;
}

function areaFree(map, x, y, w, h, reserved) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    if (!map.inside(xx, yy)) return false;
    const k = map.key(xx, yy);
    if (map.solid[k] || map.bidx[k] >= 0 || reserved.has(k)) return false;
    if (!FILL_BUILDABLE.has(map.ground[k])) return false;
  }
  return true;
}

function fillBlocks(map, f, rng, reserved) {
  const [rx, ry, rw, rh] = f.r;
  const gap = f.gap ?? 1;
  let y = ry;
  while (y < ry + rh) {
    const bh = rint(rng, f.bh[0], f.bh[1]);
    let x = rx + (rng() < 0.5 ? 0 : 1);
    while (x < rx + rw) {
      const bw = rint(rng, f.bw[0], f.bw[1]);
      // +1 Zeile unten frei lassen, damit die Gasse vor der Tür begehbar bleibt
      if (x + bw <= rx + rw && y + bh <= ry + rh && rng() < (f.chance ?? 1) && areaFree(map, x, y, bw, bh + 1, reserved)) {
        placeBuilding(map, { kind: pick(rng, f.kinds), x, y, w: bw, h: bh, filler: true, seed: Math.floor(rng() * 1e6) }, reserved);
        x += bw + gap;
      } else x += 1;
    }
    y += bh + gap;
  }
  if (f.ground) {
    const g = tileId(f.ground);
    for (let yy = ry; yy < ry + rh; yy++) for (let xx = rx; xx < rx + rw; xx++) {
      if (!map.inside(xx, yy)) continue;
      const k = map.key(xx, yy);
      if (map.bidx[k] < 0 && FILL_BUILDABLE.has(map.ground[k])) map.ground[k] = g;
    }
  }
}

function scatter(map, f, rng, reserved) {
  const [rx, ry, rw, rh] = f.r;
  let placed = 0;
  for (let tries = 0; tries < f.n * 12 && placed < f.n; tries++) {
    const x = rx + Math.floor(rng() * rw), y = ry + Math.floor(rng() * rh);
    let ok = true;
    for (let yy = y - 1; yy <= y + 1 && ok; yy++) for (let xx = x - 1; xx <= x + 1; xx++) {
      if (!map.inside(xx, yy)) { ok = false; break; }
      const k = map.key(xx, yy);
      if (map.solid[k] || map.bidx[k] >= 0 || reserved.has(k) || !SCATTER_OK.has(map.ground[k])) { ok = false; break; }
    }
    if (!ok) continue;
    placeBuilding(map, { kind: pick(rng, f.kinds), x, y, w: 1, h: 1, filler: true, seed: Math.floor(rng() * 1e6) }, reserved);
    placed++;
  }
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
  map.exit = def.exit || null;
  return map;
}
