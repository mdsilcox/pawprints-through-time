import { PAL } from './palette';
import { makeCanvas, sparkle, rng } from './draw';
import { drawClocktower } from './clocktower';
import { drawPip } from './fairy';
import { FURNITURE_ART } from './furniture';

/** Illustrated storybook panels for the opening (and the ending). 960x540 each. */
const W = 960;
const H = 540;

function sky(ctx: CanvasRenderingContext2D, top: string, bottom: string) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function stars(ctx: CanvasRenderingContext2D, n: number, seed = 3) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) sparkle(ctx, r() * W, r() * H * 0.55, 2 + r() * 4, 'rgba(255,248,200,0.9)');
}

function island(ctx: CanvasRenderingContext2D, cx: number, baseY: number, s: number, towerTangled = true) {
  ctx.fillStyle = '#4fa6c4';
  ctx.fillRect(0, baseY - 10 * s, W, H - baseY + 10 * s);
  ctx.fillStyle = PAL.sand;
  ctx.beginPath();
  ctx.ellipse(cx, baseY, 300 * s, 70 * s, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = PAL.grass;
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 6 * s, 260 * s, 100 * s, 0, Math.PI, 0);
  ctx.fill();
  const tower = drawClocktower({ tangled: towerTangled, glow: 1 }).c;
  const th = 330 * s;
  const tw = (tower.width / tower.height) * th;
  ctx.drawImage(tower, cx - tw / 2, baseY - 80 * s - th + 20 * s, tw, th);
  // cottages
  for (const [dx, col] of [
    [-170, PAL.roofRed],
    [150, PAL.roofPurple],
    [220, PAL.roofTeal],
  ] as [number, string][]) {
    const x = cx + dx * s;
    const y = baseY - 50 * s;
    ctx.fillStyle = PAL.wall;
    ctx.fillRect(x - 26 * s, y - 34 * s, 52 * s, 34 * s);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - 34 * s, y - 32 * s);
    ctx.lineTo(x, y - 62 * s);
    ctx.lineTo(x + 34 * s, y - 32 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PAL.lamp;
    ctx.fillRect(x - 8 * s, y - 24 * s, 16 * s, 12 * s);
  }
}

function hourglassBig(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const hg = FURNITURE_ART.greathourglass().cv.c;
  ctx.drawImage(hg, x - (hg.width * s) / 2, y - hg.height * s, hg.width * s, hg.height * s);
}

export const STORY_PANELS: ((ctx: CanvasRenderingContext2D) => void)[] = [
  // 1. the sleepy island
  (ctx) => {
    sky(ctx, '#f7b58a', '#ffe3c2');
    ctx.fillStyle = 'rgba(255,240,200,0.8)';
    ctx.beginPath();
    ctx.arc(760, 150, 60, 0, Math.PI * 2);
    ctx.fill();
    island(ctx, 480, 470, 1.15);
  },
  // 2. Pip and the Great Hourglass
  (ctx) => {
    sky(ctx, '#6f5aa8', '#a58bd6');
    const g = ctx.createRadialGradient(480, 300, 20, 480, 300, 320);
    g.addColorStop(0, 'rgba(255,230,160,0.7)');
    g.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    hourglassBig(ctx, 430, 520, 1.1);
    // sands glowing in their sockets
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = PAL.gold;
      ctx.beginPath();
      ctx.arc(430 - 143 + 44 + i * 28.3, 520 - 473 + 18, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    drawPip(ctx, 680, 250, 2.2, 0.6, true);
    stars(ctx, 20, 9);
  },
  // 3. the storm: CRACK! the sands scatter
  (ctx) => {
    sky(ctx, '#2d2a5a', '#4a4a86');
    ctx.strokeStyle = 'rgba(180,200,255,0.35)';
    ctx.lineWidth = 3;
    const r = rng(7);
    for (let i = 0; i < 60; i++) {
      const x = r() * W;
      const y = r() * H;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 10, y + 26);
      ctx.stroke();
    }
    // a friendly cartoon lightning bolt
    ctx.fillStyle = '#ffe36a';
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(760, 40);
    ctx.lineTo(700, 170);
    ctx.lineTo(750, 170);
    ctx.lineTo(690, 300);
    ctx.lineTo(820, 140);
    ctx.lineTo(770, 140);
    ctx.lineTo(820, 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    hourglassBig(ctx, 360, 530, 1.0);
    // eight sands whooshing away as shooting stars
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI * 0.95 + (i / 7) * Math.PI * 0.9;
      const x = 360 + Math.cos(a) * (220 + (i % 3) * 60);
      const y = 110 + Math.sin(a) * (120 + (i % 2) * 40) + 60;
      const tail = ctx.createLinearGradient(360, 100, x, y);
      tail.addColorStop(0, 'rgba(247,198,90,0)');
      tail.addColorStop(1, 'rgba(247,198,90,0.9)');
      ctx.strokeStyle = tail;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(360, 90);
      ctx.quadraticCurveTo((360 + x) / 2, Math.min(y, 90) - 60, x, y);
      ctx.stroke();
      sparkle(ctx, x, y, 16, '#fff3b0');
    }
  },
  // 4. backwards clocks... and a ferry arrives
  (ctx) => {
    sky(ctx, '#9fd3ee', '#fff1d6');
    island(ctx, 360, 430, 0.8, true);
    // ferry
    const fx = 720;
    const fy = 440;
    ctx.fillStyle = '#e8f6fb';
    ctx.fillRect(0, fy + 20, W, 4);
    ctx.fillStyle = PAL.red;
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(fx - 110, fy);
    ctx.lineTo(fx + 110, fy);
    ctx.lineTo(fx + 80, fy + 40);
    ctx.lineTo(fx - 80, fy + 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PAL.cream;
    ctx.beginPath();
    ctx.roundRect(fx - 60, fy - 50, 110, 50, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PAL.navy;
    ctx.fillRect(fx + 10, fy - 90, 20, 44);
    ctx.strokeRect(fx + 10, fy - 90, 20, 44);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(fx + 30 + i * 26, fy - 110 - i * 22, 14 + i * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // a big clock face with a "backwards" arrow
    const cx = 170;
    const cy = 150;
    ctx.fillStyle = PAL.cream;
    ctx.beginPath();
    ctx.arc(cx, cy, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - 40, cy - 30);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 10, cy - 64);
    ctx.stroke();
    ctx.strokeStyle = PAL.red;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, 116, -0.3, -1.6, true);
    ctx.stroke();
    ctx.fillStyle = PAL.red;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 128);
    ctx.lineTo(cx - 34, cy - 112);
    ctx.lineTo(cx - 4, cy - 98);
    ctx.closePath();
    ctx.fill();
  },
];

export function renderPanel(i: number): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(W, H);
  STORY_PANELS[i](ctx);
  return c;
}

export const OPENING_TEXT = [
  'Tockwood Isle is a sleepy little island with a big old clocktower right in the middle.',
  'Inside lives Pip, a tiny time fairy. She looks after the Great Hourglass, which keeps all of history flowing smoothly — tick, tock, tick, tock.',
  'But one stormy night... CRACK! The hourglass split, and its eight glowing Time Sands went whooshing off into history!',
  'Now the past is getting all tangled up, and the village clocks are running backwards! Tockwood needs a helper... and a ferry is just arriving.',
];
