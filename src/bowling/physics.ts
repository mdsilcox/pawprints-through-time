/**
 * A small, deterministic bowling-lane simulation (pure, unit-tested). Everything is in inches
 * and seconds on a real-size lane: the ball rolls from the foul line, hooks on the dry back end
 * when it spins (a player can steer the spin while it rolls), and knocks pins into each other.
 * The lane scene steps the same simulation live, so what you see is exactly what is scored.
 */
export const LANE_HALF = 20.75; // the lane is 41.5 in wide
export const GUTTER = 9.25;
export const HEAD_PIN_Y = 720; // 60 ft from the foul line
export const BALL_R = 4.25;
export const PIN_R = 2.4;
export const PIN_H = 15;
const ROW = 10.392; // 12 in spacing in a triangle
export const PIT_Y = HEAD_PIN_Y + 3 * ROW + 16;
export const WALL = LANE_HALF + GUTTER;
/** where the lane dries out and a spinning ball starts to curve */
export const DRY_FROM = HEAD_PIN_Y * 0.55;

/** Pin spots 1–10 (index 0 = the head pin). */
export const PIN_SPOTS: { x: number; y: number }[] = [
  { x: 0, y: HEAD_PIN_Y },
  { x: -6, y: HEAD_PIN_Y + ROW },
  { x: 6, y: HEAD_PIN_Y + ROW },
  { x: -12, y: HEAD_PIN_Y + 2 * ROW },
  { x: 0, y: HEAD_PIN_Y + 2 * ROW },
  { x: 12, y: HEAD_PIN_Y + 2 * ROW },
  { x: -18, y: HEAD_PIN_Y + 3 * ROW },
  { x: -6, y: HEAD_PIN_Y + 3 * ROW },
  { x: 6, y: HEAD_PIN_Y + 3 * ROW },
  { x: 18, y: HEAD_PIN_Y + 3 * ROW },
];

export interface Throw {
  /** where the ball is released, across the lane (inches, 0 = the middle) */
  x: number;
  /** direction, radians away from straight down the lane (+ = to the right) */
  angle: number;
  /** inches per second */
  speed: number;
  /** -1..1: how much it curves on the back end (+ curves to the right) */
  spin: number;
}

export interface PinState {
  /** 0–9 */
  id: number;
  x: number;
  y: number;
  down: boolean;
}

export interface Snapshot {
  t: number;
  ball: { x: number; y: number };
  pins: { id: number; x: number; y: number; down: boolean; vx: number; vy: number }[];
}

export interface RollResult {
  /** pins knocked down by this ball (ids) */
  down: number[];
  /** pins still standing after it, where they stand now */
  standing: PinState[];
  gutter: boolean;
  /** did the ball touch a pin? */
  reachedPins: boolean;
  /** the ball's x as it reached the head-pin row (for aiming feedback and tests) */
  xAtPins: number | null;
}

export const SPEED_MIN = 170;
export const SPEED_MAX = 330;
const HOOK = 20; // lateral in/s² per unit of spin on the back end
const BALL_MASS = 3.4;
const PIN_FRICTION = 90; // in/s² sliding pins slow down
const TOPPLE = 14; // a pin moving faster than this has been knocked over
const SUB = 1 / 480;

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  m: number;
  pin: number; // -1 for the ball
  down: boolean;
  out: boolean;
}

function collide(a: Body, b: Body, e: number): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const min = a.r + b.r;
  if (dist >= min || dist === 0) return false;
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = min - dist;
  const tot = a.m + b.m;
  a.x -= nx * overlap * (b.m / tot);
  a.y -= ny * overlap * (b.m / tot);
  b.x += nx * overlap * (a.m / tot);
  b.y += ny * overlap * (a.m / tot);
  const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rel >= 0) return true;
  const j = (-(1 + e) * rel) / (1 / a.m + 1 / b.m);
  a.vx -= (j * nx) / a.m;
  a.vy -= (j * ny) / a.m;
  b.vx += (j * nx) / b.m;
  b.vy += (j * ny) / b.m;
  return true;
}

/** One ball rolling at the pins still standing, stepped in small fixed sub-steps. */
export class LaneSim {
  readonly ball: Body;
  readonly pins: Body[];
  private start: { x: number; y: number }[];
  t = 0;
  gutter = false;
  reachedPins = false;
  done = false;
  xAtPins: number | null = null;
  /** current spin (-1..1); the scene may steer it while the ball is on the lane */
  spin: number;
  private acc = 0;
  private opts: { bumpers?: boolean };

  constructor(th: Throw, standing: PinState[], opts: { bumpers?: boolean } = {}) {
    this.opts = opts;
    const speed = Math.max(SPEED_MIN, Math.min(SPEED_MAX, th.speed));
    this.spin = Math.max(-1, Math.min(1, th.spin));
    this.ball = { x: Math.max(-LANE_HALF + BALL_R, Math.min(LANE_HALF - BALL_R, th.x)), y: 0, vx: Math.sin(th.angle) * speed, vy: Math.cos(th.angle) * speed, r: BALL_R, m: BALL_MASS, pin: -1, down: false, out: false };
    this.pins = standing.filter((p) => !p.down).map((p) => ({ x: p.x, y: p.y, vx: 0, vy: 0, r: PIN_R, m: 1, pin: p.id, down: false, out: false }));
    this.start = this.pins.map((p) => ({ x: p.x, y: p.y }));
  }

  /** Has the ball reached the part of the lane where spin still matters? */
  get steerable(): boolean {
    return !this.gutter && !this.ball.out && this.ball.y < HEAD_PIN_Y - 20;
  }

  step(dt: number): void {
    if (this.done) return;
    this.acc += dt;
    while (this.acc >= SUB && !this.done) {
      this.acc -= SUB;
      this.sub();
    }
  }

  private sub(): void {
    const ball = this.ball;
    const pins = this.pins;
    if (!ball.out) {
      if (!this.gutter && ball.y > DRY_FROM) ball.vx += HOOK * this.spin * SUB;
      ball.x += ball.vx * SUB;
      ball.y += ball.vy * SUB;
      if (this.xAtPins === null && ball.y >= HEAD_PIN_Y - PIN_R - BALL_R) this.xAtPins = ball.x;
      if (!this.gutter && Math.abs(ball.x) > LANE_HALF) {
        if (this.opts.bumpers) {
          ball.x = Math.sign(ball.x) * LANE_HALF;
          ball.vx = -ball.vx * 0.55;
        } else if (ball.y < HEAD_PIN_Y - PIN_R - BALL_R) {
          // into the gutter: it rolls past the pins
          this.gutter = true;
          ball.vx = 0;
          ball.x = Math.sign(ball.x) * (LANE_HALF + GUTTER / 2);
        }
      }
      if (ball.y > PIT_Y) ball.out = true;
    }
    for (const p of pins) {
      if (p.out) continue;
      const v = Math.hypot(p.vx, p.vy);
      if (v > 0) {
        const dec = Math.min(v, PIN_FRICTION * SUB);
        p.vx -= (p.vx / v) * dec;
        p.vy -= (p.vy / v) * dec;
      }
      p.x += p.vx * SUB;
      p.y += p.vy * SUB;
      if (v > TOPPLE) p.down = true;
      // the side kickbacks bounce pins back in; the pit swallows them
      if (Math.abs(p.x) > WALL - p.r) {
        p.x = Math.sign(p.x) * (WALL - p.r);
        p.vx = -p.vx * 0.5;
        p.down = true;
      }
      if (p.y > PIT_Y || p.y < HEAD_PIN_Y - 30) {
        p.out = true;
        p.down = true;
      }
    }
    if (!this.gutter && !ball.out)
      for (const p of pins) {
        if (p.out) continue;
        if (collide(ball, p, 0.8)) {
          this.reachedPins = true;
          p.down = true;
        }
      }
    for (let i = 0; i < pins.length; i++)
      for (let k = i + 1; k < pins.length; k++) {
        const a = pins[i];
        const b = pins[k];
        if (a.out || b.out) continue;
        if (collide(a, b, 0.85)) {
          if (Math.hypot(a.vx, a.vy) > TOPPLE) a.down = true;
          if (Math.hypot(b.vx, b.vy) > TOPPLE) b.down = true;
        }
      }
    this.t += SUB;
    const settled = pins.every((p) => p.out || Math.hypot(p.vx, p.vy) < 0.5);
    if (this.gutter && ball.y > PIT_Y) ball.out = true;
    if ((ball.out && settled) || this.t > 8) this.finish();
  }

  private finish(): void {
    this.done = true;
    // a pin nudged more than an inch off its spot has wobbled over
    this.pins.forEach((p, i) => {
      if (Math.hypot(p.x - this.start[i].x, p.y - this.start[i].y) > 1.2) p.down = true;
    });
  }

  snapshot(): Snapshot {
    return {
      t: this.t,
      ball: { x: this.ball.x, y: this.ball.y },
      pins: this.pins.map((p) => ({ id: p.pin, x: p.x, y: p.y, down: p.down, vx: p.vx, vy: p.vy })),
    };
  }

  result(): RollResult {
    return {
      down: this.pins.filter((p) => p.down).map((p) => p.pin),
      standing: this.pins.filter((p) => !p.down).map((p) => ({ id: p.pin, x: p.x, y: p.y, down: false })),
      gutter: this.gutter,
      reachedPins: this.reachedPins,
      xAtPins: this.xAtPins,
    };
  }
}

/** Roll one ball to the end, in one go (computer bowlers and tests). */
export function simulateRoll(th: Throw, standing: PinState[], opts: { bumpers?: boolean } = {}): RollResult {
  const sim = new LaneSim(th, standing, opts);
  while (!sim.done) sim.step(1 / 60);
  return sim.result();
}

/** A fresh rack of ten pins. */
export function freshRack(): PinState[] {
  return PIN_SPOTS.map((s, id) => ({ id, x: s.x, y: s.y, down: false }));
}

/** Where a straight throw from `x` at `angle` crosses the head-pin row. */
export function aimPoint(x: number, angle: number): number {
  return x + Math.tan(angle) * HEAD_PIN_Y;
}
