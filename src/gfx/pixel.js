// Kleine Grafik-Helfer für Pixel-Art im Code
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function ctx2d(c, readback = false) {
  const x = c.getContext('2d', readback ? { willReadFrequently: true } : undefined);
  x.imageSmoothingEnabled = false;
  return x;
}

export function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

// amt < 0 dunkler, amt > 0 heller
export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  if (amt < 0) return rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
  return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
}

export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

// Zeichnet einen dunklen 1-px-Umriss um alle deckenden Pixel
export function outline(canvas, color = '#2b1b12') {
  const c = ctx2d(canvas, true);
  const { width: w, height: h } = canvas;
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  const out = new Uint8ClampedArray(d);
  const [r, g, b] = hexToRgb(color);
  const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] > 0) continue;
    if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) {
      out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
    }
  }
  img.data.set(out);
  c.putImageData(img, 0, 0);
}

// Pinsel-Objekt: kurze Schreibweise für Rechtecke
export function brush(ctx) {
  return (color, x, y, w = 1, h = 1) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
}
