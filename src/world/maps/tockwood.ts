import { TerrainGrid } from '../terrain';
import { registerMap, type MapObject } from '../mapdef';
import { rng } from '../../art/draw';

/**
 * Tockwood Isle — the hub village. 60 x 46 cells.
 *
 *            woods (N)
 *   cottage+garden     clocktower      museum
 *        tailor  ——  PLAZA(fountain) ——  bowling alley
 *   meadow/warren   old oak (Bubbling Burrow)
 *                beach  ——  dock (S)
 */
export const TOCKWOOD_W = 60;
export const TOCKWOOD_H = 46;

/** Landmark anchors (cell units) shared by the map, story and minimap. */
export const TW = {
  plaza: { x: 30.5, y: 20.5 },
  fountain: { x: 30.5, y: 21.2 },
  clocktower: { x: 30.5, y: 16 },
  cottage: { x: 13, y: 12 },
  garden: { x: 9, y: 13 },
  tailor: { x: 18.5, y: 18 },
  museum: { x: 42.5, y: 13 },
  bowling: { x: 47.5, y: 22 },
  oak: { x: 18, y: 28.6 },
  warren: { x: 10, y: 30 },
  meadow: { x: 12, y: 26 },
  dock: { x: 30.5, y: 42 },
  beach: { x: 37, y: 36 },
  woods: { x: 30, y: 8 },
  rocco: { x: 35.5, y: 17.6 },
  juniper: { x: 22.5, y: 12 },
};

function build() {
  const g = new TerrainGrid(TOCKWOOD_W, TOCKWOOD_H, 'water');
  // island body
  g.ellipse('sand', 30, 21, 24, 17)
    .ellipse('sand', 32, 34, 17, 6.5)
    .ellipse('sand', 12, 30, 8.5, 8)
    .ellipse('sand', 48, 18, 8.5, 9);
  g.ellipse('grass', 30, 19.5, 21.5, 14.5, ['sand'])
    .ellipse('grass', 12.5, 28.5, 7, 6.5, ['sand'])
    .ellipse('grass', 47, 18, 7.5, 7.5, ['sand'])
    .ellipse('grass', 27, 31, 10, 3, ['sand']);
  // plaza
  g.rect('plaza', 24, 16, 13, 9);
  // paths
  g.line('path', [[30, 25], [30, 34]], 2, ['grass', 'sand'])
    .line('path', [[24, 20], [15, 20]], 2, ['grass'])
    .line('path', [[15, 20], [15, 14], [13, 14], [13, 13]], 2, ['grass'])
    .line('path', [[18, 20], [18, 19]], 2, ['grass'])
    .line('path', [[36, 17], [42, 17], [42, 14]], 2, ['grass'])
    .line('path', [[37, 22], [47, 22], [47, 23]], 2, ['grass'])
    .line('path', [[24, 23], [21, 23], [21, 28], [18, 28]], 2, ['grass']);
  // dock over the water
  g.rect('dock', 30, 37, 2, 9, ['water']);
  return g;
}

function objects(grid: TerrainGrid): MapObject[] {
  const onLand = (x: number, y: number) => {
    const t = grid.get(Math.floor(x), Math.floor(y - 0.01));
    return t === 'grass' || t === 'sand';
  };
  const o: MapObject[] = [];
  let n = 0;
  const add = (kind: string, x: number, y: number, extra: Partial<MapObject> = {}) => {
    o.push({ id: `${kind}-${n++}`, kind, x, y, ...extra });
  };

  // --- buildings (anchor = middle of the front wall, bottom edge)
  o.push({ id: 'clocktower', kind: 'building', x: TW.clocktower.x, y: TW.clocktower.y, texture: 'clocktower', foot: { dx: -1, dy: -3, w: 3, h: 3 }, p: { door: 'clocktower-in', label: 'Clocktower', scale: 1.3 } });
  o.push({ id: 'cottage', kind: 'building', x: TW.cottage.x, y: TW.cottage.y, texture: 'bld-cottage', foot: { dx: -2, dy: -3, w: 4, h: 3 }, p: { door: 'cottage-in', label: 'Your Cottage' } });
  o.push({ id: 'tailor', kind: 'building', x: TW.tailor.x, y: TW.tailor.y, texture: 'bld-tailor', foot: { dx: -2, dy: -3, w: 4, h: 3 }, p: { door: 'tailor-in', label: "Bramble's Stitch & Style" } });
  o.push({ id: 'museum', kind: 'building', x: TW.museum.x, y: TW.museum.y, texture: 'bld-museum', foot: { dx: -2, dy: -3, w: 5, h: 3 }, p: { door: 'museum-in', label: 'Tockwood Museum' } });
  o.push({ id: 'bowling', kind: 'building', x: TW.bowling.x, y: TW.bowling.y, texture: 'bld-bowling', foot: { dx: -3, dy: -3, w: 6, h: 3 }, p: { door: 'bowling-in', label: 'Tockwood Lanes' } });
  o.push({ id: 'oak', kind: 'building', x: TW.oak.x, y: TW.oak.y, texture: 'bld-oak', foot: { dx: -2, dy: -2, w: 4, h: 2 }, p: { door: 'burrow-in', label: 'The Bubbling Burrow' } });
  // the woods: a dark little cave, and a rock too high to climb
  o.push({ id: 'grotto', kind: 'building', x: 16.5, y: 7.6, texture: 'prop-cave', foot: { dx: -1, dy: -2, w: 3, h: 2 }, p: { door: 'grotto-in', label: 'Glimmer Grotto' } });
  o.push({ id: 'lookout', kind: 'ledge', x: 42.5, y: 7.4, texture: 'prop-ledge', foot: { dx: -1, dy: -2, w: 2, h: 2 }, p: { item: 'golden-acorn', flag: 'ledge:lookout', tockens: 15, height: 1.9 } });

  // --- plaza furniture
  o.push({ id: 'fountain', kind: 'prop', x: TW.fountain.x, y: TW.fountain.y + 0.9, texture: 'prop-fountain', foot: { dx: -1, dy: -2, w: 3, h: 2 } });
  for (const [x, y] of [
    [24.4, 16.6],
    [36.6, 16.6],
    [24.4, 24.8],
    [36.6, 24.8],
    [29.2, 33],
    [32, 33],
    [15.2, 16.4],
    [42.6, 19.6],
    [19.6, 25.6],
  ])
    add('lamp', x, y, { texture: 'prop-lamp', foot: { dx: 0, dy: -1, w: 1, h: 1 } });
  add('bench', 27.5, 24.6, { texture: 'prop-bench' });
  // the dance floor: dance the Tockwood Jig (and every dance learned on your travels)
  o.push({ id: 'dance-floor', kind: 'use', x: 26.4, y: 21.2, texture: 'prop-dancefloor', p: { action: 'dance-floor', label: 'Dance!', range: 1.4, floor: true } });
  add('bench', 33.5, 24.6, { texture: 'prop-bench' });
  add('flowerbed', 25.5, 17.2, { texture: 'prop-flowerbed' });
  add('flowerbed', 35.5, 17.2, { texture: 'prop-flowerbed' });
  o.push({ id: 'plaza-sign', kind: 'sign', x: 28.6, y: 26.4, texture: 'prop-sign', p: { text: ['Welcome to TOCKWOOD PLAZA!', 'North: the old clocktower. South: the beach and the dock. West: the meadow and the bunny warren. East: the museum and the lanes.'] } });
  o.push({ id: 'rocco-stall', kind: 'use', x: TW.rocco.x, y: TW.rocco.y, texture: 'prop-stall', foot: { dx: -1, dy: -1, w: 2, h: 1 }, p: { action: 'rocco-shop', label: 'Shop', range: 0.85 } });
  add('stall-garden', TW.juniper.x, TW.juniper.y, { texture: 'prop-stall-green', foot: { dx: -1, dy: -1, w: 2, h: 1 } });

  // --- brain-builders: every neighbour has a puzzle waiting
  o.push({ id: 'riddle-stone', kind: 'use', x: 35.2, y: 26.6, texture: 'prop-riddlestone', foot: { dx: 0, dy: -1, w: 1, h: 1 }, p: { action: 'riddle-stone', label: 'Riddle', range: 1.3 } });
  o.push({ id: 'crate-jam', kind: 'use', x: TW.juniper.x + 2.6, y: TW.juniper.y + 0.4, texture: 'prop-cratejam', foot: { dx: -1, dy: -1, w: 2, h: 1 }, p: { action: 'crates', label: 'Crates', range: 1.4 } });
  o.push({ id: 'lockbox', kind: 'use', x: TW.rocco.x + 2.2, y: TW.rocco.y + 0.4, texture: 'prop-lockbox', foot: { dx: 0, dy: -1, w: 1, h: 1 }, p: { action: 'lockbox', label: 'Lockbox', range: 1.2 } });
  o.push({ id: 'toy-boat', kind: 'use', x: 33.6, y: 38.4, texture: 'prop-toyboat', foot: { dx: 0, dy: -1, w: 1, h: 1 }, p: { action: 'toy-boat', label: 'Toy boat', range: 1.2 } });
  // clover patches in the meadow (pick leaves once a day)
  for (const [i, x, y] of [
    [0, 4.6, 26.2],
    [1, 15.8, 22.4],
    [2, 16.4, 27.6],
  ] as const)
    o.push({ id: `clover-${i}`, kind: 'use', x, y, texture: 'prop-clover', p: { action: 'clover', label: 'Pick', range: 1, patch: i } });

  // --- neighbours out and about
  o.push({ id: 'finnegan', kind: 'npc', x: 31.2, y: 41.8, p: { id: 'finnegan', wander: 0.5 } });
  o.push({ id: 'marigold-visit', kind: 'npc', x: 30.8, y: 39.6, p: { id: 'marigold', wander: 0.4 }, when: 'marigold:friend' });
  o.push({ id: 'juniper', kind: 'npc', x: 22.5, y: 13.3, p: { id: 'juniper', wander: 1.2 } });
  // (Maestra Lucia visits from Florence once the fourth sand is home: two tinkerers at one stall)
  o.push({ id: 'lucia-visit', kind: 'npc', x: 37.6, y: 19.4, p: { id: 'lucia', wander: 0.6 }, when: 'lucia:arrived' });
  // the finale: friends from every era come to the party on the plaza (and a giant pot of soup)
  const guests: [string, number, number][] = [
    ['cookie', 22.6, 22.2],
    ['pepper', 23.4, 24.6],
    ['duke', 30.4, 22.6],
    ['mabel', 31, 24.8],
    ['neb', 21.8, 20],
    ['ankhi', 24, 18.8],
    ['sesi', 29.2, 19.2],
    ['fiorella', 32.2, 20.2],
    ['orsola', 25.2, 25.6],
    ['beppe', 30.2, 26],
  ];
  for (const [id, x, y] of guests) o.push({ id: `party-${id}`, kind: 'npc', x, y, p: { id, wander: 0.4 }, when: 'finale:party,!finale:done' });
  o.push({ id: 'giant-pot', kind: 'use', x: 28, y: 18.6, texture: 'fur-cauldron', foot: { dx: -1, dy: -1, w: 2, h: 1 }, when: 'finale:party,!finale:done', p: { action: 'giant-pot', label: 'Soup!', range: 1.4, scale: 1.15 } });
  // Clover minds her giant pot, Grandma Hopkins pulls up a chair, and every rescued cousin hops about the plaza
  o.push({ id: 'party-clover', kind: 'npc', x: 26.5, y: 19.3, p: { id: 'clover', wander: 0.3 }, when: 'finale:party,!finale:done' });
  o.push({ id: 'party-grandma', kind: 'grandma', x: 30.2, y: 18.1, when: 'finale:party,!finale:done' });
  o.push({ id: 'party-warren', kind: 'warren', x: 25, y: 20.3, p: { w: 5.5, h: 1.8, party: true }, when: 'finale:party,!finale:done' });
  // (beside his stall, not in front of the counter — so the Shop is always in reach)
  o.push({ id: 'rocco', kind: 'npc', x: 33.2, y: 18.9, p: { id: 'rocco', wander: 0.6 } });
  o.push({ id: 'rosita', kind: 'npc', x: 28.5, y: 22.8, p: { id: 'rosita', wander: 2 }, when: 'rosita:arrived' });
  // (beside his lanes, not in the doorway: the door's "Enter" stays easy to reach)
  o.push({ id: 'rollo', kind: 'npc', x: 50.8, y: 23.4, p: { id: 'rollo', wander: 0.5 }, when: 'bowling:open' });
  // --- meadow: wild bunnies, the Hopkins warren and Grandma Hopkins
  o.push({ id: 'wild-bunnies', kind: 'wildbunnies', x: 5.5, y: 22.5, p: { w: 11, h: 5, count: 5 } });
  o.push({ id: 'warren', kind: 'warren', x: 7.5, y: 28.5, p: { w: 7, h: 5 }, when: '!finale:party|finale:done' });
  o.push({ id: 'grandma-chair', kind: 'prop', x: 11.2, y: 30.35, texture: 'fur-rockingchair', foot: { dx: 0, dy: -1, w: 1, h: 1 } });
  o.push({ id: 'grandma', kind: 'grandma', x: 11.2, y: 30.5, when: '!finale:party|finale:done' });
  o.push({ id: 'knitting', kind: 'use', x: 12.4, y: 30.6, texture: 'prop-basket', p: { action: 'knitting', label: 'Knitting', range: 1 } });

  // --- garden plots by the cottage
  for (let i = 0; i < 4; i++) o.push({ id: `plot-${i}`, kind: 'plot', x: 8.5 + (i % 2) * 1.2, y: 14.4 + Math.floor(i / 2) * 1.2, texture: 'prop-plot', p: { index: i } });
  add('fence-h', 8.5, 16.6, { texture: 'prop-fence-h' });

  // --- warren burrow mounds in the meadow
  for (const [x, y] of [
    [8.5, 29.5],
    [11, 31.5],
    [13.5, 29.8],
    [9.5, 33],
    [14, 32.6],
  ])
    add('warren-hole', x, y, { texture: 'prop-burrow-hole' });

  // --- trees: north woods, edges, meadow; palms on the beach
  const r = rng(1234);
  const treeSpots: [number, number, string][] = [];
  for (let i = 0; i < 70; i++) {
    const x = 11 + r() * 38;
    const y = 5.5 + r() * 4.5;
    treeSpots.push([x, y, r() < 0.35 ? 'tree-pine' : 'tree-round']);
  }
  const edge: [number, number, string][] = [
    [9.5, 20, 'tree-round'],
    [10.5, 23, 'tree-fruit'],
    [7.5, 25.5, 'tree-round'],
    [16, 34, 'tree-round'],
    [21, 33.5, 'tree-fruit'],
    [38, 31.5, 'tree-round'],
    [43, 30, 'tree-round'],
    [51, 20, 'tree-pine'],
    [52, 15, 'tree-round'],
    [48.5, 11, 'tree-pine'],
    [37.5, 11, 'tree-round'],
    [22, 23.5, 'tree-fruit'],
    [38.5, 26.5, 'tree-fruit'],
    [44, 26, 'tree-round'],
    [15.5, 23.5, 'tree-round'],
    [6.5, 29, 'tree-pine'],
    [8, 22, 'tree-pine'],
  ];
  const clear = (x: number, y: number) =>
    // keep paths, plaza and building fronts free
    !(x > 21 && x < 40 && y > 10 && y < 27) && !(Math.abs(x - 13) < 3.5 && y > 8 && y < 16) && !(Math.abs(x - 42.5) < 4 && y > 8.5);
  for (const [x, y, t] of [...treeSpots, ...edge]) {
    if (!clear(x, y) && y > 10) continue;
    if (y < 10.5 && Math.abs(x - 30.5) < 3.5) continue; // behind the clocktower
    if (y > 6.3 && (Math.abs(x - 42.5) < 2.6 || Math.abs(x - 16.5) < 2.6)) continue; // in front of the lookout rock and the grotto
    if (!onLand(x, y) || !onLand(x - 0.4, y) || !onLand(x + 0.4, y)) continue; // no trees in the sea
    add('tree', x, y, { texture: t, foot: { dx: 0, dy: -1, w: 1, h: 1 } });
  }
  for (const [x, y] of [
    [18, 36.5],
    [22.5, 38],
    [40.5, 37.5],
    [45.5, 34],
    [26, 38.5],
    [49, 30.5],
  ])
    if (onLand(x, y)) add('palm', x, y, { texture: 'tree-palm', foot: { dx: 0, dy: -1, w: 1, h: 1 } });
  // bushes & rocks
  for (const [x, y] of [
    [20, 16],
    [22, 13.5],
    [38.5, 21],
    [39.5, 15],
    [16, 26],
    [44.5, 24.5],
    [25, 28],
    [35, 28.5],
    [12, 18],
  ])
    add('bush', x, y, { texture: 'prop-bush' });
  for (const [x, y] of [
    [14, 38.5],
    [47, 36.5],
    [52.5, 24],
    [7, 33.5],
    [50, 12],
  ])
    if (onLand(x, y)) add('rock', x, y, { texture: 'prop-rock', foot: { dx: 0, dy: -1, w: 1, h: 1 } });

  return o;
}


registerMap({
  id: 'tockwood',
  name: 'Tockwood Isle',
  region: 'tockwood',
  lighting: 'daynight',
  music: 'tockwood',
  bg: '#6cc4d8',
  layers: ['foam', 'sand', 'grass', 'path', 'plaza'],
  pois: [
  { x: 30.5, y: 12.4, icon: '🕰️', label: 'Clocktower' },
  { x: 13, y: 8.6, icon: '🏠', label: 'Home' },
  { x: 9.6, y: 16.4, icon: '🌱', label: 'Garden' },
  { x: 18.5, y: 14.6, icon: '🧵', label: 'Tailor' },
  { x: 42.5, y: 9.6, icon: '🏛️', label: 'Museum' },
  { x: 47.5, y: 18.6, icon: '🎳', label: 'Lanes' },
  { x: 18, y: 25.4, icon: '🍲', label: 'Burrow' },
  { x: 10.5, y: 32.6, icon: '🐰', label: 'Warren' },
  { x: 30.5, y: 21, icon: '⛲', label: 'Plaza' },
  { x: 26.4, y: 19.4, icon: '💃', label: 'Dance floor' },
  { x: 31, y: 43.4, icon: '⚓', label: 'Dock' },
  { x: 23, y: 11, icon: '🍯', label: 'Juniper' },
  { x: 36.5, y: 17, icon: '⏰', label: 'Rocco' },
  { x: 16.5, y: 4.4, icon: '💎', label: 'Grotto' },
  { x: 42.5, y: 4.2, icon: '🪨', label: 'Lookout' },
],
  digZones: [
    { id: 'beach', x: 15, y: 35, w: 32, h: 4, on: ['sand'], perDay: 3, hidden: 0.4, loot: [['shell-scallop', 30], ['shell-spiral', 30], ['sand-dollar', 14], ['sea-glass', 14], ['shell-conch', 5], ['fossil-tooth', 5], ['kelp', 8]] },
    { id: 'woods', x: 12, y: 5, w: 36, h: 5, on: ['grass'], perDay: 3, hidden: 0.5, loot: [['glowcap', 35], ['fossil-ammonite', 10], ['fossil-trilobite', 10], ['fossil-fern', 10], ['old-key', 8], ['clock-gear', 15], ['golden-acorn', 3]] },
    { id: 'meadow', x: 5, y: 22, w: 12, h: 12, on: ['grass'], perDay: 2, hidden: 0.4, loot: [['clover-leaf', 40], ['button', 15], ['marble', 15], ['clock-gear', 20], ['golden-acorn', 3]] },
    { id: 'village', x: 20, y: 12, w: 26, h: 16, on: ['grass'], perDay: 2, hidden: 0.3, loot: [['clock-gear', 45], ['button', 20], ['marble', 20], ['old-key', 10], ['fossil-fern', 5]] },
  ],
  zones: [
    { id: 'plaza', x: 24, y: 16, w: 13, h: 9 },
    { id: 'beach', x: 14, y: 34, w: 34, h: 6 },
    { id: 'meadow', x: 5, y: 23, w: 12, h: 12 },
    { id: 'dock', x: 30, y: 40, w: 2, h: 6 },
    { id: 'woods', x: 12, y: 4, w: 36, h: 6 },
  ],
  spawns: {
    start: { x: 30.5, y: 43.5, facing: 'up' },
    plaza: { x: 30.5, y: 23.5, facing: 'down' },
    'clocktower-out': { x: 30.5, y: 16.9, facing: 'down' },
    'cottage-out': { x: 13, y: 12.9, facing: 'down' },
    'tailor-out': { x: 18.5, y: 18.9, facing: 'down' },
    'museum-out': { x: 42.5, y: 13.9, facing: 'down' },
    'bowling-out': { x: 47.5, y: 22.9, facing: 'down' },
    'burrow-out': { x: 18, y: 29.4, facing: 'down' },
    'grotto-out': { x: 16.5, y: 8.4, facing: 'down' },
  },
  build: () => {
    const grid = build();
    return { grid, objects: objects(grid) };
  },
});
