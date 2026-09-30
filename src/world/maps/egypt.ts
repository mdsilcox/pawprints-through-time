import { TerrainGrid } from '../terrain';
import { registerMap, type MapObject } from '../mapdef';
import { rng } from '../../art/draw';
import { defineRoom, fur } from './interiors';

/**
 * Ancient Egypt, around 2500 BCE: the building site of a great pyramid at Giza, the Sphinx,
 * the builders' village with its bakery and market, fields and papyrus along the Nile — and the
 * old builders' tomb, pitch dark inside.
 */
export const GIZA = {
  portal: { x: 5, y: 23.4 },
  pyramid: { x: 37, y: 13.8 },
  ramp: { x: 31.4, y: 14.6 },
  tent: { x: 26, y: 11.4 },
  sphinx: { x: 18.4, y: 8.4 },
  tomb: { x: 8, y: 6.2 },
  village: { x: 15, y: 16 },
  floor: { x: 15.6, y: 19.6 },
};

function buildGiza(): TerrainGrid {
  const g = new TerrainGrid(48, 32, 'dune');
  // the Nile and its banks
  g.rect('water', 0, 27, 48, 5);
  g.ellipse('water', 12, 27.5, 9, 1.6).ellipse('water', 38, 27.3, 10, 1.4);
  g.rect('sand', 0, 25, 48, 2, ['dune']);
  // fields watered by the river
  g.rect('grass', 1, 20, 8, 5, ['dune']).rect('grass', 30, 20, 16, 5, ['dune']);
  // the builders' village square
  g.rect('plaza', 9, 13, 13, 8, ['dune']);
  // a stone causeway from the river up to the building site, and the site's stone apron
  g.line('stone', [[24, 25], [24, 16], [30, 16]], 2, ['dune', 'sand']);
  g.rect('stone', 28, 14, 18, 3, ['dune']);
  // in front of the Sphinx and the old tomb
  g.rect('stone', 12, 8, 11, 2, ['dune']);
  g.line('stone', [[8, 7], [8, 9], [12, 9]], 2, ['dune']);
  // dusty paths: portal → village → Sphinx; village → river
  g.line('path', [[5, 24], [9, 21], [9, 17]], 2, ['dune', 'sand', 'grass']);
  g.line('path', [[15, 13], [15, 10]], 2, ['dune']);
  g.line('path', [[21, 17], [24, 17]], 2, ['dune']);
  return g;
}

function gizaObjects(): MapObject[] {
  const o: MapObject[] = [];
  const add = (kind: MapObject['kind'], id: string, x: number, y: number, extra: Partial<MapObject> = {}) => o.push({ id, kind, x, y, ...extra });
  // the great pyramid (finished once the capstone is up)
  // (solid along its wide base only: higher up the sides slope in, and you can walk round behind it)
  add('building', 'pyramid', GIZA.pyramid.x, GIZA.pyramid.y, { texture: 'bld-pyramid', foot: { dx: -5, dy: -3, w: 10, h: 3 }, when: '!capstone:placed' });
  add('building', 'pyramid-done', GIZA.pyramid.x, GIZA.pyramid.y, { texture: 'bld-pyramid-done', foot: { dx: -5, dy: -3, w: 10, h: 3 }, when: 'capstone:placed' });
  // the ramp: the capstone waits on its sled at the bottom, stuck behind fallen blocks
  add('use', 'ramp', GIZA.ramp.x, GIZA.ramp.y, { texture: 'prop-capstone', foot: { dx: -1, dy: -1, w: 2, h: 1 }, when: '!capstone:placed', p: { action: 'ramp', label: 'Ramp', range: 1.4 } });
  add('prop', 'blocks-1', 28.2, 17.2, { texture: 'prop-blockpile', foot: { dx: -1, dy: -1, w: 2, h: 1 } });
  add('prop', 'sled-1', 44.2, 13.9, { texture: 'prop-sled', foot: { dx: -1, dy: -1, w: 2, h: 1 } });
  add('prop', 'blocks-2', 44.6, 18.2, { texture: 'prop-blockpile', foot: { dx: -1, dy: -1, w: 2, h: 1 } });
  add('prop', 'baskets', 41.6, 17.6, { texture: 'prop-baskets', foot: { dx: -1, dy: -1, w: 2, h: 1 } });
  // the master builder's tent
  add('building', 'tent', GIZA.tent.x, GIZA.tent.y, { texture: 'bld-buildertent', foot: { dx: -2, dy: -2, w: 4, h: 2 } });
  add('npc', 'neb', GIZA.tent.x + 0.3, GIZA.tent.y + 1.4, { p: { id: 'neb', wander: 0.7 } });
  // the Great Sphinx, and the old builders' tomb behind its enclosure
  add('prop', 'sphinx', GIZA.sphinx.x, GIZA.sphinx.y, { texture: 'prop-sphinx', foot: { dx: -3, dy: -3, w: 7, h: 3 } });
  add('use', 'sphinx-talk', GIZA.sphinx.x - 1.6, GIZA.sphinx.y + 0.2, { p: { action: 'sphinx', label: 'Talk', range: 1.3 } });
  add('building', 'mastaba', GIZA.tomb.x, GIZA.tomb.y, { texture: 'bld-mastaba', foot: { dx: -2, dy: -3, w: 5, h: 3 } });
  add('use', 'tomb-gate', GIZA.tomb.x, GIZA.tomb.y + 1.2, { texture: 'prop-sphinxgate', foot: { dx: -1, dy: -1, w: 3, h: 1 }, when: '!sphinx:passed', p: { action: 'tomb-gate', label: 'Look', range: 1.4 } });
  // (always there: out of reach behind the rope until the Sphinx takes it away)
  add('use', 'tomb-door', GIZA.tomb.x, GIZA.tomb.y + 0.35, { p: { action: 'tomb-door', label: 'Enter', range: 1.1 } });
  // the village: houses, Sesi's bakery and stall, Ankhi by the obelisk, the festival floor
  add('building', 'house-1', 11, 12.6, { texture: 'bld-mudhouse-a', foot: { dx: -2, dy: -3, w: 4, h: 3 } });
  add('building', 'house-2', 18, 12.6, { texture: 'bld-mudhouse-b', foot: { dx: -2, dy: -3, w: 4, h: 3 } });
  add('building', 'house-3', 4.5, 18.4, { texture: 'bld-mudhouse-b', foot: { dx: -2, dy: -3, w: 4, h: 3 } });
  add('use', 'sesi-stall', 11.2, 16.2, { texture: 'prop-stall-egypt', foot: { dx: -1, dy: -1, w: 2, h: 1 }, p: { action: 'sesi-stall', label: 'Shop', range: 1.2 } });
  add('use', 'sesi-oven', 19.6, 16.4, { texture: 'prop-oven', foot: { dx: -1, dy: -1, w: 2, h: 1 }, p: { action: 'sesi-oven', label: 'Cook', range: 1.3 } });
  add('npc', 'sesi', 13.2, 17.4, { p: { id: 'sesi', wander: 0.6 } });
  add('prop', 'obelisk', 21.4, 14, { texture: 'prop-obelisk', foot: { dx: 0, dy: -1, w: 1, h: 1 } });
  add('npc', 'ankhi', 20, 15, { p: { id: 'ankhi', wander: 0.6 } });
  add('use', 'festival-floor', GIZA.floor.x, GIZA.floor.y, { texture: 'prop-festivalfloor', p: { action: 'festival-floor', label: 'Dance!', range: 1.5, floor: true } });
  // the river: papyrus, a reed boat, palms along the bank
  for (const x of [2, 7.5, 13, 19, 27, 33.5, 40, 45.5]) add('prop', `reeds-${x}`, x, 26.7, { texture: 'prop-reeds' });
  add('prop', 'reed-boat', 31, 28.8, { texture: 'prop-reedboat' });
  const r = rng(2500);
  for (const [x, y] of [
    [1.5, 24.6],
    [10.5, 24.4],
    [17, 24.8],
    [21.5, 23.8],
    [28.5, 24.6],
    [36, 24.2],
    [46, 24.6],
    [7.6, 13.4],
    [23, 12.6],
    [2.5, 11],
  ])
    add('palm', `palm-${x}-${y}`, x + (r() - 0.5) * 0.3, y, { texture: 'tree-palm', foot: { dx: 0, dy: -1, w: 1, h: 1 } });
  add('sign', 'giza-sign', 7.8, 22.2, { texture: 'prop-sign', p: { text: ['GIZA — the building site of the Great Pyramid.', 'North: the village and the Sphinx. East: the pyramid and the master builder’s tent.'] } });
  // lost Hopkins cousins
  add('lostbunny', 'nibbles', GIZA.sphinx.x + 1.4, GIZA.sphinx.y + 0.9, { when: 'sphinx:passed,!rescued:nibbles', p: { id: 'nibbles' } });
  add('lostbunny', 'sandy', 42.4, 18.3, { when: '!rescued:sandy', p: { id: 'sandy', needsSniff: true } });
  // the way home
  add('use', 'portal-home', GIZA.portal.x, GIZA.portal.y - 0.6, { texture: 'fur-portalring', p: { action: 'portal-home', label: 'Portal home', range: 1.3 } });
  return o;
}

registerMap({
  id: 'egypt',
  name: 'Giza, 2500 BCE',
  region: 'egypt',
  lighting: 'day',
  timeOfDay: 'day',
  music: 'egypt',
  bg: '#4fa6c4',
  layers: ['foam', 'sand', 'dune', 'grass', 'path', 'stone', 'plaza'],
  pois: [
    { x: GIZA.pyramid.x, y: 6.5, icon: '🔺', label: 'The pyramid' },
    { x: GIZA.tent.x, y: 9.2, icon: '📜', label: 'Master builder' },
    { x: GIZA.sphinx.x, y: 5.4, icon: '🦁', label: 'The Sphinx' },
    { x: GIZA.tomb.x, y: 3.2, icon: '🏛️', label: 'Old tomb' },
    { x: 15, y: 15, icon: '🍞', label: 'Village' },
    { x: GIZA.portal.x, y: 25.2, icon: '🌀', label: 'Portal home' },
  ],
  digZones: [
    { id: 'giza-dunes-east', x: 30, y: 18, w: 16, h: 2, on: ['dune'], perDay: 2, hidden: 0.4, loot: [['scarab', 20], ['blue-hippo', 15], ['faience-bead', 40], ['dates', 25]] },
    { id: 'giza-dunes-west', x: 22, y: 19, w: 7, h: 5, on: ['dune'], perDay: 2, hidden: 0.4, loot: [['scarab', 20], ['blue-hippo', 15], ['faience-bead', 40], ['lentils', 25]] },
  ],
  zones: [
    { id: 'giza-village', x: 9, y: 12, w: 13, h: 9 },
    { id: 'giza-site', x: 27, y: 12, w: 19, h: 7 },
    { id: 'giza-sphinx', x: 11, y: 5, w: 13, h: 6 },
  ],
  spawns: {
    portal: { x: GIZA.portal.x + 1.7, y: GIZA.portal.y + 0.8, facing: 'down' },
    'tomb-out': { x: GIZA.tomb.x, y: GIZA.tomb.y + 1.2, facing: 'down' },
  },
  build: () => ({ grid: buildGiza(), objects: gizaObjects() }),
});

// ------------------------------------------------------------------ the old builders' tomb (dark inside)
defineRoom({
  id: 'tomb',
  name: 'The Old Builders’ Tomb',
  music: 'egypt',
  region: 'egypt',
  exitTo: 'egypt',
  outSpawn: 'tomb-out',
  lighting: 'dark',
  spec: {
    w: 14,
    h: 10,
    wallRows: 3,
    wall: '#dcc28c',
    wallTrim: '#8a6a3a',
    pattern: 'hieroglyph',
    floor: 'sandstone',
    floorA: '#e8c98f',
    floorB: '#c9a060',
    door: { x: 6, w: 2 },
  },
  objects: () => [
    fur('statue-1', 'catstatue', 2.2, 4.4, { dx: 0, dy: -1, w: 1, h: 1 }),
    fur('statue-2', 'catstatue', 11.8, 4.4, { dx: 0, dy: -1, w: 1, h: 1 }),
    fur('urns-1', 'urns', 2.6, 8.4, { dx: -1, dy: -1, w: 2, h: 1 }),
    fur('chest-1', 'stonechest', 11, 8.2, { dx: -1, dy: -1, w: 2, h: 1 }),
    { id: 'plans', kind: 'use', x: 7, y: 4.6, texture: 'fur-scrollstand', foot: { dx: 0, dy: -1, w: 1, h: 1 }, when: '!plans:found', p: { action: 'plans', label: 'Look', range: 1.3 } },
    { id: 'plans-empty', kind: 'use', x: 7, y: 4.6, texture: 'fur-scrollstand-empty', foot: { dx: 0, dy: -1, w: 1, h: 1 }, when: 'plans:found', p: { action: 'plans', label: 'Look', range: 1.3 } },
    { id: 'glyphs', kind: 'use', x: 4.5, y: 3.4, p: { action: 'glyphs', label: 'Read', range: 1.2 } },
    { id: 'lotus', kind: 'lostbunny', x: 11.4, y: 6.4, when: '!rescued:lotus', p: { id: 'lotus' } },
  ],
});
