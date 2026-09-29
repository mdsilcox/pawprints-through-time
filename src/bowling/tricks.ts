/**
 * Trick shots: bowling challenges with a special set of pins and one ball to clear them.
 * The first unlocks after your first full game; clearing each one unlocks the next.
 * Every one is makeable in the lane simulation (tests/unit/bowling.test.ts proves it with a throw).
 */
export interface TrickShot {
  id: string;
  name: string;
  /** standing pins, by their bowling numbers (1 = the head pin, 7–10 = the back row) */
  pins: number[];
  goal: string;
  tip: string;
}

export const TRICK_SHOTS: TrickShot[] = [
  { id: 'head-pin', name: 'Hello, Head Pin', pins: [1], goal: 'Knock down the head pin, all on its own.', tip: 'Line it up and roll it straight!' },
  { id: 'corner', name: 'The Corner Pocket', pins: [10], goal: 'Knock down the lonely corner pin.', tip: 'Stand on the left and aim across the lane.' },
  { id: 'baby-split', name: 'The Baby Split', pins: [3, 10], goal: 'Two pins with a gap between them — get both!', tip: 'Clip the front pin so it flies into the back one.' },
  { id: 'bucket', name: 'The Bucket', pins: [2, 4, 5, 8], goal: 'Four pins in a diamond — every one!', tip: 'Hit the front pin nice and full.' },
  { id: 'strike', name: 'Strike It Lucky', pins: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], goal: 'All ten pins with one ball — a strike!', tip: 'Aim just beside the head pin — and curve it in.' },
];

export const TRIES_PER_PLAYER = 3;

export function trickCleared(flags: Record<string, unknown>, id: string): boolean {
  return !!flags[`trick:${id}`];
}

/** Open once you've bowled a whole game (the first) or cleared the one before. */
export function trickUnlocked(flags: Record<string, unknown>, index: number): boolean {
  if (index <= 0) return !!flags['bowled'];
  return trickCleared(flags, TRICK_SHOTS[index - 1].id);
}

export function allTricksCleared(flags: Record<string, unknown>): boolean {
  return TRICK_SHOTS.every((t) => trickCleared(flags, t.id));
}
