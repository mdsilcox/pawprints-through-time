import type { Dir } from '../ui/ui';
import type { TouchSource } from './input';
import { h } from '../ui/dom';

/**
 * On-screen touch controls. Profiles:
 *  - 'world': floating virtual joystick + action buttons. 1P: stick on the left, buttons on the right.
 *    2P: each player owns half the screen (left = P1, right = P2) with a stick and an action button.
 *  - 'swipe': swipe/tap zones for rhythm play (whole screen in 1P, halves in 2P).
 *  - 'none': hidden.
 */
export type TouchProfile = 'world' | 'swipe' | 'none';

interface StickState {
  pointer: number | null;
  ox: number;
  oy: number;
  x: number;
  y: number;
  startT: number;
  swiped: boolean;
}

interface PlayerTouch {
  stick: StickState;
  a: boolean;
  b: boolean;
  aPressed: boolean;
  bPressed: boolean;
  dir: Dir | null;
  zone: HTMLElement;
  base: HTMLElement;
  knob: HTMLElement;
  aBtn: HTMLButtonElement;
  bBtn: HTMLButtonElement;
  aLabel: HTMLElement;
}

const RADIUS = 52; // css px the knob can travel

export class TouchControls implements TouchSource {
  readonly root: HTMLElement;
  private players: [PlayerTouch, PlayerTouch];
  private twoPlayer = false;
  private profile: TouchProfile = 'none';
  private enabled = false;

  constructor(layer: HTMLElement) {
    this.root = h('div', { class: 'touch-controls hidden', attrs: { 'aria-hidden': 'true' } });
    this.players = [this.makePlayer(0), this.makePlayer(1)];
    this.root.append(this.players[0].zone, this.players[1].zone);
    layer.appendChild(this.root);
    this.applyLayout();
  }

  private makePlayer(slot: 0 | 1): PlayerTouch {
    const zone = h('div', { class: `touch-zone p${slot + 1}`, dataset: { player: String(slot + 1) } });
    const base = h('div', { class: 'stick-base' });
    const knob = h('div', { class: 'stick-knob' });
    base.appendChild(knob);
    const aLabel = h('span', { class: 'touch-btn-label' }, 'Action');
    const aBtn = h('button', { class: 'touch-btn a', attrs: { type: 'button', 'data-testid': `touch-a-p${slot + 1}` } }, h('span', { class: 'touch-btn-glyph' }, 'A'), aLabel);
    const bBtn = h('button', { class: 'touch-btn b', attrs: { type: 'button', 'data-testid': `touch-b-p${slot + 1}` } }, h('span', { class: 'touch-btn-glyph' }, 'B'), h('span', { class: 'touch-btn-label' }, 'Sniff'));
    zone.append(base, aBtn, bBtn);
    const pt: PlayerTouch = {
      stick: { pointer: null, ox: 0, oy: 0, x: 0, y: 0, startT: 0, swiped: false },
      a: false,
      b: false,
      aPressed: false,
      bPressed: false,
      dir: null,
      zone,
      base,
      knob,
      aBtn,
      bBtn,
      aLabel,
    };
    const btnHandlers = (btn: HTMLButtonElement, which: 'a' | 'b') => {
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        btn.setPointerCapture(e.pointerId);
        pt[which] = true;
        if (which === 'a') pt.aPressed = true;
        else pt.bPressed = true;
        btn.classList.add('down');
      });
      const up = (e: PointerEvent) => {
        e.stopPropagation();
        pt[which] = false;
        btn.classList.remove('down');
      };
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
    };
    btnHandlers(aBtn, 'a');
    btnHandlers(bBtn, 'b');

    zone.addEventListener('pointerdown', (e) => {
      if (pt.stick.pointer !== null) return;
      const r = zone.getBoundingClientRect();
      // In 1P world mode the stick only lives on the left side; the right side is for buttons.
      if (!this.twoPlayer && this.profile === 'world' && e.clientX - r.left > r.width * 0.6) return;
      e.preventDefault();
      zone.setPointerCapture(e.pointerId);
      pt.stick = { pointer: e.pointerId, ox: e.clientX - r.left, oy: e.clientY - r.top, x: 0, y: 0, startT: performance.now(), swiped: false };
      if (this.profile === 'swipe') pt.aPressed = true; // a tap is a "hit" in rhythm play
      base.style.left = `${pt.stick.ox}px`;
      base.style.top = `${pt.stick.oy}px`;
      base.classList.add('active');
      knob.style.transform = 'translate(-50%, -50%)';
    });
    zone.addEventListener('pointermove', (e) => {
      if (pt.stick.pointer !== e.pointerId) return;
      const r = zone.getBoundingClientRect();
      const dx = e.clientX - r.left - pt.stick.ox;
      const dy = e.clientY - r.top - pt.stick.oy;
      const len = Math.hypot(dx, dy);
      const k = len > RADIUS ? RADIUS / len : 1;
      pt.stick.x = (dx * k) / RADIUS;
      pt.stick.y = (dy * k) / RADIUS;
      knob.style.transform = `translate(calc(-50% + ${dx * k}px), calc(-50% + ${dy * k}px))`;
      if (!pt.stick.swiped && len > 34) {
        pt.stick.swiped = true;
        pt.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      }
    });
    const end = (e: PointerEvent) => {
      if (pt.stick.pointer !== e.pointerId) return;
      pt.stick.pointer = null;
      pt.stick.x = 0;
      pt.stick.y = 0;
      base.classList.remove('active');
      this.placeIdleBase(pt, slot);
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    return pt;
  }

  private placeIdleBase(pt: PlayerTouch, slot: 0 | 1) {
    // Rest the (faint) stick near the outer bottom corner of the zone.
    pt.base.style.left = slot === 0 || !this.twoPlayer ? '26%' : '74%';
    pt.base.style.top = '70%';
    pt.knob.style.transform = 'translate(-50%, -50%)';
  }

  setTwoPlayer(on: boolean): void {
    this.twoPlayer = on;
    this.applyLayout();
  }

  setProfile(p: TouchProfile): void {
    this.profile = p;
    this.applyLayout();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.applyLayout();
  }

  get isShown(): boolean {
    return this.enabled && this.profile !== 'none';
  }

  /** Contextual label on the action button ("Talk", "Dig", "Enter"...). */
  setActionLabel(slot: 0 | 1, label: string | null): void {
    const pt = this.players[slot];
    const text = label ?? 'Action';
    if (pt.aLabel.textContent !== text) pt.aLabel.textContent = text;
    pt.aBtn.classList.toggle('ready', !!label);
  }

  private applyLayout() {
    const show = this.enabled && this.profile !== 'none';
    this.root.classList.toggle('hidden', !show);
    this.root.classList.toggle('two', this.twoPlayer);
    this.root.dataset.profile = this.profile;
    this.players[1].zone.classList.toggle('hidden', !this.twoPlayer);
    this.players.forEach((pt, i) => {
      pt.aBtn.classList.toggle('hidden', this.profile !== 'world');
      pt.bBtn.classList.toggle('hidden', this.profile !== 'world');
      pt.base.classList.toggle('hidden', this.profile !== 'world');
      this.placeIdleBase(pt, i as 0 | 1);
    });
    if (!show) this.reset();
  }

  reset(): void {
    for (const pt of this.players) {
      pt.stick.pointer = null;
      pt.stick.x = pt.stick.y = 0;
      pt.a = pt.b = pt.aPressed = pt.bPressed = false;
      pt.dir = null;
      pt.base.classList.remove('active');
      pt.aBtn.classList.remove('down');
      pt.bBtn.classList.remove('down');
    }
  }

  read(slot: 0 | 1) {
    if (!this.enabled || this.profile === 'none') return null;
    // In 1P mode the single (left) zone drives P1; the P2 zone is hidden.
    if (slot === 1 && !this.twoPlayer) return null;
    const pt = this.players[slot];
    return {
      x: this.profile === 'world' ? pt.stick.x : 0,
      y: this.profile === 'world' ? pt.stick.y : 0,
      a: pt.a,
      b: pt.b,
      aPressed: pt.aPressed,
      bPressed: pt.bPressed,
      dir: pt.dir,
    };
  }

  endFrame(): void {
    for (const pt of this.players) {
      pt.aPressed = false;
      pt.bPressed = false;
      pt.dir = null;
    }
  }
}
