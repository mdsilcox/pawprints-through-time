import { drawCharacter, type CharSpec } from './character';
import { drawCorgi, CORGI_FRAMES, CW, CH } from './corgi';
import { drawBunny, BUNNY_FRAMES, BW, BH, type BunnyLook } from './bunny';
import { drawPip } from './fairy';
import { makeCanvas } from './draw';
import { CHARACTERS } from '../data/characters';

/** Dev-only: a sheet showing every character so art can be eyeballed in one screenshot. */
export function showGallery(): void {
  const dolls = Object.values(CHARACTERS).filter((c) => c.spec) as { id: string; spec: CharSpec }[];
  const W = 1500;
  const H = 1000;
  const { c, ctx } = makeCanvas(W, H);
  ctx.fillStyle = '#fbf3e3';
  ctx.fillRect(0, 0, W, H);
  dolls.forEach((d, i) => {
    const poses: [Parameters<typeof drawCharacter>[2], Parameters<typeof drawCharacter>[3]][] = [
      ['down', 'idle'],
      ['side', 'walkA'],
      ['up', 'idle'],
      ['down', 'wave'],
    ];
    poses.forEach(([f, p], k) => {
      ctx.save();
      ctx.translate(10 + (i % 4) * 370 + k * 90, 10 + Math.floor(i / 4) * 140);
      drawCharacter(ctx, d.spec, f, p);
      ctx.restore();
    });
  });
  const oy = 300;
  CORGI_FRAMES.forEach((f, i) => {
    ctx.save();
    ctx.translate(10 + (i % 9) * (CW + 4), oy + Math.floor(i / 9) * (CH + 6));
    drawCorgi(ctx, f, { neck: { kind: 'bandana', main: '#e46a6a', accent: '#fff' }, hat: i === 3 ? { kind: 'tricorn', main: '#4a3b35', accent: '#f7c65a' } : null });
    ctx.restore();
  });
  const looks: BunnyLook[] = [
    { fur: '#c9a27e' },
    { fur: '#f4ede4', outfit: 'bandana', accent: '#e46a6a' },
    { fur: '#9c8f86', outfit: 'nemes' },
    { fur: '#e8cfa9', outfit: 'poodle' },
    { fur: '#b88c63', outfit: 'beret', accent: '#b8404a' },
  ];
  looks.forEach((look, j) => {
    BUNNY_FRAMES.forEach((f, i) => {
      ctx.save();
      ctx.translate(10 + i * (BW + 4) + (j % 2) * 620, 520 + Math.floor(j / 2) * (BH + 6));
      drawBunny(ctx, f, look);
      ctx.restore();
    });
  });
  drawPip(ctx, 1300, 760, 1.4, 0.5);
  drawPip(ctx, 1420, 760, 1.0, 1, true);
  c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;z-index:99;background:#fbf3e3';
  c.id = 'art-gallery';
  document.getElementById('art-gallery')?.remove();
  document.body.appendChild(c);
}
