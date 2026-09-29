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

function objects(): MapObject[] {
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
  add('bench', 33.5, 24.6, { texture: 'prop-bench' });
  add('flowerbed', 25.5, 17.2, { texture: 'prop-flowerbed' });
  add('flowerbed', 35.5, 17.2, { texture: 'prop-flowerbed' });
  add('sign', 28.6, 26.4, { texture: 'prop-sign', p: { text: 'Tockwood Plaza — clocktower north, beach south, meadow west.' } });
  add('stall', TW.rocco.x, TW.rocco.y, { texture: 'prop-stall', foot: { dx: -1, dy: -1, w: 2, h: 1 } });
  add('stall-garden', TW.juniper.x, TW.juniper.y, { texture: 'prop-stall-green', foot: { dx: -1, dy: -1, w: 2, h: 1 } });

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
    add('palm', x, y, { texture: 'tree-palm', foot: { dx: 0, dy: -1, w: 1, h: 1 } });
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
    add('rock', x, y, { texture: 'prop-rock', foot: { dx: 0, dy: -1, w: 1, h: 1 } });

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
  spawns: {
    start: { x: 30.5, y: 43.5, facing: 'up' },
    plaza: { x: 30.5, y: 23.5, facing: 'down' },
    'clocktower-out': { x: 30.5, y: 16.9, facing: 'down' },
    'cottage-out': { x: 13, y: 12.9, facing: 'down' },
    'tailor-out': { x: 18.5, y: 18.9, facing: 'down' },
    'museum-out': { x: 42.5, y: 13.9, facing: 'down' },
    'bowling-out': { x: 47.5, y: 22.9, facing: 'down' },
    'burrow-out': { x: 18, y: 29.4, facing: 'down' },
  },
  build: () => ({ grid: build(), objects: objects() }),
});
