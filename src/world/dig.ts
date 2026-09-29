import { rng, hashString } from '../art/draw';
import type { TerrainGrid, Terrain } from './terrain';
import type { CollisionGrid } from './collision';

/**
 * Biscuit's dig spots. Each map has dig zones with loot tables; every in-game day a fresh set
 * of spots appears (seeded by day, so they're stable across reloads). Some sparkle openly, others
 * stay hidden until Biscuit sniffs nearby.
 */
export interface DigZone {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  loot: [string, number][];
  perDay: number;
  /** fraction of spots that start hidden */
  hidden: number;
  on?: Terrain[];
}

export interface DigSpot {
  id: string;
  zone: string;
  cx: number;
  cy: number;
  item: string;
  hidden: boolean;
  /** a story flag set when it's dug */
  flag?: string;
  /** an X from a treasure-map scrap */
  scrap?: string;
}

export function pickLoot(loot: [string, number][], r: () => number): string {
  const total = loot.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [id, w] of loot) {
    x -= w;
    if (x < 0) return id;
  }
  return loot[loot.length - 1][0];
}

export function spotsForDay(mapId: string, day: number, zones: DigZone[], grid: TerrainGrid, coll: CollisionGrid): DigSpot[] {
  const out: DigSpot[] = [];
  for (const z of zones) {
    const r = rng(hashString(`${mapId}:${z.id}:${day}`));
    let tries = 0;
    let made = 0;
    while (made < z.perDay && tries < 80) {
      tries++;
      const cx = z.x + Math.floor(r() * z.w);
      const cy = z.y + Math.floor(r() * z.h);
      if (coll.isSolid(cx, cy)) continue;
      const t = grid.get(cx, cy);
      if (z.on && !z.on.includes(t)) continue;
      if (out.some((s) => Math.abs(s.cx - cx) + Math.abs(s.cy - cy) < 3)) continue;
      out.push({ id: `${mapId}:${z.id}:${day}:${made}`, zone: z.id, cx, cy, item: pickLoot(z.loot, r), hidden: r() < z.hidden });
      made++;
    }
  }
  return out;
}

/** Spots still available today (not dug yet). */
export function availableSpots(spots: DigSpot[], dug: Record<string, number>): DigSpot[] {
  return spots.filter((s) => dug[s.id] === undefined);
}
