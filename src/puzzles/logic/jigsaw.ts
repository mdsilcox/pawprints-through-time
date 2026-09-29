import { rng } from './riddle';

/**
 * Torn-map jigsaw: the map is cut into a grid of pieces that are shuffled and turned.
 * Swap pieces into place and turn them the right way up. Solved when every piece sits in
 * its own slot with rotation 0. (Easy variants start with no turned pieces.)
 */
export interface JigsawState {
  cols: number;
  rows: number;
  /** slots[i] = piece id in slot i */
  slots: number[];
  /** rot[pieceId] = quarter turns (0..3) */
  rot: number[];
}

export function scramble(cols: number, rows: number, seed: number, turn: boolean): JigsawState {
  const n = cols * rows;
  const r = rng(seed);
  const slots = Array.from({ length: n }, (_, i) => i);
  // shuffle until no piece is already home (so every piece needs a move)
  for (let tries = 0; tries < 50; tries++) {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    if (slots.every((p, i) => p !== i)) break;
  }
  const rot = Array.from({ length: n }, () => (turn ? 1 + Math.floor(r() * 3) : 0));
  return { cols, rows, slots, rot };
}

export function swap(s: JigsawState, a: number, b: number): JigsawState {
  const slots = s.slots.slice();
  [slots[a], slots[b]] = [slots[b], slots[a]];
  return { ...s, slots };
}

export function turn(s: JigsawState, slot: number): JigsawState {
  const rot = s.rot.slice();
  const p = s.slots[slot];
  rot[p] = (rot[p] + 1) % 4;
  return { ...s, rot };
}

export function isSolved(s: JigsawState): boolean {
  return s.slots.every((p, i) => p === i && s.rot[p] === 0);
}

export function placedCount(s: JigsawState): number {
  return s.slots.filter((p, i) => p === i && s.rot[p] === 0).length;
}

/** Pip's near-answer hint: one piece that isn't right yet, and where it belongs. */
export function nextFix(s: JigsawState): { piece: number; from: number; to: number; turns: number } | null {
  for (let slot = 0; slot < s.slots.length; slot++) {
    const want = slot;
    const from = s.slots.indexOf(want);
    if (from !== slot || s.rot[want] !== 0) return { piece: want, from, to: slot, turns: (4 - s.rot[want]) % 4 };
  }
  return null;
}
