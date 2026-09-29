/**
 * Shared-screen camera maths for 1-2 players: framing zoom and the soft tether that keeps
 * both players on screen. Pure functions so they can be unit-tested.
 */
export interface Pt {
  x: number;
  y: number;
}

export interface FrameOpts {
  viewW: number; // screen size in device pixels
  viewH: number;
  baseZoom: number; // preferred zoom for one player
  minZoom: number; // furthest the camera will pull back for two players
  marginX: number; // world units kept free around players
  marginTop: number;
  marginBottom: number;
}

/** Zoom that fits every point (with margins) on screen, clamped to [minZoom, baseZoom]. */
export function frameZoom(points: Pt[], o: FrameOpts): number {
  if (points.length < 2) return o.baseZoom;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs) + o.marginX * 2;
  const h = Math.max(...ys) - Math.min(...ys) + o.marginTop + o.marginBottom;
  const z = Math.min(o.viewW / w, o.viewH / h, o.baseZoom);
  return Math.max(o.minZoom, z);
}

/** Largest player separation (world units) that still fits on screen at minZoom. */
export function maxSeparation(o: FrameOpts): { w: number; h: number } {
  return {
    w: o.viewW / o.minZoom - o.marginX * 2,
    h: o.viewH / o.minZoom - o.marginTop - o.marginBottom,
  };
}

export function midpoint(points: Pt[]): Pt {
  const n = points.length || 1;
  return { x: points.reduce((s, p) => s + p.x, 0) / n, y: points.reduce((s, p) => s + p.y, 0) / n };
}

/**
 * Soft tether for two players. Given where they were (valid) and where their input wants them,
 * slow down movement that pulls them apart once they pass `softStart` of the limit, and stop it
 * entirely at the limit. Movement that brings them together is never restricted.
 */
export function tether(prev: [Pt, Pt], next: [Pt, Pt], limit: { w: number; h: number }, softStart = 0.8): [Pt, Pt] {
  const out: [Pt, Pt] = [{ ...next[0] }, { ...next[1] }];
  for (const axis of ['x', 'y'] as const) {
    const max = axis === 'x' ? limit.w : limit.h;
    const sepPrev = Math.abs(prev[0][axis] - prev[1][axis]);
    const sepNext = Math.abs(out[0][axis] - out[1][axis]);
    if (sepNext <= sepPrev) continue; // moving together (or parallel): always fine
    if (sepNext <= max * softStart) continue;
    // soft zone: scale the widening movement down smoothly, to zero at the limit
    const t = Math.min(1, Math.max(0, (sepPrev - max * softStart) / (max * (1 - softStart))));
    const factor = 1 - t;
    for (const i of [0, 1] as const) {
      const other = i === 0 ? 1 : 0;
      const d = out[i][axis] - prev[i][axis];
      const away = Math.sign(d) === Math.sign(prev[i][axis] - prev[other][axis]) || prev[i][axis] === prev[other][axis];
      if (away && d !== 0) out[i][axis] = prev[i][axis] + d * factor;
    }
    // hard limit
    const sepFinal = Math.abs(out[0][axis] - out[1][axis]);
    const allowed = Math.max(max, sepPrev);
    if (sepFinal > allowed) {
      const over = sepFinal - allowed;
      // pull back whoever moved away, split evenly if both did
      const movedA = Math.abs(out[0][axis] - prev[0][axis]);
      const movedB = Math.abs(out[1][axis] - prev[1][axis]);
      const total = movedA + movedB || 1;
      const dirA = Math.sign(out[0][axis] - out[1][axis]);
      out[0][axis] -= dirA * over * (movedA / total);
      out[1][axis] += dirA * over * (movedB / total);
    }
  }
  return out;
}
