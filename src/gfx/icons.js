// Gegenstands-Icons (16×16), im Code gezeichnet
import { makeCanvas, ctx2d, outline, shade, brush } from './pixel.js';

const cache = new Map();

export function getIcon(item) {
  const key = item.icon + (item.c || '');
  if (cache.has(key)) return cache.get(key);
  const c = makeCanvas(16, 16);
  const p = brush(ctx2d(c, true));
  const col = item.c || '#b0603a', d = shade(col, -0.3), l = shade(col, 0.3);
  switch (item.icon) {
    case 'loaf':
      // Panis quadratus mit acht Kerben (wie in Pompeji gefunden)
      p('#b9783a', 2, 5, 12, 8); p('#c98a3a', 3, 4, 10, 1); p('#c98a3a', 3, 13, 10, 1);
      p('#e0b060', 4, 6, 8, 3); p('#8a5228', 8, 4, 1, 10); p('#8a5228', 2, 9, 12, 1);
      p('#8a5228', 4, 6, 1, 1); p('#8a5228', 11, 6, 1, 1); p('#8a5228', 4, 11, 1, 1); p('#8a5228', 11, 11, 1, 1);
      break;
    case 'bowl':
      p('#a0603a', 2, 8, 12, 4); p('#7f4a2a', 4, 12, 8, 2); p(col, 3, 6, 10, 3); p(l, 4, 6, 4, 1);
      break;
    case 'wedge':
      p('#f0d880', 2, 7, 12, 6); p('#e8c860', 2, 12, 12, 1);
      for (let i = 0; i < 5; i++) p('#f4e8a8', 3 + i * 2, 6 - (i > 2 ? 1 : 0), 10 - i * 2, 1);
      p('#d8b050', 5, 9, 2, 2); p('#d8b050', 10, 10, 1, 1);
      break;
    case 'amphora':
      p(col, 5, 4, 6, 8); p(l, 6, 5, 1, 6); p(col, 6, 2, 4, 2); p(d, 6, 12, 4, 2); p(d, 7, 14, 2, 1);
      p(col, 4, 3, 1, 4); p(col, 11, 3, 1, 4); p('#e8dcc0', 5, 7, 6, 1);
      break;
    case 'jar':
      p(col, 4, 5, 8, 9); p(l, 5, 6, 2, 6); p(d, 4, 13, 8, 1); p(shade(col, -0.15), 5, 3, 6, 2); p('#e8dcc0', 5, 2, 6, 1);
      break;
    case 'jug':
      p(col, 4, 6, 8, 8); p(l, 5, 7, 2, 5); p(col, 6, 3, 4, 3); p(d, 11, 5, 2, 5); p(d, 4, 13, 8, 1);
      break;
    case 'cup':
      p('#a0603a', 4, 6, 8, 7); p('#c07a4a', 4, 6, 8, 1); p('#7f4a2a', 5, 12, 6, 2); p(col, 5, 7, 6, 1);
      break;
    case 'sack':
      p('#c9a870', 3, 5, 10, 9); p('#b0905a', 3, 12, 10, 2); p('#a08050', 6, 3, 4, 2); p('#e8d8a8', 5, 7, 2, 4);
      p('#e0c070', 6, 2, 1, 1); p('#e0c070', 9, 2, 1, 1);
      break;
    case 'tablet':
      p('#8a5a32', 2, 3, 12, 10); p('#3a2a1e', 3, 4, 10, 8); p('#5a4a3e', 4, 6, 7, 1); p('#5a4a3e', 4, 8, 6, 1);
      p('#5a4a3e', 4, 10, 5, 1); p('#c0392b', 11, 10, 2, 2);
      break;
    case 'lamp':
      p('#b06a3a', 3, 8, 9, 4); p('#c98a5a', 4, 8, 6, 1); p('#b06a3a', 11, 9, 3, 2); p('#8a4a2a', 1, 9, 2, 2);
      p('#f4d24a', 13, 6, 2, 3); p('#e8902a', 13, 8, 2, 1);
      break;
    case 'torch':
      p('#6b4426', 7, 6, 3, 9); p('#8a5a32', 7, 6, 1, 9); p('#e8902a', 6, 2, 5, 5); p('#f4d24a', 7, 3, 3, 3);
      break;
    case 'shell':
      p('#b8b0a8', 2, 6, 12, 7); p('#d8d0c8', 3, 6, 10, 2); p('#8a8078', 3, 9, 10, 1); p('#f0e8e0', 5, 7, 3, 1);
      break;
    case 'eggs':
      p('#a0603a', 2, 9, 12, 4); p('#f4eedc', 3, 6, 4, 4); p('#f4eedc', 8, 5, 4, 5); p('#e8dcc0', 6, 7, 3, 3);
      break;
    case 'fruit':
      for (const [x, y] of [[3, 6], [8, 5], [5, 9], [10, 9]]) { p(col, x, y, 4, 4); p(l, x + 1, y + 1, 1, 1); }
      break;
    case 'basket':
      p('#b8904a', 2, 7, 12, 7); for (let i = 3; i < 14; i += 2) p('#8a6a34', i, 7, 1, 7);
      p('#8a6a34', 4, 3, 8, 1); p('#8a6a34', 4, 3, 1, 4); p('#8a6a34', 11, 3, 1, 4);
      p('#c98a3a', 4, 5, 4, 3); p('#c9b23a', 9, 5, 3, 3);
      break;
    case 'fish':
      p(col, 2, 6, 10, 5); p(l, 3, 6, 7, 1); p(col, 12, 5, 3, 7); p('#222', 4, 7, 1, 1); p(d, 2, 10, 10, 1);
      break;
    case 'rod':
      for (let i = 0; i < 12; i++) p('#8a5a32', 2 + i, 13 - i, 2, 1);
      p('#e8e0cc', 14, 2, 1, 10); p('#c0392b', 13, 11, 3, 2);
      break;
    case 'brazier':
      p('#5a565c', 3, 8, 10, 4); p('#3a363c', 4, 12, 2, 3); p('#3a363c', 10, 12, 2, 3); p('#e8902a', 5, 5, 6, 3); p('#f4d24a', 7, 4, 2, 2);
      break;
    case 'sandal':
      p('#7a5232', 3, 4, 7, 10); p('#5a3a22', 4, 6, 5, 1); p('#5a3a22', 4, 9, 5, 1); p('#9a6b42', 5, 2, 3, 2);
      break;
    case 'herbs':
      p('#3f6b2e', 6, 4, 2, 10); p('#5f9a3a', 3, 4, 4, 3); p('#5f9a3a', 8, 6, 5, 3); p('#5f9a3a', 3, 9, 4, 3); p('#8a5a32', 5, 13, 4, 2);
      break;
    case 'garlic':
      p('#f0ece0', 4, 6, 8, 8); p('#d8d0c0', 5, 12, 6, 2); p('#e8e0d0', 7, 3, 2, 3); p('#c8c0b0', 8, 7, 1, 6);
      break;
    case 'stamp':
      p('#b0603a', 3, 4, 10, 9); p('#c97a4a', 3, 4, 10, 2); p('#8a4a2a', 5, 7, 6, 3); p('#e8dcc0', 6, 8, 1, 1); p('#e8dcc0', 8, 8, 1, 1);
      break;
    case 'coin':
      p(col, 4, 4, 8, 8); p(l, 5, 4, 6, 1); p(d, 4, 11, 8, 1); p(d, 7, 6, 2, 4);
      break;
    case 'furniture':
      p('#8a5a32', 2, 6, 12, 6); p('#a8743f', 2, 6, 12, 2); p('#6b4426', 3, 12, 2, 3); p('#6b4426', 11, 12, 2, 3);
      break;
    case 'seed':
      p('#c9a870', 4, 5, 8, 9); p('#a08050', 4, 12, 8, 2); p('#5f9a3a', 7, 2, 2, 4); p('#5f9a3a', 5, 3, 2, 2);
      break;
    case 'scroll':
      p('#e8dcc0', 3, 4, 10, 8); p('#c9b089', 3, 4, 10, 1); p('#8a5a32', 2, 3, 2, 10); p('#8a5a32', 12, 3, 2, 10);
      break;
    default:
      p('#ff00ff', 4, 4, 8, 8);
  }
  outline(c);
  cache.set(key, c);
  return c;
}
