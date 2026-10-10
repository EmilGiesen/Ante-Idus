// Tastatur- und Touch-Eingabe, abstrahiert auf Aktionen
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  KeyE: 'interact', Space: 'action', Enter: 'confirm', NumpadEnter: 'confirm',
  KeyI: 'inventory', KeyL: 'log', KeyK: 'lexicon', KeyM: 'map', Escape: 'menu',
  Digit1: 'opt1', Digit2: 'opt2', Digit3: 'opt3', Digit4: 'opt4', Digit5: 'opt5',
  Numpad1: 'opt1', Numpad2: 'opt2', Numpad3: 'opt3', Numpad4: 'opt4', Numpad5: 'opt5',
};

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.touchAxis = { x: 0, y: 0 };
    this.touchSprint = false;
    window.addEventListener('keydown', (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const a = KEYMAP[e.code];
      if (!a) return;
      e.preventDefault();
      if (!this.down.has(a)) this.pressed.add(a);
      this.down.add(a);
    });
    window.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (a) this.down.delete(a);
    });
    window.addEventListener('blur', () => this.down.clear());
  }

  isDown(a) { return this.down.has(a); }
  wasPressed(a) { return this.pressed.has(a); }
  press(a) { this.pressed.add(a); }
  consume(a) { this.pressed.delete(a); }
  endFrame() { this.pressed.clear(); }

  confirmPressed() {
    return this.wasPressed('interact') || this.wasPressed('action') || this.wasPressed('confirm');
  }

  axis() {
    let x = 0, y = 0;
    if (this.isDown('left')) x -= 1;
    if (this.isDown('right')) x += 1;
    if (this.isDown('up')) y -= 1;
    if (this.isDown('down')) y += 1;
    if (!x && !y) { x = this.touchAxis.x; y = this.touchAxis.y; }
    return { x, y };
  }

  sprinting() { return this.isDown('sprint') || this.touchSprint; }
}
