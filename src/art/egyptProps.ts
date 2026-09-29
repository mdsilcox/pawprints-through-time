import { PAL, shade } from './palette';
import { makeCanvas, rrPath, circlePath, ellipsePath, paint, softShade, OUTLINE, sparkle } from './draw';
import type { PropArt } from './props';

/**
 * Ancient Egypt (Giza, ~2500 BCE) in the house style: the pyramid being built (and finished,
 * with its golden capstone), the Great Sphinx, the old builders' tomb, mud-brick houses, the
 * master builder's tent, stone sleds, baskets, papyrus reeds, a clay bread oven, the market
 * stall, a reed boat, the festival floor — plus the furniture inside the tomb.
 */
const L = OUTLINE;
const LIME = '#efe2c4'; // fresh limestone
const LIME_D = '#d8c49a';
const MUD = '#c99a6b'; // mud brick
const MUD_D = '#a8784e';
const LINEN = '#fbf6ea';
const NILE = '#4fa6c4';
const GOLD = PAL.gold;
const TURQ = '#4fb8b0';

function art(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, oy = h - 8): PropArt {
  const cv = makeCanvas(w, h);
  draw(cv.ctx);
  return { cv, ox: 0.5, oy: oy / h };
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, lw = L) {
  rrPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  rrPath(ctx, x, y, w, h, r);
  softShade(ctx, { x, y, w, h }, { darkAlpha: 0.12, lightAlpha: 0.2 });
  rrPath(ctx, x, y, w, h, r);
  paint(ctx, 'rgba(0,0,0,0)', lw);
}

function poly(ctx: CanvasRenderingContext2D, pts: [number, number][], fill: string | CanvasGradient, lw = L) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  paint(ctx, fill, lw);
}

/** Little brick joints on a flat wall. */
function bricks(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, bw: number, bh: number, col: string) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  for (let row = 0, yy = y + bh; yy < y + h; row++, yy += bh) {
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
    for (let xx = x + (row % 2 ? bw / 2 : 0); xx < x + w; xx += bw) {
      ctx.beginPath();
      ctx.moveTo(xx, yy - bh);
      ctx.lineTo(xx, yy);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Simple carved picture-signs (drawn, so they look the same on every device): eye, ankh, sun, water, bird. */
export function glyph(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number, s: number, col = 'rgba(74,59,53,0.6)') {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = Math.max(2, s * 0.14);
  ctx.lineCap = 'round';
  switch (((kind % 5) + 5) % 5) {
    case 0: // an eye
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.5, s * 0.26, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, s * 0.26);
      ctx.lineTo(-s * 0.2, s * 0.5);
      ctx.stroke();
      break;
    case 1: // an ankh
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.28, s * 0.16, s * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.06);
      ctx.lineTo(0, s * 0.5);
      ctx.moveTo(-s * 0.3, s * 0.06);
      ctx.lineTo(s * 0.3, s * 0.06);
      ctx.stroke();
      break;
    case 2: // the sun
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 3: // water
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const xx = -s * 0.5 + (i * s) / 8;
        const yy = i % 2 ? -s * 0.1 : s * 0.1;
        if (i) ctx.lineTo(xx, yy);
        else ctx.moveTo(xx, yy);
      }
      ctx.stroke();
      break;
    default: // a little bird
      ctx.beginPath();
      ctx.ellipse(0, s * 0.05, s * 0.28, s * 0.18, -0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.26, -s * 0.18, s * 0.1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, s * 0.22);
      ctx.lineTo(-s * 0.08, s * 0.46);
      ctx.moveTo(s * 0.08, s * 0.22);
      ctx.lineTo(s * 0.1, s * 0.46);
      ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ the pyramid
function pyramid(done: boolean): () => PropArt {
  return () =>
    art(1040, 760, (c) => {
      const base = 750;
      const cx = 520;
      const halfW = 500;
      const apex = 60;
      const topY = done ? apex : 300; // unfinished: flat top where the builders work
      const halfAt = (y: number) => (halfW * (base - y)) / (base - apex);
      // the body
      const g = c.createLinearGradient(cx - halfW, 0, cx + halfW, 0);
      g.addColorStop(0, done ? '#fbf3dd' : LIME);
      g.addColorStop(0.5, done ? '#f3e6c4' : '#e8d8b2');
      g.addColorStop(1, done ? '#dccaa0' : LIME_D);
      poly(c, [
        [cx - halfW, base],
        [cx - halfAt(topY), topY],
        [cx + halfAt(topY), topY],
        [cx + halfW, base],
      ], g);
      // the sunny side
      c.save();
      c.beginPath();
      c.moveTo(cx, base);
      c.lineTo(cx + halfW, base);
      c.lineTo(cx + halfAt(topY), topY);
      c.lineTo(done ? cx : cx + 4, topY);
      c.closePath();
      c.fillStyle = 'rgba(120, 80, 40, 0.12)';
      c.fill();
      c.restore();
      // the edge down the middle
      c.strokeStyle = 'rgba(74,59,53,0.35)';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(cx, topY);
      c.lineTo(cx, base);
      c.stroke();
      if (!done) {
        // courses of stone blocks
        c.strokeStyle = 'rgba(120, 90, 50, 0.35)';
        c.lineWidth = 2;
        for (let y = topY + 30; y < base; y += 30) {
          const hw = halfAt(y);
          c.beginPath();
          c.moveTo(cx - hw, y);
          c.lineTo(cx + hw, y);
          c.stroke();
          for (let x = cx - hw + ((y / 30) % 2) * 22; x < cx + hw; x += 44) {
            c.beginPath();
            c.moveTo(x, y - 30);
            c.lineTo(x, y);
            c.stroke();
          }
        }
        // the flat top: a builders' platform, a stack of blocks and a little flag
        box(c, cx - 80, topY - 34, 60, 34, 4, LIME, 3);
        box(c, cx - 14, topY - 34, 60, 34, 4, LIME_D, 3);
        box(c, cx - 50, topY - 64, 60, 30, 4, LIME, 3);
        c.strokeStyle = PAL.woodDark;
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(cx + 110, topY);
        c.lineTo(cx + 110, topY - 90);
        c.stroke();
        poly(c, [
          [cx + 112, topY - 90],
          [cx + 160, topY - 78],
          [cx + 112, topY - 64],
        ], PAL.blue, 3);
        // the mud-brick ramp winding up the left face
        poly(c, [
          [cx - halfW + 10, base],
          [cx - halfW + 150, base],
          [cx - halfAt(topY) + 40, topY + 8],
          [cx - halfAt(topY) - 20, topY + 8],
        ], MUD);
        c.strokeStyle = MUD_D;
        c.lineWidth = 2;
        for (let k = 1; k < 9; k++) {
          const t = k / 9;
          const x0 = cx - halfW + 10 + (cx - halfAt(topY) - 20 - (cx - halfW + 10)) * t;
          const x1 = cx - halfW + 150 + (cx - halfAt(topY) + 40 - (cx - halfW + 150)) * t;
          const y = base + (topY + 8 - base) * t;
          c.beginPath();
          c.moveTo(x0, y);
          c.lineTo(x1, y);
          c.stroke();
        }
      } else {
        // a smooth white casing and the shining golden capstone
        poly(c, [
          [cx, apex - 4],
          [cx - halfAt(apex + 70), apex + 70],
          [cx + halfAt(apex + 70), apex + 70],
        ], GOLD);
        sparkle(c, cx - 8, apex + 30, 14, '#ffffff');
        sparkle(c, cx + 60, apex - 10, 18, GOLD);
      }
    });
}

// ------------------------------------------------------------------ the Great Sphinx
function sphinx(): PropArt {
  return art(760, 470, (c) => {
    const S = '#e3c48d';
    const S_D = '#c9a266';
    // the body lying down
    box(c, 230, 250, 470, 170, 70, S);
    // back leg and tail
    ellipsePath(c, 630, 360, 80, 60);
    paint(c, S, L);
    c.strokeStyle = PAL.ink;
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(700, 350);
    c.quadraticCurveTo(752, 330, 740, 400);
    c.stroke();
    // the long front paws
    box(c, 70, 380, 300, 56, 26, S);
    box(c, 110, 400, 300, 56, 26, shade(S, -0.04));
    for (const x of [86, 126]) for (let k = 0; k < 3; k++) {
      c.strokeStyle = S_D;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x + k * 12, x === 86 ? 386 : 406);
      c.lineTo(x + k * 12, x === 86 ? 406 : 426);
      c.stroke();
    }
    // the head with its striped royal headdress
    c.save();
    c.beginPath();
    c.moveTo(150, 120);
    c.quadraticCurveTo(245, 40, 340, 120);
    c.lineTo(370, 330);
    c.quadraticCurveTo(245, 356, 120, 330);
    c.closePath();
    paint(c, '#6fb3e0', L);
    c.clip();
    c.fillStyle = GOLD;
    for (let y = 60; y < 360; y += 34) c.fillRect(100, y, 300, 16);
    c.restore();
    c.beginPath();
    c.moveTo(150, 120);
    c.quadraticCurveTo(245, 40, 340, 120);
    c.lineTo(370, 330);
    c.quadraticCurveTo(245, 356, 120, 330);
    c.closePath();
    paint(c, 'rgba(0,0,0,0)', L);
    // the face
    box(c, 175, 120, 140, 170, 60, S);
    c.fillStyle = PAL.ink;
    for (const x of [218, 272]) {
      c.beginPath();
      c.ellipse(x, 190, 8, 11, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(x + 3, 186, 3, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = PAL.ink;
    }
    c.fillStyle = 'rgba(244, 163, 180, 0.55)';
    for (const x of [198, 292]) {
      c.beginPath();
      c.ellipse(x, 222, 14, 9, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = PAL.ink;
    c.lineWidth = 4;
    c.beginPath();
    c.arc(245, 236, 18, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();
    // a little royal beard
    box(c, 232, 280, 26, 44, 10, '#6fb3e0', 3);
    // sand heaped around the paws
    c.fillStyle = '#efcf8f';
    c.beginPath();
    c.ellipse(240, 458, 230, 24, 0, Math.PI, 0);
    c.fill();
  }, 452);
}

// ------------------------------------------------------------------ buildings
function mastaba(): PropArt {
  return art(540, 380, (c) => {
    const base = 372;
    poly(c, [
      [30, base],
      [70, 110],
      [470, 110],
      [510, base],
    ], LIME);
    bricks(c, 60, 118, 420, 250, 60, 30, 'rgba(150,120,80,0.35)');
    box(c, 60, 92, 420, 28, 8, LIME_D);
    // carved band of pictures over the door
    box(c, 170, 140, 200, 40, 6, '#e8d6ae', 3);
    [0, 4, 1, 2].forEach((k, i) => glyph(c, k, 206 + i * 43, 160, 30, PAL.ink));
    // the dark doorway
    rrPath(c, 222, 210, 96, base - 210, [44, 44, 0, 0]);
    paint(c, '#2a2233', L);
    box(c, 206, 200, 128, 18, 6, LIME_D, 3);
  });
}

function mudHouse(roof: string, awning: string): () => PropArt {
  return () =>
    art(420, 360, (c) => {
      const base = 352;
      box(c, 30, 120, 360, base - 120, 10, MUD);
      bricks(c, 34, 124, 352, base - 128, 44, 22, 'rgba(120,80,40,0.28)');
      box(c, 20, 104, 380, 26, 8, roof);
      // stairs to the roof (Egyptian families slept up there on hot nights)
      for (let i = 0; i < 4; i++) box(c, 320 + i * 12, 150 + i * 44, 56 - i * 12, 20, 4, shade(MUD, 0.1), 3);
      // small high windows
      for (const x of [70, 240]) box(c, x, 150, 40, 26, 6, '#3d2f2a', 3);
      // the door under a palm-frond awning
      rrPath(c, 140, 230, 70, base - 230, [30, 30, 0, 0]);
      paint(c, '#5a3a29', L);
      poly(c, [
        [110, 222],
        [240, 222],
        [256, 250],
        [94, 250],
      ], awning, 3);
      c.strokeStyle = shade(awning, -0.3);
      c.lineWidth = 2;
      for (let x = 108; x < 250; x += 12) {
        c.beginPath();
        c.moveTo(x, 224);
        c.lineTo(x - 6, 248);
        c.stroke();
      }
      // a water jar by the door
      ellipsePath(c, 280, 322, 22, 28);
      paint(c, '#b86b43', 3);
    });
}

function builderTent(): PropArt {
  return art(420, 320, (c) => {
    const base = 312;
    // poles
    c.strokeStyle = PAL.woodDark;
    c.lineWidth = 7;
    for (const x of [44, 376]) {
      c.beginPath();
      c.moveTo(x, base);
      c.lineTo(x, 120);
      c.stroke();
    }
    // the striped linen roof
    c.save();
    c.beginPath();
    c.moveTo(20, 150);
    c.quadraticCurveTo(210, 40, 400, 150);
    c.lineTo(390, 180);
    c.quadraticCurveTo(210, 110, 30, 180);
    c.closePath();
    paint(c, LINEN, L);
    c.clip();
    c.fillStyle = PAL.blue;
    for (let x = 10; x < 420; x += 56) c.fillRect(x, 40, 22, 160);
    c.restore();
    c.beginPath();
    c.moveTo(20, 150);
    c.quadraticCurveTo(210, 40, 400, 150);
    c.lineTo(390, 180);
    c.quadraticCurveTo(210, 110, 30, 180);
    c.closePath();
    paint(c, 'rgba(0,0,0,0)', L);
    // the plan table (empty — the plans are lost!)
    box(c, 110, 222, 200, 26, 8, PAL.wood);
    for (const x of [124, 282]) box(c, x, 246, 14, base - 250, 4, PAL.woodDark, 3);
    box(c, 140, 206, 70, 18, 6, '#e9dcb8', 3);
    box(c, 230, 208, 40, 14, 6, '#e9dcb8', 3);
    // a measuring rope coiled on the ground
    c.strokeStyle = '#b08a55';
    c.lineWidth = 5;
    for (let r = 8; r < 26; r += 7) {
      c.beginPath();
      c.ellipse(350, 292, r * 1.4, r * 0.6, 0, 0, Math.PI * 2);
      c.stroke();
    }
  });
}

// ------------------------------------------------------------------ props
function obelisk(): PropArt {
  return art(120, 440, (c) => {
    poly(c, [
      [36, 424],
      [44, 70],
      [60, 36],
      [76, 70],
      [84, 424],
    ], LIME);
    poly(c, [
      [44, 70],
      [60, 36],
      [76, 70],
    ], GOLD, 3);
    [4, 0, 2, 1, 3].forEach((k, i) => glyph(c, k, 60, 130 + i * 56, 24));
    box(c, 20, 416, 80, 18, 6, LIME_D, 3);
  }, 432);
}

function stoneSled(gold: boolean): () => PropArt {
  return () =>
    art(230, 170, (c) => {
      // the wooden sled with its runners
      box(c, 16, 126, 198, 20, 8, PAL.wood);
      c.strokeStyle = PAL.woodDark;
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(10, 150);
      c.quadraticCurveTo(0, 150, 6, 132);
      c.stroke();
      if (gold) {
        poly(c, [
          [115, 28],
          [40, 126],
          [190, 126],
        ], GOLD);
        sparkle(c, 110, 70, 12, '#ffffff');
      } else {
        box(c, 40, 50, 150, 78, 6, LIME);
        c.strokeStyle = 'rgba(150,120,80,0.4)';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(60, 70);
        c.lineTo(90, 76);
        c.stroke();
      }
      // pulling ropes
      c.strokeStyle = '#b08a55';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(214, 132);
      c.quadraticCurveTo(226, 150, 228, 166);
      c.stroke();
    }, 160);
}

function blockPile(): PropArt {
  return art(240, 190, (c) => {
    box(c, 14, 100, 100, 70, 6, LIME);
    box(c, 118, 100, 100, 70, 6, LIME_D);
    box(c, 64, 34, 100, 68, 6, LIME);
  }, 176);
}

function basketPile(): PropArt {
  return art(220, 170, (c) => {
    const basket = (x: number, y: number, w: number, h: number) => {
      rrPath(c, x, y, w, h, [10, 10, 24, 24]);
      paint(c, '#d9b77a', L);
      c.strokeStyle = '#b08a55';
      c.lineWidth = 2;
      for (let yy = y + 10; yy < y + h; yy += 10) {
        c.beginPath();
        c.moveTo(x + 4, yy);
        c.lineTo(x + w - 4, yy);
        c.stroke();
      }
      box(c, x - 4, y - 8, w + 8, 14, 6, '#c9a060', 3);
    };
    basket(20, 84, 80, 70);
    basket(112, 90, 84, 64);
    basket(64, 26, 76, 60);
  }, 158);
}

function reeds(): PropArt {
  return art(140, 180, (c) => {
    for (const [x, lean, h] of [
      [30, -0.18, 130],
      [56, -0.05, 160],
      [80, 0.08, 140],
      [104, 0.2, 120],
      [70, -0.12, 100],
    ] as [number, number, number][]) {
      const tx = x + Math.sin(lean) * h;
      const ty = 172 - h;
      c.strokeStyle = PAL.leafDark;
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(x, 172);
      c.quadraticCurveTo(x + (tx - x) * 0.4, 172 - h * 0.5, tx, ty);
      c.stroke();
      // papyrus umbrel on top
      c.fillStyle = PAL.leaf;
      c.beginPath();
      c.ellipse(tx, ty, 16, 9, lean, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = PAL.ink;
      c.lineWidth = 2;
      c.stroke();
    }
  }, 172);
}

function breadOven(): PropArt {
  return art(240, 210, (c) => {
    // a beehive-shaped clay oven
    c.beginPath();
    c.moveTo(20, 192);
    c.quadraticCurveTo(20, 40, 100, 40);
    c.quadraticCurveTo(180, 40, 180, 192);
    c.closePath();
    paint(c, '#c47a4e', L);
    rrPath(c, 70, 120, 60, 72, [30, 30, 0, 0]);
    paint(c, '#3d2f2a', L);
    c.fillStyle = PAL.orange;
    c.beginPath();
    c.ellipse(100, 176, 18, 10, 0, 0, Math.PI * 2);
    c.fill();
    // a little table with round loaves
    box(c, 150, 142, 84, 16, 6, PAL.wood, 3);
    for (const x of [166, 194, 220]) {
      ellipsePath(c, x, 134, 14, 10);
      paint(c, '#d99a5a', 3);
    }
    // a cooking pot on the side
    ellipsePath(c, 196, 190, 26, 16);
    paint(c, '#6d6a74', 3);
  }, 196);
}

function egyptStall(): PropArt {
  return art(250, 230, (c) => {
    c.strokeStyle = PAL.woodDark;
    c.lineWidth = 6;
    for (const x of [30, 220]) {
      c.beginPath();
      c.moveTo(x, 214);
      c.lineTo(x, 60);
      c.stroke();
    }
    // a linen awning
    poly(c, [
      [14, 70],
      [236, 70],
      [226, 40],
      [24, 40],
    ], LINEN);
    c.fillStyle = TURQ;
    for (let x = 30; x < 230; x += 40) c.fillRect(x, 44, 16, 24);
    box(c, 20, 140, 210, 70, 8, PAL.woodLight);
    // baskets of dates, lentils and onions
    const bowl = (x: number, fill: string, dots: string) => {
      ellipsePath(c, x, 138, 30, 16);
      paint(c, '#d9b77a', 3);
      c.fillStyle = fill;
      c.beginPath();
      c.ellipse(x, 132, 24, 10, 0, Math.PI, 0);
      c.fill();
      c.fillStyle = dots;
      for (let k = 0; k < 6; k++) {
        c.beginPath();
        c.arc(x - 14 + k * 6, 128 + (k % 2) * 3, 3, 0, Math.PI * 2);
        c.fill();
      }
    };
    bowl(62, '#7a3b2a', '#a8583e');
    bowl(125, '#e0a458', '#c77f3a');
    bowl(188, '#f1d9b0', '#c9a36a');
  }, 214);
}

function reedBoat(): PropArt {
  return art(340, 150, (c) => {
    c.beginPath();
    c.moveTo(10, 60);
    c.quadraticCurveTo(170, 150, 330, 60);
    c.quadraticCurveTo(300, 110, 170, 118);
    c.quadraticCurveTo(40, 110, 10, 60);
    c.closePath();
    paint(c, '#d9b77a', L);
    c.strokeStyle = '#b08a55';
    c.lineWidth = 3;
    for (let x = 60; x < 300; x += 26) {
      c.beginPath();
      c.moveTo(x, 80);
      c.lineTo(x + 4, 112);
      c.stroke();
    }
    // a little shade canopy
    c.strokeStyle = PAL.woodDark;
    c.lineWidth = 4;
    for (const x of [140, 210]) {
      c.beginPath();
      c.moveTo(x, 96);
      c.lineTo(x, 44);
      c.stroke();
    }
    box(c, 128, 32, 96, 16, 6, LINEN, 3);
  }, 118);
}

function festivalFloor(): PropArt {
  const cv = makeCanvas(330, 200);
  const c = cv.ctx;
  ellipsePath(c, 165, 100, 158, 92);
  paint(c, '#f3e6c4', 4);
  ellipsePath(c, 165, 100, 128, 72);
  c.lineWidth = 6;
  c.strokeStyle = TURQ;
  c.stroke();
  // lotus flowers around the ring
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = 165 + Math.cos(a) * 112;
    const y = 100 + Math.sin(a) * 62;
    c.fillStyle = PAL.pink;
    c.beginPath();
    c.ellipse(x, y, 10, 6, a, 0, Math.PI * 2);
    c.fill();
  }
  // a sun in the middle
  circlePath(c, 165, 100, 22);
  paint(c, GOLD, 3);
  return { cv, ox: 0.5, oy: 0.5 };
}

function sphinxGate(): PropArt {
  return art(320, 170, (c) => {
    for (const x of [30, 262]) {
      box(c, x, 50, 30, 104, 6, LIME);
      box(c, x - 6, 40, 42, 16, 6, LIME_D, 3);
    }
    // a thick rope between the posts, with a hanging sign
    c.strokeStyle = '#b08a55';
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(56, 72);
    c.quadraticCurveTo(160, 118, 270, 72);
    c.stroke();
    box(c, 118, 96, 84, 40, 6, '#e9dcb8', 3);
    c.fillStyle = PAL.ink;
    c.font = '700 22px Fredoka, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('? ? ?', 160, 117);
  }, 156);
}

function portalStone(): PropArt {
  return art(200, 120, (c) => {
    ellipsePath(c, 100, 70, 88, 38);
    paint(c, LIME, L);
    ellipsePath(c, 100, 66, 62, 24);
    paint(c, '#bfa0f0', 3);
    sparkle(c, 100, 60, 14, '#ffffff');
  }, 104);
}

// ------------------------------------------------------------------ inside the tomb
function catStatue(): PropArt {
  return art(110, 220, (c) => {
    box(c, 16, 170, 78, 40, 6, LIME_D);
    // a sitting cat carved in dark stone, with a gold collar
    c.beginPath();
    c.moveTo(34, 172);
    c.quadraticCurveTo(22, 110, 40, 80);
    c.lineTo(70, 80);
    c.quadraticCurveTo(90, 110, 78, 172);
    c.closePath();
    paint(c, '#3d3a4a', L);
    circlePath(c, 55, 62, 26);
    paint(c, '#3d3a4a', L);
    poly(c, [
      [33, 50],
      [36, 20],
      [52, 40],
    ], '#3d3a4a', 3);
    poly(c, [
      [77, 50],
      [74, 20],
      [58, 40],
    ], '#3d3a4a', 3);
    box(c, 38, 84, 34, 10, 4, GOLD, 2);
    c.fillStyle = GOLD;
    for (const x of [46, 64]) {
      c.beginPath();
      c.ellipse(x, 60, 4, 6, 0, 0, Math.PI * 2);
      c.fill();
    }
  }, 208);
}

function urns(): PropArt {
  return art(150, 140, (c) => {
    for (const [x, h, col] of [
      [42, 96, '#c47a4e'],
      [100, 76, '#b86b43'],
    ] as [number, number, string][]) {
      ellipsePath(c, x, 128 - h / 2, 30, h / 2);
      paint(c, col, L);
      box(c, x - 16, 128 - h - 8, 32, 14, 5, shade(col, -0.1), 3);
      c.strokeStyle = TURQ;
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(x - 26, 128 - h / 2);
      c.lineTo(x + 26, 128 - h / 2);
      c.stroke();
    }
  }, 128);
}

function scrollStand(hasPlans: boolean): () => PropArt {
  return () =>
    art(120, 170, (c) => {
      box(c, 34, 70, 52, 90, 6, LIME);
      box(c, 22, 60, 76, 16, 6, LIME_D, 3);
      box(c, 22, 150, 76, 14, 6, LIME_D, 3);
      if (hasPlans) {
        // the rolled-up pyramid plans, glowing faintly
        box(c, 20, 36, 80, 22, 10, '#e9dcb8');
        for (const x of [20, 100]) {
          ellipsePath(c, x, 47, 7, 13);
          paint(c, '#d8c49a', 3);
        }
        sparkle(c, 60, 28, 10, GOLD);
      }
    }, 162);
}

function stoneChest(): PropArt {
  return art(200, 140, (c) => {
    box(c, 16, 50, 168, 80, 10, '#5b7fb8');
    box(c, 8, 34, 184, 26, 10, '#6f93cc');
    c.fillStyle = GOLD;
    for (let x = 30; x < 180; x += 30) c.fillRect(x, 70, 14, 44);
    box(c, 88, 58, 24, 18, 5, GOLD, 3);
  }, 130);
}

function egyptLamp(): PropArt {
  return art(80, 190, (c) => {
    box(c, 34, 60, 12, 116, 4, '#c9a060', 3);
    box(c, 14, 170, 52, 12, 5, '#c9a060', 3);
    // a clay oil lamp with a little flame
    c.beginPath();
    c.moveTo(12, 56);
    c.quadraticCurveTo(40, 80, 68, 56);
    c.lineTo(60, 46);
    c.lineTo(20, 46);
    c.closePath();
    paint(c, '#c47a4e', 3);
    c.beginPath();
    c.moveTo(62, 44);
    c.quadraticCurveTo(76, 20, 66, 8);
    c.quadraticCurveTo(58, 26, 56, 44);
    c.closePath();
    paint(c, PAL.orange, 2.5);
    c.fillStyle = PAL.lamp;
    c.beginPath();
    c.ellipse(63, 32, 4, 8, 0.3, 0, Math.PI * 2);
    c.fill();
  }, 180);
}

export const EGYPT_PROPS: Record<string, () => PropArt> = {
  'bld-pyramid': pyramid(false),
  'bld-pyramid-done': pyramid(true),
  'prop-sphinx': sphinx,
  'bld-mastaba': mastaba,
  'bld-mudhouse-a': mudHouse('#d8c49a', '#8fae5a'),
  'bld-mudhouse-b': mudHouse('#e6d2a6', '#c9a060'),
  'bld-buildertent': builderTent,
  'prop-obelisk': obelisk,
  'prop-sled': stoneSled(false),
  'prop-capstone': stoneSled(true),
  'prop-blockpile': blockPile,
  'prop-baskets': basketPile,
  'prop-reeds': reeds,
  'prop-oven': breadOven,
  'prop-stall-egypt': egyptStall,
  'prop-reedboat': reedBoat,
  'prop-festivalfloor': festivalFloor,
  'prop-sphinxgate': sphinxGate,
  'prop-portalstone': portalStone,
};

export const EGYPT_FURNITURE: Record<string, () => PropArt> = {
  catstatue: catStatue,
  urns,
  scrollstand: scrollStand(true),
  'scrollstand-empty': scrollStand(false),
  stonechest: stoneChest,
  egyptlamp: egyptLamp,
};

export { NILE };
