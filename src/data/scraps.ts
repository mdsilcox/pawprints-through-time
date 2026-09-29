import type { EraId } from './clothes';

/**
 * Treasure-map scraps: little collectable maps from the eras. Each one marks an X — a dig spot
 * you can see (and find on your Map) — where Biscuit digs up something special.
 */
export interface TreasureScrap {
  id: string;
  era: EraId;
  name: string;
  /** where the X is */
  map: string;
  cx: number;
  cy: number;
  /** what the scrap shows (its Backpack description) */
  hint: string;
  loot: {
    item: string;
    count: number;
    /** a piece of clothing found with it (goes to the wardrobe) */
    wear?: string;
    text: string;
  };
}

export const SCRAPS: TreasureScrap[] = [
  {
    id: 'scrap-cove-west',
    era: 'pirate',
    name: 'Map Scrap: the Western Beach',
    map: 'cove',
    cx: 5,
    cy: 12,
    hint: 'A sketch of Sandy Cove’s western beach, where the bottles wash up — and a little X between the palm trees.',
    loot: { item: 'doubloon', count: 2, wear: 'eyepatch', text: 'Two gold doubloons, wrapped in a Pirate Eye Patch!' },
  },
  {
    id: 'scrap-cove-camp',
    era: 'pirate',
    name: 'Map Scrap: the Mackerel Camp',
    map: 'cove',
    cx: 42,
    cy: 7,
    hint: 'Captain Saltwhistle’s camp up the beach... with an X just past the tents, by the tall palm.',
    loot: { item: 'shell-conch', count: 1, wear: 'buckle-shoes', text: 'A pink conch shell — and a pair of shiny Buckle Shoes!' },
  },
  {
    id: 'scrap-isle-north',
    era: 'pirate',
    name: 'Map Scrap: the Island’s North Shore',
    map: 'isle',
    cx: 12,
    cy: 4,
    hint: 'Treasure Island’s northern beach, with a big red X near the top.',
    loot: { item: 'pirate-chest', count: 1, text: 'A real sea chest with brass corners! It would look splendid in your cottage.' },
  },
];

export const SCRAP_BY_ID = new Map(SCRAPS.map((s) => [s.id, s]));
