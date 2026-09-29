import { PAL, shade } from './palette';
import { makeCanvas, OUTLINE } from './draw';

/**
 * Little bunnies: wild meadow bunnies and the lost Hopkins cousins (with tiny period outfits).
 * Frames 72x72, anchor at the feet (36, 66). Side view faces right.
 */
export const BW = 72;
export const BH = 72;
export const BUNNY_FRAMES = ['sit', 'hopA', 'hopB', 'front', 'wave', 'sleep', 'danceA', 'danceB'] as const;
export type BunnyFrame = (typeof BUNNY_FRAMES)[number];

export type BunnyOutfit = 'none' | 'bandana' | 'captain' | 'sailor' | 'nemes' | 'lotus' | 'basket' | 'poodle' | 'jacket' | 'headscarf' | 'beret' | 'smock' | 'ruff' | 'chef' | 'shawl' | 'bow';

export interface BunnyLook {
  fur: string;
  belly?: string;
  outfit?: BunnyOutfit;
  accent?: string;
}

const L = OUTLINE - 1;
const INK = PAL.ink;
type Ctx = CanvasRenderingContext2D;
function ell(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, lw = L, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

function outfitOn(ctx: Ctx, look: BunnyLook, hx: number, hy: number, bx: number, by: number, front: boolean) {
  const a = look.accent ?? PAL.red;
  switch (look.outfit) {
    case 'bandana':
      ctx.beginPath();
      ctx.moveTo(hx - 12, hy - 5);
      ctx.quadraticCurveTo(hx, hy - 16, hx + 12, hy - 5);
      ctx.quadraticCurveTo(hx, hy - 8, hx - 12, hy - 5);
      ctx.fillStyle = a;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      break;
    case 'captain':
      ctx.beginPath();
      ctx.moveTo(hx - 15, hy - 9);
      ctx.quadraticCurveTo(hx, hy - 2, hx + 15, hy - 9);
      ctx.quadraticCurveTo(hx, hy - 22, hx - 15, hy - 9);
      ctx.fillStyle = '#4a3b35';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ell(ctx, hx, hy - 12, 2.5, 2.5, PAL.gold, 0);
      break;
    case 'sailor':
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(bx, by, 13, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PAL.navy;
      for (const dy of [-4, 1, 6]) ctx.fillRect(bx - 12, by + dy, 24, 2);
      break;
    case 'nemes':
      ctx.beginPath();
      ctx.moveTo(hx - 13, hy + 8);
      ctx.lineTo(hx - 11, hy - 8);
      ctx.quadraticCurveTo(hx, hy - 14, hx + 11, hy - 8);
      ctx.lineTo(hx + 13, hy + 8);
      ctx.closePath();
      ctx.fillStyle = PAL.gold;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = PAL.blue;
      for (let y = hy - 14; y < hy + 10; y += 5) ctx.fillRect(hx - 15, y, 30, 2.4);
      ctx.restore();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      break;
    case 'lotus':
      for (const s of [-1, 0, 1]) ell(ctx, hx + s * 5, hy - 12 - (s === 0 ? 3 : 0), 3.5, 6, '#f4a3b4', 1.5, s * 0.5);
      break;
    case 'basket':
      ctx.beginPath();
      ctx.moveTo(bx - 14, by - 2);
      ctx.lineTo(bx + 14, by - 2);
      ctx.lineTo(bx + 11, by + 12);
      ctx.lineTo(bx - 11, by + 12);
      ctx.closePath();
      ctx.fillStyle = '#d9b77a';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      break;
    case 'poodle':
      ctx.beginPath();
      ctx.moveTo(bx - 9, by - 2);
      ctx.lineTo(bx + 9, by - 2);
      ctx.lineTo(bx + 16, by + 12);
      ctx.lineTo(bx - 16, by + 12);
      ctx.closePath();
      ctx.fillStyle = PAL.pink;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ell(ctx, bx + 6, by + 6, 2.5, 2.5, '#ffffff', 0);
      break;
    case 'jacket':
      ctx.fillStyle = a;
      ctx.beginPath();
      ctx.ellipse(bx, by, 13, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      if (front) ell(ctx, bx, by, 3, 8, '#ffffff', 0);
      break;
    case 'headscarf':
      ctx.beginPath();
      ctx.moveTo(hx - 12, hy - 3);
      ctx.quadraticCurveTo(hx, hy - 17, hx + 12, hy - 3);
      ctx.quadraticCurveTo(hx, hy - 7, hx - 12, hy - 3);
      ctx.fillStyle = PAL.gold;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(hx - 4, hy - 9, 1.6, 0, Math.PI * 2);
      ctx.arc(hx + 5, hy - 8, 1.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'beret':
      ell(ctx, hx + 3, hy - 11, 12, 5, a, 2);
      break;
    case 'smock':
      ctx.fillStyle = '#e9e2d0';
      ctx.beginPath();
      ctx.ellipse(bx, by + 1, 13, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      for (const [dx, dy, c] of [
        [-4, 0, PAL.red],
        [4, 3, PAL.blue],
        [0, -4, PAL.gold],
      ] as [number, number, string][]) {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(bx + dx, by + dy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'ruff':
      for (let i = -3; i <= 3; i++) ell(ctx, hx + i * 3.8, hy + 12, 3.2, 4, '#ffffff', 1.2);
      break;
    case 'chef':
      ell(ctx, hx, hy - 14, 9, 7, '#ffffff', 2);
      ell(ctx, hx - 5, hy - 17, 6, 6, '#ffffff', 2);
      ell(ctx, hx + 5, hy - 17, 6, 6, '#ffffff', 2);
      break;
    case 'shawl':
      ctx.fillStyle = a;
      ctx.beginPath();
      ctx.moveTo(bx - 14, by - 6);
      ctx.lineTo(bx + 14, by - 6);
      ctx.lineTo(bx, by + 8);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      break;
    case 'bow':
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(hx + 7, hy - 10);
        ctx.quadraticCurveTo(hx + 7 + s * 8, hy - 18, hx + 7 + s * 9, hy - 9);
        ctx.closePath();
        ctx.fillStyle = a;
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = INK;
        ctx.stroke();
      }
      break;
  }
}

function bunnySide(ctx: Ctx, look: BunnyLook, lift: number, stretch: number) {
  const fur = look.fur;
  const belly = look.belly ?? '#fffaf2';
  const by = 50 - lift;
  // back foot
  ell(ctx, 30 - stretch * 4, 64 - lift * 0.4, 10, 5, fur);
  // body
  ell(ctx, 34, by, 16 + stretch * 3, 13 - stretch, fur);
  ell(ctx, 40, by + 5, 9, 7, belly, 0);
  // cotton tail
  ell(ctx, 17 - stretch * 3, by - 4, 6, 6, '#ffffff', 2);
  // front paw
  ell(ctx, 46 + stretch * 5, 64 - lift * 0.6, 5, 4, fur, 2);
  // head
  const hx = 50 + stretch * 3;
  const hy = by - 12;
  ell(ctx, hx - 6, hy - 15, 5, 13, fur, L, -0.35);
  ell(ctx, hx - 6, hy - 15, 2.2, 9, '#f7b6c2', 0, -0.35);
  ell(ctx, hx, hy, 12, 11, fur);
  ell(ctx, hx + 8, hy + 4, 5, 4, belly, 0);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(hx + 4, hy - 2, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(hx + 3.3, hy - 2.8, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e88a9a';
  ctx.beginPath();
  ctx.arc(hx + 11.5, hy + 2, 2, 0, Math.PI * 2);
  ctx.fill();
  outfitOn(ctx, look, hx, hy, 34, by, false);
}

function bunnyFront(ctx: Ctx, look: BunnyLook, mode: 'front' | 'wave' | 'danceA' | 'danceB') {
  const fur = look.fur;
  const belly = look.belly ?? '#fffaf2';
  const bounce = mode === 'danceA' ? -5 : 0;
  const by = 52 + bounce;
  ell(ctx, 28, 64, 8, 5, fur);
  ell(ctx, 44, 64, 8, 5, fur);
  ell(ctx, 36, by, 14, 13, fur);
  ell(ctx, 36, by + 3, 8, 8, belly, 0);
  // paws
  const leftUp = mode === 'wave' ? false : mode === 'danceA';
  const rightUp = mode === 'wave' || mode === 'danceB';
  ell(ctx, 24, leftUp ? by - 16 : by + 2, 4.5, 5, fur, 2);
  ell(ctx, 48, rightUp ? by - 16 : by + 2, 4.5, 5, fur, 2);
  const hx = 36;
  const hy = by - 16;
  for (const s of [-1, 1]) {
    ell(ctx, hx + s * 6, hy - 16, 5, 13, fur, L, s * 0.15);
    ell(ctx, hx + s * 6, hy - 16, 2.2, 9, '#f7b6c2', 0, s * 0.15);
  }
  ell(ctx, hx, hy, 13, 12, fur);
  ell(ctx, hx, hy + 5, 6, 4, belly, 0);
  const happy = mode !== 'front';
  for (const s of [-1, 1]) {
    if (happy) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx + s * 5, hy, 2.6, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(hx + s * 5, hy - 1, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(247,140,140,0.6)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(hx + s * 8.5, hy + 4, 2.6, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#e88a9a';
  ctx.beginPath();
  ctx.arc(hx, hy + 3, 1.8, 0, Math.PI * 2);
  ctx.fill();
  outfitOn(ctx, look, hx, hy, 36, by, true);
}

function bunnySleep(ctx: Ctx, look: BunnyLook) {
  ell(ctx, 36, 58, 20, 11, look.fur);
  ell(ctx, 22, 55, 6, 5, '#ffffff', 2);
  ell(ctx, 50, 52, 10, 9, look.fur);
  ell(ctx, 44, 44, 11, 4, look.fur, L, -0.2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(52, 52, 2.6, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
  outfitOn(ctx, look, 50, 52, 36, 58, false);
}

export function drawBunny(ctx: Ctx, frame: BunnyFrame, look: BunnyLook): void {
  switch (frame) {
    case 'sit':
      bunnySide(ctx, look, 0, 0);
      break;
    case 'hopA':
      bunnySide(ctx, look, 8, 1);
      break;
    case 'hopB':
      bunnySide(ctx, look, 14, 1.5);
      break;
    case 'front':
    case 'wave':
    case 'danceA':
    case 'danceB':
      bunnyFront(ctx, look, frame);
      break;
    case 'sleep':
      bunnySleep(ctx, look);
      break;
  }
}

export function renderBunnySheet(look: BunnyLook): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(BW * BUNNY_FRAMES.length, BH);
  BUNNY_FRAMES.forEach((f, i) => {
    ctx.save();
    ctx.translate(i * BW, 0);
    drawBunny(ctx, f, look);
    ctx.restore();
  });
  return c;
}

export function renderBunnyPortrait(look: BunnyLook, size = 160): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(size, size);
  const s = size / 60;
  ctx.scale(s, s);
  ctx.translate(-6, 4);
  drawBunny(ctx, 'wave', look);
  return c;
}

export const WILD_FURS = ['#c9a27e', '#f4ede4', '#9c8f86', '#e8cfa9', '#b88c63'];
export { shade };
