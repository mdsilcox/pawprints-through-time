import { PAL, shade } from './palette';
import { makeCanvas, rrPath, circlePath, paint, softShade, OUTLINE, type Cv } from './draw';

/**
 * Tockwood's old clocktower. Canvas is 300 x 660; the tower's base sits on the bottom edge.
 * `handsBackwards` tilts the hands oddly (the tangled clocks) until the hourglass is restored.
 */
export function drawClocktower(opts: { tangled?: boolean; glow?: number } = {}): Cv {
  const W = 300;
  const H = 660;
  const cv = makeCanvas(W, H);
  const { ctx } = cv;
  const L = OUTLINE;

  // --- stone base ---
  rrPath(ctx, 26, H - 140, 248, 136, [18, 18, 8, 8]);
  paint(ctx, PAL.stone, 0);
  rrPath(ctx, 26, H - 140, 248, 136, [18, 18, 8, 8]);
  softShade(ctx, { x: 26, y: H - 140, w: 248, h: 136 }, { darkAlpha: 0.2 });
  // brick lines
  ctx.strokeStyle = shade(PAL.stone, -0.25);
  ctx.lineWidth = 3;
  for (let row = 0; row < 4; row++) {
    const y = H - 140 + 30 + row * 30;
    ctx.beginPath();
    ctx.moveTo(34, y);
    ctx.lineTo(266, y);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 42 + (row % 2 ? 21 : 0);
      if (x > 262) continue;
      ctx.beginPath();
      ctx.moveTo(x, y - 30 + 4);
      ctx.lineTo(x, y - 4);
      ctx.stroke();
    }
  }
  rrPath(ctx, 26, H - 140, 248, 136, [18, 18, 8, 8]);
  paint(ctx, 'rgba(0,0,0,0)', L);

  // --- door ---
  ctx.beginPath();
  ctx.moveTo(116, H - 4);
  ctx.lineTo(116, H - 78);
  ctx.arc(150, H - 78, 34, Math.PI, 0);
  ctx.lineTo(184, H - 4);
  ctx.closePath();
  paint(ctx, PAL.wood, L);
  ctx.strokeStyle = PAL.woodDark;
  ctx.lineWidth = 3;
  for (const x of [133, 150, 167]) {
    ctx.beginPath();
    ctx.moveTo(x, H - 8);
    ctx.lineTo(x, H - 100);
    ctx.stroke();
  }
  circlePath(ctx, 172, H - 50, 5);
  paint(ctx, PAL.gold, 2);

  // --- tower body ---
  const bodyTop = 176;
  const bodyBottom = H - 132;
  rrPath(ctx, 54, bodyTop, 192, bodyBottom - bodyTop, 12);
  ctx.fillStyle = PAL.wall;
  ctx.fill();
  rrPath(ctx, 54, bodyTop, 192, bodyBottom - bodyTop, 12);
  softShade(ctx, { x: 54, y: bodyTop, w: 192, h: bodyBottom - bodyTop }, { darkAlpha: 0.12, lightAlpha: 0.25 });
  // timber frame
  ctx.fillStyle = PAL.woodLight;
  for (const x of [54, 226]) {
    rrPath(ctx, x, bodyTop, 20, bodyBottom - bodyTop, 6);
    ctx.fill();
  }
  rrPath(ctx, 54, bodyTop, 192, bodyBottom - bodyTop, 12);
  paint(ctx, 'rgba(0,0,0,0)', L);
  // little round window
  circlePath(ctx, 150, bodyBottom - 60, 20);
  paint(ctx, opts.glow ? PAL.lamp : '#8fc3d9', L);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(130, bodyBottom - 60);
  ctx.lineTo(170, bodyBottom - 60);
  ctx.moveTo(150, bodyBottom - 80);
  ctx.lineTo(150, bodyBottom - 40);
  ctx.stroke();

  // --- clock face ---
  const cx = 150;
  const cy = 292;
  circlePath(ctx, cx, cy, 78);
  paint(ctx, PAL.gold, L);
  circlePath(ctx, cx, cy, 64);
  paint(ctx, PAL.cream, L);
  ctx.fillStyle = PAL.ink;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r1 = i % 3 === 0 ? 46 : 52;
    const x1 = cx + Math.sin(a) * r1;
    const y1 = cy - Math.cos(a) * r1;
    const x2 = cx + Math.sin(a) * 58;
    const y2 = cy - Math.cos(a) * 58;
    ctx.lineWidth = i % 3 === 0 ? 6 : 3;
    ctx.strokeStyle = PAL.ink;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  const hourA = opts.tangled ? -2.3 : -0.95;
  const minA = opts.tangled ? 2.9 : 1.1;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(hourA) * 30, cy - Math.cos(hourA) * 30);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(minA) * 46, cy - Math.cos(minA) * 46);
  ctx.stroke();
  circlePath(ctx, cx, cy, 7);
  paint(ctx, PAL.gold, 3);

  // --- belfry ---
  rrPath(ctx, 66, 112, 168, 76, 10);
  paint(ctx, PAL.wallShade, L);
  for (const x of [98, 170]) {
    ctx.beginPath();
    ctx.moveTo(x - 18, 180);
    ctx.lineTo(x - 18, 144);
    ctx.arc(x, 144, 18, Math.PI, 0);
    ctx.lineTo(x + 18, 180);
    ctx.closePath();
    paint(ctx, '#5b4a6b', 3);
  }
  // bell
  ctx.beginPath();
  ctx.moveTo(122, 176);
  ctx.quadraticCurveTo(124, 132, 150, 130);
  ctx.quadraticCurveTo(176, 132, 178, 176);
  ctx.closePath();
  paint(ctx, PAL.gold, 3);
  rrPath(ctx, 58, 180, 184, 14, 6);
  paint(ctx, PAL.wood, L);

  // --- roof ---
  ctx.beginPath();
  ctx.moveTo(40, 124);
  ctx.quadraticCurveTo(110, 96, 150, 18);
  ctx.quadraticCurveTo(190, 96, 260, 124);
  ctx.quadraticCurveTo(150, 138, 40, 124);
  ctx.closePath();
  ctx.fillStyle = PAL.roofTeal;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = shade(PAL.roofTeal, -0.25);
  ctx.lineWidth = 3;
  for (let row = 0; row < 6; row++) {
    const y = 40 + row * 17;
    for (let x = 30 + (row % 2) * 12; x < 270; x += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 12, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(118, 80, 14, 40, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(40, 124);
  ctx.quadraticCurveTo(110, 96, 150, 18);
  ctx.quadraticCurveTo(190, 96, 260, 124);
  ctx.quadraticCurveTo(150, 138, 40, 124);
  ctx.closePath();
  paint(ctx, 'rgba(0,0,0,0)', L);

  // --- golden hourglass weathervane ---
  ctx.lineWidth = 4;
  ctx.strokeStyle = PAL.ink;
  ctx.beginPath();
  ctx.moveTo(150, 22);
  ctx.lineTo(150, 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(138, 0 + 2);
  ctx.lineTo(162, 2);
  ctx.lineTo(152, 11);
  ctx.lineTo(162, 20);
  ctx.lineTo(138, 20);
  ctx.lineTo(148, 11);
  ctx.closePath();
  paint(ctx, PAL.gold, 3);
  return cv;
}
