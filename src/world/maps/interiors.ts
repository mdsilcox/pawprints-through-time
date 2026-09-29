import { TerrainGrid } from '../terrain';
import { registerMap, type MapObject } from '../mapdef';
import { drawRoom, type RoomSpec } from '../../art/rooms';
import { TILE } from '../collision';
import { PAL } from '../../art/palette';
import { homeMapObjects } from '../../core/home';

/**
 * Tockwood interiors. Each is a painted backdrop + a collision grid: walls around the edge,
 * floor inside, and a doorway in the bottom wall that leads back outside.
 */
function roomGrid(w: number, h: number, wallRows: number, door: { x: number; w: number }): TerrainGrid {
  const g = new TerrainGrid(w, h, 'wall');
  g.rect('floor', 1, wallRows, w - 2, h - wallRows - 1);
  g.rect('floor', door.x, h - 1, door.w, 1);
  return g;
}

export function fur(id: string, key: string, x: number, y: number, foot?: MapObject['foot'], p?: Record<string, unknown>): MapObject {
  return { id, kind: 'furniture', x, y, texture: `fur-${key}`, foot, p };
}

interface RoomDef {
  id: string;
  name: string;
  music: string;
  spec: RoomSpec;
  objects: () => MapObject[];
  outSpawn: string;
  /** caves are dark: only glowing players light them up */
  lighting?: 'indoor' | 'dark';
  /** rooms in other eras */
  region?: 'tockwood' | 'pirate' | 'egypt' | 'fifties' | 'florence';
  /** the outside map the doorway leads to (default Tockwood) */
  exitTo?: string;
}

export function defineRoom(r: RoomDef) {
  const { w, h, wallRows, door } = r.spec;
  registerMap({
    id: r.id,
    name: r.name,
    region: r.region ?? 'tockwood',
    indoor: true,
    lighting: r.lighting ?? 'indoor',
    timeOfDay: 'day',
    music: r.music,
    bg: r.lighting === 'dark' ? '#0b0a14' : '#3d2f2a',
    layers: [],
    backdrop: () => drawRoom(r.spec, TILE),
    spawns: { in: { x: door.x + door.w / 2, y: h - 1.7, facing: 'up' } },
    exits: [{ x: door.x, y: h - 0.55, w: door.w, h: 1, to: r.exitTo ?? 'tockwood', spawn: r.outSpawn }],
    build: () => ({ grid: roomGrid(w, h, wallRows, door), objects: r.objects() }),
  });
}

// ------------------------------------------------------------------ the clocktower
defineRoom({
  id: 'clocktower',
  name: 'The Clocktower',
  music: 'clocktower',
  outSpawn: 'clocktower-out',
  spec: {
    w: 13,
    h: 11,
    wallRows: 3,
    wall: '#d8cfe6',
    wallTrim: '#8f7fb0',
    pattern: 'stone',
    floor: 'stone',
    floorA: '#e6dccb',
    floorB: '#c9bba5',
    windows: [2, 10],
    door: { x: 6, w: 1 },
    rugs: [{ x: 4, y: 5, w: 5, h: 4, a: '#a58bd6', b: '#f7c65a', round: true }],
  },
  objects: () => [
    fur('gearwall', 'gearwall', 6.5, 2.4),
    { id: 'hourglass', kind: 'use', x: 6.5, y: 5.2, texture: 'fur-greathourglass', foot: { dx: -1, dy: -2, w: 3, h: 2 }, p: { action: 'hourglass', label: 'Look', range: 1.6 } },
    { id: 'portal', kind: 'use', x: 10.5, y: 6, texture: 'fur-portalring', foot: { dx: -1, dy: -2, w: 3, h: 2 }, p: { action: 'portal', label: 'Portal', range: 1.5 } },
    fur('stairs', 'stairs', 2.4, 6, { dx: -1, dy: -3, w: 3, h: 3 }),
    fur('lamp1', 'lampfloor', 4.2, 3.9),
    fur('lamp2', 'lampfloor', 8.8, 3.9),
    { id: 'pip-home', kind: 'pip', x: 6.5, y: 7.2 },
  ],
});

// ------------------------------------------------------------------ your cottage
/** Your cottage (its furniture is yours to arrange — see core/home.ts and the planner). */
export const COTTAGE_SPEC: RoomSpec = {
  w: 11,
  h: 9,
  wallRows: 2,
  wall: '#fbe7c6',
  wallTrim: '#c98f5e',
  pattern: 'stripes',
  floor: 'wood',
  floorA: '#d9a877',
  floorB: '#b57a4e',
  windows: [3, 7],
  door: { x: 5, w: 1 },
};

defineRoom({
  id: 'cottage',
  name: 'Your Cottage',
  music: 'interior',
  outSpawn: 'cottage-out',
  spec: COTTAGE_SPEC,
  objects: () => [
    ...homeMapObjects(),
    // the home planner, by the door (it never has furniture in front of it)
    { id: 'planner', kind: 'use', x: 5.5, y: 7.35, p: { action: 'planner', label: 'Decorate', range: 0.8 } },
  ],
});

// ------------------------------------------------------------------ The Bubbling Burrow
defineRoom({
  id: 'burrow',
  name: 'The Bubbling Burrow',
  music: 'burrow',
  outSpawn: 'burrow-out',
  spec: {
    w: 12,
    h: 9,
    wallRows: 2,
    wall: '#b98a5e',
    wallTrim: '#7d5436',
    pattern: 'roots',
    floor: 'wood',
    floorA: '#caa06f',
    floorB: '#9b7048',
    windows: [9],
    door: { x: 6, w: 1 },
    rugs: [{ x: 4, y: 5.6, w: 5, h: 2, a: '#7cc47f', b: '#fff4e0' }],
    extras: (ctx, T) => {
      // hanging herbs along the top
      for (let i = 0; i < 6; i++) {
        const x = T * (1.6 + i * 1.6);
        ctx.strokeStyle = PAL.ink;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 8);
        ctx.lineTo(x, 34);
        ctx.stroke();
        ctx.fillStyle = i % 2 ? PAL.leaf : '#b8c96a';
        ctx.beginPath();
        ctx.ellipse(x, 44, 12, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    },
  },
  objects: () => [
    { id: 'cauldron', kind: 'use', x: 6.5, y: 5.3, texture: 'fur-cauldron', foot: { dx: -1, dy: -2, w: 3, h: 2 }, p: { action: 'cauldron', label: 'Cauldron', range: 1.7 } },
    fur('jars1', 'shelfjars', 3, 2.6),
    fur('jars2', 'shelfjars', 10, 2.6),
    fur('counter', 'counter', 2.6, 4.6, { dx: -1, dy: -1, w: 3, h: 1 }),
    fur('plant', 'plant', 10.6, 7.3, { dx: 0, dy: -1, w: 1, h: 1 }),
    { id: 'clover', kind: 'npc', x: 8.7, y: 5.2, p: { id: 'clover', wander: 0.8 } },
  ],
});

// ------------------------------------------------------------------ Bramble's Stitch & Style
defineRoom({
  id: 'tailor',
  name: "Bramble's Stitch & Style",
  music: 'interior',
  outSpawn: 'tailor-out',
  spec: {
    w: 11,
    h: 9,
    wallRows: 2,
    wall: '#fbe0e6',
    wallTrim: '#a58bd6',
    pattern: 'dots',
    floor: 'wood',
    floorA: '#e0b58a',
    floorB: '#b8875a',
    windows: [2],
    door: { x: 5, w: 1 },
    rugs: [{ x: 3, y: 4.5, w: 5, h: 2.5, a: '#a58bd6', b: '#f7c65a' }],
  },
  objects: () => [
    fur('fabric', 'fabricshelf', 8.4, 2.95, { dx: -1, dy: -1, w: 2, h: 1 }),
    fur('form1', 'dressform', 9.4, 5, { dx: 0, dy: -1, w: 1, h: 1 }),
    fur('form2', 'dressform', 1.6, 5.2, { dx: 0, dy: -1, w: 1, h: 1 }),
    fur('counter', 'counter', 5.2, 3.2, { dx: -1, dy: -1, w: 3, h: 1 }),
    { id: 'mirror', kind: 'use', x: 3, y: 3.2, texture: 'fur-mirror', foot: { dx: 0, dy: -1, w: 1, h: 1 }, p: { action: 'mirror', label: 'Wardrobe', range: 1.4 } },
    { id: 'bramble', kind: 'npc', x: 6.8, y: 4.4, p: { id: 'bramble', wander: 1.2 } },
  ],
});

// ------------------------------------------------------------------ Tockwood Museum
defineRoom({
  id: 'museum',
  name: 'Tockwood Museum',
  music: 'interior',
  outSpawn: 'museum-out',
  spec: {
    w: 14,
    h: 10,
    wallRows: 3,
    wall: '#efe6d4',
    wallTrim: '#5fb3a8',
    pattern: 'panels',
    floor: 'marble',
    floorA: '#f3eee6',
    floorB: '#d9cfc2',
    windows: [2, 11],
    door: { x: 6, w: 2 },
    rugs: [{ x: 5, y: 3.4, w: 4, h: 5.2, a: '#c0464b', b: '#f7c65a' }],
  },
  objects: () => [
    ...[2.5, 4.5, 9.5, 11.5].map((x, i) => ({ id: `case-${i}`, kind: 'exhibit', x, y: 4.5, texture: 'fur-displaycase', foot: { dx: 0, dy: -1, w: 1, h: 1 }, p: { slot: i } }) as MapObject),
    ...[2.5, 4.5, 9.5, 11.5].map((x, i) => ({ id: `ped-${i}`, kind: 'exhibit', x, y: 7.4, texture: 'fur-pedestal', foot: { dx: 0, dy: -1, w: 1, h: 1 }, p: { slot: i + 4 } }) as MapObject),
    { id: 'quill', kind: 'npc', x: 7, y: 5.2, p: { id: 'quill', wander: 1.2 } },
    { id: 'mosaic', kind: 'use', x: 3.4, y: 9.1, texture: 'prop-mosaic', p: { action: 'mosaic', label: 'Mosaic', range: 1.3, floor: true } },
  ],
});

// ------------------------------------------------------------------ the Glimmer Grotto (dark — bring Glowbroth!)
defineRoom({
  id: 'grotto',
  name: 'Glimmer Grotto',
  music: 'interior',
  outSpawn: 'grotto-out',
  lighting: 'dark',
  spec: {
    w: 12,
    h: 9,
    wallRows: 2,
    wall: '#5d5569',
    wallTrim: '#3d3550',
    pattern: 'stone',
    floor: 'earth',
    floorA: '#6b6378',
    floorB: '#57506a',
    door: { x: 5, w: 2 },
    outside: '#1d1a2e',
    extras: (ctx, T) => {
      // glowing crystals and glowcaps along the walls
      const bits: [number, number, string][] = [
        [1.2, 2.6, '#b8f28a'],
        [3.1, 2.4, '#a8d8ff'],
        [9.4, 2.5, '#e8b5ff'],
        [10.6, 2.8, '#b8f28a'],
        [1.1, 6.8, '#a8d8ff'],
        [10.8, 6.5, '#e8b5ff'],
      ];
      for (const [x, y, c] of bits) {
        ctx.save();
        ctx.shadowColor = c;
        ctx.shadowBlur = 18;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(x * T, y * T - T * 0.5);
        ctx.lineTo(x * T + T * 0.18, y * T);
        ctx.lineTo(x * T - T * 0.18, y * T);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    },
  },
  objects: () => [
    { id: 'grotto-chest', kind: 'use', x: 9.5, y: 4.4, texture: 'prop-chest', foot: { dx: 0, dy: -1, w: 1, h: 1 }, p: { action: 'grotto-chest', label: 'Chest', range: 1.2 } },
  ],
});
