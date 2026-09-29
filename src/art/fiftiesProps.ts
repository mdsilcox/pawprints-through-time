import { PAL } from './palette';
import { makeCanvas, rrPath, circlePath, paint, softShade, OUTLINE, sparkle } from './draw';
import type { PropArt } from './props';

/**
 * 1950s America: Maple Street's buildings (Starlight Lanes, the Rock-a-Roll Diner, Spin City
 * Records, pastel houses), shiny cars and the milk truck, plus the furniture inside the lanes
 * and the diner (bowling lanes, the trophy case, a jukebox, booths and the counter).
 */
const L = OUTLINE;
const CHROME = '#d9dde3';
const TEAL = '#6ec9c0';
const CHERRY = '#e0555f';

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

function glassWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lit = true) {
  box(ctx, x, y, w, h, 8, lit ? '#fff1b8' : '#a9d7ee');
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 4);
  ctx.lineTo(x + w / 2, y + h - 4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(x + 8, y + 8, 6, h - 16);
}

function glassDoor(ctx: CanvasRenderingContext2D, cx: number, base: number, w: number, h: number, frame: string) {
  box(ctx, cx - w / 2, base - h, w, h, 6, frame);
  box(ctx, cx - w / 2 + 8, base - h + 8, w / 2 - 12, h - 16, 4, '#bfe6f5', 3);
  box(ctx, cx + 4, base - h + 8, w / 2 - 12, h - 16, 4, '#bfe6f5', 3);
}

function neonText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string) {
  ctx.font = `700 ${size}px Fredoka, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.5;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.strokeText(text, x, y);
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fill: string) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  paint(ctx, fill, L);
}

// ------------------------------------------------------------------ buildings
function starlightLanes(): PropArt {
  return art(660, 470, (ctx) => {
    const base = 462;
    box(ctx, 40, 230, 580, base - 230, 10, '#f4ead8');
    // a swooping "boomerang" roof
    ctx.beginPath();
    ctx.moveTo(20, 238);
    ctx.lineTo(330, 196);
    ctx.lineTo(640, 238);
    ctx.lineTo(640, 258);
    ctx.lineTo(330, 222);
    ctx.lineTo(20, 258);
    ctx.closePath();
    paint(ctx, TEAL, L);
    // the sign pylon with its star
    box(ctx, 470, 40, 64, 200, 12, CHERRY);
    ctx.save();
    ctx.translate(502, 140);
    ctx.rotate(Math.PI / 2);
    neonText(ctx, 'LANES', 0, 0, 38, '#fff6a8');
    ctx.restore();
    star(ctx, 502, 34, 32, '#f7c65a');
    box(ctx, 110, 262, 300, 60, 18, PAL.navy);
    neonText(ctx, 'STARLIGHT', 260, 292, 40, '#7ff0ff');
    for (const x of [70, 440]) glassWindow(ctx, x, 340, 110, 80);
    glassDoor(ctx, 300, base, 120, 120, '#c9ced6');
    // a big pin by the door
    ctx.beginPath();
    ctx.moveTo(400, base - 2);
    ctx.bezierCurveTo(372, base - 2, 368, base - 56, 388, base - 74);
    ctx.bezierCurveTo(378, base - 92, 384, base - 118, 400, base - 118);
    ctx.bezierCurveTo(416, base - 118, 422, base - 92, 412, base - 74);
    ctx.bezierCurveTo(432, base - 56, 428, base - 2, 400, base - 2);
    ctx.closePath();
    paint(ctx, '#ffffff', 4);
    ctx.fillStyle = CHERRY;
    ctx.fillRect(386, base - 88, 28, 6);
  });
}

function diner(): PropArt {
  return art(600, 400, (ctx) => {
    const base = 392;
    // the railway-car body: rounded ends, chrome and a cherry-red band
    rrPath(ctx, 20, 180, 560, base - 180, 70);
    ctx.fillStyle = CHROME;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#eef1f4';
    for (let y = 190; y < base; y += 22) ctx.fillRect(0, y, 600, 8);
    ctx.fillStyle = CHERRY;
    ctx.fillRect(0, 318, 600, 26);
    ctx.restore();
    rrPath(ctx, 20, 180, 560, base - 180, 70);
    paint(ctx, 'rgba(0,0,0,0)', L);
    for (const x of [70, 160, 380, 470]) glassWindow(ctx, x, 214, 72, 84);
    glassDoor(ctx, 300, base, 96, 150, CHERRY);
    // the roof sign
    box(ctx, 110, 104, 380, 66, 24, '#fff4e0');
    neonText(ctx, 'ROCK-A-ROLL DINER', 300, 138, 36, CHERRY);
    for (const x of [150, 450]) {
      ctx.strokeStyle = PAL.ink;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x, 170);
      ctx.lineTo(x, 184);
      ctx.stroke();
    }
    box(ctx, 390, 230, 70, 30, 10, '#2a2233', 3);
    neonText(ctx, 'OPEN', 425, 246, 20, '#ff8fd1');
  });
}

function recordShop(): PropArt {
  return art(380, 380, (ctx) => {
    const base = 372;
    box(ctx, 30, 190, 320, base - 190, 10, '#f7c9d9');
    // striped awning
    ctx.beginPath();
    ctx.moveTo(18, 250);
    ctx.lineTo(362, 250);
    ctx.lineTo(346, 214);
    ctx.lineTo(34, 214);
    ctx.closePath();
    paint(ctx, TEAL, L);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#fff4e0';
    for (let x = 34; x < 362; x += 40) ctx.fillRect(x, 210, 20, 44);
    ctx.restore();
    // the giant record on the roof
    circlePath(ctx, 190, 110, 92);
    paint(ctx, '#2a2233', L);
    ctx.strokeStyle = '#4a4458';
    ctx.lineWidth = 3;
    for (const r of [72, 56, 42]) {
      ctx.beginPath();
      ctx.arc(190, 110, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    circlePath(ctx, 190, 110, 28);
    paint(ctx, CHERRY, 3);
    circlePath(ctx, 190, 110, 5);
    paint(ctx, '#fff4e0', 2);
    box(ctx, 90, 176, 200, 34, 10, '#fff4e0', 3);
    ctx.fillStyle = PAL.ink;
    ctx.font = '700 22px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPIN CITY RECORDS', 190, 194);
    glassWindow(ctx, 60, 270, 90, 70);
    glassDoor(ctx, 250, base, 90, 110, TEAL);
  });
}

function pastelHouse(color: string, roof: string): () => PropArt {
  return () =>
    art(360, 330, (ctx) => {
      const base = 322;
      box(ctx, 30, 170, 300, base - 170, 8, color);
      ctx.beginPath();
      ctx.moveTo(10, 178);
      ctx.lineTo(180, 92);
      ctx.lineTo(350, 178);
      ctx.closePath();
      paint(ctx, roof, L);
      box(ctx, 250, 104, 30, 60, 4, '#c9a27e', 3); // chimney
      for (const x of [60, 210]) glassWindow(ctx, x, 200, 80, 60, false);
      box(ctx, 150, base - 100, 60, 100, 8, '#fff4e0');
      circlePath(ctx, 196, base - 50, 5);
      paint(ctx, PAL.gold, 2);
      // a little picket fence
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = PAL.ink;
      ctx.lineWidth = 2.5;
      for (let x = 12; x < 150; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, base);
        ctx.lineTo(x, base - 34);
        ctx.lineTo(x + 5, base - 42);
        ctx.lineTo(x + 10, base - 34);
        ctx.lineTo(x + 10, base);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    });
}

function car(color: string): () => PropArt {
  return () =>
    art(250, 140, (ctx) => {
      // body with little tail fins
      ctx.beginPath();
      ctx.moveTo(18, 96);
      ctx.quadraticCurveTo(14, 64, 46, 60);
      ctx.lineTo(70, 34);
      ctx.quadraticCurveTo(120, 18, 168, 34);
      ctx.lineTo(196, 56);
      ctx.lineTo(234, 48);
      ctx.quadraticCurveTo(242, 78, 232, 100);
      ctx.closePath();
      paint(ctx, color, L);
      box(ctx, 80, 40, 40, 22, 6, '#bfe6f5', 3);
      box(ctx, 126, 40, 44, 22, 6, '#bfe6f5', 3);
      ctx.fillStyle = CHROME;
      ctx.fillRect(18, 90, 214, 8);
      for (const x of [62, 186]) {
        circlePath(ctx, x, 104, 20);
        paint(ctx, '#2a2233', L);
        circlePath(ctx, x, 104, 11);
        paint(ctx, '#ffffff', 2);
      }
    }, 128);
}

function milkTruck(): PropArt {
  return art(270, 190, (ctx) => {
    box(ctx, 20, 30, 170, 120, 16, '#fbf6ec');
    box(ctx, 186, 70, 66, 80, 14, '#8fd0e6');
    box(ctx, 200, 82, 38, 30, 6, '#bfe6f5', 3);
    ctx.fillStyle = '#3f8ac4';
    ctx.font = '700 34px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MILK', 105, 80);
    ctx.font = '700 15px Fredoka, sans-serif';
    ctx.fillText('fresh every morning', 105, 112);
    for (const x of [64, 210]) {
      circlePath(ctx, x, 156, 22);
      paint(ctx, '#2a2233', L);
      circlePath(ctx, x, 156, 10);
      paint(ctx, CHROME, 2);
    }
    // a crate of bottles on the back step
    box(ctx, 26, 128, 50, 26, 4, '#c98d55', 3);
    ctx.fillStyle = '#ffffff';
    for (const x of [33, 45, 57]) ctx.fillRect(x, 112, 8, 18);
  }, 178);
}

// ------------------------------------------------------------------ inside the lanes and the diner
function laneStrip(): PropArt {
  return art(130, 420, (ctx) => {
    box(ctx, 10, 10, 110, 400, 8, '#e0b07a');
    ctx.strokeStyle = '#c9955f';
    ctx.lineWidth = 2;
    for (let x = 26; x < 120; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.lineTo(x, 404);
      ctx.stroke();
    }
    // target arrows
    ctx.fillStyle = '#8a5a3a';
    for (const x of [35, 65, 95]) {
      ctx.beginPath();
      ctx.moveTo(x, 250);
      ctx.lineTo(x - 7, 264);
      ctx.lineTo(x + 7, 264);
      ctx.closePath();
      ctx.fill();
    }
    // pins at the far end
    for (const [x, y] of [
      [65, 70],
      [55, 58],
      [75, 58],
      [45, 46],
      [65, 46],
      [85, 46],
      [35, 34],
      [55, 34],
      [75, 34],
      [95, 34],
    ]) {
      circlePath(ctx, x, y, 6);
      paint(ctx, '#ffffff', 2);
    }
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(10, 380, 110, 4);
  });
}

function ballReturn(): PropArt {
  return art(130, 110, (ctx) => {
    box(ctx, 14, 40, 102, 56, 20, '#6d6a74');
    ctx.fillStyle = '#4a4458';
    ctx.fillRect(24, 50, 82, 10);
    for (const [x, c] of [
      [36, '#6f5fd0'],
      [65, CHERRY],
      [94, '#7cc47f'],
    ] as const) {
      circlePath(ctx, x, 42, 14);
      paint(ctx, c, 3);
    }
  });
}

function shoeCounter(): PropArt {
  return art(280, 170, (ctx) => {
    box(ctx, 10, 40, 260, 70, 8, '#8fd0e6');
    // cubbies of shoes
    for (let i = 0; i < 6; i++) {
      box(ctx, 20 + i * 41, 50, 36, 26, 4, '#f4ead8', 2);
      ctx.fillStyle = i % 2 ? CHERRY : PAL.navy;
      ctx.fillRect(26 + i * 41, 64, 24, 8);
    }
    box(ctx, 0, 110, 280, 50, 10, CHERRY);
    ctx.fillStyle = '#fff4e0';
    ctx.font = '700 22px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SHOES', 140, 136);
  });
}

function trophyCase(withSand: boolean): () => PropArt {
  return () =>
    art(170, 220, (ctx) => {
      box(ctx, 12, 30, 146, 182, 10, '#c98d55');
      box(ctx, 24, 42, 122, 110, 6, 'rgba(191,230,245,0.55)', 3);
      // the Starlight Cup
      ctx.beginPath();
      ctx.moveTo(60, 70);
      ctx.lineTo(110, 70);
      ctx.quadraticCurveTo(108, 112, 85, 118);
      ctx.quadraticCurveTo(62, 112, 60, 70);
      ctx.closePath();
      paint(ctx, PAL.gold, 3);
      box(ctx, 72, 124, 26, 18, 3, PAL.goldDark, 3);
      star(ctx, 85, 62, 13, '#fff6a8');
      if (withSand) {
        ctx.fillStyle = 'rgba(165, 139, 214, 0.9)';
        ctx.beginPath();
        ctx.ellipse(85, 92, 14, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        sparkle(ctx, 100, 80, 9, '#ffffff');
        sparkle(ctx, 70, 100, 6, '#ffffff');
      }
      ctx.fillStyle = '#fff4e0';
      ctx.font = '700 15px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STARLIGHT CUP', 85, 178);
    });
}

function jukebox(): PropArt {
  return art(130, 190, (ctx) => {
    rrPath(ctx, 12, 20, 106, 164, 50);
    ctx.fillStyle = '#c98d55';
    ctx.fill();
    ctx.save();
    ctx.clip();
    const bands = ['#e46a6a', '#f7c65a', '#7cc47f', '#6fb3e0', '#a58bd6'];
    bands.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(65, 76, 44 - i * 7, Math.PI, 0);
      ctx.stroke();
    });
    ctx.restore();
    rrPath(ctx, 12, 20, 106, 164, 50);
    paint(ctx, 'rgba(0,0,0,0)', L);
    box(ctx, 30, 96, 70, 40, 6, '#fff1b8', 3);
    circlePath(ctx, 65, 116, 14);
    paint(ctx, '#2a2233', 2);
    box(ctx, 30, 144, 70, 30, 6, '#e0555f', 3);
  });
}

function booth(): PropArt {
  return art(210, 150, (ctx) => {
    box(ctx, 10, 20, 190, 50, 18, CHERRY);
    box(ctx, 60, 60, 90, 40, 8, '#fff4e0');
    ctx.fillStyle = '#f7c9d9';
    ctx.fillRect(84, 44, 12, 22); // a milkshake
    circlePath(ctx, 90, 42, 7);
    paint(ctx, '#ffffff', 2);
    box(ctx, 10, 96, 190, 44, 18, CHERRY);
  });
}

function dinerCounter(): PropArt {
  return art(420, 150, (ctx) => {
    box(ctx, 10, 30, 400, 44, 8, '#f4ead8');
    box(ctx, 10, 66, 400, 30, 6, CHERRY);
    ctx.fillStyle = CHROME;
    ctx.fillRect(10, 70, 400, 5);
    for (let x = 40; x < 410; x += 70) {
      ctx.fillStyle = CHROME;
      ctx.fillRect(x - 3, 108, 6, 30);
      circlePath(ctx, x, 106, 16);
      paint(ctx, CHERRY, 3);
    }
    // a pie stand and a soda glass
    circlePath(ctx, 70, 26, 18);
    paint(ctx, 'rgba(191,230,245,0.7)', 3);
    box(ctx, 330, 6, 18, 30, 4, '#f7c9d9', 2);
  });
}

function pantryDoor(): PropArt {
  return art(120, 200, (ctx) => {
    box(ctx, 16, 20, 88, 172, 8, '#8fd0e6');
    box(ctx, 30, 36, 60, 60, 6, '#fff4e0', 3);
    ctx.fillStyle = PAL.ink;
    ctx.font = '700 15px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PANTRY', 60, 72);
    circlePath(ctx, 90, 130, 6);
    paint(ctx, PAL.gold, 2);
  });
}

export const FIFTIES_PROPS: Record<string, () => PropArt> = {
  'bld-lanes': starlightLanes,
  'bld-diner': diner,
  'bld-records': recordShop,
  'bld-house-mint': pastelHouse('#bfe8d6', '#6fb3e0'),
  'bld-house-pink': pastelHouse('#f7c9d9', '#a58bd6'),
  'bld-house-lemon': pastelHouse('#fbe9a6', '#e0555f'),
  'prop-car-teal': car(TEAL),
  'prop-car-cherry': car(CHERRY),
  'prop-milktruck': milkTruck,
};

export const FIFTIES_FURNITURE: Record<string, () => PropArt> = {
  lane: laneStrip,
  ballreturn: ballReturn,
  shoecounter: shoeCounter,
  trophycase: trophyCase(true),
  'trophycase-empty': trophyCase(false),
  jukebox,
  booth,
  dinercounter: dinerCounter,
  pantry: pantryDoor,
};
