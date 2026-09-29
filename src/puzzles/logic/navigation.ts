/**
 * Turn-limited sailing: pick a direction and the boat sails until something stops it (a rock,
 * the edge of the chart, or the goal). Currents (arrows) turn the boat as it passes over them;
 * on windy charts the wind nudges the boat one square after each move. Calm seas (Pirate's
 * Gumbo) switch currents and wind off. Levels are limited to a few moves; a BFS solver proves
 * each is solvable and gives Pip's "next move" hint.
 */
export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIRS: Dir[] = ['up', 'right', 'down', 'left'];
const STEP: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const ARROW: Record<string, Dir> = { '^': 'up', v: 'down', '<': 'left', '>': 'right' };

export interface Chart {
  /** rows of: '.' water, '#' rock, 'S' start, 'G' goal, '^ v < >' current */
  rows: string[];
  wind?: Dir;
  /** moves allowed per difficulty is set by the puzzle; this is the minimum known */
}

export interface NavState {
  x: number;
  y: number;
}

export function find(chart: Chart, ch: string): NavState {
  for (let y = 0; y < chart.rows.length; y++) {
    const x = chart.rows[y].indexOf(ch);
    if (x >= 0) return { x, y };
  }
  throw new Error(`chart has no ${ch}`);
}

function tile(chart: Chart, x: number, y: number): string {
  if (y < 0 || y >= chart.rows.length || x < 0 || x >= chart.rows[0].length) return '#';
  return chart.rows[y][x];
}

/** Squares visited while sailing (for animation) and where the boat ends up. */
export function sail(chart: Chart, from: NavState, dir: Dir, calm = false): { path: NavState[]; end: NavState; reachedGoal: boolean } {
  let { x, y } = from;
  let d = dir;
  const path: NavState[] = [];
  const guard = chart.rows.length * chart.rows[0].length * 4;
  for (let i = 0; i < guard; i++) {
    const [dx, dy] = STEP[d];
    const t = tile(chart, x + dx, y + dy);
    if (t === '#') break;
    x += dx;
    y += dy;
    path.push({ x, y });
    if (t === 'G') return { path, end: { x, y }, reachedGoal: true };
    const cur = ARROW[t];
    if (cur && !calm) d = cur;
  }
  // the wind gives one last nudge (if the square is open)
  if (chart.wind && !calm) {
    const [dx, dy] = STEP[chart.wind];
    const t = tile(chart, x + dx, y + dy);
    if (t !== '#') {
      x += dx;
      y += dy;
      path.push({ x, y });
      if (t === 'G') return { path, end: { x, y }, reachedGoal: true };
    }
  }
  return { path, end: { x, y }, reachedGoal: false };
}

/** Fewest moves from `start` to the goal; null if unreachable. */
export function solve(chart: Chart, calm = false, start: NavState = find(chart, 'S')): Dir[] | null {
  const key = (s: NavState) => `${s.x},${s.y}`;
  const seen = new Map<string, { prev: string | null; dir: Dir | null }>();
  seen.set(key(start), { prev: null, dir: null });
  let frontier: NavState[] = [start];
  while (frontier.length) {
    const next: NavState[] = [];
    for (const s of frontier) {
      for (const d of DIRS) {
        const r = sail(chart, s, d, calm);
        const k = key(r.end);
        if (r.path.length === 0 || seen.has(k)) continue;
        seen.set(k, { prev: key(s), dir: d });
        if (r.reachedGoal) {
          const dirs: Dir[] = [];
          let cur: string | null = k;
          while (cur) {
            const e: { prev: string | null; dir: Dir | null } = seen.get(cur)!;
            if (e.dir) dirs.unshift(e.dir);
            cur = e.prev;
          }
          return dirs;
        }
        next.push(r.end);
      }
    }
    frontier = next;
  }
  return null;
}
