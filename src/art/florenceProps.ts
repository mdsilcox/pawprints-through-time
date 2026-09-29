import { PAL, shade } from './palette';
import { makeCanvas, rrPath, circlePath, ellipsePath, paint, softShade, OUTLINE, sparkle } from './draw';
import type { PropArt } from './props';

/**
 * Renaissance Florence (~1500) in the house style: the cathedral's great dome, Maestra Lucia's
 * workshop, Fiorella's studio, the Duchess's palazzo, tall townhouses with terracotta roofs,
 * cypress trees, a well, the grocer's stall, a copper cooking pot, the court dance floor and a
 * bunny stuck on a high column — plus the furniture inside the workshop and the studio.
 */
const L = OUTLINE;
const CREAM = '#f3e6c4';
const OCHRE = '#e8b86a';
const TERRA = '#c96a4a';
const TERRA_D = '#a8543a';
const STONE = '#d8cdb8';
const GREEN_SH = '#5f8f5a';
const MARBLE = '#f4f1ea';

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

function poly(ctx: CanvasRenderingContext2D, pts: [number, number][], fill: string, lw = L) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  paint(ctx, fill, lw);
}

/** A tiled terracotta roof between two x's (a shallow gable seen from the front). */
function roof(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, h: number) {
  poly(ctx, [
    [x0 - 14, y + h],
    [(x0 + x1) / 2, y],
    [x1 + 14, y + h],
  ], TERRA);
  ctx.strokeStyle = TERRA_D;
  ctx.lineWidth = 2;
  for (let k = 1; k < 4; k++) {
    const yy = y + (h * k) / 4;
    const half = (((x1 - x0) / 2 + 14) * k) / 4;
    ctx.beginPath();
    ctx.moveTo((x0 + x1) / 2 - half, yy);
    ctx.lineTo((x0 + x1) / 2 + half, yy);
    ctx.stroke();
  }
}

function shutterWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, shutter = GREEN_SH, arched = false) {
  if (arched) {
    rrPath(ctx, x, y, w, h, [w / 2, w / 2, 3, 3]);
    paint(ctx, '#3d4a6a', 3);
  } else box(ctx, x, y, w, h, 4, '#3d4a6a', 3);
  box(ctx, x - w * 0.42, y, w * 0.4, h, 3, shutter, 2.5);
  box(ctx, x + w * 1.02, y, w * 0.4, h, 3, shutter, 2.5);
}

// ------------------------------------------------------------------ the cathedral and its great dome
function duomo(): PropArt {
  return art(1000, 860, (c) => {
    const base = 850;
    // the drum and the great dome
    box(c, 300, 300, 400, 140, 10, MARBLE);
    for (let x = 330; x < 690; x += 60) box(c, x, 330, 30, 80, 12, '#9fb9a0', 3);
    c.beginPath();
    c.moveTo(300, 310);
    c.quadraticCurveTo(310, 70, 500, 50);
    c.quadraticCurveTo(690, 70, 700, 310);
    c.closePath();
    paint(c, TERRA, L);
    c.strokeStyle = MARBLE;
    c.lineWidth = 9;
    for (const k of [-0.62, -0.25, 0.25, 0.62]) {
      c.beginPath();
      c.moveTo(500 + k * 200, 308);
      c.quadraticCurveTo(500 + k * 140, 110, 500, 56);
      c.stroke();
    }
    // the little lantern on top
    box(c, 470, 12, 60, 52, 8, MARBLE);
    poly(c, [
      [480, 14],
      [500, -2],
      [520, 14],
    ], '#f7c65a', 3);
    // the church front: striped marble (white, green and pink)
    box(c, 90, 430, 820, base - 430, 10, MARBLE);
    c.save();
    c.beginPath();
    c.rect(94, 434, 812, base - 438);
    c.clip();
    for (let x = 110; x < 900; x += 90) {
      c.fillStyle = '#9fb9a0';
      c.fillRect(x, 434, 14, base - 434);
      c.fillStyle = '#e9b9b0';
      c.fillRect(x + 40, 434, 10, base - 434);
    }
    c.restore();
    poly(c, [
      [300, 440],
      [500, 330],
      [700, 440],
    ], MARBLE);
    // the round rose window
    circlePath(c, 500, 410, 44);
    paint(c, '#6fb3e0', L);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.strokeStyle = MARBLE;
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(500, 410);
      c.lineTo(500 + Math.cos(a) * 44, 410 + Math.sin(a) * 44);
      c.stroke();
    }
    // three great doors
    for (const [x, w] of [
      [200, 100],
      [440, 120],
      [700, 100],
    ] as [number, number][]) {
      rrPath(c, x, base - 190, w, 190, [w / 2, w / 2, 0, 0]);
      paint(c, '#8a5a3a', L);
    }
  });
}

// ------------------------------------------------------------------ workshop, studio, palazzo, townhouses
function workshop(): PropArt {
  return art(540, 470, (c) => {
    const base = 462;
    box(c, 40, 150, 460, base - 150, 8, STONE);
    // rough stone blocks on the corners
    for (let y = 160; y < base - 10; y += 44) {
      box(c, 40, y, 44, 36, 4, shade(STONE, -0.08), 2.5);
      box(c, 456, y, 44, 36, 4, shade(STONE, -0.08), 2.5);
    }
    roof(c, 40, 500, 70, 90);
    shutterWindow(c, 130, 200, 60, 70);
    shutterWindow(c, 350, 200, 60, 70);
    // the wide arched workshop door
    rrPath(c, 200, 300, 140, base - 300, [70, 70, 0, 0]);
    paint(c, '#6d4a30', L);
    c.strokeStyle = '#4a3b35';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(270, 304);
    c.lineTo(270, base);
    c.stroke();
    // a gear sign hanging from an iron bracket
    c.strokeStyle = PAL.ink;
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(500, 190);
    c.lineTo(530, 190);
    c.stroke();
    c.save();
    c.translate(520, 232);
    for (let i = 0; i < 8; i++) {
      c.rotate(Math.PI / 4);
      box(c, -6, -34, 12, 14, 3, '#d9a23a', 2);
    }
    c.restore();
    circlePath(c, 520, 232, 24);
    paint(c, '#f7c65a', 3);
    circlePath(c, 520, 232, 8);
    paint(c, '#6d4a30', 2.5);
    // a little flying-machine model on the roof ridge
    c.strokeStyle = PAL.woodDark;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(270, 70);
    c.lineTo(270, 40);
    c.stroke();
    poly(c, [
      [200, 40],
      [270, 26],
      [340, 40],
      [270, 48],
    ], '#fbf6ea', 2.5);
  });
}

function studio(): PropArt {
  return art(440, 440, (c) => {
    const base = 432;
    box(c, 30, 130, 380, base - 130, 8, OCHRE);
    roof(c, 30, 410, 50, 84);
    shutterWindow(c, 90, 180, 52, 64, '#6fa3c9');
    shutterWindow(c, 290, 180, 52, 64, '#6fa3c9');
    // a little balcony with flower boxes
    box(c, 250, 250, 150, 16, 5, '#8a5a3a', 3);
    for (const x of [262, 312, 362]) {
      box(c, x, 236, 30, 16, 4, TERRA, 2.5);
      c.fillStyle = PAL.pink;
      c.beginPath();
      c.arc(x + 8, 234, 6, 0, Math.PI * 2);
      c.arc(x + 22, 232, 6, 0, Math.PI * 2);
      c.fill();
    }
    // the door, with a painter's palette sign above
    rrPath(c, 150, 300, 90, base - 300, [45, 45, 0, 0]);
    paint(c, '#4a6a8a', L);
    c.beginPath();
    c.ellipse(195, 270, 46, 26, 0, 0, Math.PI * 2);
    paint(c, '#f4ede4', 3);
    for (const [x, y, col] of [
      [175, 262, PAL.red],
      [195, 256, PAL.blue],
      [215, 262, PAL.gold],
      [205, 280, PAL.green],
    ] as [number, number, string][]) {
      c.fillStyle = col;
      c.beginPath();
      c.arc(x, y, 7, 0, Math.PI * 2);
      c.fill();
    }
  });
}

function palazzo(): PropArt {
  return art(740, 520, (c) => {
    const base = 512;
    box(c, 30, 110, 680, base - 110, 8, '#e0d2b4');
    // rusticated stone on the ground floor
    for (let y = 330; y < base; y += 40)
      for (let x = 34 + ((y / 40) % 2) * 40; x < 706; x += 80) box(c, x, y, 76, 36, 6, shade('#e0d2b4', -0.06), 2);
    box(c, 20, 96, 700, 26, 8, '#c9b894');
    // arched windows upstairs
    for (let x = 90; x < 680; x += 120) shutterWindow(c, x, 160, 50, 90, '#6f3fa0', true);
    // banners and the Duchess's crest
    for (const x of [200, 540]) {
      c.fillStyle = '#6f3fa0';
      c.beginPath();
      c.moveTo(x - 24, 270);
      c.lineTo(x + 24, 270);
      c.lineTo(x + 24, 340);
      c.lineTo(x, 326);
      c.lineTo(x - 24, 340);
      c.closePath();
      c.fill();
      c.strokeStyle = PAL.ink;
      c.lineWidth = 3;
      c.stroke();
      circlePath(c, x, 296, 10);
      paint(c, '#f7c65a', 2.5);
    }
    // the great gate
    rrPath(c, 300, 350, 140, base - 350, [70, 70, 0, 0]);
    paint(c, '#6d4a30', L);
    circlePath(c, 370, 90, 30);
    paint(c, '#f7c65a', 3);
    sparkle(c, 370, 90, 10, '#ffffff');
  });
}

function townhouse(wall: string, shutter: string): () => PropArt {
  return () =>
    art(340, 450, (c) => {
      const base = 442;
      box(c, 30, 110, 280, base - 110, 8, wall);
      roof(c, 30, 310, 40, 74);
      for (const y of [150, 250]) {
        shutterWindow(c, 80, y, 44, 60, shutter);
        shutterWindow(c, 210, y, 44, 60, shutter);
      }
      rrPath(c, 140, 350, 70, base - 350, [35, 35, 0, 0]);
      paint(c, '#6d4a30', L);
      // a pot of red geraniums on the step
      box(c, 230, base - 30, 34, 26, 5, TERRA, 2.5);
      c.fillStyle = PAL.red;
      c.beginPath();
      c.arc(240, base - 34, 7, 0, Math.PI * 2);
      c.arc(254, base - 36, 7, 0, Math.PI * 2);
      c.fill();
    });
}

// ------------------------------------------------------------------ props
function cypress(): PropArt {
  return art(110, 330, (c) => {
    box(c, 48, 280, 14, 44, 4, PAL.woodDark, 3);
    c.beginPath();
    c.moveTo(55, 12);
    c.bezierCurveTo(98, 110, 92, 230, 55, 292);
    c.bezierCurveTo(18, 230, 12, 110, 55, 12);
    c.closePath();
    paint(c, '#3f7a4a', L);
    c.strokeStyle = 'rgba(255,255,255,0.18)';
    c.lineWidth = 3;
    for (let y = 70; y < 270; y += 36) {
      c.beginPath();
      c.moveTo(40, y);
      c.quadraticCurveTo(55, y - 10, 66, y);
      c.stroke();
    }
  }, 322);
}

function well(): PropArt {
  return art(170, 200, (c) => {
    box(c, 20, 110, 130, 76, 20, STONE);
    ellipsePath(c, 85, 112, 66, 18);
    paint(c, '#3d4a6a', L);
    c.strokeStyle = PAL.ink;
    c.lineWidth = 7;
    for (const x of [34, 136]) {
      c.beginPath();
      c.moveTo(x, 112);
      c.lineTo(x, 26);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(26, 30);
    c.quadraticCurveTo(85, 0, 144, 30);
    c.stroke();
    c.strokeStyle = '#8a5a3a';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(85, 18);
    c.lineTo(85, 76);
    c.stroke();
    box(c, 70, 72, 30, 22, 5, '#8a5a3a', 3);
  }, 192);
}

function florenceStall(): PropArt {
  return art(260, 230, (c) => {
    c.strokeStyle = PAL.woodDark;
    c.lineWidth = 6;
    for (const x of [30, 230]) {
      c.beginPath();
      c.moveTo(x, 214);
      c.lineTo(x, 60);
      c.stroke();
    }
    poly(c, [
      [14, 70],
      [246, 70],
      [234, 40],
      [26, 40],
    ], '#fbf6ea');
    c.fillStyle = '#4a8f4a';
    for (let x = 30; x < 240; x += 40) c.fillRect(x, 44, 16, 24);
    box(c, 20, 140, 220, 70, 8, PAL.woodLight);
    // basil pots, a sack of white beans, lemons
    for (const x of [50, 84]) {
      box(c, x - 14, 116, 28, 24, 5, TERRA, 2.5);
      c.fillStyle = PAL.leaf;
      c.beginPath();
      c.arc(x - 6, 110, 9, 0, Math.PI * 2);
      c.arc(x + 6, 108, 9, 0, Math.PI * 2);
      c.arc(x, 100, 9, 0, Math.PI * 2);
      c.fill();
    }
    box(c, 118, 106, 50, 36, 12, '#d9c9a6', 2.5);
    c.fillStyle = '#fbf6ea';
    for (let k = 0; k < 6; k++) {
      c.beginPath();
      c.ellipse(128 + (k % 3) * 14, 112 + Math.floor(k / 3) * 7, 5, 3.5, 0, 0, Math.PI * 2);
      c.fill();
    }
    for (const x of [192, 212, 202]) {
      ellipsePath(c, x, x === 202 ? 118 : 128, 11, 8);
      paint(c, '#f7e05a', 2.5);
    }
  }, 214);
}

function firePot(): PropArt {
  return art(170, 180, (c) => {
    // a tripod over a little fire, with a copper pot
    c.strokeStyle = PAL.ink;
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(30, 168);
    c.lineTo(85, 30);
    c.lineTo(140, 168);
    c.moveTo(85, 30);
    c.lineTo(85, 80);
    c.stroke();
    ellipsePath(c, 85, 118, 44, 34);
    paint(c, '#c97a3a', L);
    ellipsePath(c, 85, 92, 40, 10);
    paint(c, '#9fe0c0', 3);
    for (const [x, col] of [
      [70, PAL.red],
      [86, PAL.orange],
      [100, PAL.gold],
    ] as [number, string][]) {
      c.beginPath();
      c.moveTo(x - 10, 170);
      c.quadraticCurveTo(x - 8, 154, x, 142);
      c.quadraticCurveTo(x + 8, 154, x + 10, 170);
      c.closePath();
      paint(c, col, 2);
    }
  }, 172);
}

function courtFloor(): PropArt {
  const cv = makeCanvas(340, 200);
  const c = cv.ctx;
  ellipsePath(c, 170, 100, 164, 92);
  paint(c, MARBLE, 4);
  ellipsePath(c, 170, 100, 134, 72);
  c.lineWidth = 6;
  c.strokeStyle = '#6f3fa0';
  c.stroke();
  // an eight-pointed star in the middle
  c.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 8;
    const r = i % 2 ? 22 : 54;
    c.lineTo(170 + Math.cos(a) * r, 100 + Math.sin(a) * r * 0.62);
  }
  c.closePath();
  paint(c, '#f7c65a', 3);
  return { cv, ox: 0.5, oy: 0.5 };
}

function ledge(withBunny: boolean): () => PropArt {
  return () =>
    art(130, 330, (c) => {
      // a tall stone column with a little platform on top
      box(c, 40, 90, 50, 226, 6, STONE);
      c.strokeStyle = 'rgba(120,100,70,0.35)';
      c.lineWidth = 2;
      for (const x of [55, 75]) {
        c.beginPath();
        c.moveTo(x, 96);
        c.lineTo(x, 310);
        c.stroke();
      }
      box(c, 22, 80, 86, 18, 5, shade(STONE, -0.06), 3);
      box(c, 26, 306, 78, 18, 5, shade(STONE, -0.06), 3);
      if (withBunny) {
        // Twirl, in a frilly ruff, stuck on top
        const fur = '#9c8f86';
        for (const [x, a] of [
          [56, -0.2],
          [74, 0.2],
        ] as [number, number][]) {
          c.save();
          c.translate(x, 30);
          c.rotate(a);
          ellipsePath(c, 0, 0, 7, 18);
          paint(c, fur, 2.5);
          c.restore();
        }
        ellipsePath(c, 65, 70, 22, 14);
        paint(c, fur, 3);
        circlePath(c, 65, 50, 16);
        paint(c, fur, 3);
        c.fillStyle = '#ffffff';
        c.strokeStyle = PAL.ink;
        c.lineWidth = 2;
        c.beginPath();
        c.ellipse(65, 64, 18, 5, 0, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.fillStyle = PAL.ink;
        for (const x of [59, 71]) {
          c.beginPath();
          c.arc(x, 48, 2.2, 0, Math.PI * 2);
          c.fill();
        }
      }
    }, 322);
}

function bridge(): PropArt {
  return art(520, 240, (c) => {
    // a stone bridge with little shops on top (like Florence's old bridge)
    box(c, 10, 110, 500, 50, 8, STONE);
    for (const x of [60, 200, 340]) {
      rrPath(c, x, 150, 120, 80, [60, 60, 0, 0]);
      paint(c, '#4f86a8', L);
    }
    for (let x = 20; x < 500; x += 96) {
      box(c, x, 40, 86, 72, 6, [OCHRE, '#e9c9a0', '#d9a36a'][Math.floor(x / 96) % 3], 3);
      poly(c, [
        [x - 6, 44],
        [x + 43, 16],
        [x + 92, 44],
      ], TERRA, 3);
      box(c, x + 30, 70, 26, 40, 4, '#6d4a30', 2.5);
    }
  }, 232);
}

// ------------------------------------------------------------------ inside the workshop and the studio
function mechLion(awake: boolean): () => PropArt {
  return () =>
    art(300, 230, (c) => {
      const brass = '#d9a23a';
      // legs
      for (const x of [60, 100, 190, 230]) box(c, x, 150, 26, 66, 8, shade(brass, -0.08));
      // body (riveted brass plates)
      box(c, 40, 90, 220, 80, 36, brass);
      c.fillStyle = shade(brass, -0.3);
      for (let x = 70; x < 240; x += 30) {
        c.beginPath();
        c.arc(x, 110, 3, 0, Math.PI * 2);
        c.arc(x, 150, 3, 0, Math.PI * 2);
        c.fill();
      }
      // a little panel with a gear lock
      box(c, 130, 108, 44, 40, 6, awake ? '#f7c65a' : '#8a6a3a', 3);
      circlePath(c, 152, 128, 10);
      paint(c, awake ? '#ffffff' : '#d9a23a', 2);
      // tail
      c.strokeStyle = PAL.ink;
      c.lineWidth = 8;
      c.beginPath();
      c.moveTo(256, 110);
      c.quadraticCurveTo(292, awake ? 60 : 120, 280, awake ? 40 : 150);
      c.stroke();
      c.strokeStyle = brass;
      c.lineWidth = 4;
      c.stroke();
      // head with a copper mane
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        circlePath(c, 60 + Math.cos(a) * 42, 80 + Math.sin(a) * 42, 16);
        paint(c, '#c97a3a', 2.5);
      }
      circlePath(c, 60, 80, 38);
      paint(c, brass, L);
      c.fillStyle = PAL.ink;
      if (awake) {
        for (const x of [46, 74]) {
          c.beginPath();
          c.arc(x, 74, 5, 0, Math.PI * 2);
          c.fill();
        }
        c.strokeStyle = PAL.ink;
        c.lineWidth = 3.5;
        c.beginPath();
        c.arc(60, 92, 12, 0.1 * Math.PI, 0.9 * Math.PI);
        c.stroke();
        sparkle(c, 110, 40, 12, '#ffffff');
      } else {
        c.strokeStyle = PAL.ink;
        c.lineWidth = 3.5;
        for (const x of [46, 74]) {
          c.beginPath();
          c.moveTo(x - 6, 74);
          c.lineTo(x + 6, 74);
          c.stroke();
        }
      }
    }, 222);
}

function workbench(): PropArt {
  return art(230, 170, (c) => {
    for (const x of [28, 188]) box(c, x, 80, 16, 82, 4, PAL.woodDark);
    box(c, 10, 60, 210, 30, 8, PAL.wood);
    // tools and a drawing of a flying machine
    box(c, 30, 40, 70, 22, 4, '#fbf6ea', 2.5);
    c.strokeStyle = '#8a6a3a';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(38, 52);
    c.quadraticCurveTo(65, 40, 92, 52);
    c.stroke();
    box(c, 130, 30, 12, 32, 3, '#8a8a95', 2.5);
    box(c, 124, 26, 24, 10, 3, PAL.woodDark, 2.5);
    circlePath(c, 180, 46, 14);
    paint(c, '#d9a23a', 2.5);
  }, 162);
}

function flyingMachine(): PropArt {
  return art(220, 120, (c) => {
    // a model flying machine hanging on the wall (bat-like wings of cloth and wood)
    c.strokeStyle = PAL.ink;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(110, 0);
    c.lineTo(110, 36);
    c.stroke();
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(110, 50);
      c.quadraticCurveTo(110 + s * 60, 20, 110 + s * 104, 44);
      c.quadraticCurveTo(110 + s * 70, 60, 110 + s * 80, 80);
      c.quadraticCurveTo(110 + s * 40, 66, 110, 70);
      c.closePath();
      paint(c, '#fbf6ea', 3);
      c.strokeStyle = PAL.woodDark;
      c.lineWidth = 2;
      for (const k of [0.35, 0.65]) {
        c.beginPath();
        c.moveTo(110, 56);
        c.lineTo(110 + s * 100 * k, 36 + 30 * k);
        c.stroke();
      }
    }
    box(c, 100, 40, 20, 50, 6, PAL.wood, 2.5);
  }, 110);
}

function fresco(mended: boolean): () => PropArt {
  return () =>
    art(300, 170, (c) => {
      box(c, 6, 6, 288, 150, 8, '#f4e8cc');
      // a painted sky, hills and a little lion
      c.save();
      rrPath(c, 26, 26, 248, 110, 4);
      c.clip();
      c.fillStyle = '#bfe0f0';
      c.fillRect(26, 26, 248, 110);
      c.fillStyle = '#9fcf8a';
      c.beginPath();
      c.ellipse(90, 136, 110, 36, 0, 0, Math.PI * 2);
      c.ellipse(230, 140, 100, 30, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#d9a23a';
      c.beginPath();
      c.ellipse(160, 100, 24, 14, 0, 0, Math.PI * 2);
      c.arc(140, 90, 12, 0, Math.PI * 2);
      c.fill();
      c.restore();
      // the painted border: tiles of colour and motif (smudged until it's mended)
      const cols = [PAL.red, PAL.blue, PAL.gold, PAL.green, PAL.purple];
      for (let i = 0; i < 12; i++) {
        const x = 12 + i * 23.5;
        const smudged = !mended && i >= 7 && i <= 10;
        box(c, x, 10, 18, 14, 3, smudged ? '#b8ab94' : cols[i % cols.length], 1.5);
        box(c, x, 142, 18, 14, 3, smudged ? '#b8ab94' : cols[(i + 2) % cols.length], 1.5);
      }
      if (!mended) {
        c.fillStyle = 'rgba(140, 120, 100, 0.35)';
        c.beginPath();
        c.ellipse(210, 30, 60, 22, 0.2, 0, Math.PI * 2);
        c.fill();
      }
    }, 164);
}

function easel(): PropArt {
  return art(130, 220, (c) => {
    c.strokeStyle = PAL.woodDark;
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(30, 212);
    c.lineTo(65, 20);
    c.lineTo(100, 212);
    c.moveTo(65, 20);
    c.lineTo(65, 200);
    c.stroke();
    box(c, 20, 40, 90, 80, 4, '#fbf6ea', 3);
    c.fillStyle = PAL.blue;
    c.fillRect(26, 46, 78, 34);
    c.fillStyle = PAL.green;
    c.fillRect(26, 80, 78, 34);
    c.fillStyle = PAL.gold;
    c.beginPath();
    c.arc(84, 60, 8, 0, Math.PI * 2);
    c.fill();
    box(c, 22, 122, 86, 10, 3, PAL.wood, 2.5);
  }, 212);
}

function canvases(): PropArt {
  return art(160, 150, (c) => {
    for (const [x, y, w, h, col] of [
      [14, 30, 90, 110, '#e9dcc0'],
      [40, 20, 96, 118, '#f4ede4'],
      [70, 44, 76, 96, '#dcd0b4'],
    ] as [number, number, number, number, string][]) {
      box(c, x, y, w, h, 4, col, 3);
      c.strokeStyle = PAL.woodDark;
      c.lineWidth = 3;
      c.strokeRect(x + 6, y + 6, w - 12, h - 12);
    }
  }, 142);
}

function pigments(): PropArt {
  return art(150, 120, (c) => {
    box(c, 10, 70, 130, 40, 6, PAL.wood);
    const cols = [PAL.red, PAL.blue, PAL.gold, PAL.green, PAL.purple];
    cols.forEach((col, i) => {
      box(c, 16 + i * 25, 36, 22, 36, 6, '#fbf6ea', 2.5);
      c.fillStyle = col;
      c.fillRect(19 + i * 25, 50, 16, 18);
    });
  }, 112);
}

function globe(): PropArt {
  return art(110, 200, (c) => {
    box(c, 30, 176, 50, 14, 5, PAL.woodDark, 3);
    box(c, 50, 120, 10, 60, 3, PAL.wood, 3);
    c.strokeStyle = '#d9a23a';
    c.lineWidth = 6;
    c.beginPath();
    c.arc(55, 74, 48, -0.5 * Math.PI, 0.5 * Math.PI);
    c.stroke();
    circlePath(c, 55, 74, 40);
    paint(c, '#9fd6ec', L);
    c.fillStyle = '#e8c98f';
    c.beginPath();
    c.ellipse(46, 60, 16, 12, 0.4, 0, Math.PI * 2);
    c.ellipse(66, 90, 14, 10, -0.3, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(74,59,53,0.35)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.ellipse(55, 74, 40, 14, 0, 0, Math.PI * 2);
    c.moveTo(55, 34);
    c.lineTo(55, 114);
    c.stroke();
  }, 190);
}

export const FLORENCE_PROPS: Record<string, () => PropArt> = {
  'bld-duomo': duomo,
  'bld-workshop': workshop,
  'bld-studio': studio,
  'bld-palazzo': palazzo,
  'bld-townhouse-a': townhouse('#e9c9a0', GREEN_SH),
  'bld-townhouse-b': townhouse('#f0d7b0', '#6f3fa0'),
  'bld-townhouse-c': townhouse('#e3b98f', '#4a6a8a'),
  'tree-cypress': cypress,
  'prop-well': well,
  'prop-stall-florence': florenceStall,
  'prop-firepot': firePot,
  'prop-courtfloor': courtFloor,
  'prop-column': ledge(false),
  'prop-column-twirl': ledge(true),
  'prop-bridge': bridge,
};

export const FLORENCE_FURNITURE: Record<string, () => PropArt> = {
  mechlion: mechLion(false),
  'mechlion-awake': mechLion(true),
  workbench,
  flyingmachine: flyingMachine,
  fresco: fresco(false),
  'fresco-mended': fresco(true),
  easel,
  canvases,
  pigments,
  globe,
};
