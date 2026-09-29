import { makeCanvas, rng } from './draw';
import { PAL } from './palette';

/**
 * Draws the 16 dual-grid variants for one terrain layer into a 4x4 tileset canvas.
 * Every "on" corner contributes a rounded square centred on that corner; overlapping squares
 * merge into straight runs with rounded outer corners. A darker "lip" drawn a few pixels lower
 * gives each layer a soft raised edge.
 */
export interface LayerStyle {
  key: string;
  fill: string;
  lip?: string;
  lipH?: number;
  rim?: string;
  half?: number; // half-size of each corner square, in tiles
  radius?: number; // corner radius, in tiles
  alpha?: number;
  /** extra texture drawn clipped to the filled area */
  texture?: (ctx: CanvasRenderingContext2D, ox: number, oy: number, T: number, corners: boolean[]) => void;
}

/**
 * Copy each tile's border pixels 1px outward so linear filtering at non-integer zoom never
 * samples a neighbouring tile (no seams). Tiles are laid out with margin 1 and spacing 2.
 */
export function extrudeTileset(src: HTMLCanvasElement, T: number, cols: number, rows: number): HTMLCanvasElement {
  const P = T + 2;
  const { c, ctx } = makeCanvas(cols * P, rows * P);
  ctx.imageSmoothingEnabled = false;
  for (let r = 0; r < rows; r++)
    for (let q = 0; q < cols; q++) {
      const sx = q * T;
      const sy = r * T;
      const dx = q * P + 1;
      const dy = r * P + 1;
      ctx.drawImage(src, sx, sy, T, T, dx, dy, T, T);
      ctx.drawImage(src, sx, sy, T, 1, dx, dy - 1, T, 1); // top
      ctx.drawImage(src, sx, sy + T - 1, T, 1, dx, dy + T, T, 1); // bottom
      ctx.drawImage(src, sx, sy, 1, T, dx - 1, dy, 1, T); // left
      ctx.drawImage(src, sx + T - 1, sy, 1, T, dx + T, dy, 1, T); // right
      ctx.drawImage(src, sx, sy, 1, 1, dx - 1, dy - 1, 1, 1);
      ctx.drawImage(src, sx + T - 1, sy, 1, 1, dx + T, dy - 1, 1, 1);
      ctx.drawImage(src, sx, sy + T - 1, 1, 1, dx - 1, dy + T, 1, 1);
      ctx.drawImage(src, sx + T - 1, sy + T - 1, 1, 1, dx + T, dy + T, 1, 1);
    }
  return c;
}

export function drawLayerTileset(style: LayerStyle, T: number): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(T * 4, T * 4);
  const half = (style.half ?? 0.62) * T;
  const rad = (style.radius ?? 0.3) * T;
  for (let v = 1; v < 16; v++) {
    const ox = (v % 4) * T;
    const oy = Math.floor(v / 4) * T;
    const corners = [(v & 1) !== 0, (v & 2) !== 0, (v & 4) !== 0, (v & 8) !== 0];
    const pts: [number, number][] = [
      [ox, oy],
      [ox + T, oy],
      [ox, oy + T],
      [ox + T, oy + T],
    ];
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, T, T);
    ctx.clip();
    ctx.globalAlpha = style.alpha ?? 1;
    const shapes = (dy: number) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        if (corners[i]) ctx.roundRect(x - half, y - half + dy, half * 2, half * 2, rad);
      });
    };
    if (style.lip) {
      ctx.fillStyle = style.lip;
      shapes(style.lipH ?? 6);
      ctx.fill();
    }
    if (style.rim) {
      ctx.fillStyle = style.rim;
      shapes(-3);
      ctx.fill();
    }
    ctx.fillStyle = style.fill;
    shapes(0);
    ctx.fill();
    if (style.texture) {
      shapes(0);
      ctx.clip();
      style.texture(ctx, ox, oy, T, corners);
    }
    ctx.restore();
  }
  return c;
}

/** Plank pattern for docks/decks (a single straight tile). */
export function drawPlankTile(T: number, base: string = PAL.wood, dark: string = PAL.woodDark): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(T, T);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, T, T);
  const n = 4;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;
  for (let i = 0; i <= n; i++) {
    const y = (i * T) / n;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(T, y);
    ctx.stroke();
  }
  const r = rng(7);
  ctx.fillStyle = dark;
  for (let i = 0; i < n; i++) {
    const x = r() * T;
    ctx.fillRect(x, (i * T) / n + 2, 3, T / n - 4);
    // nail dots
    ctx.beginPath();
    ctx.arc(6, (i * T) / n + T / n / 2, 2.5, 0, Math.PI * 2);
    ctx.arc(T - 6, (i * T) / n + T / n / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, T, T * 0.08);
  return c;
}

/** Straight floor tile for interiors (wood boards or checker tiles). */
export function drawFloorTile(T: number, kind: 'wood' | 'checker' | 'stone' | 'sandstone' | 'rug', a: string, b: string): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(T, T);
  if (kind === 'wood') {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, T, T);
    ctx.strokeStyle = b;
    ctx.lineWidth = 3;
    for (let i = 0; i <= 3; i++) {
      const x = (i * T) / 3;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, T);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, T * 0.55);
    ctx.lineTo(T / 3, T * 0.55);
    ctx.moveTo((2 * T) / 3, T * 0.25);
    ctx.lineTo(T, T * 0.25);
    ctx.stroke();
  } else if (kind === 'checker') {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, T, T);
    ctx.fillStyle = b;
    ctx.fillRect(0, 0, T / 2, T / 2);
    ctx.fillRect(T / 2, T / 2, T / 2, T / 2);
  } else if (kind === 'stone' || kind === 'sandstone') {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, T, T);
    ctx.strokeStyle = b;
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, T / 2 - 1, T / 2 - 1);
    ctx.strokeRect(T / 2 + 0.5, 1.5, T / 2 - 2, T / 2 - 1);
    ctx.strokeRect(1.5, T / 2 + 0.5, T - 3, T / 2 - 2);
  } else {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, T, T);
    ctx.fillStyle = b;
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 4; i++) ctx.fillRect(0, (i * T) / 4 + T / 16, T, T / 16);
  }
  return c;
}
