import { PAL, shade } from './palette';
import { OUTLINE } from './draw';
import { registerAcc, registerHat, type Rig, type WornPiece } from './character';

/** Hats and accessories for the paper doll (players, neighbours, era folk). */
const L = OUTLINE - 0.5;
const INK = PAL.ink;
type Ctx = CanvasRenderingContext2D;

function stroke(ctx: Ctx, lw = L) {
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
}
function fillStroke(ctx: Ctx, fill: string, lw = L) {
  ctx.fillStyle = fill;
  ctx.fill();
  stroke(ctx, lw);
}
function ell(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, lw = L, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  fillStroke(ctx, fill, lw);
}
function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, lw = L) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  fillStroke(ctx, fill, lw);
}
const side = (rig: Rig) => rig.facing === 'side';
const back = (rig: Rig) => rig.facing === 'up';

// ------------------------------------------------------------------ hats
registerHat('sunhat', (ctx, p, rig) => {
  const { x, y, r } = rig.head;
  ell(ctx, x, y - r * 0.55, r + 20, 9, p.main);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.75, y - r * 0.55);
  ctx.quadraticCurveTo(x - r * 0.7, y - r * 1.35, x, y - r * 1.35);
  ctx.quadraticCurveTo(x + r * 0.7, y - r * 1.35, x + r * 0.75, y - r * 0.55);
  ctx.closePath();
  fillStroke(ctx, p.main);
  rr(ctx, x - r * 0.75, y - r * 0.8, r * 1.5, 7, 3, p.accent, 2);
  ctx.strokeStyle = shade(p.main, -0.2);
  ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 9, y - r * 1.3);
    ctx.lineTo(x + i * 11, y - r * 0.85);
    ctx.stroke();
  }
});

registerHat('cap', (ctx, p, rig) => {
  const { x, y, r } = rig.head;
  ctx.beginPath();
  ctx.moveTo(x - r - 1, y - 4);
  ctx.quadraticCurveTo(x - r, y - r - 8, x, y - r - 8);
  ctx.quadraticCurveTo(x + r, y - r - 8, x + r + 1, y - 4);
  ctx.closePath();
  fillStroke(ctx, p.main);
  if (!back(rig)) {
    if (side(rig)) ell(ctx, x + r + 4, y - 5, 16, 5, shade(p.main, -0.15));
    else ell(ctx, x, y - 3, r * 0.85, 6, shade(p.main, -0.15));
  }
  ell(ctx, x, y - r - 8, 4, 3, p.accent, 2);
  ctx.beginPath();
  ctx.arc(x, y - 4, r * 0.5, Math.PI * 1.15, Math.PI * 1.85);
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 3;
  ctx.stroke();
});

registerHat('flowercrown', (ctx, p, rig) => {
  const { x, y, r } = rig.head;
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.62, r * 0.95, 7, 0, Math.PI, 0);
  ctx.lineWidth = 5;
  ctx.strokeStyle = p.main;
  ctx.stroke();
  const n = back(rig) ? 4 : 6;
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / (n - 1)) * Math.PI;
    const fx = x + Math.cos(a) * r * 0.95;
    const fy = y - r * 0.62 + Math.sin(a) * 7;
    for (let k = 0; k < 5; k++) {
      const b = (k / 5) * Math.PI * 2;
      ell(ctx, fx + Math.cos(b) * 3.5, fy + Math.sin(b) * 3.5, 3.4, 3.4, i % 2 ? p.accent : '#ffffff', 1.2);
    }
    ell(ctx, fx, fy, 2.4, 2.4, PAL.gold, 1);
  }
});

registerHat('bow', (ctx, p, rig) => {
  const { x, y, r } = rig.head;
  const bx = side(rig) ? x - 6 : x + r * 0.45;
  const by = y - r * 0.85;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + s * 16, by - 14, bx + s * 18, by);
    ctx.quadraticCurveTo(bx + s * 16, by + 12, bx, by);
    fillStroke(ctx, p.main);
  }
  ell(ctx, bx, by, 4.5, 4.5, p.accent, 2);
});

registerHat('bucket', (ctx, p, rig) => {
  const { x, y, r } = rig.head;
  ell(ctx, x, y - r * 0.5, r + 10, 8, shade(p.main, -0.1));
  ctx.beginPath();
  ctx.moveTo(x - r * 0.85, y - r * 0.5);
  ctx.lineTo(x - r * 0.65, y - r * 1.3);
  ctx.quadraticCurveTo(x, y - r * 1.45, x + r * 0.65, y - r * 1.3);
  ctx.lineTo(x + r * 0.85, y - r * 0.5);
  ctx.closePath();
  fillStroke(ctx, p.main);
  rr(ctx, x - r * 0.8, y - r * 0.8, r * 1.6, 6, 3, p.accent, 2);
});

registerHat('tricorn', (ctx, p, rig) => {
  const { x, y, r } = rig.head;
  // dome
  ctx.beginPath();
  ctx.moveTo(x - r * 0.8, y - r * 0.55);
  ctx.quadraticCurveTo(x - r * 0.75, y - r * 1.35, x, y - r * 1.35);
  ctx.quadraticCurveTo(x + r * 0.75, y - r * 1.35, x + r * 0.8, y - r * 0.55);
  ctx.closePath();
  fillStroke(ctx, p.main);
  // upturned three-cornered brim
  ctx.beginPath();
  if (side(rig)) {
    ctx.moveTo(x - r - 10, y - r * 0.9);
    ctx.quadraticCurveTo(x, y - r * 0.15, x + r + 12, y - r * 0.8);
    ctx.quadraticCurveTo(x, y - r * 0.55, x - r - 10, y - r * 0.9);
  } else {
    ctx.moveTo(x - r - 12, y - r * 1.05);
    ctx.quadraticCurveTo(x - r * 0.4, y - r * 0.2, x, y - r * 0.25);
    ctx.quadraticCurveTo(x + r * 0.4, y - r * 0.2, x + r + 12, y - r * 1.05);
    ctx.quadraticCurveTo(x + r * 0.5, y - r * 0.6, x, y - r * 0.55);
    ctx.quadraticCurveTo(x - r * 0.5, y - r * 0.6, x - r - 12, y - r * 1.05);
  }
  ctx.closePath();
  fillStroke(ctx, shade(p.main, 0.08));
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  if (!back(rig) && !side(rig)) {
    // little skull-free badge: a gold star
    ell(ctx, x, y - r * 0.62, 4, 4, p.accent, 1.5);
  }
});

registerHat('bandana', (ctx, p, rig) => {
  const { x, y, r } = rig.head;
  ctx.beginPath();
  ctx.moveTo(x - r - 1, y - 2);
  ctx.quadraticCurveTo(x - r, y - r - 5, x, y - r - 5);
  ctx.quadraticCurveTo(x + r, y - r - 5, x + r + 1, y - 2);
  ctx.quadraticCurveTo(x, y - 12, x - r - 1, y - 2);
  ctx.closePath();
  fillStroke(ctx, p.main);
  ctx.fillStyle = p.accent;
  for (const [dx, dy] of [
    [-12, -18],
    [4, -22],
    [14, -12],
    [-4, -9],
  ]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // knot + tails at the back/side
  const kx = side(rig) ? x - r - 2 : back(rig) ? x : x + r - 4;
  ell(ctx, kx, y - 6, 5, 4, p.main, 2);
  ctx.beginPath();
  ctx.moveTo(kx, y - 5);
  ctx.lineTo(kx + (side(rig) ? -12 : 6), y + 10);
  ctx.lineTo(kx + (side(rig) ? -4 : 12), y + 8);
  ctx.closePath();
  fillStroke(ctx, p.main, 2);
});

registerHat('nemes', (ctx, p, rig) => {
  const { x, y, r } = rig.head;
  // headcloth with lappets falling to the shoulders
  ctx.beginPath();
  ctx.moveTo(x - r - 3, y + 26);
  ctx.lineTo(x - r - 1, y - 4);
  ctx.quadraticCurveTo(x - r, y - r - 6, x, y - r - 6);
  ctx.quadraticCurveTo(x + r, y - r - 6, x + r + 1, y - 4);
  ctx.lineTo(x + r + 3, y + 26);
  ctx.lineTo(x + r - 7, y + 26);
  ctx.lineTo(x + r - 7, y + 2);
  ctx.quadraticCurveTo(x, y - 14, x - r + 7, y + 2);
  ctx.lineTo(x - r + 7, y + 26);
  ctx.closePath();
  ctx.fillStyle = p.accent;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = p.main;
  for (let yy = y - r - 6; yy < y + 30; yy += 7) ctx.fillRect(x - r - 6, yy, r * 2 + 12, 3.5);
  ctx.restore();
  stroke(ctx);
  rr(ctx, x - r + 2, y - 10, r * 2 - 4, 5, 2, PAL.gold, 2);
});

registerHat('headscarf', (ctx, p, rig) => {
  const { x, y, r } = rig.head;
  ctx.beginPath();
  ctx.moveTo(x - r - 1, y - 2);
  ctx.quadraticCurveTo(x - r, y - r - 6, x, y - r - 6);
  ctx.quadraticCurveTo(x + r, y - r - 6, x + r + 1, y - 2);
  ctx.quadraticCurveTo(x, y - 14, x - r - 1, y - 2);
  ctx.closePath();
  fillStroke(ctx, p.main);
  ctx.fillStyle = p.accent;
  for (const [dx, dy] of [
    [-10, -20],
    [6, -24],
    [15, -12],
    [-16, -8],
    [2, -12],
  ]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // bow on top
  const bx = x + (side(rig) ? -4 : 8);
  const by = y - r - 6;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + s * 12, by - 12, bx + s * 13, by + 1);
    ctx.closePath();
    fillStroke(ctx, p.main, 2);
  }
});

registerHat('beret', (ctx, p, rig) => {
  const { x, y, r } = rig.head;
  const tilt = side(rig) ? -4 : 5;
  ell(ctx, x + tilt, y - r * 0.72, r + 6, 12, p.main);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(x + tilt - 8, y - r * 0.8, 10, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  rr(ctx, x - r * 0.8, y - r * 0.62, r * 1.6, 5, 2, p.accent, 1.5);
  ell(ctx, x + tilt + 4, y - r * 0.72 - 11, 3, 3, p.main, 1.5);
});

registerHat('bunnyears', (ctx, p, rig) => {
  const { x, y, r } = rig.head;
  ctx.beginPath();
  ctx.arc(x, y, r + 1, Math.PI * 1.15, Math.PI * 1.85);
  ctx.lineWidth = 5 + L;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.strokeStyle = p.main;
  ctx.stroke();
  const ears = side(rig) ? [[x - 4, -0.3]] : [
    [x - 12, -0.2],
    [x + 12, 0.2],
  ];
  for (const [ex, rot] of ears) {
    ctx.save();
    ctx.translate(ex, y - r * 0.8);
    ctx.rotate(rot);
    ell(ctx, 0, -18, 7.5, 19, p.main);
    if (!back(rig)) ell(ctx, 0, -17, 3.6, 13, p.accent, 0);
    ctx.restore();
  }
});

registerHat('chef', (ctx, p, rig) => {
  const { x, y, r } = rig.head;
  rr(ctx, x - r * 0.72, y - r * 0.95, r * 1.44, 12, 4, p.main);
  for (const [dx, dy, rad] of [
    [-10, -r - 12, 11],
    [8, -r - 14, 12],
    [0, -r - 22, 12],
  ])
    ell(ctx, x + dx, y + dy, rad, rad, p.main);
  rr(ctx, x - r * 0.72, y - r * 0.95 + 5, r * 1.44, 4, 2, p.accent, 1.2);
});

registerHat('party', (ctx, p, rig) => {
  const { x, y, r } = rig.head;
  const tx = x + (side(rig) ? -3 : 4);
  ctx.beginPath();
  ctx.moveTo(tx - 13, y - r * 0.75);
  ctx.lineTo(tx + 3, y - r - 28);
  ctx.lineTo(tx + 15, y - r * 0.75);
  ctx.closePath();
  ctx.fillStyle = p.main;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = p.accent;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(tx - 6 + (i % 2) * 12, y - r - 2 - i * 7, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  stroke(ctx);
  ell(ctx, tx + 3, y - r - 29, 4.5, 4.5, PAL.gold, 2);
});

registerHat('paper', (ctx, p, rig) => {
  const { x, y, r } = rig.head;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.85, y - r * 0.6);
  ctx.lineTo(x - r * 0.6, y - r * 1.15);
  ctx.lineTo(x + r * 0.6, y - r * 1.15);
  ctx.lineTo(x + r * 0.85, y - r * 0.6);
  ctx.closePath();
  fillStroke(ctx, p.main);
  rr(ctx, x - r * 0.72, y - r * 0.95, r * 1.44, 5, 2, p.accent, 1.2);
});

// ------------------------------------------------------------------ accessories
registerAcc('glasses', 'face', (ctx, p, rig) => {
  const { x, y } = rig.head;
  const ey = y + 4;
  ctx.lineWidth = 3;
  ctx.strokeStyle = p.main;
  const lenses = side(rig) ? [x + 13] : [x - 10.5, x + 10.5];
  for (const lx of lenses) {
    ctx.beginPath();
    ctx.arc(lx, ey, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(223,243,255,0.35)';
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  if (side(rig)) {
    ctx.moveTo(x + 5.5, ey);
    ctx.lineTo(x - 6, ey - 2);
  } else {
    ctx.moveTo(x - 3, ey);
    ctx.lineTo(x + 3, ey);
  }
  ctx.stroke();
});

registerAcc('cateye', 'face', (ctx, p, rig) => {
  const { x, y } = rig.head;
  const ey = y + 4;
  const lenses = side(rig) ? [[x + 13, 1]] : [
    [x - 10.5, -1],
    [x + 10.5, 1],
  ];
  for (const [lx, s] of lenses) {
    ctx.beginPath();
    ctx.moveTo(lx - 8, ey - 2);
    ctx.quadraticCurveTo(lx, ey - 7, lx + 8 * s, ey - 7);
    ctx.quadraticCurveTo(lx + 9 * s, ey + 1, lx + 5 * s, ey + 5);
    ctx.quadraticCurveTo(lx - 2 * s, ey + 8, lx - 8 * s, ey + 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(223,243,255,0.35)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = p.main;
    ctx.stroke();
  }
});

registerAcc('eyepatch', 'face', (ctx, p, rig) => {
  const { x, y, r } = rig.head;
  if (side(rig)) {
    ell(ctx, x + 13, y + 3, 6.5, 6, p.main, 1.5);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x - r + 2, y - 10);
  ctx.lineTo(x + r - 2, y + 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = p.main;
  ctx.stroke();
  ell(ctx, x + 10.5, y + 4, 7, 6.5, p.main, 1.5);
});

registerAcc('scarf', 'neck', (ctx, p, rig) => {
  const t = rig.torso;
  rr(ctx, t.x - 3, t.y - 3, t.w + 6, 10, 5, p.main);
  if (!back(rig)) {
    rr(ctx, t.x + (side(rig) ? t.w - 6 : 4), t.y + 3, 9, 18, 3, p.main, 2);
    ctx.fillStyle = p.accent;
    ctx.fillRect(t.x + (side(rig) ? t.w - 6 : 4), t.y + 16, 9, 3);
  }
  ctx.fillStyle = p.accent;
  for (let i = 0; i < 4; i++) ctx.fillRect(t.x + 2 + i * (t.w / 4), t.y - 1, 3, 6);
});

registerAcc('bowtie', 'neck', (ctx, p, rig) => {
  if (back(rig)) return;
  const t = rig.torso;
  const cx = side(rig) ? t.x + t.w * 0.75 : t.x + t.w / 2;
  for (const s of side(rig) ? [1] : [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx, t.y + 4);
    ctx.lineTo(cx + s * 11, t.y - 2);
    ctx.lineTo(cx + s * 11, t.y + 10);
    ctx.closePath();
    fillStroke(ctx, p.main, 2);
  }
  ell(ctx, cx, t.y + 4, 3.5, 3.5, p.main, 2);
});

registerAcc('collar', 'neck', (ctx, p, rig) => {
  const t = rig.torso;
  const cx = t.x + t.w / 2;
  ctx.beginPath();
  ctx.ellipse(cx, t.y + 1, t.w / 2 + 5, 14, 0, 0, Math.PI);
  fillStroke(ctx, p.accent, 2.5);
  ctx.strokeStyle = p.main;
  ctx.lineWidth = 3;
  for (const rr2 of [7, 11]) {
    ctx.beginPath();
    ctx.ellipse(cx, t.y + 1, t.w / 2 + 5 - (14 - rr2) * 0.8, rr2, 0, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }
});

registerAcc('pearls', 'neck', (ctx, p, rig) => {
  if (back(rig)) return;
  const t = rig.torso;
  const cx = side(rig) ? t.x + t.w * 0.6 : t.x + t.w / 2;
  for (let i = 0; i < 9; i++) {
    const a = 0.15 * Math.PI + (i / 8) * 0.7 * Math.PI;
    ell(ctx, cx + Math.cos(a) * (t.w / 2 - 2), t.y + Math.sin(a) * 10, 2.6, 2.6, p.main, 1.2);
  }
});

registerAcc('chain', 'neck', (ctx, p, rig) => {
  if (back(rig)) return;
  const t = rig.torso;
  const cx = side(rig) ? t.x + t.w * 0.6 : t.x + t.w / 2;
  ctx.beginPath();
  ctx.ellipse(cx, t.y + 2, t.w / 2 - 3, 14, 0, 0.1, Math.PI - 0.1);
  ctx.lineWidth = 3;
  ctx.strokeStyle = p.main;
  ctx.stroke();
  ell(ctx, cx, t.y + 17, 5.5, 5.5, p.main, 2);
  ell(ctx, cx, t.y + 17, 2.5, 2.5, p.accent, 0);
});

registerAcc('backpack', 'back', (ctx, p, rig) => {
  const t = rig.torso;
  if (back(rig)) {
    rr(ctx, t.x + 3, t.y + 2, t.w - 6, t.h - 2, 8, p.main);
    rr(ctx, t.x + 8, t.y + 14, t.w - 16, 10, 4, p.accent, 2);
    return;
  }
  if (side(rig)) rr(ctx, t.x - 12, t.y + 2, 14, t.h - 4, 5, p.main);
  else {
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(t.x + 6, t.y + 1);
    ctx.lineTo(t.x + 6, t.y + t.h - 6);
    ctx.moveTo(t.x + t.w - 6, t.y + 1);
    ctx.lineTo(t.x + t.w - 6, t.y + t.h - 6);
    ctx.stroke();
  }
});

registerAcc('parrot', 'shoulder', (ctx, p, rig) => {
  const t = rig.torso;
  const px = side(rig) ? t.x + 6 : t.x + t.w - 2;
  const py = t.y - 4;
  ell(ctx, px, py, 8, 11, p.main, 2.2);
  ell(ctx, px, py - 12, 7, 7, p.main, 2.2);
  ctx.beginPath();
  ctx.moveTo(px + 4, py - 13);
  ctx.quadraticCurveTo(px + 12, py - 12, px + 7, py - 5);
  ctx.closePath();
  fillStroke(ctx, PAL.gold, 1.5);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(px + 2, py - 14, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ell(ctx, px - 4, py + 10, 3, 7, p.accent, 1.5, 0.3);
});

export type { WornPiece };
