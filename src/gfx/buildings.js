// Prozedurale Gebäude- und Objektgrafik. g = Bodenebene, o = Überlagerung (Baumkronen, Statuen, Kräne)
import { brush, shade } from './pixel.js';
import { mulberry32, pick } from '../core/rng.js';

const PLASTER = ['#d9b382', '#c98a5e', '#e0c9a0', '#b8754e', '#d6a56f', '#cf9c70', '#e3cfa8'];
const AWNINGS = ['#c0392b', '#2e6da4', '#d4a017', '#3f7f3f', '#8e44ad'];

function roof(p, X, Y, W, H, base = '#b5532f') {
  if (H <= 0) return;
  const dark = shade(base, -0.22), light = shade(base, 0.2);
  p(base, X, Y, W, H);
  for (let xx = 1; xx < W - 1; xx += 4) { p(light, X + xx, Y + 2, 1, H - 3); p(dark, X + xx + 2, Y + 2, 1, H - 3); }
  for (let yy = 6; yy < H - 1; yy += 5) p(dark, X, Y + yy, W, 1);
  p(shade(base, -0.38), X, Y, W, 2);
  p(light, X, Y + 2, W, 1);
  p('rgba(0,0,0,0.35)', X, Y + H - 1, W, 1);
}

function win(p, x, y, w = 3, h = 4) {
  p('#2b1d16', x, y, w, h);
  p('#7a4b2a', x - 1, y, 1, h);
  p('#7a4b2a', x + w, y, 1, h);
  p('rgba(255,255,255,0.18)', x, y + h, w, 1);
}

function speckle(p, rng, X, Y, W, H, colors, n) {
  for (let i = 0; i < n; i++) p(colors[i % colors.length], X + Math.floor(rng() * W), Y + Math.floor(rng() * H));
}

function ellipseFill(p, color, cx, cy, rx, ry) {
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    p(color, Math.round(cx - half), Math.round(cy + dy), half * 2, 1);
  }
}

export function drawBuilding(g, o, b, map) {
  const p = brush(g), q = brush(o);
  const X = b.x * 16, Y = b.y * 16, W = b.w * 16, H = b.h * 16;
  const rng = mulberry32(b.seed || b.x * 7919 + b.y * 131 + 7);
  const st = b.style || {};
  const doorX = b.doorTile ? b.doorTile.x * 16 : X + Math.floor(b.w / 2) * 16;
  const fn = KINDS[b.kind];
  if (!fn) { p('#ff00ff', X, Y, W, H); return; }
  fn({ p, q, X, Y, W, H, rng, st, b, map, doorX });
}

const KINDS = {
  insula({ p, X, Y, W, H, rng, st, b, map, doorX }) {
    const wallC = st.color || pick(rng, PLASTER);
    const roofH = Math.max(14, Math.round(H * 0.3));
    roof(p, X, Y, W, roofH, st.roof || '#b5532f');
    if (rng() < 0.35) { p('#5f8a3a', X + 4 + Math.floor(rng() * (W - 12)), Y + 4, 5, 3); p('#7fae4c', X + 5, Y + 4, 2, 1); }
    const fy = Y + roofH, fh = H - roofH;
    p(wallC, X, fy, W, fh);
    speckle(p, rng, X, fy, W, fh, [shade(wallC, -0.08), shade(wallC, 0.08)], Math.floor(W * fh / 40));
    p(shade(wallC, -0.2), X + W - 2, fy, 2, fh);
    p(shade(wallC, 0.12), X, fy, 1, fh);
    const gfY = Y + H - 14;
    const floors = Math.max(1, Math.floor((gfY - fy - 3) / 9));
    for (let f = 0; f < floors; f++) {
      const wy = fy + 3 + f * 9;
      for (let wx = X + 4; wx < X + W - 5; wx += 8) {
        win(p, wx, wy, 3, 4);
        map.windowLights.push({ x: wx, y: wy, w: 3, h: 4, s: rng() });
      }
    }
    if (floors >= 2 && rng() < 0.6) {
      // Maenianum (hölzerner Balkon)
      const by = fy + 3 + (floors - 1) * 9 + 6;
      p('#6b4426', X + 2, by, W - 4, 2);
      for (let i = X + 3; i < X + W - 3; i += 3) p('#8a5a32', i, by - 3, 1, 3);
      p('#8a5a32', X + 2, by - 3, W - 4, 1);
    }
    p(shade(wallC, -0.3), X, gfY - 1, W, 1);
    // Tabernae im Erdgeschoss
    for (let sx = X + 2; sx + 12 <= X + W - 2; sx += 15) {
      if (Math.abs(sx + 6 - (doorX + 8)) < 13) continue;
      p('#3a2618', sx, gfY + 2, 12, 12);
      p('#8a5a32', sx, gfY + 9, 12, 5);
      p('#a8743f', sx, gfY + 9, 12, 1);
      const goods = ['#7a2230', '#5b6b2a', '#e0c070', '#c46a3a', '#d8d0c0'];
      for (let i = 0; i < 3; i++) p(pick(rng, goods), sx + 2 + i * 3, gfY + 7, 2, 2);
      if (rng() < 0.5) {
        const aw = pick(rng, AWNINGS);
        for (let i = 0; i < 14; i += 2) p(i % 4 ? '#efe4cc' : aw, sx - 1 + i, gfY, 2, 3);
      }
    }
    // Eingang
    p(shade(wallC, 0.15), doorX + 2, gfY + 1, 12, 13);
    p('#4a2c18', doorX + 3, gfY + 2, 10, 12);
    p('#6b4024', doorX + 4, gfY + 3, 8, 11);
    p('#4a2c18', doorX + 8, gfY + 3, 1, 11);
    if (b.door && b.door.to) p('#e3c27a', doorX + 6, gfY + 8, 1, 1);
  },

  domus({ p, X, Y, W, H, rng, st, doorX }) {
    const wallC = st.color || '#ece2c8';
    const facadeH = 14, roofH = H - facadeH;
    roof(p, X, Y, W, roofH, st.roof || '#b9583a');
    // Compluvium: Dachöffnung über dem Atrium
    const cw = Math.max(10, Math.round(W * 0.26)), ch = Math.max(8, Math.round(roofH * 0.34));
    const cx = X + Math.floor((W - cw) / 2), cy = Y + Math.floor((roofH - ch) / 2);
    p('#3a2a20', cx - 1, cy - 1, cw + 2, ch + 2);
    p('#d7cdb6', cx, cy, cw, ch);
    p('#5d9bcc', cx + 3, cy + 2, cw - 6, ch - 4);
    p('#8cc0e3', cx + 4, cy + 3, 2, 1);
    if (W >= 112) {
      // Peristyl-Garten
      const gx = X + 8, gy = Y + 6, gw = Math.round(W * 0.18), gh = Math.max(8, Math.round(roofH * 0.4));
      p('#3a2a20', gx - 1, gy - 1, gw + 2, gh + 2);
      p('#6f9f45', gx, gy, gw, gh);
      p('#4f7f35', gx + 2, gy + 2, 3, 3); p('#4f7f35', gx + gw - 5, gy + gh - 5, 3, 3);
    }
    p(wallC, X, Y + roofH, W, facadeH);
    p(shade(wallC, -0.15), X + W - 2, Y + roofH, 2, facadeH);
    p(st.socle || '#9c3b2b', X, Y + H - 4, W, 4);
    for (let wx = X + 6; wx < X + W - 6; wx += 18) if (Math.abs(wx - doorX - 7) > 12) p('#3a2a20', wx, Y + roofH + 3, 2, 3);
    p('#f4eedc', doorX + 2, Y + roofH, 2, facadeH);
    p('#f4eedc', doorX + 12, Y + roofH, 2, facadeH);
    p('#f4eedc', doorX + 2, Y + roofH, 12, 2);
    p('#5a3420', doorX + 4, Y + roofH + 2, 8, facadeH - 2);
    p('#3e2414', doorX + 8, Y + roofH + 2, 1, facadeH - 2);
    p('#c9a24a', doorX + 6, Y + roofH + 7, 1, 1); p('#c9a24a', doorX + 9, Y + roofH + 7, 1, 1);
  },

  temple(args) { drawTemple(args, false); },
  temple_build(args) { drawTemple(args, true); },

  temple_round({ p, X, Y, W, H, st }) {
    const cx = X + W / 2, rx = W / 2 - 3;
    const baseY = Y + H - 7;
    ellipseFill(p, '#bdb295', cx, baseY + 1, rx + 2, 5);
    ellipseFill(p, '#d6ccb2', cx, baseY - 1, rx + 2, 5);
    const colH = Math.round(H * 0.38), top = baseY - colH;
    p('#e8e0cc', X + 6, top, W - 12, colH);
    p('#3d3026', Math.round(cx - 4), baseY - 12, 8, 12);
    const n = 7;
    for (let i = 0; i < n; i++) {
      const cxx = Math.round(X + 4 + (i * (W - 12)) / (n - 1));
      p('#f6f2e8', cxx, top, 3, colH); p('#cfc8b5', cxx + 2, top, 1, colH);
    }
    const roofC = st.roof || '#a8743f';
    ellipseFill(p, shade(roofC, -0.25), cx, top, rx + 3, 5);
    for (let i = 0; i < 12; i++) {
      const w = Math.round((rx + 2) * (1 - i / 13));
      p(i % 3 === 0 ? shade(roofC, 0.15) : roofC, Math.round(cx - w), top - 2 - i, w * 2, 1);
    }
  },

  basilica({ p, X, Y, W, H, rng, st }) {
    const roofH = Math.round(H * 0.38);
    const stone = st.stone || '#e2d8bf';
    const building = !!st.build;
    if (building) {
      const done = Math.round(W * 0.55);
      roof(p, X, Y, done, roofH, '#b5532f');
      p('#8a6a44', X + done, Y, W - done, roofH);
      for (let xx = X + done; xx < X + W; xx += 6) p('#6b4a2e', xx, Y, 2, roofH);
      for (let yy = Y + 3; yy < Y + roofH; yy += 7) p('#a8743f', X + done, yy, W - done, 1);
    } else roof(p, X, Y, W, roofH, '#b5532f');
    const fy = Y + roofH;
    p(stone, X, fy, W, H - roofH);
    p(shade(stone, -0.15), X, fy, W, 2);
    const midY = fy + Math.round((H - roofH) / 2);
    p(shade(stone, -0.2), X, midY - 1, W, 2);
    for (let ax = X + 3; ax + 7 <= X + W - 2; ax += 10) {
      p('#3d3026', ax, fy + 4, 5, midY - fy - 6);
      p(stone, ax, fy + 4, 1, 1); p(stone, ax + 4, fy + 4, 1, 1);
      p('#2e241c', ax, midY + 3, 7, Y + H - midY - 3);
      p(stone, ax, midY + 3, 1, 1); p(stone, ax + 6, midY + 3, 1, 1);
      p(shade(stone, 0.2), ax + 8, midY + 1, 2, Y + H - midY - 1);
    }
    p(shade(stone, -0.25), X, Y + H - 2, W, 2);
    if (building) {
      for (let sx = X + Math.round(W * 0.55); sx < X + W; sx += 12) {
        p('#7a5232', sx, fy - 10, 2, H - roofH + 10);
      }
      for (let yy = fy - 8; yy < Y + H; yy += 9) p('#9a6b42', X + Math.round(W * 0.55), yy, W - Math.round(W * 0.55), 2);
      speckle(p, rng, X + Math.round(W * 0.6), Y + H - 6, W * 0.35, 4, ['#bdb6a6', '#9a9284'], 12);
    }
  },

  curia({ p, X, Y, W, H }) {
    const brick = '#b9785a';
    const roofH = Math.round(H * 0.42);
    roof(p, X + 2, Y, W - 4, roofH, '#a84f32');
    p(brick, X, Y + roofH, W, H - roofH);
    for (let yy = Y + roofH + 3; yy < Y + H; yy += 4) p(shade(brick, -0.12), X, yy, W, 1);
    p('#e8dcc0', X, Y + roofH, W, 3);
    for (let i = 0; i < 3; i++) p('#3a2a20', X + 8 + i * Math.round((W - 22) / 2), Y + roofH + 6, 5, 7);
    const dx = X + Math.round(W / 2) - 6;
    p('#e8dcc0', dx - 2, Y + H - 16, 16, 16);
    p('#7a5a2a', dx, Y + H - 14, 12, 14);
    p('#a8843f', dx + 5, Y + H - 14, 2, 14);
  },

  tabularium({ p, X, Y, W, H }) {
    const tuff = '#bfae84';
    p(tuff, X, Y, W, H);
    for (let yy = Y; yy < Y + H; yy += 5) p(shade(tuff, -0.12), X, yy, W, 1);
    for (let yy = Y; yy < Y + H; yy += 10) for (let xx = X + ((yy / 5) % 2 ? 6 : 0); xx < X + W; xx += 12) p(shade(tuff, -0.12), xx, yy, 1, 5);
    const ay = Y + Math.round(H * 0.25);
    p('#d8cba2', X, ay - 3, W, 3);
    for (let ax = X + 4; ax + 8 <= X + W; ax += 12) {
      p('#3d3026', ax, ay, 8, 12); p(tuff, ax, ay, 1, 1); p(tuff, ax + 7, ay, 1, 1);
      p('#e0d4ae', ax + 9, ay - 2, 2, 15);
    }
    p('#d8cba2', X, ay + 13, W, 2);
    roof(p, X, Y, W, Math.round(H * 0.2) - 2, '#b5532f');
  },

  construction({ p, X, Y, W, H, rng }) {
    p('#c8a46e', X, Y, W, H);
    p('#a99f8c', X + 2, Y + 4, W - 4, H - 8);
    for (let yy = Y + 4; yy < Y + H - 4; yy += 5) p('#8d8574', X + 2, yy, W - 4, 1);
    for (let sx = X + 2; sx < X + W; sx += 10) p('#7a5232', sx, Y, 2, H);
    for (let yy = Y + 2; yy < Y + H; yy += 8) p('#9a6b42', X, yy, W, 2);
    speckle(p, rng, X, Y + H - 4, W, 4, ['#bdb6a6', '#9a9284'], 10);
  },

  stones({ p, X, Y, W, H, rng }) {
    const n = Math.max(2, Math.round(W / 6));
    for (let i = 0; i < n; i++) {
      const bx = X + 1 + Math.floor(rng() * (W - 9)), by = Y + 4 + Math.floor(rng() * (H - 10));
      p('#8d877a', bx, by + 3, 8, 6); p('#c9c2b2', bx, by, 8, 4); p('#ddd6c6', bx, by, 8, 1);
    }
  },

  drums({ p, X, Y, W, H }) {
    for (let i = 0; i < Math.floor(W / 7); i++) {
      const dx = X + 2 + i * 7, dy = Y + H - 9;
      ellipseFill(p, '#cfc8b5', dx + 3, dy + 4, 3, 3);
      ellipseFill(p, '#f2eee4', dx + 3, dy + 2, 3, 2);
    }
  },

  crane({ p, q, X, Y, W, H }) {
    // Tretradkran (Vitruv, De architectura X)
    const cx = X + 8, cy = Y + H - 10;
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      p('#7a5232', Math.round(cx + Math.cos(ang) * 8), Math.round(cy + Math.sin(ang) * 8), 2, 2);
    }
    for (let a = 0; a < 4; a++) {
      const ang = (a / 4) * Math.PI;
      for (let r = -7; r <= 7; r += 1) p('#9a6b42', Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r));
    }
    for (let i = 0; i < 40; i++) {
      q('#6b4a2e', X + 14 + Math.round(i * 0.35), Y + H - 8 - i, 2, 1);
      q('#6b4a2e', X + 22 - Math.round(i * 0.1), Y + H - 8 - i, 2, 1);
    }
    q('#d8d0c0', X + 27, Y + H - 47, 1, 20);
    q('#a99f8c', X + 24, Y + H - 28, 7, 5);
  },

  scaffold({ p, X, Y, W, H }) {
    for (let sx = X + 1; sx < X + W; sx += 8) p('#7a5232', sx, Y, 2, H);
    for (let yy = Y + 3; yy < Y + H; yy += 7) p('#9a6b42', X, yy, W, 2);
  },

  rostra({ p, X, Y, W, H }) {
    p('#e2d8bf', X, Y, W, H - 8);
    p('#cfc4a8', X, Y + H - 8, W, 8);
    p('#b9ad8f', X, Y + H - 2, W, 2);
    for (let i = X + 2; i < X + W - 2; i += 3) p('#8a7a5a', i, Y + 1, 1, 3);
    p('#8a7a5a', X + 1, Y + 1, W - 2, 1);
    // Bronzene Schiffsschnäbel (rostra)
    for (let bx = X + 4; bx < X + W - 6; bx += 10) {
      p('#6f5a2a', bx, Y + H - 7, 6, 2); p('#6f5a2a', bx + 1, Y + H - 5, 4, 2); p('#6f5a2a', bx + 2, Y + H - 3, 2, 1);
      p('#a8843f', bx, Y + H - 7, 6, 1);
    }
  },

  stall({ p, X, Y, W, H, rng, st }) {
    const aw = st.awning || pick(rng, AWNINGS);
    // Markise und Pfosten auf dem Tile dahinter (Händler steht darunter)
    p('#6b4426', X + 1, Y - 14, 2, 18); p('#6b4426', X + W - 3, Y - 14, 2, 18);
    for (let i = 0; i < W; i += 4) p((i / 4) % 2 ? '#f0e6d0' : aw, X + i, Y - 16, 4, 6);
    for (let i = 0; i < W; i += 4) p((i / 4) % 2 ? '#f0e6d0' : aw, X + i + 1, Y - 10, 2, 1);
    p('#8a5a32', X, Y + 4, W, H - 4);
    p('#a8743f', X, Y + 4, W, 2);
    p('#6b4426', X, Y + H - 2, W, 2);
    const goodsColors = {
      olives: ['#5b6b2a', '#3e4a1c', '#7a8a3a'], wine: ['#7a2230', '#c9a06a', '#5a1020'],
      veg: ['#5f9a3a', '#e07a2a', '#d8c060', '#8a3a6a'], bread: ['#c98a3a', '#e0b060'],
      fish: ['#9ab0c0', '#c8d8e0', '#8a5a2a'], oil: ['#c9b23a', '#e0d070', '#a8743f'],
      cheese: ['#f0d880', '#e8c860', '#f4eedc'], lamps: ['#b06a3a', '#c9a24a', '#8a4a2a'],
    }[st.goods] || ['#c98a3a', '#5b6b2a', '#7a2230'];
    for (let i = 0; i < Math.floor(W / 3); i++) {
      const gx = X + 1 + i * 3, gy = Y + 1 + (i % 2);
      p(goodsColors[i % goodsColors.length], gx, gy, 3, 3);
      p('rgba(255,255,255,0.3)', gx, gy, 1, 1);
    }
  },

  fountain({ p, X, Y, W, H }) {
    // Lacus: öffentliches Brunnenbecken mit Speier
    const sx = X + Math.round(W / 2) - 4;
    p('#cfc6ae', sx, Y, 8, 14); p('#e4dcc6', sx, Y, 8, 2); p('#b5ab92', sx + 6, Y, 2, 14);
    p('#6f8f6a', sx + 2, Y + 5, 4, 3); p('#3a3a3a', sx + 3, Y + 7, 2, 1);
    p('#8cc0e3', sx + 3, Y + 8, 2, 9);
    const by = Y + H - 14;
    p('#b8ae96', X + 1, by, W - 2, 14);
    p('#e4dcc6', X + 1, by, W - 2, 2);
    p('#4f8fc0', X + 3, by + 3, W - 6, 8);
    p('#79b2dc', X + 5, by + 4, 6, 1); p('#79b2dc', X + W - 12, by + 8, 5, 1);
    p('#d8eef5', sx + 2, by + 3, 4, 2);
    p('#9a917a', X + 1, Y + H - 2, W - 2, 2);
  },

  shrine({ p, X, Y, W, H }) {
    // Compitum-Schrein / Aedicula
    p('#cfc6ae', X + 2, Y + H - 6, W - 4, 6);
    p('#e4dcc6', X + 3, Y + 6, W - 6, H - 12);
    p('#a3392c', X + 5, Y + 9, W - 10, H - 18);
    p('#e3c27a', X + 6, Y + 12, 2, 5); p('#e3c27a', X + W - 8, Y + 12, 2, 5);
    for (let i = 0; i < 5; i++) p('#e4dcc6', X + 3 + i, Y + 5 - i, W - 6 - i * 2, 1);
    p('#b5532f', X + 2, Y + 4, W - 4, 2);
  },

  altar({ p, X, Y, W, H }) {
    p('#d6ccb2', X + 3, Y + 5, W - 6, H - 6);
    p('#efe9dc', X + 2, Y + 4, W - 4, 2);
    p('#bdb295', X + 2, Y + H - 2, W - 4, 2);
    p('#e8902a', X + 6, Y + 1, 4, 3); p('#f4d24a', X + 7, Y + 2, 2, 2);
  },

  statue({ p, q, X, Y, st }) {
    const c = st.color || '#7d7354';
    p('#d6ccb2', X + 3, Y + 4, 10, 12); p('#efe9dc', X + 2, Y + 3, 12, 2); p('#bdb295', X + 3, Y + 14, 10, 2);
    q(c, X + 6, Y - 14, 4, 17); q(shade(c, 0.2), X + 6, Y - 14, 1, 17);
    q(c, X + 5, Y - 17, 6, 4); q(shade(c, -0.2), X + 9, Y - 10, 3, 1);
    q(c, X + 10, Y - 13, 1, 6);
  },

  equestrian({ p, q, X, Y, W, st }) {
    const c = st.color || '#8a7a4a';
    p('#d6ccb2', X + 2, Y + 4, W - 4, 12); p('#efe9dc', X + 1, Y + 3, W - 2, 2);
    q(c, X + 6, Y - 10, 18, 8); q(c, X + 22, Y - 15, 5, 7); q(c, X + 24, Y - 17, 3, 3);
    q(c, X + 7, Y - 2, 2, 6); q(c, X + 21, Y - 2, 2, 6); q(c, X + 12, Y - 3, 2, 6);
    q(c, X + 13, Y - 22, 5, 12); q(c, X + 14, Y - 26, 4, 4);
    q(shade(c, 0.25), X + 6, Y - 10, 18, 1);
  },

  pine({ p, q, X, Y }) {
    // Pinie (Pinus pinea) – Schirmkrone
    p('#6b4a2e', X + 7, Y, 3, 14); p('#4f3620', X + 9, Y, 1, 14);
    p('rgba(0,0,0,0.18)', X + 2, Y + 12, 13, 3);
    q('#6b4a2e', X + 7, Y - 16, 3, 16);
    ellipseFill(q, '#2f5222', X + 8, Y - 20, 17, 7);
    ellipseFill(q, '#3f6b2e', X + 8, Y - 22, 16, 6);
    ellipseFill(q, '#4f7f35', X + 6, Y - 24, 11, 3);
    for (let i = 0; i < 8; i++) q('#5f9a3a', X - 6 + i * 4, Y - 25 + (i % 2), 2, 1);
  },

  cypress({ p, q, X, Y }) {
    p('#4f3620', X + 7, Y + 8, 2, 6);
    p('rgba(0,0,0,0.18)', X + 3, Y + 12, 10, 3);
    for (let i = 0; i < 34; i++) {
      const w = Math.round(5 * Math.sin((i / 34) * Math.PI) + 1);
      q(i % 4 === 0 ? '#3d6a3a' : '#2f5a32', X + 8 - w, Y + 10 - i, w * 2, 1);
    }
    q('#4a7f44', X + 6, Y - 14, 1, 12);
  },

  olive({ p, q, X, Y }) {
    p('#6b5a3e', X + 7, Y + 2, 3, 12); p('#6b5a3e', X + 5, Y + 4, 2, 2);
    p('rgba(0,0,0,0.18)', X + 2, Y + 12, 13, 3);
    ellipseFill(q, '#6f8a4a', X + 8, Y - 2, 10, 8);
    ellipseFill(q, '#86a05f', X + 7, Y - 4, 7, 5);
    for (let i = 0; i < 9; i++) q('#a8bf84', X + 1 + ((i * 5) % 14), Y - 8 + ((i * 3) % 10), 1, 1);
  },

  bush({ p }) { /* wird unten überschrieben */ },

  hut({ p, X, Y, W, H }) {
    // Casa Romuli: strohgedeckte Hütte
    p('#8a6a44', X + 4, Y + H - 14, W - 8, 12);
    for (let i = 0; i < W - 8; i += 3) p('#6f5434', X + 4 + i, Y + H - 14, 1, 12);
    for (let i = 0; i < H - 10; i++) {
      const w = Math.round((W / 2) * Math.sqrt(Math.min(1, (i + 2) / (H - 12))));
      p(i % 3 ? '#c9a75a' : '#a8873e', X + W / 2 - w, Y + i, w * 2, 1);
    }
    p('#3a2a20', X + W / 2 - 4, Y + H - 11, 8, 10);
  },

  horrea({ p, X, Y, W, H }) {
    const brick = '#a65a3c';
    const roofH = Math.round(H * 0.35);
    roof(p, X, Y, W, roofH, '#9c4a2e');
    p(brick, X, Y + roofH, W, H - roofH);
    for (let yy = Y + roofH + 2; yy < Y + H; yy += 3) p(shade(brick, -0.1), X, yy, W, 1);
    for (let wx = X + 6; wx < X + W - 6; wx += 12) p('#2b1d16', wx, Y + roofH + 4, 2, 5);
    const dx = X + Math.round(W / 2) - 7;
    p('#d8cba2', dx - 1, Y + H - 15, 16, 15);
    p('#4a2c18', dx + 1, Y + H - 13, 12, 13);
  },

  wall({ p, X, Y, W, H }) {
    const tuff = '#c4b186';
    p(tuff, X, Y, W, H);
    for (let yy = Y + 3; yy < Y + H; yy += 5) p(shade(tuff, -0.15), X, yy, W, 1);
    for (let yy = Y; yy < Y + H; yy += 10) for (let xx = X + (yy % 20 ? 5 : 0); xx < X + W; xx += 10) p(shade(tuff, -0.15), xx, yy, 1, 5);
    p(shade(tuff, 0.15), X, Y, W, 2);
    p('rgba(0,0,0,0.3)', X, Y + H - 2, W, 2);
  },

  gate({ p, X, Y, W, H }) {
    KINDS.wall({ p, X, Y, W, H });
    p('#2e241c', X + 4, Y + 4, W - 8, H - 4);
    p('#c4b186', X + 4, Y + 4, 2, 2); p('#c4b186', X + W - 6, Y + 4, 2, 2);
  },

  circus_n({ p, X, Y, W, H }) {
    for (let yy = 0; yy < H; yy += 3) {
      p(yy < 6 ? '#bfae84' : '#c8a878', X, Y + yy, W, 2);
      p('#8a6a44', X, Y + yy + 2, W, 1);
    }
    p('#a99467', X, Y, W, 4);
    for (let xx = X + 6; xx < X + W; xx += 24) p('#6b4a2e', xx, Y + 4, 1, H - 4);
  },

  circus_s({ p, X, Y, W, H }) {
    for (let yy = 0; yy < H; yy += 3) {
      p(yy > H - 7 ? '#bfae84' : '#c8a878', X, Y + yy, W, 2);
      p('#a8875a', X, Y + yy + 2, W, 1);
    }
    p('#8a6a44', X, Y, W, 1);
  },

  carceres({ p, X, Y, W, H }) {
    p('#d8cba2', X, Y, W, H);
    for (let yy = Y + 3; yy < Y + H - 5; yy += 10) {
      p('#7a4b2a', X + W - 9, yy, 7, 7);
      p('#5a3420', X + W - 6, yy, 1, 7);
      p('#e8dcc0', X + W - 10, yy - 1, 9, 1);
    }
    roof(p, X, Y, Math.max(6, W - 12), H, '#b5532f');
  },

  spina({ p, X, Y, W, H }) {
    p('#d8cfb4', X + 10, Y + 4, W - 20, H - 8);
    p('#efe9dc', X + 10, Y + 4, W - 20, 2);
    p('#b9ae93', X + 10, Y + H - 6, W - 20, 2);
    // Metae (Wendemarken): je drei vergoldete Kegel
    for (const mx of [X + 2, X + W - 10]) {
      p('#bdb295', mx - 1, Y + H - 6, 10, 4);
      for (let i = 0; i < 3; i++) {
        const cx = mx + i * 3;
        for (let k = 0; k < 10; k++) p(k < 2 ? '#f0d070' : '#c9a24a', cx + 1 - (k > 6 ? 1 : 0), Y + H - 7 - (10 - k), k > 6 ? 3 : 1, 1);
      }
    }
    // Ova (Eier als Rundenzähler, seit 174 v. Chr.)
    const ox = X + Math.round(W * 0.3);
    p('#8a6a44', ox, Y + 2, 2, 8); p('#8a6a44', ox + 22, Y + 2, 2, 8); p('#8a6a44', ox, Y + 2, 24, 1);
    for (let i = 0; i < 7; i++) { p('#f4eedc', ox + 2 + i * 3, Y + 4, 2, 3); }
    for (let sx = X + Math.round(W * 0.5); sx < X + W - 30; sx += 40) {
      p('#a3392c', sx, Y + 3, 6, 6); p('#e4dcc6', sx - 1, Y + 2, 8, 2);
    }
  },

  amphorae({ p, X, Y }) {
    for (let i = 0; i < 3; i++) {
      const ax = X + 2 + i * 4, ay = Y + 3 + (i % 2) * 2;
      p('#b0603a', ax, ay + 2, 4, 7); p('#c97a4a', ax, ay + 2, 1, 6);
      p('#b0603a', ax + 1, ay, 2, 2); p('#b0603a', ax + 1, ay + 9, 2, 2);
    }
  },

  crates({ p, X, Y }) {
    p('#9a6b42', X + 2, Y + 4, 12, 10); p('#7f5634', X + 2, Y + 8, 12, 1);
    p('#b8844f', X + 2, Y + 4, 12, 1); p('#7f5634', X + 7, Y + 4, 1, 10);
  },

  thermopolium(args) {
    KINDS.insula(args);
    const { p, X, Y, W, H } = args;
    // L-förmige Theke mit eingelassenen Dolia
    const cy = Y + H - 9;
    p('#e3dccb', X + 2, cy, W - 4, 9);
    for (let i = 0; i < W - 6; i += 3) p(['#a3392c', '#3f6b8a', '#d4a017', '#5f7a52'][(i / 3) % 4], X + 3 + i, cy + 4, 2, 2);
    for (let i = 0; i < 3; i++) { p('#4a3424', X + 8 + i * 14, cy + 1, 6, 2); p('#2b1d16', X + 9 + i * 14, cy + 1, 4, 1); }
  },

  bench({ p, X, Y }) {
    p('#d6ccb2', X + 1, Y + 8, 14, 3); p('#bdb295', X + 2, Y + 11, 2, 4); p('#bdb295', X + 12, Y + 11, 2, 4);
  },

  column({ p, q, X, Y }) {
    p('#d6ccb2', X + 3, Y + 10, 10, 6);
    q('#f6f2e8', X + 5, Y - 20, 6, 30); q('#cfc8b5', X + 10, Y - 20, 1, 30); q('#efe9dc', X + 4, Y - 22, 8, 3);
  },
};

KINDS.bush = function ({ p, X, Y, rng }) {
  ellipseFill(p, '#3f6b2e', X + 8, Y + 9, 7, 6);
  ellipseFill(p, '#5a8a3a', X + 7, Y + 7, 5, 3);
  if (rng() < 0.4) { p('#e85a5a', X + 5, Y + 8, 1, 1); p('#e85a5a', X + 10, Y + 10, 1, 1); }
};

function drawTemple({ p, q, X, Y, W, H, st, rng }, building) {
  const marble = st.marble || '#efe9dc', col = '#f6f2e8', colD = '#cfc8b5';
  const stairH = 9, entH = 3;
  const colH = Math.max(16, Math.round(H * 0.3));
  const pedH = Math.min(14, Math.max(6, Math.round(W * 0.14)));
  const yStairs = Y + H - stairH;
  const yCols = yStairs - colH;
  const yEnt = yCols - entH;
  const yPed = yEnt - pedH;
  if (building) {
    // Rohbau: Podium mit Gerüst, Säulenstümpfe
    p('#c8a46e', X, Y, W, H);
    p('#a99f8c', X + 2, Y + 6, W - 4, H - 6);
    for (let yy = Y + 8; yy < Y + H; yy += 5) p('#8d8574', X + 2, yy, W - 4, 1);
    for (let yy = Y + 6; yy < Y + H; yy += 10) for (let xx = X + 2 + ((yy / 5) % 2 ? 6 : 0); xx < X + W - 2; xx += 12) p('#8d8574', xx, yy, 1, 5);
    const n = st.cols || 8;
    for (let i = 0; i < n; i++) {
      const cx = X + 6 + Math.round((i * (W - 16)) / (n - 1));
      const ch = 8 + Math.floor(rng() * 14);
      p(col, cx, yStairs - ch, 5, ch); p(colD, cx + 4, yStairs - ch, 1, ch);
    }
    for (let sx = X + 2; sx < X + W; sx += 12) { q('#7a5232', sx, Y - 8, 2, H - stairH + 8); }
    for (let yy = Y - 6; yy < yStairs; yy += 9) q('#9a6b42', X, yy, W, 2);
    const sw = Math.round(W * 0.6), sx = X + Math.floor((W - sw) / 2);
    p('#bdb6a6', X, yStairs, W, stairH);
    for (let i = 0; i < stairH; i += 3) p('#d6d0c0', sx, yStairs + i, sw, 1);
    return;
  }
  roof(p, X + 3, Y, W - 6, yEnt - Y, st.roof || '#b9583a');
  for (let i = 0; i < pedH; i++) {
    const half = Math.round((W / 2 - 1) * ((i + 1) / pedH));
    p(marble, Math.round(X + W / 2 - half), yPed + i, half * 2, 1);
    p(colD, Math.round(X + W / 2 - half), yPed + i, 1, 1);
    p(colD, Math.round(X + W / 2 + half - 1), yPed + i, 1, 1);
    if (i > 2 && i < pedH - 1) {
      const ih = Math.round((W / 2 - 6) * ((i - 2) / pedH));
      if (ih > 0) p(shade(marble, -0.1), Math.round(X + W / 2 - ih), yPed + i, ih * 2, 1);
    }
  }
  p(marble, X + 1, yEnt, W - 2, entH);
  p(colD, X + 1, yEnt + entH - 1, W - 2, 1);
  p('#3d3026', X + 4, yCols, W - 8, colH);
  p('#5a4636', X + Math.round(W / 2) - 5, yCols + colH - 14, 10, 14);
  const n = st.cols || Math.max(4, Math.min(8, Math.floor(W / 11)));
  for (let i = 0; i < n; i++) {
    const cx = X + 4 + Math.round((i * (W - 12)) / (n - 1));
    p(col, cx, yCols, 4, colH);
    p(colD, cx + 3, yCols, 1, colH);
    p(marble, cx - 1, yCols, 6, 2);
    p(colD, cx - 1, yCols + colH - 2, 6, 2);
  }
  const sw = Math.round(W * 0.62), sx = X + Math.floor((W - sw) / 2);
  p('#cfc6ae', X, yStairs, W, stairH);
  p('#b5ab92', X, yStairs, 2, stairH); p('#b5ab92', X + W - 2, yStairs, 2, stairH);
  for (let i = 0; i < stairH; i += 2) { p(marble, sx, yStairs + i, sw, 1); p(colD, sx, yStairs + i + 1, sw, 1); }
}
