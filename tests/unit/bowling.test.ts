import { describe, expect, it } from 'vitest';
import { gameOver, nextBall, onFreshRack, pinsStanding, scorecard, toFrames, totalScore } from '../../src/bowling/score';
import { freshRack, simulateRoll, LANE_HALF, PIN_SPOTS } from '../../src/bowling/physics';
import { npcThrow, rng } from '../../src/bowling/npc';
import { TRICK_SHOTS, allTricksCleared, trickUnlocked } from '../../src/bowling/tricks';

const deg = (d: number) => (d * Math.PI) / 180;

describe('bowling scoring', () => {
  it('a perfect game is 300, all spares of 5 is 150, all gutters is 0', () => {
    expect(totalScore(Array(12).fill(10))).toBe(300);
    expect(gameOver(Array(12).fill(10))).toBe(true);
    expect(totalScore(Array(21).fill(5))).toBe(150);
    expect(gameOver(Array(21).fill(5))).toBe(true);
    expect(totalScore(Array(20).fill(0))).toBe(0);
    expect(gameOver(Array(20).fill(0))).toBe(true);
    expect(gameOver(Array(19).fill(0))).toBe(false);
  });

  it('strikes and spares wait for their bonus balls', () => {
    // X, 7/, 9-, then an open frame
    const rolls = [10, 7, 3, 9, 0, 3, 4];
    const card = scorecard(rolls);
    expect(card.map((f) => f.marks)).toEqual([['X'], ['7', '/'], ['9', '-'], ['3', '4']]);
    expect(card.map((f) => f.total)).toEqual([20, 39, 48, 55]);
    // a strike isn't scored until two more balls are rolled
    expect(scorecard([10, 10]).map((f) => f.total)).toEqual([null, null]);
    expect(scorecard([10, 10, 4]).map((f) => f.total)).toEqual([24, null, null]);
    // a spare waits for one ball
    expect(scorecard([6, 4]).map((f) => f.total)).toEqual([null]);
    expect(scorecard([6, 4, 8]).map((f) => f.total)).toEqual([18, null]);
  });

  it('the tenth frame: bonus balls after a strike or spare, fresh racks, and the right marks', () => {
    const nine = Array(18).fill(0);
    expect(scorecard([...nine, 10, 10, 10])[9].marks).toEqual(['X', 'X', 'X']);
    expect(scorecard([...nine, 7, 3, 10])[9].marks).toEqual(['7', '/', 'X']);
    expect(scorecard([...nine, 10, 7, 3])[9].marks).toEqual(['X', '7', '/']);
    expect(scorecard([...nine, 10, 7, 2])[9].marks).toEqual(['X', '7', '2']);
    expect(scorecard([...nine, 9, 0])[9].marks).toEqual(['9', '-']);
    expect(totalScore([...nine, 10, 7, 3])).toBe(20);
    expect(gameOver([...nine, 9, 0])).toBe(true);
    expect(gameOver([...nine, 9, 1])).toBe(false); // a spare earns a third ball
    expect(toFrames([...nine, 10, 10, 10])).toHaveLength(10);
  });

  it('ten down after a gutter ball is a spare, not a strike — the lane knows which ball meets a fresh rack', () => {
    const nine = Array(18).fill(0);
    expect(scorecard([0, 10, 5, 0])[0].marks).toEqual(['-', '/']);
    expect(scorecard([...nine, 0, 10, 5])[9].marks).toEqual(['-', '/', '5']);
    expect(scorecard([...nine, 10, 0, 10])[9].marks).toEqual(['X', '-', '/']);
    expect(onFreshRack([])).toBe(true);
    expect(onFreshRack([0])).toBe(false);
    expect(onFreshRack([10])).toBe(true);
    expect(onFreshRack([3, 4])).toBe(true);
    expect(onFreshRack([...nine, 10])).toBe(true);
    expect(onFreshRack([...nine, 10, 4])).toBe(false);
    expect(onFreshRack([...nine, 0])).toBe(false);
    expect(onFreshRack([...nine, 0, 10])).toBe(true);
  });

  it('which ball comes next, and how many pins are standing for it', () => {
    expect(nextBall([])).toEqual({ frame: 1, ball: 1 });
    expect(nextBall([7])).toEqual({ frame: 1, ball: 2 });
    expect(pinsStanding([7])).toBe(3);
    expect(nextBall([10])).toEqual({ frame: 2, ball: 1 });
    expect(pinsStanding([10])).toBe(10);
    const nine = Array(18).fill(0);
    expect(nextBall([...nine, 10])).toEqual({ frame: 10, ball: 2 });
    expect(pinsStanding([...nine, 10])).toBe(10);
    expect(pinsStanding([...nine, 10, 6])).toBe(4);
    expect(pinsStanding([...nine, 4, 6])).toBe(10);
    expect(nextBall([...nine, 4, 6])).toEqual({ frame: 10, ball: 3 });
  });
});

describe('the lane', () => {
  it('a ball down the gutter knocks nothing; bumpers bounce it back into the pins', () => {
    const wild = { x: 0, angle: deg(2.6), speed: 260, spin: 0 };
    const g = simulateRoll(wild, freshRack());
    expect(g.gutter).toBe(true);
    expect(g.down).toEqual([]);
    const b = simulateRoll(wild, freshRack(), { bumpers: true });
    expect(b.gutter).toBe(false);
    expect(b.down.length).toBeGreaterThan(0);
  });

  it('where you throw matters: the pocket beats the edge, and some throws make a strike', () => {
    const pocket = simulateRoll({ x: 2, angle: 0, speed: 260, spin: 0 }, freshRack());
    const edge = simulateRoll({ x: 16, angle: 0, speed: 260, spin: 0 }, freshRack());
    expect(pocket.down.length).toBe(10);
    expect(edge.down.length).toBeLessThan(pocket.down.length);
    expect(edge.down).not.toContain(0); // the head pin survives an edge ball
  });

  it('spin curves the ball: the same throw with and without spin reaches the pins in different places', () => {
    const at = (spin: number) => {
      const r = simulateRoll({ x: 8, angle: 0, speed: 260, spin }, freshRack());
      return r.xAtPins!;
    };
    expect(at(0)).toBeCloseTo(8, 0);
    expect(at(-0.8)).toBeLessThan(at(0) - 4);
    expect(at(0.8)).toBeGreaterThan(at(0));
  });

  it('pins that are still standing stay for the second ball, and a spare can be picked up', () => {
    const first = simulateRoll({ x: 16, angle: 0, speed: 260, spin: 0 }, freshRack());
    expect(first.standing.length).toBeGreaterThan(0);
    for (const p of first.standing) expect(Math.hypot(p.x - PIN_SPOTS[p.id].x, p.y - PIN_SPOTS[p.id].y)).toBeLessThan(1.3);
    // aim at the standing pins' middle
    const mid = first.standing.reduce((a, p) => a + p.x, 0) / first.standing.length;
    const second = simulateRoll({ x: Math.max(-LANE_HALF + 5, Math.min(LANE_HALF - 5, mid)), angle: 0, speed: 300, spin: 0 }, first.standing.map((p) => ({ ...p })));
    expect(second.down.length).toBeGreaterThan(0);
    expect(first.down.length + second.down.length).toBeLessThanOrEqual(10);
  });

  it('the same throw always gives the same result (what you see is what is scored)', () => {
    const t = { x: 5, angle: deg(-0.3), speed: 280, spin: -0.2 };
    expect(simulateRoll(t, freshRack()).down).toEqual(simulateRoll(t, freshRack()).down);
  });
});

describe('computer bowlers', () => {
  it('a steadier bowler scores more on average', () => {
    const game = (skill: number, seed: number) => {
      const r = rng(seed);
      const rolls: number[] = [];
      let rack = freshRack();
      while (!gameOver(rolls)) {
        const res = simulateRoll(npcThrow(skill, rack, r), rack);
        rolls.push(res.down.length);
        rack = pinsStanding(rolls) === 10 ? freshRack() : res.standing;
      }
      return totalScore(rolls);
    };
    const avg = (skill: number) => [1, 2, 3, 4, 5, 6].reduce((a, s) => a + game(skill, s), 0) / 6;
    const low = avg(0.2);
    const high = avg(0.8);
    expect(high).toBeGreaterThan(low);
    expect(low).toBeGreaterThan(20);
    expect(high).toBeLessThan(300);
  });
});

describe('trick shots', () => {
  const rackFor = (pins: number[]) => freshRack().filter((p) => pins.includes(p.id + 1));
  it('each is a set of real pins, and they unlock one after another (the first after a whole game)', () => {
    for (const t of TRICK_SHOTS) {
      expect(new Set(t.pins).size).toBe(t.pins.length);
      for (const n of t.pins) expect(n >= 1 && n <= 10).toBe(true);
    }
    const flags: Record<string, boolean> = {};
    expect(trickUnlocked(flags, 0)).toBe(false);
    flags.bowled = true;
    expect(trickUnlocked(flags, 0)).toBe(true);
    expect(trickUnlocked(flags, 1)).toBe(false);
    flags[`trick:${TRICK_SHOTS[0].id}`] = true;
    expect(trickUnlocked(flags, 1)).toBe(true);
    expect(allTricksCleared(flags)).toBe(false);
    for (const t of TRICK_SHOTS) flags[`trick:${t.id}`] = true;
    expect(allTricksCleared(flags)).toBe(true);
  });

  it('every one can really be made — here is a throw that clears each (no bumpers, no spin)', () => {
    const made: Record<string, { x: number; deg: number }> = {
      'head-pin': { x: -15, deg: 1.0 },
      corner: { x: -15, deg: 2.3 },
      'baby-split': { x: -7.5, deg: 1.4 },
      bucket: { x: -12, deg: 0.4 },
      strike: { x: -15, deg: 1.0 },
    };
    for (const t of TRICK_SHOTS) {
      const th = made[t.id];
      expect(th, t.id).toBeTruthy();
      const r = simulateRoll({ x: th.x, angle: (th.deg * Math.PI) / 180, speed: 250, spin: 0 }, rackFor(t.pins), { bumpers: false });
      expect(r.standing, t.id).toHaveLength(0);
      expect(r.down).toHaveLength(t.pins.length);
    }
  });

  it('a miss leaves the trick-shot pins standing where they were', () => {
    const r = simulateRoll({ x: -15, angle: (-3 * Math.PI) / 180, speed: 250, spin: 0 }, rackFor([10]), { bumpers: false });
    expect(r.gutter).toBe(true);
    expect(r.standing.map((p) => p.id + 1)).toEqual([10]);
  });
});

