import { h, clear } from './dom';
import { audio } from '../audio/audio';

/**
 * DOM overlay UI. All menus, dialogue, HUD and puzzles are HTML on top of the Phaser canvas:
 * crisp text at any DPI, responsive layout, and easy to drive from Playwright.
 *
 * Screens form a stack; the top screen owns input. `Nav` gives keyboard/gamepad users spatial focus.
 */
export interface Screen {
  id: string;
  el: HTMLElement;
  /** Called when the player presses Back/Cancel. Return false to ignore. */
  onBack?: () => boolean | void;
  /** Directional input not consumed by focus navigation (e.g. for custom widgets). */
  onDir?: (dir: Dir) => boolean | void;
  onConfirm?: () => boolean | void;
  onClose?: () => void;
  /** Screens that should not block world input (e.g. toasts) set this. */
  passive?: boolean;
  /** Keep the world visible but dimmed? default true */
  dim?: boolean;
}

export type Dir = 'up' | 'down' | 'left' | 'right';

class UIManager {
  root!: HTMLElement;
  hud!: HTMLElement;
  screensLayer!: HTMLElement;
  toastLayer!: HTMLElement;
  topLayer!: HTMLElement;
  touchLayer!: HTMLElement;
  private stack: Screen[] = [];
  private listeners = new Set<() => void>();
  /** True once the player has used keyboard/gamepad for menus — shows focus rings. */
  keyboardNav = false;

  mount(root: HTMLElement): void {
    this.root = root;
    clear(root);
    this.hud = h('div', { class: 'layer hud-layer', attrs: { 'aria-live': 'polite' } });
    this.touchLayer = h('div', { class: 'layer touch-layer' });
    this.screensLayer = h('div', { class: 'layer screens-layer' });
    this.toastLayer = h('div', { class: 'layer toast-layer' });
    this.topLayer = h('div', { class: 'layer top-layer' });
    root.append(this.touchLayer, this.hud, this.screensLayer, this.toastLayer, this.topLayer);
    root.addEventListener('pointerdown', () => this.setKeyboardNav(false), true);
  }

  setKeyboardNav(on: boolean): void {
    if (this.keyboardNav === on) return;
    this.keyboardNav = on;
    this.root.classList.toggle('kbd-nav', on);
  }

  /** The screen that receives input: anything on the top layer (Pip's reminder) wins. */
  get top(): Screen | undefined {
    for (let i = this.stack.length - 1; i >= 0; i--) if (this.stack[i].el.parentElement === this.topLayer) return this.stack[i];
    return this.stack[this.stack.length - 1];
  }

  /** True while any blocking screen is open (world input should pause). */
  get blocking(): boolean {
    return this.stack.some((s) => !s.passive);
  }

  /** A menu, panel or card is open (not just a conversation or cutscene over the world). */
  get menuOpen(): boolean {
    return this.stack.some((s) => !s.passive && s.id !== 'dialogue' && s.id !== 'cutscene');
  }

  has(id: string): boolean {
    return this.stack.some((s) => s.id === id);
  }

  get ids(): string[] {
    return this.stack.map((s) => s.id);
  }

  /**
   * Briefly ignore button presses after any screen opens or closes, so a quick double-tap or a
   * held key can't "click through" into the next screen (e.g. skip the slot picker).
   */
  private lockUntil = 0;
  lock(ms = 300): void {
    this.lockUntil = Math.max(this.lockUntil, performance.now() + ms);
  }
  get locked(): boolean {
    return performance.now() < this.lockUntil;
  }

  push(screen: Screen, layer: HTMLElement = this.screensLayer): Screen {
    // Never stack two copies of the same screen.
    const existing = this.stack.find((s) => s.id === screen.id);
    if (existing) return existing;
    this.stack.push(screen);
    screen.el.classList.add('screen');
    screen.el.dataset.screen = screen.id;
    this.lock();
    layer.appendChild(screen.el);
    this.syncDim();
    requestAnimationFrame(() => this.focusFirst(screen));
    this.changed();
    return screen;
  }

  /** Remove a screen (by id or the top one). */
  pop(id?: string): void {
    const idx = id ? this.stack.findIndex((s) => s.id === id) : this.stack.length - 1;
    if (idx < 0) return;
    const [s] = this.stack.splice(idx, 1);
    s.el.remove();
    this.lock(220);
    s.onClose?.();
    this.syncDim();
    if (this.top) this.focusFirst(this.top, true);
    this.changed();
  }

  /** Replace everything with nothing (e.g. when returning to the title). */
  closeAll(): void {
    while (this.stack.length) this.pop();
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private wasMenuOpen = false;
  private changed() {
    for (const fn of this.listeners) fn();
    const open = this.menuOpen;
    if (open && !this.wasMenuOpen) this.clearVisibleToasts();
    this.wasMenuOpen = open;
    if (!open) this.flushToasts();
  }

  /** A menu just opened: toasts already on screen get out of its way. */
  private clearVisibleToasts(): void {
    if (!this.toastLayer) return;
    for (const t of [...this.toastLayer.children] as HTMLElement[]) {
      if (t.classList.contains('now')) continue;
      t.classList.remove('show');
      setTimeout(() => t.remove(), 250);
    }
  }

  // ------------------------------------------------------------ toasts
  /** News that arrived while a menu was open waits until the menus close (never covers a panel). */
  private toastQueue: { text: string; opts: ToastOpts }[] = [];
  queueToast(text: string, opts: ToastOpts): void {
    if (this.toastQueue.length < 6) this.toastQueue.push({ text, opts });
  }
  clearToasts(): void {
    this.toastQueue = [];
  }
  private flushToasts(): void {
    const q = this.toastQueue;
    if (!q.length) return;
    this.toastQueue = [];
    q.forEach((t, i) => setTimeout(() => toast(t.text, t.opts), 350 + i * 450));
  }

  private syncDim() {
    const dim = this.stack.some((s) => !s.passive && s.dim !== false);
    this.root.classList.toggle('dimmed', dim);
  }

  // ------------------------------------------------------------ navigation
  focusables(screen = this.top): HTMLElement[] {
    if (!screen) return [];
    return [...screen.el.querySelectorAll<HTMLElement>('[data-nav]:not([disabled]):not(.hidden)')].filter(
      (el) => el.offsetParent !== null,
    );
  }

  focusFirst(screen: Screen, restore = false): void {
    const els = this.focusables(screen);
    if (!els.length) return;
    const active = document.activeElement as HTMLElement | null;
    if (restore && active && screen.el.contains(active)) return;
    const pref = els.find((e) => e.dataset.autofocus !== undefined) ?? els[0];
    pref.focus({ preventScroll: true });
  }

  /** Directional navigation: move focus to the nearest focusable in that direction. */
  nav(dir: Dir): void {
    const screen = this.top;
    if (!screen) return;
    this.setKeyboardNav(true);
    const active = document.activeElement as HTMLElement | null;
    // Let custom widgets (sliders, grids) consume directions first.
    if (active?.dataset.navDir && screen.el.contains(active)) {
      const horizontal = dir === 'left' || dir === 'right';
      if (active.dataset.navDir === 'consume' || (active.dataset.navDir === 'horizontal' && horizontal)) {
        active.dispatchEvent(new CustomEvent('navdir', { detail: dir }));
        return;
      }
    }
    if (screen.onDir?.(dir) === true) return;
    const els = this.focusables(screen);
    if (!els.length) return;
    if (!active || !screen.el.contains(active) || !els.includes(active)) {
      els[0].focus();
      return;
    }
    const a = active.getBoundingClientRect();
    const ax = a.left + a.width / 2;
    const ay = a.top + a.height / 2;
    let best: HTMLElement | null = null;
    let bestScore = Infinity;
    for (const el of els) {
      if (el === active) continue;
      const b = el.getBoundingClientRect();
      const bx = b.left + b.width / 2;
      const by = b.top + b.height / 2;
      const dx = bx - ax;
      const dy = by - ay;
      let primary: number;
      let secondary: number;
      if (dir === 'up') {
        primary = -dy;
        secondary = Math.abs(dx);
      } else if (dir === 'down') {
        primary = dy;
        secondary = Math.abs(dx);
      } else if (dir === 'left') {
        primary = -dx;
        secondary = Math.abs(dy);
      } else {
        primary = dx;
        secondary = Math.abs(dy);
      }
      if (primary <= 4) continue;
      // Items in the same row (for left/right) or column (for up/down) come first, so "left"
      // from a button goes to its neighbour rather than to something below that's a bit left.
      const inBeam =
        dir === 'up' || dir === 'down'
          ? Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2
          : Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
      const score = primary + secondary * 2.2 + (inBeam ? 0 : 100_000);
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    if (best) {
      audio.sfx('blip');
      best.focus({ preventScroll: false });
      best.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  confirm(): void {
    const screen = this.top;
    if (!screen) return;
    this.setKeyboardNav(true);
    // Custom handlers (e.g. dialogue skip) decide about the anti-double-press lock themselves.
    if (screen.onConfirm?.() === true) return;
    if (this.locked) return;
    const active = document.activeElement as HTMLElement | null;
    if (active && screen.el.contains(active)) active.click();
  }

  back(): void {
    const screen = this.top;
    if (!screen) return;
    if (screen.onBack && !this.locked) {
      screen.onBack();
    }
  }
}

export const ui = new UIManager();

/** Tapping the dimmed backdrop around a panel closes it (for panels that can't lose anything). */
export function closeOnBackdrop(wrap: HTMLElement, close: () => void): HTMLElement {
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap && !ui.locked) close();
  });
  return wrap;
}

/** A chunky friendly button. */
export function button(
  label: string | Node,
  onClick: () => void,
  opts: { cls?: string; icon?: string; autofocus?: boolean; disabled?: boolean; testid?: string } = {},
): HTMLButtonElement {
  const b = h(
    'button',
    {
      class: `btn ${opts.cls ?? ''}`,
      dataset: { nav: '' },
      attrs: { type: 'button', ...(opts.testid ? { 'data-testid': opts.testid } : {}) },
      onclick: (e: Event) => {
        e.stopPropagation();
        if (b.disabled || ui.locked) return;
        audio.sfx('select');
        onClick();
      },
    },
    opts.icon ? h('span', { class: 'btn-icon', attrs: { 'aria-hidden': 'true' } }, opts.icon) : null,
    typeof label === 'string' ? h('span', { class: 'btn-label' }, label) : label,
  );
  if (opts.autofocus) b.dataset.autofocus = '';
  if (opts.disabled) b.disabled = true;
  return b;
}

export interface ToastOpts {
  icon?: string;
  ms?: number;
  cls?: string;
  /** direct feedback to what the player just did in a menu: show right away */
  now?: boolean;
}

/** Transient message bubble ("Saved!", "Got 3 carrots"). */
export function toast(text: string, opts: ToastOpts = {}): void {
  if (!ui.toastLayer) return;
  if (!opts.now && ui.menuOpen) {
    ui.queueToast(text, opts);
    return;
  }
  const el = h('div', { class: `toast ${opts.cls ?? ''} ${opts.now ? 'now' : ''}` }, opts.icon ? h('span', { class: 'toast-icon' }, opts.icon) : null, text);
  ui.toastLayer.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, opts.ms ?? 2200);
}
