import type { Difficulty } from '../../core/state';
import type { Dir } from '../../ui/ui';
import type { Riddle } from '../logic/riddle';
import type { PuzzleDef, PuzzleKind, VariantByKind } from '../types';

/** What a puzzle view gets from the puzzle screen. */
export interface ViewCtx<K extends PuzzleKind = PuzzleKind> {
  def: PuzzleDef<K>;
  variant: VariantByKind[K];
  difficulty: Difficulty;
  /** the riddle being asked (riddle puzzles) */
  riddle?: Riddle;
  /** call once when the puzzle is solved */
  solved: () => void;
  /** a gentle line in Pip's bubble (feedback, never a scolding) */
  say: (text: string, mood?: 'happy' | 'think') => void;
  /** soup effects that help puzzles */
  effects: { calm: boolean };
}

export interface PuzzleView {
  el: HTMLElement;
  /** level 1-3 hint text; for level 3 a view may also *do* something (show a move, fill a cell) */
  hint?: (level: 1 | 2 | 3) => string | null;
  /** the Back key: return true if the view used it (e.g. let go of a grabbed crate) */
  onBack?: () => boolean;
  onDir?: (dir: Dir) => boolean;
  /** put the keyboard focus back on the puzzle itself (e.g. after asking Pip for a hint) */
  refocus?: () => void;
  destroy?: () => void;
  /** something Pip should say first on a short screen, where the view's own notes are hidden */
  pipLine?: string;
}

export type ViewFactory<K extends PuzzleKind = PuzzleKind> = (ctx: ViewCtx<K>) => PuzzleView;

/** Small shared helper: a wiggle on a wrong answer (cleared so it can play again). */
export function wiggle(el: HTMLElement): void {
  el.classList.remove('wiggle');
  void el.offsetWidth;
  el.classList.add('wiggle');
}

export function pop(el: HTMLElement): void {
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

/** Friendly "not quite" lines, never discouraging. */
const NOT_QUITE = ['Not quite — have another go!', 'Ooh, close! Try again.', 'Hmm, not that one. You’ve got this!', 'Nearly! Take another look.'];
let nq = 0;
export function notQuite(): string {
  nq = (nq + 1) % NOT_QUITE.length;
  return NOT_QUITE[nq];
}
