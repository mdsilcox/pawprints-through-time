import type { Difficulty, PuzzleRecord, SaveData } from '../core/state';
import type { PuzzleDef, PuzzleKind } from './types';
import { updateSkill } from './difficulty';

/** All puzzles in the game, registered by era content modules. */
const PUZZLES = new Map<string, PuzzleDef>();

export function registerPuzzle<K extends PuzzleKind>(def: PuzzleDef<K>): PuzzleDef<K> {
  PUZZLES.set(def.id, def as unknown as PuzzleDef);
  return def;
}

export function getPuzzle(id: string): PuzzleDef {
  const p = PUZZLES.get(id);
  if (!p) throw new Error(`unknown puzzle ${id}`);
  return p;
}

export function allPuzzles(): PuzzleDef[] {
  return [...PUZZLES.values()];
}

export function puzzleRecord(d: SaveData, id: string): PuzzleRecord | undefined {
  return d.puzzles[id];
}

/** Store the outcome of one attempt and nudge the adaptive skill. Returns true on a first-ever solve. */
export function recordAttempt(d: SaveData, id: string, o: { solved: boolean; hintsUsed: number; difficulty: Difficulty; noSkill?: boolean }): boolean {
  const rec: PuzzleRecord = d.puzzles[id] ?? { solved: false, timesSolved: 0, bestHints: 99, lastDifficulty: o.difficulty };
  const first = o.solved && !rec.solved;
  if (o.solved) {
    rec.solved = true;
    rec.timesSolved++;
    rec.bestHints = Math.min(rec.bestHints, o.hintsUsed);
  }
  rec.lastDifficulty = o.difficulty;
  d.puzzles[id] = rec;
  if (!o.noSkill) d.skill = updateSkill(d.skill, o);
  return first;
}

/** 3 stars for no hints, 2 for one, 1 otherwise. */
export function starsFor(hints: number): number {
  return hints === 0 ? 3 : hints === 1 ? 2 : 1;
}
