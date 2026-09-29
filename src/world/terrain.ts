/**
 * Terrain grid + dual-grid autotiling.
 *
 * Each map cell has one terrain type. Rendering uses a "dual grid": display tiles sit between
 * cell centres, and each display tile picks one of 16 variants from which of its 4 corner cells
 * belong to a layer. Layers stack (water → sand → grass → path/plaza...), giving soft rounded
 * coastlines and paths from a plain character grid.
 */

export type Terrain =
  | 'water'
  | 'sand'
  | 'grass'
  | 'path'
  | 'plaza'
  | 'dock'
  | 'floor'
  | 'wall'
  | 'rug'
  | 'stone'
  | 'dune'
  | 'deck'
  | 'tile'
  | 'road'
  | 'dark'
  | 'void';

export const TERRAINS: Terrain[] = [
  'water',
  'sand',
  'grass',
  'path',
  'plaza',
  'dock',
  'floor',
  'wall',
  'rug',
  'stone',
  'dune',
  'deck',
  'tile',
  'road',
  'dark',
  'void',
];

/** Terrain types a character can never walk on. */
export const BLOCKING: ReadonlySet<Terrain> = new Set<Terrain>(['water', 'wall', 'void', 'dark']);

export class TerrainGrid {
  readonly cells: Terrain[];
  constructor(
    readonly width: number,
    readonly height: number,
    fill: Terrain = 'water',
  ) {
    this.cells = new Array(width * height).fill(fill);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): Terrain {
    if (!this.inBounds(x, y)) return 'void';
    return this.cells[y * this.width + x];
  }

  set(x: number, y: number, t: Terrain): void {
    if (this.inBounds(x, y)) this.cells[y * this.width + x] = t;
  }

  // ---- builder helpers (all coordinates in cells) ----
  rect(t: Terrain, x: number, y: number, w: number, h: number, only?: Terrain[]): this {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) if (!only || only.includes(this.get(i, j))) this.set(i, j, t);
    return this;
  }

  ellipse(t: Terrain, cx: number, cy: number, rx: number, ry: number, only?: Terrain[]): this {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++)
      for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
        const dx = (i + 0.5 - cx) / rx;
        const dy = (j + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1 && (!only || only.includes(this.get(i, j)))) this.set(i, j, t);
      }
    return this;
  }

  /** A polyline path `width` cells wide (axis-aligned or diagonal segments). */
  line(t: Terrain, pts: [number, number][], width = 2, only?: Terrain[]): this {
    for (let k = 0; k < pts.length - 1; k++) {
      const [x0, y0] = pts[k];
      const [x1, y1] = pts[k + 1];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
      for (let s = 0; s <= steps; s++) {
        const x = x0 + ((x1 - x0) * s) / steps;
        const y = y0 + ((y1 - y0) * s) / steps;
        const off = Math.floor((width - 1) / 2);
        for (let a = 0; a < width; a++)
          for (let b = 0; b < width; b++) {
            const cx = Math.round(x) - off + a;
            const cy = Math.round(y) - off + b;
            if (!only || only.includes(this.get(cx, cy))) this.set(cx, cy, t);
          }
      }
    }
    return this;
  }

  /** Parse rows of characters with a legend (used for small interiors). */
  static fromRows(rows: string[], legend: Record<string, Terrain>, fallback: Terrain = 'void'): TerrainGrid {
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    const g = new TerrainGrid(w, h, fallback);
    rows.forEach((row, y) => {
      for (let x = 0; x < w; x++) {
        const ch = row[x] ?? ' ';
        g.set(x, y, legend[ch] ?? fallback);
      }
    });
    return g;
  }
}

/** Which terrains light up each render layer (a cell "belongs" to every layer beneath its own). */
export interface LayerDef {
  key: string;
  members: ReadonlySet<Terrain>;
}

/**
 * Variant index for the display tile whose top-left corner is cell (x, y):
 * bit0 = TL, bit1 = TR, bit2 = BL, bit3 = BR.
 */
export function variantAt(grid: TerrainGrid, members: ReadonlySet<Terrain>, x: number, y: number): number {
  const on = (i: number, j: number) => (members.has(grid.get(i, j)) ? 1 : 0);
  return on(x, y) | (on(x + 1, y) << 1) | (on(x, y + 1) << 2) | (on(x + 1, y + 1) << 3);
}

/** Variant grid for a layer: (width-1) x (height-1) display tiles, -1 where empty. */
export function layerVariants(grid: TerrainGrid, members: ReadonlySet<Terrain>): number[][] {
  const out: number[][] = [];
  for (let y = 0; y < grid.height - 1; y++) {
    const row: number[] = [];
    for (let x = 0; x < grid.width - 1; x++) {
      const v = variantAt(grid, members, x, y);
      row.push(v === 0 ? -1 : v);
    }
    out.push(row);
  }
  return out;
}

/**
 * Hide tiles of lower layers that are completely covered by a fully-filled (variant 15)
 * tile of an opaque higher layer — saves a lot of overdraw on phones.
 */
export function cullCovered(layers: number[][][], opaque: boolean[]): void {
  for (let li = 0; li < layers.length - 1; li++) {
    const layer = layers[li];
    for (let y = 0; y < layer.length; y++)
      for (let x = 0; x < layer[y].length; x++) {
        if (layer[y][x] < 0) continue;
        for (let up = li + 1; up < layers.length; up++) {
          if (opaque[up] && layers[up][y][x] === 15) {
            layer[y][x] = -1;
            break;
          }
        }
      }
  }
}
