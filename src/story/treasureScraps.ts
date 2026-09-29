import { app } from '../app';
import { audio } from '../audio/audio';
import { toast } from '../ui/ui';
import { grant } from '../core/wardrobe';
import { CLOTHES_BY_ID } from '../data/clothes';
import { SCRAP_BY_ID } from '../data/scraps';
import { flag, give, setFlag } from './hooks';
import type { WorldScene } from '../scenes/WorldScene';

/** Found a treasure-map scrap: its X becomes a dig spot (and a mark on your Map). */
export function findScrap(id: string, world?: WorldScene): boolean {
  const s = SCRAP_BY_ID.get(id);
  if (!s || flag(`scrap:${id}`)) return false;
  setFlag(`scrap:${id}`);
  give(id, 1, { quiet: true });
  audio.sfx('page');
  toast(`${s.name}: X marks the spot! It’s on your Map now.`, { icon: '🗺️', cls: 'quest', ms: 3800 });
  if (world && world.def.id === s.map) world.buildDigSpots();
  app.autosave.request();
  return true;
}

/** Biscuit digs at an X: the scrap's treasure. */
export function digScrapLoot(id: string): void {
  const s = SCRAP_BY_ID.get(id);
  const d = app.data;
  if (!s || !d) return;
  give(s.loot.item, s.loot.count, { from: 'Biscuit dug up...' });
  if (s.loot.wear && grant(d, s.loot.wear)) toast(`${CLOTHES_BY_ID.get(s.loot.wear)?.name ?? s.loot.wear} — it’s in your Wardrobe!`, { icon: '👕' });
  toast(s.loot.text, { icon: '✖️', cls: 'quest', ms: 3600 });
  // (the scrap stays in the Backpack as a keepsake)
}
