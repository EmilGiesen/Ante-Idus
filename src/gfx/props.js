// Einrichtungsgegenstände in Innenräumen (je ein Tile, Nachbarn werden für mehrteilige Objekte berücksichtigt)
import { brush } from './pixel.js';

export function drawProp(g, o, map, tx, ty, kind) {
  const p = brush(g), q = brush(o);
  const X = tx * 16, Y = ty * 16;
  const same = (dx, dy) => map.props.get(map.key(tx + dx, ty + dy)) === kind;
  switch (kind) {
    case 'column':
      p('rgba(0,0,0,0.2)', X + 3, Y + 12, 11, 3);
      p('#d6ccb2', X + 3, Y + 11, 10, 4);
      p('#f6f2e8', X + 5, Y, 6, 12); p('#cfc8b5', X + 10, Y, 1, 12);
      q('#f6f2e8', X + 5, Y - 14, 6, 14); q('#cfc8b5', X + 10, Y - 14, 1, 14);
      q('#efe9dc', X + 4, Y - 16, 8, 3);
      break;
    case 'bed': {
      const head = !same(0, -1);
      p('#6b4426', X + 1, Y + (head ? 2 : 0), 14, head ? 14 : 15);
      p('#e8dcc0', X + 2, Y + (head ? 3 : 0), 12, head ? 12 : 13);
      if (head) { p('#f4eedc', X + 3, Y + 4, 10, 4); p('#a3392c', X + 2, Y + 9, 12, 6); }
      else { p('#a3392c', X + 2, Y, 12, 11); p('#c0503a', X + 2, Y + 3, 12, 1); }
      break;
    }
    case 'mat': {
      const head = !same(0, -1);
      p('#b8a070', X + 2, Y + (head ? 3 : 0), 12, head ? 13 : 13);
      for (let i = 0; i < 12; i += 2) p('#a08858', X + 2 + i, Y + (head ? 3 : 0), 1, 13);
      if (head) p('#8a7a5a', X + 3, Y + 4, 10, 3);
      else p('#7a6a4a', X + 2, Y + 2, 12, 8);
      break;
    }
    case 'table':
      p('rgba(0,0,0,0.2)', X + 2, Y + 12, 13, 3);
      p('#8a5a32', X + 1, Y + 3, 14, 8); p('#a8743f', X + 1, Y + 3, 14, 2);
      p('#6b4426', X + 2, Y + 11, 2, 4); p('#6b4426', X + 12, Y + 11, 2, 4);
      if ((tx + ty) % 2) { p('#d8c8a0', X + 4, Y + 4, 4, 2); p('#7a2230', X + 10, Y + 4, 2, 3); }
      break;
    case 'couch':
      p('#6b4426', X, Y + 4, 16, 10);
      p('#c9a24a', X, Y + 4, 16, 2);
      p('#8e2f3a', X + 1, Y + 6, 14, 6);
      p('#b0485a', X + 2, Y + 6, 4, 3);
      break;
    case 'hearth':
      p('#8d877a', X, Y + 2, 16, 14); p('#a9a294', X, Y + 2, 16, 2);
      p('#2b1d16', X + 3, Y + 7, 10, 6);
      p('#e8902a', X + 5, Y + 9, 6, 3); p('#f4d24a', X + 7, Y + 10, 2, 2);
      p('#6b6a6a', X + 4, Y + 4, 8, 3);
      break;
    case 'lararium':
      // Hausschrein der Laren
      p('#e4dcc6', X + 2, Y + 2, 12, 12);
      p('#a3392c', X + 4, Y + 5, 8, 7);
      p('#e3c27a', X + 5, Y + 7, 2, 4); p('#e3c27a', X + 9, Y + 7, 2, 4);
      for (let i = 0; i < 4; i++) p('#e4dcc6', X + 2 + i, Y + 2 - i, 12 - i * 2, 1);
      p('#cfc6ae', X + 1, Y + 13, 14, 3);
      break;
    case 'shelf':
      p('#6b4426', X + 1, Y + 1, 14, 15);
      p('#8a5a32', X + 2, Y + 2, 12, 13);
      p('#6b4426', X + 2, Y + 7, 12, 1); p('#6b4426', X + 2, Y + 12, 12, 1);
      p('#b0603a', X + 3, Y + 3, 3, 4); p('#c9b23a', X + 8, Y + 4, 3, 3);
      p('#e8dcc0', X + 4, Y + 9, 6, 3); p('#b0603a', X + 11, Y + 8, 2, 4);
      break;
    case 'amphorae':
      for (let i = 0; i < 3; i++) {
        const ax = X + 1 + i * 5, ay = Y + 2 + (i % 2) * 2;
        p('#b0603a', ax, ay + 2, 4, 9); p('#c97a4a', ax, ay + 2, 1, 8);
        p('#b0603a', ax + 1, ay, 2, 2);
      }
      break;
    case 'plant':
      p('#a0603a', X + 4, Y + 9, 8, 6); p('#c07a4a', X + 4, Y + 9, 8, 1);
      p('#3f6b2e', X + 2, Y + 1, 12, 9); p('#5a8a3a', X + 4, Y + 2, 6, 4);
      break;
    case 'basin':
      p('#cfc6ae', X + 1, Y + 3, 14, 12); p('#e4dcc6', X + 1, Y + 3, 14, 2);
      p('#5d9bcc', X + 3, Y + 6, 10, 6); p('#8cc0e3', X + 4, Y + 7, 3, 1);
      break;
    case 'chest':
      // Arca: Geldtruhe im Atrium
      p('#5a3420', X + 1, Y + 4, 14, 11); p('#7a4b2a', X + 1, Y + 4, 14, 3);
      p('#a8843f', X + 1, Y + 8, 14, 1); p('#a8843f', X + 7, Y + 6, 2, 4);
      break;
    case 'mill':
      // Mühlstein (meta und catillus) aus Basalt
      p('#5a565c', X + 2, Y + 4, 12, 12); p('#6e6a72', X + 3, Y + 1, 10, 10);
      p('#8a8690', X + 4, Y + 2, 8, 2); p('#3a363c', X + 7, Y + 2, 2, 2);
      p('#6b4426', X + 1, Y + 6, 14, 2);
      break;
    case 'oven': {
      const left = !same(-1, 0);
      p('#b8a890', X, Y + 1, 16, 15); p('#d0c2a8', X, Y + 1, 16, 2);
      for (let i = 0; i < 16; i += 4) p('#a09078', X, Y + 4 + i * 0.7, 16, 1);
      if (left) { p('#2b1d16', X + 8, Y + 7, 8, 9); p('#e8902a', X + 10, Y + 12, 6, 3); }
      else { p('#2b1d16', X, Y + 7, 8, 9); p('#e8902a', X, Y + 12, 6, 3); p('#f4d24a', X + 2, Y + 13, 2, 1); }
      break;
    }
    case 'counter':
      p('#e3dccb', X, Y + 3, 16, 13); p('#f2ede0', X, Y + 3, 16, 2);
      p('#a3392c', X + 3, Y + 9, 2, 2); p('#3f6b8a', X + 9, Y + 11, 2, 2);
      break;
    case 'statue': {
      // Kultbild (z. B. Saturn mit verhülltem Haupt)
      const left = !same(-1, 0);
      p('#d6ccb2', X, Y + 10, 16, 6); p('#efe9dc', X, Y + 9, 16, 2);
      if (left) {
        q('#c9b48a', X + 8, Y - 18, 14, 28); q('#e3cfa0', X + 9, Y - 18, 4, 28);
        q('#d8c08a', X + 10, Y - 26, 10, 9); q('#a8743f', X + 9, Y - 27, 12, 4);
        q('#e8e0cc', X + 9, Y + 6, 12, 3);
      }
      break;
    }
    case 'altarp':
      p('#d6ccb2', X + 2, Y + 4, 12, 12); p('#efe9dc', X + 1, Y + 3, 14, 3); p('#bdb295', X + 1, Y + 14, 14, 2);
      p('#e8902a', X + 5, Y, 6, 4); p('#f4d24a', X + 7, Y + 1, 2, 2);
      break;
    case 'bench':
      p('#d6ccb2', X + 1, Y + 6, 14, 4); p('#efe9dc', X + 1, Y + 6, 14, 1); p('#bdb295', X + 2, Y + 10, 2, 5); p('#bdb295', X + 12, Y + 10, 2, 5);
      break;
    case 'goodbed':
      p('#5a3420', X, Y + 2, 16, 14); p('#e8dcc0', X + 1, Y + 3, 14, 11); p('#f4eedc', X + 2, Y + 4, 5, 4); p('#2e6da4', X + 1, Y + 8, 14, 6); p('#c9a24a', X, Y + 2, 16, 1);
      break;
    case 'brazier':
      p('#3a363c', X + 3, Y + 11, 2, 4); p('#3a363c', X + 11, Y + 11, 2, 4); p('#5a565c', X + 2, Y + 7, 12, 5); p('#6e6a72', X + 2, Y + 7, 12, 1);
      p('#e8902a', X + 4, Y + 4, 8, 3); p('#f4d24a', X + 6, Y + 3, 4, 2);
      break;
    case 'mensa':
      p('rgba(0,0,0,0.2)', X + 2, Y + 12, 13, 3); p('#8a5a32', X + 1, Y + 4, 14, 7); p('#a8743f', X + 1, Y + 4, 14, 2);
      p('#6b4426', X + 2, Y + 11, 2, 4); p('#6b4426', X + 12, Y + 11, 2, 4); p('#b0603a', X + 5, Y + 5, 3, 3);
      break;
    case 'candelabrum':
      p('#8a7a4a', X + 7, Y + 2, 2, 13); p('#8a7a4a', X + 4, Y + 14, 8, 2); p('#a8843f', X + 5, Y + 2, 6, 2); p('#f4d24a', X + 7, Y - 1, 2, 3);
      break;
    case 'larsmall':
      p('#cfc6ae', X + 3, Y + 9, 10, 7); p('#e4dcc6', X + 3, Y + 4, 10, 6); p('#a3392c', X + 5, Y + 6, 6, 3); p('#e3c27a', X + 7, Y + 6, 2, 3);
      for (let i = 0; i < 3; i++) p('#e4dcc6', X + 3 + i, Y + 4 - i, 10 - i * 2, 1);
      break;
    case 'pot_0': case 'pot_1': case 'pot_2': case 'pot_3': {
      const st = Number(kind.slice(4));
      p('#a0603a', X + 4, Y + 9, 8, 6); p('#c07a4a', X + 4, Y + 9, 8, 1); p('#5a3a22', X + 5, Y + 10, 6, 1);
      if (st >= 1) p('#5f9a3a', X + 7, Y + 6, 2, 3);
      if (st >= 2) { p('#4f8a3a', X + 5, Y + 4, 6, 4); }
      if (st >= 3) { p('#4f8a3a', X + 3, Y + 2, 10, 6); p('#f2d24a', X + 5, Y + 3, 2, 2); p('#e85a5a', X + 9, Y + 4, 2, 2); }
      break;
    }
    case 'bed_0': case 'bed_1': case 'bed_2': case 'bed_3': {
      const st = Number(kind.slice(4));
      p('#6e5236', X + 1, Y + 3, 14, 11); p('#5b432c', X + 2, Y + 5, 12, 1); p('#5b432c', X + 2, Y + 9, 12, 1);
      if (st >= 1) for (let i = 0; i < 3; i++) p('#5f9a3a', X + 3 + i * 4, Y + 6, 2, 3);
      if (st >= 2) for (let i = 0; i < 3; i++) p('#4f8a3a', X + 2 + i * 4, Y + 4, 4, 5);
      if (st >= 3) for (let i = 0; i < 3; i++) { p('#4f8a3a', X + 2 + i * 4, Y + 2, 4, 7); p('#f2d24a', X + 3 + i * 4, Y + 3, 1, 1); }
      break;
    }
    default:
      p('#ff00ff', X + 4, Y + 4, 8, 8);
  }
}
