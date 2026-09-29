import { rng } from './riddle';

/**
 * Code-breaking ("the gear lock"): guess a secret row of symbols. After each guess you get a
 * gold star for every symbol in the right spot and a silver star for every right symbol in the
 * wrong spot. Tests use the pure scoring; Pip's hints use `consistent` to suggest a safe guess.
 */
export interface CodeScore {
  gold: number;
  silver: number;
}

export function score(secret: number[], guess: number[]): CodeScore {
  let gold = 0;
  const sCount = new Map<number, number>();
  const gCount = new Map<number, number>();
  secret.forEach((s, i) => {
    if (guess[i] === s) gold++;
    else {
      sCount.set(s, (sCount.get(s) ?? 0) + 1);
      gCount.set(guess[i], (gCount.get(guess[i]) ?? 0) + 1);
    }
  });
  let silver = 0;
  for (const [sym, n] of gCount) silver += Math.min(n, sCount.get(sym) ?? 0);
  return { gold, silver };
}

export function makeSecret(slots: number, symbols: number, seed: number, repeats = false): number[] {
  const r = rng(seed);
  const out: number[] = [];
  while (out.length < slots) {
    const s = Math.floor(r() * symbols);
    if (!repeats && out.includes(s)) continue;
    out.push(s);
  }
  return out;
}

/** Would `candidate` have produced exactly these scores for these guesses? */
export function consistent(history: { guess: number[]; score: CodeScore }[], candidate: number[]): boolean {
  return history.every((h) => {
    const s = score(candidate, h.guess);
    return s.gold === h.score.gold && s.silver === h.score.silver;
  });
}

/** Every possible code (no repeats unless allowed). */
export function allCodes(slots: number, symbols: number, repeats = false): number[][] {
  const out: number[][] = [];
  const rec = (acc: number[]) => {
    if (acc.length === slots) {
      out.push(acc.slice());
      return;
    }
    for (let s = 0; s < symbols; s++) {
      if (!repeats && acc.includes(s)) continue;
      acc.push(s);
      rec(acc);
      acc.pop();
    }
  };
  rec([]);
  return out;
}

/** How many codes still fit everything learned so far. */
export function remaining(history: { guess: number[]; score: CodeScore }[], slots: number, symbols: number, repeats = false): number[][] {
  return allCodes(slots, symbols, repeats).filter((c) => consistent(history, c));
}
