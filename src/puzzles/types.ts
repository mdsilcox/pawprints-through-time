import type { Difficulty } from '../core/state';
import type { Riddle } from './logic/riddle';
import type { LogicGrid } from './logic/logicGrid';
import type { SequencePuzzle } from './logic/sequence';
import type { Chart } from './logic/navigation';

/** The six brain-builder kinds from the spec (5.5). */
export type PuzzleKind = 'riddle' | 'grid' | 'slide' | 'sequence' | 'code' | 'sail';

export type Era = 'tockwood' | 'pirates' | 'egypt' | 'fifties' | 'florence';

export interface RiddleVariant {
  /** pick-from-3, pick-from-5 or type the answer */
  mode: 'choice3' | 'choice5' | 'typed';
}
export interface SlideVariant {
  rows: string[];
  /** fewest moves (checked by tests) — used for stars */
  best: number;
}
export interface CodeVariant {
  slots: number;
  symbols: number;
  tries: number;
}
export interface SailVariant {
  chart: Chart;
  /** moves allowed (checked by tests to be >= the fewest possible) */
  moves: number;
}

export interface VariantByKind {
  riddle: RiddleVariant;
  grid: LogicGrid;
  slide: SlideVariant;
  sequence: SequencePuzzle;
  code: CodeVariant;
  sail: SailVariant;
}

export interface PuzzleDef<K extends PuzzleKind = PuzzleKind> {
  id: string;
  kind: K;
  title: string;
  /** a short emoji-free label for the journal badge */
  place: string;
  era: Era;
  /** the little story line shown above the puzzle */
  intro: string;
  /** "how to play" in one or two short sentences */
  howTo: string;
  variants: Record<Difficulty, VariantByKind[K]>;
  /** Pip's hints per difficulty: a nudge, a clue, a near-answer (the UI may add a live reveal) */
  hints: Record<Difficulty, [string, string, string]>;
  /** riddle puzzles draw from a pool instead of fixed content */
  pool?: Riddle[];
}

export interface PuzzleResult {
  solved: boolean;
  hintsUsed: number;
  difficulty: Difficulty;
  /** first time this puzzle was ever solved (story rewards) */
  firstSolve: boolean;
  /** riddle puzzles: which riddle was asked */
  riddleId?: string;
}
