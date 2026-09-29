import Phaser from 'phaser';
import { drawClocktower } from './clocktower';
import { makeCanvas, sparkle } from './draw';
import { PAL } from './palette';
import { PROP_ART } from './props';
import { FURNITURE_ART } from './furniture';
import { TERRAIN_LAYERS, drawDecorAtlas, DECOR_FRAMES, DECOR_SIZE } from './decor';
import { drawLayerTileset, drawPlankTile, drawFloorTile, extrudeTileset } from './terrainTiles';
import { FRAMES, FW, FH, renderCharacterSheet, type CharSpec } from './character';
import { TILE } from '../world/collision';
import { EMOTES, drawEmote } from './emotes';
import { renderCorgiSheet, CORGI_FRAMES, CW, CH } from './corgi';
import { renderBunnySheet, BUNNY_FRAMES, BW, BH, type BunnyLook } from './bunny';
import { PIP_FH, PIP_FW, renderPipSheet } from './fairy';
import type { WornPiece } from './character';

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
    // a ring of light with a clear middle (a glowing character lights up the ground around them)
    const { c, ctx } = makeCanvas(256, 256);
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.22, 'rgba(255,255,255,0)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    addCanvasTexture(scene, 'fx-light-ring', c);
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
  for (const [key, make] of Object.entries({ ...PROP_ART, ...Object.fromEntries(Object.entries(FURNITURE_ART).map(([k, v]) => [`fur-${k}`, v])) })) {
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

/** Biscuit's sprite sheet for a given outfit (cached per outfit). */
export function ensureBiscuitTexture(scene: Phaser.Scene, outfit: { hat?: WornPiece | null; neck?: WornPiece | null }): string {
  const k = (p?: WornPiece | null) => (p ? `${p.kind}:${p.main}` : '-');
  const key = `biscuit-${k(outfit.hat)}-${k(outfit.neck)}`;
  if (scene.textures.exists(key)) return key;
  const tex = addCanvasTexture(scene, key, renderCorgiSheet(outfit));
  CORGI_FRAMES.forEach((f, i) => tex?.add(f, 0, i * CW, 0, CW, CH));
  return key;
}

export function ensureBunnyTexture(scene: Phaser.Scene, key: string, look: BunnyLook): string {
  if (scene.textures.exists(key)) return key;
  const tex = addCanvasTexture(scene, key, renderBunnySheet(look));
  BUNNY_FRAMES.forEach((f, i) => tex?.add(f, 0, i * BW, 0, BW, BH));
  return key;
}

export function registerAllTextures(scene: Phaser.Scene): void {
  registerFx(scene);
  for (const e of EMOTES) addCanvasTexture(scene, `emote-${e}`, drawEmote(e));
  {
    const tex = addCanvasTexture(scene, 'pip', renderPipSheet());
    for (let i = 0; i < 4; i++) tex?.add(i, 0, i * PIP_FW, 0, PIP_FW, PIP_FH);
  }
  ensureBiscuitTexture(scene, { neck: { kind: 'bandana', main: '#e46a6a', accent: '#ffffff' } });
  addCanvasTexture(scene, 'biscuit', renderCorgiSheet({ neck: { kind: 'bandana', main: '#e46a6a', accent: '#ffffff' } }));
  {
    const tex = scene.textures.get('biscuit');
    CORGI_FRAMES.forEach((f, i) => tex.add(f, 0, i * CW, 0, CW, CH));
  }
  addCanvasTexture(scene, 'clocktower', drawClocktower({ tangled: true }).c);
  addCanvasTexture(scene, 'clocktower-fixed', drawClocktower({ tangled: false }).c);
  registerTerrain(scene);
  registerProps(scene);
}
