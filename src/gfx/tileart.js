// Zeichnet Boden-Tiles (16×16) prozedural mit deterministischem Rauschen
import { T } from '../world/tiles.js';
import { hash2 } from '../core/rng.js';
import { brush } from './pixel.js';

const WALL_STYLES = {
  red: { face: '#a3392c', frame: '#e3c27a', dado: '#2e2420', top: '#4a3226' },
  ochre: { face: '#c9913f', frame: '#7a2f22', dado: '#3a2a20', top: '#4a3226' },
  plain: { face: '#cdb48e', frame: '#b49a74', dado: '#8a7458', top: '#4b3a2c' },
  green: { face: '#5f7a52', frame: '#e3c27a', dado: '#2e2420', top: '#3e3226' },
};

const isWaterish = (t) => t === T.water || t === T.bridge;
const isHillish = (t) => t === T.hill || t === T.rim || t === T.cliff || t === T.stairs;

export function drawTile(ctx, map, tx, ty) {
  const t = map.tileAt(tx, ty);
  const x = tx * 16, y = ty * 16;
  const p = brush(ctx);
  const r = (i) => hash2(tx, ty, i);
  const speck = (colors, n, seed = 1) => {
    for (let i = 0; i < n; i++) {
      p(colors[i % colors.length], x + Math.floor(r(seed + i * 3) * 16), y + Math.floor(r(seed + i * 3 + 1) * 16));
    }
  };
  const tufts = (c, n, seed) => {
    for (let i = 0; i < n; i++) {
      const gx = x + 1 + Math.floor(r(seed + i * 5) * 13), gy = y + 2 + Math.floor(r(seed + i * 5 + 1) * 12);
      p(c, gx, gy, 1, 2); p(c, gx + 2, gy, 1, 2); p(c, gx + 1, gy + 1);
    }
  };

  switch (t) {
    case T.grass:
    case T.field: {
      p(t === T.field ? '#9cba5c' : '#86b04f', x, y, 16, 16);
      speck(['#77a046', '#95c05c', '#6f9a41'], 14, 10);
      tufts(t === T.field ? '#86a64a' : '#6c9940', 2, 50);
      if (r(7) < 0.09) {
        const fc = ['#f4f0e0', '#f2d24a', '#e88aa0', '#c7a3e8'][Math.floor(r(8) * 4)];
        const fx = x + 3 + Math.floor(r(9) * 10), fy = y + 3 + Math.floor(r(11) * 10);
        p(fc, fx - 1, fy); p(fc, fx + 1, fy); p(fc, fx, fy - 1); p(fc, fx, fy + 1); p('#e0a030', fx, fy);
      }
      break;
    }
    case T.hill: {
      p('#8fae55', x, y, 16, 16);
      speck(['#7f9e4a', '#a0bf64', '#789645'], 14, 20);
      tufts('#738f42', 2, 60);
      if (r(5) < 0.05) { p('#b9b2a0', x + 6, y + 9, 3, 2); p('#d6d0c0', x + 6, y + 9, 2, 1); }
      break;
    }
    case T.rim: {
      p('#8fae55', x, y, 16, 16);
      speck(['#7f9e4a', '#a0bf64'], 10, 20);
      const out = (dx, dy) => !isHillish(map.tileAt(tx + dx, ty + dy));
      // niedrige Brüstung / Hangkante
      if (out(0, -1)) { p('#6a7f3a', x, y, 16, 3); p('#4d5c2a', x, y, 16, 1); }
      if (out(-1, 0)) { p('#6a7f3a', x, y, 3, 16); p('#4d5c2a', x, y, 1, 16); }
      if (out(1, 0)) { p('#6a7f3a', x + 13, y, 3, 16); p('#4d5c2a', x + 15, y, 1, 16); }
      if (out(0, 1)) { p('#6a7f3a', x, y + 13, 16, 3); p('#4d5c2a', x, y + 15, 16, 1); }
      break;
    }
    case T.cliff: {
      p('#a07a52', x, y, 16, 16);
      for (let i = 0; i < 4; i++) p('#8a6644', x, y + 3 + i * 4, 16, 1);
      speck(['#b48c62', '#7f5e3e', '#c29a6c'], 12, 30);
      if (r(3) < 0.5) p('#6e5034', x + Math.floor(r(4) * 12) + 2, y + 2, 1, 6);
      if (isHillish(map.tileAt(tx, ty - 1)) && map.tileAt(tx, ty - 1) !== T.cliff) {
        p('#8fae55', x, y, 16, 3); p('#6a7f3a', x, y + 3, 16, 1);
        p('#7f9e4a', x + 3, y + 3, 2, 2); p('#7f9e4a', x + 10, y + 3, 1, 3);
      }
      if (map.tileAt(tx, ty + 1) !== T.cliff) p('rgba(40,25,10,0.35)', x, y + 13, 16, 3);
      break;
    }
    case T.dirt: {
      p('#c8a46e', x, y, 16, 16);
      speck(['#b08d5a', '#dcc08c', '#bb9763'], 12, 40);
      if (r(2) < 0.3) { p('#a7845a', x + 4 + Math.floor(r(3) * 8), y + 4 + Math.floor(r(6) * 8), 2, 1); }
      break;
    }
    case T.mud: {
      p('#a58f66', x, y, 16, 16);
      speck(['#8d7853', '#b8a27a', '#7f6a48'], 14, 45);
      break;
    }
    case T.paved: {
      // Basaltpflaster der Straßen (polygonale Steine)
      p('#57535c', x, y, 16, 16);
      const cols = ['#7a7680', '#837f8a', '#6d6973', '#8c8893', '#75717c'];
      const off = (ty % 2) * 4;
      for (let row = 0; row < 2; row++) for (let c = -1; c < 3; c++) {
        const sx = x + c * 8 + off + (row ? 4 : 0), sy = y + row * 8;
        const cx0 = Math.max(x, sx + 1), cx1 = Math.min(x + 16, sx + 7);
        if (cx1 <= cx0) continue;
        const col = cols[Math.floor(hash2(tx * 4 + c, ty * 2 + row, 5) * cols.length)];
        p(col, cx0, sy + 1, cx1 - cx0, 6);
        p('#9a96a0', cx0, sy + 1, cx1 - cx0, 1);
      }
      break;
    }
    case T.forum: {
      // Travertinplatten
      p('#e2d5b0', x, y, 16, 16);
      p('#c9b98f', x, y + 15, 16, 1);
      p('#c9b98f', x + ((ty % 2) ? 0 : 8), y, 1, 16);
      p('#eadfc0', x, y, 16, 1);
      speck(['#d6c8a0', '#efe5ca'], 6, 70);
      break;
    }
    case T.plaza: {
      p('#d8cfb4', x, y, 16, 16);
      for (let i = 0; i < 16; i += 4) { p('#c8bd9e', x + i, y, 1, 16); p('#c8bd9e', x, y + i, 16, 1); }
      speck(['#e4dcc4', '#c2b696'], 5, 75);
      break;
    }
    case T.cobble: {
      p('#8f7a5d', x, y, 16, 16);
      for (let i = 0; i < 9; i++) {
        const sx = x + (i % 3) * 5 + Math.floor(r(80 + i) * 2), sy = y + Math.floor(i / 3) * 5 + Math.floor(r(90 + i) * 2);
        p(r(100 + i) < 0.5 ? '#a8916f' : '#9c8664', sx, sy, 4, 4);
        p('#b8a17d', sx, sy, 3, 1);
      }
      break;
    }
    case T.sand: {
      p('#e3c98d', x, y, 16, 16);
      speck(['#d1b578', '#efd9a4', '#c9ad70'], 14, 110);
      if (r(1) < 0.15) p('#cfb27a', x, y + 7, 16, 1);
      break;
    }
    case T.water: {
      p('#3f7fb5', x, y, 16, 16);
      if (r(1) < 0.5) p('#3a76aa', x + 2, y + 2, 10, 5);
      for (let i = 0; i < 2; i++) {
        const wx = x + Math.floor(r(120 + i) * 11), wy = y + 3 + Math.floor(r(130 + i) * 10);
        p('#5d9bcc', wx, wy, 4, 1); p('#5d9bcc', wx + 1, wy - 1, 2, 1);
      }
      const edge = (dx, dy) => !isWaterish(map.tileAt(tx + dx, ty + dy));
      if (edge(0, -1)) { p('#d8eef5', x, y, 16, 1); p('#7fb6d9', x, y + 1, 16, 2); }
      if (edge(0, 1)) { p('#7fb6d9', x, y + 14, 16, 2); }
      if (edge(-1, 0)) { p('#7fb6d9', x, y, 2, 16); p('#d8eef5', x, y, 1, 16); }
      if (edge(1, 0)) { p('#7fb6d9', x + 14, y, 2, 16); p('#d8eef5', x + 15, y, 1, 16); }
      break;
    }
    case T.bridge: {
      p('#b9ae93', x, y, 16, 16);
      for (let i = 0; i < 16; i += 4) p('#a99e83', x, y + i, 16, 1);
      if (isWaterish(map.tileAt(tx, ty - 1))) { p('#8f8670', x, y, 16, 3); p('#d0c6aa', x, y, 16, 1); }
      if (isWaterish(map.tileAt(tx, ty + 1))) { p('#8f8670', x, y + 13, 16, 3); p('#6f6750', x, y + 15, 16, 1); }
      break;
    }
    case T.stairs: {
      p('#cfc4a8', x, y, 16, 16);
      for (let i = 0; i < 16; i += 3) { p('#a99d80', x, y + i + 2, 16, 1); p('#e6dcc2', x, y + i, 16, 1); }
      break;
    }
    case T.garden: {
      p('#6e5236', x, y, 16, 16);
      speck(['#5b432c', '#7d5f40'], 8, 140);
      for (let i = 0; i < 3; i++) {
        const gx = x + 2 + Math.floor(r(150 + i) * 11), gy = y + 2 + Math.floor(r(160 + i) * 11);
        p('#4f8a3a', gx, gy, 3, 3); p('#6fae4c', gx, gy, 2, 1);
        p(['#e85a5a', '#f2d24a', '#f4f0e0', '#c46ad8'][Math.floor(r(170 + i) * 4)], gx + 1, gy + 1);
      }
      break;
    }
    case T.marble: {
      p('#efe9dc', x, y, 16, 16);
      p('#ddd5c4', x, y + 15, 16, 1); p('#ddd5c4', x + 15, y, 1, 16);
      if (r(1) < 0.4) { p('#d6cdbb', x + 3, y + 5, 5, 1); p('#d6cdbb', x + 7, y + 6, 3, 1); }
      break;
    }
    // ---------- Innenräume ----------
    case T.wall: {
      const S = WALL_STYLES[map.style.wall] || WALL_STYLES.plain;
      const below = map.tileAt(tx, ty + 1);
      if (below !== T.wall && below !== T.void) {
        // Wandfront mit Wandmalerei (Pompejanischer Stil)
        p(S.top, x, y, 16, 3);
        p(S.face, x, y + 3, 16, 13);
        p(S.frame, x + 2, y + 5, 12, 1); p(S.frame, x + 2, y + 5, 1, 6); p(S.frame, x + 13, y + 5, 1, 6);
        p(S.frame, x + 2, y + 11, 12, 1);
        if (r(1) < 0.3) { p('#f0e0b0', x + 7, y + 7, 2, 2); }
        p(S.dado, x, y + 12, 16, 4);
        p('rgba(0,0,0,0.25)', x, y + 15, 16, 1);
      } else {
        p(S.top, x, y, 16, 16);
        p('rgba(255,255,255,0.05)', x, y, 16, 1);
        speck(['#3e2a1f', '#55392b'], 6, 180);
      }
      break;
    }
    case T.mosaic: {
      p('#e8e0cc', x, y, 16, 16);
      for (let i = 1; i < 16; i += 4) for (let j = 1; j < 16; j += 4) p('#cfc5ad', x + i, y + j);
      p('#2e2a26', x, y, 16, 1); p('#2e2a26', x, y, 1, 16);
      p('#2e2a26', x + 6, y + 6, 4, 4); p('#e8e0cc', x + 7, y + 7, 2, 2);
      break;
    }
    case T.terracotta: {
      p('#b4664a', x, y, 16, 16);
      speck(['#e9dcc4', '#9c5440', '#c47a5c'], 12, 200);
      break;
    }
    case T.plain: {
      p('#a89478', x, y, 16, 16);
      speck(['#978368', '#b8a487', '#8d7a60'], 12, 210);
      break;
    }
    case T.wood: {
      p('#9a6b42', x, y, 16, 16);
      for (let i = 0; i < 16; i += 4) p('#7f5634', x, y + i, 16, 1);
      p('#7f5634', x + ((ty * 5) % 12) + 2, y, 1, 4);
      break;
    }
    case T.pool: {
      // Impluvium: Wasserbecken mit Marmorrand
      p('#5d9bcc', x, y, 16, 16);
      p('#79b2dc', x + 3, y + 5, 5, 1); p('#79b2dc', x + 8, y + 10, 4, 1);
      const e = (dx, dy) => map.tileAt(tx + dx, ty + dy) !== T.pool;
      if (e(0, -1)) p('#ece6d6', x, y, 16, 3);
      if (e(0, 1)) p('#d5ccb8', x, y + 13, 16, 3);
      if (e(-1, 0)) p('#ece6d6', x, y, 3, 16);
      if (e(1, 0)) p('#d5ccb8', x + 13, y, 3, 16);
      break;
    }
    case T.igrass: {
      p('#7fae4c', x, y, 16, 16);
      speck(['#6c9940', '#93c05e'], 12, 220);
      tufts('#5f8a38', 2, 230);
      break;
    }
    case T.exit: {
      p('#2a1c14', x, y, 16, 16);
      p('#4a3426', x, y, 16, 2);
      p('#c9b089', x, y + 14, 16, 2);
      p('#e9d6a8', x + 6, y + 6, 4, 1); p('#e9d6a8', x + 7, y + 7, 2, 1);
      p('#e9d6a8', x + 6, y + 9, 4, 1); p('#e9d6a8', x + 7, y + 10, 2, 1);
      break;
    }
    case T.void:
    default:
      p('#120c08', x, y, 16, 16);
  }
}
