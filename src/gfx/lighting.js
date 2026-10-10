// Tag-Nacht-Licht: Farbton, Dunkelheit mit ausgeschnittenen Lichtquellen und warmem Schein
import { makeCanvas, ctx2d } from './pixel.js';

export class Lighting {
  constructor() {
    this.canvas = makeCanvas(1, 1);
    this.ctx = ctx2d(this.canvas);
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  render(ctx, vw, vh, light, lights, cam, time, windowLights, hour) {
    if (light.tint) {
      const [r, g, b, a] = light.tint;
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.fillRect(0, 0, vw, vh);
    }
    const dark = light.dark;
    if (dark <= 0.01) return;
    const l = this.ctx;
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, vw, vh);
    l.fillStyle = `rgba(8,10,32,${dark})`;
    l.fillRect(0, 0, vw, vh);
    l.globalCompositeOperation = 'destination-out';
    const visible = [];
    for (const L of lights) {
      const x = L.x - cam.x, y = L.y - cam.y;
      const r = L.r * (L.flicker === false ? 1 : 1 + 0.05 * Math.sin(time * 9 + L.x * 0.13));
      if (x < -r || y < -r || x > vw + r || y > vh + r) continue;
      const g = l.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.45, 'rgba(0,0,0,0.75)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = g;
      l.fillRect(x - r, y - r, r * 2, r * 2);
      if (L.warm) visible.push({ x, y, r });
    }
    l.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.canvas, 0, 0);
    // Warmer Feuerschein
    ctx.globalCompositeOperation = 'lighter';
    for (const v of visible) {
      const g = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, v.r * 0.8);
      g.addColorStop(0, `rgba(255,150,60,${0.22 * dark})`);
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(v.x - v.r, v.y - v.r, v.r * 2, v.r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    // Erleuchtete Fenster: je später die Nacht, desto weniger
    if (windowLights && dark > 0.35) {
      const share = hour < 15 ? 0.45 : hour < 18 ? 0.2 : 0.06;
      for (const w of windowLights) {
        if (w.s > share) continue;
        const x = w.x - cam.x, y = w.y - cam.y;
        if (x < -4 || y < -4 || x > vw || y > vh) continue;
        ctx.fillStyle = 'rgba(255,190,90,0.85)';
        ctx.fillRect(x, y + 1, w.w, w.h - 1);
        ctx.fillStyle = 'rgba(255,170,70,0.18)';
        ctx.fillRect(x - 2, y - 1, w.w + 4, w.h + 3);
      }
    }
  }
}
