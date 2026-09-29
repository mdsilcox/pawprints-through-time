import { describe, expect, it } from 'vitest';
import {
  COTTAGE,
  STARTER_LAYOUT,
  allConnected,
  anchorOf,
  canPlace,
  findSpot,
  footprint,
  furnish,
  storedFurniture,
  tidyHome,
  toMapObject,
  turns,
  viewOf,
} from '../../src/core/home';
import { defaultSave, newGameSave, type PlacedItem } from '../../src/core/state';
import { FURNITURE, FURNITURE_BY_ID } from '../../src/data/furniture';
import { ITEM_BY_ID } from '../../src/data/items';

const def = (id: string) => FURNITURE_BY_ID.get(id)!;
const placed = (list: { id: string; x: number; y: number; rot?: number }[]): PlacedItem[] => list.map((p, i) => ({ uid: `h${i + 1}`, rot: 0, ...p }));

describe('home decorating: the catalogue', () => {
  it('every piece is also an inventory item, and every look has art keys', () => {
    for (const f of FURNITURE) {
      expect(ITEM_BY_ID.get(f.id)?.kind).toBe('furniture');
      expect(f.views.length).toBeGreaterThan(0);
      for (const v of f.views) expect(v.art).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('the spec’s examples are there: a pirate chest and a jukebox from the eras', () => {
    expect(def('pirate-chest').origin).toBe('pirate');
    expect(def('jukebox').origin).toBe('fifties');
  });
});

describe('home decorating: turning', () => {
  it('a chair turns through four looks without changing its footprint', () => {
    const chair = def('chair');
    expect(turns(chair)).toBe(4);
    expect(viewOf(chair, 1).art).toBe('chair-side');
    expect(viewOf(chair, 3)).toEqual({ art: 'chair-side', flip: true });
    expect(footprint(chair, 1)).toEqual({ w: 1, h: 1 });
  });

  it('turning a bed sideways swaps its width and depth', () => {
    const bed = def('bed');
    expect(footprint(bed, 0)).toEqual({ w: 2, h: 3 });
    expect(footprint(bed, 1)).toEqual({ w: 3, h: 2 });
    expect(footprint(bed, 3)).toEqual({ w: 2, h: 3 }); // wraps round
  });
});

describe('home decorating: where things may go', () => {
  it('the starter cottage is a legal layout, piece by piece', () => {
    const items: PlacedItem[] = [];
    STARTER_LAYOUT.forEach((p, i) => {
      expect(canPlace(COTTAGE, items, p), `${p.id} at ${p.x},${p.y}`).toEqual({ ok: true });
      items.push({ uid: `h${i + 1}`, ...p });
    });
  });

  it('keeps furniture inside the room and pictures on the wall', () => {
    expect(canPlace(COTTAGE, [], { id: 'chair', x: 0, y: 4, rot: 0 }).ok).toBe(false);
    expect(canPlace(COTTAGE, [], { id: 'chair', x: 9, y: 7, rot: 0 }).ok).toBe(true);
    expect(canPlace(COTTAGE, [], { id: 'chair', x: 10, y: 7, rot: 0 }).ok).toBe(false);
    expect(canPlace(COTTAGE, [], { id: 'chair', x: 2, y: 1, rot: 0 }).ok).toBe(false); // that's the wall
    expect(canPlace(COTTAGE, [], { id: 'cuckoo', x: 2, y: 1, rot: 0 }).ok).toBe(true);
    expect(canPlace(COTTAGE, [], { id: 'cuckoo', x: 2, y: 4, rot: 0 }).ok).toBe(false); // pictures hang up
    const win = canPlace(COTTAGE, [], { id: 'cuckoo', x: 3, y: 1, rot: 0 });
    expect(win.ok).toBe(false);
    if (!win.ok) expect(win.why).toMatch(/window/i);
  });

  it('nothing stands on top of something else (rugs may go under furniture, not under other rugs)', () => {
    const items = placed([{ id: 'table', x: 4, y: 5 }]);
    expect(canPlace(COTTAGE, items, { id: 'chair', x: 5, y: 5, rot: 0 }).ok).toBe(false);
    expect(canPlace(COTTAGE, items, { id: 'chair', x: 6, y: 5, rot: 0 }).ok).toBe(true);
    expect(canPlace(COTTAGE, items, { id: 'rug-round', x: 3, y: 4, rot: 0 }).ok).toBe(true);
    const withRug = placed([{ id: 'rug-red', x: 3, y: 4 }]);
    expect(canPlace(COTTAGE, withRug, { id: 'rug-round', x: 5, y: 3, rot: 0 }).ok).toBe(false);
  });

  it('the doorway stays clear and the room never gets cut in two', () => {
    const door = canPlace(COTTAGE, [], { id: 'chair', x: 5, y: 7, rot: 0 });
    expect(door.ok).toBe(false);
    if (!door.ok) expect(door.why).toMatch(/doorway/i);
    // a wall of sofas across the room, leaving no way through
    const wall = placed([
      { id: 'sofa', x: 1, y: 4 },
      { id: 'sofa', x: 3, y: 4 },
      { id: 'sofa', x: 5, y: 4 },
      { id: 'sofa', x: 7, y: 4 },
    ]);
    const cut = canPlace(COTTAGE, wall, { id: 'chair', x: 9, y: 4, rot: 0 });
    expect(cut.ok).toBe(false);
    if (!cut.ok) expect(cut.why).toMatch(/path|way/i);
    expect(allConnected(COTTAGE, new Set(['9,4']))).toBe(true);
  });

  it('you can always reach the bed and the wardrobe', () => {
    const items = placed([
      { id: 'bed', x: 1, y: 2 },
      { id: 'chair', x: 3, y: 2 },
      { id: 'chair', x: 3, y: 3 },
      { id: 'chair', x: 3, y: 4 },
    ]);
    // the last free spot beside the bed is (1,5)/(2,5): fill (2,5) is fine, both is not
    items.push({ uid: 'h9', id: 'chair', x: 2, y: 5, rot: 0 });
    const blocked = canPlace(COTTAGE, items, { id: 'chair', x: 1, y: 5, rot: 0 });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.why).toMatch(/reach/i);
  });

  it('moving a piece ignores its own old spot', () => {
    const items = placed([{ id: 'table', x: 4, y: 5 }]);
    expect(canPlace(COTTAGE, items, { id: 'table', x: 5, y: 5, rot: 0 }, 'h1').ok).toBe(true);
    expect(canPlace(COTTAGE, items, { id: 'table', x: 5, y: 5, rot: 0 }).ok).toBe(false);
  });

  it('finds the nearest free spot for something taken out of storage', () => {
    const items = placed(STARTER_LAYOUT);
    const spot = findSpot(COTTAGE, items, 'jukebox', { x: 5, y: 5 })!;
    expect(spot).toBeTruthy();
    expect(canPlace(COTTAGE, items, spot).ok).toBe(true);
    expect(Math.hypot(spot.x - 5, spot.y - 5)).toBeLessThan(2.5);
    const wallSpot = findSpot(COTTAGE, items, 'painting-sea', { x: 5, y: 5 })!;
    expect(wallSpot.y).toBe(COTTAGE.wallRows - 1);
  });
});

describe('home decorating: owning, placing and saving', () => {
  it('a new game starts with a furnished cottage (and owns every piece in it)', () => {
    const d = newGameSave();
    expect(d.home.items).toHaveLength(STARTER_LAYOUT.length);
    expect(d.inventory.chair).toBe(2);
    expect(storedFurniture(d)).toEqual([]);
    furnish(d); // only ever once
    expect(d.home.items).toHaveLength(STARTER_LAYOUT.length);
    expect(new Set(d.home.items.map((it) => it.uid)).size).toBe(d.home.items.length);
  });

  it('furniture you own but haven’t placed waits in storage', () => {
    const d = newGameSave();
    d.inventory['pirate-chest'] = 1;
    d.inventory.chair = 3;
    expect(storedFurniture(d)).toEqual([
      { id: 'chair', n: 1 },
      { id: 'pirate-chest', n: 1 },
    ]);
  });

  it('tidying drops placed pieces you no longer own', () => {
    const d = newGameSave();
    d.inventory.chair = 1;
    tidyHome(d);
    expect(d.home.items.filter((it) => it.id === 'chair')).toHaveLength(1);
    const plain = defaultSave();
    tidyHome(plain);
    expect(plain.home.items).toEqual([]);
  });

  it('placed pieces become map objects that block exactly their footprint', () => {
    const table = toMapObject({ uid: 'h1', id: 'table', x: 4, y: 5, rot: 0 })!;
    expect(table.kind).toBe('furniture');
    // the world's collision starts at floor(x) + dx, ceil(y) + dy
    expect(Math.floor(table.x) + table.foot!.dx).toBe(4);
    expect(Math.ceil(table.y) + table.foot!.dy).toBe(5);
    expect(table.foot).toMatchObject({ w: 2, h: 1 });
    const bed = toMapObject({ uid: 'h2', id: 'bed', x: 2, y: 3, rot: 1 })!;
    expect(bed.kind).toBe('use');
    expect(bed.p).toMatchObject({ action: 'bed', label: 'Sleep' });
    expect(Math.floor(bed.x) + bed.foot!.dx).toBe(2);
    expect(Math.ceil(bed.y) + bed.foot!.dy).toBe(3);
    expect(bed.foot).toMatchObject({ w: 3, h: 2 });
    expect(bed.texture).toBe('fur-bed-side');
    const rug = toMapObject({ uid: 'h3', id: 'rug-red', x: 3, y: 4, rot: 0 })!;
    expect(rug.foot).toBeUndefined();
    expect(rug.p?.floor).toBe(true);
    const clock = toMapObject({ uid: 'h4', id: 'cuckoo', x: 2, y: 1, rot: 0 })!;
    expect(clock.foot).toBeUndefined();
    expect(anchorOf({ id: 'cuckoo', x: 2, y: 1, rot: 0 }).y).toBeLessThan(COTTAGE.wallRows);
    const chair = toMapObject({ uid: 'h5', id: 'chair', x: 6, y: 5, rot: 3 })!;
    expect(chair.p?.flip).toBe(true);
  });
});
