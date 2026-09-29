import Phaser from 'phaser';
import { drawClocktower } from './clocktower';
import { makeCanvas, sparkle } from './draw';
import { PAL } from './palette';
import { PROP_ART } from './props';
import { TERRAIN_LAYERS, drawDecorAtlas, DECOR_FRAMES, DECOR_SIZE } from './decor';
import { drawLayerTileset, drawPlankTile, drawFloorTile, extrudeTileset } from './terrainTiles';
import { FRAMES, FW, FH, renderCharacterSheet, type CharSpec } from './character';
import { TILE } from '../world/collision';

/** Anchor (as fraction of width/height) for every prop/building texture. */
export const TEXTURE_ORIGIN: Record<string, { ox: number; oy: number }> = {};

/** Registers a canvas as a Phaser texture (replacing any previous one with the same key). */
export function addCanvasTexture(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): Phaser.Textures.CanvasTexture | null {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  return scene.textures.addCanvas(key, canvas);
}

function registerFx(scene: Phaser.Scene) {
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
  {
    const { c, ctx } = makeCanvas(32, 32);
    sparkle(ctx, 16, 16, 15, '#ffffff');
    addCanvasTexture(scene, 'fx-sparkle', c);
  }
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
  {
    // soft ground shadow
    const { c, ctx } = makeCanvas(64, 32);
    const g = ctx.createRadialGradient(32, 16, 2, 32, 16, 30);
    g.addColorStop(0, 'rgba(74,59,53,0.38)');
    g.addColorStop(1, 'rgba(74,59,53,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(32, 16, 31, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    addCanvasTexture(scene, 'fx-shadow', c);
  }
  {
    // big radial light (lamps, glowbroth, portals)
    const { c, ctx } = makeCanvas(256, 256);
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    addCanvasTexture(scene, 'fx-light', c);
  }
  {
    // player marker arrows (P1 orange, P2 blue)
    for (const [key, col] of [
      ['marker-p1', PAL.orange],
      ['marker-p2', PAL.blue],
    ] as const) {
      const { c, ctx } = makeCanvas(40, 30);
      ctx.beginPath();
      ctx.moveTo(6, 4);
      ctx.lineTo(34, 4);
      ctx.lineTo(20, 26);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = PAL.ink;
      ctx.lineJoin = 'round';
      ctx.stroke();
      addCanvasTexture(scene, key, c);
    }
  }
}

function registerTerrain(scene: Phaser.Scene) {
  for (const layer of Object.values(TERRAIN_LAYERS)) {
    addCanvasTexture(scene, `terrain-${layer.key}`, extrudeTileset(drawLayerTileset(layer, TILE), TILE, 4, 4));
  }
  const one = (c: HTMLCanvasElement) => extrudeTileset(c, TILE, 1, 1);
  addCanvasTexture(scene, 'tile-dock', one(drawPlankTile(TILE)));
  addCanvasTexture(scene, 'tile-deck', one(drawPlankTile(TILE, '#c9935f', '#8a5a3a')));
  addCanvasTexture(scene, 'tile-floor-wood', one(drawFloorTile(TILE, 'wood', '#d9a877', '#b57a4e')));
  addCanvasTexture(scene, 'tile-floor-checker', one(drawFloorTile(TILE, 'checker', '#fff4e0', '#e46a6a')));
  addCanvasTexture(scene, 'tile-floor-stone', one(drawFloorTile(TILE, 'stone', '#e3d3b0', '#bfa77e')));
  addCanvasTexture(scene, 'tile-floor-sandstone', one(drawFloorTile(TILE, 'sandstone', '#e8c98f', '#c9a060')));
  const tex = addCanvasTexture(scene, 'decor', drawDecorAtlas());
  DECOR_FRAMES.forEach((f, i) => tex?.add(f, 0, i * DECOR_SIZE, 0, DECOR_SIZE, DECOR_SIZE));
}

function registerProps(scene: Phaser.Scene) {
  for (const [key, make] of Object.entries(PROP_ART)) {
    const art = make();
    addCanvasTexture(scene, key, art.cv.c);
    TEXTURE_ORIGIN[key] = { ox: art.ox, oy: art.oy };
  }
  TEXTURE_ORIGIN.clocktower = { ox: 0.5, oy: 1 };
  TEXTURE_ORIGIN['clocktower-fixed'] = { ox: 0.5, oy: 1 };
}

/** Build (or rebuild) a character sprite sheet texture with one named frame per pose. */
export function ensureCharacterTexture(scene: Phaser.Scene, key: string, spec: CharSpec, force = false): string {
  if (scene.textures.exists(key) && !force) return key;
  const tex = addCanvasTexture(scene, key, renderCharacterSheet(spec));
  FRAMES.forEach((f, i) => tex?.add(f.name, 0, i * FW, 0, FW, FH));
  return key;
}

export function registerAllTextures(scene: Phaser.Scene): void {
  registerFx(scene);
  addCanvasTexture(scene, 'clocktower', drawClocktower({ tangled: true }).c);
  addCanvasTexture(scene, 'clocktower-fixed', drawClocktower({ tangled: false }).c);
  registerTerrain(scene);
  registerProps(scene);
}
