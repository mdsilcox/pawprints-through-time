import { PAL, shade } from './palette';
import { makeCanvas, rrPath, circlePath, ellipsePath, paint, softShade, OUTLINE, sparkle, type Cv } from './draw';
import type { PropArt } from './props';

/**
 * Decorating furniture: extra pieces for the cottage and the other views (side / back) that let
 * pieces turn. Same house style as `furniture.ts`: chunky outlines, soft top-left light.
 * Anchor = the floor contact point, bottom centre.
 */
const L = OUTLINE;
const T = 96; // one cell, in art pixels

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

function dots(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, step: number, r: number, col: string) {
  c.fillStyle = col;
  for (let y = y0; y < y1; y += step)
    for (let x = x0 + ((Math.round((y - y0) / step) % 2) * step) / 2; x < x1; x += step) {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
}

// ------------------------------------------------------------------ rugs (sized to their footprint)
function rug(style: 'red' | 'round' | 'stripes', cw: number, ch: number): PropArt {
  const W = cw * T;
  const H = ch * T;
  const cv = makeCanvas(W, H);
  const c = cv.ctx;
  const x = 8;
  const y = 8;
  const w = W - 16;
  const h = H - 16;
  if (style === 'round') {
    ellipsePath(c, W / 2, H / 2, w / 2, h / 2);
    paint(c, PAL.purple, 4);
    ellipsePath(c, W / 2, H / 2, w / 2 - 18, h / 2 - 18);
    c.lineWidth = 7;
    c.strokeStyle = PAL.gold;
    c.stroke();
    ellipsePath(c, W / 2, H / 2, w / 4, h / 4);
    c.lineWidth = 5;
    c.strokeStyle = shade(PAL.purple, 0.25);
    c.stroke();
  } else if (style === 'stripes') {
    const cols = [PAL.red, PAL.orange, PAL.gold, PAL.green, PAL.blue, PAL.purple];
    c.save();
    rrPath(c, x, y, w, h, 18);
    c.clip();
    const across = w >= h;
    const n = cols.length;
    for (let i = 0; i < n; i++) {
      c.fillStyle = cols[i];
      if (across) c.fillRect(x, y + (h / n) * i, w, h / n + 1);
      else c.fillRect(x + (w / n) * i, y, w / n + 1, h);
    }
    c.restore();
    rrPath(c, x, y, w, h, 18);
    paint(c, 'rgba(0,0,0,0)', 4);
    // tassels
    c.strokeStyle = PAL.cream;
    c.lineWidth = 3;
    for (let t = 0; t < (across ? h : w); t += 12) {
      c.beginPath();
      if (across) {
        c.moveTo(x, y + t + 6);
        c.lineTo(x - 7, y + t + 6);
        c.moveTo(x + w, y + t + 6);
        c.lineTo(x + w + 7, y + t + 6);
      } else {
        c.moveTo(x + t + 6, y);
        c.lineTo(x + t + 6, y - 7);
        c.moveTo(x + t + 6, y + h);
        c.lineTo(x + t + 6, y + h + 7);
      }
      c.stroke();
    }
  } else {
    rrPath(c, x, y, w, h, 18);
    paint(c, PAL.red, 4);
    rrPath(c, x + 14, y + 14, w - 28, h - 28, 12);
    c.lineWidth = 6;
    c.strokeStyle = PAL.cream;
    c.stroke();
    dots(c, x + 40, y + 40, x + w - 30, y + h - 30, 44, 5, shade(PAL.red, 0.3));
  }
  return { cv, ox: 0.5, oy: 1 };
}

// ------------------------------------------------------------------ seats
function chairSide(): PropArt {
  // facing left: the backrest is on the right
  return art(80, 110, (c) => {
    box(c, 54, 8, 16, 76, 6, PAL.wood);
    box(c, 8, 56, 64, 22, 8, PAL.woodLight);
    for (const x of [14, 56]) box(c, x, 76, 8, 28, 3, PAL.woodDark, 3);
  }, 104);
}

function chairBack(): PropArt {
  return art(80, 110, (c) => {
    box(c, 10, 58, 60, 18, 8, PAL.woodLight);
    for (const x of [16, 56]) box(c, x, 76, 8, 28, 3, PAL.woodDark, 3);
    box(c, 14, 10, 52, 64, 10, PAL.wood);
    c.strokeStyle = shade(PAL.wood, -0.25);
    c.lineWidth = 3;
    for (const x of [30, 40, 50]) {
      c.beginPath();
      c.moveTo(x, 20);
      c.lineTo(x, 64);
      c.stroke();
    }
  }, 104);
}

const COZY = '#e46a6a';

function armchair(): PropArt {
  return art(116, 124, (c) => {
    for (const x of [18, 88]) box(c, x, 104, 10, 14, 3, PAL.woodDark, 3);
    box(c, 16, 6, 84, 66, 20, COZY);
    box(c, 10, 46, 96, 62, 18, shade(COZY, -0.05));
    box(c, 26, 56, 64, 28, 12, shade(COZY, 0.22));
    box(c, 4, 44, 24, 60, 12, shade(COZY, 0.08));
    box(c, 88, 44, 24, 60, 12, shade(COZY, 0.08));
    dots(c, 40, 24, 80, 50, 20, 3, shade(COZY, -0.2));
  }, 118);
}

function armchairSide(): PropArt {
  return art(116, 124, (c) => {
    for (const x of [14, 90]) box(c, x, 104, 10, 14, 3, PAL.woodDark, 3);
    box(c, 70, 8, 38, 98, 18, COZY);
    box(c, 8, 54, 100, 52, 16, shade(COZY, -0.05));
    box(c, 12, 40, 70, 26, 12, shade(COZY, 0.1));
    box(c, 18, 58, 52, 20, 10, shade(COZY, 0.22), 3);
  }, 118);
}

function armchairBack(): PropArt {
  return art(116, 124, (c) => {
    for (const x of [18, 88]) box(c, x, 104, 10, 14, 3, PAL.woodDark, 3);
    box(c, 4, 44, 24, 60, 12, shade(COZY, 0.02));
    box(c, 88, 44, 24, 60, 12, shade(COZY, 0.02));
    box(c, 14, 10, 88, 96, 20, shade(COZY, -0.1));
    dots(c, 32, 34, 90, 90, 22, 3.5, shade(COZY, -0.28));
  }, 118);
}

const SOFA = '#6fb3e0';

function sofa(): PropArt {
  return art(206, 126, (c) => {
    for (const x of [22, 176]) box(c, x, 106, 10, 14, 3, PAL.woodDark, 3);
    box(c, 18, 8, 170, 62, 20, SOFA);
    box(c, 10, 48, 186, 62, 18, shade(SOFA, -0.05));
    box(c, 28, 56, 74, 28, 12, shade(SOFA, 0.22));
    box(c, 104, 56, 74, 28, 12, shade(SOFA, 0.22));
    box(c, 4, 44, 26, 62, 12, shade(SOFA, 0.08));
    box(c, 176, 44, 26, 62, 12, shade(SOFA, 0.08));
    // a heart cushion
    c.save();
    c.translate(140, 42);
    c.rotate(0.15);
    box(c, -14, -14, 28, 28, 8, PAL.pink, 3);
    c.restore();
  }, 120);
}

function sofaSide(): PropArt {
  // turned sideways (1 wide, 2 deep), facing left
  return art(118, 214, (c) => {
    for (const y of [194]) for (const x of [16, 92]) box(c, x, y, 10, 14, 3, PAL.woodDark, 3);
    box(c, 72, 8, 38, 190, 18, SOFA);
    box(c, 8, 30, 98, 168, 16, shade(SOFA, -0.05));
    box(c, 18, 42, 60, 70, 12, shade(SOFA, 0.22));
    box(c, 18, 116, 60, 70, 12, shade(SOFA, 0.22));
    box(c, 6, 18, 96, 24, 10, shade(SOFA, 0.08));
    box(c, 6, 184, 96, 24, 10, shade(SOFA, 0.08));
  }, 208);
}

function sofaBack(): PropArt {
  return art(206, 126, (c) => {
    for (const x of [22, 176]) box(c, x, 106, 10, 14, 3, PAL.woodDark, 3);
    box(c, 4, 44, 26, 62, 12, shade(SOFA, 0.02));
    box(c, 176, 44, 26, 62, 12, shade(SOFA, 0.02));
    box(c, 14, 10, 178, 96, 20, shade(SOFA, -0.1));
    c.strokeStyle = shade(SOFA, -0.3);
    c.lineWidth = 3;
    c.setLineDash([8, 7]);
    rrPath(c, 26, 22, 154, 72, 14);
    c.stroke();
    c.setLineDash([]);
  }, 120);
}

// ------------------------------------------------------------------ beds and tables turned sideways
function bedSide(): PropArt {
  // 3 wide × 2 deep, headboard on the left
  return art(296, 196, (c) => {
    box(c, 30, 116, 250, 62, 12, PAL.wood);
    box(c, 36, 44, 240, 88, 18, '#f7f0e4');
    box(c, 50, 54, 62, 66, 18, '#ffffff');
    rrPath(c, 116, 44, 160, 88, [10, 18, 18, 10]);
    paint(c, '#9fc8e8', L);
    dots(c, 132, 58, 268, 126, 24, 4, '#ffffff');
    box(c, 8, 12, 40, 174, 16, PAL.wood);
    box(c, 268, 64, 22, 120, 10, PAL.woodDark);
  }, 188);
}

function tableSide(): PropArt {
  // 1 wide × 2 deep
  return art(116, 196, (c) => {
    for (const x of [22, 82]) box(c, x, 128, 13, 60, 4, PAL.woodDark);
    box(c, 8, 22, 100, 118, 16, PAL.woodLight);
    box(c, 36, 52, 42, 30, 10, '#ffffff');
    circlePath(c, 57, 66, 10);
    paint(c, PAL.pink, 3);
    box(c, 30, 98, 54, 22, 8, shade(PAL.woodLight, 0.15), 3);
  }, 188);
}

// ------------------------------------------------------------------ little things
function sidetable(): PropArt {
  return art(90, 150, (c) => {
    box(c, 40, 80, 10, 58, 3, PAL.woodDark, 3);
    box(c, 22, 134, 46, 10, 4, PAL.woodDark, 3);
    ellipsePath(c, 45, 80, 38, 13);
    paint(c, PAL.woodLight, L);
    // a jug of flowers
    box(c, 32, 44, 26, 34, 10, PAL.blue, 3);
    for (const [x, y, col] of [
      [34, 26, PAL.pink],
      [48, 18, PAL.gold],
      [58, 30, '#ffffff'],
      [42, 36, PAL.red],
    ] as [number, number, string][]) {
      c.strokeStyle = PAL.leaf;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(45, 46);
      c.lineTo(x, y);
      c.stroke();
      circlePath(c, x, y, 7);
      paint(c, col, 2.5);
    }
  }, 144);
}

function fishbowl(): PropArt {
  return art(96, 160, (c) => {
    for (const x of [22, 66]) box(c, x, 96, 9, 56, 3, PAL.woodDark, 3);
    box(c, 12, 90, 72, 14, 6, PAL.wood, 3);
    circlePath(c, 48, 56, 36);
    paint(c, 'rgba(159, 214, 236, 0.75)', L);
    c.fillStyle = '#6cc4d8';
    c.beginPath();
    c.arc(48, 56, 33, 0.15 * Math.PI, 0.85 * Math.PI);
    c.fill();
    // Bubbles the goldfish
    ellipsePath(c, 44, 62, 14, 9);
    paint(c, PAL.orange, 2.5);
    c.beginPath();
    c.moveTo(58, 62);
    c.lineTo(68, 54);
    c.lineTo(68, 70);
    c.closePath();
    paint(c, PAL.orange, 2.5);
    c.fillStyle = PAL.ink;
    c.beginPath();
    c.arc(38, 60, 2.2, 0, Math.PI * 2);
    c.fill();
    for (const [x, y, r] of [
      [34, 40, 4],
      [28, 30, 3],
    ])
      {
        circlePath(c, x, y, r);
        c.strokeStyle = '#ffffff';
        c.lineWidth = 2;
        c.stroke();
      }
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.beginPath();
    c.ellipse(64, 40, 5, 11, 0.5, 0, Math.PI * 2);
    c.fill();
  }, 152);
}

function toybox(): PropArt {
  return art(110, 110, (c) => {
    // a ball and a teddy ear peeking out
    circlePath(c, 30, 34, 16);
    paint(c, PAL.red, 3);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(30, 34, 10, -0.4, 1.2);
    c.stroke();
    circlePath(c, 74, 30, 12);
    paint(c, PAL.woodLight, 3);
    circlePath(c, 74, 30, 6);
    paint(c, PAL.pink, 2);
    box(c, 8, 42, 94, 60, 12, PAL.blue);
    box(c, 4, 38, 102, 16, 8, shade(PAL.blue, 0.15), 3);
    for (const [x, y] of [
      [30, 76],
      [56, 70],
      [82, 80],
    ])
      sparkle(c, x, y, 9, PAL.gold);
  }, 104);
}

function bunnyplush(): PropArt {
  return art(104, 124, (c) => {
    const fur = '#fbe9dc';
    // ears
    for (const [x, a] of [
      [38, -0.2],
      [62, 0.25],
    ] as [number, number][]) {
      c.save();
      c.translate(x, 30);
      c.rotate(a);
      ellipsePath(c, 0, 0, 10, 28);
      paint(c, fur, L);
      ellipsePath(c, 0, 2, 5, 18);
      c.fillStyle = PAL.pink;
      c.fill();
      c.restore();
    }
    ellipsePath(c, 52, 92, 38, 28);
    paint(c, fur, L);
    circlePath(c, 52, 60, 28);
    paint(c, fur, L);
    ellipsePath(c, 26, 108, 13, 9);
    paint(c, fur, 3);
    ellipsePath(c, 78, 108, 13, 9);
    paint(c, fur, 3);
    c.fillStyle = PAL.ink;
    for (const x of [42, 62]) {
      c.beginPath();
      c.arc(x, 58, 3.4, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = PAL.blush;
    for (const x of [34, 70]) {
      c.beginPath();
      c.ellipse(x, 68, 6, 4, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = PAL.pink;
    c.beginPath();
    c.arc(52, 66, 3.5, 0, Math.PI * 2);
    c.fill();
    // a bow
    c.fillStyle = PAL.purple;
    c.beginPath();
    c.moveTo(52, 86);
    c.lineTo(40, 80);
    c.lineTo(40, 92);
    c.closePath();
    c.moveTo(52, 86);
    c.lineTo(64, 80);
    c.lineTo(64, 92);
    c.closePath();
    c.fill();
  }, 118);
}

function seachest(): PropArt {
  return art(120, 104, (c) => {
    box(c, 10, 44, 100, 54, 8, PAL.woodDark);
    rrPath(c, 10, 14, 100, 40, [34, 34, 6, 6]);
    paint(c, PAL.wood, L);
    for (const x of [30, 90]) box(c, x - 5, 16, 10, 82, 3, PAL.goldDark, 2.5);
    for (const [x, y] of [
      [14, 48],
      [98, 48],
      [14, 86],
      [98, 86],
    ])
      box(c, x - 4, y - 4, 12, 12, 3, PAL.gold, 2);
    box(c, 50, 42, 20, 22, 6, PAL.gold, 3);
    circlePath(c, 60, 52, 3);
    c.fillStyle = PAL.ink;
    c.fill();
  }, 98);
}

function starlightcup(): PropArt {
  return art(90, 170, (c) => {
    box(c, 22, 104, 46, 58, 6, '#efe6d4');
    box(c, 14, 96, 62, 14, 6, '#e0d4bd');
    box(c, 14, 156, 62, 10, 5, '#e0d4bd', 3);
    // the cup
    box(c, 36, 84, 18, 14, 4, PAL.goldDark, 3);
    c.beginPath();
    c.moveTo(22, 30);
    c.lineTo(68, 30);
    c.quadraticCurveTo(66, 80, 45, 84);
    c.quadraticCurveTo(24, 80, 22, 30);
    c.closePath();
    paint(c, PAL.gold, L);
    for (const s of [-1, 1]) {
      c.beginPath();
      c.arc(45 + s * 26, 46, 11, s < 0 ? 0.5 * Math.PI : -0.5 * Math.PI, s < 0 ? 1.5 * Math.PI : 0.5 * Math.PI);
      c.lineWidth = 7;
      c.strokeStyle = PAL.ink;
      c.stroke();
      c.lineWidth = 3.5;
      c.strokeStyle = PAL.gold;
      c.stroke();
    }
    sparkle(c, 45, 50, 10, '#ffffff');
    sparkle(c, 45, 14, 12, PAL.gold);
  }, 164);
}

function pintrophy(): PropArt {
  return art(90, 176, (c) => {
    box(c, 22, 110, 46, 58, 6, '#efe6d4');
    box(c, 14, 102, 62, 14, 6, '#e0d4bd');
    box(c, 14, 162, 62, 10, 5, '#e0d4bd', 3);
    // a golden bowling pin
    c.beginPath();
    c.moveTo(45, 10);
    c.bezierCurveTo(58, 10, 58, 34, 52, 42);
    c.bezierCurveTo(64, 56, 66, 78, 58, 100);
    c.lineTo(32, 100);
    c.bezierCurveTo(24, 78, 26, 56, 38, 42);
    c.bezierCurveTo(32, 34, 32, 10, 45, 10);
    c.closePath();
    paint(c, PAL.gold, L);
    c.fillStyle = PAL.red;
    c.fillRect(38, 44, 14, 4);
    c.fillRect(37, 51, 16, 4);
    sparkle(c, 50, 24, 7, '#ffffff');
    sparkle(c, 70, 20, 9, PAL.gold);
  }, 170);
}

// ------------------------------------------------------------------ on the wall
function cuckoo(): PropArt {
  return art(80, 140, (c) => {
    // weights on chains
    c.strokeStyle = PAL.goldDark;
    c.lineWidth = 2.5;
    for (const x of [30, 50]) {
      c.beginPath();
      c.moveTo(x, 84);
      c.lineTo(x, 116);
      c.stroke();
      ellipsePath(c, x, 124, 6, 11);
      paint(c, PAL.woodDark, 2.5);
    }
    box(c, 12, 34, 56, 54, 8, PAL.wood);
    c.beginPath();
    c.moveTo(4, 40);
    c.lineTo(40, 8);
    c.lineTo(76, 40);
    c.closePath();
    paint(c, PAL.woodDark, L);
    // a little bird door
    box(c, 32, 18, 16, 16, 4, shade(PAL.woodDark, -0.2), 2.5);
    circlePath(c, 40, 62, 18);
    paint(c, PAL.cream, 3);
    c.strokeStyle = PAL.ink;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(40, 62);
    c.lineTo(40, 50);
    c.moveTo(40, 62);
    c.lineTo(49, 66);
    c.stroke();
    for (const x of [18, 62]) {
      c.save();
      c.translate(x, 40);
      c.rotate(x < 40 ? -0.6 : 0.6);
      ellipsePath(c, 0, 0, 5, 9);
      paint(c, PAL.leaf, 2);
      c.restore();
    }
  }, 134);
}

function frame(draw: (c: CanvasRenderingContext2D) => void): PropArt {
  return art(104, 88, (c) => {
    box(c, 4, 4, 96, 78, 8, PAL.gold);
    c.save();
    rrPath(c, 14, 14, 76, 58, 4);
    c.clip();
    draw(c);
    c.restore();
    rrPath(c, 14, 14, 76, 58, 4);
    paint(c, 'rgba(0,0,0,0)', 2.5);
  }, 84);
}

function paintingSea(): PropArt {
  return frame((c) => {
    c.fillStyle = '#bfe6f5';
    c.fillRect(14, 14, 76, 58);
    c.fillStyle = PAL.waterDeep;
    c.fillRect(14, 48, 76, 24);
    circlePath(c, 72, 28, 8);
    c.fillStyle = PAL.gold;
    c.fill();
    c.beginPath();
    c.moveTo(30, 50);
    c.lineTo(54, 50);
    c.lineTo(50, 56);
    c.lineTo(34, 56);
    c.closePath();
    paint(c, PAL.wood, 2);
    c.beginPath();
    c.moveTo(42, 48);
    c.lineTo(42, 26);
    c.lineTo(54, 46);
    c.closePath();
    paint(c, '#ffffff', 2);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    for (const [x, y] of [
      [22, 62],
      [62, 60],
      [78, 66],
    ]) {
      c.beginPath();
      c.arc(x, y, 5, Math.PI, 0);
      c.stroke();
    }
  });
}

function paintingMeadow(): PropArt {
  return frame((c) => {
    c.fillStyle = '#cdeefc';
    c.fillRect(14, 14, 76, 58);
    c.fillStyle = PAL.grassLight;
    c.beginPath();
    c.ellipse(34, 64, 44, 22, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = PAL.grass;
    c.beginPath();
    c.ellipse(80, 70, 40, 20, 0, 0, Math.PI * 2);
    c.fill();
    for (const [x, y, col] of [
      [24, 58, PAL.pink],
      [36, 62, '#ffffff'],
      [70, 60, PAL.gold],
    ] as [number, number, string][]) {
      c.fillStyle = col;
      c.beginPath();
      c.arc(x, y, 3, 0, Math.PI * 2);
      c.fill();
    }
    // a bunny in the grass
    c.fillStyle = '#fbe9dc';
    c.beginPath();
    c.ellipse(58, 52, 7, 6, 0, 0, Math.PI * 2);
    c.ellipse(56, 42, 2.4, 6, -0.2, 0, Math.PI * 2);
    c.ellipse(61, 42, 2.4, 6, 0.2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(22, 26, 7, 0, Math.PI * 2);
    c.arc(30, 24, 8, 0, Math.PI * 2);
    c.arc(38, 27, 6, 0, Math.PI * 2);
    c.fill();
  });
}

function shipwheel(): PropArt {
  return art(110, 110, (c) => {
    const cx = 55;
    const cy = 52;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.save();
      c.translate(cx, cy);
      c.rotate(a);
      box(c, -4, -50, 8, 26, 4, PAL.woodLight, 2.5);
      c.restore();
    }
    circlePath(c, cx, cy, 30);
    c.lineWidth = 14;
    c.strokeStyle = PAL.ink;
    c.stroke();
    c.lineWidth = 8;
    c.strokeStyle = PAL.wood;
    c.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.strokeStyle = PAL.ink;
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(cx, cy);
      c.lineTo(cx + Math.sin(a) * 30, cy - Math.cos(a) * 30);
      c.stroke();
      c.strokeStyle = PAL.woodLight;
      c.lineWidth = 3.5;
      c.stroke();
    }
    circlePath(c, cx, cy, 10);
    paint(c, PAL.gold, 3);
  }, 104);
}

export const HOME_ART: Record<string, () => PropArt> = {
  'rug-red-4x3': () => rug('red', 4, 3),
  'rug-red-3x4': () => rug('red', 3, 4),
  'rug-round-3x3': () => rug('round', 3, 3),
  'rug-stripes-3x2': () => rug('stripes', 3, 2),
  'rug-stripes-2x3': () => rug('stripes', 2, 3),
  'chair-side': chairSide,
  'chair-back': chairBack,
  armchair,
  'armchair-side': armchairSide,
  'armchair-back': armchairBack,
  sofa,
  'sofa-side': sofaSide,
  'sofa-back': sofaBack,
  'bed-side': bedSide,
  'table-side': tableSide,
  sidetable,
  fishbowl,
  toybox,
  bunnyplush,
  seachest,
  starlightcup,
  pintrophy,
  cuckoo,
  'painting-sea': paintingSea,
  'painting-meadow': paintingMeadow,
  shipwheel,
};
