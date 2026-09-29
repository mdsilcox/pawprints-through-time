import { describe, it, expect } from 'vitest';
import { TerrainGrid, variantAt, layerVariants, cullCovered } from '../../src/world/terrain';
import { CollisionGrid, TILE } from '../../src/world/collision';
import { frameZoom, maxSeparation, tether, type FrameOpts } from '../../src/world/cameraMath';

describe('terrain dual-grid autotiling', () => {
  it('encodes the four corner cells as a 4-bit variant', () => {
    const g = new TerrainGrid(3, 3, 'water');
    g.set(0, 0, 'grass'); // TL of display tile (0,0)
    const grass = new Set(['grass'] as const);
    expect(variantAt(g, grass, 0, 0)).toBe(1);
    g.set(1, 0, 'grass');
    expect(variantAt(g, grass, 0, 0)).toBe(1 | 2);
    g.set(0, 1, 'grass');
    g.set(1, 1, 'grass');
    expect(variantAt(g, grass, 0, 0)).toBe(15);
    expect(variantAt(g, grass, 1, 1)).toBe(1); // only its TL corner (1,1) is grass
  });

  it('produces (w-1)x(h-1) display tiles with -1 for empty ones', () => {
    const g = new TerrainGrid(5, 4, 'water').rect('sand', 1, 1, 2, 2);
    const v = layerVariants(g, new Set(['sand'] as const));
    expect(v).toHaveLength(3);
    expect(v[0]).toHaveLength(4);
    expect(v[0][3]).toBe(-1);
    expect(v[1][1]).toBe(15);
  });

  it('culls lower-layer tiles hidden under a full opaque tile', () => {
    const lower = [[15, 3]];
    const upper = [[15, 1]];
    cullCovered([lower, upper], [true, true]);
    expect(lower[0][0]).toBe(-1); // covered
    expect(lower[0][1]).toBe(3); // partially covered: kept
  });

  it('builds shapes with ellipse/rect/line helpers', () => {
    const g = new TerrainGrid(20, 20, 'water').ellipse('sand', 10, 10, 6, 6).line('path', [[4, 10], [16, 10]], 2, ['sand']);
    expect(g.get(10, 10)).toBe('path');
    expect(g.get(10, 6)).toBe('sand');
    expect(g.get(0, 0)).toBe('water');
    expect(g.get(-1, 5)).toBe('void');
  });
});

describe('collision', () => {
  const feet = { hw: TILE * 0.26, hh: TILE * 0.14 };
  function room() {
    const c = new CollisionGrid(10, 10);
    c.blockRect(0, 0, 10, 1);
    c.blockRect(0, 9, 10, 1);
    c.blockRect(0, 0, 1, 10);
    c.blockRect(9, 0, 1, 10);
    return c;
  }

  it('moves freely in open space', () => {
    const c = room();
    const r = c.move({ x: 5 * TILE, y: 5 * TILE, ...feet }, 40, -20);
    expect(r.x).toBeCloseTo(5 * TILE + 40);
    expect(r.y).toBeCloseTo(5 * TILE - 20);
    expect(r.blockedX || r.blockedY).toBe(false);
  });

  it('stops at walls and slides along them', () => {
    const c = room();
    // pushing up-right into the top wall: x keeps moving, y is blocked
    const r = c.move({ x: 5 * TILE, y: 1 * TILE + feet.hh + 2, ...feet }, 30, -50);
    expect(r.blockedY).toBe(true);
    expect(r.blockedX).toBe(false);
    expect(r.x).toBeCloseTo(5 * TILE + 30);
    expect(r.y - feet.hh).toBeGreaterThanOrEqual(TILE - 0.02);
  });

  it('never tunnels through a one-tile wall even with a huge step', () => {
    const c = new CollisionGrid(10, 3);
    c.blockRect(5, 0, 1, 3);
    const r = c.move({ x: 2.5 * TILE, y: 1.5 * TILE, ...feet }, TILE * 6, 0);
    expect(r.blockedX).toBe(true);
    expect(r.x + feet.hw).toBeLessThanOrEqual(5 * TILE + 0.01);
  });

  it('corner-assist nudges toward a nearby gap (doorways)', () => {
    const c = new CollisionGrid(10, 10);
    c.blockRect(0, 4, 10, 1);
    c.setSolid(5, 4, false); // a one-tile door in the wall at x=5
    // standing below the wall, slightly left of the door, walking up
    const b = { x: 5 * TILE + 10, y: 5 * TILE + feet.hh + 1, ...feet };
    const n = c.cornerNudge(b, 0, -10, TILE * 0.45);
    expect(n.nx).toBe(1); // nudged right, toward the gap centre
    // far from any gap there is no nudge
    const far = c.cornerNudge({ ...b, x: 1.5 * TILE }, 0, -10, TILE * 0.45);
    expect(far).toEqual({ nx: 0, ny: 0 });
  });
});

describe('shared camera and tether', () => {
  const opts: FrameOpts = { viewW: 1280, viewH: 720, baseZoom: 0.8, minZoom: 0.6, marginX: 100, marginTop: 180, marginBottom: 80 };

  it('uses the base zoom for one player or players close together', () => {
    expect(frameZoom([{ x: 0, y: 0 }], opts)).toBe(0.8);
    expect(frameZoom([{ x: 0, y: 0 }, { x: 100, y: 0 }], opts)).toBe(0.8);
  });

  it('pulls back to fit two players, but never past minZoom', () => {
    const z = frameZoom([{ x: 0, y: 0 }, { x: 1600, y: 0 }], opts);
    expect(z).toBeLessThan(0.8);
    expect(z).toBeGreaterThanOrEqual(0.6);
    expect(1280 / z).toBeGreaterThanOrEqual(1600 + 200 - 0.01);
    expect(frameZoom([{ x: 0, y: 0 }, { x: 50000, y: 0 }], opts)).toBe(0.6);
  });

  it('stops players from walking apart past the limit', () => {
    const lim = maxSeparation(opts);
    const a = { x: 0, y: 0 };
    const b = { x: lim.w - 5, y: 0 };
    const [a2, b2] = tether([a, b], [{ x: -50, y: 0 }, { x: b.x + 50, y: 0 }], lim);
    expect(Math.abs(b2.x - a2.x)).toBeLessThanOrEqual(lim.w + 0.001);
  });

  it('never restricts moving back together', () => {
    const lim = maxSeparation(opts);
    const a = { x: 0, y: 0 };
    const b = { x: lim.w, y: 0 };
    const [a2, b2] = tether([a, b], [{ x: 40, y: 0 }, { x: lim.w - 40, y: 0 }], lim);
    expect(a2.x).toBe(40);
    expect(b2.x).toBe(lim.w - 40);
  });

  it('is soft: widening movement slows down inside the soft zone', () => {
    const lim = maxSeparation(opts);
    const a = { x: 0, y: 0 };
    const b = { x: lim.w * 0.9, y: 0 };
    const [, b2] = tether([a, b], [a, { x: b.x + 20, y: 0 }], lim);
    expect(b2.x - b.x).toBeGreaterThan(0);
    expect(b2.x - b.x).toBeLessThan(20);
    // well inside the limit, movement is untouched
    const near = { x: lim.w * 0.3, y: 0 };
    const [, b3] = tether([a, near], [a, { x: near.x + 20, y: 0 }], lim);
    expect(b3.x - near.x).toBe(20);
  });

  it('limits vertical separation too', () => {
    const lim = maxSeparation(opts);
    const a = { x: 0, y: 0 };
    const b = { x: 0, y: lim.h };
    const [a2, b2] = tether([a, b], [{ x: 0, y: -30 }, { x: 0, y: lim.h + 30 }], lim);
    expect(Math.abs(b2.y - a2.y)).toBeLessThanOrEqual(lim.h + 0.001);
  });
});
