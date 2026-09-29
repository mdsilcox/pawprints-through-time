/**
 * Tile collision for characters. Each character collides with a small "feet box";
 * movement is resolved one axis at a time so players slide along walls, with a gentle
 * corner-assist that nudges them around corners and into doorways.
 */
export const TILE = 96;

export interface Box {
  x: number; // centre x (world units)
  y: number; // centre y
  hw: number; // half width
  hh: number; // half height
}

export class CollisionGrid {
  readonly solid: Uint8Array;
  constructor(
    readonly width: number,
    readonly height: number,
    readonly tile = TILE,
  ) {
    this.solid = new Uint8Array(width * height);
  }

  isSolid(cx: number, cy: number): boolean {
    if (cx < 0 || cy < 0 || cx >= this.width || cy >= this.height) return true;
    return this.solid[cy * this.width + cx] === 1;
  }

  setSolid(cx: number, cy: number, v = true): void {
    if (cx < 0 || cy < 0 || cx >= this.width || cy >= this.height) return;
    this.solid[cy * this.width + cx] = v ? 1 : 0;
  }

  blockRect(cx: number, cy: number, w: number, h: number, v = true): void {
    for (let j = cy; j < cy + h; j++) for (let i = cx; i < cx + w; i++) this.setSolid(i, j, v);
  }

  /** Does the box overlap any solid cell? */
  overlaps(b: Box): boolean {
    const T = this.tile;
    const x0 = Math.floor((b.x - b.hw) / T);
    const x1 = Math.floor((b.x + b.hw - 0.001) / T);
    const y0 = Math.floor((b.y - b.hh) / T);
    const y1 = Math.floor((b.y + b.hh - 0.001) / T);
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) if (this.isSolid(i, j)) return true;
    return false;
  }

  /**
   * Move a box by (dx, dy), stopping at solid cells. Returns the new centre and which axes were blocked.
   * Large moves are sub-stepped so fast movers never tunnel through thin walls.
   */
  move(b: Box, dx: number, dy: number): { x: number; y: number; blockedX: boolean; blockedY: boolean } {
    const maxStep = this.tile * 0.25;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / maxStep));
    let x = b.x;
    let y = b.y;
    let blockedX = false;
    let blockedY = false;
    const sx = dx / steps;
    const sy = dy / steps;
    for (let s = 0; s < steps; s++) {
      if (sx !== 0 && !blockedX) {
        const nx = x + sx;
        if (!this.overlaps({ ...b, x: nx, y })) x = nx;
        else {
          blockedX = true;
          x = this.snapX({ ...b, x, y }, sx);
        }
      }
      if (sy !== 0 && !blockedY) {
        const ny = y + sy;
        if (!this.overlaps({ ...b, x, y: ny })) y = ny;
        else {
          blockedY = true;
          y = this.snapY({ ...b, x, y }, sy);
        }
      }
    }
    return { x, y, blockedX, blockedY };
  }

  /** Slide flush against the wall we bumped into. */
  private snapX(b: Box, dir: number): number {
    const T = this.tile;
    if (dir > 0) {
      const edge = Math.floor((b.x + b.hw) / T + 1) * T;
      const target = edge - b.hw - 0.01;
      return this.overlaps({ ...b, x: target }) ? b.x : Math.max(b.x, target);
    }
    const edge = Math.floor((b.x - b.hw) / T) * T;
    const target = edge + b.hw + 0.01;
    return this.overlaps({ ...b, x: target }) ? b.x : Math.min(b.x, target);
  }

  private snapY(b: Box, dir: number): number {
    const T = this.tile;
    if (dir > 0) {
      const edge = Math.floor((b.y + b.hh) / T + 1) * T;
      const target = edge - b.hh - 0.01;
      return this.overlaps({ ...b, y: target }) ? b.y : Math.max(b.y, target);
    }
    const edge = Math.floor((b.y - b.hh) / T) * T;
    const target = edge + b.hh + 0.01;
    return this.overlaps({ ...b, y: target }) ? b.y : Math.min(b.y, target);
  }

  /**
   * Corner assist: when a straight move along one axis is blocked, look a little to either side
   * for a gap and return a small perpendicular nudge toward it (0 if none).
   */
  cornerNudge(b: Box, dx: number, dy: number, maxShift: number): { nx: number; ny: number } {
    const horizontal = Math.abs(dx) > Math.abs(dy) * 2;
    const vertical = Math.abs(dy) > Math.abs(dx) * 2;
    if (!horizontal && !vertical) return { nx: 0, ny: 0 };
    const probe = horizontal ? { ...b, x: b.x + Math.sign(dx) * 4 } : { ...b, y: b.y + Math.sign(dy) * 4 };
    if (!this.overlaps(probe)) return { nx: 0, ny: 0 };
    for (let k = 4; k <= maxShift; k += 4) {
      for (const s of [-1, 1]) {
        const shifted = horizontal ? { ...probe, y: probe.y + s * k } : { ...probe, x: probe.x + s * k };
        const sidestep = horizontal ? { ...b, y: b.y + s * k } : { ...b, x: b.x + s * k };
        if (!this.overlaps(shifted) && !this.overlaps(sidestep)) return horizontal ? { nx: 0, ny: s } : { nx: s, ny: 0 };
      }
    }
    return { nx: 0, ny: 0 };
  }
}
