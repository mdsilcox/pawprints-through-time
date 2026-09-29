import { TerrainGrid } from '../terrain';
import { registerMap, type MapObject } from '../mapdef';
import { rng } from '../../art/draw';
import { defineRoom, fur } from './interiors';

/**
 * Renaissance Florence, around 1500: the great piazza under the cathedral's dome, Maestra
 * Lucia's workshop, Fiorella's studio, the Duchess's palazzo with its court dance floor, the
 * grocer's herb garden, and the river with its old bridge.
 */
export const FLOR = {
  portal: { x: 22, y: 24.2 },
  duomo: { x: 23, y: 9.6 },
  workshop: { x: 7.5, y: 13.4 },
  studio: { x: 38.5, y: 13.4 },
  palazzo: { x: 36.5, y: 20.8 },
  floor: { x: 29.5, y: 21.6 },
  ledge: { x: 43.2, y: 21.4 },
  stall: { x: 14.6, y: 20 },
};

function buildFlorence(): TerrainGrid {
  const g = new TerrainGrid(46, 30, 'grass');
  // the river Arno and its stone embankment
  g.rect('water', 0, 26, 46, 4);
  g.rect('stone', 0, 24, 46, 2);
  // the great piazza
  g.rect('plaza', 11, 10, 24, 13);
  // streets out to the workshop, the studio and the palazzo
  g.rect('stone', 2, 14, 9, 3).rect('stone', 35, 14, 9, 3);
  g.rect('stone', 26, 19, 18, 5);
  g.line('stone', [[22, 22], [22, 24]], 2);
  // the grocer's herb garden stays green
  g.rect('grass', 2, 17, 8, 6);
  g.line('path', [[6, 17], [6, 22]], 1, ['grass']);
  return g;
}

function florenceObjects(): MapObject[] {
  const o: MapObject[] = [];
  const add = (kind: MapObject['kind'], id: string, x: number, y: number, extra: Partial<MapObject> = {}) => o.push({ id, kind, x, y, ...extra });
  // the cathedral and its great dome, over the top of the piazza
  add('building', 'duomo', FLOR.duomo.x, FLOR.duomo.y, { texture: 'bld-duomo', foot: { dx: -5, dy: -4, w: 10, h: 4 } });
  // Maestra Lucia's workshop, Fiorella's studio, the Duchess's palazzo
  add('building', 'workshop', FLOR.workshop.x, FLOR.workshop.y, { texture: 'bld-workshop', foot: { dx: -3, dy: -3, w: 6, h: 3 }, p: { door: 'workshop-in', label: 'Lucia’s workshop' } });
  add('building', 'studio', FLOR.studio.x, FLOR.studio.y, { texture: 'bld-studio', foot: { dx: -2, dy: -3, w: 5, h: 3 }, p: { door: 'studio-in', label: 'Fiorella’s studio' } });
  add('building', 'palazzo', FLOR.palazzo.x, FLOR.palazzo.y, { texture: 'bld-palazzo', foot: { dx: -4, dy: -3, w: 8, h: 3 } });
  add('npc', 'orsola', FLOR.palazzo.x - 3.6, FLOR.palazzo.y + 1.2, { p: { id: 'orsola', wander: 0.6 } });
  add('use', 'court-floor', FLOR.floor.x, FLOR.floor.y, { texture: 'prop-courtfloor', p: { action: 'court-floor', label: 'Dance!', range: 1.5, floor: true } });
  // a cousin stuck up high on a column (only a super-bunny jump reaches it)
  add('use', 'twirl-ledge', FLOR.ledge.x, FLOR.ledge.y, { texture: 'prop-column-twirl', foot: { dx: 0, dy: -1, w: 1, h: 1 }, when: '!rescued:twirl', p: { action: 'twirl-ledge', label: 'Look up', range: 1.4 } });
  add('prop', 'ledge-empty', FLOR.ledge.x, FLOR.ledge.y, { texture: 'prop-column', foot: { dx: 0, dy: -1, w: 1, h: 1 }, when: 'rescued:twirl' });
  // townhouses around the piazza
  add('building', 'house-1', 3, 10.4, { texture: 'bld-townhouse-a', foot: { dx: -1, dy: -3, w: 3, h: 3 } });
  add('building', 'house-2', 14.5, 9.6, { texture: 'bld-townhouse-b', foot: { dx: -1, dy: -3, w: 3, h: 3 } });
  add('building', 'house-3', 31.5, 9.6, { texture: 'bld-townhouse-c', foot: { dx: -1, dy: -3, w: 3, h: 3 } });
  add('building', 'house-4', 43, 10.4, { texture: 'bld-townhouse-a', foot: { dx: -1, dy: -3, w: 3, h: 3 } });
  // the grocer, his herb garden and a cooking pot over a little fire
  add('use', 'beppe-stall', FLOR.stall.x, FLOR.stall.y, { texture: 'prop-stall-florence', foot: { dx: -1, dy: -1, w: 2, h: 1 }, p: { action: 'beppe-stall', label: 'Shop', range: 1.2 } });
  add('npc', 'beppe', FLOR.stall.x + 1.9, FLOR.stall.y + 1.1, { p: { id: 'beppe', wander: 0.5 } });
  add('use', 'firepot', 8.2, 21.8, { texture: 'prop-firepot', foot: { dx: 0, dy: -1, w: 1, h: 1 }, p: { action: 'firepot', label: 'Cook', range: 1.3 } });
  add('lostbunny', 'pesto', 4, 19.6, { when: '!rescued:pesto', p: { id: 'pesto' } });
  // the well in the piazza, benches, flowerbeds, a cloth-seller's stall, cypresses, the old bridge
  add('prop', 'well', 23, 17.2, { texture: 'prop-well', foot: { dx: -1, dy: -1, w: 2, h: 1 } });
  for (const [x, y] of [
    [17, 13.6],
    [29, 13.6],
    [19.5, 20.6],
  ])
    add('prop', `bench-${x}`, x, y, { texture: 'prop-bench' });
  for (const [x, y] of [
    [13, 12.2],
    [33, 12.2],
    [26.5, 20.8],
  ])
    add('prop', `flowers-${x}`, x, y, { texture: 'prop-flowerbed' });
  add('prop', 'cloth-stall', 30.5, 16.6, { texture: 'prop-stall-green', foot: { dx: -1, dy: -1, w: 2, h: 1 } });
  const r = rng(1500);
  for (const [x, y] of [
    [1, 16],
    [10.4, 11.6],
    [35.6, 11.6],
    [45, 16],
    [2, 23.4],
    [11, 23.6],
    [33.5, 23.6],
    [45, 23.6],
    [9.5, 5],
    [36.5, 5],
  ])
    add('tree', `cypress-${x}-${y}`, x + (r() - 0.5) * 0.3, y, { texture: 'tree-cypress', foot: { dx: 0, dy: -1, w: 1, h: 1 } });
  add('prop', 'bridge', 38, 28.6, { texture: 'prop-bridge' });
  add('sign', 'flor-sign', 19.8, 23.2, { texture: 'prop-sign', p: { text: ['FLORENCE — the city of artists and inventors.', 'West: Maestra Lucia’s workshop. East: Fiorella’s studio. South-east: the Duchess’s palazzo.'] } });
  // the way home
  add('use', 'portal-home', FLOR.portal.x, FLOR.portal.y - 0.6, { texture: 'fur-portalring', p: { action: 'portal-home', label: 'Portal home', range: 1.3 } });
  return o;
}

registerMap({
  id: 'florence',
  name: 'Florence, around 1500',
  region: 'florence',
  lighting: 'golden',
  timeOfDay: 'golden',
  music: 'florence',
  bg: '#4f86a8',
  layers: ['foam', 'sand', 'grass', 'path', 'stone', 'plaza'],
  pois: [
    { x: FLOR.duomo.x, y: 5, icon: '⛪', label: 'The great dome' },
    { x: FLOR.workshop.x, y: 10.4, icon: '⚙️', label: 'Workshop' },
    { x: FLOR.studio.x, y: 10.4, icon: '🎨', label: 'Studio' },
    { x: FLOR.palazzo.x, y: 18, icon: '👑', label: 'Palazzo' },
    { x: FLOR.stall.x - 5, y: 18.4, icon: '🌿', label: 'Herb garden' },
    { x: FLOR.portal.x, y: 25.6, icon: '🌀', label: 'Portal home' },
  ],
  digZones: [{ id: 'flor-garden', x: 2, y: 17, w: 8, h: 6, on: ['grass'], perDay: 3, hidden: 0.35, loot: [['florin', 45], ['pigment-jar', 25], ['paintbrush', 20], ['basil', 10]] }],
  zones: [
    { id: 'flor-piazza', x: 11, y: 10, w: 24, h: 13 },
    { id: 'flor-garden', x: 2, y: 17, w: 8, h: 6 },
  ],
  spawns: {
    portal: { x: FLOR.portal.x + 1.7, y: FLOR.portal.y + 0.8, facing: 'down' },
    'workshop-out': { x: FLOR.workshop.x, y: FLOR.workshop.y + 1, facing: 'down' },
    'studio-out': { x: FLOR.studio.x, y: FLOR.studio.y + 1, facing: 'down' },
  },
  build: () => ({ grid: buildFlorence(), objects: florenceObjects() }),
});

// ------------------------------------------------------------------ Maestra Lucia's workshop
defineRoom({
  id: 'workshop',
  name: 'Maestra Lucia’s Workshop',
  music: 'florence',
  region: 'florence',
  exitTo: 'florence',
  outSpawn: 'workshop-out',
  spec: {
    w: 14,
    h: 10,
    wallRows: 3,
    wall: '#e9dcc0',
    wallTrim: '#8a5a3a',
    pattern: 'panels',
    floor: 'tiles',
    floorA: '#d9a877',
    floorB: '#b57a4e',
    windows: [2, 11],
    door: { x: 6, w: 2 },
  },
  objects: () => [
    fur('gearwall', 'gearwall', 7, 2.4),
    fur('flying', 'flyingmachine', 4.6, 2.2),
    { id: 'lion', kind: 'use', x: 7, y: 6.2, texture: 'fur-mechlion', foot: { dx: -1, dy: -1, w: 3, h: 1 }, when: '!lion:awake', p: { action: 'lion', label: 'Look', range: 1.6 } },
    { id: 'lion-awake', kind: 'use', x: 7, y: 6.2, texture: 'fur-mechlion-awake', foot: { dx: -1, dy: -1, w: 3, h: 1 }, when: 'lion:awake', p: { action: 'lion', label: 'Look', range: 1.6 } },
    fur('bench', 'workbench', 11.4, 4.6, { dx: -1, dy: -1, w: 2, h: 1 }),
    fur('books', 'bookshelf', 2.4, 4, { dx: -1, dy: -1, w: 2, h: 1 }),
    { id: 'lucia', kind: 'npc', x: 10.2, y: 6.6, p: { id: 'lucia', wander: 0.7 } },
    fur('ws-plant', 'plant', 12.6, 8.4),
  ],
});

// ------------------------------------------------------------------ Fiorella's studio
defineRoom({
  id: 'studio',
  name: 'Fiorella’s Studio',
  music: 'florence',
  region: 'florence',
  exitTo: 'florence',
  outSpawn: 'studio-out',
  spec: {
    w: 13,
    h: 9,
    wallRows: 3,
    wall: '#f4ecdc',
    wallTrim: '#c96a4a',
    pattern: 'plain',
    floor: 'tiles',
    floorA: '#e9c9a0',
    floorB: '#c98f5e',
    windows: [1, 11],
    door: { x: 6, w: 1 },
  },
  objects: () => [
    { id: 'fresco', kind: 'use', x: 6.5, y: 2.9, texture: 'fur-fresco', when: '!fresco:mended', p: { action: 'fresco', label: 'Look', range: 1.6 } },
    { id: 'fresco-mended', kind: 'use', x: 6.5, y: 2.9, texture: 'fur-fresco-mended', when: 'fresco:mended', p: { action: 'fresco', label: 'Look', range: 1.6 } },
    fur('easel-1', 'easel', 3, 5.4),
    fur('easel-2', 'easel', 10.2, 5.2),
    fur('pigments', 'pigments', 9.6, 7.6, { dx: -1, dy: -1, w: 2, h: 1 }),
    fur('canvases', 'canvases', 2.2, 7.6, { dx: -1, dy: -1, w: 2, h: 1 }),
    { id: 'fiorella', kind: 'npc', x: 7.6, y: 5.2, p: { id: 'fiorella', wander: 0.8 } },
    { id: 'sketch', kind: 'lostbunny', x: 1.6, y: 6.6, when: '!rescued:sketch', p: { id: 'sketch', needsSniff: true } },
  ],
});
