import { PAL } from './palette';
import { makeCanvas, sparkle, rng } from './draw';
import { drawClocktower } from './clocktower';
import { drawPip } from './fairy';
import { FURNITURE_ART } from './furniture';
import { FEET_Y, FH, FRAMES, FW, renderCharacterSheet } from './character';
import { BH, BUNNY_FRAMES, BW, renderBunnySheet } from './bunny';
import { CH, CORGI_FRAMES, CW, renderCorgiSheet } from './corgi';
import { character } from '../data/characters';
import { HOPKINS } from '../data/bunnies';

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

/** A friend from the adventure, drawn as themselves (feet at x, y), in one of their poses. */
function realFriend(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, s: number, pose: string, flip = false) {
  const spec = character(id).spec;
  if (!spec) return;
  const sheet = renderCharacterSheet(spec);
  const fi = Math.max(0, FRAMES.findIndex((f) => f.name === pose));
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(sheet, fi * FW, 0, FW, FH, (-FW / 2) * s, -FEET_Y * s, FW * s, FH * s);
  ctx.restore();
}

/** A Hopkins cousin (feet at x, y). */
function realBunny(ctx: CanvasRenderingContext2D, i: number, x: number, y: number, s: number, frame: (typeof BUNNY_FRAMES)[number]) {
  const hb = HOPKINS[i % HOPKINS.length];
  const sheet = renderBunnySheet(hb.look);
  const fi = BUNNY_FRAMES.indexOf(frame);
  ctx.drawImage(sheet, fi * BW, 0, BW, BH, x - 36 * s, y - 66 * s, BW * s, BH * s);
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
    // on the grass, as themselves: the captain and the cook out of the portal first, then the
    // builder; on the other side the bowling champion, the diner's owner, the inventor, the painter
    const g = H * 0.6 + 44;
    realFriend(ctx, 'cookie', 205, g - 6, 0.82, 'wave');
    realFriend(ctx, 'marigold', 272, g, 0.86, 'wave');
    realFriend(ctx, 'neb', 345, g + 4, 0.84, 'dance-cheer');
    realFriend(ctx, 'duke', 628, g + 4, 0.84, 'wave', true);
    realFriend(ctx, 'mabel', 698, g, 0.84, 'dance-cheer');
    realFriend(ctx, 'lucia', 768, g + 2, 0.86, 'wave', true);
    realFriend(ctx, 'fiorella', 838, g - 2, 0.84, 'dance-clap');
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
    // all twelve Hopkins cousins hopping in two rows either side of the pot — and Biscuit, bouncing highest
    const back = [70, 170, 270, 690, 790, 890];
    const front = [115, 215, 315, 645, 745, 845];
    back.forEach((x, i) => realBunny(ctx, i * 2 + 1, x, H * 0.8 + (i % 2 ? -10 : 0), 1.35, i % 2 ? 'danceB' : 'danceA'));
    front.forEach((x, i) => realBunny(ctx, i * 2, x, H * 0.95 + (i % 2 ? 0 : -14), 1.5, i % 2 ? 'hopB' : 'hopA'));
    const corgi = renderCorgiSheet({});
    const cf = CORGI_FRAMES.indexOf('dance-A');
    ctx.drawImage(corgi, cf * CW, 0, CW, CH, W / 2 + 118, H * 0.66 - 88 * 1.2, CW * 1.2, CH * 1.2);
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
