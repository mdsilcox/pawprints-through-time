/**
 * Logic grids ("who has which?"). Subjects (rows) each get exactly one value in every category
 * (columns). Players mark cells ✗ / ✓; the grid is solved when every row has one ✓ per category
 * and they match the answer. Clues are written for players and also stored as checkable facts,
 * so tests can prove every grid has exactly one solution.
 */
export type Fact =
  /** subject s has value v in category c */
  | { t: 'is'; s: number; c: number; v: number }
  | { t: 'not'; s: number; c: number; v: number }
  /** whoever has value v1 in category c1 has value v2 in category c2 */
  | { t: 'same'; c1: number; v1: number; c2: number; v2: number }
  | { t: 'notSame'; c1: number; v1: number; c2: number; v2: number };

export interface LogicGrid {
  subjects: string[];
  categories: { name: string; values: string[] }[];
  clues: string[];
  facts: Fact[];
  /** answer[c][s] = value index of subject s in category c */
  answer: number[][];
}

/** mark[c][s][v]: 0 = blank, 1 = ✗, 2 = ✓ */
export type Marks = number[][][];

export function emptyMarks(g: LogicGrid): Marks {
  return g.categories.map((cat) => g.subjects.map(() => cat.values.map(() => 0)));
}

/** Tap cycle: blank → ✗ → ✓ → blank. Placing a ✓ puts ✗ in the rest of its row and column. */
export function cycleMark(m: Marks, c: number, s: number, v: number): Marks {
  const next = m.map((cat) => cat.map((row) => row.slice()));
  const cur = next[c][s][v];
  const val = (cur + 1) % 3;
  next[c][s][v] = val;
  if (val === 2) {
    next[c][s].forEach((_, vi) => {
      if (vi !== v && next[c][s][vi] === 0) next[c][s][vi] = 1;
    });
    next[c].forEach((row, si) => {
      if (si !== s && row[v] === 0) row[v] = 1;
    });
  }
  return next;
}

/** Every row has exactly one ✓ in every category. */
export function isComplete(m: Marks): boolean {
  return m.every((cat) => cat.every((row) => row.filter((x) => x === 2).length === 1));
}

export function isSolved(g: LogicGrid, m: Marks): boolean {
  if (!isComplete(m)) return false;
  return g.answer.every((vals, c) => vals.every((v, s) => m[c][s][v] === 2));
}

/** Rows whose ✓ is wrong (for gentle "have another look at ..." feedback). */
export function wrongTicks(g: LogicGrid, m: Marks): { c: number; s: number }[] {
  const out: { c: number; s: number }[] = [];
  m.forEach((cat, c) =>
    cat.forEach((row, s) => {
      const v = row.indexOf(2);
      if (v >= 0 && v !== g.answer[c][s]) out.push({ c, s });
    }),
  );
  return out;
}

/** Near-answer hint: a correct ✓ the players haven't placed yet. */
export function revealOne(g: LogicGrid, m: Marks): { c: number; s: number; v: number } | null {
  for (let c = 0; c < g.answer.length; c++)
    for (let s = 0; s < g.subjects.length; s++) {
      const v = g.answer[c][s];
      if (m[c][s][v] !== 2) return { c, s, v };
    }
  return null;
}

function permutations(n: number): number[][] {
  if (n === 1) return [[0]];
  const out: number[][] = [];
  for (const p of permutations(n - 1))
    for (let i = 0; i <= p.length; i++) {
      const q = p.slice();
      q.splice(i, 0, n - 1);
      out.push(q);
    }
  return out;
}

function holds(f: Fact, sol: number[][]): boolean {
  switch (f.t) {
    case 'is':
      return sol[f.c][f.s] === f.v;
    case 'not':
      return sol[f.c][f.s] !== f.v;
    case 'same': {
      const s = sol[f.c1].indexOf(f.v1);
      return sol[f.c2][s] === f.v2;
    }
    case 'notSame': {
      const s = sol[f.c1].indexOf(f.v1);
      return sol[f.c2][s] !== f.v2;
    }
  }
}

/** All assignments consistent with the facts (tests expect exactly one: the answer). */
export function solveAll(g: LogicGrid): number[][][] {
  const n = g.subjects.length;
  const perms = permutations(n);
  const sols: number[][][] = [];
  const rec = (c: number, acc: number[][]) => {
    if (c === g.categories.length) {
      if (g.facts.every((f) => holds(f, acc))) sols.push(acc.map((x) => x.slice()));
      return;
    }
    for (const p of perms) rec(c + 1, [...acc, p]);
  };
  rec(0, []);
  return sols;
}
