import type { PlacedItem, SaveData } from './state';
import type { MapObject } from '../world/mapdef';
import { FURNITURE_BY_ID, type FurnitureDef, type FurnitureView } from '../data/furniture';

/**
 * Home decorating rules (pure, unit-tested): where furniture may stand in the cottage, how it
 * turns, what you own versus what's placed, and the furnished cottage every new game starts with.
 *
 * Cells: the room is `w` × `h` cells; the back wall is rows 0..wallRows-1 (pictures hang on its
 * lowest row), the floor is x 1..w-2 × y wallRows..h-2, and the doorway is in the bottom wall.
 */
export interface RoomShape {
  w: number;
  h: number;
  wallRows: number;
  door: { x: number; w: number };
  windows: number[];
}

export const COTTAGE: RoomShape = { w: 11, h: 9, wallRows: 2, door: { x: 5, w: 1 }, windows: [3, 7] };

export interface Piece {
  id: string;
  x: number;
  y: number;
  rot: number;
}

export function furnitureDef(id: string): FurnitureDef | undefined {
  return FURNITURE_BY_ID.get(id);
}

/** How many looks a piece cycles through (1 = turning changes nothing). */
export function turns(def: FurnitureDef): number {
  return def.views.length;
}

export function viewOf(def: FurnitureDef, rot: number): FurnitureView {
  const n = def.views.length;
  return def.views[((rot % n) + n) % n];
}

/** Footprint (cells) for a piece in its current turn. */
export function footprint(def: FurnitureDef, rot: number): { w: number; h: number } {
  return viewOf(def, rot).side ? { w: def.h, h: def.w } : { w: def.w, h: def.h };
}

/** Where a piece of this kind may be placed: the rows its top-left cell may use. */
export function rowsFor(room: RoomShape, def: FurnitureDef): { min: number; max: number } {
  if (def.place === 'wall') return { min: room.wallRows - 1, max: room.wallRows - 1 };
  return { min: room.wallRows, max: room.h - 2 };
}

export function cellsOf(def: FurnitureDef, p: Piece): { x: number; y: number }[] {
  const f = footprint(def, p.rot);
  const out: { x: number; y: number }[] = [];
  for (let j = 0; j < f.h; j++) for (let i = 0; i < f.w; i++) out.push({ x: p.x + i, y: p.y + j });
  return out;
}

const key = (x: number, y: number) => `${x},${y}`;

/** Floor cells that furniture makes solid (rugs and pictures never block). */
export function solidCells(items: Piece[], ignoreUid?: string): Set<string> {
  const s = new Set<string>();
  for (const it of items) {
    if (ignoreUid && (it as PlacedItem).uid === ignoreUid) continue;
    const def = furnitureDef(it.id);
    if (!def || def.place !== 'floor') continue;
    for (const c of cellsOf(def, it)) s.add(key(c.x, c.y));
  }
  return s;
}

export type PlaceCheck = { ok: true } | { ok: false; why: string };

/**
 * Can `piece` stand here (ignoring the placed item `ignoreUid`, i.e. the one being moved)?
 * Floor pieces may not overlap, cover the doorway, cut the room in two, or box in something you use.
 */
export function canPlace(room: RoomShape, items: PlacedItem[], piece: Piece, ignoreUid?: string): PlaceCheck {
  const def = furnitureDef(piece.id);
  if (!def) return { ok: false, why: 'That isn’t furniture!' };
  const f = footprint(def, piece.rot);
  const rows = rowsFor(room, def);
  if (piece.x < 1 || piece.x + f.w > room.w - 1 || piece.y < rows.min || piece.y + f.h - 1 > rows.max)
    return { ok: false, why: def.place === 'wall' ? 'Pictures and clocks hang on the wall.' : 'It won’t fit there.' };
  const others = items.filter((it) => it.uid !== ignoreUid);
  const mine = cellsOf(def, piece);
  if (def.place === 'wall') {
    if (mine.some((c) => room.windows.includes(c.x))) return { ok: false, why: 'That’s a window!' };
    const taken = new Set<string>();
    for (const o of others) {
      const od = furnitureDef(o.id);
      if (od?.place === 'wall') for (const c of cellsOf(od, o)) taken.add(key(c.x, c.y));
    }
    if (mine.some((c) => taken.has(key(c.x, c.y)))) return { ok: false, why: 'Something already hangs there.' };
    return { ok: true };
  }
  if (def.place === 'rug') {
    for (const o of others) {
      const od = furnitureDef(o.id);
      if (od?.place !== 'rug') continue;
      const theirs = new Set(cellsOf(od, o).map((c) => key(c.x, c.y)));
      if (mine.some((c) => theirs.has(key(c.x, c.y)))) return { ok: false, why: 'Rugs don’t like to overlap.' };
    }
    return { ok: true };
  }
  const solid = solidCells(others);
  if (mine.some((c) => solid.has(key(c.x, c.y)))) return { ok: false, why: 'Something’s already there.' };
  const doorRow = room.h - 2;
  if (mine.some((c) => c.y === doorRow && c.x >= room.door.x && c.x < room.door.x + room.door.w)) return { ok: false, why: 'Keep the doorway clear!' };
  for (const c of mine) solid.add(key(c.x, c.y));
  if (!allConnected(room, solid)) return { ok: false, why: 'That would block the way — leave a path!' };
  // everything you use needs a free spot beside it
  const withMe = [...others, { ...piece, uid: '__new' }];
  for (const it of withMe) {
    const d = furnitureDef(it.id);
    if (!d?.use) continue;
    const cells = cellsOf(d, it);
    const beside = cells.some((c) =>
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => {
        const x = c.x + dx;
        const y = c.y + dy;
        return isFloor(room, x, y) && !solid.has(key(x, y));
      }),
    );
    if (!beside) return { ok: false, why: `You couldn’t reach the ${d.name.toLowerCase()}!` };
  }
  return { ok: true };
}

function isFloor(room: RoomShape, x: number, y: number): boolean {
  return x >= 1 && x <= room.w - 2 && y >= room.wallRows && y <= room.h - 2;
}

/** Every free floor cell can still be walked to from the doorway. */
export function allConnected(room: RoomShape, solid: Set<string>): boolean {
  const start = { x: room.door.x, y: room.h - 2 };
  if (solid.has(key(start.x, start.y))) return false;
  const seen = new Set<string>([key(start.x, start.y)]);
  const q = [start];
  while (q.length) {
    const c = q.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = c.x + dx;
      const y = c.y + dy;
      const k = key(x, y);
      if (!isFloor(room, x, y) || solid.has(k) || seen.has(k)) continue;
      seen.add(k);
      q.push({ x, y });
    }
  }
  let free = 0;
  for (let y = room.wallRows; y <= room.h - 2; y++) for (let x = 1; x <= room.w - 2; x++) if (!solid.has(key(x, y))) free++;
  return seen.size === free;
}

/** The nearest spot (to `near`) where a piece fits, trying each of its turns. */
export function findSpot(room: RoomShape, items: PlacedItem[], id: string, near: { x: number; y: number }, rot = 0): Piece | null {
  const def = furnitureDef(id);
  if (!def) return null;
  const rows = rowsFor(room, def);
  let best: Piece | null = null;
  let bestD = Infinity;
  for (let r = 0; r < turns(def); r++) {
    const rr = (rot + r) % turns(def);
    for (let y = rows.min; y <= rows.max; y++)
      for (let x = 1; x < room.w - 1; x++) {
        const p = { id, x, y, rot: rr };
        // (pictures prefer a bit of wall that isn't behind a bookshelf or a wardrobe)
        const hidden = def.place === 'wall' && solidCells(items).has(key(x, room.wallRows)) ? 6 : 0;
        const d = Math.hypot(x - near.x, y - near.y) + r * 0.01 + hidden;
        if (d >= bestD) continue;
        if (canPlace(room, items, p).ok) {
          best = p;
          bestD = d;
        }
      }
    if (best) return best;
  }
  return best;
}

/** Where a piece's picture stands (cells): bottom centre of its footprint, or hung on the wall. */
export function anchorOf(p: Piece, room: RoomShape = COTTAGE): { x: number; y: number } {
  const def = furnitureDef(p.id)!;
  const f = footprint(def, p.rot);
  if (def.place === 'wall') return { x: p.x + f.w / 2, y: room.wallRows - 0.3 };
  return { x: p.x + f.w / 2, y: p.y + f.h - (def.place === 'rug' ? 0 : 0.05) };
}

/** A placed piece as a map object (collision footprint, texture, and its action if you can use it). */
export function toMapObject(p: PlacedItem, room: RoomShape = COTTAGE): MapObject | null {
  const def = furnitureDef(p.id);
  if (!def) return null;
  const v = viewOf(def, p.rot);
  const f = footprint(def, p.rot);
  const a = anchorOf(p, room);
  return {
    id: `home-${p.uid}`,
    kind: def.use ? 'use' : 'furniture',
    x: a.x,
    y: a.y,
    texture: `fur-${v.art}`,
    foot: def.place === 'floor' ? { dx: p.x - Math.floor(a.x), dy: p.y - Math.ceil(a.y), w: f.w, h: f.h } : undefined,
    p: { ...(def.use ?? {}), flip: v.flip ?? false, floor: def.place === 'rug', wall: def.place === 'wall', home: p.id },
  };
}

// The cottage map reads the save through this (maps stay free of app state).
let homeSource: () => PlacedItem[] = () => [];
export function setHomeSource(fn: () => PlacedItem[]): void {
  homeSource = fn;
}
export function homeMapObjects(): MapObject[] {
  return homeSource()
    .map((p) => toMapObject(p))
    .filter((o): o is MapObject => !!o);
}

// ------------------------------------------------------------------ owning vs placing
export function ownedCount(d: SaveData, id: string): number {
  return d.inventory[id] ?? 0;
}

export function placedCount(d: SaveData, id: string): number {
  return d.home.items.filter((it) => it.id === id).length;
}

/** Furniture you own that isn't in the room (id → how many). */
export function storedFurniture(d: SaveData): { id: string; n: number }[] {
  const out: { id: string; n: number }[] = [];
  for (const [id, n] of Object.entries(d.inventory)) {
    if (!furnitureDef(id)) continue;
    const left = n - placedCount(d, id);
    if (left > 0) out.push({ id, n: left });
  }
  return out;
}

export function newUid(d: SaveData): string {
  let n = 1;
  for (const it of d.home.items) {
    const m = /^h(\d+)$/.exec(it.uid);
    if (m) n = Math.max(n, Number(m[1]) + 1);
  }
  return `h${n}`;
}

/** The cottage as you find it on day one. */
export const STARTER_LAYOUT: Piece[] = [
  { id: 'rug-red', x: 3, y: 4, rot: 0 },
  { id: 'bed', x: 1, y: 2, rot: 0 },
  { id: 'wardrobe', x: 7, y: 2, rot: 0 },
  { id: 'bookshelf', x: 4, y: 2, rot: 0 },
  { id: 'table', x: 4, y: 5, rot: 0 },
  { id: 'chair', x: 3, y: 5, rot: 3 },
  { id: 'chair', x: 6, y: 5, rot: 1 },
  { id: 'plant', x: 9, y: 7, rot: 0 },
  { id: 'lampfloor', x: 1, y: 7, rot: 0 },
  { id: 'cuckoo', x: 2, y: 1, rot: 0 },
];

/** Give a save its furnished cottage once (new games and saves from before decorating). */
export function furnish(d: SaveData): void {
  if (d.flags['home:v1']) return;
  d.flags['home:v1'] = true;
  const kept = d.home.items.filter((it) => furnitureDef(it.id));
  d.home.items = kept;
  for (const p of STARTER_LAYOUT) {
    d.inventory[p.id] = (d.inventory[p.id] ?? 0) + 1;
    d.home.items.push({ uid: newUid(d), id: p.id, x: p.x, y: p.y, rot: p.rot });
  }
}

/** Sanity pass after loading: drop placed pieces you no longer own (never the other way round). */
export function tidyHome(d: SaveData): void {
  const count = new Map<string, number>();
  d.home.items = d.home.items.filter((it) => {
    if (!furnitureDef(it.id)) return false;
    const n = (count.get(it.id) ?? 0) + 1;
    count.set(it.id, n);
    return n <= ownedCount(d, it.id);
  });
}
