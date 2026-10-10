// Prozedurale Figuren: 4 Richtungen × 4 Lauf-Frames, niedliche Proportionen mit dunklem Umriss
import { makeCanvas, ctx2d, outline, shade, brush } from './pixel.js';
import { mulberry32, pick } from '../core/rng.js';

export const FW = 16, FH = 22;
export const DIRS = ['down', 'left', 'right', 'up'];
const LONG = new Set(['toga', 'praetexta', 'stola', 'dress', 'cloak']);
const cache = new Map();

export function getSheet(app) {
  const key = JSON.stringify(app);
  if (cache.has(key)) return cache.get(key);
  const sheet = makeCanvas(FW * 4, FH * 4);
  const sctx = ctx2d(sheet);
  for (let d = 0; d < 4; d++) {
    for (let f = 0; f < 4; f++) {
      const fc = makeCanvas(FW, FH);
      const fctx = ctx2d(fc, true);
      if (DIRS[d] === 'right') {
        const tmp = makeCanvas(FW, FH);
        drawFrame(ctx2d(tmp), app, 'left', f);
        fctx.save(); fctx.scale(-1, 1); fctx.drawImage(tmp, -FW, 0); fctx.restore();
      } else drawFrame(fctx, app, DIRS[d], f);
      outline(fc);
      sctx.drawImage(fc, f * FW, d * FH);
    }
  }
  cache.set(key, sheet);
  return sheet;
}

export function drawSprite(ctx, sheet, dir, frame, x, y) {
  const d = Math.max(0, DIRS.indexOf(dir));
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(Math.round(x - 5), Math.round(y - 1), 10, 2);
  ctx.fillRect(Math.round(x - 4), Math.round(y - 2), 8, 1);
  ctx.drawImage(sheet, frame * FW, d * FH, FW, FH, Math.round(x - 8), Math.round(y - 20), FW, FH);
}

const portraitCache = new Map();
export function getPortrait(app) {
  const key = JSON.stringify(app);
  if (portraitCache.has(key)) return portraitCache.get(key);
  const sheet = getSheet(app);
  const c = makeCanvas(16, 15);
  ctx2d(c).drawImage(sheet, 0, 0, 16, 15, 0, 0, 16, 15);
  portraitCache.set(key, c);
  return c;
}

function drawFrame(ctx, a, dir, f) {
  const p = brush(ctx);
  const step = f === 1 ? 1 : f === 3 ? -1 : 0;
  const kid = !!a.kid;
  const HY = kid ? 6 : 3;
  const TT = kid ? 14 : 11;
  const long = LONG.has(a.dress);
  const TB = long ? 18 : 16;
  const skin = a.skin || '#e8b88f', skinD = shade(skin, -0.16);
  const hair = a.hair || '#3d2817';
  const c = a.color || '#a5764b', cD = shade(c, -0.2), cL = shade(c, 0.18);
  const c2 = a.color2 || shade(c, 0.35);
  const sandal = a.barefoot ? skinD : '#6b4226';
  const eye = '#2a1a14';

  // ---- Beine/Füße ----
  if (dir === 'left') {
    if (!long) {
      if (step === 0) { p(skin, 7, 17, 2, 2); p(sandal, 6, 19, 3, 1); }
      else { p(skinD, 9, 17, 2, 2); p(sandal, 9, 19, 2, 1); p(skin, 5, 17, 2, 2); p(sandal, 4, 19, 3, 1); }
    } else if (step === 0) p(sandal, 6, 19, 3, 1);
    else { p(sandal, 9, 19, 2, 1); p(sandal, 4, 19, 3, 1); }
  } else {
    const lUp = step === 1 ? 1 : 0, rUp = step === -1 ? 1 : 0;
    if (!long) { p(skin, 5, 17 - lUp, 2, 2); p(skin, 9, 17 - rUp, 2, 2); }
    p(sandal, 5, 19 - lUp, 2, 1);
    p(sandal, 9, 19 - rUp, 2, 1);
  }

  // ---- Körper ----
  const tx = dir === 'left' ? 5 : 4, tw = dir === 'left' ? 6 : 8;
  p(c, tx, TT, tw, TB - TT + 1);
  if (dir === 'left') p(cD, tx + tw - 1, TT, 1, TB - TT + 1);
  else { p(cD, tx, TT, 1, TB - TT + 1); p(cD, tx + tw - 1, TT, 1, TB - TT + 1); }
  p(cD, tx, TB, tw, 1);
  if (a.dress === 'tunic' || a.dress === 'worker') p(a.belt || '#5a3a22', tx, kid ? TT + 1 : TT + 3, tw, 1);
  if (a.clavus && dir !== 'left') { p('#6b2a5a', 5, TT + 1, 1, TB - TT - 1); p('#6b2a5a', 10, TT + 1, 1, TB - TT - 1); }
  if (a.dress === 'toga' || a.dress === 'praetexta') {
    const fold = shade(c, -0.12);
    if (dir === 'down') {
      for (let i = 0; i < 6; i++) p(fold, 10 - i, TT + 1 + i, 2, 1);
      p(cL, 5, TT + 1, 2, 3);
      if (a.dress === 'praetexta') for (let i = 0; i < 6; i++) p('#6b2a5a', 11 - i, TT + 1 + i, 1, 1);
    } else if (dir === 'up') {
      for (let i = 0; i < 6; i++) p(fold, 5 + i, TT + 1 + i, 2, 1);
    } else {
      p(fold, 7, TT + 1, 1, TB - TT - 1);
      if (a.dress === 'praetexta') p('#6b2a5a', 6, TT + 1, 1, TB - TT - 1);
    }
  }
  if (a.dress === 'stola') {
    p(c2, tx, TT, tw, 2);
    if (dir !== 'left') { p(cD, 7, TT + 3, 1, TB - TT - 3); p(cD, 9, TT + 4, 1, TB - TT - 4); }
  }
  if (a.dress === 'cloak') { p(cD, tx, TT, tw, 2); p(shade(c, -0.35), tx + 1, TT + 4, 1, TB - TT - 4); }
  if (a.dress === 'worker' && dir !== 'left') p(shade(c, -0.1), 4, TT, 8, 1);

  // ---- Arme ----
  const covered = a.dress === 'toga' || a.dress === 'praetexta';
  if (dir === 'left') {
    const ax = 7 - step;
    p(c, ax, TT, 2, 2);
    if (covered) p(c, ax, TT + 2, 2, 3); else p(skin, ax, TT + 2, 2, 3);
    p(cD, ax + 1, TT, 1, 2);
  } else {
    const la = step === 1 ? 1 : 0, ra = step === -1 ? 1 : 0;
    p(c, 3, TT + la, 1, 2); p(skin, 3, TT + 2 + la, 1, 3);
    if (covered && dir === 'down') p(c, 12, TT + ra, 1, 5);
    else { p(c, 12, TT + ra, 1, 2); p(skin, 12, TT + 2 + ra, 1, 3); }
  }

  // ---- Kopf ----
  p(skin, 4, HY + 1, 8, 6); p(skin, 5, HY, 6, 1); p(skin, 5, HY + 7, 6, 1);
  const st = a.style || 'short';
  if (dir === 'down') {
    if (dir === 'down' && !kid) p(skin, 6, TT, 4, 1);
    p(skinD, 4, HY + 5, 1, 2); p(skinD, 11, HY + 5, 1, 2);
    p(eye, 6, HY + 3, 1, 2); p(eye, 9, HY + 3, 1, 2);
    p('rgba(225,105,105,0.5)', 5, HY + 5, 1, 1); p('rgba(225,105,105,0.5)', 10, HY + 5, 1, 1);
    if (st !== 'veil' && st !== 'hood') {
      if (st !== 'bald') { p(hair, 5, HY - 1, 6, 1); p(hair, 4, HY, 8, 2); p(hair, 4, HY + 2, 1, 2); p(hair, 11, HY + 2, 1, 2); p(hair, 6, HY + 2, 2, 1); }
      else { p(hair, 4, HY + 2, 1, 2); p(hair, 11, HY + 2, 1, 2); p(shade(skin, 0.15), 6, HY, 3, 1); }
      if (st === 'long') { p(hair, 3, HY + 1, 1, 8); p(hair, 12, HY + 1, 1, 8); p(hair, 4, HY + 4, 1, 4); p(hair, 11, HY + 4, 1, 4); }
      if (st === 'bun') { p(hair, 6, HY - 3, 4, 2); p(shade(hair, 0.2), 7, HY - 3, 1, 1); p(hair, 4, HY + 4, 1, 1); p(hair, 11, HY + 4, 1, 1); }
      if (st === 'curly') { p(hair, 3, HY, 1, 3); p(hair, 12, HY, 1, 3); for (let i = 0; i < 4; i++) p(hair, 4 + i * 2, HY - 2, 1, 1); }
    } else {
      p(c2, 4, HY - 1, 8, 2); p(c2, 3, HY, 1, 8); p(c2, 12, HY, 1, 8); p(c2, 4, HY + 1, 1, 1); p(c2, 11, HY + 1, 1, 1);
      p(st === 'hood' ? shade(c2, -0.3) : hair, 5, HY + 1, 6, 1);
    }
    if (a.beard) { p(hair, 5, HY + 6, 6, 2); p(hair, 4, HY + 5, 1, 2); p(hair, 11, HY + 5, 1, 2); p(skinD, 7, HY + 6, 2, 1); }
  } else if (dir === 'left') {
    p(skin, 3, HY + 4, 1, 1);
    p(eye, 5, HY + 3, 1, 2);
    p('rgba(225,105,105,0.5)', 5, HY + 5, 1, 1);
    if (st !== 'veil' && st !== 'hood') {
      if (st !== 'bald') { p(hair, 5, HY - 1, 6, 1); p(hair, 4, HY, 8, 2); p(hair, 8, HY + 2, 4, 3); p(hair, 9, HY + 5, 3, 1); }
      else p(hair, 9, HY + 3, 3, 3);
      if (st === 'long') { p(hair, 9, HY + 2, 4, 7); p(hair, 12, HY + 2, 1, 6); }
      if (st === 'bun') { p(hair, 10, HY - 1, 3, 3); p(shade(hair, 0.2), 11, HY - 1, 1, 1); }
      if (st === 'curly') { p(hair, 4, HY - 2, 7, 1); p(hair, 12, HY + 1, 1, 4); }
      p(skin, 8, HY + 3, 1, 2);
    } else {
      p(c2, 4, HY - 1, 9, 2); p(c2, 8, HY + 1, 5, 8); p(c2, 12, HY + 1, 1, 7);
      p(st === 'hood' ? shade(c2, -0.3) : hair, 4, HY + 1, 4, 1);
    }
    if (a.beard) { p(hair, 3, HY + 5, 5, 2); }
  } else {
    if (st !== 'veil' && st !== 'hood') {
      if (st !== 'bald') { p(hair, 5, HY - 1, 6, 1); p(hair, 4, HY, 8, 6); p(hair, 5, HY + 6, 6, 1); }
      else { p(hair, 4, HY + 3, 8, 3); p(shade(skin, 0.15), 6, HY, 3, 1); }
      if (st === 'long') { p(hair, 3, HY + 1, 1, 8); p(hair, 12, HY + 1, 1, 8); p(hair, 4, HY + 6, 8, 4); }
      if (st === 'bun') { p(hair, 6, HY - 3, 4, 3); p(shade(hair, 0.2), 7, HY - 2, 2, 1); }
      if (st === 'curly') { p(hair, 3, HY, 1, 5); p(hair, 12, HY, 1, 5); for (let i = 0; i < 4; i++) p(hair, 4 + i * 2, HY - 2, 1, 1); }
    } else {
      p(c2, 4, HY - 1, 8, 9); p(c2, 3, HY, 1, 8); p(c2, 12, HY, 1, 8); p(c2, 4, TT, 8, 2);
    }
  }
  if (a.hat) { p(a.hat, 4, HY - 2, 8, 2); p(shade(a.hat, -0.2), 4, HY, 8, 1); }
}

// ---------- Zufällige Erscheinungsbilder ----------
export const SKINS = ['#f1c9a5', '#e8b88f', '#d9a47a', '#c68b5e', '#a86f48', '#8a5636', '#6b4027'];
export const HAIRS = ['#2b1d14', '#3d2817', '#5a3a1e', '#7a4a22', '#a0662e', '#c9a35a', '#d8d0c0', '#1c1410', '#8a8070'];
const POOR = ['#8a6b4a', '#a5764b', '#6f7d5a', '#7d6a58', '#9a8a6a', '#7a6248', '#8c7a5c', '#6a5f52'];
const MID = ['#b5523a', '#2e6da4', '#c9a03a', '#5f8a4a', '#9a4a6a', '#d8cfb4', '#a8743f', '#4f7a8a'];

export function randomAppearance(role, seed) {
  const rng = mulberry32(seed);
  const female = role === 'woman' || (role !== 'worker' && role !== 'thief' && role !== 'citizen' && rng() < 0.45);
  const a = { skin: pick(rng, SKINS), hair: pick(rng, HAIRS.slice(0, 7)) };
  if (role === 'child') {
    a.kid = true; a.dress = 'tunic'; a.color = pick(rng, [...POOR, ...MID]); a.style = female ? 'long' : 'short';
    a.hair = pick(rng, HAIRS.slice(0, 6));
  } else if (role === 'thief') {
    a.dress = 'cloak'; a.color = '#3a3440'; a.color2 = '#2a2630'; a.style = 'hood';
  } else if (role === 'worker' || role === 'slave') {
    a.dress = 'worker'; a.color = pick(rng, POOR); a.style = rng() < 0.7 ? 'short' : 'curly';
    if (role === 'slave') a.barefoot = rng() < 0.5;
    if (rng() < 0.15) a.beard = true;
  } else if (female) {
    a.dress = rng() < 0.5 ? 'dress' : 'stola'; a.color = pick(rng, [...POOR, ...MID]); a.color2 = pick(rng, MID);
    a.style = rng() < 0.25 ? 'veil' : pick(rng, ['bun', 'bun', 'long']);
  } else if (role === 'senator') {
    a.dress = rng() < 0.3 ? 'praetexta' : 'toga'; a.color = '#f1ece0'; a.clavus = true; a.style = pick(rng, ['short', 'bald']);
    a.hair = pick(rng, HAIRS);
  } else {
    a.dress = rng() < 0.15 ? 'toga' : 'tunic'; a.color = a.dress === 'toga' ? '#ece6d6' : pick(rng, [...POOR, ...MID]);
    a.style = pick(rng, ['short', 'short', 'curly', 'bald']);
    if (rng() < 0.12) a.beard = true;
    if (a.style === 'bald') a.hair = pick(rng, ['#8a8070', '#d8d0c0', '#3d2817']);
  }
  return a;
}

// ---------- Tiere ----------
const animalCache = new Map();
export function getAnimalSheet(kind, color) {
  const key = kind + color;
  if (animalCache.has(key)) return animalCache.get(key);
  const sheet = makeCanvas(32, 32);
  const sctx = ctx2d(sheet);
  for (let f = 0; f < 2; f++) {
    const fc = makeCanvas(16, 16);
    drawAnimal(ctx2d(fc, true), kind, color, f);
    outline(fc);
    sctx.drawImage(fc, f * 16, 0);
    sctx.save(); sctx.scale(-1, 1); sctx.drawImage(fc, -(f * 16) - 16, 16); sctx.restore();
  }
  animalCache.set(key, sheet);
  return sheet;
}

function drawAnimal(ctx, kind, c, f) {
  const p = brush(ctx);
  const d = shade(c, -0.3), l = shade(c, 0.25);
  if (kind === 'dog') {
    p(c, 3, 8, 9, 4); p(l, 4, 8, 7, 1); p(c, 1, 5, 4, 4); p(d, 2, 4, 2, 2); p(l, 0, 7, 2, 2); p('#222', 0, 7, 1, 1);
    p('#222', 2, 6, 1, 1); p(c, 12, 6, 2, 1); p(c, 13, 5, 1, 1);
    if (f === 0) { p(c, 4, 12, 1, 3); p(c, 6, 12, 1, 3); p(c, 9, 12, 1, 3); p(c, 11, 12, 1, 3); }
    else { p(c, 3, 12, 1, 3); p(c, 7, 12, 1, 3); p(c, 8, 12, 1, 3); p(c, 12, 12, 1, 3); }
  } else if (kind === 'cat') {
    p(c, 4, 9, 7, 3); p(c, 2, 6, 4, 4); p(c, 2, 5, 1, 1); p(c, 5, 5, 1, 1); p('#5a8a3a', 3, 7, 1, 1);
    p(d, 6, 9, 1, 3); p(d, 8, 9, 1, 3);
    p(c, 11, 6, 1, 4); p(c, 12, 5, 1, 1);
    if (f === 0) { p(c, 4, 12, 1, 2); p(c, 9, 12, 1, 2); } else { p(c, 5, 12, 1, 2); p(c, 8, 12, 1, 2); }
  } else if (kind === 'chicken') {
    p(c, 5, 7, 6, 5); p(l, 6, 7, 3, 1); p(c, 4, 4, 3, 4); p('#d33a2a', 4, 3, 2, 1); p('#d33a2a', 4, 7, 1, 1);
    p('#e8a020', 3, 5, 1, 1); p('#222', 5, 5, 1, 1); p(d, 11, 6, 2, 3); p(d, 7, 9, 3, 1);
    if (f === 0) { p('#e8a020', 7, 12, 1, 2); p('#e8a020', 9, 12, 1, 2); } else { p('#e8a020', 6, 12, 1, 2); p('#e8a020', 10, 12, 1, 1); }
  } else if (kind === 'cow') {
    // Rind vom Forum Boarium
    p(c, 2, 5, 12, 6); p(l, 3, 5, 10, 1); p('#f0ece0', 6, 6, 3, 3); p(c, 0, 4, 3, 4); p('#e8c8a8', 0, 6, 2, 2);
    p('#f0ece0', 0, 2, 1, 2); p('#f0ece0', 3, 2, 1, 2); p('#222', 1, 5, 1, 1); p(c, 14, 5, 1, 4);
    if (f === 0) { p(d, 3, 11, 2, 4); p(d, 6, 11, 2, 4); p(d, 10, 11, 2, 4); p(d, 12, 11, 2, 4); }
    else { p(d, 2, 11, 2, 4); p(d, 7, 11, 2, 4); p(d, 9, 11, 2, 4); p(d, 13, 11, 2, 3); }
  } else if (kind === 'donkey') {
    p(c, 3, 6, 10, 5); p(l, 4, 6, 8, 1); p(c, 0, 3, 4, 4); p(c, 1, 0, 1, 3); p(c, 3, 0, 1, 3); p('#e8e0d0', 0, 5, 2, 2);
    p('#222', 2, 4, 1, 1); p(d, 4, 2, 6, 1); p(c, 13, 6, 1, 4);
    if (f === 0) { p(c, 4, 11, 1, 4); p(c, 6, 11, 1, 4); p(c, 10, 11, 1, 4); p(c, 12, 11, 1, 4); }
    else { p(c, 3, 11, 1, 4); p(c, 7, 11, 1, 4); p(c, 9, 11, 1, 4); p(c, 13, 11, 1, 3); }
  }
}
