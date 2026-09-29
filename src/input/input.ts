import { Emitter } from '../core/emitter';
import type { Dir } from '../ui/ui';

/**
 * Unified input. Every frame `update()` merges keyboard, gamepads and touch into one controller
 * state per player. P1 = WASD + E/Q, P2 = arrows + / and . (in 1-player mode both sets drive P1).
 * Menus get direction/confirm/back events from any device.
 */
export type Btn = 'a' | 'b';

export interface PadState {
  x: number;
  y: number;
  a: boolean;
  b: boolean;
  aPressed: boolean;
  bPressed: boolean;
  /** discrete direction pressed this frame (keys, d-pad, stick flick, swipe) */
  dir: Dir | null;
  /** last device that produced input for this player */
  source: 'kb' | 'pad' | 'touch' | 'none';
}

export interface InputEvents extends Record<string, unknown> {
  nav: Dir;
  confirm: number;
  back: number;
  pause: number;
  /** a second gamepad pressed Start while only one player is playing */
  'join-request': number;
  device: 'kb' | 'pad' | 'touch';
}

const P1_KEYS = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', a: 'KeyE', b: 'KeyQ' } as const;
const P2_KEYS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', a: 'Slash', b: 'Period' } as const;
const CONFIRM_KEYS = new Set(['KeyE', 'Slash', 'Enter', 'NumpadEnter', 'Space']);
const BACK_KEYS = new Set(['KeyQ', 'Period', 'Escape', 'Backspace']);
const PAUSE_KEYS = new Set(['Escape', 'KeyP']);
const DIR_KEYS: Record<string, Dir> = {
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};
const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Slash', 'Period', 'Tab', 'Backspace']);

export interface TouchSource {
  /** per-player virtual stick + buttons, or null when that player has no touch zone */
  read(player: 0 | 1): { x: number; y: number; a: boolean; b: boolean; aPressed: boolean; bPressed: boolean; dir: Dir | null } | null;
  endFrame(): void;
}

function emptyPad(): PadState {
  return { x: 0, y: 0, a: false, b: false, aPressed: false, bPressed: false, dir: null, source: 'none' };
}

const DEAD = 0.28;

interface PadMemory {
  buttons: boolean[];
  stickDir: Dir | null;
  repeatAt: number;
  heldDir: Dir | null;
}

export class InputManager {
  readonly p: [PadState, PadState] = [emptyPad(), emptyPad()];
  twoPlayer = false;
  /** When true (UI screen open), direction/confirm/back become menu events instead of world input. */
  menuMode = false;
  events = new Emitter<InputEvents>();
  touch: TouchSource | null = null;
  /** Debug/test injection: virtual held buttons per player (e.g. from Playwright). */
  virtual: [Partial<PadState>, Partial<PadState>] = [{}, {}];

  private keys = new Set<string>();
  private pressedKeys = new Set<string>();
  private padMem = new Map<number, PadMemory>();
  private attached = false;
  private lastDevice: 'kb' | 'pad' | 'touch' = 'kb';

  attach(target: Window = window): void {
    if (this.attached) return;
    this.attached = true;
    target.addEventListener('keydown', (e) => this.onKeyDown(e));
    target.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    target.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.keys.clear();
    });
  }

  private typing(): boolean {
    const el = document.activeElement as HTMLElement | null;
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.typing()) {
      if (e.code === 'Escape') {
        (document.activeElement as HTMLElement).blur();
        this.events.emit('back', 0);
      }
      return;
    }
    if (PREVENT.has(e.code)) e.preventDefault();
    this.setDevice('kb');
    if (!e.repeat) {
      this.keys.add(e.code);
      this.pressedKeys.add(e.code);
    }
    if (this.menuMode) {
      // We activate the focused button ourselves; stop the browser's own Enter/Space click
      // so a single key press never "clicks" twice.
      if (CONFIRM_KEYS.has(e.code) || DIR_KEYS[e.code]) e.preventDefault();
      const d = DIR_KEYS[e.code];
      if (d) this.events.emit('nav', d);
      else if (CONFIRM_KEYS.has(e.code) && !e.repeat) this.events.emit('confirm', P2_KEYS.a === e.code ? 1 : 0);
      else if (BACK_KEYS.has(e.code) && !e.repeat) this.events.emit('back', 0);
    } else if (PAUSE_KEYS.has(e.code) && !e.repeat) {
      this.events.emit('pause', 0);
    }
  }

  private setDevice(d: 'kb' | 'pad' | 'touch') {
    if (this.lastDevice !== d) {
      this.lastDevice = d;
      this.events.emit('device', d);
    }
  }

  get device(): 'kb' | 'pad' | 'touch' {
    return this.lastDevice;
  }

  /** Is a key held? (for mini-games that want raw keys) */
  held(code: string): boolean {
    return this.keys.has(code);
  }

  update(now = performance.now()): void {
    const [p1, p2] = this.p;
    for (const p of this.p) Object.assign(p, emptyPad());

    // ---------- keyboard
    const k = (c: string) => this.keys.has(c);
    const kp = (c: string) => this.pressedKeys.has(c);
    const applyKeys = (p: PadState, map: typeof P1_KEYS | typeof P2_KEYS) => {
      const x = (k(map.right) ? 1 : 0) - (k(map.left) ? 1 : 0);
      const y = (k(map.down) ? 1 : 0) - (k(map.up) ? 1 : 0);
      if (x || y) {
        p.x += x;
        p.y += y;
        p.source = 'kb';
      }
      if (k(map.a)) p.a = true;
      if (k(map.b)) p.b = true;
      if (kp(map.a)) p.aPressed = true;
      if (kp(map.b)) p.bPressed = true;
      for (const [code, d] of Object.entries(DIR_KEYS)) {
        if ((code === map.up || code === map.down || code === map.left || code === map.right) && kp(code)) p.dir = d;
      }
      if (p.a || p.b || p.aPressed || p.bPressed) p.source = 'kb';
    };
    applyKeys(p1, P1_KEYS);
    applyKeys(this.twoPlayer ? p2 : p1, P2_KEYS);
    // Space/Enter act as the action button (P1 on the left, P2 on the right of the keyboard)
    if (k('Space')) p1.a = true;
    if (kp('Space')) p1.aPressed = true;
    const enterP = this.twoPlayer ? p2 : p1;
    if (k('Enter') || k('NumpadEnter')) enterP.a = true;
    if (kp('Enter') || kp('NumpadEnter')) enterP.aPressed = true;
    this.pressedKeys.clear();

    // ---------- gamepads
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].filter((g): g is Gamepad => !!g && g.connected) : [];
    pads.forEach((gp, idx) => {
      const slot: 0 | 1 = this.twoPlayer && idx >= 1 ? 1 : 0;
      const p = this.p[slot];
      const mem = this.padMem.get(gp.index) ?? { buttons: [], stickDir: null, repeatAt: 0, heldDir: null };
      const btn = (i: number) => !!gp.buttons[i]?.pressed;
      const edge = (i: number) => btn(i) && !mem.buttons[i];
      let ax = gp.axes[0] ?? 0;
      let ay = gp.axes[1] ?? 0;
      if (Math.hypot(ax, ay) < DEAD) {
        ax = 0;
        ay = 0;
      }
      const dx = (btn(15) ? 1 : 0) - (btn(14) ? 1 : 0);
      const dy = (btn(13) ? 1 : 0) - (btn(12) ? 1 : 0);
      const mx = ax || dx;
      const my = ay || dy;
      const anyInput = mx !== 0 || my !== 0 || gp.buttons.some((b) => b.pressed);
      if (anyInput) {
        p.source = 'pad';
        this.setDevice('pad');
      }
      p.x += mx;
      p.y += my;
      if (btn(0)) p.a = true;
      if (btn(1)) p.b = true;
      if (edge(0)) p.aPressed = true;
      if (edge(1)) p.bPressed = true;
      // discrete direction with auto-repeat (menus) — d-pad or stick
      let d: Dir | null = null;
      if (Math.abs(mx) > 0.55 || Math.abs(my) > 0.55) d = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'right' : 'left') : my > 0 ? 'down' : 'up';
      if (d && d !== mem.heldDir) {
        p.dir = d;
        mem.repeatAt = now + 380;
      } else if (d && now >= mem.repeatAt) {
        p.dir = d;
        mem.repeatAt = now + 115;
      }
      mem.heldDir = d;
      if (this.menuMode) {
        if (p.dir) this.events.emit('nav', p.dir);
        if (edge(0)) this.events.emit('confirm', slot);
        if (edge(1)) this.events.emit('back', slot);
      }
      if (edge(9)) {
        if (!this.twoPlayer && idx >= 1) this.events.emit('join-request', idx);
        else if (this.menuMode) this.events.emit('back', slot);
        else this.events.emit('pause', slot);
      }
      mem.buttons = gp.buttons.map((b) => b.pressed);
      this.padMem.set(gp.index, mem);
    });

    // ---------- touch
    if (this.touch) {
      for (const slot of [0, 1] as const) {
        const t = this.touch.read(slot);
        if (!t) continue;
        const p = this.p[slot];
        if (t.x || t.y || t.a || t.b) {
          p.source = 'touch';
          this.setDevice('touch');
        }
        p.x += t.x;
        p.y += t.y;
        p.a ||= t.a;
        p.b ||= t.b;
        p.aPressed ||= t.aPressed;
        p.bPressed ||= t.bPressed;
        p.dir ??= t.dir;
      }
      this.touch.endFrame();
    }

    // ---------- test injection
    for (const slot of [0, 1] as const) {
      const v = this.virtual[slot];
      const p = this.p[slot];
      if (v.x !== undefined) p.x += v.x;
      if (v.y !== undefined) p.y += v.y;
      if (v.a) p.a = true;
      if (v.b) p.b = true;
      if (v.aPressed) {
        p.aPressed = true;
        v.aPressed = false;
      }
      if (v.bPressed) {
        p.bPressed = true;
        v.bPressed = false;
      }
      if (v.dir) {
        p.dir = v.dir;
        v.dir = null;
      }
    }

    // normalise movement vectors to length <= 1
    for (const p of this.p) {
      const len = Math.hypot(p.x, p.y);
      if (len > 1) {
        p.x /= len;
        p.y /= len;
      }
    }
    if (!this.twoPlayer) Object.assign(p2, emptyPad());
  }
}

export const input = new InputManager();
