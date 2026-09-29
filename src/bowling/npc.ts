import { HEAD_PIN_Y, LANE_HALF, type PinState, type Throw } from './physics';

/** Small deterministic PRNG (mulberry32): computer bowlers are repeatable in tests. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number): number {
  const u = Math.max(1e-9, r());
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * A computer bowler's throw: at a full rack it aims for the pocket just right of the head pin;
 * for a spare it aims at the front of what's left. `skill` 0..1 shrinks the wobble.
 */
export function npcThrow(skill: number, rack: PinState[], r: () => number): Throw {
  const standing = rack.filter((p) => !p.down);
  let target = 2;
  if (standing.length && standing.length < 10) {
    const front = Math.min(...standing.map((p) => p.y));
    const lead = standing.filter((p) => p.y < front + 12);
    target = lead.reduce((a, p) => a + p.x, 0) / lead.length;
  }
  const wobble = 1 + (1 - skill) * 13;
  const aimAt = target + gauss(r) * wobble;
  const x = Math.max(-LANE_HALF + 6, Math.min(LANE_HALF - 6, aimAt + gauss(r) * 2.5));
  const angle = Math.atan((aimAt - x) / HEAD_PIN_Y);
  const speed = 220 + skill * 70 + gauss(r) * 18;
  return { x, angle, speed, spin: 0 };
}
