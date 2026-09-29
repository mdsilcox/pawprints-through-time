import type { GardenPlot, SaveData } from '../core/state';

/**
 * The cottage garden: plant a seed packet, water it, and it grows on the in-game clock
 * (6 in-game hours ≈ 6 real minutes, or overnight if you sleep). Pure functions, unit-tested.
 */
export interface CropDef {
  seed: string;
  crop: string;
  /** how many you pick */
  yield: number;
  /** Tockens at Juniper's stall */
  price: number;
}

export const GARDEN_CROPS: CropDef[] = [
  { seed: 'seed-carrot', crop: 'carrot', yield: 3, price: 2 },
  { seed: 'seed-radish', crop: 'radish', yield: 3, price: 2 },
  { seed: 'seed-pumpkin', crop: 'pumpkin', yield: 2, price: 3 },
  { seed: 'seed-tomato', crop: 'tomato', yield: 3, price: 3 },
];
export const CROP_BY_SEED: Record<string, CropDef> = Object.fromEntries(GARDEN_CROPS.map((c) => [c.seed, c]));
export const CROP_BY_ID: Record<string, CropDef> = Object.fromEntries(GARDEN_CROPS.map((c) => [c.crop, c]));

/** In-game minutes from watering to ripe. */
export const GROW_MINUTES = 6 * 60;

export type PlotState = 'empty' | 'thirsty' | 'growing' | 'ready';

export function emptyPlot(): GardenPlot {
  return { seed: null, plantedAt: 0, wateredAt: 0 };
}

/** Absolute in-game minute (day * 1440 + minutes). */
export function gameNow(d: Pick<SaveData, 'day' | 'minutes'>): number {
  return d.day * 1440 + Math.floor(d.minutes);
}

export function plotInfo(p: GardenPlot, now: number): { state: PlotState; progress: number; stage: 0 | 1 | 2 | 3 } {
  if (!p.seed) return { state: 'empty', progress: 0, stage: 0 };
  if (!p.wateredAt) return { state: 'thirsty', progress: 0, stage: 0 };
  const progress = Math.min(1, Math.max(0, (now - p.wateredAt) / GROW_MINUTES));
  if (progress >= 1) return { state: 'ready', progress: 1, stage: 3 };
  return { state: 'growing', progress, stage: progress < 0.5 ? 1 : 2 };
}

export function plant(p: GardenPlot, seedItem: string, now: number): boolean {
  const crop = CROP_BY_SEED[seedItem];
  if (!crop || p.seed) return false;
  p.seed = crop.crop;
  p.plantedAt = now;
  p.wateredAt = 0;
  return true;
}

export function water(p: GardenPlot, now: number): boolean {
  if (!p.seed || p.wateredAt) return false;
  p.wateredAt = now;
  return true;
}

export function harvest(p: GardenPlot, now: number): { crop: string; n: number } | null {
  if (plotInfo(p, now).state !== 'ready') return null;
  const crop = CROP_BY_ID[p.seed!];
  const out = { crop: crop.crop, n: crop.yield };
  Object.assign(p, emptyPlot());
  return out;
}
