// Chunk-Rendering: Die Karte wird in Blöcken à 32×32 Tiles gezeichnet – nur bei Bedarf und mit Zwischenspeicher.
import { makeCanvas, ctx2d } from './pixel.js';
import { drawTile } from './tileart.js';
import { drawBuilding } from './buildings.js';
import { drawProp } from './props.js';
import { T } from '../world/tiles.js';

export const CHUNK = 32;
const CPX = CHUNK * 16;
const MAX_CHUNKS = 24;

export function prepareMap(map) {
  map.chunks = new Map();
  map.chunkTick = 0;
  map.cw = Math.ceil(map.w / CHUNK);
  map.chh = Math.ceil(map.h / CHUNK);
  // Räumlicher Index: welche Gebäude ragen in welchen Chunk (inkl. Kronen/Dächer oberhalb)
  map.bIndex = new Map();
  map.buildings.forEach((b, i) => {
    const x0 = Math.floor((b.x - 2) / CHUNK), x1 = Math.floor((b.x + b.w + 2) / CHUNK);
    const y0 = Math.floor((b.y - 4) / CHUNK), y1 = Math.floor((b.y + b.h + 1) / CHUNK);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const k = cy * 1000 + cx;
      if (!map.bIndex.has(k)) map.bIndex.set(k, []);
      map.bIndex.get(k).push(i);
    }
  });
  map.mini = buildMiniImage(map);
}

export function getChunk(map, cx, cy) {
  const key = cy * 1000 + cx;
  let c = map.chunks.get(key);
  if (!c) {
    c = renderChunk(map, cx, cy);
    map.chunks.set(key, c);
    if (map.chunks.size > MAX_CHUNKS) {
      let oldK = null, oldT = Infinity;
      for (const [k, v] of map.chunks) if (v.used < oldT) { oldT = v.used; oldK = k; }
      map.chunks.delete(oldK);
    }
  }
  c.used = ++map.chunkTick;
  return c;
}

export const hasChunk = (map, cx, cy) => map.chunks.has(cy * 1000 + cx);

function renderChunk(map, cx, cy) {
  const g = makeCanvas(CPX, CPX), o = makeCanvas(CPX, CPX);
  const gc = ctx2d(g), oc = ctx2d(o);
  const ox = cx * CPX, oy = cy * CPX;
  gc.translate(-ox, -oy);
  oc.translate(-ox, -oy);
  const x0 = cx * CHUNK, y0 = cy * CHUNK;
  const x1 = Math.min(map.w, x0 + CHUNK), y1 = Math.min(map.h, y0 + CHUNK);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) drawTile(gc, map, x, y);
  for (const [k, kind] of map.props) {
    const x = k % map.w, y = Math.floor(k / map.w);
    if (x >= x0 - 1 && x <= x1 && y >= y0 - 1 && y <= y1 + 1) drawProp(gc, oc, map, x, y, kind);
  }
  map.winSink = [];
  const list = (map.bIndex.get(cy * 1000 + cx) || []).map((i) => map.buildings[i]);
  list.sort((a, b) => a.y + a.h - (b.y + b.h) || a.x - b.x);
  for (const b of list) drawBuilding(gc, oc, b, map);
  const windows = map.winSink.filter((w) => w.x >= ox && w.x < ox + CPX && w.y >= oy && w.y < oy + CPX);
  map.winSink = null;
  return { g, o, windows, x: ox, y: oy, used: 0 };
}

// Sichtbare Chunks für einen Kamera-Ausschnitt
export function visibleChunks(map, cam, vw, vh) {
  const out = [];
  const cx0 = Math.max(0, Math.floor(cam.x / CPX)), cy0 = Math.max(0, Math.floor(cam.y / CPX));
  const cx1 = Math.min(map.cw - 1, Math.floor((cam.x + vw) / CPX)), cy1 = Math.min(map.chh - 1, Math.floor((cam.y + vh) / CPX));
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) out.push([cx, cy]);
  return out;
}

// Vorausladen: höchstens einen fehlenden Nachbar-Chunk pro Bild zeichnen
export function prefetchChunk(map, cam, vw, vh) {
  const cx0 = Math.floor(cam.x / CPX) - 1, cy0 = Math.floor(cam.y / CPX) - 1;
  const cx1 = Math.floor((cam.x + vw) / CPX) + 1, cy1 = Math.floor((cam.y + vh) / CPX) + 1;
  for (let cy = Math.max(0, cy0); cy <= Math.min(map.chh - 1, cy1); cy++) {
    for (let cx = Math.max(0, cx0); cx <= Math.min(map.cw - 1, cx1); cx++) {
      if (!hasChunk(map, cx, cy)) { getChunk(map, cx, cy); return; }
    }
  }
}

// ---------- Kartenbild für Minikarte und Stadtplan (1 Pixel pro Tile) ----------
const MINI_COLORS = {
  [T.grass]: '#86b04f', [T.hill]: '#8fae55', [T.field]: '#a8c066', [T.dirt]: '#c8a46e', [T.paved]: '#6e6a72',
  [T.forum]: '#e2d5b0', [T.sand]: '#e3c98d', [T.water]: '#3f7fb5', [T.cliff]: '#8a6644', [T.garden]: '#5f8a3a',
  [T.cobble]: '#9b8566', [T.plaza]: '#d8cfb4', [T.rim]: '#6a7f3a', [T.stairs]: '#cfc4a8', [T.bridge]: '#b9ae93',
  [T.marble]: '#efe9dc', [T.mud]: '#a58f66', [T.slope]: '#7a9a48', [T.citywall]: '#4a3a2a', [T.wood]: '#9a6b42',
  [T.wall]: '#4a3226', [T.mosaic]: '#e8e0cc', [T.terracotta]: '#b4664a', [T.plain]: '#a89478', [T.pool]: '#5d9bcc',
  [T.igrass]: '#7fae4c', [T.void]: '#120c08', [T.exit]: '#f2c14e',
};
const KIND_COLORS = {
  temple: '#f2ede0', temple_round: '#f2ede0', temple_build: '#c9b48a', basilica: '#e8dcc0', curia: '#b9785a',
  insula: '#b5532f', domus: '#c4643f', horrea: '#9c4a2e', thermopolium: '#b5532f', tower: '#4a3a2a',
  pine: '#2f5222', cypress: '#2f5a32', olive: '#6f8a4a', bush: '#3f6b2e', theater: '#d8cba2', colonnade: '#e8dcc0',
  circus_n: '#c8a878', circus_s: '#c8a878', carceres: '#d8cba2', spina: '#d8cfb4', tomb: '#d6ccb2',
  saepta: '#a8743f', gatearch: null, sign: null, litter: '#a3392c',
};

function buildMiniImage(map) {
  const c = makeCanvas(map.w, map.h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(map.w, map.h);
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const cache = {};
  for (let i = 0; i < map.ground.length; i++) {
    const t = map.ground[i];
    let col = MINI_COLORS[t] || '#ff00ff';
    const bi = map.bidx[i];
    if (bi >= 0) {
      const kc = KIND_COLORS[map.buildings[bi].kind];
      if (kc) col = kc; else if (kc === undefined) col = '#8a7a6a';
    }
    const rgb = cache[col] || (cache[col] = hex(col));
    img.data[i * 4] = rgb[0]; img.data[i * 4 + 1] = rgb[1]; img.data[i * 4 + 2] = rgb[2]; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
