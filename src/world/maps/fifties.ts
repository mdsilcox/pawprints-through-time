import { TerrainGrid } from '../terrain';
import { registerMap, type MapObject } from '../mapdef';
import { rng } from '../../art/draw';
import { defineRoom, fur } from './interiors';

/**
 * 1950s America: Maple Street (a little American town around 1957), the Starlight Lanes
 * bowling alley and the Rock-a-Roll Diner with its roller rink and jukebox.
 */
export const MAPLE = {
  portal: { x: 8, y: 24 },
  diner: { x: 10, y: 10.6 },
  records: { x: 21, y: 10.6 },
  lanes: { x: 33, y: 10.6 },
};

function buildMaple(): TerrainGrid {
  const g = new TerrainGrid(46, 30, 'grass');
  g.rect('tile', 0, 11, 46, 2); // north sidewalk
  g.rect('road', 0, 13, 46, 3); // Maple Street
  g.rect('tile', 0, 16, 46, 2); // south sidewalk
  g.line('path', [[8, 18], [8, 25]], 2, ['grass']); // into the park
  g.rect('plaza', 5, 22, 7, 5, ['grass', 'path']); // the park's little square
  g.line('path', [[30, 18], [30, 23]], 2, ['grass']);
  g.line('path', [[40, 18], [40, 23]], 2, ['grass']);
  return g;
}

function mapleObjects(): MapObject[] {
  const o: MapObject[] = [];
  const add = (kind: MapObject['kind'], id: string, x: number, y: number, extra: Partial<MapObject> = {}) => o.push({ id, kind, x, y, ...extra });
  // the buildings along the north side
  add('building', 'diner', MAPLE.diner.x, MAPLE.diner.y, { texture: 'bld-diner', foot: { dx: -3, dy: -3, w: 6, h: 3 }, p: { door: 'diner-in', label: 'Rock-a-Roll Diner' } });
  add('building', 'records', MAPLE.records.x, MAPLE.records.y, { texture: 'bld-records', foot: { dx: -2, dy: -3, w: 4, h: 3 }, p: { label: 'Spin City Records' } });
  add('building', 'lanes', MAPLE.lanes.x, MAPLE.lanes.y, { texture: 'bld-lanes', foot: { dx: -3, dy: -3, w: 7, h: 3 }, p: { door: 'lanes-in', label: 'Starlight Lanes' } });
  add('building', 'house-lemon', 42.5, 10.6, { texture: 'bld-house-lemon', foot: { dx: -2, dy: -3, w: 4, h: 3 } });
  // south side: pastel houses and the park
  add('building', 'house-mint', 30, 27.4, { texture: 'bld-house-mint', foot: { dx: -2, dy: -3, w: 4, h: 3 } });
  add('building', 'house-pink', 40, 27.4, { texture: 'bld-house-pink', foot: { dx: -2, dy: -3, w: 4, h: 3 } });
  // cars and the milk truck on the street
  add('prop', 'car-teal', 16, 14, { texture: 'prop-car-teal', foot: { dx: -1, dy: -1, w: 3, h: 1 } });
  add('prop', 'car-cherry', 44, 16, { texture: 'prop-car-cherry', foot: { dx: -1, dy: -1, w: 2, h: 1 } });
  add('use', 'milk-truck', 26, 16, { texture: 'prop-milktruck', foot: { dx: -1, dy: -1, w: 3, h: 1 }, p: { action: 'milk-truck', label: 'Milk truck', range: 1.5 } });
  // street lamps, benches, trees
  for (const [x, y] of [
    [4, 12.9],
    [16, 12.9],
    [27, 12.9],
    [39, 12.9],
    [12, 18.8],
    [34, 18.8],
  ])
    add('prop', `lamp-${x}-${y}`, x, y, { texture: 'prop-lamp', foot: { dx: 0, dy: -1, w: 1, h: 1 } });
  add('prop', 'bench-1', 6.2, 21.6, { texture: 'prop-bench' });
  add('prop', 'bench-2', 10.4, 21.6, { texture: 'prop-bench' });
  add('prop', 'flowers-1', 14, 24, { texture: 'prop-flowerbed' });
  const r = rng(1957);
  for (const [x, y] of [
    [2, 20],
    [3.5, 26],
    [14.5, 21],
    [16, 27],
    [20, 20.5],
    [22, 26.5],
    [1.5, 5],
    [15.5, 5.5],
    [26.5, 5],
    [45, 5],
    [45, 21],
    [35, 21],
  ])
    add('tree', `tree-${x}-${y}`, x + (r() - 0.5) * 0.3, y, { texture: r() < 0.3 ? 'tree-pine' : 'tree-round', foot: { dx: 0, dy: -1, w: 1, h: 1 } });
  add('sign', 'maple-sign', 11, 25.2, { texture: 'prop-sign', p: { text: ['MAPLE STREET — welcome, neighbour!', 'North: the Rock-a-Roll Diner, Spin City Records and the Starlight Lanes.'] } });
  // the way home
  add('use', 'portal-home', MAPLE.portal.x, MAPLE.portal.y - 0.6, { texture: 'fur-portalring', p: { action: 'portal-home', label: 'Portal home', range: 1.3 } });
  return o;
}

registerMap({
  id: 'fifties',
  name: 'Maple Street, 1957',
  region: 'fifties',
  lighting: 'golden',
  timeOfDay: 'golden',
  music: 'fifties',
  bg: '#8fcf6f',
  layers: ['grass', 'path', 'road', 'tile', 'plaza'],
  pois: [
    { x: 10, y: 6.4, icon: '🍔', label: 'Diner' },
    { x: 21, y: 6.8, icon: '💿', label: 'Records' },
    { x: 33, y: 5.8, icon: '🎳', label: 'Starlight Lanes' },
    { x: 26, y: 18.2, icon: '🥛', label: 'Milk truck' },
    { x: 8, y: 26.2, icon: '🌀', label: 'Portal home' },
  ],
  zones: [{ id: 'maple-park', x: 4, y: 19, w: 12, h: 9 }],
  spawns: {
    portal: { x: MAPLE.portal.x + 1.7, y: MAPLE.portal.y + 0.8, facing: 'down' },
    'diner-out': { x: MAPLE.diner.x, y: MAPLE.diner.y + 1, facing: 'down' },
    'lanes-out': { x: MAPLE.lanes.x - 0.3, y: MAPLE.lanes.y + 1, facing: 'down' },
  },
  build: () => ({ grid: buildMaple(), objects: mapleObjects() }),
});

// ------------------------------------------------------------------ the Starlight Lanes (inside)
defineRoom({
  id: 'lanes',
  name: 'Starlight Lanes',
  music: 'bowling',
  region: 'fifties',
  exitTo: 'fifties',
  outSpawn: 'lanes-out',
  spec: {
    w: 16,
    h: 10,
    wallRows: 3,
    wall: '#3d2f5c',
    wallTrim: '#7ff0ff',
    pattern: 'neon',
    floor: 'wood',
    floorA: '#d49a6a',
    floorB: '#c98d55',
    door: { x: 7, w: 2 },
  },
  objects: () => [
    fur('lane-1', 'lane', 5.5, 7.1, { dx: 0, dy: -4, w: 1, h: 4 }),
    fur('lane-2', 'lane', 8, 7.1, { dx: 0, dy: -4, w: 1, h: 4 }),
    fur('lane-3', 'lane', 10.5, 7.1, { dx: 0, dy: -4, w: 1, h: 4 }),
    fur('return-1', 'ballreturn', 6.75, 7.7),
    fur('return-2', 'ballreturn', 9.25, 7.7),
    { id: 'lane-play', kind: 'use', x: 8, y: 7.6, p: { action: 'lanes-bowl', label: 'Bowl!', range: 1.3 } },
    { id: 'trophy', kind: 'use', x: 2.2, y: 4.6, texture: 'fur-trophycase', foot: { dx: -1, dy: -1, w: 2, h: 1 }, when: '!cup:won', p: { action: 'trophy', label: 'Look', range: 1.4 } },
    { id: 'trophy-empty', kind: 'use', x: 2.2, y: 4.6, texture: 'fur-trophycase-empty', foot: { dx: -1, dy: -1, w: 2, h: 1 }, when: 'cup:won', p: { action: 'trophy', label: 'Look', range: 1.4 } },
    { id: 'shoes', kind: 'use', x: 13.6, y: 4.6, texture: 'fur-shoecounter', foot: { dx: -1, dy: -1, w: 3, h: 1 }, p: { action: 'shoes', label: 'Shoes', range: 1.4 } },
    { id: 'rollo', kind: 'npc', x: 12.4, y: 6.4, p: { id: 'rollo', wander: 0.5 } },
    { id: 'duke', kind: 'npc', x: 4, y: 8.3, p: { id: 'duke', wander: 0.6 } },
    fur('lanes-plant', 'plant', 14.8, 8.8),
    fur('lanes-table', 'table', 3, 8.4),
  ],
});

// ------------------------------------------------------------------ the Rock-a-Roll Diner (inside)
defineRoom({
  id: 'diner',
  name: 'Rock-a-Roll Diner',
  music: 'sockhop',
  region: 'fifties',
  exitTo: 'fifties',
  outSpawn: 'diner-out',
  spec: {
    w: 16,
    h: 10,
    wallRows: 3,
    wall: '#f7c9d9',
    wallTrim: '#6ec9c0',
    pattern: 'stripes',
    floor: 'checker',
    floorA: '#fff4e0',
    floorB: '#4a4458',
    windows: [4, 12],
    door: { x: 7, w: 2 },
  },
  objects: () => [
    fur('counter', 'dinercounter', 4.6, 4.4, { dx: -2, dy: -1, w: 5, h: 1 }),
    { id: 'jukebox', kind: 'use', x: 11.6, y: 3.9, texture: 'fur-jukebox', foot: { dx: 0, dy: -1, w: 1, h: 1 }, p: { action: 'jukebox', label: 'Jukebox', range: 1.3 } },
    fur('booth-1', 'booth', 13.6, 4.8, { dx: -1, dy: -1, w: 2, h: 1 }),
    fur('booth-2', 'booth', 13.6, 7.6, { dx: -1, dy: -1, w: 2, h: 1 }),
    { id: 'pantry', kind: 'use', x: 1.3, y: 4.4, texture: 'fur-pantry', foot: { dx: 0, dy: -1, w: 1, h: 1 }, p: { action: 'pantry', label: 'Pantry', range: 1.3 } },
    { id: 'mabel', kind: 'npc', x: 7.6, y: 5.3, p: { id: 'mabel', wander: 1.2 } },
    { id: 'rosita', kind: 'npc', x: 9.6, y: 6.2, p: { id: 'rosita', wander: 0.5 } },
    { id: 'zippy', kind: 'lostbunny', x: 5, y: 7.4, when: '!rescued:zippy', p: { id: 'zippy', skate: 1.7 } },
    { id: 'dot', kind: 'lostbunny', x: 1.4, y: 5.5, when: 'dot:found,!rescued:dot', p: { id: 'dot' } },
    { id: 'poppy', kind: 'lostbunny', x: 8.6, y: 7.4, when: 'sockhop:danced,!rescued:poppy', p: { id: 'poppy' } },
  ],
});

// ------------------------------------------------------------------ Tockwood Lanes (after the 1950s): Rollo's new home
defineRoom({
  id: 'bowling',
  name: 'Tockwood Lanes',
  music: 'bowling',
  exitTo: 'tockwood',
  outSpawn: 'bowling-out',
  spec: {
    w: 14,
    h: 9,
    wallRows: 3,
    wall: '#5b4a8f',
    wallTrim: '#f7c65a',
    pattern: 'neon',
    floor: 'wood',
    floorA: '#d49a6a',
    floorB: '#c98d55',
    door: { x: 6, w: 2 },
  },
  objects: () => [
    fur('tl-lane-1', 'lane', 5, 6.1, { dx: 0, dy: -3, w: 1, h: 3 }),
    fur('tl-lane-2', 'lane', 8, 6.1, { dx: 0, dy: -3, w: 1, h: 3 }),
    fur('tl-return', 'ballreturn', 6.5, 6.7),
    { id: 'tl-play', kind: 'use', x: 6.5, y: 7.2, p: { action: 'tlanes-bowl', label: 'Bowl!', range: 1.4 } },
    { id: 'rollo-home', kind: 'npc', x: 11, y: 6.4, p: { id: 'rollo', wander: 0.6 } },
    fur('tl-plant', 'plant', 12.8, 7.8),
  ],
});
