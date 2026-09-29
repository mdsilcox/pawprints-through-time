import { PAL, shade } from './palette';
import { makeCanvas, OUTLINE } from './draw';
import type { WornPiece } from './character';

/**
 * Biscuit the corgi: an orange-and-white corgi with big ears, a fluffy rump and a lot of joy.
 * Frames are 112x96; the anchor (paws on the ground, body centre) is at (56, 88).
 */
export const CW = 112;
export const CH = 96;
export const CORGI_FRAMES = [
  'side-idle',
  'side-walkA',
  'side-walkB',
  'down-idle',
  'down-walkA',
  'down-walkB',
  'up-idle',
  'up-walkA',
  'up-walkB',
  'dig-A',
  'dig-B',
  'sniff',
  'bark',
  'happy',
  'sit',
  'sleep',
  'dance-A',
  'dance-B',
] as const;
export type CorgiFrame = (typeof CORGI_FRAMES)[number];

const L = OUTLINE - 0.5;
const INK = PAL.ink;
const FUR = '#e9a15a';
const FUR_D = '#c97f3f';
const WHITE = '#fffaf2';
const PINK = '#f28b9b';

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
function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, lw = L) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}
function ear(ctx: Ctx, bx: number, by: number, tipX: number, tipY: number, w: number, inner = true) {
  ctx.beginPath();
  ctx.moveTo(bx - w, by);
  ctx.quadraticCurveTo(tipX - w * 0.3, tipY + 6, tipX, tipY);
  ctx.quadraticCurveTo(tipX + w * 0.4, tipY + 8, bx + w, by);
  ctx.closePath();
  ctx.fillStyle = FUR;
  ctx.fill();
  ctx.lineWidth = L;
  ctx.strokeStyle = INK;
  ctx.stroke();
  if (inner) {
    ctx.beginPath();
    ctx.moveTo(bx - w * 0.45, by - 1);
    ctx.quadraticCurveTo(tipX - w * 0.1, tipY + 9, tipX, tipY + 7);
    ctx.quadraticCurveTo(tipX + w * 0.2, tipY + 10, bx + w * 0.45, by - 1);
    ctx.closePath();
    ctx.fillStyle = PINK;
    ctx.fill();
  }
}
function eye(ctx: Ctx, x: number, y: number, happy: boolean, r = 3.4) {
  if (happy) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(x, y + 2, r, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.9, r * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.4, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

interface CorgiOutfit {
  hat?: WornPiece | null;
  neck?: WornPiece | null;
}

function neckwear(ctx: Ctx, n: WornPiece | null | undefined, x: number, y: number, facing: 'side' | 'front' | 'back') {
  if (!n) return;
  switch (n.kind) {
    case 'bandana': {
      ctx.beginPath();
      if (facing === 'side') {
        ctx.moveTo(x - 9, y - 7);
        ctx.lineTo(x + 7, y - 9);
        ctx.lineTo(x + 2, y + 10);
      } else {
        ctx.moveTo(x - 15, y - 5);
        ctx.lineTo(x + 15, y - 5);
        ctx.lineTo(x, y + 13);
      }
      ctx.closePath();
      ctx.fillStyle = n.main;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.fillStyle = n.accent;
      for (const [dx, dy] of facing === 'side' ? [[-2, -2]] : [
        [-6, -1],
        [5, -1],
        [0, 5],
      ]) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'bowtie':
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + s * 10, y - 6);
        ctx.lineTo(x + s * 10, y + 6);
        ctx.closePath();
        ctx.fillStyle = n.main;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = INK;
        ctx.stroke();
      }
      ell(ctx, x, y, 3, 3, n.main, 2);
      break;
    case 'scarf':
      rr(ctx, x - (facing === 'side' ? 8 : 14), y - 5, facing === 'side' ? 16 : 28, 8, 4, n.main, 2);
      rr(ctx, x + (facing === 'side' ? -2 : 4), y, 7, 13, 3, n.accent, 2);
      break;
    case 'goldcollar':
      ctx.beginPath();
      ctx.ellipse(x, y - 2, facing === 'side' ? 10 : 15, 7, 0, 0, Math.PI);
      ctx.fillStyle = n.main;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.fillStyle = n.accent;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(x + i * (facing === 'side' ? 3.5 : 5.5), y + 2 + Math.abs(i) * -0.8, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'lace':
      for (let i = -3; i <= 3; i++) ell(ctx, x + i * (facing === 'side' ? 3 : 4.5), y + 1, 4, 5, n.main, 1.5);
      break;
  }
}

function hatwear(ctx: Ctx, hat: WornPiece | null | undefined, x: number, y: number, facing: 'side' | 'front' | 'back') {
  if (!hat) return;
  switch (hat.kind) {
    case 'tricorn': {
      ctx.beginPath();
      ctx.moveTo(x - 13, y);
      ctx.quadraticCurveTo(x - 12, y - 14, x, y - 14);
      ctx.quadraticCurveTo(x + 12, y - 14, x + 13, y);
      ctx.closePath();
      ctx.fillStyle = hat.main;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 20, y - 6);
      ctx.quadraticCurveTo(x, y + 6, x + 20, y - 6);
      ctx.quadraticCurveTo(x, y - 1, x - 20, y - 6);
      ctx.fillStyle = shade(hat.main, 0.1);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = hat.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }
    case 'bow':
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x, y - 4);
        ctx.quadraticCurveTo(x + s * 12, y - 16, x + s * 13, y - 3);
        ctx.quadraticCurveTo(x + s * 12, y + 6, x, y - 4);
        ctx.fillStyle = hat.main;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = INK;
        ctx.stroke();
      }
      ell(ctx, x, y - 4, 3.2, 3.2, hat.accent, 1.5);
      break;
    case 'bunnyears':
      for (const s of facing === 'side' ? [0] : [-1, 1]) {
        ctx.save();
        ctx.translate(x + s * 7, y - 2);
        ctx.rotate(s * 0.25 - (facing === 'side' ? 0.3 : 0));
        ell(ctx, 0, -14, 5.5, 14, hat.main, 2);
        ell(ctx, 0, -13, 2.6, 9.5, hat.accent, 0);
        ctx.restore();
      }
      break;
    case 'nemes':
      ctx.beginPath();
      ctx.moveTo(x - 14, y + 8);
      ctx.lineTo(x - 12, y - 8);
      ctx.quadraticCurveTo(x, y - 14, x + 12, y - 8);
      ctx.lineTo(x + 14, y + 8);
      ctx.closePath();
      ctx.fillStyle = hat.accent;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      break;
    case 'paper':
      ctx.beginPath();
      ctx.moveTo(x - 12, y);
      ctx.lineTo(x - 8, y - 11);
      ctx.lineTo(x + 8, y - 11);
      ctx.lineTo(x + 12, y);
      ctx.closePath();
      ctx.fillStyle = hat.main;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      rr(ctx, x - 10, y - 6, 20, 3, 1, hat.accent, 0);
      break;
    default: {
      // beret / generic cap
      ell(ctx, x, y - 4, 13, 6, hat.main, 2);
    }
  }
}

function sideBody(ctx: Ctx, o: CorgiOutfit, pose: { legs: number; head: 'normal' | 'down' | 'up'; mouth: boolean; happy: boolean; rump?: number }) {
  const lg = pose.legs;
  // far legs
  rr(ctx, 30 - lg, 64, 10, 20, 5, FUR_D, L);
  rr(ctx, 70 + lg, 64, 10, 20, 5, FUR_D, L);
  // body
  ell(ctx, 52, 56, 34, 18, FUR);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(52, 56, 33, 17, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.ellipse(56, 72, 30, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.ellipse(44, 44, 18, 5, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // fluffy rump + tiny tail
  ell(ctx, 22, 52 + (pose.rump ?? 0), 12, 12, FUR);
  ell(ctx, 13, 45 + (pose.rump ?? 0), 6, 5, WHITE, 2);
  // near legs + white socks
  for (const lx of [36 + lg, 64 - lg]) {
    rr(ctx, lx, 64, 11, 22, 5, FUR, L);
    rr(ctx, lx, 78, 11, 8, 4, WHITE, 2);
  }
  // head
  const hx = 82;
  const hy = pose.head === 'down' ? 52 : pose.head === 'up' ? 30 : 38;
  ear(ctx, hx - 10, hy - 12, hx - 16, hy - 36, 7);
  ear(ctx, hx + 2, hy - 13, hx + 6, hy - 38, 7);
  ell(ctx, hx, hy, 17, 16, FUR);
  // white blaze + muzzle
  ell(ctx, hx + 13, hy + 6, 11, 8, WHITE, 2.2);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(hx, hy, 16, 15, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.ellipse(hx + 6, hy - 6, 4, 10, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // nose
  ell(ctx, hx + 23, hy + 3, 3.8, 3.2, INK, 0);
  if (pose.mouth) {
    ctx.beginPath();
    ctx.moveTo(hx + 12, hy + 10);
    ctx.quadraticCurveTo(hx + 18, hy + 20, hx + 24, hy + 9);
    ctx.closePath();
    ctx.fillStyle = '#b44a52';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ell(ctx, hx + 17, hy + 15, 3.5, 3, PINK, 0);
  } else {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx + 18, hy + 9, 4, 0.2 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }
  eye(ctx, hx + 6, hy - 2, pose.happy);
  ctx.fillStyle = 'rgba(247,140,140,0.55)';
  ctx.beginPath();
  ctx.ellipse(hx + 2, hy + 7, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  neckwear(ctx, o.neck, hx - 12, hy + 12, 'side');
  hatwear(ctx, o.hat, hx - 4, hy - 12, 'side');
}

function frontBody(ctx: Ctx, o: CorgiOutfit, pose: { legs: number; happy: boolean; tongue: boolean; paws?: 'up' | 'left' | 'right'; bounce?: number; sit?: boolean }) {
  const b = pose.bounce ?? 0;
  const hx = 56;
  const hy = 40 + b;
  // body behind head
  if (pose.paws) {
    ell(ctx, hx, 66 + b, 17, 19, FUR);
    ell(ctx, hx, 70 + b, 11, 13, WHITE, 2);
    rr(ctx, hx - 16, 76, 12, 12, 5, WHITE, L);
    rr(ctx, hx + 4, 76, 12, 12, 5, WHITE, L);
    const up = pose.paws;
    const lpy = up === 'left' || up === 'up' ? 44 + b : 62 + b;
    const rpy = up === 'right' || up === 'up' ? 44 + b : 62 + b;
    rr(ctx, hx - 28, lpy, 11, 20, 5, FUR, L);
    rr(ctx, hx + 17, rpy, 11, 20, 5, FUR, L);
    ell(ctx, hx - 22.5, lpy + 2, 5.5, 4.5, WHITE, 2);
    ell(ctx, hx + 22.5, rpy + 2, 5.5, 4.5, WHITE, 2);
  } else {
    ell(ctx, hx, 64, 24, pose.sit ? 20 : 17, FUR);
    ell(ctx, hx, 66, 13, pose.sit ? 16 : 13, WHITE, 2);
    for (const [lx, lift] of [
      [hx - 17, pose.legs > 0 ? 3 : 0],
      [hx + 6, pose.legs < 0 ? 3 : 0],
    ]) {
      rr(ctx, lx, 70 - lift, 11, 18, 5, FUR, L);
      rr(ctx, lx, 81 - lift, 11, 7, 4, WHITE, 2);
    }
  }
  // head
  ear(ctx, hx - 13, hy - 12, hx - 24, hy - 38, 8);
  ear(ctx, hx + 13, hy - 12, hx + 24, hy - 38, 8);
  ell(ctx, hx, hy, 21, 19, FUR);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(hx, hy, 20, 18, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.moveTo(hx - 4, hy - 20);
  ctx.lineTo(hx + 4, hy - 20);
  ctx.lineTo(hx + 12, hy + 20);
  ctx.lineTo(hx - 12, hy + 20);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ell(ctx, hx, hy + 9, 11, 7.5, WHITE, 2);
  ell(ctx, hx, hy + 5, 4.5, 3.4, INK, 0);
  if (pose.tongue) {
    ctx.beginPath();
    ctx.moveTo(hx - 5, hy + 11);
    ctx.quadraticCurveTo(hx, hy + 24, hx + 5, hy + 11);
    ctx.closePath();
    ctx.fillStyle = PINK;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
  } else {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx, hy + 8);
    ctx.lineTo(hx, hy + 11);
    ctx.moveTo(hx - 5, hy + 11);
    ctx.quadraticCurveTo(hx - 2.5, hy + 14, hx, hy + 11);
    ctx.quadraticCurveTo(hx + 2.5, hy + 14, hx + 5, hy + 11);
    ctx.stroke();
  }
  eye(ctx, hx - 9, hy - 2, pose.happy);
  eye(ctx, hx + 9, hy - 2, pose.happy);
  ctx.fillStyle = 'rgba(247,140,140,0.55)';
  for (const bx of [hx - 15, hx + 15]) {
    ctx.beginPath();
    ctx.ellipse(bx, hy + 6, 4, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  neckwear(ctx, o.neck, hx, hy + 20, 'front');
  hatwear(ctx, o.hat, hx, hy - 16, 'front');
}

function backBody(ctx: Ctx, o: CorgiOutfit, legs: number) {
  const hx = 56;
  // head behind with ears
  ear(ctx, hx - 13, 30, hx - 24, 6, 8, false);
  ear(ctx, hx + 13, 30, hx + 24, 6, 8, false);
  ell(ctx, hx, 36, 20, 17, FUR);
  hatwear(ctx, o.hat, hx, 22, 'back');
  // the famous fluffy rump (heart shaped)
  for (const [lx, lift] of [
    [hx - 20, legs > 0 ? 3 : 0],
    [hx + 9, legs < 0 ? 3 : 0],
  ]) {
    rr(ctx, lx, 70 - lift, 11, 18, 5, FUR, L);
    rr(ctx, lx, 81 - lift, 11, 7, 4, WHITE, 2);
  }
  ell(ctx, hx - 11, 60, 16, 16, FUR);
  ell(ctx, hx + 11, 60, 16, 16, FUR);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(hx - 11, 60, 15, 15, 0, 0, Math.PI * 2);
  ctx.ellipse(hx + 11, 60, 15, 15, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.ellipse(hx, 70, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ell(ctx, hx, 49, 5, 4, WHITE, 2);
  void o;
}

function sleepBody(ctx: Ctx, o: CorgiOutfit) {
  ell(ctx, 56, 70, 36, 16, FUR);
  ell(ctx, 30, 70, 12, 11, FUR);
  ell(ctx, 80, 64, 16, 14, FUR);
  ear(ctx, 76, 54, 70, 36, 6, true);
  ear(ctx, 88, 54, 94, 38, 6, true);
  ell(ctx, 92, 70, 9, 6, WHITE, 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(80, 64, 3.5, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
  ell(ctx, 99, 68, 3, 2.5, INK, 0);
  neckwear(ctx, o.neck, 70, 72, 'side');
}

export function drawCorgi(ctx: Ctx, frame: CorgiFrame, o: CorgiOutfit): void {
  ctx.save();
  switch (frame) {
    case 'side-idle':
      sideBody(ctx, o, { legs: 0, head: 'normal', mouth: false, happy: false });
      break;
    case 'side-walkA':
      sideBody(ctx, o, { legs: 4, head: 'normal', mouth: true, happy: false, rump: -1 });
      break;
    case 'side-walkB':
      sideBody(ctx, o, { legs: -4, head: 'normal', mouth: true, happy: false, rump: 1 });
      break;
    case 'down-idle':
      frontBody(ctx, o, { legs: 0, happy: false, tongue: false });
      break;
    case 'down-walkA':
      frontBody(ctx, o, { legs: 1, happy: false, tongue: true });
      break;
    case 'down-walkB':
      frontBody(ctx, o, { legs: -1, happy: false, tongue: true });
      break;
    case 'up-idle':
      backBody(ctx, o, 0);
      break;
    case 'up-walkA':
      backBody(ctx, o, 1);
      break;
    case 'up-walkB':
      backBody(ctx, o, -1);
      break;
    case 'dig-A':
      ctx.translate(0, 4);
      ctx.rotate(0.12);
      sideBody(ctx, o, { legs: 6, head: 'down', mouth: false, happy: true, rump: -6 });
      break;
    case 'dig-B':
      ctx.translate(0, 4);
      ctx.rotate(0.12);
      sideBody(ctx, o, { legs: -6, head: 'down', mouth: false, happy: true, rump: -6 });
      break;
    case 'sniff':
      sideBody(ctx, o, { legs: 1, head: 'down', mouth: false, happy: false });
      break;
    case 'bark':
      ctx.translate(0, -6);
      sideBody(ctx, o, { legs: 3, head: 'up', mouth: true, happy: false, rump: 2 });
      break;
    case 'happy':
      frontBody(ctx, o, { legs: 0, happy: true, tongue: true });
      break;
    case 'sit':
      frontBody(ctx, o, { legs: 0, happy: false, tongue: false, sit: true });
      break;
    case 'sleep':
      sleepBody(ctx, o);
      break;
    case 'dance-A':
      frontBody(ctx, o, { legs: 0, happy: true, tongue: true, paws: 'left', bounce: -6 });
      break;
    case 'dance-B':
      frontBody(ctx, o, { legs: 0, happy: true, tongue: true, paws: 'right', bounce: -2 });
      break;
  }
  ctx.restore();
}

export function renderCorgiSheet(o: CorgiOutfit): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(CW * CORGI_FRAMES.length, CH);
  CORGI_FRAMES.forEach((f, i) => {
    ctx.save();
    ctx.translate(i * CW, 0);
    drawCorgi(ctx, f, o);
    ctx.restore();
  });
  return c;
}

export function renderCorgiPortrait(o: CorgiOutfit, size = 160, happy = true): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(size, size);
  const s = size / 92;
  ctx.scale(s, s);
  ctx.translate(-10, 6);
  drawCorgi(ctx, happy ? 'happy' : 'down-idle', o);
  return c;
}
