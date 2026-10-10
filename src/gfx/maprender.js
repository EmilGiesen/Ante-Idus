// Rendert eine Karte einmalig in zwei Offscreen-Canvases: Boden/Gebäude und Überlagerung
import { makeCanvas, ctx2d } from './pixel.js';
import { drawTile } from './tileart.js';
import { drawBuilding } from './buildings.js';
import { drawProp } from './props.js';

export function renderMap(map) {
  const W = map.w * 16, H = map.h * 16;
  map.canvas = makeCanvas(W, H);
  map.overlay = makeCanvas(W, H);
  const g = ctx2d(map.canvas), o = ctx2d(map.overlay);
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) drawTile(g, map, x, y);
  for (const [k, kind] of map.props) {
    const x = k % map.w, y = Math.floor(k / map.w);
    drawProp(g, o, map, x, y, kind);
  }
  const order = [...map.buildings].sort((a, b) => a.y + a.h - (b.y + b.h));
  for (const b of order) drawBuilding(g, o, b, map);
}
