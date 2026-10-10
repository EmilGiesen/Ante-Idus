// Basisklasse für bewegliche Figuren mit Tile-Kollision (Hitbox an den Füßen)
export class Mover {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.dir = 'down';
    this.moving = false;
    this.anim = 0;
    this.hw = 5;  // halbe Breite der Hitbox
    this.hh = 5;  // Höhe der Hitbox über den Füßen
  }

  blockedAt(map, x, y) {
    const l = Math.floor((x - this.hw) / 16), r = Math.floor((x + this.hw - 0.01) / 16);
    const t = Math.floor((y - this.hh) / 16), b = Math.floor((y - 0.01) / 16);
    for (let ty = t; ty <= b; ty++) for (let tx = l; tx <= r; tx++) if (map.isSolidTile(tx, ty)) return true;
    return false;
  }

  // Bewegt achsengetrennt; gleitet an Ecken entlang (hilft in engen Gassen und Türen)
  moveBy(map, dx, dy, extra) {
    const free = (x, y) => !this.blockedAt(map, x, y) && !(extra && extra(x, y));
    let moved = false;
    if (dx) {
      const nx = this.x + dx;
      if (free(nx, this.y)) { this.x = nx; moved = true; }
      else if (!dy) moved = this.nudge(free, nx, this.y, 'y', Math.abs(dx)) || moved;
    }
    if (dy) {
      const ny = this.y + dy;
      if (free(this.x, ny)) { this.y = ny; moved = true; }
      else if (!dx) moved = this.nudge(free, this.x, ny, 'x', Math.abs(dy)) || moved;
    }
    return moved;
  }

  nudge(free, tx, ty, axis, speed) {
    for (let k = 1; k <= 7; k++) {
      for (const s of [1, -1]) {
        const ox = axis === 'x' ? s * k : 0, oy = axis === 'y' ? s * k : 0;
        if (free(tx + ox, ty + oy) && free(this.x + Math.sign(ox), this.y + Math.sign(oy))) {
          const m = Math.min(k, speed);
          if (axis === 'x') this.x += s * m; else this.y += s * m;
          return true;
        }
      }
    }
    return false;
  }

  frame() {
    return this.moving ? [0, 1, 0, 3][Math.floor(this.anim) % 4] : 0;
  }
}
