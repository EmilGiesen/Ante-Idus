// Spielfigur
import { Mover } from './mover.js';
import { getSheet, drawSprite } from '../gfx/sprites.js';
import { WALK_SPEED, SPRINT_SPEED } from '../core/config.js';

export class Player extends Mover {
  constructor(app) {
    super();
    this.setAppearance(app);
    this.sprinting = false;
  }

  setAppearance(app) {
    this.app = app;
    this.sheet = getSheet(app);
  }

  update(dt, input, map, canSprint, extraBlock) {
    const { x: ax, y: ay } = input.axis();
    if (!ax && !ay) { this.moving = false; this.anim = 0; this.sprinting = false; return; }
    const len = Math.hypot(ax, ay);
    this.sprinting = input.sprinting() && canSprint;
    const speed = this.sprinting ? SPRINT_SPEED : WALK_SPEED;
    const dx = (ax / len) * speed * dt, dy = (ay / len) * speed * dt;
    // Blickrichtung: bei Diagonalen die bisherige behalten, wenn sie passt
    const horiz = ax < 0 ? 'left' : ax > 0 ? 'right' : null;
    const vert = ay < 0 ? 'up' : ay > 0 ? 'down' : null;
    if (horiz && vert) { if (this.dir !== horiz && this.dir !== vert) this.dir = horiz; }
    else this.dir = horiz || vert;
    this.moveBy(map, dx, dy, extraBlock);
    this.moving = true;
    this.anim += dt * (this.sprinting ? 13 : 8.5);
  }

  // Punkt vor der Figur (für Interaktionen)
  facingPoint(distance = 12) {
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.dir];
    return { x: this.x + d[0] * distance, y: this.y - 4 + d[1] * distance };
  }

  draw(ctx, cam) {
    drawSprite(ctx, this.sheet, this.dir, this.frame(), this.x - cam.x, this.y - cam.y);
  }
}
