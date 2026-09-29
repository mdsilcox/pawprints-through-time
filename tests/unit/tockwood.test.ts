import { describe, it, expect } from 'vitest';
import { advance, formatTime, nightAmount, phase, sleepUntilMorning, tint, MORNING, DAY_MINUTES } from '../../src/world/clock';
import { availableSpots, pickLoot, spotsForDay, type DigZone } from '../../src/world/dig';
import { TerrainGrid } from '../../src/world/terrain';
import { CollisionGrid } from '../../src/world/collision';

describe('in-game clock (day/night)', () => {
  it('runs one in-game minute per real second and rolls over to a new day', () => {
    const c = { day: 1, minutes: 23 * 60 };
    expect(advance(c, 30_000)).toBe(false); // 30 real seconds = 30 in-game minutes
    expect(c.minutes).toBeCloseTo(23 * 60 + 30, 5);
    expect(advance(c, 60_000)).toBe(true);
    expect(c.day).toBe(2);
    expect(c.minutes).toBeLessThan(DAY_MINUTES);
  });

  it('knows the phase of the day', () => {
    expect(phase(8 * 60)).toBe('day');
    expect(phase(19 * 60)).toBe('dusk');
    expect(phase(23 * 60)).toBe('night');
    expect(phase(3 * 60)).toBe('night');
    expect(phase(6 * 60)).toBe('dawn');
  });

  it('darkens smoothly at dusk and lightens at dawn', () => {
    expect(nightAmount(12 * 60)).toBe(0);
    expect(nightAmount(22 * 60)).toBe(1);
    const dusk = nightAmount(19.5 * 60);
    expect(dusk).toBeGreaterThan(0);
    expect(dusk).toBeLessThan(1);
    expect(nightAmount(5.75 * 60)).toBeGreaterThan(0);
    expect(nightAmount(5.75 * 60)).toBeLessThan(1);
  });

  it('tints the world white by day and blue at night', () => {
    expect(tint(12 * 60)).toBe(0xffffff);
    const n = tint(23 * 60);
    const r = (n >> 16) & 255;
    const b = n & 255;
    expect(b).toBeGreaterThan(r);
  });

  it('formats a friendly clock', () => {
    expect(formatTime(0)).toBe('12:00 AM');
    expect(formatTime(8 * 60 + 5)).toBe('8:05 AM');
    expect(formatTime(13 * 60 + 30)).toBe('1:30 PM');
  });

  it('sleeping skips to the next morning (or the same morning after midnight)', () => {
    const evening = { day: 3, minutes: 21 * 60 };
    sleepUntilMorning(evening);
    expect(evening).toEqual({ day: 4, minutes: MORNING });
    const lateNight = { day: 4, minutes: 1 * 60 };
    sleepUntilMorning(lateNight);
    expect(lateNight).toEqual({ day: 4, minutes: MORNING });
  });
});

describe("Biscuit's dig spots", () => {
  const grid = new TerrainGrid(20, 12, 'grass').rect('water', 0, 0, 20, 2).rect('sand', 0, 8, 20, 4);
  const coll = new CollisionGrid(20, 12);
  coll.blockRect(0, 0, 20, 2);
  const zones: DigZone[] = [
    { id: 'beach', x: 0, y: 0, w: 20, h: 12, on: ['sand'], perDay: 3, hidden: 0.5, loot: [['shell-scallop', 1]] },
    { id: 'field', x: 0, y: 0, w: 20, h: 12, on: ['grass'], perDay: 2, hidden: 0, loot: [['clock-gear', 1]] },
  ];

  it('makes the same spots for the same day (stable across reloads) and new ones tomorrow', () => {
    const a = spotsForDay('m', 5, zones, grid, coll);
    const b = spotsForDay('m', 5, zones, grid, coll);
    const c = spotsForDay('m', 6, zones, grid, coll);
    expect(a).toEqual(b);
    expect(a.map((s) => `${s.cx},${s.cy}`)).not.toEqual(c.map((s) => `${s.cx},${s.cy}`));
  });

  it('only puts spots on matching, walkable terrain and spreads them out', () => {
    const spots = spotsForDay('m', 9, zones, grid, coll);
    expect(spots.filter((s) => s.zone === 'beach')).toHaveLength(3);
    expect(spots.filter((s) => s.zone === 'field')).toHaveLength(2);
    for (const s of spots) {
      expect(coll.isSolid(s.cx, s.cy)).toBe(false);
      expect(grid.get(s.cx, s.cy)).toBe(s.zone === 'beach' ? 'sand' : 'grass');
    }
    for (const s of spots) for (const t of spots) if (s !== t) expect(Math.abs(s.cx - t.cx) + Math.abs(s.cy - t.cy)).toBeGreaterThanOrEqual(3);
    expect(spots.filter((s) => s.zone === 'field').every((s) => !s.hidden)).toBe(true);
  });

  it('removes spots that were already dug today', () => {
    const spots = spotsForDay('m', 2, zones, grid, coll);
    const dug = { [spots[0].id]: 2 };
    expect(availableSpots(spots, dug)).toHaveLength(spots.length - 1);
  });

  it('picks loot by weight', () => {
    let i = 0;
    const seq = [0.1, 0.95];
    const r = () => seq[i++ % seq.length];
    expect(pickLoot([['a', 9], ['b', 1]], r)).toBe('a');
    expect(pickLoot([['a', 9], ['b', 1]], r)).toBe('b');
  });
});
