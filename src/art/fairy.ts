import { PAL } from './palette';
import { makeCanvas, sparkle, OUTLINE } from './draw';

/**
 * Pip, the tiny time fairy: golden bun with an hourglass hair-pin, lilac dress, four
 * glassy wings. Drawn around (cx, cy) = centre of her head; `s` scales everything.
 * `wing` in [0,1] animates the flap.
 */
export function drawPip(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, wing = 0.5, happy = false, glowR = 70): void {
  const L = OUTLINE * 0.9;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // glow
  if (glowR > 0) {
    const glow = ctx.createRadialGradient(0, 20, 4, 0, 20, glowR);
    glow.addColorStop(0, 'rgba(255,240,170,0.55)');
    glow.addColorStop(0.6, 'rgba(255,240,170,0.22)');
    glow.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 20, glowR, 0, Math.PI * 2);
    ctx.fill();
  }
  // wings (behind)
  const flap = 0.55 + wing * 0.45;
  const wingShape = (side: number, upper: boolean) => {
    ctx.save();
    ctx.scale(side, 1);
    ctx.translate(8, upper ? 18 : 34);
    ctx.rotate(upper ? -0.5 * flap : 0.35 * flap);
    ctx.beginPath();
    if (upper) {
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(18, -40, 58, -38, 50, -6);
      ctx.bezierCurveTo(44, 10, 16, 10, 0, 0);
    } else {
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(20, 4, 44, 16, 34, 30);
      ctx.bezierCurveTo(24, 40, 6, 20, 0, 0);
    }
    ctx.closePath();
    ctx.fillStyle = upper ? 'rgba(186,226,247,0.85)' : 'rgba(214,196,245,0.85)';
    ctx.fill();
    ctx.lineWidth = L * 0.8;
    ctx.strokeStyle = PAL.ink;
    ctx.stroke();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(upper ? 26 : 16, upper ? -16 : 14, upper ? 10 : 6, 4, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  wingShape(-1, true);
  wingShape(1, true);
  wingShape(-1, false);
  wingShape(1, false);
  // dress (a little bell shape)
  ctx.beginPath();
  ctx.moveTo(-9, 22);
  ctx.lineTo(9, 22);
  ctx.quadraticCurveTo(14, 36, 20, 50);
  ctx.quadraticCurveTo(0, 56, -20, 50);
  ctx.quadraticCurveTo(-14, 36, -9, 22);
  ctx.closePath();
  ctx.fillStyle = PAL.purple;
  ctx.fill();
  ctx.lineWidth = L;
  ctx.strokeStyle = PAL.ink;
  ctx.stroke();
  ctx.fillStyle = PAL.gold;
  for (const [x, y] of [
    [-8, 40],
    [6, 34],
    [10, 46],
    [-2, 48],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // little legs
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 5 + L;
  for (const x of [-6, 6]) {
    ctx.beginPath();
    ctx.moveTo(x, 52);
    ctx.lineTo(x * 1.2, 62);
    ctx.stroke();
  }
  ctx.strokeStyle = '#ffe0c7';
  ctx.lineWidth = 5;
  for (const x of [-6, 6]) {
    ctx.beginPath();
    ctx.moveTo(x, 52);
    ctx.lineTo(x * 1.2, 62);
    ctx.stroke();
  }
  // arms
  ctx.lineWidth = 4 + L;
  ctx.strokeStyle = PAL.ink;
  const armY = happy ? -4 : 36;
  ctx.beginPath();
  ctx.moveTo(-8, 26);
  ctx.lineTo(-18, armY);
  ctx.moveTo(8, 26);
  ctx.lineTo(18, armY);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffe0c7';
  ctx.beginPath();
  ctx.moveTo(-8, 26);
  ctx.lineTo(-18, armY);
  ctx.moveTo(8, 26);
  ctx.lineTo(18, armY);
  ctx.stroke();
  // head
  ctx.beginPath();
  ctx.arc(0, 4, 19, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe6d2';
  ctx.fill();
  ctx.lineWidth = L;
  ctx.strokeStyle = PAL.ink;
  ctx.stroke();
  // hair: golden cap + bun
  ctx.beginPath();
  ctx.arc(0, -16, 9, 0, Math.PI * 2);
  ctx.fillStyle = PAL.gold;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-19, 6);
  ctx.quadraticCurveTo(-20, -16, 0, -15);
  ctx.quadraticCurveTo(20, -16, 19, 6);
  ctx.quadraticCurveTo(12, -4, 4, -2);
  ctx.quadraticCurveTo(-2, -8, -8, -1);
  ctx.quadraticCurveTo(-14, -2, -19, 6);
  ctx.closePath();
  ctx.fillStyle = PAL.gold;
  ctx.fill();
  ctx.stroke();
  // tiny hourglass hair-pin
  ctx.save();
  ctx.translate(10, -20);
  ctx.rotate(0.4);
  ctx.beginPath();
  ctx.moveTo(-4, -5);
  ctx.lineTo(4, -5);
  ctx.lineTo(1, 0);
  ctx.lineTo(4, 5);
  ctx.lineTo(-4, 5);
  ctx.lineTo(-1, 0);
  ctx.closePath();
  ctx.fillStyle = PAL.cream;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
  // face
  ctx.fillStyle = PAL.ink;
  if (happy) {
    ctx.lineWidth = 2.4;
    for (const x of [-7, 7]) {
      ctx.beginPath();
      ctx.arc(x, 7, 3.4, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else {
    for (const x of [-7, 7]) {
      ctx.beginPath();
      ctx.ellipse(x, 6, 3, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x - 1, 4.6, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PAL.ink;
    }
  }
  ctx.fillStyle = 'rgba(247,140,140,0.5)';
  for (const x of [-12, 12]) {
    ctx.beginPath();
    ctx.ellipse(x, 12, 3.6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 12, 3, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // sparkles
  sparkle(ctx, -30, -20, 6, '#fff7c2');
  sparkle(ctx, 32, 2, 5, '#fff7c2');
  ctx.restore();
}

/** Pip world sprite sheet: 4 frames (wing flap cycle), 80x100 each; head centre at (40, 34). */
export function renderPipSheet(): HTMLCanvasElement {
  const F = 4;
  const { c, ctx } = makeCanvas(80 * F, 100);
  for (let i = 0; i < F; i++) drawPip(ctx, 40 + i * 80, 34, 0.95, [0, 0.5, 1, 0.5][i]);
  return c;
}

export function renderPipPortrait(size = 160, happy = false): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(size, size);
  // the glow must fade out inside the canvas, or its clipped edge shows as a pale square
  const s = size / 115;
  const cy = size * 0.36;
  const room = Math.min(size / 2, cy + 20 * s, size - (cy + 20 * s)) / s;
  drawPip(ctx, size / 2, cy, s, 0.6, happy, Math.max(20, room - 2));
  return c;
}
