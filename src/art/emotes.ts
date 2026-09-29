import { PAL } from './palette';
import { makeCanvas, heart, sparkle } from './draw';

/** Speech-bubble emotes shown over characters: heart, !, ?, zzz, music note, sparkle, sweat. */
export const EMOTES = ['heart', 'exclaim', 'question', 'zzz', 'note', 'sparkle', 'sweat', 'star'] as const;
export type Emote = (typeof EMOTES)[number];

export function drawEmote(kind: Emote): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(64, 64);
  // bubble
  ctx.beginPath();
  ctx.ellipse(32, 28, 26, 22, 0, 0, Math.PI * 2);
  ctx.moveTo(24, 46);
  ctx.lineTo(30, 60);
  ctx.lineTo(38, 46);
  ctx.fillStyle = PAL.paper;
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = PAL.ink;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = PAL.paper;
  ctx.fillRect(25, 42, 12, 6);
  const text = (t: string, color: string, size = 30) => {
    ctx.fillStyle = color;
    ctx.font = `700 ${size}px Fredoka, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t, 32, 29);
  };
  switch (kind) {
    case 'heart':
      heart(ctx, 32, 30, 30);
      ctx.fillStyle = PAL.red;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.stroke();
      break;
    case 'exclaim':
      text('!', PAL.orange, 36);
      break;
    case 'question':
      text('?', PAL.blue, 34);
      break;
    case 'zzz':
      text('z', PAL.purple, 22);
      ctx.font = '700 16px Fredoka, sans-serif';
      ctx.fillText('z', 44, 18);
      break;
    case 'note':
      text('♪', PAL.purple, 32);
      break;
    case 'sparkle':
      sparkle(ctx, 32, 28, 16, PAL.gold);
      sparkle(ctx, 46, 16, 6, PAL.gold);
      break;
    case 'sweat':
      ctx.beginPath();
      ctx.moveTo(32, 12);
      ctx.quadraticCurveTo(44, 30, 32, 40);
      ctx.quadraticCurveTo(20, 30, 32, 12);
      ctx.fillStyle = PAL.blue;
      ctx.fill();
      ctx.stroke();
      break;
    case 'star':
      text('★', PAL.gold, 32);
      break;
  }
  return c;
}
