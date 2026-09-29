import type { TerrainGrid } from './terrain';

/** Everything placed on a map besides terrain: props, buildings, doors, people, dig spots... */
export interface MapObject {
  id: string;
  kind: string;
  /** anchor in cell units (the object's base/feet); fractional allowed */
  x: number;
  y: number;
  /** solid footprint in cells, relative to the anchor cell (defaults to none) */
  foot?: { dx: number; dy: number; w: number; h: number };
  texture?: string;
  /** free-form per-kind properties */
  p?: Record<string, any>;
  /** only present while this condition holds (see story/conditions) */
  when?: string;
}

export interface SpawnPoint {
  x: number;
  y: number;
  facing?: 'down' | 'up' | 'left' | 'right';
}

export type Lighting = 'daynight' | 'day' | 'golden' | 'evening' | 'indoor' | 'dark';

export interface BuiltMap {
  grid: TerrainGrid;
  objects: MapObject[];
}

export interface MapDef {
  id: string;
  name: string;
  region: 'tockwood' | 'pirate' | 'egypt' | 'fifties' | 'florence';
  indoor?: boolean;
  lighting: Lighting;
  music: string;
  /** background colour beyond the terrain (sea, void...) */
  bg: string;
  /** render layer style keys, bottom to top */
  layers: string[];
  spawns: Record<string, SpawnPoint>;
  build(): BuiltMap;
}

const registry = new Map<string, MapDef>();

export function registerMap(def: MapDef): void {
  registry.set(def.id, def);
}

export function getMap(id: string): MapDef {
  const m = registry.get(id);
  if (!m) throw new Error(`Unknown map ${id}`);
  return m;
}

export function allMaps(): MapDef[] {
  return [...registry.values()];
}
