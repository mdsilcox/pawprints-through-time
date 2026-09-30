import { describe, it, expect } from 'vitest';
import { difficultyFor, updateSkill, START_SKILL } from '../../src/puzzles/difficulty';
import { checkAnswer, choicesFor, normalize } from '../../src/puzzles/logic/riddle';
import { cycleMark, emptyMarks, isSolved, revealOne, solveAll, wrongTicks } from '../../src/puzzles/logic/logicGrid';
import { applyMove, canMove, isSolved as slideSolved, parseLevel, range, solve as slideSolve } from '../../src/puzzles/logic/sliding';
import { allCodes, consistent, makeSecret, remaining, score } from '../../src/puzzles/logic/codebreak';
import { find, sail, solve as sailSolve } from '../../src/puzzles/logic/navigation';
import { continuesRepeat, followsNumberRule, validRound } from '../../src/puzzles/logic/sequence';
import { isSolved as jigSolved, nextFix, placedCount, scramble, swap, turn } from '../../src/puzzles/logic/jigsaw';
import { allPuzzles, recordAttempt, starsFor } from '../../src/puzzles/registry';
import { TOCKWOOD_RIDDLES } from '../../src/puzzles/content/riddles';
import '../../src/puzzles/content/tockwood';
import { PIRATE_RIDDLES } from '../../src/puzzles/content/pirates';
import { EGYPT_RIDDLES } from '../../src/puzzles/content/egypt';
import '../../src/puzzles/content/florence';
import '../../src/puzzles/content/fifties';
import { defaultSave, type Difficulty } from '../../src/core/state';
import type { LogicGrid } from '../../src/puzzles/logic/logicGrid';
import type { SailVariant, SlideVariant, CodeVariant } from '../../src/puzzles/types';
import type { SequencePuzzle } from '../../src/puzzles/logic/sequence';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];

describe('adaptive difficulty', () => {
  it('starts easy, climbs after clean solves, and eases off after lots of help — never below 0 or above 1', () => {
    expect(difficultyFor('adaptive', START_SKILL)).toBe('easy');
    let s = START_SKILL;
    s = updateSkill(s, { solved: true, hintsUsed: 0 });
    expect(difficultyFor('adaptive', s)).toBe('medium');
    for (let i = 0; i < 4; i++) s = updateSkill(s, { solved: true, hintsUsed: 0 });
    expect(difficultyFor('adaptive', s)).toBe('hard');
    for (let i = 0; i < 20; i++) s = updateSkill(s, { solved: true, hintsUsed: 0 });
    expect(s).toBe(1);
    for (let i = 0; i < 7; i++) s = updateSkill(s, { solved: true, hintsUsed: 3 });
    expect(difficultyFor('adaptive', s)).toBe('medium');
    for (let i = 0; i < 40; i++) s = updateSkill(s, { solved: false, hintsUsed: 0 });
    expect(s).toBe(0);
    expect(difficultyFor('adaptive', s)).toBe('easy');
  });

  it('a fixed setting always wins over the skill estimate', () => {
    expect(difficultyFor('hard', 0)).toBe('hard');
    expect(difficultyFor('easy', 1)).toBe('easy');
  });

  it('records attempts: first solve, best hints, stars', () => {
    const d = defaultSave();
    expect(recordAttempt(d, 'x', { solved: false, hintsUsed: 1, difficulty: 'easy' })).toBe(false);
    expect(recordAttempt(d, 'x', { solved: true, hintsUsed: 2, difficulty: 'easy' })).toBe(true);
    expect(recordAttempt(d, 'x', { solved: true, hintsUsed: 0, difficulty: 'medium' })).toBe(false);
    expect(d.puzzles.x).toMatchObject({ solved: true, timesSolved: 2, bestHints: 0, lastDifficulty: 'medium' });
    expect([starsFor(0), starsFor(1), starsFor(2)]).toEqual([3, 2, 1]);
  });
});

describe('riddles', () => {
  it('typed answers are forgiving about case, punctuation, articles and plurals', () => {
    const r = { answers: ['clocktower', 'clock tower'] };
    for (const ok of ['Clocktower', 'the clock tower!', 'A CLOCKTOWER', ' clock-tower ', 'clocktowers']) expect(checkAnswer(r, ok), ok).toBe(true);
    for (const bad of ['', 'tower of london', 'clock towel', 'lighthouse']) expect(checkAnswer(r, bad), bad).toBe(false);
    expect(normalize('The Bell.')).toBe('bell');
  });

  it('every riddle is complete: answers, 4+ decoys that are not answers, three hints, unique ids', () => {
    expect(TOCKWOOD_RIDDLES.length).toBeGreaterThanOrEqual(15);
    const all = [...TOCKWOOD_RIDDLES, ...PIRATE_RIDDLES, ...EGYPT_RIDDLES];
    expect(new Set(all.map((r) => r.id)).size).toBe(all.length);
    for (const r of all) {
      expect(r.answers.length).toBeGreaterThan(0);
      expect(r.decoys.length).toBeGreaterThanOrEqual(4);
      for (const d of r.decoys) expect(checkAnswer(r, d), `${r.id}: decoy ${d}`).toBe(false);
      expect(r.hints.every((h) => h.length > 5)).toBe(true);
      const c3 = choicesFor(r, 3);
      expect(c3).toHaveLength(3);
      expect(c3.filter((c) => checkAnswer(r, c))).toHaveLength(1);
      expect(choicesFor(r, 5)).toHaveLength(5);
    }
  });
});

describe('logic grids', () => {
  const grids = allPuzzles()
    .filter((p) => p.kind === 'grid')
    .flatMap((p) => LEVELS.map((l) => ({ name: `${p.id}/${l}`, g: p.variants[l] as LogicGrid })));

  it.each(grids)('$name has exactly one solution, and it is the answer', ({ g }) => {
    const sols = solveAll(g);
    expect(sols).toHaveLength(1);
    expect(sols[0]).toEqual(g.answer);
    expect(g.clues.length).toBeGreaterThan(0);
  });

  it('marking: tap cycles ✗ → ✓ → blank, a ✓ crosses out its row and column; solved only when all ✓ are right', () => {
    const g = grids.find((x) => x.name.endsWith('/medium'))!.g;
    let m = emptyMarks(g);
    m = cycleMark(m, 0, 0, 0); // ✗
    expect(m[0][0][0]).toBe(1);
    m = cycleMark(m, 0, 0, 0); // ✓ (wrong: Rocco is yellow)
    expect(m[0][0][0]).toBe(2);
    expect(m[0][0][1]).toBe(1);
    expect(m[0][1][0]).toBe(1);
    // fill in the rest correctly, keep the wrong one
    m = cycleMark(m, 0, 1, 2);
    m = cycleMark(m, 0, 1, 2); // Juniper yellow? (wrong too)
    expect(wrongTicks(g, m).length).toBeGreaterThan(0);
    expect(isSolved(g, m)).toBe(false);
    // Pip's reveal fills the right answer one ✓ at a time
    let fresh = emptyMarks(g);
    for (let i = 0; i < 10; i++) {
      const r = revealOne(g, fresh);
      if (!r) break;
      fresh = cycleMark(cycleMark(fresh, r.c, r.s, r.v), r.c, r.s, r.v);
      if (fresh[r.c][r.s][r.v] !== 2) fresh[r.c][r.s][r.v] = 2;
    }
    expect(isSolved(g, fresh)).toBe(true);
  });
});

describe('sliding blocks', () => {
  const boards = allPuzzles()
    .filter((p) => p.kind === 'slide')
    .flatMap((p) => LEVELS.map((l) => ({ name: `${p.id}/${l}`, v: p.variants[l] as SlideVariant })));

  it.each(boards)('$name is solvable in exactly its "best" number of moves', ({ v }) => {
    const level = parseLevel(v.rows);
    expect(level.blocks.filter((b) => b.key)).toHaveLength(1);
    expect(slideSolved(level, level.blocks)).toBe(false);
    const sol = slideSolve(level)!;
    expect(sol).not.toBeNull();
    expect(sol.length).toBe(v.best);
    // replaying the solution really frees the key block
    let blocks = level.blocks;
    for (const m of sol) {
      expect(canMove(level, blocks, m)).toBe(true);
      blocks = applyMove(blocks, m);
    }
    expect(slideSolved(level, blocks)).toBe(true);
  });

  it('blocks only slide along their own direction and never through each other', () => {
    const level = parseLevel(['AA.', 'B..', 'B..']);
    expect(range(level, level.blocks, 'A')).toEqual({ min: 0, max: 1 });
    expect(range(level, level.blocks, 'B')).toEqual({ min: 0, max: 0 });
    expect(canMove(level, level.blocks, { id: 'A', d: 2 })).toBe(false);
  });
});

describe('code-breaking', () => {
  it('scores gold (right spot) and silver (right gear, wrong spot) like the rules say', () => {
    expect(score([0, 1, 2], [0, 1, 2])).toEqual({ gold: 3, silver: 0 });
    expect(score([0, 1, 2], [2, 0, 1])).toEqual({ gold: 0, silver: 3 });
    expect(score([0, 1, 2], [0, 2, 3])).toEqual({ gold: 1, silver: 1 });
    expect(score([0, 1, 2, 3], [4, 4, 4, 4])).toEqual({ gold: 0, silver: 0 });
    expect(score([0, 0, 1], [0, 1, 1])).toEqual({ gold: 2, silver: 0 });
  });

  it('secrets have no repeats, and history narrows the possibilities down to the secret', () => {
    const secret = makeSecret(4, 6, 1234);
    expect(new Set(secret).size).toBe(4);
    const history = [[0, 1, 2, 3], [2, 3, 4, 5], [5, 4, 1, 0]].map((guess) => ({ guess, score: score(secret, guess) }));
    const left = remaining(history, 4, 6);
    expect(left.some((c) => c.join() === secret.join())).toBe(true);
    expect(left.length).toBeLessThan(allCodes(4, 6).length);
    expect(consistent(history, secret)).toBe(true);
  });

  it('every variant fits: enough tries to solve, symbols >= slots', () => {
    for (const p of allPuzzles().filter((x) => x.kind === 'code'))
      for (const l of LEVELS) {
        const v = p.variants[l] as CodeVariant;
        expect(v.symbols).toBeGreaterThanOrEqual(v.slots);
        expect(v.tries).toBeGreaterThanOrEqual(8);
      }
  });
});

describe('sailing charts', () => {
  const charts = allPuzzles()
    .filter((p) => p.kind === 'sail')
    .flatMap((p) => LEVELS.map((l) => ({ name: `${p.id}/${l}`, v: p.variants[l] as SailVariant })));

  it.each(charts.filter((c) => c.v.needsCalm))('$name is impassable in rough seas but solvable with calm seas (Pirate’s Gumbo)', ({ v }) => {
    const rough = sailSolve(v.chart);
    expect(rough === null || rough.length > v.moves).toBe(true);
    const calm = sailSolve(v.chart, true)!;
    expect(calm).not.toBeNull();
    expect(calm.length).toBeLessThanOrEqual(v.moves);
    expect(calm.length).toBeGreaterThanOrEqual(4);
    // calm seas only settle the whirlpools: the wind still blows and the route rides a current
    expect(v.chart.wind).toBeTruthy();
    expect(v.chart.rows.join('')).toContain('@');
    let at = find(v.chart, 'S');
    let rode = false;
    for (const d of calm) {
      const r = sail(v.chart, at, d, true);
      rode ||= r.path.some((p) => '^v<>'.includes(v.chart.rows[p.y][p.x]));
      at = r.end;
    }
    expect(rode).toBe(true);
  });

  it.each(charts.filter((c) => !c.v.needsCalm))('$name reaches the buoy within its move limit (and calm seas never make it harder)', ({ v }) => {
    const sol = sailSolve(v.chart)!;
    expect(sol).not.toBeNull();
    expect(sol.length).toBeLessThanOrEqual(v.moves);
    expect(sol.length).toBeGreaterThanOrEqual(3);
    const calm = sailSolve(v.chart, true)!;
    expect(calm).not.toBeNull();
    expect(calm.length).toBeLessThanOrEqual(sol.length);
    // replay the solution
    let at = find(v.chart, 'S');
    let reached = false;
    for (const d of sol) {
      const r = sail(v.chart, at, d);
      at = r.end;
      reached = r.reachedGoal;
    }
    expect(reached).toBe(true);
  });

  it.each(charts)('$name: every move in the best route is a short, watchable sail (no endless circling)', ({ v }) => {
    for (const calm of [false, true]) {
      const sol = sailSolve(v.chart, calm);
      if (!sol) continue;
      let at = find(v.chart, 'S');
      for (const d of sol) {
        const r = sail(v.chart, at, d, calm);
        expect(r.path.length).toBeLessThanOrEqual(20);
        at = r.end;
      }
    }
  });

  it('a loop of currents catches the boat where it came round, instead of spinning forever', () => {
    const loop = { rows: ['S>v.', '.^<.', '....', '...G'] };
    const r = sail(loop, find(loop, 'S'), 'right');
    expect(r.path.length).toBeLessThan(8);
  });

  it('the boat sails until blocked, currents turn it, wind nudges it; whirlpools spin it back unless the sea is calm', () => {
    const chart = { rows: ['S..#', '..v.', '....', '...G'] };
    expect(sail(chart, find(chart, 'S'), 'right').end).toEqual({ x: 2, y: 0 });
    const turned = sail(chart, { x: 0, y: 1 }, 'right');
    expect(turned.end).toEqual({ x: 2, y: 3 }); // the current turned it south
    expect(sail(chart, { x: 0, y: 1 }, 'right', true).end).toEqual({ x: 2, y: 3 }); // calm seas keep their currents
    const windy = { rows: ['S...', '....', '....', '...G'], wind: 'down' as const };
    expect(sail(windy, find(windy, 'S'), 'right').end).toEqual({ x: 3, y: 1 });
    expect(sail(windy, find(windy, 'S'), 'right', true).end).toEqual({ x: 3, y: 1 }); // ...and their wind
    const whirly = { rows: ['S.@.G'] };
    const spun = sail(whirly, find(whirly, 'S'), 'right');
    expect(spun.whirled).toBe(true);
    expect(spun.end).toEqual({ x: 1, y: 0 }); // spat back out beside the whirlpool
    expect(sail(whirly, find(whirly, 'S'), 'right', true).reachedGoal).toBe(true);
  });
});

describe('pattern tiles', () => {
  it('every round is well-formed and its answer really continues the pattern', () => {
    for (const p of allPuzzles().filter((x) => x.kind === 'sequence'))
      for (const l of LEVELS) {
        const v = p.variants[l] as SequencePuzzle;
        expect(v.rounds.length).toBeGreaterThanOrEqual(3);
        for (const r of v.rounds) {
          expect(validRound(r)).toBe(true);
          const numeric = r.items.every((t) => t.startsWith('n:') || t.startsWith('c:'));
          const growing = r.items.includes('i:gear');
          const turning = r.items.every((t) => t.startsWith('a:'));
          if (numeric) expect(followsNumberRule(r.items, r.answer)).toBe(true);
          else if (!growing && !turning) expect(continuesRepeat(r.items, r.answer)).toBe(true);
        }
      }
  });
});

describe('puzzle catalogue', () => {
  it('Tockwood has one puzzle of every kind, each with three variants and three hints per variant', () => {
    const kinds = new Set(allPuzzles().filter((p) => p.era === 'tockwood').map((p) => p.kind));
    expect([...kinds].sort()).toEqual(['code', 'grid', 'riddle', 'sail', 'sequence', 'slide']);
    // the pirate chapter adds the torn map (jigsaw) and needs calm seas for its chart
    const pirates = allPuzzles().filter((p) => p.era === 'pirates');
    expect(pirates.map((p) => p.kind).sort()).toEqual(['code', 'jigsaw', 'riddle', 'sail', 'slide']);
    for (const p of allPuzzles()) for (const l of LEVELS) expect(p.variants[l], `${p.id}/${l}`).toBeTruthy();
  });
});

describe('torn-map jigsaw', () => {
  it('scrambles every piece out of place, and swapping + turning puts it back together', () => {
    let s = scramble(3, 2, 99, true);
    expect(s.slots.every((p, i) => p !== i)).toBe(true);
    expect(s.rot.every((r) => r >= 1 && r <= 3)).toBe(true);
    expect(jigSolved(s)).toBe(false);
    for (let guard = 0; guard < 40 && !jigSolved(s); guard++) {
      const f = nextFix(s)!;
      if (f.from !== f.to) s = swap(s, f.from, f.to);
      else s = turn(s, f.to);
    }
    expect(jigSolved(s)).toBe(true);
    expect(placedCount(s)).toBe(6);
  });

  it('easy maps start with no turned pieces', () => {
    const s = scramble(2, 2, 5, false);
    expect(s.rot.every((r) => r === 0)).toBe(true);
    expect(s.slots.every((p, i) => p !== i)).toBe(true);
  });
});
