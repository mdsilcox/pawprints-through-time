import Phaser from 'phaser';
import { drawClocktower } from './clocktower';
import { makeCanvas, sparkle } from './draw';
import { PAL } from './palette';

/** Registers a canvas as a Phaser texture (replacing any previous one with the same key). */
export function addCanvasTexture(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

function registerFx(scene: Phaser.Scene) {
  // soft round particle
  {
    const { c, ctx } = makeCanvas(32, 32);
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    addCanvasTexture(scene, 'fx-dot', c);
  }
  // sparkle star
  {
    const { c, ctx } = makeCanvas(32, 32);
    sparkle(ctx, 16, 16, 15, '#ffffff');
    addCanvasTexture(scene, 'fx-sparkle', c);
  }
  // sand grain
  {
    const { c, ctx } = makeCanvas(12, 12);
    ctx.fillStyle = PAL.gold;
    ctx.beginPath();
    ctx.arc(6, 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6c8';
    ctx.beginPath();
    ctx.arc(4.5, 4.5, 2, 0, Math.PI * 2);
    ctx.fill();
    addCanvasTexture(scene, 'fx-sand', c);
  }
}

export function registerAllTextures(scene: Phaser.Scene): void {
  registerFx(scene);
  addCanvasTexture(scene, 'clocktower', drawClocktower({ tangled: true }).c);
  addCanvasTexture(scene, 'clocktower-fixed', drawClocktower({ tangled: false }).c);
}
