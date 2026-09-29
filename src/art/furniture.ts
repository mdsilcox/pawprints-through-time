import { PAL, shade } from './palette';
import { makeCanvas, rrPath, circlePath, ellipsePath, paint, softShade, OUTLINE, sparkle, type Cv } from './draw';
import type { PropArt } from './props';

/** Indoor furniture and fixtures (also the decorating catalogue). Anchor = floor contact point. */
const L = OUTLINE;

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, lw = L) {
  rrPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  rrPath(ctx, x, y, w, h, r);
  softShade(ctx, { x, y, w, h }, { darkAlpha: 0.14, lightAlpha: 0.22 });
  rrPath(ctx, x, y, w, h, r);
  paint(ctx, 'rgba(0,0,0,0)', lw);
}

function art(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, cv: Cv) => void, oy = h - 6): PropArt {
  const cv = makeCanvas(w, h);
  draw(cv.ctx, cv);
  return { cv, ox: 0.5, oy: oy / h };
}

/** The Great Hourglass, with `filled` of its eight sockets glowing with Time Sand. */
function greatHourglass(filled: number): PropArt {
  return art(260, 430, (c) => {
      // pedestal
      box(c, 40, 380, 180, 44, 12, PAL.stone);
      // frame posts
      for (const x of [44, 200]) box(c, x, 50, 16, 334, 6, PAL.woodDark);
      box(c, 24, 30, 212, 34, 12, PAL.wood);
      box(c, 24, 360, 212, 30, 12, PAL.wood);
      // glass bulbs
      c.beginPath();
      c.moveTo(70, 66);
      c.lineTo(190, 66);
      c.quadraticCurveTo(190, 170, 136, 210);
      c.quadraticCurveTo(190, 250, 190, 358);
      c.lineTo(70, 358);
      c.quadraticCurveTo(70, 250, 124, 210);
      c.quadraticCurveTo(70, 170, 70, 66);
      c.closePath();
      paint(c, 'rgba(220,242,250,0.9)', L);
      // the crack
      c.strokeStyle = PAL.ink;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(150, 90);
      c.lineTo(138, 120);
      c.lineTo(156, 140);
      c.lineTo(144, 170);
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.beginPath();
      c.ellipse(96, 110, 8, 30, 0, 0, Math.PI * 2);
      c.fill();
      // the sand that's home again settles in the bottom bulb
      if (filled > 0) {
        const hgt = 16 + filled * 12;
        c.save();
        c.beginPath();
        c.moveTo(72, 356);
        c.lineTo(188, 356);
        c.lineTo(188, 356 - hgt);
        c.quadraticCurveTo(130, 356 - hgt - 18, 72, 356 - hgt);
        c.closePath();
        c.fillStyle = '#c9b3f0';
        c.fill();
        c.restore();
      }
      // eight sand sockets around the top: glowing when their Time Sand is home
      for (let i = 0; i < 8; i++) {
        const x = 40 + i * 25.7;
        circlePath(c, x, 16, 9);
        paint(c, i < filled ? '#b28cf0' : '#d8cfe6', 2.5);
        if (i < filled) sparkle(c, x + 4, 11, 5, '#ffffff');
      }
    }, 424);
}

export const FURNITURE_ART: Record<string, () => PropArt> = {
  bed: () =>
    art(200, 240, (c) => {
      box(c, 16, 20, 168, 60, 18, PAL.wood);
      box(c, 22, 60, 156, 170, 16, '#f7f0e4');
      box(c, 30, 70, 140, 44, 16, '#ffffff');
      rrPath(c, 22, 118, 156, 112, [8, 8, 16, 16]);
      paint(c, '#9fc8e8', L);
      c.fillStyle = '#ffffff';
      for (let y = 130; y < 224; y += 22) for (let x = 36; x < 170; x += 28) {
        c.beginPath();
        c.arc(x + ((y / 22) % 2) * 14, y, 4, 0, Math.PI * 2);
        c.fill();
      }
    }, 234),
  table: () =>
    art(190, 130, (c) => {
      for (const x of [30, 150]) box(c, x, 60, 14, 62, 4, PAL.woodDark);
      box(c, 10, 30, 170, 40, 14, PAL.woodLight);
      box(c, 70, 10, 50, 30, 10, '#ffffff');
      circlePath(c, 95, 24, 10);
      paint(c, PAL.pink, 3);
    }, 122),
  chair: () =>
    art(80, 110, (c) => {
      box(c, 14, 10, 52, 50, 10, PAL.wood);
      box(c, 10, 56, 60, 22, 8, PAL.woodLight);
      for (const x of [16, 56]) box(c, x, 76, 8, 28, 3, PAL.woodDark, 3);
    }, 104),
  bookshelf: () =>
    art(170, 240, (c) => {
      box(c, 10, 10, 150, 224, 10, PAL.woodDark);
      const cols = [PAL.red, PAL.blue, PAL.green, PAL.gold, PAL.purple, PAL.orange];
      for (let row = 0; row < 3; row++) {
        box(c, 20, 20 + row * 72, 130, 62, 4, shade(PAL.woodDark, -0.2), 2);
        for (let i = 0; i < 7; i++) {
          const h = 42 + ((i * 13) % 16);
          box(c, 26 + i * 17, 20 + row * 72 + 62 - h, 14, h, 2, cols[(i + row) % cols.length], 2);
        }
      }
    }, 234),
  plant: () =>
    art(100, 150, (c) => {
      box(c, 26, 94, 48, 50, 10, '#d9795a');
      for (const [x, y, a] of [
        [50, 60, 0],
        [30, 74, -0.8],
        [70, 74, 0.8],
        [40, 44, -0.3],
        [62, 46, 0.4],
      ]) {
        c.save();
        c.translate(x, y);
        c.rotate(a);
        ellipsePath(c, 0, 0, 13, 26);
        paint(c, PAL.leaf, 3);
        c.restore();
      }
    }, 144),
  wardrobe: () =>
    art(180, 250, (c) => {
      box(c, 10, 10, 160, 234, 14, '#c98f5e');
      box(c, 22, 30, 64, 196, 8, shade('#c98f5e', 0.1));
      box(c, 94, 30, 64, 196, 8, shade('#c98f5e', 0.1));
      circlePath(c, 78, 128, 6);
      paint(c, PAL.gold, 2.5);
      circlePath(c, 102, 128, 6);
      paint(c, PAL.gold, 2.5);
      // little hanger sign
      box(c, 60, 0, 60, 26, 8, PAL.pink, 3);
    }, 244),
  mirror: () =>
    art(110, 220, (c) => {
      box(c, 45, 150, 20, 60, 4, PAL.woodDark);
      ellipsePath(c, 55, 90, 44, 76);
      paint(c, PAL.gold, L);
      ellipsePath(c, 55, 90, 34, 64);
      paint(c, '#cfe8f3', 3);
      c.fillStyle = 'rgba(255,255,255,0.6)';
      c.beginPath();
      c.ellipse(42, 70, 8, 24, -0.3, 0, Math.PI * 2);
      c.fill();
      box(c, 25, 204, 60, 12, 4, PAL.woodDark, 3);
    }, 214),
  dressform: () =>
    art(90, 200, (c) => {
      box(c, 40, 130, 10, 56, 3, PAL.woodDark, 3);
      box(c, 22, 184, 46, 10, 4, PAL.woodDark, 3);
      c.beginPath();
      c.moveTo(24, 40);
      c.quadraticCurveTo(45, 20, 66, 40);
      c.lineTo(62, 90);
      c.quadraticCurveTo(78, 120, 68, 136);
      c.lineTo(22, 136);
      c.quadraticCurveTo(12, 120, 28, 90);
      c.closePath();
      paint(c, PAL.pink, L);
      circlePath(c, 45, 26, 8);
      paint(c, PAL.woodDark, 3);
    }, 194),
  fabricshelf: () =>
    art(190, 200, (c) => {
      box(c, 10, 10, 170, 184, 10, PAL.wood);
      const cols = [PAL.pink, PAL.blue, PAL.gold, PAL.mint, PAL.purple, PAL.red, PAL.orange, PAL.green];
      for (let row = 0; row < 2; row++)
        for (let i = 0; i < 4; i++) {
          c.save();
          c.translate(36 + i * 39, 60 + row * 84);
          ellipsePath(c, 0, 0, 16, 30);
          paint(c, cols[(i + row * 4) % cols.length], 3);
          c.restore();
        }
    }, 194),
  counter: () =>
    art(290, 150, (c) => {
      box(c, 10, 30, 270, 112, 14, PAL.woodLight);
      box(c, 4, 20, 282, 26, 10, PAL.wood);
      for (let x = 40; x < 270; x += 60) box(c, x, 60, 36, 70, 6, shade(PAL.woodLight, -0.1), 2.5);
    }, 142),
  shelfjars: () =>
    art(200, 200, (c) => {
      for (const y of [60, 130]) box(c, 6, y, 188, 14, 4, PAL.wood);
      const cols = [PAL.orange, PAL.green, PAL.red, PAL.gold, PAL.purple];
      for (let row = 0; row < 2; row++)
        for (let i = 0; i < 5; i++) {
          const x = 18 + i * 36;
          const y = row === 0 ? 20 : 90;
          box(c, x, y, 28, 40, 8, '#e8f6fb', 2.5);
          box(c, x + 3, y + 16, 22, 22, 6, cols[(i + row) % cols.length], 0);
          box(c, x + 4, y - 4, 20, 8, 3, PAL.woodDark, 2);
        }
    }, 150),
  cauldron: () =>
    art(250, 230, (c) => {
      // fire
      for (const [x, col] of [
        [90, PAL.red],
        [125, PAL.orange],
        [160, PAL.gold],
      ] as [number, string][]) {
        c.beginPath();
        c.moveTo(x - 20, 212);
        c.quadraticCurveTo(x - 18, 170, x, 150);
        c.quadraticCurveTo(x + 18, 170, x + 20, 212);
        c.closePath();
        paint(c, col, 3);
      }
      // legs
      for (const x of [50, 190]) box(c, x, 150, 14, 64, 4, '#4a4a55', 3);
      // pot
      c.beginPath();
      c.ellipse(125, 110, 104, 86, 0, 0.05 * Math.PI, 0.95 * Math.PI);
      c.lineTo(22, 72);
      c.lineTo(228, 72);
      c.closePath();
      paint(c, '#4f4b5c', L);
      ellipsePath(c, 125, 72, 106, 26);
      paint(c, '#5f5b6e', L);
      ellipsePath(c, 125, 72, 90, 18);
      paint(c, '#7cd6a4', 3);
      c.fillStyle = 'rgba(255,255,255,0.5)';
      for (const [x, y, r] of [
        [90, 68, 7],
        [140, 74, 5],
        [170, 66, 4],
        [110, 76, 3],
      ]) {
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
      // grandma's golden rim
      c.strokeStyle = PAL.gold;
      c.lineWidth = 5;
      c.beginPath();
      c.ellipse(125, 72, 100, 22, 0, 0.1, Math.PI - 0.1);
      c.stroke();
      sparkle(c, 200, 40, 10, '#fff7c2');
    }, 214),
  greathourglass: () => greatHourglass(0),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((n) => [`greathourglass-${n}`, () => greatHourglass(n)])),
    portalring: () =>
    art(260, 300, (c) => {
      box(c, 30, 262, 200, 32, 10, PAL.stone);
      ellipsePath(c, 130, 150, 110, 130);
      paint(c, PAL.stone, L);
      ellipsePath(c, 130, 150, 82, 102);
      paint(c, '#5b4a6b', L);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        circlePath(c, 130 + Math.cos(a) * 96, 150 + Math.sin(a) * 116, 6);
        paint(c, '#b9a8d8', 2);
      }
    }, 294),
  gearwall: () =>
    art(220, 160, (c) => {
      const gear = (x: number, y: number, r: number, col: string) => {
        c.beginPath();
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          const rr = i % 2 ? r : r * 0.8;
          c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        c.closePath();
        paint(c, col, 3);
        circlePath(c, x, y, r * 0.3);
        paint(c, '#fff4e0', 2.5);
      };
      gear(70, 80, 60, PAL.goldDark);
      gear(160, 60, 42, PAL.gold);
      gear(170, 130, 26, PAL.goldDark);
    }, 154),
  displaycase: () =>
    art(130, 190, (c) => {
      box(c, 20, 110, 90, 74, 8, '#e8dcc6');
      rrPath(c, 26, 20, 78, 96, 8);
      paint(c, 'rgba(220,242,250,0.75)', L);
      c.fillStyle = 'rgba(255,255,255,0.6)';
      c.beginPath();
      c.ellipse(46, 50, 6, 22, -0.2, 0, Math.PI * 2);
      c.fill();
    }, 184),
  pedestal: () =>
    art(110, 140, (c) => {
      box(c, 26, 40, 58, 90, 6, '#efe6d4');
      box(c, 16, 28, 78, 18, 6, '#e0d4bd');
      box(c, 16, 122, 78, 14, 6, '#e0d4bd');
    }, 134),
  fireplace: () =>
    art(230, 220, (c) => {
      box(c, 10, 30, 210, 184, 14, PAL.stone);
      box(c, 0, 16, 230, 28, 10, PAL.wood);
      rrPath(c, 50, 90, 130, 124, [60, 60, 0, 0]);
      paint(c, '#3d2f2a', L);
      for (const [x, col] of [
        [96, PAL.red],
        [116, PAL.orange],
        [134, PAL.gold],
      ] as [number, string][]) {
        c.beginPath();
        c.moveTo(x - 16, 206);
        c.quadraticCurveTo(x - 14, 170, x, 150);
        c.quadraticCurveTo(x + 14, 170, x + 16, 206);
        c.closePath();
        paint(c, col, 2.5);
      }
    }, 214),
  lampfloor: () =>
    art(80, 200, (c) => {
      box(c, 34, 60, 12, 130, 4, PAL.woodDark, 3);
      box(c, 16, 186, 48, 10, 4, PAL.woodDark, 3);
      c.beginPath();
      c.moveTo(14, 64);
      c.lineTo(26, 16);
      c.lineTo(54, 16);
      c.lineTo(66, 64);
      c.closePath();
      paint(c, PAL.lamp, L);
    }, 194),
  stairs: () =>
    art(200, 260, (c) => {
      for (let i = 0; i < 6; i++) box(c, 20 + i * 8, 30 + i * 36, 160 - i * 16, 40, 6, shade(PAL.stone, -i * 0.03));
    }, 254),
  rockingchair: () =>
    art(130, 150, (c) => {
      c.beginPath();
      c.arc(65, 110, 70, 0.25 * Math.PI, 0.75 * Math.PI);
      c.lineWidth = 7;
      c.strokeStyle = PAL.ink;
      c.stroke();
      c.lineWidth = 4;
      c.strokeStyle = PAL.woodDark;
      c.stroke();
      box(c, 30, 20, 70, 70, 12, PAL.wood);
      box(c, 24, 80, 82, 26, 8, PAL.woodLight);
    }, 146),
};
