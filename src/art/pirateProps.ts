import { PAL, shade } from './palette';
import { makeCanvas, rrPath, circlePath, ellipsePath, paint, OUTLINE, sparkle } from './draw';
import type { PropArt } from './props';

/** Props for the Golden Age of Piracy: the Sunny Marigold, Sandy Cove and Treasure Island. */
const L = OUTLINE;
const WOOD = '#b57a4e';
const WOOD_D = '#8a5a3a';

/** The ship's side below the deck: planks, a gold stripe and round portholes. */
export function shipHull(): PropArt {
  const W = 1010;
  const cv = makeCanvas(W, 150);
  const { ctx } = cv;
  ctx.beginPath();
  ctx.moveTo(6, 10);
  ctx.lineTo(W - 70, 10);
  ctx.quadraticCurveTo(W - 6, 20, W - 30, 90);
  ctx.quadraticCurveTo(W - 90, 140, W - 180, 140);
  ctx.lineTo(90, 140);
  ctx.quadraticCurveTo(20, 130, 6, 10);
  ctx.closePath();
  paint(ctx, WOOD, L);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = WOOD_D;
  ctx.lineWidth = 4;
  for (const y of [42, 74, 106]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(0, 20, W, 12);
  ctx.restore();
  for (let x = 120; x < W - 150; x += 150) {
    circlePath(ctx, x, 70, 17);
    paint(ctx, '#6fb3e0', 4);
    circlePath(ctx, x - 5, 65, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
  }
  // the ship's name
  ctx.font = '700 30px Fredoka, sans-serif';
  ctx.fillStyle = PAL.cream;
  ctx.textAlign = 'center';
  ctx.fillText('SUNNY MARIGOLD', W - 300, 128);
  return { cv, ox: 0.5, oy: 0.1 };
}

/** The mast with two big sails and a flag with a marigold flower. */
export function shipMast(): PropArt {
  const cv = makeCanvas(300, 520);
  const { ctx } = cv;
  rrPath(ctx, 140, 20, 20, 490, 8);
  paint(ctx, WOOD_D, L);
  const sail = (y: number, w: number, h: number) => {
    ctx.beginPath();
    ctx.moveTo(150 - w / 2, y);
    ctx.lineTo(150 + w / 2, y);
    ctx.quadraticCurveTo(150 + w / 2 + 20, y + h / 2, 150 + w / 2, y + h);
    ctx.lineTo(150 - w / 2, y + h);
    ctx.quadraticCurveTo(150 - w / 2 + 20, y + h / 2, 150 - w / 2, y);
    ctx.closePath();
    paint(ctx, '#fff4e0', L);
    ctx.strokeStyle = 'rgba(181,122,78,0.35)';
    ctx.lineWidth = 3;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(150 - w / 2 + (w * i) / 4, y + 6);
      ctx.lineTo(150 - w / 2 + (w * i) / 4 + 8, y + h - 6);
      ctx.stroke();
    }
  };
  sail(90, 260, 150);
  sail(270, 220, 130);
  // crow's nest
  rrPath(ctx, 118, 60, 64, 26, 6);
  paint(ctx, WOOD, L);
  // flag with a marigold
  ctx.beginPath();
  ctx.moveTo(160, 20);
  ctx.lineTo(236, 34);
  ctx.lineTo(160, 52);
  ctx.closePath();
  paint(ctx, '#e46a6a', 3);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    circlePath(ctx, 186 + Math.cos(a) * 7, 36 + Math.sin(a) * 7, 5);
    ctx.fillStyle = '#f29e4c';
    ctx.fill();
  }
  circlePath(ctx, 186, 36, 4);
  ctx.fillStyle = PAL.gold;
  ctx.fill();
  return { cv, ox: 0.5, oy: 505 / 520 };
}

export function shipWheel(): PropArt {
  const cv = makeCanvas(110, 130);
  const { ctx } = cv;
  rrPath(ctx, 44, 60, 22, 64, 5);
  paint(ctx, WOOD_D, L);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 11;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(55, 52);
    ctx.lineTo(55 + Math.cos(a) * 46, 52 + Math.sin(a) * 46);
    ctx.stroke();
  }
  ctx.strokeStyle = WOOD;
  ctx.lineWidth = 6;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(55, 52);
    ctx.lineTo(55 + Math.cos(a) * 44, 52 + Math.sin(a) * 44);
    ctx.stroke();
  }
  circlePath(ctx, 55, 52, 32);
  ctx.lineWidth = 12;
  ctx.strokeStyle = PAL.ink;
  ctx.stroke();
  ctx.lineWidth = 7;
  ctx.strokeStyle = WOOD;
  ctx.stroke();
  circlePath(ctx, 55, 52, 9);
  paint(ctx, PAL.gold, 3);
  return { cv, ox: 0.5, oy: 122 / 130 };
}

/** The galley stove with a bubbling pot (brews soup just like Grandma's cauldron). */
export function galleyStove(): PropArt {
  const cv = makeCanvas(130, 130);
  const { ctx } = cv;
  rrPath(ctx, 14, 60, 102, 62, 10);
  paint(ctx, '#c0564b', L);
  ctx.strokeStyle = '#9a4038';
  ctx.lineWidth = 3;
  for (const y of [80, 100]) {
    ctx.beginPath();
    ctx.moveTo(18, y);
    ctx.lineTo(112, y);
    ctx.stroke();
  }
  rrPath(ctx, 48, 96, 34, 22, 6);
  paint(ctx, '#f29e4c', 3);
  ctx.beginPath();
  ctx.moveTo(24, 38);
  ctx.quadraticCurveTo(30, 70, 65, 70);
  ctx.quadraticCurveTo(100, 70, 106, 38);
  ctx.closePath();
  paint(ctx, '#5d5569', L);
  ellipsePath(ctx, 65, 38, 42, 11);
  paint(ctx, '#d9784a', 3);
  for (const [x, y] of [
    [50, 36],
    [78, 40],
  ]) {
    circlePath(ctx, x, y, 5);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  return { cv, ox: 0.5, oy: 120 / 130 };
}

/** The captain's table, with a spread-out (torn) map and a candle. */
export function mapTable(): PropArt {
  const cv = makeCanvas(150, 110);
  const { ctx } = cv;
  for (const x of [26, 118]) {
    rrPath(ctx, x, 50, 10, 54, 3);
    paint(ctx, WOOD_D, 3);
  }
  rrPath(ctx, 8, 30, 134, 32, 8);
  paint(ctx, WOOD, L);
  ctx.save();
  ctx.translate(75, 38);
  ctx.rotate(-0.06);
  rrPath(ctx, -44, -20, 88, 30, 3);
  paint(ctx, '#f1dfb6', 3);
  ctx.strokeStyle = '#c0464b';
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.quadraticCurveTo(0, -12, 26, 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  rrPath(ctx, 120, 14, 10, 20, 3);
  paint(ctx, '#fff8ec', 2);
  ctx.fillStyle = '#f7c65a';
  ctx.beginPath();
  ctx.ellipse(125, 9, 4, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  return { cv, ox: 0.5, oy: 104 / 110 };
}

/** A square cargo hatch in the deck. */
export function cargoHatch(): PropArt {
  const cv = makeCanvas(110, 90);
  const { ctx } = cv;
  rrPath(ctx, 8, 8, 94, 74, 8);
  paint(ctx, WOOD_D, L);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 3;
  for (let x = 24; x < 100; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 14);
    ctx.lineTo(x, 76);
    ctx.stroke();
  }
  circlePath(ctx, 55, 45, 8);
  paint(ctx, PAL.gold, 3);
  return { cv, ox: 0.5, oy: 0.5 };
}

/** A shallow pan where seawater dries into salt. */
export function saltPan(): PropArt {
  const cv = makeCanvas(120, 70);
  const { ctx } = cv;
  ellipsePath(ctx, 60, 38, 54, 26);
  paint(ctx, '#cfc2b0', L);
  ellipsePath(ctx, 60, 38, 44, 18);
  ctx.fillStyle = '#a9e0ec';
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const x = 26 + ((i * 29) % 70);
    const y = 28 + ((i * 17) % 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, 6, 6);
  }
  sparkle(ctx, 88, 22, 6, '#ffffff');
  return { cv, ox: 0.5, oy: 0.6 };
}

/** A message in a bottle, bobbing at the edge of the sand. */
export function messageBottle(): PropArt {
  const cv = makeCanvas(90, 70);
  const { ctx } = cv;
  ellipsePath(ctx, 45, 56, 36, 8);
  ctx.fillStyle = 'rgba(108,196,216,0.6)';
  ctx.fill();
  ctx.save();
  ctx.translate(45, 40);
  ctx.rotate(-0.5);
  rrPath(ctx, -22, -10, 36, 20, 9);
  paint(ctx, 'rgba(159,224,192,0.85)', 3);
  rrPath(ctx, 12, -5, 12, 10, 3);
  paint(ctx, '#9fe0c0', 3);
  rrPath(ctx, 22, -4, 7, 8, 2);
  paint(ctx, WOOD, 2);
  rrPath(ctx, -14, -5, 20, 10, 2);
  paint(ctx, '#f1dfb6', 2);
  ctx.restore();
  return { cv, ox: 0.5, oy: 0.85 };
}

function barrel(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath();
  ctx.moveTo(x - 20, y - 26);
  ctx.quadraticCurveTo(x - 27, y, x - 20, y + 26);
  ctx.lineTo(x + 20, y + 26);
  ctx.quadraticCurveTo(x + 27, y, x + 20, y - 26);
  ctx.closePath();
  paint(ctx, WOOD, L);
  ctx.strokeStyle = '#6d6a74';
  ctx.lineWidth = 5;
  for (const dy of [-14, 14]) {
    ctx.beginPath();
    ctx.moveTo(x - 23, y + dy);
    ctx.lineTo(x + 23, y + dy);
    ctx.stroke();
  }
  ellipsePath(ctx, x, y - 26, 20, 6);
  paint(ctx, shade(WOOD, 0.15), 3);
}

/** A jumble of barrels (someone small might be stuck behind them...). */
export function barrelJam(): PropArt {
  const cv = makeCanvas(160, 120);
  const { ctx } = cv;
  barrel(ctx, 40, 80);
  barrel(ctx, 90, 84);
  barrel(ctx, 128, 78);
  barrel(ctx, 64, 38);
  barrel(ctx, 108, 40);
  return { cv, ox: 0.5, oy: 110 / 120 };
}

/** A little rowboat pulled up on the sand. */
export function rowboat(): PropArt {
  const cv = makeCanvas(170, 90);
  const { ctx } = cv;
  ctx.beginPath();
  ctx.moveTo(10, 30);
  ctx.lineTo(160, 30);
  ctx.quadraticCurveTo(150, 76, 110, 80);
  ctx.lineTo(50, 80);
  ctx.quadraticCurveTo(16, 74, 10, 30);
  ctx.closePath();
  paint(ctx, '#6f9fd8', L);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(18, 48);
  ctx.lineTo(154, 48);
  ctx.stroke();
  rrPath(ctx, 60, 22, 50, 12, 3);
  paint(ctx, WOOD, 3);
  ctx.strokeStyle = WOOD_D;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(40, 24);
  ctx.lineTo(4, 12);
  ctx.moveTo(130, 24);
  ctx.lineTo(166, 12);
  ctx.stroke();
  return { cv, ox: 0.5, oy: 82 / 90 };
}

function stoneDoorArt(open: boolean): PropArt {
  const cv = makeCanvas(220, 200);
  const { ctx } = cv;
  ctx.beginPath();
  ctx.moveTo(6, 196);
  ctx.quadraticCurveTo(0, 60, 110, 20);
  ctx.quadraticCurveTo(220, 60, 214, 196);
  ctx.closePath();
  paint(ctx, '#a79e93', L);
  // carved frame
  ctx.beginPath();
  ctx.moveTo(56, 196);
  ctx.lineTo(56, 96);
  ctx.quadraticCurveTo(110, 50, 164, 96);
  ctx.lineTo(164, 196);
  ctx.closePath();
  paint(ctx, open ? '#2a2436' : '#8f877c', L);
  if (!open) {
    // an anchor, a parrot feather and a shell carved into the door
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(110, 110);
    ctx.lineTo(110, 160);
    ctx.moveTo(92, 150);
    ctx.quadraticCurveTo(110, 176, 128, 150);
    ctx.moveTo(98, 120);
    ctx.lineTo(122, 120);
    ctx.stroke();
    circlePath(ctx, 110, 104, 6);
    ctx.stroke();
    ctx.font = '700 22px Fredoka, sans-serif';
    ctx.fillStyle = '#5d5569';
    ctx.textAlign = 'center';
    ctx.fillText('?', 82, 184);
    ctx.fillText('?', 138, 184);
  } else {
    // a warm glow inside
    const g = ctx.createRadialGradient(110, 170, 5, 110, 170, 60);
    g.addColorStop(0, 'rgba(247,198,90,0.8)');
    g.addColorStop(1, 'rgba(247,198,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(56, 100, 108, 96);
  }
  // vines
  for (const [x, y] of [
    [30, 110],
    [190, 120],
    [70, 40],
  ]) {
    circlePath(ctx, x, y, 12);
    paint(ctx, '#6fae55', 3);
  }
  return { cv, ox: 0.5, oy: 196 / 200 };
}
export const stoneDoorClosed = () => stoneDoorArt(false);
export const stoneDoorOpen = () => stoneDoorArt(true);

/** Coco's fruit stall: coconuts, peppers and a striped awning. */
export function fruitStall(): PropArt {
  const cv = makeCanvas(210, 190);
  const { ctx } = cv;
  rrPath(ctx, 16, 104, 178, 74, 10);
  paint(ctx, PAL.woodLight, L);
  for (const x of [26, 176]) {
    rrPath(ctx, x, 36, 10, 76, 3);
    paint(ctx, WOOD_D, 3);
  }
  // striped awning
  ctx.beginPath();
  ctx.moveTo(10, 44);
  ctx.lineTo(200, 44);
  ctx.lineTo(186, 16);
  ctx.lineTo(24, 16);
  ctx.closePath();
  paint(ctx, '#7cc47f', L);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#fff4e0';
  for (let x = 24; x < 200; x += 36) ctx.fillRect(x, 10, 18, 40);
  ctx.restore();
  // fruit
  for (const [x, c] of [
    [52, '#8a5a3a'],
    [80, '#8a5a3a'],
    [66, '#8a5a3a'],
  ] as const) {
    circlePath(ctx, x, 100 - (x === 66 ? 14 : 0), 13);
    paint(ctx, c, 3);
  }
  for (const x of [120, 138, 156]) {
    ctx.beginPath();
    ctx.ellipse(x, 98, 6, 12, 0.3, 0, Math.PI * 2);
    paint(ctx, '#e46a6a', 3);
  }
  return { cv, ox: 0.5, oy: 178 / 190 };
}

/** A flickering wall torch (treasure cave). */
export function wallTorch(): PropArt {
  const cv = makeCanvas(50, 100);
  const { ctx } = cv;
  rrPath(ctx, 20, 44, 10, 50, 3);
  paint(ctx, WOOD_D, 3);
  ctx.save();
  ctx.shadowColor = '#f7c65a';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(25, 6);
  ctx.quadraticCurveTo(42, 30, 25, 46);
  ctx.quadraticCurveTo(8, 30, 25, 6);
  ctx.fillStyle = '#f29e4c';
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(25, 20);
  ctx.quadraticCurveTo(33, 32, 25, 42);
  ctx.quadraticCurveTo(17, 32, 25, 20);
  ctx.fillStyle = '#f7c65a';
  ctx.fill();
  return { cv, ox: 0.5, oy: 0.95 };
}
