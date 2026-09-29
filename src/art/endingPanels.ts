import { PAL } from './palette';
import { makeCanvas, sparkle, rng } from './draw';
import { drawClocktower } from './clocktower';
import { drawPip } from './fairy';
import { FURNITURE_ART } from './furniture';

/** The ending storybook: four illustrated pages (960×540), in the same style as the opening. */
const W = 960;
const H = 540;

function sky(ctx: CanvasRenderingContext2D, top: string, bottom: string) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function stars(ctx: CanvasRenderingContext2D, n: number, seed = 7) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) sparkle(ctx, r() * W, r() * H * 0.5, 2 + r() * 4, 'rgba(255,248,200,0.9)');
}

function ground(ctx: CanvasRenderingContext2D, y: number) {
  ctx.fillStyle = '#4fa6c4';
  ctx.fillRect(0, y + 40, W, H - y);
  ctx.fillStyle = PAL.grass;
  ctx.beginPath();
  ctx.ellipse(W / 2, y + 60, 560, 130, 0, Math.PI, 0);
  ctx.fill();
}

/** A little round-headed friend (simple, so a whole crowd fits on a page). */
function friend(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fur: string, outfit: string, ears: 'round' | 'pointy' | 'bunny' = 'round') {
  ctx.lineWidth = 3;
  ctx.strokeStyle = PAL.ink;
  // body
  ctx.fillStyle = outfit;
  ctx.beginPath();
  ctx.roundRect(x - 16 * s, y - 34 * s, 32 * s, 36 * s, 12 * s);
  ctx.fill();
  ctx.stroke();
  // ears
  ctx.fillStyle = fur;
  if (ears === 'bunny') {
    for (const dx of [-8, 8]) {
      ctx.beginPath();
      ctx.ellipse(x + dx * s, y - 72 * s, 6 * s, 16 * s, dx * 0.02, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (ears === 'pointy') {
    for (const dx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + dx * 18 * s, y - 56 * s);
      ctx.lineTo(x + dx * 12 * s, y - 80 * s);
      ctx.lineTo(x + dx * 4 * s, y - 62 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else {
    for (const dx of [-14, 14]) {
      ctx.beginPath();
      ctx.arc(x + dx * s, y - 66 * s, 7 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  // head
  ctx.beginPath();
  ctx.arc(x, y - 52 * s, 20 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PAL.ink;
  for (const dx of [-7, 7]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y - 54 * s, 2.6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = PAL.blush;
  for (const dx of [-12, 12]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * s, y - 46 * s, 4 * s, 2.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y - 47 * s, 5 * s, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function bunting(ctx: CanvasRenderingContext2D, y: number) {
  const cols = [PAL.red, PAL.gold, PAL.blue, PAL.green, PAL.purple, PAL.pink];
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.quadraticCurveTo(W / 2, y + 60, W, y);
  ctx.stroke();
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x = t * W;
    const yy = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y + 60) + t * t * y;
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath();
    ctx.moveTo(x - 14, yy);
    ctx.lineTo(x + 14, yy);
    ctx.lineTo(x, yy + 26);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export const ENDING_PANELS: ((ctx: CanvasRenderingContext2D) => void)[] = [
  // 1. the Great Hourglass, whole again and glowing
  (ctx) => {
    sky(ctx, '#3b3470', '#8f7fb0');
    stars(ctx, 40);
    const hg = FURNITURE_ART['greathourglass-whole']?.() ?? FURNITURE_ART.greathourglass();
    const s = 0.95;
    const img = hg.cv.c;
    const g = ctx.createRadialGradient(W / 2, H * 0.5, 20, W / 2, H * 0.5, 320);
    g.addColorStop(0, 'rgba(255, 230, 160, 0.75)');
    g.addColorStop(1, 'rgba(255, 230, 160, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, W / 2 - (img.width * s) / 2, H - 40 - img.height * s, img.width * s, img.height * s);
    drawPip(ctx, W / 2 + 230, 210, 1.2, 0.6, true);
    for (let i = 0; i < 12; i++) sparkle(ctx, W / 2 + Math.cos(i) * 200, H * 0.45 + Math.sin(i * 1.7) * 150, 6 + (i % 3) * 3, i % 2 ? PAL.gold : '#ffffff');
  },
  // 2. Tockwood with its clocktower mended, and friends arriving from every era
  (ctx) => {
    sky(ctx, '#f7b58a', '#ffe3c2');
    ground(ctx, H * 0.6);
    const tower = drawClocktower({ tangled: false, glow: 1 }).c;
    const th = 300;
    const tw = (tower.width / tower.height) * th;
    ctx.drawImage(tower, W / 2 - tw / 2, H * 0.6 - th + 40, tw, th);
    // the portal ring, with friends stepping out
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 6;
    ctx.fillStyle = 'rgba(191, 160, 240, 0.8)';
    ctx.beginPath();
    ctx.ellipse(170, H * 0.62, 70, 100, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    friend(ctx, 260, H * 0.8, 1.1, '#f29e4c', '#c0464b', 'pointy'); // the captain
    friend(ctx, 330, H * 0.84, 1, '#b98a5e', '#fbf6ea'); // the master builder
    friend(ctx, 640, H * 0.84, 1, '#8a7a9e', '#e0555f'); // the bowling champion
    friend(ctx, 720, H * 0.8, 1.1, '#6d6a74', '#e9e2d0'); // the inventor
    friend(ctx, 800, H * 0.84, 1, '#f4a3b4', '#cfe3f0'); // the painter
  },
  // 3. the big party: the bunny hop and a giant pot of soup
  (ctx) => {
    sky(ctx, '#5b4a8f', '#f2b27a');
    stars(ctx, 20, 11);
    bunting(ctx, 40);
    ctx.fillStyle = '#e6dccb';
    ctx.fillRect(0, H * 0.6, W, H * 0.4);
    // the giant pot
    ctx.fillStyle = '#6d6a74';
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.72, 120, 80, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffc27a';
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.64, 104, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 5; i++) sparkle(ctx, W / 2 - 80 + i * 40, H * 0.52 - (i % 2) * 20, 8, '#ffffff');
    // a line of hopping bunnies
    for (let i = 0; i < 9; i++) {
      const x = 90 + i * 95;
      const hop = i % 2 ? -18 : 0;
      if (Math.abs(x - W / 2) < 150) continue;
      friend(ctx, x, H * 0.92 + hop, 0.8, ['#f4ede4', '#c9a27e', '#e8cfa9', '#9c8f86'][i % 4], ['#f4a3b4', '#6fb3e0', '#f7c65a', '#7cc47f'][i % 4], 'bunny');
    }
  },
  // 4. the end: evening on the island, the clock ticking the right way
  (ctx) => {
    sky(ctx, '#2d2a5a', '#6d5aa6');
    stars(ctx, 60, 21);
    ground(ctx, H * 0.66);
    const tower = drawClocktower({ tangled: false, glow: 1 }).c;
    const th = 280;
    const tw = (tower.width / tower.height) * th;
    ctx.drawImage(tower, W / 2 - tw / 2, H * 0.66 - th + 40, tw, th);
    for (const [x, y] of [
      [200, H * 0.62],
      [760, H * 0.64],
    ]) {
      const g = ctx.createRadialGradient(x, y, 2, x, y, 40);
      g.addColorStop(0, 'rgba(255, 217, 138, 0.9)');
      g.addColorStop(1, 'rgba(255, 217, 138, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 40, y - 40, 80, 80);
    }
    ctx.fillStyle = '#fff8ec';
    ctx.font = '700 64px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 8;
    ctx.strokeText('The End', W / 2, 110);
    ctx.fillText('The End', W / 2, 110);
  },
];

export function renderEndingPanel(i: number): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(W, H);
  ENDING_PANELS[i](ctx);
  return c;
}

export const ENDING_TEXT = [
  'TING! The eighth Time Sand swirled home, and the Great Hourglass glowed brighter than it ever had before. Tick, tock — every clock on Tockwood Isle ticked the right way at last.',
  'And through the portal came friends from every corner of history: captains and cooks, builders and scribes, bowlers and dancers, inventors and painters — all to say thank you.',
  'Everyone danced the bunny hop with all twelve Hopkins cousins, Biscuit bounced the highest of all, and Clover’s giant pot of celebration soup fed the whole island.',
  'And if history ever gets tangled again, Pip knows exactly who to call. Sweet dreams, time travellers.',
];
