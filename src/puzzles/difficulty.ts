import type { Difficulty } from '../core/state';
import type { PuzzleMode } from '../core/settings';

/**
 * Adaptive difficulty. Every puzzle has easy / medium / hard variants; in "Adaptive" mode the
 * game picks one from a gentle skill estimate (0..1) that moves a little after each puzzle.
 * It never punishes: leaving a puzzle or needing help just makes the next one friendlier.
 */
export interface PuzzleOutcome {
  solved: boolean;
  hintsUsed: number;
}

/** A brand-new family starts on easy puzzles and climbs after a couple of clean solves. */
export const START_SKILL = 0.4;
export const MEDIUM_FROM = 0.45;
export const HARD_FROM = 0.75;

export function difficultyFor(mode: PuzzleMode, skill: number): Difficulty {
  if (mode !== 'adaptive') return mode;
  if (skill >= HARD_FROM) return 'hard';
  if (skill >= MEDIUM_FROM) return 'medium';
  return 'easy';
}

export function updateSkill(skill: number, o: PuzzleOutcome): number {
  let delta: number;
  if (!o.solved) delta = -0.05;
  else if (o.hintsUsed === 0) delta = 0.1;
  else if (o.hintsUsed === 1) delta = 0.03;
  else delta = -0.04;
  const next = Math.min(1, Math.max(0, skill + delta));
  return Math.round(next * 1000) / 1000;
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Tricky' };
