/** The persistent save-data model and helpers. Everything that must survive a reload lives here. */

export const SAVE_VERSION = 2;

export type OutfitSlot = 'hat' | 'top' | 'bottom' | 'shoes' | 'acc';
export const OUTFIT_SLOTS: OutfitSlot[] = ['hat', 'top', 'bottom', 'shoes', 'acc'];
export type BiscuitSlot = 'hat' | 'neck';
export const BISCUIT_SLOTS: BiscuitSlot[] = ['hat', 'neck'];

export interface Worn {
  id: string;
  color: number; // index into the item's color variants
}
export type Outfit = Partial<Record<OutfitSlot, Worn | null>>;
export type BiscuitOutfit = Partial<Record<BiscuitSlot, Worn | null>>;

export interface Look {
  skin: number; // index into SKIN_TONES
  hair: number; // index into HAIR_COLORS
  hairStyle: number; // index into hair styles
}

export interface PlayerProfile {
  name: string;
  look: Look;
  outfit: Outfit;
}

export interface PuzzleRecord {
  solved: boolean;
  timesSolved: number;
  bestHints: number;
  lastDifficulty: Difficulty;
  favorite?: boolean;
}
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface PlacedItem {
  uid: string;
  id: string; // furniture item id
  x: number; // tile coords inside the cottage
  y: number;
  rot: number; // 0..3 quarter turns
}

export interface GardenPlot {
  seed: string | null; // crop (ingredient id) growing here
  plantedAt: number; // absolute in-game minute (day * 1440 + minutes)
  wateredAt: number; // 0 = still needs water
}

/** A soup effect that is still running (seconds of play left). */
export interface ActiveEffect {
  effect: string;
  soup: string;
  left: number;
  total: number;
}

export interface SaveData {
  version: number;
  createdAt: number;
  updatedAt: number;
  playTimeMs: number;
  /** In-game clock: day number and minutes since midnight. */
  day: number;
  minutes: number;
  players: [PlayerProfile, PlayerProfile];
  biscuit: { outfit: BiscuitOutfit };
  location: { map: string; x: number; y: number };
  flags: Record<string, boolean | number | string>;
  inventory: Record<string, number>;
  wardrobe: string[];
  tockens: number;
  friendship: Record<string, number>;
  lastChat: Record<string, number>;
  lastGift: Record<string, number>;
  bunnies: string[];
  sands: string[];
  notes: string[];
  museum: string[];
  /** soups discovered (magic and silly) */
  recipes: string[];
  /** recipe clues players have heard (soup ids) */
  clues: string[];
  triedCombos: string[];
  effects: ActiveEffect[];
  puzzles: Record<string, PuzzleRecord>;
  skill: number;
  home: { items: PlacedItem[] };
  garden: GardenPlot[];
  dug: Record<string, number>;
  seen: Record<string, boolean>;
}

export const SKIN_TONES = ['#ffe0c7', '#f6c9a3', '#e0a47a', '#b97a56', '#8a5a3c', '#5e3d2b'];
export const HAIR_COLORS = ['#5a3a29', '#2f2622', '#d9a44a', '#b8562f', '#8c6a4f', '#e8d7b0', '#6f5aa8', '#e57aa0'];
export const HAIR_STYLE_COUNT = 6;

export function defaultPlayer(index: 0 | 1): PlayerProfile {
  if (index === 0) {
    return {
      name: 'Player 1',
      look: { skin: 1, hair: 0, hairStyle: 0 },
      outfit: {
        hat: null,
        top: { id: 'tee-striped', color: 0 },
        bottom: { id: 'shorts-denim', color: 0 },
        shoes: { id: 'sneakers', color: 0 },
        acc: null,
      },
    };
  }
  return {
    name: 'Player 2',
    look: { skin: 3, hair: 3, hairStyle: 3 },
    outfit: {
      hat: { id: 'beanie', color: 1 },
      top: { id: 'hoodie', color: 1 },
      bottom: { id: 'pants-comfy', color: 1 },
      shoes: { id: 'sneakers', color: 2 },
      acc: null,
    },
  };
}

export function defaultSave(now = Date.now()): SaveData {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    playTimeMs: 0,
    day: 1,
    minutes: 8 * 60,
    players: [defaultPlayer(0), defaultPlayer(1)],
    biscuit: { outfit: { hat: null, neck: { id: 'biscuit-bandana', color: 0 } } },
    location: { map: 'tockwood', x: -1, y: -1 },
    flags: {},
    inventory: {},
    wardrobe: ['tee-striped', 'shorts-denim', 'sneakers', 'beanie', 'hoodie', 'pants-comfy', 'backpack', 'skirt', 'round-glasses', 'sunhat', 'biscuit-bandana', 'party-bow'],
    tockens: 20,
    friendship: {},
    lastChat: {},
    lastGift: {},
    bunnies: [],
    sands: [],
    notes: [],
    museum: [],
    recipes: [],
    clues: [],
    triedCombos: [],
    effects: [],
    puzzles: {},
    skill: 0.4,
    home: { items: [] },
    garden: [0, 1, 2, 3].map(() => ({ seed: null, plantedAt: 0, wateredAt: 0 })),
    dug: {},
    seen: {},
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Bring any older/partial save up to the current shape: every field missing from `raw`
 * is filled from the defaults, while existing values are kept.
 */
export function migrateSave(raw: unknown): SaveData {
  const base = defaultSave(0);
  if (!isPlainObject(raw)) return defaultSave();
  const out = deepFill(base, raw) as SaveData;
  const players: unknown[] = Array.isArray(out.players) ? out.players : [];
  out.players = [deepFill(defaultPlayer(0), players[0]), deepFill(defaultPlayer(1), players[1])] as [
    PlayerProfile,
    PlayerProfile,
  ];
  // garden plots from version 1 saves used a different shape
  const plots: unknown[] = Array.isArray(out.garden) ? out.garden : [];
  out.garden = [0, 1, 2, 3].map((i) => {
    const p = (isPlainObject(plots[i]) ? plots[i] : {}) as Partial<GardenPlot>;
    return { seed: typeof p.seed === 'string' ? p.seed : null, plantedAt: Number(p.plantedAt) || 0, wateredAt: Number(p.wateredAt) || 0 };
  });
  if (!Array.isArray(out.effects)) out.effects = [];
  out.version = SAVE_VERSION;
  return out;
}

function deepFill(defaults: unknown, value: unknown): unknown {
  if (value === undefined) return structuredClone(defaults);
  if (isPlainObject(defaults) && isPlainObject(value)) {
    const out: Record<string, unknown> = { ...value };
    for (const [k, dv] of Object.entries(defaults)) {
      // Records keyed by arbitrary ids (flags, inventory...) have empty defaults: keep the saved value as-is.
      out[k] = k in value ? deepFill(dv, value[k]) : structuredClone(dv);
    }
    return out;
  }
  // Type mismatch (e.g. corrupted field) -> fall back to the default.
  if (defaults !== null && value !== null && typeof defaults !== typeof value) return structuredClone(defaults);
  if (Array.isArray(defaults) !== Array.isArray(value) && defaults !== null) return structuredClone(defaults);
  return value;
}

/** A small human-friendly summary used by the save-slot screen. */
export interface SlotSummary {
  slot: number;
  exists: boolean;
  updatedAt: number;
  playTimeMs: number;
  day: number;
  sands: number;
  bunnies: number;
  location: string;
  p1Name: string;
  p2Name: string;
}

export function summarize(slot: number, data: SaveData | null): SlotSummary {
  if (!data) {
    return { slot, exists: false, updatedAt: 0, playTimeMs: 0, day: 0, sands: 0, bunnies: 0, location: '', p1Name: '', p2Name: '' };
  }
  return {
    slot,
    exists: true,
    updatedAt: data.updatedAt,
    playTimeMs: data.playTimeMs,
    day: data.day,
    sands: data.sands.length,
    bunnies: data.bunnies.length,
    location: data.location.map,
    p1Name: data.players[0].name,
    p2Name: data.players[1].name,
  };
}
