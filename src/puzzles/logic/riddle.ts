/**
 * Riddles: answered by typing (tricky) or by picking from choices (easy / medium).
 * Typed answers are forgiving: case, punctuation, "a/an/the", plurals and spaces don't matter.
 */
export interface Riddle {
  id: string;
  /** the riddle itself (original writing) */
  q: string;
  /** accepted typed answers; the first one is shown as "the" answer */
  answers: string[];
  /** wrong options for multiple choice (the right answer is added automatically) */
  decoys: string[];
  /** escalating hints: a nudge, a clue, a near-answer */
  hints: [string, string, string];
}

const ARTICLES = /^(a|an|the|some|my|your)\s+/;

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(ARTICLES, '')
    .replace(/\s+/g, '');
}

function singular(s: string): string {
  if (s.endsWith('ies') && s.length > 4) return `${s.slice(0, -3)}y`;
  if (s.endsWith('es') && /(ches|shes|sses|xes)$/.test(s)) return s.slice(0, -2);
  if (s.endsWith('s') && !s.endsWith('ss') && s.length > 3) return s.slice(0, -1);
  return s;
}

export function checkAnswer(r: Pick<Riddle, 'answers'>, input: string): boolean {
  const got = normalize(input);
  if (!got) return false;
  return r.answers.some((a) => {
    const want = normalize(a);
    return got === want || singular(got) === singular(want);
  });
}

/** Choices for the multiple-choice versions: the answer plus `n - 1` decoys, in a stable shuffled order. */
export function choicesFor(r: Riddle, n: number, seed = 0): string[] {
  const pool = [r.answers[0], ...r.decoys.slice(0, Math.max(0, n - 1))];
  return seededShuffle(pool, hashString(r.id) + seed);
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small deterministic PRNG (mulberry32) so puzzles are reproducible in tests. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(list: T[], seed: number): T[] {
  const r = rng(seed);
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
