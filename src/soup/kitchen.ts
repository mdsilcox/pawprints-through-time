import { app } from '../app';
import { audio } from '../audio/audio';
import { ITEMS, ITEM_BY_ID, type ItemDef } from '../data/items';
import { toast } from '../ui/ui';
import { FAVOURITE_SOUP, SOUPS, SOUP_BY_ID, soupFromItem, soupItemId, type SoupDef } from './recipes';

/**
 * Soup bookkeeping shared by the cauldron, the recipe book and the story: bottled soups as
 * backpack items, recipe clues, discoveries and gifts.
 */

// bottled soups are items too (backpack, gifting)
for (const s of SOUPS) {
  const def: ItemDef = { id: soupItemId(s.id), name: s.name, kind: 'soup', icon: `bottle:${s.color}`, origin: 'tockwood', desc: s.desc };
  if (!ITEM_BY_ID.has(def.id)) {
    ITEMS.push(def);
    ITEM_BY_ID.set(def.id, def);
  }
}

export function learnClue(soupId: string, from?: string): boolean {
  const d = app.data;
  const s = SOUP_BY_ID[soupId];
  if (!d || !s || d.clues.includes(soupId)) return false;
  d.clues.push(soupId);
  // the Recipe Book credits whoever actually told you (some clues have two sources)
  if (from) d.flags[`cluefrom:${soupId}`] = from;
  audio.sfx('sparkle');
  toast(`New recipe clue: ${d.recipes.includes(soupId) ? s.name : 'a mystery soup'}! See your Recipe Book.`, { icon: '📜', cls: 'quest', ms: 3200 });
  app.autosave.request();
  return true;
}

/** Remember a brewed soup; returns true the first time. */
export function discover(soupId: string, combo: string): boolean {
  const d = app.data;
  if (!d) return false;
  if (!d.triedCombos.includes(combo)) d.triedCombos.push(combo);
  d.flags['soup:pots'] = Number(d.flags['soup:pots'] ?? 0) + 1;
  if (d.recipes.includes(soupId)) return false;
  d.recipes.push(soupId);
  d.flags[`recipe:combo:${soupId}`] = combo;
  return true;
}

export function magicDiscovered(): SoupDef[] {
  const d = app.data;
  return d ? SOUPS.filter((s) => !s.silly && d.recipes.includes(s.id)) : [];
}

export function soupsHeld(): SoupDef[] {
  const d = app.data;
  if (!d) return [];
  return SOUPS.filter((s) => (d.inventory[soupItemId(s.id)] ?? 0) > 0);
}

export { FAVOURITE_SOUP, soupFromItem };
