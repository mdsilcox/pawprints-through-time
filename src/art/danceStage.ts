import { PAL } from './palette';
import { makeCanvas } from './draw';

/**
 * Painted backdrops for the dance floor, drawn at the screen's size: the Sunny Marigold's deck
 * at sunset (the hornpipe) and Tockwood's plaza under lantern light (home dances).
 */
export type StageKind = 'deck' | 'plaza';

function bunting(ctx: CanvasRenderingContext2D, w: number, y: number, sag: number, size: number, colors: string[]): void {
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.quadraticCurveTo(w / 2, y + sag * 2, w, y);
  ctx.stroke();
  const n = Math.ceil(w / (size * 1.25));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = t * w;
    const yy = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y + sag * 2) + t * t * y;
    ctx.beginPath();
    ctx.moveTo(x - size / 2, yy);
    ctx.lineTo(x + size / 2, yy);
    ctx.lineTo(x, yy + size);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, size * 0.06);
    ctx.stroke();
  }
}

function lantern(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
  g.addColorStop(0, 'rgba(255, 214, 120, 0.55)');
  g.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
  ctx.fillStyle = '#ffd98a';
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = Math.max(2, r * 0.18);
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.8, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

export function drawDanceStage(kind: StageKind, w: number, h: number): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(Math.max(2, Math.round(w)), Math.max(2, Math.round(h)));
  const u = Math.min(w / 1280, h / 720);
  const horizon = h * 0.5;
  if (kind === 'deck') {
    // sunset sky and sea
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#6d5aa6');
    sky.addColorStop(0.55, '#f29e7a');
    sky.addColorStop(1, '#ffd59a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(w * 0.5, horizon, h * 0.11, Math.PI, 0);
    ctx.fill();
    const sea = ctx.createLinearGradient(0, horizon, 0, h * 0.62);
    sea.addColorStop(0, '#4fa6c4');
    sea.addColorStop(1, '#3a86a8');
    ctx.fillStyle = sea;
    ctx.fillRect(0, horizon, w, h * 0.14);
    ctx.fillStyle = 'rgba(255, 233, 168, 0.55)';
    for (let i = 0; i < 7; i++) ctx.fillRect(w * 0.5 - (60 - i * 7) * u, horizon + (8 + i * 11) * u, (120 - i * 14) * u, 3 * u);
    // the deck: planks in perspective
    const top = h * 0.6;
    ctx.fillStyle = '#c98d55';
    ctx.fillRect(0, top, w, h - top);
    ctx.strokeStyle = '#a8703f';
    ctx.lineWidth = Math.max(2, 3 * u);
    for (let i = -12; i <= 12; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + i * w * 0.045, top);
      ctx.lineTo(w / 2 + i * w * 0.16, h);
      ctx.stroke();
    }
    for (let y = top + 30 * u, k = 1; y < h; y += 30 * u * (1 + k * 0.25), k++) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // the rail at the back of the deck
    ctx.fillStyle = '#8a5a3a';
    ctx.fillRect(0, top - 26 * u, w, 12 * u);
    for (let x = 20 * u; x < w; x += 70 * u) ctx.fillRect(x, top - 26 * u, 9 * u, 30 * u);
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = Math.max(2, 3 * u);
    ctx.strokeRect(-4, top - 26 * u, w + 8, 12 * u);
    // the mast and a furled sail behind the dancers
    ctx.fillStyle = '#8a5a3a';
    ctx.fillRect(w * 0.5 - 12 * u, 0, 24 * u, top - 20 * u);
    ctx.strokeRect(w * 0.5 - 12 * u, -4, 24 * u, top - 16 * u);
    ctx.fillStyle = '#fff4e0';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.12, 190 * u, 22 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    bunting(ctx, w, h * 0.2, h * 0.05, 34 * u, ['#e46a6a', '#f7c65a', '#fff4e0', '#6fb3e0']);
    for (const x of [0.2, 0.8]) lantern(ctx, w * x, h * 0.34, 16 * u);
  } else {
    // Tockwood plaza in the evening: warm sky, the clocktower, lanterns and bunting
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#5b4a8f');
    sky.addColorStop(1, '#f2b27a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon + 10);
    ctx.fillStyle = '#8f7fb0';
    const tw = 150 * u;
    ctx.fillRect(w * 0.5 - tw / 2, h * 0.06, tw, horizon);
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - tw * 0.62, h * 0.08);
    ctx.lineTo(w * 0.5, -h * 0.05);
    ctx.lineTo(w * 0.5 + tw * 0.62, h * 0.08);
    ctx.closePath();
    ctx.fillStyle = PAL.roofPurple;
    ctx.fill();
    ctx.fillStyle = '#fff4e0';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.2, 46 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = Math.max(2, 4 * u);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.2);
    ctx.lineTo(w * 0.5, h * 0.2 - 32 * u);
    ctx.moveTo(w * 0.5, h * 0.2);
    ctx.lineTo(w * 0.5 + 22 * u, h * 0.2 + 8 * u);
    ctx.stroke();
    // rooftops
    ctx.fillStyle = '#6c5a8a';
    for (const [x, rw, rh] of [
      [0.1, 220, 120],
      [0.28, 160, 90],
      [0.74, 170, 100],
      [0.92, 230, 130],
    ])
      ctx.fillRect(w * x - (rw * u) / 2, horizon - rh * u, rw * u, rh * u + 10);
    // the plaza cobbles
    const top = h * 0.55;
    ctx.fillStyle = '#e6dccb';
    ctx.fillRect(0, top, w, h - top);
    ctx.strokeStyle = '#cfc2b0';
    ctx.lineWidth = Math.max(1.5, 2 * u);
    for (let y = top + 18 * u, row = 0; y < h; y += 26 * u, row++)
      for (let x = (row % 2) * 24 * u; x < w; x += 48 * u) {
        ctx.beginPath();
        ctx.ellipse(x, y, 20 * u, 10 * u, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    bunting(ctx, w, h * 0.3, h * 0.04, 30 * u, ['#a58bd6', '#f7c65a', '#7cc47f', '#f4a3b4']);
    for (const x of [0.12, 0.35, 0.65, 0.88]) lantern(ctx, w * x, h * 0.4, 14 * u);
  }
  return c;
}
