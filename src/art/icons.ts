import { PAL, shade } from './palette';
import { makeCanvas, sparkle } from './draw';
import { ITEM_BY_ID } from '../data/items';
import { FURNITURE_ART } from './furniture';

/** Item icons: 64x64 procedural drawings, cached as data URLs for the DOM UI. */
const S = 64;
const INK = PAL.ink;
type Ctx = CanvasRenderingContext2D;

function e(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, lw = 2.5, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}
function poly(ctx: Ctx, pts: number[][], fill: string, lw = 2.5) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}
function r(ctx: Ctx, x: number, y: number, w: number, h: number, rad: number, fill: string, lw = 2.5) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rad);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}
function line(ctx: Ctx, pts: number[][], color: string, w = 2.5) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.stroke();
}
function shine(ctx: Ctx, x: number, y: number, rx = 5, ry = 3) {
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, -0.5, 0, Math.PI * 2);
  ctx.fill();
}
function seedPacket(c: Ctx, color: string) {
  r(c, 16, 10, 32, 44, 5, '#f3e6c8');
  e(c, 32, 32, 9, 9, color, 2);
  for (const [x, y] of [
    [24, 48],
    [30, 46],
    [36, 48],
  ])
    e(c, x, y, 2, 1.5, INK, 0);
}

/** A corked potion-style bottle of soup. */
function soupBottle(c: Ctx, color: string) {
  r(c, 26, 8, 12, 9, 3, '#c89a6a');
  c.beginPath();
  c.moveTo(27, 16);
  c.lineTo(37, 16);
  c.lineTo(37, 24);
  c.quadraticCurveTo(50, 28, 50, 42);
  c.quadraticCurveTo(50, 56, 32, 56);
  c.quadraticCurveTo(14, 56, 14, 42);
  c.quadraticCurveTo(14, 28, 27, 24);
  c.closePath();
  c.fillStyle = 'rgba(232,251,255,0.9)';
  c.fill();
  c.lineWidth = 2.5;
  c.strokeStyle = INK;
  c.stroke();
  c.save();
  c.clip();
  c.fillStyle = color;
  c.fillRect(10, 34, 44, 24);
  c.fillStyle = shade(color, 0.12);
  c.beginPath();
  c.ellipse(32, 34, 20, 4, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  shine(c, 22, 30, 3, 6);
  sparkle(c, 46, 16, 5, '#ffffff');
}

/** A steaming bowl of soup. */
function soupBowl(c: Ctx, color: string) {
  c.strokeStyle = 'rgba(255,255,255,0.8)';
  c.lineWidth = 3;
  c.lineCap = 'round';
  for (const x of [24, 32, 40]) {
    c.beginPath();
    c.moveTo(x, 22);
    c.bezierCurveTo(x - 4, 16, x + 4, 12, x, 6);
    c.stroke();
  }
  e(c, 32, 34, 24, 7, color, 2.5);
  c.beginPath();
  c.moveTo(8, 34);
  c.quadraticCurveTo(10, 56, 32, 56);
  c.quadraticCurveTo(54, 56, 56, 34);
  c.closePath();
  c.fillStyle = '#f3e6c8';
  c.fill();
  c.lineWidth = 2.5;
  c.strokeStyle = INK;
  c.stroke();
  r(c, 22, 54, 20, 4, 2, '#e0c9a0', 2);
  shine(c, 18, 42, 3, 5);
}

/** Code-breaking gears: colour AND a symbol, so colourblind players can tell them apart. */
const CODE_COLORS = ['#e46a6a', '#6fb3e0', '#f7c65a', '#7cc47f', '#a58bd6', '#f29e4c'];
function codeGear(c: Ctx, n: number) {
  const col = CODE_COLORS[n % CODE_COLORS.length];
  c.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rad = i % 2 ? 22 : 27;
    c.lineTo(32 + Math.cos(a) * rad, 32 + Math.sin(a) * rad);
  }
  c.closePath();
  c.fillStyle = col;
  c.fill();
  c.lineWidth = 2.5;
  c.strokeStyle = INK;
  c.stroke();
  e(c, 32, 32, 13, 13, '#fff8ec', 2);
  c.fillStyle = INK;
  c.beginPath();
  const sym = n % 6;
  if (sym === 0) c.arc(32, 32, 6, 0, Math.PI * 2);
  else if (sym === 1) {
    c.moveTo(32, 25);
    c.lineTo(39, 37);
    c.lineTo(25, 37);
  } else if (sym === 2) c.rect(26, 26, 12, 12);
  else if (sym === 3) {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const rad = i % 2 ? 3 : 7.5;
      c.lineTo(32 + Math.cos(a) * rad, 32 + Math.sin(a) * rad);
    }
  } else if (sym === 4) {
    c.moveTo(32, 38);
    c.bezierCurveTo(22, 31, 27, 24, 32, 29);
    c.bezierCurveTo(37, 24, 42, 31, 32, 38);
  } else {
    c.moveTo(32, 25);
    c.lineTo(39, 32);
    c.lineTo(32, 39);
    c.lineTo(25, 32);
  }
  c.closePath();
  c.fill();
}

const DRAW: Record<string, (ctx: Ctx) => void> = {
  scallop: (c) => {
    c.beginPath();
    c.moveTo(32, 52);
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      c.lineTo(32 + Math.cos(a) * 24, 40 + Math.sin(a) * 26);
    }
    c.closePath();
    c.fillStyle = '#ffc9b5';
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = INK;
    c.stroke();
    for (let i = 1; i < 6; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      line(c, [
        [32, 50],
        [32 + Math.cos(a) * 22, 40 + Math.sin(a) * 24],
      ], '#e0957c', 2);
    }
    r(c, 25, 48, 14, 8, 3, '#ffc9b5');
  },
  spiral: (c) => {
    e(c, 30, 36, 18, 16, '#f3dcb8');
    c.beginPath();
    for (let t = 0; t < 12; t += 0.2) c.lineTo(30 + Math.cos(t) * t * 1.3, 36 + Math.sin(t) * t * 1.1);
    c.strokeStyle = '#c99a62';
    c.lineWidth = 2.5;
    c.stroke();
    poly(c, [
      [44, 30],
      [58, 18],
      [52, 38],
    ], '#f3dcb8');
  },
  conch: (c) => {
    poly(c, [
      [14, 40],
      [40, 12],
      [56, 30],
      [46, 54],
      [22, 54],
    ], '#f9b8c6');
    e(c, 36, 38, 9, 11, '#fde1e7', 2);
    shine(c, 28, 26);
  },
  sanddollar: (c) => {
    e(c, 32, 32, 22, 22, '#efe2c4');
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
      e(c, 32 + Math.cos(a) * 10, 32 + Math.sin(a) * 10, 2.5, 5, '#d9c296', 0, a + Math.PI / 2);
    }
  },
  seaglass: (c) => {
    poly(c, [
      [18, 30],
      [30, 16],
      [48, 22],
      [50, 42],
      [30, 50],
    ], '#8fd9c4');
    shine(c, 30, 28);
  },
  ammonite: (c) => {
    e(c, 32, 32, 22, 22, '#c9b89c');
    c.beginPath();
    for (let t = 0; t < 14; t += 0.15) c.lineTo(32 + Math.cos(t) * t * 1.45, 32 + Math.sin(t) * t * 1.45);
    c.strokeStyle = '#8f7c5f';
    c.lineWidth = 3;
    c.stroke();
  },
  trilobite: (c) => {
    e(c, 32, 34, 16, 22, '#a99c8a');
    e(c, 32, 18, 14, 8, '#bfb3a2');
    for (let y = 26; y < 52; y += 5) line(c, [
      [20, y],
      [44, y],
    ], '#7d7063', 2);
    line(c, [
      [32, 20],
      [32, 54],
    ], '#7d7063', 3);
  },
  fern: (c) => {
    r(c, 10, 10, 44, 44, 10, '#cfc2b0');
    line(c, [
      [22, 50],
      [42, 14],
    ], '#6f8a5f', 3);
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      const x = 22 + t * 20;
      const y = 50 - t * 36;
      line(c, [
        [x, y],
        [x - 9, y - 3],
      ], '#6f8a5f', 2);
      line(c, [
        [x, y],
        [x + 8, y + 3],
      ], '#6f8a5f', 2);
    }
  },
  tooth: (c) => {
    poly(c, [
      [16, 22],
      [48, 22],
      [34, 56],
    ], '#e8e2d0');
    r(c, 14, 14, 36, 10, 4, '#8a7a66');
    shine(c, 28, 32, 3, 6);
  },
  key: (c) => {
    e(c, 20, 32, 11, 11, PAL.gold);
    e(c, 20, 32, 4, 4, '#fff8ec', 2);
    r(c, 29, 28, 26, 8, 3, PAL.gold);
    r(c, 44, 34, 5, 9, 1, PAL.gold, 2);
    r(c, 51, 34, 4, 7, 1, PAL.gold, 2);
  },
  marble: (c) => {
    e(c, 32, 32, 20, 20, '#9fd0e3');
    c.beginPath();
    c.moveTo(18, 34);
    c.bezierCurveTo(26, 20, 38, 46, 46, 30);
    c.strokeStyle = PAL.red;
    c.lineWidth = 4;
    c.stroke();
    shine(c, 25, 24);
  },
  button: (c) => {
    e(c, 32, 32, 20, 20, PAL.pink);
    e(c, 32, 32, 14, 14, shade(PAL.pink, 0.2), 1.5);
    for (const [x, y] of [
      [27, 27],
      [37, 27],
      [27, 37],
      [37, 37],
    ])
      e(c, x, y, 2.5, 2.5, INK, 0);
  },
  gear: (c) => {
    c.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rad = i % 2 ? 16 : 22;
      c.lineTo(32 + Math.cos(a) * rad, 32 + Math.sin(a) * rad);
    }
    c.closePath();
    c.fillStyle = PAL.gold;
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = INK;
    c.stroke();
    e(c, 32, 32, 6, 6, '#fff8ec', 2);
  },
  acorn: (c) => {
    e(c, 32, 38, 14, 17, PAL.gold);
    r(c, 15, 16, 34, 14, 7, PAL.goldDark);
    line(c, [
      [32, 16],
      [34, 8],
    ], INK, 3);
    shine(c, 26, 36);
    sparkle(c, 50, 14, 6, '#fff7c2');
  },
  carrot: (c) => {
    poly(c, [
      [22, 18],
      [42, 18],
      [34, 58],
    ], PAL.orange);
    for (const dy of [26, 34, 42]) line(c, [
      [28, dy],
      [34, dy + 1],
    ], shade(PAL.orange, -0.3), 2);
    for (const a of [-0.5, 0, 0.5]) {
      c.save();
      c.translate(32, 16);
      c.rotate(a);
      e(c, 0, -7, 4, 9, PAL.green, 2);
      c.restore();
    }
  },
  radish: (c) => {
    e(c, 32, 38, 16, 15, '#e0566b');
    poly(c, [
      [30, 50],
      [34, 50],
      [32, 60],
    ], '#fff', 2);
    for (const a of [-0.4, 0.4]) {
      c.save();
      c.translate(32, 22);
      c.rotate(a);
      e(c, 0, -8, 5, 10, PAL.green, 2);
      c.restore();
    }
    shine(c, 26, 32);
  },
  pumpkin: (c) => {
    for (const dx of [-10, 10, 0]) e(c, 32 + dx, 38, 14, 16, PAL.orange);
    r(c, 29, 14, 6, 10, 2, PAL.leafDark);
    shine(c, 26, 32);
  },
  glowcap: (c) => {
    const g = c.createRadialGradient(32, 26, 2, 32, 26, 30);
    g.addColorStop(0, 'rgba(180,255,220,0.8)');
    g.addColorStop(1, 'rgba(180,255,220,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
    r(c, 26, 30, 12, 24, 5, '#f3ecdf');
    c.beginPath();
    c.ellipse(32, 30, 22, 14, 0, Math.PI, 0);
    c.closePath();
    c.fillStyle = '#6fd6b8';
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = INK;
    c.stroke();
    for (const [x, y] of [
      [24, 24],
      [36, 20],
      [42, 27],
    ])
      e(c, x, y, 3, 2.5, '#e9fff6', 0);
  },
  honey: (c) => {
    r(c, 16, 22, 32, 34, 10, PAL.gold);
    r(c, 18, 14, 28, 10, 4, PAL.woodLight);
    line(c, [
      [18, 36],
      [46, 36],
    ], PAL.goldDark, 2);
    shine(c, 26, 32);
  },
  kelp: (c) => {
    for (const [x, col] of [
      [24, PAL.leafDark],
      [38, PAL.leaf],
    ] as [number, string][]) {
      c.beginPath();
      c.moveTo(x, 58);
      c.bezierCurveTo(x - 12, 40, x + 12, 28, x - 4, 8);
      c.bezierCurveTo(x + 10, 26, x - 2, 42, x + 8, 58);
      c.closePath();
      c.fillStyle = col;
      c.fill();
      c.lineWidth = 2.5;
      c.strokeStyle = INK;
      c.stroke();
    }
  },
  fish: (c) => {
    e(c, 30, 32, 20, 11, '#b8c9d9');
    poly(c, [
      [48, 32],
      [60, 22],
      [60, 42],
    ], '#b8c9d9');
    e(c, 20, 29, 2.5, 2.5, INK, 0);
    shine(c, 28, 27);
  },
  cloverleaf: (c) => {
    for (const [x, y] of [
      [24, 26],
      [40, 26],
      [32, 40],
    ])
      e(c, x, y, 10, 10, shade(PAL.leaf, 0.12));
    line(c, [
      [32, 38],
      [36, 58],
    ], PAL.leafDark, 3);
  },
  'seeds-orange': (c) => seedPacket(c, PAL.orange),
  'seeds-red': (c) => seedPacket(c, '#e0566b'),
  'seeds-cream': (c) => seedPacket(c, '#f3dca2'),
  'seeds-tomato': (c) => {
    seedPacket(c, '#ff6b57');
    line(c, [
      [29, 24],
      [32, 26],
      [35, 24],
    ], '#5fa85a', 2.5);
  },
  coconut: (c) => {
    e(c, 32, 34, 20, 19, '#8a5a3a');
    for (const [x, y] of [
      [26, 30],
      [36, 30],
      [31, 38],
    ])
      e(c, x, y, 2.6, 2.6, '#4a3326', 0);
  },
  salt: (c) => {
    r(c, 18, 20, 28, 36, 8, '#ffffff');
    r(c, 20, 12, 24, 10, 4, PAL.blue);
    for (const [x, y] of [
      [26, 34],
      [34, 40],
      [30, 46],
      [38, 30],
    ])
      e(c, x, y, 2, 2, '#cfe3f0', 0);
  },
  pepper: (c) => {
    c.beginPath();
    c.moveTo(22, 22);
    c.quadraticCurveTo(52, 24, 44, 56);
    c.quadraticCurveTo(26, 44, 22, 22);
    c.fillStyle = PAL.red;
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = INK;
    c.stroke();
    r(c, 16, 14, 10, 10, 3, PAL.green);
    shine(c, 34, 32, 3, 6);
  },
  dates: (c) => {
    for (const [x, y, a] of [
      [24, 36, -0.4],
      [36, 30, 0.3],
      [36, 44, -0.1],
    ])
      e(c, x, y, 8, 13, '#8a4e2c', 2.5, a);
    shine(c, 34, 26, 2, 4);
  },
  lentils: (c) => {
    r(c, 12, 30, 40, 22, 10, '#c99a62');
    for (let i = 0; i < 9; i++) e(c, 18 + (i % 5) * 7, 28 - Math.floor(i / 5) * 5, 3.5, 3, '#e8a03a', 1.5);
  },
  onion: (c) => {
    c.beginPath();
    c.moveTo(32, 12);
    c.bezierCurveTo(56, 30, 50, 56, 32, 56);
    c.bezierCurveTo(14, 56, 8, 30, 32, 12);
    c.fillStyle = '#e8c98f';
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = INK;
    c.stroke();
    line(c, [
      [32, 16],
      [32, 52],
    ], '#c9a060', 2);
  },
  tomato: (c) => {
    e(c, 32, 36, 20, 18, '#e5483b');
    poly(c, [
      [24, 20],
      [32, 24],
      [40, 20],
      [36, 26],
      [28, 26],
    ], PAL.green, 2);
    shine(c, 25, 30);
  },
  corn: (c) => {
    e(c, 32, 32, 11, 22, PAL.gold);
    for (let y = 16; y < 50; y += 6) for (let x = 26; x < 40; x += 5) e(c, x, y, 2, 2, PAL.goldDark, 0);
    poly(c, [
      [22, 50],
      [18, 22],
      [30, 46],
    ], PAL.green, 2);
    poly(c, [
      [42, 50],
      [46, 22],
      [34, 46],
    ], PAL.green, 2);
  },
  milk: (c) => {
    r(c, 20, 16, 24, 40, 8, '#ffffff');
    r(c, 24, 10, 16, 8, 3, PAL.blue);
    r(c, 20, 32, 24, 10, 0, '#cfe3f0', 0);
    shine(c, 27, 24, 2, 6);
  },
  basil: (c) => {
    for (const [x, y, a] of [
      [24, 30, -0.6],
      [40, 30, 0.6],
      [32, 20, 0],
      [32, 42, 0],
    ])
      e(c, x, y, 8, 12, '#5aa84f', 2.5, a);
    line(c, [
      [32, 30],
      [32, 58],
    ], PAL.leafDark, 3);
  },
  beans: (c) => {
    for (const [x, y, a] of [
      [22, 30, 0.3],
      [36, 26, -0.3],
      [30, 42, 0.8],
      [44, 40, 0],
    ])
      e(c, x, y, 9, 6, '#f5ecd8', 2.5, a);
  },
  coin: (c) => {
    e(c, 32, 32, 22, 22, PAL.gold);
    e(c, 32, 32, 15, 15, shade(PAL.gold, 0.2), 1.5);
    c.fillStyle = PAL.goldDark;
    c.font = '700 20px Fredoka, sans-serif';
    c.textAlign = 'center';
    c.fillText('8', 32, 39);
    sparkle(c, 50, 14, 6, '#fff7c2');
  },
  spyglass: (c) => {
    c.save();
    c.translate(32, 32);
    c.rotate(-0.6);
    r(c, -24, -6, 18, 12, 3, PAL.goldDark);
    r(c, -8, -8, 18, 16, 3, PAL.gold);
    r(c, 8, -10, 18, 20, 4, PAL.goldDark);
    c.restore();
  },
  hourglass: (c) => {
    r(c, 14, 8, 36, 7, 3, PAL.wood);
    r(c, 14, 49, 36, 7, 3, PAL.wood);
    poly(c, [
      [18, 15],
      [46, 15],
      [34, 32],
      [46, 49],
      [18, 49],
      [30, 32],
    ], '#e8f6fb');
    poly(c, [
      [22, 44],
      [42, 44],
      [44, 48],
      [20, 48],
    ], PAL.gold, 0);
  },
  scarab: (c) => {
    e(c, 32, 36, 16, 18, '#3fa8a0');
    e(c, 32, 16, 9, 6, '#2f8a83');
    line(c, [
      [32, 20],
      [32, 54],
    ], '#246c67', 2.5);
    shine(c, 26, 32);
  },
  scroll: (c) => {
    r(c, 14, 16, 36, 34, 4, '#efdcaa');
    e(c, 14, 33, 5, 18, '#d9c07f');
    e(c, 50, 33, 5, 18, '#d9c07f');
    for (const y of [24, 30, 36, 42]) line(c, [
      [22, y],
      [42, y],
    ], '#8a6a3a', 2);
  },
  hippo: (c) => {
    e(c, 32, 36, 22, 14, '#3aa7c9');
    e(c, 48, 32, 10, 9, '#3aa7c9');
    for (const x of [20, 28, 36, 44]) r(c, x - 3, 44, 7, 10, 3, '#3aa7c9', 2);
    e(c, 50, 29, 2, 2, INK, 0);
  },
  record: (c) => {
    e(c, 32, 32, 24, 24, '#2f2a2a');
    e(c, 32, 32, 16, 16, '#3a3434', 1);
    e(c, 32, 32, 7, 7, PAL.red, 2);
    shine(c, 22, 22);
  },
  pin: (c) => {
    c.beginPath();
    c.moveTo(32, 6);
    c.bezierCurveTo(42, 6, 42, 22, 38, 26);
    c.bezierCurveTo(48, 36, 46, 52, 40, 58);
    c.lineTo(24, 58);
    c.bezierCurveTo(18, 52, 16, 36, 26, 26);
    c.bezierCurveTo(22, 22, 22, 6, 32, 6);
    c.fillStyle = '#ffffff';
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = INK;
    c.stroke();
    r(c, 26, 20, 12, 3, 1, PAL.red, 0);
    r(c, 25, 25, 14, 3, 1, PAL.red, 0);
  },
  soda: (c) => {
    poly(c, [
      [20, 14],
      [44, 14],
      [38, 50],
      [26, 50],
    ], '#ffe0e8');
    r(c, 24, 50, 16, 8, 3, '#e8f6fb');
    e(c, 32, 12, 12, 6, '#ffffff');
    e(c, 36, 6, 4, 4, PAL.red, 2);
  },
  brush: (c) => {
    c.save();
    c.translate(32, 32);
    c.rotate(-0.7);
    r(c, -4, -26, 8, 34, 3, PAL.wood);
    r(c, -6, 6, 12, 8, 2, '#b8b8c0');
    poly(c, [
      [-6, 14],
      [6, 14],
      [0, 28],
    ], PAL.blue);
    c.restore();
  },
  glider: (c) => {
    poly(c, [
      [8, 30],
      [32, 20],
      [56, 30],
      [32, 34],
    ], '#efdcaa');
    line(c, [
      [32, 20],
      [32, 50],
    ], PAL.woodDark, 3);
    line(c, [
      [14, 29],
      [50, 29],
    ], PAL.woodDark, 2);
  },
  pigment: (c) => {
    r(c, 18, 22, 28, 32, 8, '#e8f6fb');
    r(c, 18, 36, 28, 18, 8, '#3f5aa8', 0);
    r(c, 16, 16, 32, 8, 3, PAL.wood);
  },
  mappiece: (c) => {
    poly(c, [
      [10, 12],
      [52, 10],
      [56, 30],
      [48, 52],
      [12, 54],
      [16, 34],
    ], '#efdcaa');
    line(c, [
      [18, 44],
      [26, 36],
      [34, 38],
      [42, 26],
    ], PAL.red, 2.5);
    c.strokeStyle = PAL.red;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(38, 20);
    c.lineTo(46, 28);
    c.moveTo(46, 20);
    c.lineTo(38, 28);
    c.stroke();
  },
  mapscrap: (c) => {
    poly(c, [
      [12, 14],
      [50, 10],
      [54, 28],
      [50, 50],
      [14, 54],
      [9, 34],
    ], '#efdcaa');
    line(c, [
      [16, 46],
      [24, 40],
      [30, 42],
      [36, 34],
    ], PAL.inkSoft, 2);
    c.strokeStyle = '#d9483b';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(34, 18);
    c.lineTo(46, 30);
    c.moveTo(46, 18);
    c.lineTo(34, 30);
    c.stroke();
  },
  seachest: (c) => {
    r(c, 8, 28, 48, 26, 4, PAL.wood);
    c.beginPath();
    c.moveTo(8, 32);
    c.lineTo(8, 24);
    c.quadraticCurveTo(32, 6, 56, 24);
    c.lineTo(56, 32);
    c.closePath();
    c.fillStyle = PAL.woodLight;
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = INK;
    c.stroke();
    r(c, 8, 30, 48, 5, 2, PAL.goldDark, 2);
    r(c, 14, 20, 5, 34, 2, PAL.goldDark, 2);
    r(c, 45, 20, 5, 34, 2, PAL.goldDark, 2);
    r(c, 27, 32, 10, 11, 2, PAL.gold, 2);
  },
  tockens: (c) => {
    e(c, 32, 32, 22, 22, PAL.gold);
    e(c, 32, 32, 16, 16, shade(PAL.gold, 0.2), 1.5);
    poly(c, [
      [26, 22],
      [38, 22],
      [34, 32],
      [38, 42],
      [26, 42],
      [30, 32],
    ], '#fff8ec', 2);
  },
};

const cache = new Map<string, string>();

/** A piece of furniture, shrunk to fit an icon. */
function furnitureIcon(c: Ctx, art: string): void {
  const make = FURNITURE_ART[art];
  if (!make) return DRAW.marble(c);
  const img = make().cv.c;
  const k = Math.min((S - 6) / img.width, (S - 6) / img.height);
  const w = img.width * k;
  const h = img.height * k;
  c.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
}

export function iconCanvas(key: string, size = S): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(size, size);
  ctx.lineJoin = 'round';
  ctx.scale(size / S, size / S);
  const dyn = key.startsWith('bottle:')
    ? (c: Ctx) => soupBottle(c, key.slice(7))
    : key.startsWith('bowl:')
      ? (c: Ctx) => soupBowl(c, key.slice(5))
      : key.startsWith('codegear:')
        ? (c: Ctx) => codeGear(c, Number(key.slice(9)))
        : key.startsWith('fur:')
          ? (c: Ctx) => furnitureIcon(c, key.slice(4))
          : null;
  (DRAW[key] ?? dyn ?? DRAW.marble)(ctx);
  return c;
}

/** Data URL for an item's icon (by item id or raw icon key). */
export function iconUrl(idOrKey: string): string {
  const key = ITEM_BY_ID.get(idOrKey)?.icon ?? idOrKey;
  let url = cache.get(key);
  if (!url) {
    url = iconCanvas(key, 96).toDataURL();
    cache.set(key, url);
  }
  return url;
}

export function hasIcon(key: string): boolean {
  return key in DRAW;
}
