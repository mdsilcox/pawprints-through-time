import { PAL, shade } from './palette';
import { makeCanvas, rrPath, circlePath, ellipsePath, paint, softShade, OUTLINE, rng, sparkle, type Cv } from './draw';
import { crateJam, gearLockbox, knittingBasket, mosaicFloor, riddleStone, toyBoat, cloverPatch, caveMouth, lookoutRock, chestClosed, chestOpen } from './puzzleProps';
import { FIFTIES_PROPS } from './fiftiesProps';
import { barrelJam, cargoHatch, fruitStall, galleyStove, mapTable, messageBottle, rowboat, saltPan, shipHull, shipMast, shipWheel, stoneDoorClosed, stoneDoorOpen, wallTorch, washingLine, crewSign } from './pirateProps';

/**
 * Props and buildings. Each drawer returns a canvas plus its anchor (the point that sits on the
 * ground at the object's map position), expressed as a fraction of the canvas size.
 */
export interface PropArt {
  cv: Cv;
  ox: number;
  oy: number;
}

const L = OUTLINE;

function canopy(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string, seed: number) {
  const rand = rng(seed);
  const blobs: [number, number, number][] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    blobs.push([cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.45, r * (0.48 + rand() * 0.12)]);
  }
  blobs.push([cx, cy, r * 0.6]);
  // outline pass
  ctx.fillStyle = PAL.ink;
  for (const [x, y, rr] of blobs) {
    ctx.beginPath();
    ctx.arc(x, y, rr + L, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = shade(col, -0.18);
  for (const [x, y, rr] of blobs) {
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = col;
  for (const [x, y, rr] of blobs) {
    ctx.beginPath();
    ctx.arc(x - rr * 0.12, y - rr * 0.14, rr * 0.86, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = shade(col, 0.28);
  ctx.globalAlpha = 0.7;
  for (const [x, y, rr] of blobs.slice(3, 6)) {
    ctx.beginPath();
    ctx.ellipse(x - rr * 0.3, y - rr * 0.35, rr * 0.35, rr * 0.22, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function treeRound(seed = 1, fruit = false): PropArt {
  const cv = makeCanvas(180, 230);
  const { ctx } = cv;
  // trunk
  ctx.beginPath();
  ctx.moveTo(78, 214);
  ctx.quadraticCurveTo(82, 170, 80, 130);
  ctx.lineTo(100, 130);
  ctx.quadraticCurveTo(98, 170, 104, 214);
  ctx.quadraticCurveTo(91, 220, 78, 214);
  paint(ctx, PAL.wood, L);
  canopy(ctx, 90, 92, 78, fruit ? '#86c46a' : PAL.leaf, seed);
  if (fruit) {
    const r = rng(seed + 9);
    for (let i = 0; i < 7; i++) {
      const x = 45 + r() * 90;
      const y = 60 + r() * 70;
      circlePath(ctx, x, y, 7);
      paint(ctx, i % 3 === 0 ? PAL.orange : PAL.red, 2.5);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return { cv, ox: 0.5, oy: 214 / 230 };
}

export function treePine(seed = 1): PropArt {
  const cv = makeCanvas(150, 250);
  const { ctx } = cv;
  rrPath(ctx, 66, 190, 18, 44, 5);
  paint(ctx, PAL.woodDark, L);
  const tiers = [
    [75, 30, 40, 70],
    [75, 70, 55, 110],
    [75, 110, 68, 150],
    [75, 150, 72, 196],
  ];
  const col = shade(PAL.leafDark, 0.05 + (seed % 3) * 0.04);
  for (const [cx, top, hw, bottom] of tiers) {
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.quadraticCurveTo(cx + hw * 0.4, top + (bottom - top) * 0.5, cx + hw, bottom);
    ctx.quadraticCurveTo(cx, bottom + 12, cx - hw, bottom);
    ctx.quadraticCurveTo(cx - hw * 0.4, top + (bottom - top) * 0.5, cx, top);
    ctx.closePath();
    paint(ctx, col, L);
    ctx.fillStyle = shade(col, 0.25);
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.ellipse(cx - hw * 0.35, top + (bottom - top) * 0.6, hw * 0.18, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  return { cv, ox: 0.5, oy: 234 / 250 };
}

export function treePalm(): PropArt {
  const cv = makeCanvas(220, 270);
  const { ctx } = cv;
  // curved trunk with rings
  ctx.beginPath();
  ctx.moveTo(100, 258);
  ctx.quadraticCurveTo(96, 170, 120, 80);
  ctx.lineTo(136, 84);
  ctx.quadraticCurveTo(114, 170, 122, 258);
  ctx.closePath();
  paint(ctx, '#c99a62', L);
  ctx.strokeStyle = shade('#c99a62', -0.3);
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const t = i / 8;
    const y = 250 - t * 165;
    const x = 104 + t * 22;
    ctx.beginPath();
    ctx.moveTo(x - 2, y);
    ctx.lineTo(x + 16, y - 3);
    ctx.stroke();
  }
  // fronds
  const fronds = [
    [-1.0, 90],
    [-0.4, 95],
    [0.3, 95],
    [0.9, 88],
    [2.3, 80],
    [2.9, 85],
  ];
  for (const [a, len] of fronds) {
    const bx = 128;
    const by = 80;
    const ex = bx + Math.cos(a - Math.PI / 2 + 0.2) * len * (a > 1.5 ? -1 : 1) * (a > 1.5 ? 1 : 1);
    const ey = by + Math.sin(a) * 20 + 30;
    const tx = bx + Math.cos(a) * len;
    const ty = by + Math.abs(Math.sin(a)) * 30 + 20;
    void ex;
    void ey;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo((bx + tx) / 2, by - 40, tx, ty);
    ctx.quadraticCurveTo((bx + tx) / 2, by - 10, bx, by + 6);
    ctx.closePath();
    paint(ctx, PAL.leaf, L);
  }
  // coconuts
  for (const [x, y] of [
    [120, 92],
    [136, 94],
    [128, 102],
  ]) {
    circlePath(ctx, x, y, 9);
    paint(ctx, '#8a5a3a', 3);
  }
  return { cv, ox: 111 / 220, oy: 258 / 270 };
}

export function bush(seed = 3): PropArt {
  const cv = makeCanvas(120, 90);
  const { ctx } = cv;
  canopy(ctx, 60, 50, 38, shade(PAL.leaf, 0.08), seed);
  const r = rng(seed);
  for (let i = 0; i < 4; i++) {
    circlePath(ctx, 34 + r() * 52, 34 + r() * 30, 5);
    paint(ctx, [PAL.pink, '#ffffff', PAL.gold][i % 3], 2);
  }
  return { cv, ox: 0.5, oy: 84 / 90 };
}

export function rock(): PropArt {
  const cv = makeCanvas(100, 76);
  const { ctx } = cv;
  ctx.beginPath();
  ctx.moveTo(12, 66);
  ctx.quadraticCurveTo(6, 30, 38, 18);
  ctx.quadraticCurveTo(60, 6, 80, 26);
  ctx.quadraticCurveTo(98, 44, 88, 66);
  ctx.quadraticCurveTo(50, 74, 12, 66);
  ctx.closePath();
  ctx.fillStyle = PAL.stone;
  ctx.fill();
  softShade(ctx, { x: 6, y: 10, w: 90, h: 60 }, { darkAlpha: 0.25 });
  ctx.beginPath();
  ctx.moveTo(12, 66);
  ctx.quadraticCurveTo(6, 30, 38, 18);
  ctx.quadraticCurveTo(60, 6, 80, 26);
  ctx.quadraticCurveTo(98, 44, 88, 66);
  ctx.quadraticCurveTo(50, 74, 12, 66);
  ctx.closePath();
  paint(ctx, 'rgba(0,0,0,0)', L);
  return { cv, ox: 0.5, oy: 68 / 76 };
}

export function lamp(): PropArt {
  const cv = makeCanvas(60, 200);
  const { ctx } = cv;
  rrPath(ctx, 24, 60, 12, 132, 5);
  paint(ctx, '#5b6b7a', L);
  rrPath(ctx, 16, 182, 28, 12, 5);
  paint(ctx, '#5b6b7a', L);
  // lantern
  rrPath(ctx, 12, 20, 36, 44, 8);
  paint(ctx, PAL.lamp, L);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, 22);
  ctx.lineTo(30, 62);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, 22);
  ctx.lineTo(30, 4);
  ctx.lineTo(52, 22);
  ctx.closePath();
  paint(ctx, '#5b6b7a', L);
  return { cv, ox: 0.5, oy: 192 / 200 };
}

/** Tockwood's round wooden dance floor in the plaza, with a painted star (a floor-level prop). */
export function danceFloor(): PropArt {
  const cv = makeCanvas(280, 150);
  const { ctx } = cv;
  ctx.beginPath();
  ctx.ellipse(140, 75, 132, 66, 0, 0, Math.PI * 2);
  paint(ctx, '#d49a6a', OUTLINE);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(140, 75, 128, 62, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = '#b57a4e';
  ctx.lineWidth = 3;
  for (let x = 20; x < 280; x += 26) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 150);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(140, 75, 104, 50, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#fff4e0';
  ctx.lineWidth = 5;
  ctx.setLineDash([10, 10]);
  ctx.stroke();
  ctx.setLineDash([]);
  // a painted star in the middle
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 16 : 36;
    ctx.lineTo(140 + Math.cos(a) * r * 1.3, 75 + Math.sin(a) * r * 0.62);
  }
  ctx.closePath();
  paint(ctx, PAL.gold, 3);
  return { cv, ox: 0.5, oy: 0.5 };
}

export function bench(): PropArt {
  const cv = makeCanvas(160, 90);
  const { ctx } = cv;
  for (const x of [22, 126]) {
    rrPath(ctx, x, 44, 12, 38, 3);
    paint(ctx, '#5b6b7a', 3);
  }
  rrPath(ctx, 10, 12, 140, 18, 6);
  paint(ctx, PAL.wood, L);
  rrPath(ctx, 6, 40, 148, 16, 6);
  paint(ctx, PAL.woodLight, L);
  return { cv, ox: 0.5, oy: 82 / 90 };
}

export function flowerbed(seed = 5): PropArt {
  const cv = makeCanvas(190, 90);
  const { ctx } = cv;
  rrPath(ctx, 8, 40, 174, 42, 14);
  paint(ctx, PAL.woodLight, L);
  rrPath(ctx, 18, 34, 154, 20, 10);
  paint(ctx, '#7a5a3c', 3);
  const r = rng(seed);
  const cols = [PAL.pink, PAL.gold, PAL.red, '#ffffff', PAL.purple];
  for (let i = 0; i < 11; i++) {
    const x = 24 + i * 14 + r() * 4;
    const y = 30 - r() * 14;
    ctx.strokeStyle = PAL.leafDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 44);
    ctx.lineTo(x, y);
    ctx.stroke();
    const c = cols[i % cols.length];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      circlePath(ctx, x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4.5);
      paint(ctx, c, 1.5);
    }
    circlePath(ctx, x, y, 3.5);
    paint(ctx, PAL.gold, 1.5);
  }
  return { cv, ox: 0.5, oy: 82 / 90 };
}

export function signpost(): PropArt {
  const cv = makeCanvas(96, 120);
  const { ctx } = cv;
  rrPath(ctx, 42, 40, 12, 74, 4);
  paint(ctx, PAL.woodDark, L);
  rrPath(ctx, 8, 14, 80, 40, 8);
  paint(ctx, PAL.woodLight, L);
  ctx.strokeStyle = PAL.wood;
  ctx.lineWidth = 4;
  for (const y of [26, 38]) {
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(76, y);
    ctx.stroke();
  }
  return { cv, ox: 0.5, oy: 114 / 120 };
}

export function stall(kind: 'clocks' | 'garden'): PropArt {
  const cv = makeCanvas(210, 190);
  const { ctx } = cv;
  // counter
  rrPath(ctx, 16, 104, 178, 74, 10);
  paint(ctx, PAL.woodLight, L);
  ctx.strokeStyle = PAL.wood;
  ctx.lineWidth = 4;
  for (const x of [60, 105, 150]) {
    ctx.beginPath();
    ctx.moveTo(x, 110);
    ctx.lineTo(x, 172);
    ctx.stroke();
  }
  // posts
  for (const x of [24, 178]) {
    rrPath(ctx, x, 30, 10, 80, 3);
    paint(ctx, PAL.woodDark, 3);
  }
  // striped awning
  const col = kind === 'clocks' ? PAL.roofBlue : PAL.green;
  ctx.beginPath();
  ctx.moveTo(8, 50);
  ctx.lineTo(28, 16);
  ctx.lineTo(182, 16);
  ctx.lineTo(202, 50);
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#fff8ec';
  for (let x = 0; x < 220; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x + 8, 50);
    ctx.lineTo(x + 28, 16);
    ctx.lineTo(x + 48, 16);
    ctx.lineTo(x + 28, 50);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(8, 50);
  ctx.lineTo(28, 16);
  ctx.lineTo(182, 16);
  ctx.lineTo(202, 50);
  ctx.closePath();
  paint(ctx, 'rgba(0,0,0,0)', L);
  // scalloped edge
  for (let x = 8; x < 202; x += 24) {
    ctx.beginPath();
    ctx.arc(x + 12, 50, 12, 0, Math.PI);
    paint(ctx, col, 3);
  }
  if (kind === 'clocks') {
    for (const [x, y, r] of [
      [50, 92, 14],
      [100, 88, 18],
      [152, 92, 13],
    ]) {
      circlePath(ctx, x, y, r);
      paint(ctx, PAL.cream, 3);
      ctx.strokeStyle = PAL.ink;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - r * 0.5, y - r * 0.3);
      ctx.moveTo(x, y);
      ctx.lineTo(x + r * 0.2, y - r * 0.7);
      ctx.stroke();
    }
  } else {
    for (const [x, c] of [
      [48, PAL.red],
      [96, PAL.orange],
      [146, PAL.purple],
    ] as [number, string][]) {
      rrPath(ctx, x - 18, 84, 36, 22, 5);
      paint(ctx, '#c7825a', 3);
      for (let k = 0; k < 3; k++) {
        circlePath(ctx, x - 9 + k * 9, 80, 7);
        paint(ctx, c, 2);
      }
    }
  }
  return { cv, ox: 0.5, oy: 178 / 190 };
}

export function fountain(): PropArt {
  const cv = makeCanvas(230, 190);
  const { ctx } = cv;
  ellipsePath(ctx, 115, 140, 104, 40);
  paint(ctx, PAL.stone, L);
  ellipsePath(ctx, 115, 132, 88, 30);
  paint(ctx, PAL.water, 3);
  ctx.fillStyle = PAL.foam;
  ctx.globalAlpha = 0.7;
  ellipsePath(ctx, 95, 126, 30, 8);
  ctx.fill();
  ctx.globalAlpha = 1;
  rrPath(ctx, 103, 64, 24, 70, 8);
  paint(ctx, PAL.stone, L);
  ellipsePath(ctx, 115, 66, 40, 14);
  paint(ctx, PAL.stone, L);
  ellipsePath(ctx, 115, 62, 30, 8);
  paint(ctx, PAL.water, 3);
  // little golden hourglass statue
  ctx.beginPath();
  ctx.moveTo(104, 24);
  ctx.lineTo(126, 24);
  ctx.lineTo(118, 40);
  ctx.lineTo(126, 56);
  ctx.lineTo(104, 56);
  ctx.lineTo(112, 40);
  ctx.closePath();
  paint(ctx, PAL.gold, 3);
  sparkle(ctx, 136, 26, 7);
  return { cv, ox: 0.5, oy: 176 / 190 };
}

export function gardenPlot(): PropArt {
  const cv = makeCanvas(110, 90);
  const { ctx } = cv;
  rrPath(ctx, 6, 14, 98, 70, 12);
  paint(ctx, '#9a6a45', L);
  ctx.strokeStyle = '#7d5436';
  ctx.lineWidth = 4;
  for (const y of [32, 50, 68]) {
    ctx.beginPath();
    ctx.moveTo(18, y);
    ctx.lineTo(92, y);
    ctx.stroke();
  }
  return { cv, ox: 0.5, oy: 80 / 90 };
}

export function fenceH(): PropArt {
  const cv = makeCanvas(250, 70);
  const { ctx } = cv;
  rrPath(ctx, 6, 26, 238, 12, 4);
  paint(ctx, PAL.woodLight, 3);
  for (let x = 12; x < 240; x += 38) {
    ctx.beginPath();
    ctx.moveTo(x, 64);
    ctx.lineTo(x, 14);
    ctx.lineTo(x + 7, 6);
    ctx.lineTo(x + 14, 14);
    ctx.lineTo(x + 14, 64);
    ctx.closePath();
    paint(ctx, PAL.cream, 3);
  }
  return { cv, ox: 0.5, oy: 64 / 70 };
}

export function burrowHole(): PropArt {
  const cv = makeCanvas(110, 64);
  const { ctx } = cv;
  ellipsePath(ctx, 55, 40, 48, 20);
  paint(ctx, '#a97c55', L);
  ellipsePath(ctx, 55, 38, 24, 11);
  paint(ctx, '#4a3326', 3);
  return { cv, ox: 0.5, oy: 56 / 64 };
}

// ------------------------------------------------------------------ buildings
function windowPane(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, round = false, lit = false) {
  if (round) {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + w / 2);
    ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  } else rrPath(ctx, x, y, w, h, 6);
  paint(ctx, lit ? PAL.lamp : '#9fd0e3', L);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.6);
  ctx.lineTo(x + w * 0.6, y);
  ctx.lineTo(x + w * 0.8, y);
  ctx.lineTo(x, y + h * 0.85);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 2);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2 + (round ? w / 4 : 0));
  ctx.lineTo(x + w, y + h / 2 + (round ? w / 4 : 0));
  ctx.stroke();
}

function door(ctx: CanvasRenderingContext2D, cx: number, bottom: number, w: number, h: number, col: string) {
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, bottom);
  ctx.lineTo(cx - w / 2, bottom - h + w / 2);
  ctx.arc(cx, bottom - h + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(cx + w / 2, bottom);
  ctx.closePath();
  paint(ctx, col, L);
  circlePath(ctx, cx + w * 0.28, bottom - h * 0.42, 4.5);
  paint(ctx, PAL.gold, 2);
  // step
  rrPath(ctx, cx - w / 2 - 10, bottom - 6, w + 20, 10, 4);
  paint(ctx, PAL.stone, 3);
}

function roofShingles(ctx: CanvasRenderingContext2D, path: () => void, col: string, x0: number, y0: number, x1: number, y1: number) {
  path();
  ctx.fillStyle = col;
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  ctx.strokeStyle = shade(col, -0.22);
  ctx.lineWidth = 3;
  let row = 0;
  for (let y = y0 + 14; y < y1; y += 18, row++) {
    for (let x = x0 - 20 + (row % 2) * 13; x < x1 + 20; x += 26) {
      ctx.beginPath();
      ctx.arc(x, y, 13, 0.15, Math.PI - 0.15);
      ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x0, y0, (x1 - x0) * 0.35, y1 - y0);
  ctx.restore();
  path();
  ctx.lineWidth = L;
  ctx.strokeStyle = PAL.ink;
  ctx.stroke();
}

function walls(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  rrPath(ctx, x, y, w, h, 10);
  ctx.fillStyle = col;
  ctx.fill();
  rrPath(ctx, x, y, w, h, 10);
  softShade(ctx, { x, y, w, h }, { darkAlpha: 0.12, lightAlpha: 0.2 });
  rrPath(ctx, x, y, w, h, 10);
  paint(ctx, 'rgba(0,0,0,0)', L);
}

export function cottage(): PropArt {
  const W = 400;
  const H = 380;
  const cv = makeCanvas(W, H);
  const { ctx } = cv;
  const base = H - 10;
  // chimney
  rrPath(ctx, 270, 60, 40, 90, 6);
  paint(ctx, PAL.stone, L);
  walls(ctx, 40, 170, 320, base - 170, PAL.wall);
  // timber
  ctx.strokeStyle = PAL.woodLight;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(44, 250);
  ctx.lineTo(356, 250);
  ctx.stroke();
  const roof = () => {
    ctx.beginPath();
    ctx.moveTo(14, 190);
    ctx.quadraticCurveTo(200, 196, 386, 190);
    ctx.lineTo(300, 60);
    ctx.quadraticCurveTo(200, 50, 100, 60);
    ctx.closePath();
  };
  roofShingles(ctx, roof, PAL.roofRed, 14, 50, 386, 196);
  windowPane(ctx, 70, 270, 60, 56);
  windowPane(ctx, 270, 270, 60, 56);
  windowPane(ctx, 176, 90, 48, 60, true);
  // flower boxes
  for (const x of [64, 264]) {
    rrPath(ctx, x, 322, 72, 16, 5);
    paint(ctx, PAL.wood, 3);
    for (let i = 0; i < 5; i++) {
      circlePath(ctx, x + 10 + i * 13, 318, 6);
      paint(ctx, [PAL.pink, PAL.gold, PAL.red][i % 3], 2);
    }
  }
  door(ctx, 200, base, 64, 96, PAL.green);
  return { cv, ox: 0.5, oy: base / H };
}

export function tailorShop(): PropArt {
  const W = 400;
  const H = 390;
  const cv = makeCanvas(W, H);
  const { ctx } = cv;
  const base = H - 10;
  walls(ctx, 36, 150, 328, base - 150, '#fbe0e6');
  const roof = () => {
    ctx.beginPath();
    ctx.moveTo(12, 170);
    ctx.lineTo(388, 170);
    ctx.lineTo(340, 70);
    ctx.lineTo(60, 70);
    ctx.closePath();
  };
  roofShingles(ctx, roof, PAL.roofPurple, 12, 60, 388, 172);
  // display window with a little dress form
  rrPath(ctx, 60, 230, 110, 100, 10);
  paint(ctx, '#bfe3ee', L);
  ellipsePath(ctx, 115, 262, 18, 22);
  paint(ctx, PAL.pink, 3);
  rrPath(ctx, 112, 284, 6, 34, 2);
  paint(ctx, PAL.woodDark, 2);
  windowPane(ctx, 250, 236, 80, 70);
  // sign: spool of thread
  rrPath(ctx, 130, 176, 140, 44, 12);
  paint(ctx, PAL.cream, L);
  rrPath(ctx, 150, 184, 26, 28, 4);
  paint(ctx, PAL.red, 3);
  ctx.fillStyle = PAL.ink;
  ctx.font = '600 22px Fredoka, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Stitch', 186, 206);
  door(ctx, 200, base, 62, 92, PAL.roofBlue);
  // awning stripes
  ctx.beginPath();
  ctx.moveTo(48, 226);
  ctx.lineTo(182, 226);
  ctx.lineTo(176, 212);
  ctx.lineTo(54, 212);
  ctx.closePath();
  paint(ctx, PAL.pink, 3);
  return { cv, ox: 0.5, oy: base / H };
}

export function museum(): PropArt {
  const W = 500;
  const H = 420;
  const cv = makeCanvas(W, H);
  const { ctx } = cv;
  const base = H - 10;
  walls(ctx, 40, 170, 420, base - 170, '#efe6d4');
  // columns
  for (const x of [70, 150, 330, 410]) {
    rrPath(ctx, x, 180, 26, base - 196, 5);
    paint(ctx, '#fbf6ea', L);
  }
  // pediment
  ctx.beginPath();
  ctx.moveTo(20, 176);
  ctx.lineTo(250, 62);
  ctx.lineTo(480, 176);
  ctx.closePath();
  paint(ctx, PAL.roofTeal, L);
  ctx.beginPath();
  ctx.moveTo(80, 160);
  ctx.lineTo(250, 84);
  ctx.lineTo(420, 160);
  ctx.closePath();
  paint(ctx, '#efe6d4', 3);
  // hourglass emblem
  ctx.beginPath();
  ctx.moveTo(234, 104);
  ctx.lineTo(266, 104);
  ctx.lineTo(254, 124);
  ctx.lineTo(266, 146);
  ctx.lineTo(234, 146);
  ctx.lineTo(246, 124);
  ctx.closePath();
  paint(ctx, PAL.gold, 3);
  rrPath(ctx, 30, 170, 440, 16, 6);
  paint(ctx, '#e0d4bd', L);
  // steps
  rrPath(ctx, 170, base - 18, 160, 20, 5);
  paint(ctx, PAL.stone, 3);
  // banners
  for (const x of [200, 280]) {
    ctx.beginPath();
    ctx.moveTo(x, 200);
    ctx.lineTo(x + 24, 200);
    ctx.lineTo(x + 24, 250);
    ctx.lineTo(x + 12, 240);
    ctx.lineTo(x, 250);
    ctx.closePath();
    paint(ctx, PAL.roofTeal, 3);
  }
  door(ctx, 250, base - 14, 70, 100, PAL.woodDark);
  return { cv, ox: 0.5, oy: base / H };
}

export function bowlingAlley(open: boolean): PropArt {
  const W = 600;
  const H = 400;
  const cv = makeCanvas(W, H);
  const { ctx } = cv;
  const base = H - 10;
  walls(ctx, 30, 150, 540, base - 150, open ? '#f3e7d3' : '#e8dcc8');
  rrPath(ctx, 20, 130, 560, 34, 10);
  paint(ctx, open ? PAL.red : '#b9a58c', L);
  // big pin sign
  const pin = (x: number, y: number, s: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 22 * s, y, x + 22 * s, y + 40 * s, x + 12 * s, y + 52 * s);
    ctx.bezierCurveTo(x + 30 * s, y + 80 * s, x + 26 * s, y + 118 * s, x + 16 * s, y + 130 * s);
    ctx.lineTo(x - 16 * s, y + 130 * s);
    ctx.bezierCurveTo(x - 26 * s, y + 118 * s, x - 30 * s, y + 80 * s, x - 12 * s, y + 52 * s);
    ctx.bezierCurveTo(x - 22 * s, y + 40 * s, x - 22 * s, y, x, y);
    ctx.closePath();
    paint(ctx, '#ffffff', L);
    rrPath(ctx, x - 13 * s, y + 42 * s, 26 * s, 6 * s, 2);
    paint(ctx, PAL.red, 2);
    rrPath(ctx, x - 14 * s, y + 52 * s, 28 * s, 6 * s, 2);
    paint(ctx, PAL.red, 2);
  };
  pin(300, 4, 1);
  // sign board
  rrPath(ctx, 180, 60, 240, 60, 16);
  paint(ctx, open ? PAL.navy : '#8a7f73', L);
  ctx.fillStyle = open ? PAL.gold : '#d8cfc4';
  ctx.font = '700 34px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'LANES' : 'SOON!', 300, 102);
  // windows
  for (const x of [70, 150, 390, 470]) windowPane(ctx, x, 220, 60, 70, false, open);
  door(ctx, 300, base, 90, 110, open ? PAL.red : '#a08c76');
  if (!open) {
    // construction boards and a friendly sign
    ctx.save();
    ctx.translate(300, base - 60);
    ctx.rotate(-0.12);
    rrPath(ctx, -80, -16, 160, 30, 6);
    paint(ctx, PAL.gold, 3);
    ctx.fillStyle = PAL.ink;
    ctx.font = '700 20px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Coming soon!', 0, 6);
    ctx.restore();
  }
  return { cv, ox: 0.5, oy: base / H };
}

export function oakBurrow(): PropArt {
  const W = 440;
  const H = 480;
  const PAD = 70; // headroom so the big round crown isn't clipped
  const cv = makeCanvas(W, H + PAD);
  const { ctx } = cv;
  ctx.translate(0, PAD);
  const base = H - 12;
  // roots + trunk
  ctx.beginPath();
  ctx.moveTo(90, base);
  ctx.quadraticCurveTo(150, base - 20, 160, base - 120);
  ctx.quadraticCurveTo(170, 230, 150, 200);
  ctx.lineTo(290, 200);
  ctx.quadraticCurveTo(270, 230, 280, base - 120);
  ctx.quadraticCurveTo(290, base - 20, 350, base);
  ctx.quadraticCurveTo(220, base + 8, 90, base);
  ctx.closePath();
  ctx.fillStyle = '#9b6b45';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = '#7d5436';
  ctx.lineWidth = 4;
  for (const x of [180, 205, 240, 262]) {
    ctx.beginPath();
    ctx.moveTo(x, 200);
    ctx.quadraticCurveTo(x + 8, 320, x - 4, base);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(90, base);
  ctx.quadraticCurveTo(150, base - 20, 160, base - 120);
  ctx.quadraticCurveTo(170, 230, 150, 200);
  ctx.lineTo(290, 200);
  ctx.quadraticCurveTo(270, 230, 280, base - 120);
  ctx.quadraticCurveTo(290, base - 20, 350, base);
  ctx.quadraticCurveTo(220, base + 8, 90, base);
  ctx.closePath();
  paint(ctx, 'rgba(0,0,0,0)', L);
  // canopy
  canopy(ctx, 220, 140, 190, PAL.leaf, 77);
  // round door
  circlePath(ctx, 220, base - 60, 46);
  paint(ctx, '#c0464b', L);
  ctx.strokeStyle = '#8a2f33';
  ctx.lineWidth = 3;
  for (const dx of [-16, 0, 16]) {
    ctx.beginPath();
    ctx.moveTo(220 + dx, base - 100);
    ctx.lineTo(220 + dx, base - 16);
    ctx.stroke();
  }
  circlePath(ctx, 220, base - 78, 13);
  paint(ctx, PAL.lamp, 3);
  circlePath(ctx, 248, base - 56, 5);
  paint(ctx, PAL.gold, 2);
  // stove pipe with steam puffs
  rrPath(ctx, 300, 250, 16, 90, 4);
  paint(ctx, '#8a8f99', 3);
  for (const [x, y, r] of [
    [310, 236, 12],
    [322, 214, 15],
    [336, 188, 18],
  ]) {
    circlePath(ctx, x, y, r);
    paint(ctx, 'rgba(255,255,255,0.85)', 2);
  }
  // hanging sign with a soup bowl
  rrPath(ctx, 100, 300, 70, 50, 10);
  paint(ctx, PAL.cream, L);
  ctx.beginPath();
  ctx.arc(135, 318, 18, 0, Math.PI);
  ctx.closePath();
  paint(ctx, PAL.orange, 3);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(135, 272);
  ctx.lineTo(135, 300);
  ctx.stroke();
  return { cv, ox: 0.5, oy: (base + PAD) / (H + PAD) };
}

export const PROP_ART: Record<string, () => PropArt> = {
  ...FIFTIES_PROPS,
  'tree-round': () => treeRound(11),
  'tree-fruit': () => treeRound(23, true),
  'tree-pine': () => treePine(2),
  'tree-palm': () => treePalm(),
  'prop-bush': () => bush(4),
  'prop-rock': () => rock(),
  'prop-lamp': () => lamp(),
  'prop-bench': () => bench(),
  'prop-dancefloor': () => danceFloor(),
  'prop-flowerbed': () => flowerbed(8),
  'prop-sign': () => signpost(),
  'prop-stall': () => stall('clocks'),
  'prop-stall-green': () => stall('garden'),
  'prop-fountain': () => fountain(),
  'prop-plot': () => gardenPlot(),
  'prop-riddlestone': () => riddleStone(),
  'prop-cratejam': () => crateJam(),
  'prop-toyboat': () => toyBoat(),
  'prop-lockbox': () => gearLockbox(),
  'prop-basket': () => knittingBasket(),
  'prop-mosaic': () => mosaicFloor(),
  'prop-clover': () => cloverPatch(),
  'prop-cave': () => caveMouth(),
  'prop-ledge': () => lookoutRock(),
  'prop-chest': () => chestClosed(),
  'prop-chest-open': () => chestOpen(),
  'prop-hull': () => shipHull(),
  'prop-mast': () => shipMast(),
  'prop-wheel': () => shipWheel(),
  'prop-galley': () => galleyStove(),
  'prop-maptable': () => mapTable(),
  'prop-hatch': () => cargoHatch(),
  'prop-saltpan': () => saltPan(),
  'prop-bottle': () => messageBottle(),
  'prop-barrels': () => barrelJam(),
  'prop-rowboat': () => rowboat(),
  'prop-stonedoor': () => stoneDoorClosed(),
  'prop-stonedoor-open': () => stoneDoorOpen(),
  'prop-fruitstall': () => fruitStall(),
  'prop-torch': () => wallTorch(),
  'prop-laundry': () => washingLine(),
  'prop-crewsign': () => crewSign(),
  'prop-fence-h': () => fenceH(),
  'prop-burrow-hole': () => burrowHole(),
  'bld-cottage': () => cottage(),
  'bld-tailor': () => tailorShop(),
  'bld-museum': () => museum(),
  'bld-bowling': () => bowlingAlley(false),
  'bld-bowling-open': () => bowlingAlley(true),
  'bld-oak': () => oakBurrow(),
};
