import { PAL } from './palette';
import { makeCanvas } from './draw';

/**
 * Bowling art, drawn procedurally: the alley around the lane (Starlight Lanes in the 1950s with
 * its neon sign, or Tockwood Lanes with clock-gear trim), a bowling pin and a bowling ball.
 */
export type AlleyKind = 'starlight' | 'tockwood';

export function drawAlley(kind: AlleyKind, w: number, h: number): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(Math.max(2, Math.round(w)), Math.max(2, Math.round(h)));
  const u = Math.min(w / 1280, h / 720);
  const starlight = kind === 'starlight';
  // the room: warm wood below, a dark back wall above
  const wall = ctx.createLinearGradient(0, 0, 0, h * 0.42);
  wall.addColorStop(0, starlight ? '#2b2350' : '#3d2f5c');
  wall.addColorStop(1, starlight ? '#46357a' : '#5b4a8f');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, h * 0.42);
  const floor = ctx.createLinearGradient(0, h * 0.3, 0, h);
  floor.addColorStop(0, '#6b4a33');
  floor.addColorStop(1, '#3d2a1e');
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * 0.3, w, h * 0.7);
  // stars / little lights on the wall
  ctx.fillStyle = 'rgba(255, 244, 224, 0.8)';
  for (let i = 0; i < 26; i++) {
    const x = ((i * 137) % 100) / 100;
    const y = ((i * 71) % 100) / 100;
    ctx.beginPath();
    ctx.arc(x * w, y * h * 0.26 + 6 * u, (1.5 + (i % 3)) * u, 0, Math.PI * 2);
    ctx.fill();
  }
  // the masking panel above the pins, with the sign
  const mw = w * 0.34;
  const mx = w / 2 - mw / 2;
  const my = h * 0.13;
  const mh = h * 0.13;
  ctx.fillStyle = starlight ? '#e46a6a' : '#a58bd6';
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = Math.max(2, 4 * u);
  ctx.beginPath();
  ctx.roundRect(mx, my, mw, mh, 14 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff4e0';
  ctx.font = `700 ${Math.round(34 * u)}px Fredoka, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (starlight) {
    ctx.shadowColor = '#7ff0ff';
    ctx.shadowBlur = 18 * u;
  }
  ctx.fillText(starlight ? '★ STARLIGHT LANES ★' : '⚙ TOCKWOOD LANES ⚙', w / 2, my + mh / 2);
  ctx.shadowBlur = 0;
  // neon tubes (Starlight) or bunting (Tockwood) along the top
  if (starlight) {
    ctx.strokeStyle = '#7ff0ff';
    ctx.lineWidth = Math.max(2, 5 * u);
    ctx.shadowColor = '#7ff0ff';
    ctx.shadowBlur = 12 * u;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 40 * u) ctx.lineTo(x, h * 0.05 + Math.sin(x / (40 * u)) * 6 * u);
    ctx.stroke();
    ctx.strokeStyle = '#ff8fd1';
    ctx.shadowColor = '#ff8fd1';
    ctx.beginPath();
    for (let x = 0; x <= w; x += 40 * u) ctx.lineTo(x, h * 0.085 + Math.cos(x / (40 * u)) * 6 * u);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else {
    const cols = ['#a58bd6', '#f7c65a', '#7cc47f', '#f4a3b4'];
    for (let i = 0, x = 0; x < w; x += 44 * u, i++) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.05);
      ctx.lineTo(x + 36 * u, h * 0.05);
      ctx.lineTo(x + 18 * u, h * 0.05 + 30 * u);
      ctx.closePath();
      ctx.fillStyle = cols[i % cols.length];
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, 2 * u);
      ctx.strokeStyle = PAL.ink;
      ctx.stroke();
    }
  }
  // neighbouring lanes, far away on each side
  ctx.fillStyle = 'rgba(212, 154, 106, 0.35)';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + side * w * 0.22, h * 0.3);
    ctx.lineTo(w / 2 + side * w * 0.36, h * 0.3);
    ctx.lineTo(w / 2 + side * w * 1.2, h);
    ctx.lineTo(w / 2 + side * w * 0.62, h);
    ctx.closePath();
    ctx.fill();
  }
  return c;
}

/** A bowling pin (standing, seen from the front): white with two red stripes. */
export function drawPin(): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(64, 160);
  ctx.beginPath();
  ctx.moveTo(32, 6);
  ctx.bezierCurveTo(46, 6, 46, 30, 40, 44);
  ctx.bezierCurveTo(34, 58, 58, 84, 58, 112);
  ctx.bezierCurveTo(58, 138, 46, 154, 32, 154);
  ctx.bezierCurveTo(18, 154, 6, 138, 6, 112);
  ctx.bezierCurveTo(6, 84, 30, 58, 24, 44);
  ctx.bezierCurveTo(18, 30, 18, 6, 32, 6);
  ctx.closePath();
  ctx.fillStyle = '#fffaf2';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#e46a6a';
  ctx.fillRect(0, 42, 64, 6);
  ctx.fillRect(0, 53, 64, 6);
  ctx.fillStyle = 'rgba(74, 59, 53, 0.08)';
  ctx.fillRect(38, 0, 26, 160);
  ctx.restore();
  ctx.lineWidth = 4;
  ctx.strokeStyle = PAL.ink;
  ctx.stroke();
  return c;
}

/** A bowling ball with finger holes. */
export function drawBall(color: string): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(96, 96);
  const g = ctx.createRadialGradient(34, 30, 6, 48, 48, 46);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, color);
  g.addColorStop(1, color);
  ctx.beginPath();
  ctx.arc(48, 48, 44, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = PAL.ink;
  ctx.stroke();
  ctx.fillStyle = PAL.ink;
  for (const [x, y, r] of [
    [40, 34, 6],
    [56, 34, 6],
    [48, 52, 7],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}
