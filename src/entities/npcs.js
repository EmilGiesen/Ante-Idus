// NPCs: benannte Figuren mit Tagesroutinen, Passanten je Viertel, Diebe bei Nacht, Tiere
import { Mover } from './mover.js';
import { getSheet, drawSprite, randomAppearance, getAnimalSheet } from '../gfx/sprites.js';
import { findPath } from '../world/pathfind.js';
import { mulberry32 } from '../core/rng.js';
import { G } from '../core/ctx.js';
import { checkCond } from '../systems/rules.js';
import { isNight } from '../core/time.js';

const tilePx = (t) => ({ x: t.x * 16 + 8, y: t.y * 16 + 13 });

export class NPC extends Mover {
  constructor(o) {
    super(o.x, o.y);
    Object.assign(this, o);
    this.sheet = getSheet(o.app);
    this.path = null;
    this.pi = 0;
    this.wait = Math.random() * 2;
    this.talking = false;
    this.marker = null;
    this.blockedT = 0;
    this.speed = o.speed || 38;
  }

  tile() { return { x: Math.floor(this.x / 16), y: Math.floor((this.y - 2) / 16) }; }

  goTo(map, tx, ty, maxNodes) {
    const t = this.tile();
    const path = findPath(map, t.x, t.y, tx, ty, maxNodes);
    if (!path) return false;
    this.path = path.length ? path : null;
    this.pi = 0;
    return true;
  }

  followPath(dt, player) {
    const n = this.path[this.pi];
    if (!n) { this.path = null; this.moving = false; return; }
    const { x: tx, y: ty } = tilePx(n);
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt;
    // Nicht durch die Spielfigur hindurchlaufen (kurz warten)
    if (player && this.blockedT < 1.2) {
      const nx = this.x + (dx / (d || 1)) * 6, ny = this.y + (dy / (d || 1)) * 6;
      if (Math.hypot(nx - player.x, ny - player.y) < 9) { this.blockedT += dt; this.moving = false; return; }
    }
    this.blockedT = 0;
    if (d <= step) {
      this.x = tx; this.y = ty; this.pi++;
      if (this.pi >= this.path.length) { this.path = null; this.moving = false; }
    } else {
      this.x += (dx / d) * step; this.y += (dy / d) * step;
      this.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      this.moving = true;
      this.anim += dt * 7;
    }
  }

  draw(ctx, cam, t) {
    drawSprite(ctx, this.sheet, this.dir, this.frame(), this.x - cam.x, this.y - cam.y);
  }
}

class Animal extends Mover {
  constructor(kind, color, x, y, area) {
    super(x, y);
    this.kind = kind;
    this.sheet = getAnimalSheet(kind, color);
    this.area = area;
    this.vx = 0; this.vy = 0;
    this.wait = Math.random() * 3;
    this.face = Math.random() < 0.5 ? 0 : 1;
    this.hw = 4; this.hh = 4;
    this.speed = kind === 'chicken' ? 22 : kind === 'donkey' ? 14 : 30;
  }

  update(dt, map) {
    this.wait -= dt;
    if (this.wait <= 0) {
      if (this.vx || this.vy) { this.vx = 0; this.vy = 0; this.wait = 1 + Math.random() * 4; }
      else {
        const a = Math.random() * Math.PI * 2;
        this.vx = Math.cos(a) * this.speed; this.vy = Math.sin(a) * this.speed * 0.6;
        this.wait = 0.6 + Math.random() * 1.6;
        if (this.vx) this.face = this.vx > 0 ? 1 : 0;
      }
    }
    if (this.vx || this.vy) {
      const [ax, ay, aw, ah] = this.area;
      const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
      if (nx < ax * 16 || nx > (ax + aw) * 16 || ny < ay * 16 || ny > (ay + ah) * 16) { this.vx = -this.vx; this.vy = -this.vy; this.face = this.vx > 0 ? 1 : 0; }
      else this.moveBy(map, this.vx * dt, this.vy * dt);
      this.anim += dt * 6;
    }
  }

  draw(ctx, cam) {
    const f = this.vx || this.vy ? Math.floor(this.anim) % 2 : 0;
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x - 4, y - 1, 8, 2);
    ctx.drawImage(this.sheet, f * 16, this.face * 16, 16, 16, x - 8, y - 15, 16, 16);
  }
}

export class NpcManager {
  constructor() {
    this.named = G.data.npcs.list.map((def) => new NPC({
      id: def.id, def, name: def.name, role: def.role, app: def.app, kind: 'named', map: null, x: 0, y: 0, speed: def.speed,
    }));
    this.byId = Object.fromEntries(this.named.map((n) => [n.id, n]));
    this.ambient = [];
    this.thieves = [];
    this.animals = [];
    this.mapId = null;
    this.schedT = 0;
    this.ambT = 0;
    this.thiefT = 25;
    this.seed = 1;
  }

  schedFor(def, hour) {
    for (const s of def.sched || []) {
      const [a, b] = s.h;
      const inRange = a <= b ? hour >= a && hour < b : hour >= a || hour < b;
      if (inRange && (!s.if || checkCond(s.if))) return s;
    }
    return null;
  }

  // Wo ist ein NPC laut Tagesplan gerade? (auch für Zielmarkierungen)
  whereIs(id) {
    const n = this.byId[id];
    if (!n) return null;
    const s = this.schedFor(n.def, G.state.time.hour);
    if (!s) return null;
    if (n.map === s.map && n.sched === s) return { map: n.map, x: n.x, y: n.y };
    const p = tilePx({ x: s.at[0], y: s.at[1] });
    return { map: s.map, x: p.x, y: p.y };
  }

  enterMap(map) {
    this.mapId = map.id;
    this.map = map;
    const hour = G.state.time.hour;
    for (const n of this.named) {
      const s = this.schedFor(n.def, hour);
      n.sched = s;
      n.path = null;
      n.talking = false;
      n.map = s ? s.map : null;
      if (s) { const p = tilePx({ x: s.at[0], y: s.at[1] }); n.x = p.x; n.y = p.y; n.dir = s.dir || 'down'; }
    }
    this.ambient = [];
    this.thieves = [];
    this.animals = [];
    const def = map.interior ? G.data.interiors[map.id] : G.data.map_rom;
    for (const a of def.animals || []) {
      for (let i = 0; i < (a.n || 1); i++) {
        const t = map.randomFreeTile(Math.random, a.r);
        if (t) this.animals.push(new Animal(a.kind, a.color || '#8a6a44', t.x * 16 + 8, t.y * 16 + 12, a.r));
      }
    }
    if (!map.interior) this.syncAmbient(true);
  }

  desiredAmbient(z) {
    const h = G.state.time.hour;
    const base = z.amb || 0;
    if (isNight(h)) return Math.round(base * 0.12);
    if (h < 1 || h > 11) return Math.round(base * 0.5);
    return base;
  }

  syncAmbient(initial) {
    const map = this.map;
    const cam = G.game.renderer.cam, vw = G.game.renderer.vw, vh = G.game.renderer.vh;
    const onScreen = (x, y) => x > cam.x - 24 && x < cam.x + vw + 24 && y > cam.y - 24 && y < cam.y + vh + 40;
    for (const z of map.zones) {
      const want = this.desiredAmbient(z);
      const have = this.ambient.filter((a) => a.zone === z);
      if (have.length > want) {
        for (const a of have.slice(want)) if (!onScreen(a.x, a.y) && !a.talking) this.ambient.splice(this.ambient.indexOf(a), 1);
      } else {
        for (let i = have.length; i < want; i++) {
          const rng = mulberry32(this.seed++ * 7919 + Date.now() % 1000);
          const t = map.randomFreeTile(rng, z.r, 40);
          if (!t) continue;
          const p = tilePx(t);
          if (!initial && onScreen(p.x, p.y)) continue;
          const roles = z.roles || ['citizen', 'woman'];
          const role = roles[Math.floor(rng() * roles.length)];
          this.ambient.push(new NPC({
            id: 'amb' + this.seed, kind: 'ambient', zone: z, role, app: randomAppearance(role, this.seed * 31 + 7),
            name: ROLE_NAMES[role] || 'Passant', x: p.x, y: p.y, map: map.id, speed: role === 'child' ? 46 : 30 + rng() * 14,
          }));
        }
      }
    }
  }

  list() {
    const out = [];
    for (const n of this.named) if (n.map === this.mapId) out.push(n);
    return out.concat(this.ambient, this.thieves, this.animals);
  }

  talkable() {
    return this.list().filter((n) => n.kind === 'named' || n.kind === 'ambient');
  }

  update(dt, player) {
    const map = this.map;
    const hour = G.state.time.hour;
    this.schedT -= dt;
    if (this.schedT <= 0) {
      this.schedT = 1;
      for (const n of this.named) {
        const s = this.schedFor(n.def, hour);
        if (s === n.sched) continue;
        const wasHere = n.map === this.mapId;
        n.sched = s;
        if (!s) { n.map = null; continue; }
        if (s.map === this.mapId && wasHere && !n.talking) {
          if (!n.goTo(map, s.at[0], s.at[1], 9000)) { const p = tilePx({ x: s.at[0], y: s.at[1] }); n.x = p.x; n.y = p.y; }
        } else {
          n.map = s.map; n.path = null;
          const p = tilePx({ x: s.at[0], y: s.at[1] }); n.x = p.x; n.y = p.y; n.dir = s.dir || 'down';
        }
      }
    }
    for (const n of this.named) {
      if (n.map !== this.mapId) continue;
      if (n.talking) { n.moving = false; continue; }
      if (n.path) { n.followPath(dt, player); continue; }
      const s = n.sched;
      if (s && s.wander) {
        n.wait -= dt;
        if (n.wait <= 0) {
          n.wait = 2 + Math.random() * 5;
          const r = s.wander;
          const t = map.randomFreeTile(Math.random, [s.at[0] - r, s.at[1] - r, r * 2 + 1, r * 2 + 1], 10);
          if (t) n.goTo(map, t.x, t.y, 600);
        }
      } else if (s && s.dir && !n.moving) n.dir = s.dir;
    }
    if (!map.interior) {
      this.ambT -= dt;
      if (this.ambT <= 0) { this.ambT = 4; this.syncAmbient(false); }
      for (const a of this.ambient) {
        if (a.talking) { a.moving = false; continue; }
        if (a.path) { a.followPath(dt, player); continue; }
        a.wait -= dt;
        if (a.wait <= 0) {
          a.wait = 2 + Math.random() * 6;
          const t = map.randomFreeTile(Math.random, a.zone.r, 12);
          if (t && !a.goTo(map, t.x, t.y, 2500)) a.wait = 1.5;
        }
      }
      this.updateThieves(dt, player);
    }
    for (const an of this.animals) an.update(dt, map);
  }

  // ---------- Diebe bei Nacht (es gab keine Polizei; die Vigiles entstehen erst 6 n. Chr.) ----------
  updateThieves(dt, player) {
    const map = this.map;
    const hour = G.state.time.hour;
    const z = map.zoneAt(Math.floor(player.x / 16), Math.floor(player.y / 16));
    if (isNight(hour) && z && z.danger) {
      this.thiefT -= dt * (z.danger || 1);
      if (this.thiefT <= 0 && this.thieves.length < 2) {
        this.thiefT = (G.state.light ? 70 : 35) + Math.random() * 25;
        const ptx = Math.floor(player.x / 16), pty = Math.floor(player.y / 16);
        for (let i = 0; i < 25; i++) {
          const a = Math.random() * Math.PI * 2, d = 9 + Math.random() * 4;
          const tx = Math.round(ptx + Math.cos(a) * d), ty = Math.round(pty + Math.sin(a) * d);
          if (!map.inside(tx, ty) || map.npcBlocked(tx, ty)) continue;
          const p = tilePx({ x: tx, y: ty });
          const th = new NPC({ id: 'thief' + this.seed++, kind: 'thief', role: 'thief', name: 'Schatten', app: randomAppearance('thief', this.seed), x: p.x, y: p.y, map: map.id, speed: 112 });
          th.repath = 0; th.life = 40; th.fleeing = false;
          this.thieves.push(th);
          G.game.onThiefSpawn(th);
          break;
        }
      }
    }
    for (const th of [...this.thieves]) {
      th.life -= dt;
      th.repath -= dt;
      if (th.repath <= 0 && !th.fleeing) {
        th.repath = 0.8;
        th.goTo(map, Math.floor(player.x / 16), Math.floor((player.y - 2) / 16), 1500);
      }
      if (th.path) th.followPath(dt, null);
      if (!th.fleeing && Math.hypot(th.x - player.x, th.y - player.y) < 11 && !G.game.isInside()) {
        th.fleeing = true;
        th.life = 6;
        G.game.onThiefCatch(th);
        const t = map.randomFreeTile(Math.random, [Math.floor(th.x / 16) - 15, Math.floor(th.y / 16) - 15, 30, 30], 20);
        if (t) th.goTo(map, t.x, t.y, 2000);
      }
      if (th.life <= 0 || (!isNight(hour) && !th.fleeing)) this.thieves.splice(this.thieves.indexOf(th), 1);
    }
  }
}

const ROLE_NAMES = {
  citizen: 'Bürger', woman: 'Bürgerin', child: 'Kind', worker: 'Arbeiter', slave: 'Sklave', senator: 'Senator',
  merchant: 'Händler', priest: 'Priester',
};
