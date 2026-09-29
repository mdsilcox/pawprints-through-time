import { TerrainGrid } from '../terrain';
import { registerMap, type MapObject } from '../mapdef';
import { rng } from '../../art/draw';
import { defineRoom, fur } from './interiors';

/**
 * The Golden Age of Piracy (~1715): Sandy Cove with the Sunny Marigold moored at the pier,
 * the ship's cargo hold, Treasure Island beyond the Swirling Shoals and the treasure cave.
 */
export const COVE = {
  portal: { x: 7.5, y: 18.5 },
  market: { x: 16.5, y: 8.5 },
  pier: { x: 29.5, y: 21 },
  ship: { x: 36, y: 22.5 },
  camp: { x: 38, y: 7.5 },
};

function palms(o: MapObject[], grid: TerrainGrid, spots: [number, number][], seed: number) {
  const r = rng(seed);
  spots.forEach(([x, y], i) => {
    const t = grid.get(Math.floor(x), Math.floor(y - 0.01));
    if (t === 'sand' || t === 'grass') o.push({ id: `palm-${seed}-${i}`, kind: 'palm', x: x + (r() - 0.5) * 0.4, y, texture: 'tree-palm', foot: { dx: 0, dy: -1, w: 1, h: 1 } });
  });
}

// ------------------------------------------------------------------ Sandy Cove
function buildCove(): TerrainGrid {
  const g = new TerrainGrid(46, 30, 'water');
  g.ellipse('sand', 20, 12, 19, 10).ellipse('sand', 38, 8, 7, 5);
  g.ellipse('grass', 18, 9, 13, 5.5, ['sand']).ellipse('grass', 38, 6.5, 4.5, 2.5, ['sand']);
  g.rect('plaza', 12, 6, 9, 5);
  g.line('path', [[16, 11], [16, 15], [28, 15], [28, 18]], 2, ['grass', 'sand']);
  g.line('path', [[8, 18], [8, 15], [16, 15]], 2, ['grass', 'sand']);
  g.line('path', [[21, 8], [31, 8], [31, 7]], 2, ['grass', 'sand']);
  // the pier, and the Sunny Marigold moored alongside (her deck is walkable)
  g.rect('dock', 28, 18, 2, 8, ['water', 'sand']);
  g.rect('deck', 30, 21, 12, 5, ['water']);
  return g;
}

function coveObjects(grid: TerrainGrid): MapObject[] {
  const o: MapObject[] = [];
  // the ship
  o.push({ id: 'hull', kind: 'prop', x: 36, y: 26, texture: 'prop-hull', p: { floor: true } });
  o.push({ id: 'mast', kind: 'prop', x: 35.5, y: 23.2, texture: 'prop-mast', foot: { dx: 0, dy: -1, w: 1, h: 1 } });
  o.push({ id: 'ship-wheel', kind: 'use', x: 40.6, y: 23.4, texture: 'prop-wheel', foot: { dx: 0, dy: -1, w: 1, h: 1 }, p: { action: 'ship-wheel', label: 'Set sail', range: 1.3 } });
  o.push({ id: 'map-table', kind: 'use', x: 32.4, y: 22.6, texture: 'prop-maptable', foot: { dx: -1, dy: -1, w: 2, h: 1 }, p: { action: 'map-table', label: 'Map table', range: 1.3 } });
  o.push({ id: 'galley', kind: 'use', x: 38.4, y: 25.2, texture: 'prop-galley', foot: { dx: 0, dy: -1, w: 1, h: 1 }, p: { action: 'galley', label: 'Cook', range: 1.3 } });
  o.push({ id: 'hatch', kind: 'use', x: 34, y: 24.6, texture: 'prop-hatch', p: { action: 'hatch', label: 'Go below', range: 0.9, floor: true } });
  // the crew and the town
  o.push({ id: 'marigold', kind: 'npc', x: 31.2, y: 23.8, p: { id: 'marigold', wander: 0.6 } });
  // Pepper guards the gangplank: crew only! (Dress like deckhands to get aboard.)
  o.push({ id: 'pepper', kind: 'npc', x: 28.6, y: 20.4, p: { id: 'pepper', wander: 0.25 } });
  o.push({ id: 'gangplank', kind: 'use', x: 29.5, y: 22.4, texture: 'prop-crewsign', foot: { dx: 0, dy: -2, w: 1, h: 5 }, when: '!crew:aboard', p: { action: 'gangplank', label: 'Board ship', range: 1.3 } });
  o.push({ id: 'laundry', kind: 'use', x: 24.8, y: 13.5, texture: 'prop-laundry', foot: { dx: -1, dy: -1, w: 3, h: 1 }, p: { action: 'laundry', label: 'Washing line', range: 1.4 } });
  o.push({ id: 'cookie', kind: 'npc', x: 39.4, y: 24.8, p: { id: 'cookie', wander: 0.3 } });
  o.push({ id: 'coco', kind: 'npc', x: 16.5, y: 9.4, p: { id: 'coco', wander: 0.4 } });
  o.push({ id: 'fruit-stall', kind: 'prop', x: 16.5, y: 8.4, texture: 'prop-fruitstall', foot: { dx: -1, dy: -1, w: 2, h: 1 } });
  o.push({ id: 'saltwhistle', kind: 'npc', x: 38.6, y: 8.6, p: { id: 'saltwhistle', wander: 0.8 } });
  o.push({ id: 'mackerel', kind: 'prop', x: 41, y: 10.3, texture: 'prop-rowboat' });
  // ingredients & finds
  o.push({ id: 'salt-0', kind: 'use', x: 12, y: 19.6, texture: 'prop-saltpan', p: { action: 'salt', label: 'Gather salt', range: 1 } });
  o.push({ id: 'salt-1', kind: 'use', x: 15.5, y: 20.2, texture: 'prop-saltpan', p: { action: 'salt', label: 'Gather salt', range: 1 } });
  o.push({ id: 'bottle', kind: 'use', x: 3.6, y: 13.4, texture: 'prop-bottle', when: '!map:bottle', p: { action: 'bottle', label: 'Bottle', range: 1.1 } });
  o.push({ id: 'barrels', kind: 'use', x: 25.6, y: 18.2, texture: 'prop-barrels', foot: { dx: -1, dy: -1, w: 2, h: 1 }, when: '!rescued:bosun', p: { action: 'barrels', label: 'Barrels', range: 1.3 } });
  o.push({ id: 'bosun', kind: 'lostbunny', x: 25.6, y: 19.2, when: 'bosun:free,!rescued:bosun', p: { id: 'bosun' } });
  // the way home
  o.push({ id: 'portal-home', kind: 'use', x: COVE.portal.x, y: COVE.portal.y - 0.6, texture: 'fur-portalring', p: { action: 'portal-home', label: 'Portal home', range: 1.3 } });
  palms(o, grid, [
    [4, 11],
    [6, 8],
    [9.5, 5.5],
    [24, 4.5],
    [27, 6.5],
    [33, 11],
    [35.5, 13.5],
    [22.5, 19.5],
    [18, 21],
    [5, 16],
    [2.5, 13],
    [43, 6],
    [34, 4.5],
    [11, 11.5],
    [22, 11.5],
  ], 71);
  return o;
}

registerMap({
  id: 'cove',
  name: 'Sandy Cove',
  region: 'pirate',
  lighting: 'golden',
  timeOfDay: 'golden',
  music: 'pirate',
  bg: '#4fa6c4',
  layers: ['foam', 'sand', 'grass', 'path', 'plaza'],
  pois: [
    { x: 16.5, y: 5.2, icon: '🥥', label: 'Market' },
    { x: 36, y: 19.6, icon: '⛵', label: 'Sunny Marigold' },
    { x: 38.5, y: 4.8, icon: '🐟', label: 'Merry Mackerel camp' },
    { x: 7.5, y: 20.6, icon: '🌀', label: 'Portal home' },
    { x: 13.5, y: 21.8, icon: '🧂', label: 'Salt pans' },
  ],
  digZones: [
    { id: 'cove-beach', x: 3, y: 13, w: 30, h: 9, on: ['sand'], perDay: 4, hidden: 0.4, loot: [['doubloon', 30], ['scallop', 25], ['conch', 15], ['sea-glass', 15], ['coconut', 15]] },
  ],
  zones: [
    { id: 'cove-market', x: 12, y: 5, w: 10, h: 6 },
    { id: 'cove-pier', x: 27, y: 17, w: 4, h: 9 },
    { id: 'cove-ship', x: 30, y: 21, w: 12, h: 5 },
    { id: 'cove-camp', x: 33, y: 4, w: 10, h: 7 },
  ],
  spawns: {
    portal: { x: COVE.portal.x, y: COVE.portal.y + 0.8, facing: 'down' },
    'from-hold': { x: 34, y: 23.4, facing: 'down' },
    'from-isle': { x: 37.5, y: 23.9, facing: 'left' },
  },
  build: () => {
    const grid = buildCove();
    return { grid, objects: coveObjects(grid) };
  },
});

// ------------------------------------------------------------------ the cargo hold (below deck)
defineRoom({
  id: 'hold',
  name: 'The Cargo Hold',
  music: 'pirate',
  region: 'pirate',
  exitTo: 'cove',
  outSpawn: 'from-hold',
  spec: {
    w: 12,
    h: 8,
    wallRows: 2,
    wall: '#8a5a3a',
    wallTrim: '#5d3f2a',
    pattern: 'panels',
    floor: 'deck',
    floorA: '#c98d55',
    floorB: '#b57a4e',
    door: { x: 5, w: 2 },
    outside: '#2a1f18',
  },
  objects: () => [
    { id: 'hold-crates', kind: 'prop', x: 2.2, y: 3.6, texture: 'prop-cratejam', foot: { dx: -1, dy: -1, w: 2, h: 1 } },
    { id: 'hold-barrels', kind: 'prop', x: 9.8, y: 3.6, texture: 'prop-barrels', foot: { dx: -1, dy: -1, w: 2, h: 1 } },
    { id: 'hold-barrels2', kind: 'prop', x: 2.3, y: 6.4, texture: 'prop-barrels', foot: { dx: -1, dy: -1, w: 2, h: 1 } },
    { id: 'skipper', kind: 'lostbunny', x: 10.2, y: 6.2, when: '!rescued:skipper', p: { id: 'skipper', needsSniff: true } },
  ],
});

// ------------------------------------------------------------------ Treasure Island
function buildIsle(): TerrainGrid {
  const g = new TerrainGrid(34, 24, 'water');
  g.ellipse('sand', 17, 12, 15, 9);
  g.ellipse('grass', 18, 10, 10, 5, ['sand']);
  g.rect('plaza', 20, 3, 7, 4, ['grass', 'sand']);
  g.line('path', [[6, 13], [12, 13], [12, 9], [23, 9], [23, 7]], 2, ['grass', 'sand']);
  g.rect('dock', 3, 13, 3, 2, ['water', 'sand']);
  return g;
}

function isleObjects(grid: TerrainGrid): MapObject[] {
  const o: MapObject[] = [];
  o.push({ id: 'isle-rowboat', kind: 'use', x: 3.2, y: 15.6, texture: 'prop-rowboat', p: { action: 'rowboat', label: 'Row back', range: 1.5 } });
  o.push({ id: 'stone-door', kind: 'building', x: 23.5, y: 7.2, texture: 'prop-stonedoor', foot: { dx: -1, dy: -2, w: 3, h: 2 }, when: '!isle:door', p: { label: 'Stone door' } });
  o.push({ id: 'stone-door-open', kind: 'building', x: 23.5, y: 7.2, texture: 'prop-stonedoor-open', foot: { dx: -1, dy: -2, w: 3, h: 2 }, when: 'isle:door', p: { door: 'cave-in', label: 'Treasure cave' } });
  o.push({ id: 'door-riddle', kind: 'use', x: 23.5, y: 7.4, when: '!isle:door', p: { action: 'isle-door', label: 'Read the door', range: 1.4 } });
  o.push({ id: 'shelly', kind: 'lostbunny', x: 27.5, y: 16.2, when: '!rescued:shelly', p: { id: 'shelly' } });
  palms(o, grid, [
    [7, 9],
    [9, 16],
    [14, 18.5],
    [20, 18],
    [26, 13],
    [29, 9.5],
    [15, 5.5],
    [11, 6],
    [30, 14.5],
    [24, 19],
  ], 93);
  for (const [x, y] of [
    [18, 4.2],
    [28, 5.5],
  ])
    o.push({ id: `isle-rock-${x}`, kind: 'prop', x, y, texture: 'prop-rock', foot: { dx: 0, dy: -1, w: 1, h: 1 } });
  return o;
}

registerMap({
  id: 'isle',
  name: 'Treasure Island',
  region: 'pirate',
  lighting: 'golden',
  timeOfDay: 'golden',
  music: 'pirate',
  bg: '#4fa6c4',
  layers: ['foam', 'sand', 'grass', 'path', 'plaza'],
  pois: [
    { x: 23.5, y: 2.2, icon: '🗿', label: 'Stone door' },
    { x: 3.5, y: 17.4, icon: '🚣', label: 'Rowboat' },
  ],
  digZones: [{ id: 'isle-beach', x: 4, y: 12, w: 26, h: 8, on: ['sand'], perDay: 3, hidden: 0.3, loot: [['doubloon', 40], ['conch', 20], ['scallop', 20], ['coconut', 20]] }],
  zones: [{ id: 'isle-beach', x: 3, y: 12, w: 28, h: 9 }],
  spawns: {
    landing: { x: 6, y: 13.8, facing: 'right' },
    'from-cave': { x: 23.5, y: 8.2, facing: 'down' },
  },
  build: () => {
    const grid = buildIsle();
    return { grid, objects: isleObjects(grid) };
  },
});

// ------------------------------------------------------------------ the treasure cave (torch-lit)
defineRoom({
  id: 'cave',
  name: 'The Treasure Cave',
  music: 'pirate',
  region: 'pirate',
  exitTo: 'isle',
  outSpawn: 'from-cave',
  spec: {
    w: 11,
    h: 8,
    wallRows: 2,
    wall: '#7d7466',
    wallTrim: '#5d5569',
    pattern: 'stone',
    floor: 'earth',
    floorA: '#b8a58a',
    floorB: '#a08e74',
    door: { x: 5, w: 1 },
    outside: '#1d1a2e',
  },
  objects: () => [
    { id: 'torch-1', kind: 'prop', x: 2.2, y: 2.1, texture: 'prop-torch' },
    { id: 'torch-2', kind: 'prop', x: 8.8, y: 2.1, texture: 'prop-torch' },
    { id: 'treasure-chest', kind: 'use', x: 5.5, y: 3.8, texture: 'prop-chest', foot: { dx: 0, dy: -1, w: 1, h: 1 }, p: { action: 'treasure-chest', label: 'Treasure!', range: 1.3 } },
    fur('cave-rock', 'plant', 9.4, 6.4),
  ],
});
