/**
 * Pattern / sequence puzzles: "what comes next?". A round shows a row of tokens and a few
 * choices. Tokens are strings with a prefix saying how to draw them:
 *   i:<icon>   an item icon (shells, fossils, veggies...)
 *   n:<num>    a number
 *   c:<hour>   a little clock face showing that hour
 *   a:<dir>    an arrow (up / right / down / left)
 * A puzzle is a few rounds in a row.
 */
export interface SeqRound {
  items: string[];
  answer: string;
  /** wrong choices (the answer is mixed in) */
  decoys: string[];
  /** escalating: nudge, clue, near-answer */
  hints: [string, string, string];
}

export interface SequencePuzzle {
  rounds: SeqRound[];
}

export type TokenKind = 'icon' | 'number' | 'clock' | 'arrow' | 'paint';

export function tokenKind(t: string): TokenKind {
  const p = t.slice(0, 2);
  return p === 'n:' ? 'number' : p === 'c:' ? 'clock' : p === 'a:' ? 'arrow' : p === 'p:' ? 'paint' : 'icon';
}

export function tokenValue(t: string): string {
  return t.slice(2);
}

/** Checks a round's internal consistency (used by tests). */
export function validRound(r: SeqRound): boolean {
  return r.items.length >= 3 && r.decoys.length >= 2 && !r.decoys.includes(r.answer) && new Set(r.decoys).size === r.decoys.length;
}

/** Number rounds: does the answer continue "add the same amount" or "double each time"? */
export function followsNumberRule(items: string[], answer: string): boolean {
  const nums = [...items, answer].map((t) => Number(tokenValue(t)));
  if (nums.some((n) => !Number.isFinite(n))) return false;
  const d = nums[1] - nums[0];
  const add = nums.every((n, i) => i === 0 || n - nums[i - 1] === d);
  const r = nums[1] / nums[0];
  const mul = nums[0] !== 0 && nums.every((n, i) => i === 0 || n === nums[i - 1] * r);
  return add || mul;
}

/** Repeating rounds: does the answer continue the shortest repeating unit? */
export function continuesRepeat(items: string[], answer: string): boolean {
  // the repeating unit must show up at least once in full plus one more token
  for (let p = 1; p < items.length - 1; p++) {
    if (items.every((t, i) => t === items[i % p])) return items[items.length % p] === answer;
  }
  return false;
}
