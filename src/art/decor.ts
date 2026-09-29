import { PAL, shade } from './palette';
import { makeCanvas, circlePath, paint, rng } from './draw';
import type { LayerStyle } from './terrainTiles';
import type { Terrain } from '../world/terrain';

/** Terrain layer looks (bottom to top). `members` = terrains that fill the layer. */
export interface TerrainLayer extends LayerStyle {
  members: Terrain[];
  opaque: boolean;
}

const LAND: Terrain[] = ['sand', 'grass', 'path', 'plaza', 'dune', 'stone', 'tile'];

function speckles(color: string, count: number, size: number, seed: number) {
  return (ctx: CanvasRenderingContext2D, ox: number, oy: number, T: number) => {
    const r = rng(seed);
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const x = ox + r() * T;
      const y = oy + r() * T;
      ctx.beginPath();
      ctx.ellipse(x, y, size, size * 0.7, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };
}

function cobbles(ctx: CanvasRenderingContext2D, ox: number, oy: number, T: number) {
  const n = 4;
  const s = T / n;
  ctx.strokeStyle = shade('#e8dcc6', -0.18);
  ctx.lineWidth = 2.5;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n + 1; i++) {
      const x = ox + i * s - (j % 2 ? s / 2 : 0);
      const y = oy + j * s;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, s - 4, s - 4, 6);
      ctx.stroke();
    }
}

function grassBlades(ctx: CanvasRenderingContext2D, ox: number, oy: number, T: number) {
  const r = rng(99);
  ctx.strokeStyle = shade(PAL.grass, -0.12);
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 5; i++) {
    const x = ox + r() * T;
    const y = oy + r() * T;
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 3);
    ctx.lineTo(x - 1, y - 4);
    ctx.moveTo(x + 1, y + 3);
    ctx.lineTo(x + 4, y - 3);
    ctx.stroke();
  }
}

export const TERRAIN_LAYERS: Record<string, TerrainLayer> = {
  foam: { key: 'foam', members: LAND, fill: PAL.foam, alpha: 0.85, half: 0.8, radius: 0.42, opaque: false },
  sand: { key: 'sand', members: LAND, fill: PAL.sand, lip: PAL.sandDark, lipH: 8, opaque: true, texture: speckles(shade(PAL.sand, -0.12), 6, 2.2, 5) },
  grass: { key: 'grass', members: ['grass', 'path', 'plaza'], fill: PAL.grass, lip: PAL.grassDark, lipH: 10, opaque: true, texture: grassBlades },
  path: { key: 'path', members: ['path'], fill: PAL.path, lip: PAL.pathDark, lipH: 4, half: 0.6, radius: 0.28, opaque: true, texture: speckles(shade(PAL.path, -0.14), 4, 2.6, 11) },
  plaza: { key: 'plaza', members: ['plaza'], fill: '#e8dcc6', lip: PAL.stoneDark, lipH: 6, half: 0.6, radius: 0.2, opaque: true, texture: cobbles },
  dune: { key: 'dune', members: ['dune'], fill: '#efcf8f', lip: '#d9b06a', lipH: 8, opaque: true, texture: speckles('#d9b06a', 5, 2.4, 21) },
  stone: { key: 'stone', members: ['stone'], fill: '#e3d3b0', lip: '#bfa77e', lipH: 6, half: 0.6, radius: 0.18, opaque: true, texture: cobbles },
  tile: { key: 'tile', members: ['tile'], fill: '#f0e6d8', lip: '#c9b8a0', lipH: 5, half: 0.6, radius: 0.16, opaque: true },
};

/** Small decorations scattered over terrain (drawn with a Phaser Blitter). */
export const DECOR_FRAMES = ['tuft', 'tuft2', 'flower-pink', 'flower-gold', 'flower-white', 'flower-blue', 'pebble', 'shell', 'starfish', 'clover'] as const;
export type DecorFrame = (typeof DECOR_FRAMES)[number];
export const DECOR_SIZE = 40;

export function drawDecorAtlas(): HTMLCanvasElement {
  const S = DECOR_SIZE;
  const { c, ctx } = makeCanvas(S * DECOR_FRAMES.length, S);
  DECOR_FRAMES.forEach((f, i) => {
    const x = i * S + S / 2;
    const y = S / 2 + 6;
    ctx.save();
    switch (f) {
      case 'tuft':
      case 'tuft2': {
        ctx.strokeStyle = f === 'tuft' ? PAL.grassDark : shade(PAL.grassDark, -0.1);
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        for (const [dx, h] of [
          [-7, 13],
          [0, 17],
          [7, 12],
        ]) {
          ctx.beginPath();
          ctx.moveTo(x + dx * 0.5, y + 6);
          ctx.quadraticCurveTo(x + dx, y, x + dx * 1.2, y + 6 - h);
          ctx.stroke();
        }
        break;
      }
      case 'flower-pink':
      case 'flower-gold':
      case 'flower-white':
      case 'flower-blue': {
        const col = { 'flower-pink': PAL.pink, 'flower-gold': PAL.gold, 'flower-white': '#ffffff', 'flower-blue': PAL.blue }[f];
        ctx.strokeStyle = PAL.leafDark;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y + 8);
        ctx.lineTo(x, y - 2);
        ctx.stroke();
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          circlePath(ctx, x + Math.cos(a) * 5.5, y - 6 + Math.sin(a) * 5.5, 4.6);
          paint(ctx, col, 1.8);
        }
        circlePath(ctx, x, y - 6, 3.4);
        paint(ctx, f === 'flower-gold' ? PAL.orange : PAL.gold, 1.5);
        break;
      }
      case 'pebble':
        ctx.beginPath();
        ctx.ellipse(x, y + 2, 8, 5.5, 0, 0, Math.PI * 2);
        paint(ctx, PAL.stone, 2.5);
        break;
      case 'shell': {
        ctx.beginPath();
        ctx.moveTo(x - 9, y + 6);
        ctx.quadraticCurveTo(x, y - 14, x + 9, y + 6);
        ctx.closePath();
        paint(ctx, '#ffd6c9', 2.5);
        ctx.strokeStyle = '#e8a695';
        ctx.lineWidth = 2;
        for (const dx of [-4, 0, 4]) {
          ctx.beginPath();
          ctx.moveTo(x, y + 5);
          ctx.lineTo(x + dx * 1.4, y - 5);
          ctx.stroke();
        }
        break;
      }
      case 'starfish': {
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
          const rr = k % 2 ? 4 : 10;
          ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.closePath();
        paint(ctx, PAL.orange, 2.2);
        break;
      }
      case 'clover': {
        for (const [dx, dy] of [
          [-4, -2],
          [4, -2],
          [0, -8],
        ]) {
          circlePath(ctx, x + dx, y + dy, 5);
          paint(ctx, shade(PAL.leaf, 0.1), 1.8);
        }
        break;
      }
    }
    ctx.restore();
  });
  return c;
}
