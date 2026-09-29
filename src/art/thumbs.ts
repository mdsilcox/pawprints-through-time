import { drawCharacter, TOP_PAD, FW, FH, type CharSpec, type Facing, type Pose } from './character';
import { drawCorgi, CW, CH, type CorgiFrame } from './corgi';
import { makeCanvas } from './draw';
import { CLOTHES_BY_ID, BISCUIT_BY_ID } from '../data/clothes';
import type { OutfitSlot } from '../core/state';

/**
 * Wardrobe pictures: item thumbnails (each piece shown on a plain mannequin, cropped to the
 * part of the body it covers) and full-size previews of a player or Biscuit.
 */
const MANNEQUIN_SKIN = '#eadfce';

/** crop boxes inside a character frame (after TOP_PAD) for each slot */
const CROP: Record<OutfitSlot, [number, number, number, number]> = {
  hat: [4, 0, 88, 84],
  top: [10, 86, 76, 64],
  bottom: [14, 104, 68, 50],
  shoes: [18, 124, 60, 30],
  acc: [4, 20, 88, 118],
};

const cache = new Map<string, string>();

export function itemThumb(id: string, color: number, size = 96): string {
  const key = `${id}:${color}:${size}`;
  if (cache.has(key)) return cache.get(key)!;
  let url: string;
  const cloth = CLOTHES_BY_ID.get(id);
  if (cloth) {
    const [main, accent] = cloth.colors[Math.min(color, cloth.colors.length - 1)];
    const spec: CharSpec = {
      species: 'human',
      skin: MANNEQUIN_SKIN,
      hairStyle: -1,
      outfit: {
        [cloth.slot]: { kind: cloth.kind, main, accent, extra: cloth.extra },
        ...(cloth.slot !== 'top' ? { top: { kind: 'undershirt', main: '#f5efe6', accent: '#e8e0d0' } } : {}),
      },
    };
    const { c: full, ctx } = makeCanvas(FW * 2, FH * 2);
    ctx.scale(2, 2);
    ctx.translate(0, TOP_PAD);
    drawCharacter(ctx, spec, 'down', 'idle');
    const [sx, sy, sw, sh] = CROP[cloth.slot];
    const { c, ctx: out } = makeCanvas(size, size);
    const k = Math.min(size / sw, size / sh);
    const dw = sw * k;
    const dh = sh * k;
    out.drawImage(full, sx * 2, sy * 2, sw * 2, sh * 2, (size - dw) / 2, (size - dh) / 2, dw, dh);
    url = c.toDataURL();
  } else {
    const b = BISCUIT_BY_ID.get(id);
    const { c, ctx } = makeCanvas(size, size);
    if (b) {
      const [main, accent] = b.colors[Math.min(color, b.colors.length - 1)];
      const piece = { kind: b.kind, main, accent };
      ctx.scale(size / 100, size / 100);
      ctx.translate(-6, b.slot === 'hat' ? 8 : -24);
      drawCorgi(ctx, 'down-idle', b.slot === 'hat' ? { hat: piece } : { neck: piece });
    }
    url = c.toDataURL();
  }
  cache.set(key, url);
  return url;
}

/** Big preview of a character for the wardrobe (animated by CSS). */
export function drawPreview(canvas: HTMLCanvasElement, spec: CharSpec, facing: Facing, flip: boolean, pose: Pose = 'idle'): void {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const s = Math.min(canvas.width / FW, canvas.height / FH);
  ctx.save();
  ctx.translate(canvas.width / 2, 0);
  ctx.scale(flip ? -s : s, s);
  ctx.translate(-FW / 2, TOP_PAD);
  drawCharacter(ctx, spec, facing, pose);
  ctx.restore();
}

export function drawBiscuitPreview(canvas: HTMLCanvasElement, outfit: Parameters<typeof drawCorgi>[2], frame: CorgiFrame = 'happy', flip = false): void {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const s = Math.min(canvas.width / CW, canvas.height / CH) * 0.95;
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height - CH * s - 4);
  ctx.scale(flip ? -s : s, s);
  ctx.translate(-CW / 2, 0);
  drawCorgi(ctx, frame, outfit);
  ctx.restore();
}
