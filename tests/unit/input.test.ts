// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InputManager } from '../../src/input/input';

function key(target: EventTarget, type: 'keydown' | 'keyup', code: string, repeat = false) {
  const e = new KeyboardEvent(type, { code, repeat, bubbles: true, cancelable: true });
  target.dispatchEvent(e);
}

function fakePad(index: number, opts: { axes?: number[]; pressed?: number[] } = {}): Gamepad {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: (opts.pressed ?? []).includes(i), touched: false, value: 0 }));
  return { index, connected: true, axes: opts.axes ?? [0, 0, 0, 0], buttons, id: `pad${index}`, mapping: 'standard', timestamp: 0 } as unknown as Gamepad;
}

describe('InputManager keyboard mapping', () => {
  let im: InputManager;
  beforeEach(() => {
    im = new InputManager();
    im.attach(window);
  });

  it('P1 moves with WASD and acts with E/Q', () => {
    key(window, 'keydown', 'KeyD');
    key(window, 'keydown', 'KeyE');
    im.update();
    expect(im.p[0].x).toBe(1);
    expect(im.p[0].aPressed).toBe(true);
    im.update();
    expect(im.p[0].aPressed).toBe(false); // edge only once
    expect(im.p[0].a).toBe(true); // still held
    key(window, 'keyup', 'KeyD');
    key(window, 'keydown', 'KeyQ');
    im.update();
    expect(im.p[0].x).toBe(0);
    expect(im.p[0].bPressed).toBe(true);
  });

  it('in 1-player mode the arrow keys also drive player 1', () => {
    key(window, 'keydown', 'ArrowUp');
    im.update();
    expect(im.p[0].y).toBe(-1);
    expect(im.p[1].y).toBe(0);
  });

  it('in 2-player mode arrows + / . belong to player 2 only', () => {
    im.twoPlayer = true;
    key(window, 'keydown', 'ArrowLeft');
    key(window, 'keydown', 'Slash');
    key(window, 'keydown', 'KeyS');
    im.update();
    expect(im.p[1].x).toBe(-1);
    expect(im.p[1].aPressed).toBe(true);
    expect(im.p[0].x).toBe(0);
    expect(im.p[0].y).toBe(1);
    expect(im.p[0].aPressed).toBe(false);
    key(window, 'keydown', 'Period');
    im.update();
    expect(im.p[1].bPressed).toBe(true);
  });

  it('normalises diagonal movement', () => {
    key(window, 'keydown', 'KeyD');
    key(window, 'keydown', 'KeyS');
    im.update();
    expect(Math.hypot(im.p[0].x, im.p[0].y)).toBeCloseTo(1);
  });

  it('turns keys into menu navigation while a menu is open', () => {
    const got: string[] = [];
    im.events.on('nav', (d) => got.push(`nav:${d}`));
    im.events.on('confirm', () => got.push('confirm'));
    im.events.on('back', () => got.push('back'));
    im.menuMode = true;
    key(window, 'keydown', 'KeyS');
    key(window, 'keydown', 'ArrowRight');
    key(window, 'keydown', 'Enter');
    key(window, 'keydown', 'Escape');
    expect(got).toEqual(['nav:down', 'nav:right', 'confirm', 'back']);
  });

  it('Escape pauses during play', () => {
    let paused = 0;
    im.events.on('pause', () => paused++);
    key(window, 'keydown', 'Escape');
    expect(paused).toBe(1);
  });
});

describe('InputManager gamepads', () => {
  let pads: Gamepad[] = [];
  const orig = navigator.getGamepads;
  beforeEach(() => {
    pads = [];
    (navigator as any).getGamepads = () => pads;
  });
  afterEach(() => {
    (navigator as any).getGamepads = orig;
  });

  it('first pad drives P1 (stick + A button)', () => {
    const im = new InputManager();
    pads = [fakePad(0, { axes: [0.9, 0], pressed: [0] })];
    im.update();
    expect(im.p[0].x).toBeCloseTo(0.9);
    expect(im.p[0].aPressed).toBe(true);
    expect(im.p[0].source).toBe('pad');
  });

  it('ignores stick noise inside the dead zone', () => {
    const im = new InputManager();
    pads = [fakePad(0, { axes: [0.1, -0.12] })];
    im.update();
    expect(im.p[0].x).toBe(0);
    expect(im.p[0].y).toBe(0);
  });

  it('second pad drives P2 once two players are playing', () => {
    const im = new InputManager();
    im.twoPlayer = true;
    pads = [fakePad(0), fakePad(1, { pressed: [15] })]; // d-pad right
    im.update();
    expect(im.p[1].x).toBe(1);
    expect(im.p[0].x).toBe(0);
  });

  it('Start on a second pad asks to join as player 2', () => {
    const im = new InputManager();
    const joins: number[] = [];
    im.events.on('join-request', (i) => joins.push(i));
    pads = [fakePad(0), fakePad(1, { pressed: [9] })];
    im.update();
    expect(joins).toEqual([1]);
  });

  it('d-pad navigates menus with auto-repeat', () => {
    const im = new InputManager();
    im.menuMode = true;
    const nav: string[] = [];
    im.events.on('nav', (d) => nav.push(d));
    pads = [fakePad(0, { pressed: [13] })];
    im.update(0);
    im.update(100); // held, before repeat delay
    im.update(400); // repeat
    expect(nav).toEqual(['down', 'down']);
  });
});

describe('InputManager menu navigation with several devices (M1 review)', () => {
  let pads: Gamepad[] = [];
  const orig = navigator.getGamepads;
  beforeEach(() => {
    pads = [];
    (navigator as any).getGamepads = () => pads;
  });
  afterEach(() => {
    (navigator as any).getGamepads = orig;
  });

  it('a key press with an idle pad connected gives exactly one nav', () => {
    const im = new InputManager();
    im.attach(window);
    im.menuMode = true;
    const nav: string[] = [];
    im.events.on('nav', (d) => nav.push(d));
    pads = [fakePad(0)];
    key(window, 'keydown', 'ArrowDown');
    im.update(0);
    im.update(16);
    key(window, 'keyup', 'ArrowDown');
    expect(nav).toEqual(['down']);
  });

  it('two pads in 1-player mode: one d-pad press gives exactly one nav', () => {
    const im = new InputManager();
    im.menuMode = true;
    const nav: string[] = [];
    im.events.on('nav', (d) => nav.push(d));
    pads = [fakePad(0, { pressed: [13] }), fakePad(1)];
    im.update(0);
    pads = [fakePad(0), fakePad(1)];
    im.update(16);
    expect(nav).toEqual(['down']);
  });
});
