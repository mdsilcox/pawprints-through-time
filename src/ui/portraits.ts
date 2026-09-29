import { app } from '../app';
import { renderPortrait } from '../art/character';
import { renderPipPortrait } from '../art/fairy';
import { character } from '../data/characters';
import { lookKey, specForPlayer } from '../data/clothes';

/** Character portraits as data URLs (drawn once, cached). */
const cache = new Map<string, string>();
type Extra = (id: string, happy: boolean) => HTMLCanvasElement | null;
const extras: Extra[] = [];

/** Lets art modules (corgi, bunnies...) contribute portraits without import cycles. */
export function registerPortraitSource(fn: Extra): void {
  extras.push(fn);
  cache.clear();
}

export function portraitUrl(id: string, happy = false): string | null {
  const def = character(id);
  if (def.art === 'narrator') return null;
  if (def.art === 'player') {
    const idx = id === 'p2' ? 1 : 0;
    const prof = app.data?.players[idx];
    if (!prof) return null;
    const key = `player:${lookKey(prof)}`;
    if (!cache.has(key)) cache.set(key, renderPortrait(specForPlayer(prof), 160).toDataURL());
    return cache.get(key)!;
  }
  const key = `${id}:${happy ? 1 : 0}`;
  if (cache.has(key)) return cache.get(key)!;
  let canvas: HTMLCanvasElement | null = null;
  for (const fn of extras) {
    canvas = fn(id, happy);
    if (canvas) break;
  }
  if (!canvas) {
    if (def.art === 'fairy') canvas = renderPipPortrait(160, happy);
    else if (def.spec) canvas = renderPortrait(def.spec, 160, happy ? 'wave' : 'idle');
  }
  if (!canvas) return null;
  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}

export function clearPortraitCache(): void {
  cache.clear();
}
