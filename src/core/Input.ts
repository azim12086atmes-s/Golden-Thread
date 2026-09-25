/** Keyboard + mouse (+ a simple touch stick) in one place. Read once per frame, then `endFrame()`. */
export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();
  private virtual = new Set<string>();
  dx = 0;
  dy = 0;
  wheel = 0;
  private dragging = false;
  /** Touch joystick vector, -1..1. */
  stick = { x: 0, y: 0 };
  /** When a text field or panel has focus, gameplay keys are ignored. */
  blocked = false;

  constructor(private el: HTMLElement) {
    addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      const k = e.key.toLowerCase();
      if (!this.down.has(k)) this.pressed.add(k);
      this.down.add(k);
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.down.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.reset());
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      this.dragging = true;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointerup', (e) => {
      this.dragging = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
    el.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    this.touch();
  }

  /** Left half of the screen: move stick. Right half: look. */
  private touch(): void {
    let stickId = -1, lookId = -1, sx = 0, sy = 0, lx = 0, ly = 0;
    this.el.addEventListener('touchstart', (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.clientX < innerWidth / 2 && stickId < 0) { stickId = t.identifier; sx = t.clientX; sy = t.clientY; }
        else if (lookId < 0) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
      }
    }, { passive: true });
    this.el.addEventListener('touchmove', (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === stickId) {
          this.stick.x = Math.max(-1, Math.min(1, (t.clientX - sx) / 50));
          this.stick.y = Math.max(-1, Math.min(1, (t.clientY - sy) / 50));
        } else if (t.identifier === lookId) {
          this.dx += (t.clientX - lx) * 1.5; this.dy += (t.clientY - ly) * 1.5;
          lx = t.clientX; ly = t.clientY;
        }
      }
    }, { passive: true });
    const end = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === stickId) { stickId = -1; this.stick.x = this.stick.y = 0; }
        if (t.identifier === lookId) lookId = -1;
      }
    };
    addEventListener('blur', () => { stickId = lookId = -1; });
    this.el.addEventListener('touchend', end);
    this.el.addEventListener('touchcancel', end);
  }

  held(k: string): boolean {
    return !this.blocked && (this.down.has(k) || this.virtual.has(k));
  }

  /** True once, on the frame the key went down. Works while blocked (for Esc / panel toggles). */
  hit(k: string): boolean {
    return this.pressed.has(k);
  }

  press(k: string): void {
    this.pressed.add(k);
  }

  setVirtual(k: string, held: boolean): void {
    if (held) {
      if (!this.virtual.has(k)) this.pressed.add(k);
      this.virtual.add(k);
    } else this.virtual.delete(k);
  }

  reset(): void {
    this.down.clear();
    this.virtual.clear();
    this.pressed.clear();
    this.stick.x = this.stick.y = 0;
    this.dragging = false;
    this.dx = this.dy = this.wheel = 0;
  }

  axis(): { x: number; y: number } {
    if (this.blocked) return { x: 0, y: 0 };
    let x = this.stick.x, y = -this.stick.y;
    if (this.held('w') || this.held('arrowup')) y += 1;
    if (this.held('s') || this.held('arrowdown')) y -= 1;
    if (this.held('d') || this.held('arrowright')) x += 1;
    if (this.held('a') || this.held('arrowleft')) x -= 1;
    const l = Math.hypot(x, y);
    return l > 1 ? { x: x / l, y: y / l } : { x, y };
  }

  endFrame(): void {
    this.pressed.clear();
    this.dx = this.dy = this.wheel = 0;
  }
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}
