import { PAL, shade } from './palette';
import { makeCanvas, rng } from './draw';

/**
 * Interior backdrops: the back wall (with wallpaper, windows, trim), side walls, floor pattern,
 * rugs and a doormat, painted into one canvas the size of the room.
 */
export interface RoomSpec {
  w: number;
  h: number;
  wallRows: number;
  wall: string;
  wallTrim: string;
  pattern: 'stripes' | 'dots' | 'plain' | 'stone' | 'roots' | 'panels' | 'hieroglyph' | 'checker' | 'neon';
  floor: 'wood' | 'stone' | 'checker' | 'earth' | 'marble' | 'tiles' | 'sandstone' | 'deck';
  floorA: string;
  floorB: string;
  windows?: number[];
  door: { x: number; w: number };
  rugs?: { x: number; y: number; w: number; h: number; a: string; b: string; round?: boolean }[];
  extras?: (ctx: CanvasRenderingContext2D, T: number) => void;
  outside?: string;
}

export function drawRoom(spec: RoomSpec, T: number): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(spec.w * T, spec.h * T);
  const W = spec.w * T;
  const H = spec.h * T;
  const r = rng(spec.w * 31 + spec.h);
  ctx.fillStyle = spec.outside ?? '#3d2f2a';
  ctx.fillRect(0, 0, W, H);
  // ---- floor
  const fx = T * 0.8;
  const fy = spec.wallRows * T;
  const fw = W - T;
  const fh = H - fy - T * 0.5;
  ctx.save();
  ctx.beginPath();
  ctx.rect(fx, fy, fw, fh);
  ctx.clip();
  ctx.fillStyle = spec.floorA;
  ctx.fillRect(fx, fy, fw, fh);
  switch (spec.floor) {
    case 'wood':
    case 'deck': {
      ctx.strokeStyle = spec.floorB;
      ctx.lineWidth = 3;
      const plank = T / 3;
      for (let y = fy; y < fy + fh; y += plank) {
        ctx.beginPath();
        ctx.moveTo(fx, y);
        ctx.lineTo(fx + fw, y);
        ctx.stroke();
        const off = r() * T;
        for (let x = fx + off; x < fx + fw; x += T * 1.6) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + plank);
          ctx.stroke();
        }
      }
      break;
    }
    case 'checker':
      ctx.fillStyle = spec.floorB;
      for (let y = 0; y < fh / (T / 2); y++) for (let x = 0; x < fw / (T / 2); x++) if ((x + y) % 2) ctx.fillRect(fx + (x * T) / 2, fy + (y * T) / 2, T / 2, T / 2);
      break;
    case 'stone':
    case 'sandstone':
    case 'tiles':
    case 'marble': {
      ctx.strokeStyle = spec.floorB;
      ctx.lineWidth = spec.floor === 'marble' ? 2 : 3;
      const s = spec.floor === 'tiles' ? T / 2 : T;
      for (let y = fy; y < fy + fh; y += s) {
        const row = Math.round((y - fy) / s);
        for (let x = fx - (row % 2 ? s / 2 : 0); x < fx + fw; x += s) {
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, s - 4, s - 4, 6);
          ctx.stroke();
        }
      }
      if (spec.floor === 'marble') {
        ctx.strokeStyle = 'rgba(160,150,170,0.35)';
        for (let i = 0; i < 18; i++) {
          ctx.beginPath();
          const x = fx + r() * fw;
          const y = fy + r() * fh;
          ctx.moveTo(x, y);
          ctx.bezierCurveTo(x + 20, y + 10, x + 30, y - 10, x + 60, y + 6);
          ctx.stroke();
        }
      }
      break;
    }
    case 'earth':
      ctx.fillStyle = spec.floorB;
      for (let i = 0; i < 70; i++) {
        ctx.beginPath();
        ctx.ellipse(fx + r() * fw, fy + r() * fh, 6 + r() * 8, 3 + r() * 4, r() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
  }
  // soft shadow under the back wall
  const g = ctx.createLinearGradient(0, fy, 0, fy + T * 0.6);
  g.addColorStop(0, 'rgba(74,59,53,0.28)');
  g.addColorStop(1, 'rgba(74,59,53,0)');
  ctx.fillStyle = g;
  ctx.fillRect(fx, fy, fw, T * 0.6);
  ctx.restore();
  // ---- rugs
  for (const rug of spec.rugs ?? []) {
    const x = rug.x * T;
    const y = rug.y * T;
    const w = rug.w * T;
    const h = rug.h * T;
    ctx.beginPath();
    if (rug.round) ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else ctx.roundRect(x, y, w, h, 18);
    ctx.fillStyle = rug.a;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = PAL.ink;
    ctx.stroke();
    ctx.beginPath();
    if (rug.round) ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 16, h / 2 - 16, 0, 0, Math.PI * 2);
    else ctx.roundRect(x + 14, y + 14, w - 28, h - 28, 12);
    ctx.lineWidth = 6;
    ctx.strokeStyle = rug.b;
    ctx.stroke();
  }
  // ---- back wall
  const wy = 0;
  const wh = spec.wallRows * T;
  ctx.fillStyle = spec.wall;
  ctx.fillRect(fx, wy, fw, wh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(fx, wy, fw, wh);
  ctx.clip();
  switch (spec.pattern) {
    case 'stripes':
      ctx.fillStyle = shade(spec.wall, -0.06);
      for (let x = fx; x < fx + fw; x += T / 2) ctx.fillRect(x, wy, T / 4, wh);
      break;
    case 'dots':
      ctx.fillStyle = shade(spec.wall, -0.08);
      for (let y = wy + 20; y < wh; y += 36) for (let x = fx + ((y / 36) % 2) * 18 + 10; x < fx + fw; x += 36) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'stone':
      ctx.strokeStyle = shade(spec.wall, -0.2);
      ctx.lineWidth = 3;
      for (let y = wy; y < wh; y += T / 2) {
        const row = Math.round(y / (T / 2));
        for (let x = fx - (row % 2 ? T / 2 : 0); x < fx + fw; x += T) {
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, T - 4, T / 2 - 4, 8);
          ctx.stroke();
        }
      }
      break;
    case 'roots':
      ctx.strokeStyle = shade(spec.wall, -0.18);
      ctx.lineWidth = 7;
      for (let i = 0; i < 9; i++) {
        const x = fx + r() * fw;
        ctx.beginPath();
        ctx.moveTo(x, wy);
        ctx.bezierCurveTo(x + 40 * (r() - 0.5), wh * 0.3, x + 60 * (r() - 0.5), wh * 0.7, x + 30 * (r() - 0.5), wh);
        ctx.stroke();
      }
      break;
    case 'panels':
      ctx.strokeStyle = shade(spec.wall, -0.15);
      ctx.lineWidth = 4;
      for (let x = fx + 12; x < fx + fw - 40; x += T) {
        ctx.beginPath();
        ctx.roundRect(x, wh * 0.5, T - 24, wh * 0.4, 8);
        ctx.stroke();
      }
      break;
    case 'hieroglyph':
      ctx.fillStyle = shade(spec.wall, -0.22);
      ctx.font = '700 34px Fredoka, sans-serif';
      for (let y = wy + 50; y < wh; y += 60) for (let x = fx + 30; x < fx + fw; x += 70) ctx.fillText(['𓂀', '☥', '◯', '𓆣', '〰', '▲'][Math.floor(r() * 6)], x, y);
      break;
    case 'checker':
      ctx.fillStyle = shade(spec.wall, -0.07);
      for (let y = 0; y < wh / 24; y++) for (let x = 0; x < fw / 24; x++) if ((x + y) % 2) ctx.fillRect(fx + x * 24, y * 24, 24, 24);
      break;
    case 'neon':
      ctx.strokeStyle = '#ff9ecb';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(fx, wh * 0.35);
      ctx.lineTo(fx + fw, wh * 0.35);
      ctx.stroke();
      ctx.strokeStyle = '#8fe3ff';
      ctx.beginPath();
      ctx.moveTo(fx, wh * 0.45);
      ctx.lineTo(fx + fw, wh * 0.45);
      ctx.stroke();
      break;
  }
  // windows
  for (const wxCell of spec.windows ?? []) {
    const x = wxCell * T + T * 0.1;
    const y = wh * 0.18;
    const ww = T * 0.8;
    const whh = wh * 0.5;
    ctx.fillStyle = '#9fd6ec';
    ctx.beginPath();
    ctx.roundRect(x, y, ww, whh, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(x + 6, y + whh * 0.7);
    ctx.lineTo(x + ww * 0.55, y + 6);
    ctx.lineTo(x + ww * 0.75, y + 6);
    ctx.lineTo(x + 6, y + whh * 0.95);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = PAL.ink;
    ctx.beginPath();
    ctx.roundRect(x, y, ww, whh, 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + ww / 2, y);
    ctx.lineTo(x + ww / 2, y + whh);
    ctx.moveTo(x, y + whh / 2);
    ctx.lineTo(x + ww, y + whh / 2);
    ctx.lineWidth = 3;
    ctx.stroke();
    // curtains
    ctx.fillStyle = PAL.pink;
    for (const s of [0, 1]) {
      ctx.beginPath();
      const cx = s ? x + ww + 4 : x - 4;
      ctx.moveTo(cx, y - 6);
      ctx.quadraticCurveTo(cx + (s ? -18 : 18), y + whh * 0.5, cx, y + whh + 8);
      ctx.lineTo(cx + (s ? 12 : -12), y + whh + 8);
      ctx.lineTo(cx + (s ? 12 : -12), y - 6);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
  ctx.restore();
  // trims
  ctx.fillStyle = spec.wallTrim;
  ctx.fillRect(fx, wh - 14, fw, 14);
  ctx.fillRect(fx, 0, fw, 10);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(fx, 0, fw, wh);
  // side + bottom walls (seen from above)
  ctx.fillStyle = shade(spec.wallTrim, -0.1);
  ctx.fillRect(0, 0, fx, H);
  ctx.fillRect(W - fx, 0, fx, H);
  const doorX = spec.door.x * T;
  const doorW = spec.door.w * T;
  ctx.fillRect(0, H - T * 0.5, doorX, T * 0.5);
  ctx.fillRect(doorX + doorW, H - T * 0.5, W - doorX - doorW, T * 0.5);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(fx, wh, fw, H - wh - T * 0.5);
  // door mat
  ctx.fillStyle = '#c9794f';
  ctx.beginPath();
  ctx.roundRect(doorX + 8, H - T * 0.95, doorW - 16, T * 0.5, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PAL.lamp;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(doorX, H - T * 0.5, doorW, T * 0.5);
  ctx.globalAlpha = 1;
  spec.extras?.(ctx, T);
  return c;
}
