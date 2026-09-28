import { PAL } from './palette';

/** Canvas helpers shared by every procedural art routine. */

export interface Cv {
  c: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export function makeCanvas(w: number, h: number): Cv {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d', { willReadFrequently: false })!;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return { c, ctx };
}

export const OUTLINE = 4;

export function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r as number);
}

export function ellipsePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
}

export function circlePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0.1, r), 0, Math.PI * 2);
}

/** Fill the current path, then stroke it with the ink outline. */
export function paint(ctx: CanvasRenderingContext2D, fill: string | CanvasGradient, lw = OUTLINE, stroke: string = PAL.ink) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

/**
 * Soft cel-shading inside the current path: a darker band along the bottom-right and a
 * light glossy spot at the top-left. Call right after building a path (before paint strokes it).
 */
export function softShade(
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; w: number; h: number },
  opts: { dark?: string; light?: string; darkAlpha?: number; lightAlpha?: number } = {},
) {
  ctx.save();
  ctx.clip();
  const { x, y, w, h } = bounds;
  ctx.globalAlpha = opts.darkAlpha ?? 0.18;
  ctx.fillStyle = opts.dark ?? PAL.ink;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.62, y + h * 1.05, w * 0.75, h * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = opts.lightAlpha ?? 0.35;
  ctx.fillStyle = opts.light ?? '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.3, y + h * 0.22, w * 0.22, h * 0.12, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Shape helper: build path, fill, shade, outline — the standard "chunky cozy" look. */
export function blobShape(
  ctx: CanvasRenderingContext2D,
  build: () => void,
  fill: string,
  bounds: { x: number; y: number; w: number; h: number },
  lw = OUTLINE,
  shadeOpts?: Parameters<typeof softShade>[2] | false,
) {
  build();
  ctx.fillStyle = fill;
  ctx.fill();
  if (shadeOpts !== false) {
    build();
    softShade(ctx, bounds, shadeOpts || {});
  }
  if (lw > 0) {
    build();
    ctx.lineWidth = lw;
    ctx.strokeStyle = PAL.ink;
    ctx.stroke();
  }
}

/** Deterministic PRNG (mulberry32) so procedural details are stable between runs. */
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

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Draw a small 4-point sparkle star. */
export function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color = '#ffffff') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}

export function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.1, y + s * 0.15, x - s * 0.55, y + s * 0.05, x - s * 0.5, y - s * 0.25);
  ctx.bezierCurveTo(x - s * 0.45, y - s * 0.55, x - s * 0.05, y - s * 0.5, x, y - s * 0.2);
  ctx.bezierCurveTo(x + s * 0.05, y - s * 0.5, x + s * 0.45, y - s * 0.55, x + s * 0.5, y - s * 0.25);
  ctx.bezierCurveTo(x + s * 0.55, y + s * 0.05, x + s * 0.1, y + s * 0.15, x, y + s * 0.35);
  ctx.closePath();
}
