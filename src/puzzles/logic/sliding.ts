/**
 * Sliding-block puzzles: blocks slide along their own direction only; slide the key block
 * (the wheelbarrow, the builders' sledge...) out through the gap on the right edge of its row.
 * A breadth-first solver proves every level solvable and powers Pip's "next move" hint.
 */
export interface Block {
  id: string;
  x: number;
  y: number;
  len: number;
  dir: 'h' | 'v';
  key?: boolean;
}

export interface SlideLevel {
  w: number;
  h: number;
  blocks: Block[];
}

export interface SlideMove {
  id: string;
  /** cells moved: + right/down, - left/up */
  d: number;
}

export function cellsOf(b: Block): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < b.len; i++) out.push(b.dir === 'h' ? [b.x + i, b.y] : [b.x, b.y + i]);
  return out;
}

function occupancy(level: SlideLevel, blocks: Block[], except?: string): boolean[] {
  const occ = new Array(level.w * level.h).fill(false);
  for (const b of blocks) {
    if (b.id === except) continue;
    for (const [x, y] of cellsOf(b)) occ[y * level.w + x] = true;
  }
  return occ;
}

/** How far a block can move each way: { min: most negative d, max: most positive d }. */
export function range(level: SlideLevel, blocks: Block[], id: string): { min: number; max: number } {
  const b = blocks.find((x) => x.id === id)!;
  const occ = occupancy(level, blocks, id);
  const free = (x: number, y: number) => x >= 0 && y >= 0 && x < level.w && y < level.h && !occ[y * level.w + x];
  let min = 0;
  let max = 0;
  if (b.dir === 'h') {
    while (free(b.x + min - 1, b.y)) min--;
    while (free(b.x + b.len + max, b.y)) max++;
  } else {
    while (free(b.x, b.y + min - 1)) min--;
    while (free(b.x, b.y + b.len + max)) max++;
  }
  return { min, max };
}

export function canMove(level: SlideLevel, blocks: Block[], m: SlideMove): boolean {
  if (m.d === 0) return false;
  const r = range(level, blocks, m.id);
  return m.d >= r.min && m.d <= r.max;
}

export function applyMove(blocks: Block[], m: SlideMove): Block[] {
  return blocks.map((b) => (b.id !== m.id ? b : b.dir === 'h' ? { ...b, x: b.x + m.d } : { ...b, y: b.y + m.d }));
}

export function isSolved(level: SlideLevel, blocks: Block[]): boolean {
  const key = blocks.find((b) => b.key)!;
  return key.x + key.len === level.w;
}

function keyOf(blocks: Block[]): string {
  return blocks.map((b) => (b.dir === 'h' ? b.x : b.y)).join(',');
}

/** Fewest moves (a slide of any distance counts as one move). Null if impossible. */
export function solve(level: SlideLevel, start: Block[] = level.blocks, maxStates = 200_000): SlideMove[] | null {
  if (isSolved(level, start)) return [];
  const seen = new Map<string, { prev: string | null; move: SlideMove | null }>();
  const startKey = keyOf(start);
  seen.set(startKey, { prev: null, move: null });
  let frontier: { key: string; blocks: Block[] }[] = [{ key: startKey, blocks: start }];
  while (frontier.length && seen.size < maxStates) {
    const next: typeof frontier = [];
    for (const node of frontier) {
      for (const b of node.blocks) {
        const r = range(level, node.blocks, b.id);
        for (let d = r.min; d <= r.max; d++) {
          if (d === 0) continue;
          const mv = { id: b.id, d };
          const nb = applyMove(node.blocks, mv);
          const k = keyOf(nb);
          if (seen.has(k)) continue;
          seen.set(k, { prev: node.key, move: mv });
          if (isSolved(level, nb)) {
            const path: SlideMove[] = [];
            let cur: string | null = k;
            while (cur) {
              const e: { prev: string | null; move: SlideMove | null } = seen.get(cur)!;
              if (e.move) path.unshift(e.move);
              cur = e.prev;
            }
            return path;
          }
          next.push({ key: k, blocks: nb });
        }
      }
    }
    frontier = next;
  }
  return null;
}

/** Build a level from a picture: '.' empty, 'K' key block (horizontal), letters = blocks. */
export function parseLevel(rows: string[]): SlideLevel {
  const h = rows.length;
  const w = rows[0].length;
  const cells = new Map<string, [number, number][]>();
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const list = cells.get(ch) ?? [];
      list.push([x, y]);
      cells.set(ch, list);
    }),
  );
  const blocks: Block[] = [];
  for (const [ch, list] of cells) {
    const xs = new Set(list.map((c) => c[0]));
    const dir: 'h' | 'v' = xs.size > 1 ? 'h' : 'v';
    const x = Math.min(...list.map((c) => c[0]));
    const y = Math.min(...list.map((c) => c[1]));
    blocks.push({ id: ch, x, y, len: list.length, dir, key: ch === 'K' || undefined });
  }
  blocks.sort((a, b) => (a.key ? -1 : b.key ? 1 : a.id.localeCompare(b.id)));
  return { w, h, blocks };
}
