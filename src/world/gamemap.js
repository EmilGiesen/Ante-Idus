// Kartendaten: Boden, Kollision, Türen, Interaktionen, Zonen. Gerendert wird in gfx/maprender.js.
import { T } from './tiles.js';
import { TILE } from '../core/config.js';

export class GameMap {
  constructor(id, w, h, opts = {}) {
    this.id = id;
    this.w = w;
    this.h = h;
    this.name = opts.name || id;
    this.interior = !!opts.interior;
    this.style = opts.style || {};
    this.ground = new Uint8Array(w * h);
    this.solid = new Uint8Array(w * h);
    this.bidx = new Int16Array(w * h).fill(-1); // Gebäude-Index je Tile
    this.props = new Map();     // key -> Zeichen/Prop (Innenräume)
    this.doors = new Map();     // key -> Türdefinition
    this.interacts = new Map(); // key -> Interaktionsobjekt
    this.buildings = [];
    this.zones = [];
    this.areas = {};
    this.spawns = {};
    this.lights = [];
    this.windowLights = [];
    this.water = [];
    this.canvas = null;
    this.overlay = null;
  }

  key(x, y) { return y * this.w + x; }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  tileAt(x, y) { return this.inside(x, y) ? this.ground[y * this.w + x] : T.void; }
  isSolidTile(x, y) { return !this.inside(x, y) || this.solid[y * this.w + x] === 1; }
  // NPCs laufen nicht durch Türen
  npcBlocked(x, y) { return this.isSolidTile(x, y) || this.doors.has(this.key(x, y)); }
  get pw() { return this.w * TILE; }
  get ph() { return this.h * TILE; }

  zoneAt(tx, ty) {
    for (const z of this.zones) {
      if (tx >= z.r[0] && ty >= z.r[1] && tx < z.r[0] + z.r[2] && ty < z.r[1] + z.r[3]) return z;
    }
    return null;
  }

  inArea(id, tx, ty) {
    const r = this.areas[id];
    return !!r && tx >= r[0] && ty >= r[1] && tx < r[0] + r[2] && ty < r[1] + r[3];
  }

  buildingAt(tx, ty) {
    if (!this.inside(tx, ty)) return null;
    const i = this.bidx[this.key(tx, ty)];
    return i >= 0 ? this.buildings[i] : null;
  }

  randomFreeTile(rng, r, tries = 30) {
    for (let i = 0; i < tries; i++) {
      const x = r[0] + Math.floor(rng() * r[2]);
      const y = r[1] + Math.floor(rng() * r[3]);
      if (this.inside(x, y) && !this.npcBlocked(x, y)) return { x, y };
    }
    return null;
  }
}
