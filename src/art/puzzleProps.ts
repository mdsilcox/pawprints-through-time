import { PAL, shade } from './palette';
import { makeCanvas, rrPath, circlePath, ellipsePath, paint, OUTLINE, sparkle } from './draw';
import type { PropArt } from './props';

/** Props that mark where a brain-builder puzzle lives in Tockwood. */
const L = OUTLINE;

/** The Riddle Stone: an old standing stone with a glowing question mark. */
export function riddleStone(): PropArt {
  const cv = makeCanvas(120, 150);
  const { ctx } = cv;
  ellipsePath(ctx, 60, 138, 46, 10);
  ctx.fillStyle = 'rgba(74,59,53,0.18)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(22, 136);
  ctx.quadraticCurveTo(14, 60, 40, 22);
  ctx.quadraticCurveTo(62, 2, 84, 20);
  ctx.quadraticCurveTo(108, 58, 98, 136);
  ctx.closePath();
  paint(ctx, '#b9b2c8', L);
  ctx.beginPath();
  ctx.moveTo(30, 130);
  ctx.quadraticCurveTo(26, 70, 44, 34);
  ctx.quadraticCurveTo(52, 26, 58, 26);
  ctx.quadraticCurveTo(40, 70, 44, 130);
  ctx.closePath();
  ctx.fillStyle = shade('#b9b2c8', 0.18);
  ctx.fill();
  // moss
  for (const [x, y, r] of [
    [30, 128, 9],
    [46, 132, 7],
    [88, 126, 8],
  ] as const) {
    circlePath(ctx, x, y, r);
    paint(ctx, '#7cc47f', 2.5);
  }
  // the glowing question mark
  ctx.save();
  ctx.shadowColor = '#fff3a6';
  ctx.shadowBlur = 14;
  ctx.font = '700 58px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#a58bd6';
  ctx.fillText('?', 62, 72);
  ctx.restore();
  ctx.font = '700 58px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = PAL.ink;
  ctx.strokeText('?', 62, 72);
  // little runes
  ctx.strokeStyle = shade('#b9b2c8', -0.3);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const [x, y] of [
    [44, 108],
    [62, 112],
    [80, 108],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 4);
    ctx.lineTo(x, y + 4);
    ctx.lineTo(x + 5, y - 4);
    ctx.stroke();
  }
  sparkle(ctx, 92, 36, 7, '#fff3a6');
  return { cv, ox: 0.5, oy: 136 / 150 };
}

function crate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, veg: string) {
  rrPath(ctx, x, y, w, h, 6);
  paint(ctx, '#c98d55', L);
  ctx.strokeStyle = '#a06a3c';
  ctx.lineWidth = 3;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 5, y + (h * i) / 3);
    ctx.lineTo(x + w - 5, y + (h * i) / 3);
    ctx.stroke();
  }
  // veggies peeking out of the top
  for (let i = 0; i < 3; i++) {
    circlePath(ctx, x + w * (0.25 + i * 0.25), y - 2, 7);
    paint(ctx, veg, 2.5);
  }
}

/** A tumble of vegetable crates with Juniper's wheelbarrow stuck behind them. */
export function crateJam(): PropArt {
  const cv = makeCanvas(170, 130);
  const { ctx } = cv;
  ellipsePath(ctx, 85, 118, 76, 10);
  ctx.fillStyle = 'rgba(74,59,53,0.18)';
  ctx.fill();
  // wheelbarrow behind
  ctx.beginPath();
  ctx.moveTo(98, 58);
  ctx.lineTo(160, 58);
  ctx.lineTo(150, 84);
  ctx.lineTo(106, 84);
  ctx.closePath();
  paint(ctx, '#7cc47f', L);
  circlePath(ctx, 128, 96, 12);
  paint(ctx, PAL.woodDark, L);
  crate(ctx, 10, 62, 60, 50, '#f29e4c');
  crate(ctx, 64, 74, 56, 40, '#e0566b');
  crate(ctx, 26, 20, 54, 42, '#8fcf6f');
  return { cv, ox: 0.5, oy: 114 / 130 };
}

/** Finnegan's toy sailboat waiting in a little tub of water. */
export function toyBoat(): PropArt {
  const cv = makeCanvas(110, 120);
  const { ctx } = cv;
  rrPath(ctx, 8, 70, 94, 40, 16);
  paint(ctx, PAL.wood, L);
  ellipsePath(ctx, 55, 76, 40, 9);
  paint(ctx, '#6cc4d8', 2.5);
  // hull
  ctx.beginPath();
  ctx.moveTo(30, 66);
  ctx.lineTo(80, 66);
  ctx.quadraticCurveTo(74, 82, 56, 82);
  ctx.quadraticCurveTo(38, 82, 30, 66);
  ctx.closePath();
  paint(ctx, '#e46a6a', 3);
  // mast + sail
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(56, 66);
  ctx.lineTo(56, 18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(58, 20);
  ctx.lineTo(84, 58);
  ctx.lineTo(58, 60);
  ctx.closePath();
  paint(ctx, PAL.cream, 3);
  // flag
  ctx.beginPath();
  ctx.moveTo(56, 18);
  ctx.lineTo(44, 22);
  ctx.lineTo(56, 26);
  ctx.closePath();
  paint(ctx, PAL.gold, 2.5);
  return { cv, ox: 0.5, oy: 108 / 120 };
}

/** Rocco's toolbox, locked with a dial of gears. */
export function gearLockbox(): PropArt {
  const cv = makeCanvas(100, 90);
  const { ctx } = cv;
  ellipsePath(ctx, 50, 82, 42, 7);
  ctx.fillStyle = 'rgba(74,59,53,0.18)';
  ctx.fill();
  rrPath(ctx, 34, 12, 32, 16, 6);
  paint(ctx, PAL.woodDark, L);
  rrPath(ctx, 10, 24, 80, 54, 10);
  paint(ctx, '#6f9fd8', L);
  rrPath(ctx, 10, 24, 80, 14, 8);
  paint(ctx, shade('#6f9fd8', 0.15), 3);
  // gear dials
  for (const [x, c] of [
    [32, '#e46a6a'],
    [50, '#f7c65a'],
    [68, '#7cc47f'],
  ] as const) {
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = i % 2 ? 7 : 9;
      ctx.lineTo(x + Math.cos(a) * r, 58 + Math.sin(a) * r);
    }
    ctx.closePath();
    paint(ctx, c, 2.5);
  }
  return { cv, ox: 0.5, oy: 82 / 90 };
}

/** Grandma Hopkins' knitting basket, full of yarn. */
export function knittingBasket(): PropArt {
  const cv = makeCanvas(90, 76);
  const { ctx } = cv;
  for (const [x, y, c] of [
    [30, 30, '#e46a6a'],
    [52, 26, '#6fb3e0'],
    [44, 40, '#f7c65a'],
  ] as const) {
    circlePath(ctx, x, y, 13);
    paint(ctx, c, 2.5);
    ctx.strokeStyle = shade(c, -0.2);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0.3, 2.4);
    ctx.stroke();
  }
  ctx.strokeStyle = PAL.woodDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(60, 8);
  ctx.lineTo(40, 42);
  ctx.moveTo(70, 12);
  ctx.lineTo(48, 44);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(10, 40);
  ctx.lineTo(80, 40);
  ctx.lineTo(72, 70);
  ctx.lineTo(18, 70);
  ctx.closePath();
  paint(ctx, '#d9a86c', L);
  ctx.strokeStyle = '#b8864e';
  ctx.lineWidth = 2.5;
  for (const y of [50, 60]) {
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.lineTo(76, y);
    ctx.stroke();
  }
  return { cv, ox: 0.5, oy: 70 / 76 };
}

/** The museum's old mosaic floor, with a few tiles missing. */
export function mosaicFloor(): PropArt {
  const cv = makeCanvas(200, 120);
  const { ctx } = cv;
  rrPath(ctx, 6, 6, 188, 108, 12);
  paint(ctx, '#efe3cf', L);
  const cols = ['#6fb3e0', '#f7c65a', '#e46a6a', '#7cc47f'];
  let k = 0;
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 7; x++) {
      const missing = (x === 5 && y === 1) || (x === 2 && y === 3) || (x === 6 && y === 2);
      rrPath(ctx, 16 + x * 25, 14 + y * 24, 20, 19, 4);
      if (missing) {
        ctx.fillStyle = 'rgba(74,59,53,0.12)';
        ctx.fill();
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = PAL.ink;
        ctx.stroke();
        ctx.setLineDash([]);
      } else paint(ctx, cols[(k++ + y) % cols.length], 2);
    }
  return { cv, ox: 0.5, oy: 0.5 };
}

/** A patch of meadow clover (pick a few leaves once a day). */
export function cloverPatch(): PropArt {
  const cv = makeCanvas(90, 60);
  const { ctx } = cv;
  const leaf = (x: number, y: number, r: number) => {
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
      circlePath(ctx, x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, r * 0.62);
      paint(ctx, '#6fbe5a', 2.5);
    }
    circlePath(ctx, x, y, r * 0.25);
    ctx.fillStyle = '#4f9a45';
    ctx.fill();
  };
  ellipsePath(ctx, 45, 50, 38, 8);
  ctx.fillStyle = 'rgba(74,59,53,0.15)';
  ctx.fill();
  leaf(24, 34, 11);
  leaf(46, 26, 13);
  leaf(66, 36, 11);
  leaf(40, 44, 9);
  // a little white clover flower
  circlePath(ctx, 58, 18, 6);
  paint(ctx, '#fff8ec', 2);
  return { cv, ox: 0.5, oy: 52 / 60 };
}

/** A mossy cave mouth in the woods (the Glimmer Grotto). */
export function caveMouth(): PropArt {
  const cv = makeCanvas(230, 170);
  const { ctx } = cv;
  ctx.beginPath();
  ctx.moveTo(10, 160);
  ctx.quadraticCurveTo(0, 70, 70, 34);
  ctx.quadraticCurveTo(118, 6, 168, 32);
  ctx.quadraticCurveTo(230, 66, 220, 160);
  ctx.closePath();
  paint(ctx, '#9a8f86', L);
  ctx.beginPath();
  ctx.moveTo(30, 150);
  ctx.quadraticCurveTo(26, 90, 70, 58);
  ctx.quadraticCurveTo(80, 52, 88, 52);
  ctx.quadraticCurveTo(52, 96, 56, 150);
  ctx.closePath();
  ctx.fillStyle = shade('#9a8f86', 0.15);
  ctx.fill();
  // the dark opening
  ctx.beginPath();
  ctx.moveTo(72, 160);
  ctx.quadraticCurveTo(70, 88, 115, 78);
  ctx.quadraticCurveTo(160, 88, 158, 160);
  ctx.closePath();
  paint(ctx, '#2a2436', L);
  // glowing crystals peeking out
  for (const [x, y, c] of [
    [96, 142, '#b8f28a'],
    [132, 146, '#a8d8ff'],
    [118, 134, '#e8b5ff'],
  ] as const) {
    ctx.save();
    ctx.shadowColor = c;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x + 6, y);
    ctx.lineTo(x - 6, y);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ctx.restore();
  }
  // moss & vines
  for (const [x, y, r] of [
    [60, 40, 14],
    [150, 30, 12],
    [196, 70, 13],
    [30, 90, 11],
  ] as const) {
    circlePath(ctx, x, y, r);
    paint(ctx, '#6fae55', 3);
  }
  return { cv, ox: 0.5, oy: 158 / 170 };
}

/** A tall rock with a bird's nest on top — too high to climb (unless you hop like a bunny). */
export function lookoutRock(): PropArt {
  const cv = makeCanvas(170, 230);
  const { ctx } = cv;
  ellipsePath(ctx, 85, 216, 70, 12);
  ctx.fillStyle = 'rgba(74,59,53,0.2)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(20, 214);
  ctx.lineTo(28, 90);
  ctx.quadraticCurveTo(40, 52, 84, 48);
  ctx.quadraticCurveTo(132, 50, 144, 92);
  ctx.lineTo(152, 214);
  ctx.closePath();
  paint(ctx, '#b3a79a', L);
  ctx.beginPath();
  ctx.moveTo(34, 206);
  ctx.lineTo(40, 96);
  ctx.quadraticCurveTo(50, 70, 70, 64);
  ctx.lineTo(62, 206);
  ctx.closePath();
  ctx.fillStyle = shade('#b3a79a', 0.15);
  ctx.fill();
  ctx.strokeStyle = shade('#b3a79a', -0.25);
  ctx.lineWidth = 3;
  for (const [x1, y1, x2, y2] of [
    [90, 110, 120, 140],
    [70, 160, 100, 150],
    [110, 180, 130, 196],
  ])
    (ctx.beginPath(), ctx.moveTo(x1, y1), ctx.lineTo(x2, y2), ctx.stroke());
  // the nest on top
  ellipsePath(ctx, 86, 50, 36, 13);
  paint(ctx, '#b57a4e', 3);
  ctx.strokeStyle = '#8a5a3a';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(86, 48, 22 + i * 2, Math.PI * 0.1 + i * 0.3, Math.PI * 0.9 + i * 0.2);
    ctx.stroke();
  }
  sparkle(ctx, 104, 30, 8, '#fff3a6');
  return { cv, ox: 0.5, oy: 214 / 230 };
}

function chestArt(open: boolean): PropArt {
  const cv = makeCanvas(110, 100);
  const { ctx } = cv;
  ellipsePath(ctx, 55, 90, 46, 8);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fill();
  rrPath(ctx, 12, 44, 86, 44, 8);
  paint(ctx, '#b57a4e', L);
  if (open) {
    ctx.save();
    ctx.shadowColor = '#fff3a6';
    ctx.shadowBlur = 16;
    ellipsePath(ctx, 55, 46, 36, 8);
    paint(ctx, '#f7c65a', 3);
    ctx.restore();
    rrPath(ctx, 12, 8, 86, 30, 10);
    paint(ctx, '#c98d55', L);
  } else {
    rrPath(ctx, 12, 22, 86, 30, 12);
    paint(ctx, '#c98d55', L);
  }
  for (const x of [26, 84]) {
    rrPath(ctx, x - 5, open ? 44 : 22, 10, open ? 44 : 66, 3);
    paint(ctx, PAL.gold, 3);
  }
  rrPath(ctx, 48, open ? 50 : 42, 14, 14, 3);
  paint(ctx, PAL.gold, 3);
  return { cv, ox: 0.5, oy: 90 / 100 };
}
export const chestClosed = () => chestArt(false);
export const chestOpen = () => chestArt(true);
