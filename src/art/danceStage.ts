import { PAL } from './palette';
import { makeCanvas } from './draw';

/**
 * Painted backdrops for the dance floor, drawn at the screen's size: the Sunny Marigold's deck
 * at sunset (the hornpipe) and Tockwood's plaza under lantern light (home dances).
 */
export type StageKind = 'deck' | 'plaza' | 'diner' | 'nile' | 'court';

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
  if (kind === 'court') {
    // Lady Orsola's courtyard in Florence: an evening sky, the great dome, arches, banners and a marble floor
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.45);
    sky.addColorStop(0, '#3f4f8f');
    sky.addColorStop(1, '#e9a37a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.45);
    // the dome over the rooftops
    const dx = w * 0.5;
    const dy = h * 0.3;
    ctx.fillStyle = '#c96a4a';
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = Math.max(2, 4 * u);
    ctx.beginPath();
    ctx.moveTo(dx - 130 * u, dy);
    ctx.quadraticCurveTo(dx - 120 * u, dy - 170 * u, dx, dy - 190 * u);
    ctx.quadraticCurveTo(dx + 120 * u, dy - 170 * u, dx + 130 * u, dy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#f3e6c4';
    ctx.lineWidth = Math.max(1.5, 3 * u);
    for (const k of [-0.5, 0, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(dx + k * 130 * u, dy);
      ctx.quadraticCurveTo(dx + k * 90 * u, dy - 120 * u, dx, dy - 188 * u);
      ctx.stroke();
    }
    ctx.fillStyle = '#f3e6c4';
    ctx.fillRect(dx - 14 * u, dy - 220 * u, 28 * u, 32 * u);
    // the arcade: cream walls with round arches
    const top = h * 0.3;
    const floor = h * 0.58;
    ctx.fillStyle = '#f3e6c4';
    ctx.fillRect(0, top, w, floor - top);
    ctx.fillStyle = '#5a4a6a';
    const n = Math.max(4, Math.round(w / (170 * u)));
    const aw = w / n;
    for (let i = 0; i < n; i++) {
      const ax = i * aw + aw * 0.18;
      const aww = aw * 0.64;
      ctx.beginPath();
      ctx.moveTo(ax, floor);
      ctx.lineTo(ax, top + aww * 0.55);
      ctx.arc(ax + aww / 2, top + aww * 0.55, aww / 2, Math.PI, 0);
      ctx.lineTo(ax + aww, floor);
      ctx.closePath();
      ctx.fill();
    }
    // banners in the family's colours
    for (let i = 0; i < n; i++) {
      const bx = (i + 0.5) * aw;
      if (i % 2) continue;
      ctx.fillStyle = i % 4 ? '#6f3fa0' : '#b8404a';
      ctx.beginPath();
      ctx.moveTo(bx - 20 * u, top - 10 * u);
      ctx.lineTo(bx + 20 * u, top - 10 * u);
      ctx.lineTo(bx + 20 * u, top + 70 * u);
      ctx.lineTo(bx, top + 56 * u);
      ctx.lineTo(bx - 20 * u, top + 70 * u);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = PAL.ink;
      ctx.lineWidth = Math.max(1.5, 2.5 * u);
      ctx.stroke();
      ctx.fillStyle = '#f7c65a';
      ctx.beginPath();
      ctx.arc(bx, top + 26 * u, 8 * u, 0, Math.PI * 2);
      ctx.fill();
    }
    // the marble floor with a star in the middle
    ctx.fillStyle = '#efe9e0';
    ctx.fillRect(0, floor, w, h - floor);
    ctx.strokeStyle = '#d6cabb';
    ctx.lineWidth = Math.max(1.5, 2 * u);
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + i * w * 0.05, floor);
      ctx.lineTo(w / 2 + i * w * 0.14, h);
      ctx.stroke();
    }
    for (let y = floor + 26 * u, k = 1; y < h; y += 26 * u * (1 + k * 0.2), k++) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (const x of [0.15, 0.85]) lantern(ctx, w * x, h * 0.4, 14 * u);
    bunting(ctx, w, h * 0.05, h * 0.03, 26 * u, ['#6f3fa0', '#f7c65a', '#b8404a', '#fff4e0']);
    return c;
  }
  if (kind === 'nile') {
    // the builders' festival at Giza: a dusky sky, the pyramids across the Nile, a limestone floor
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#4b3f8a');
    sky.addColorStop(0.6, '#e98a6a');
    sky.addColorStop(1, '#ffd08a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon + 4);
    // pyramids on the horizon (the new one with its golden tip)
    for (const [x, pw, gold] of [
      [0.28, 300, true],
      [0.55, 200, false],
      [0.76, 150, false],
    ] as [number, number, boolean][]) {
      const px = w * x;
      const ph = pw * 0.62 * u;
      ctx.fillStyle = '#d9b07a';
      ctx.beginPath();
      ctx.moveTo(px - (pw / 2) * u, horizon);
      ctx.lineTo(px, horizon - ph);
      ctx.lineTo(px + (pw / 2) * u, horizon);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(120, 70, 40, 0.18)';
      ctx.beginPath();
      ctx.moveTo(px, horizon - ph);
      ctx.lineTo(px + (pw / 2) * u, horizon);
      ctx.lineTo(px, horizon);
      ctx.closePath();
      ctx.fill();
      if (gold) {
        ctx.fillStyle = '#f7c65a';
        ctx.beginPath();
        ctx.moveTo(px - 26 * u, horizon - ph + 40 * u);
        ctx.lineTo(px, horizon - ph);
        ctx.lineTo(px + 26 * u, horizon - ph + 40 * u);
        ctx.closePath();
        ctx.fill();
      }
    }
    // the Nile with sunset glints
    const river = ctx.createLinearGradient(0, horizon, 0, h * 0.6);
    river.addColorStop(0, '#4fa6c4');
    river.addColorStop(1, '#3a86a8');
    ctx.fillStyle = river;
    ctx.fillRect(0, horizon, w, h * 0.1);
    ctx.fillStyle = 'rgba(255, 220, 150, 0.6)';
    for (let i = 0; i < 6; i++) ctx.fillRect(w * 0.28 - (50 - i * 6) * u, horizon + (6 + i * 9) * u, (100 - i * 12) * u, 3 * u);
    // palms at the edges
    for (const [x, s] of [
      [0.05, 1],
      [0.95, -1],
    ] as [number, number][]) {
      const px = w * x;
      ctx.strokeStyle = '#8a5a3a';
      ctx.lineWidth = 16 * u;
      ctx.beginPath();
      ctx.moveTo(px, h * 0.62);
      ctx.quadraticCurveTo(px + s * 30 * u, h * 0.4, px + s * 12 * u, h * 0.18);
      ctx.stroke();
      ctx.fillStyle = '#5fa85a';
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k - 2.5) * 0.55;
        ctx.beginPath();
        ctx.ellipse(px + s * 12 * u + Math.cos(a) * 60 * u, h * 0.18 + Math.sin(a) * 30 * u + 20 * u, 70 * u, 16 * u, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // the limestone festival floor with a turquoise and gold border
    const top = h * 0.58;
    ctx.fillStyle = '#f3e6c4';
    ctx.fillRect(0, top, w, h - top);
    ctx.fillStyle = '#4fb8b0';
    ctx.fillRect(0, top, w, 10 * u);
    ctx.fillStyle = '#f7c65a';
    for (let x = 0; x < w; x += 40 * u) ctx.fillRect(x, top + 10 * u, 20 * u, 8 * u);
    ctx.strokeStyle = '#e0cfa6';
    ctx.lineWidth = Math.max(1.5, 2 * u);
    for (let y = top + 50 * u; y < h; y += 44 * u) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    bunting(ctx, w, h * 0.06, h * 0.04, 30 * u, ['#4fb8b0', '#f7c65a', '#e46a6a', '#fbf6ea']);
    for (const x of [0.18, 0.42, 0.62, 0.84]) lantern(ctx, w * x, h * 0.36, 14 * u);
    return c;
  }
  if (kind === 'diner') {
    // the Rock-a-Roll Diner's dance floor: pink walls, a glowing jukebox, a black-and-white floor
    ctx.fillStyle = '#f7c9d9';
    ctx.fillRect(0, 0, w, h * 0.56);
    ctx.fillStyle = '#fbe0ea';
    for (let x = 0; x < w; x += 60 * u) ctx.fillRect(x, 0, 30 * u, h * 0.56);
    ctx.fillStyle = '#6ec9c0';
    ctx.fillRect(0, h * 0.5, w, h * 0.06);
    // records on the wall
    for (const [x, y] of [
      [0.12, 0.18],
      [0.3, 0.12],
      [0.7, 0.12],
      [0.88, 0.18],
    ]) {
      ctx.fillStyle = '#2a2233';
      ctx.beginPath();
      ctx.arc(w * x, h * y, 34 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e0555f';
      ctx.beginPath();
      ctx.arc(w * x, h * y, 11 * u, 0, Math.PI * 2);
      ctx.fill();
    }
    // the jukebox glow in the middle
    const jg = ctx.createRadialGradient(w / 2, h * 0.34, 10 * u, w / 2, h * 0.34, 170 * u);
    jg.addColorStop(0, 'rgba(255, 214, 120, 0.8)');
    jg.addColorStop(1, 'rgba(255, 214, 120, 0)');
    ctx.fillStyle = jg;
    ctx.fillRect(0, 0, w, h * 0.6);
    ctx.fillStyle = '#c98d55';
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = Math.max(2, 4 * u);
    ctx.beginPath();
    ctx.roundRect(w / 2 - 60 * u, h * 0.2, 120 * u, h * 0.34, [60 * u, 60 * u, 8 * u, 8 * u]);
    ctx.fill();
    ctx.stroke();
    const cols = ['#e46a6a', '#f7c65a', '#7cc47f', '#6fb3e0'];
    cols.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = 7 * u;
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.3, (48 - i * 9) * u, Math.PI, 0);
      ctx.stroke();
    });
    // checkerboard floor
    const top = h * 0.56;
    const s = 64 * u;
    for (let y = top, row = 0; y < h; y += s * 0.55, row++)
      for (let x = -s, col = 0; x < w + s; x += s, col++) {
        ctx.fillStyle = (row + col) % 2 ? '#4a4458' : '#fff4e0';
        ctx.fillRect(x + (row % 2) * 0, y, s, s * 0.55);
      }
    bunting(ctx, w, h * 0.04, h * 0.04, 30 * u, ['#e0555f', '#6ec9c0', '#f7c65a', '#fff4e0']);
  } else if (kind === 'deck') {
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
    // the mast behind the dancers, with its yard and the sail furled along it
    ctx.fillStyle = '#8a5a3a';
    ctx.fillRect(w * 0.5 - 12 * u, 0, 24 * u, top - 20 * u);
    ctx.strokeRect(w * 0.5 - 12 * u, -4, 24 * u, top - 16 * u);
    const yardY = h * 0.12;
    const yardW = 400 * u;
    const yx = w * 0.5 - yardW / 2;
    // ropes from the yard's ends down to the rail
    ctx.lineWidth = Math.max(1.5, 2 * u);
    ctx.beginPath();
    ctx.moveTo(yx + 6 * u, yardY + 12 * u);
    ctx.lineTo(w * 0.5 - yardW * 0.72, top - 26 * u);
    ctx.moveTo(yx + yardW - 6 * u, yardY + 12 * u);
    ctx.lineTo(w * 0.5 + yardW * 0.72, top - 26 * u);
    ctx.stroke();
    ctx.lineWidth = Math.max(2, 3 * u);
    // the yard (a spar across the mast)
    ctx.fillStyle = '#8a5a3a';
    ctx.beginPath();
    ctx.roundRect(yx, yardY + 6 * u, yardW, 12 * u, 6 * u);
    ctx.fill();
    ctx.stroke();
    // a few soft folds of sail hanging below it...
    ctx.fillStyle = '#f2e6cf';
    for (let i = 0; i < 5; i++) {
      const fx = yx + yardW * 0.1 + i * yardW * 0.16;
      ctx.beginPath();
      ctx.moveTo(fx, yardY + 14 * u);
      ctx.quadraticCurveTo(fx + yardW * 0.08, yardY + 34 * u, fx + yardW * 0.16, yardY + 14 * u);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // ...and the rolled-up sail on top, tied in bundles
    ctx.fillStyle = '#fff4e0';
    ctx.beginPath();
    ctx.roundRect(yx + yardW * 0.05, yardY - 14 * u, yardW * 0.9, 24 * u, 12 * u);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#8a5a3a';
    ctx.lineWidth = Math.max(2, 4 * u);
    for (let i = 1; i < 6; i++) {
      const tx = yx + yardW * 0.05 + (i * yardW * 0.9) / 6;
      ctx.beginPath();
      ctx.moveTo(tx, yardY - 13 * u);
      ctx.lineTo(tx, yardY + 9 * u);
      ctx.stroke();
    }
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = Math.max(2, 3 * u);
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
