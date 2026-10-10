// Haupt-Renderer: virtuelle Pixelauflösung, Kamera, Zeichenreihenfolge
import { TARGET_VIEW_WIDTH } from '../core/config.js';
import { Lighting } from './lighting.js';
import { hash2 } from '../core/rng.js';
import { T } from '../world/tiles.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0 };
    this.lighting = new Lighting();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const W = window.innerWidth, H = window.innerHeight;
    // Auf schmalen Bildschirmen (Handy) größere Pixel, damit Figuren gut erkennbar bleiben
    const target = W < 700 ? TARGET_VIEW_WIDTH / 2 : TARGET_VIEW_WIDTH;
    let scale = Math.max(1, Math.round(W / target));
    while (scale > 1 && H / scale < 200) scale--;
    this.scale = scale;
    this.vw = Math.ceil(W / scale);
    this.vh = Math.ceil(H / scale);
    this.canvas.width = this.vw;
    this.canvas.height = this.vh;
    this.canvas.style.width = `${this.vw * scale}px`;
    this.canvas.style.height = `${this.vh * scale}px`;
    this.ctx.imageSmoothingEnabled = false;
    this.lighting.resize(this.vw, this.vh);
  }

  follow(map, x, y, snap = false) {
    const pw = map.w * 16, ph = map.h * 16;
    let tx = x - this.vw / 2, ty = y - 10 - this.vh / 2;
    tx = pw <= this.vw ? (pw - this.vw) / 2 : Math.max(0, Math.min(pw - this.vw, tx));
    ty = ph <= this.vh ? (ph - this.vh) / 2 : Math.max(0, Math.min(ph - this.vh, ty));
    if (snap) { this.cam.x = tx; this.cam.y = ty; }
    else { this.cam.x += (tx - this.cam.x) * 0.2; this.cam.y += (ty - this.cam.y) * 0.2; }
  }

  draw(map, entities, light, lights, t, hour, afterLight) {
    const { ctx, vw, vh } = this;
    const cam = { x: Math.round(this.cam.x), y: Math.round(this.cam.y) };
    ctx.fillStyle = '#120c08';
    ctx.fillRect(0, 0, vw, vh);
    ctx.drawImage(map.canvas, -cam.x, -cam.y);
    this.waterSparkles(map, cam, t);
    entities.sort((a, b) => a.y - b.y);
    for (const e of entities) e.draw(ctx, cam, t);
    ctx.drawImage(map.overlay, -cam.x, -cam.y);
    this.lighting.render(ctx, vw, vh, light, lights, cam, t, map.interior ? null : map.windowLights, hour);
    if (afterLight) afterLight(ctx, cam);
  }

  waterSparkles(map, cam, t) {
    if (!map.water.length) return;
    const x0 = Math.max(0, Math.floor(cam.x / 16)), y0 = Math.max(0, Math.floor(cam.y / 16));
    const x1 = Math.min(map.w - 1, Math.ceil((cam.x + this.vw) / 16)), y1 = Math.min(map.h - 1, Math.ceil((cam.y + this.vh) / 16));
    const phase = Math.floor(t * 2.5);
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(230,245,255,0.85)';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (map.ground[y * map.w + x] !== T.water) continue;
      const h = hash2(x, y, phase);
      if (h < 0.18) {
        const sx = x * 16 + Math.floor(hash2(x, y, phase + 99) * 13) - cam.x, sy = y * 16 + Math.floor(h * 70) % 13 - cam.y;
        ctx.fillRect(sx, sy, 2, 1);
      }
    }
  }
}
