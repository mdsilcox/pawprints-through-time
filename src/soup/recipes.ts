import { ITEM_BY_ID } from '../data/items';

/**
 * Magic soup recipes. A soup is decided by its three ingredients' tags: Clover's riddle clues
 * describe the tags ("something that grows in the dark, something from the sea, something that
 * grows underground"), and any ingredient with the right tag works. Combinations that fit no
 * recipe make a harmless silly soup. Tests prove no combination fits two magic recipes.
 */
export type EffectId =
  | 'glow'
  | 'hop'
  | 'whisker'
  | 'ticktock'
  | 'calm'
  | 'zoom'
  | 'sparkle'
  | 'together'
  // silly
  | 'hiccup'
  | 'squeaky'
  | 'rainbow'
  | 'wobble';

export interface SoupDef {
  id: string;
  name: string;
  /** soup colour (bowl, bottle, glow) */
  color: string;
  effect: EffectId;
  /** seconds the effect lasts */
  seconds: number;
  /** what it does, in a sentence kids can read */
  desc: string;
  /** three ingredient tags (magic soups) */
  needs?: [string, string, string];
  /** Clover-style riddle clue and who tells it */
  clue?: string;
  clueFrom?: string;
  /** needs both players stirring together */
  twoPlayer?: boolean;
  silly?: boolean;
  /** used by a story puzzle */
  story?: boolean;
}

export const SOUPS: SoupDef[] = [
  {
    id: 'glowbroth',
    name: 'Glowbroth',
    color: '#b8f28a',
    effect: 'glow',
    seconds: 150,
    desc: 'You glow like a lantern — dark caves and tombs light up around you.',
    needs: ['dark', 'sea', 'root'],
    clue: 'Something that grows in the dark, something from the sea, and something that grows under the ground.',
    clueFrom: 'clover',
    story: true,
  },
  {
    id: 'hopscotch-chowder',
    name: 'Hopscotch Chowder',
    color: '#ffc27a',
    effect: 'hop',
    seconds: 120,
    desc: 'Super-bunny jumps! Hop up onto high ledges.',
    needs: ['bunny', 'bunny', 'sweet'],
    clue: 'Two things a bunny loves to munch, and something sweet to put a spring in your step.',
    clueFrom: 'clover',
    story: true,
  },
  {
    id: 'whisker-bisque',
    name: 'Whisker Bisque',
    color: '#f3d9b0',
    effect: 'whisker',
    seconds: 150,
    desc: 'Understand what Biscuit and the animals are saying.',
    needs: ['cat', 'meadow', 'golden'],
    clue: 'Something a cat would beg for, something from the meadow, and something golden.',
    clueFrom: 'grandma',
  },
  {
    id: 'sunbeam-squash',
    name: 'Sunbeam Squash',
    color: '#ffb347',
    effect: 'zoom',
    seconds: 120,
    desc: 'Your feet feel like sunbeams — zip around at double speed!',
    needs: ['big', 'orange', 'golden'],
    clue: 'Something big, something orange, and something golden like the sun.',
    clueFrom: 'juniper',
  },
  {
    id: 'sparkle-stew',
    name: 'Sparkle Stew',
    color: '#a8d8ff',
    effect: 'sparkle',
    seconds: 120,
    desc: 'Biscuit’s nose goes super-sniffy: hidden treasure spots sparkle as you walk by.',
    needs: ['fish', 'spicy', 'golden'],
    clue: 'Something with fins, something that tickles your tongue, and something golden.',
    clueFrom: 'finnegan',
  },
  {
    id: 'ticktock-tomato',
    name: 'Tick-Tock Tomato',
    color: '#ff7a6b',
    effect: 'ticktock',
    seconds: 90,
    desc: 'Time slows down around you — timing games get easier and the day passes slowly.',
    needs: ['juicy', 'root', 'leafy'],
    clue: 'Something juicy, round and red like a clock face, something from under the ground, and something leafy.',
    clueFrom: 'rocco',
  },
  {
    id: 'pirates-gumbo',
    name: 'Pirate’s Gumbo',
    color: '#d9784a',
    effect: 'calm',
    seconds: 240,
    desc: 'Calm seas! Currents and wind stop pushing your boat in sailing puzzles.',
    needs: ['spicy', 'sea', 'island'],
    clue: 'Something spicy, something from the sea, and something from a sunny tropical island.',
    clueFrom: 'finnegan',
    story: true,
  },
  {
    id: 'together-tea',
    name: 'Two-Spoon Tea',
    color: '#f4a3c8',
    effect: 'together',
    seconds: 180,
    desc: 'Best-buddy boost: walk side by side to zoom along together, trailing hearts.',
    needs: ['bees', 'meadow', 'sways'],
    clue: 'It takes two spoons! Something the bees made, something from the meadow, and something that sways under the waves.',
    clueFrom: 'grandma',
    twoPlayer: true,
  },
  // ---------------------------------------------------------------- silly soups
  { id: 'hiccup-soup', name: 'Hiccup Bubble Soup', color: '#c7f0ff', effect: 'hiccup', seconds: 10, desc: 'Hic! You hiccup bubbles for ten seconds.', silly: true },
  { id: 'squeaky-soup', name: 'Squeaky Squash Soup', color: '#fff38a', effect: 'squeaky', seconds: 30, desc: 'Everybody’s voice goes squeaky!', silly: true },
  { id: 'rainbow-soup', name: 'Rainbow Burp Broth', color: '#e8b5ff', effect: 'rainbow', seconds: 8, desc: 'One enormous... rainbow burp. Pardon!', silly: true },
  { id: 'wobble-soup', name: 'Wibble-Wobble Soup', color: '#9fe0c0', effect: 'wobble', seconds: 15, desc: 'Your legs go all wobbly like jelly.', silly: true },
];

export const SOUP_BY_ID: Record<string, SoupDef> = Object.fromEntries(SOUPS.map((s) => [s.id, s]));
export const MAGIC_SOUPS = SOUPS.filter((s) => !s.silly);
export const SILLY_SOUPS = SOUPS.filter((s) => s.silly);

export function tagsOf(id: string): string[] {
  return ITEM_BY_ID.get(id)?.tags ?? [];
}

/** Can the three ingredients be matched one-to-one with the three needed tags? */
export function fits(needs: readonly string[], ingredients: string[]): boolean {
  if (ingredients.length !== needs.length) return false;
  const tags = ingredients.map(tagsOf);
  const perms = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];
  return perms.some((p) => p.every((ing, i) => tags[ing].includes(needs[i])));
}

export function comboKey(ingredients: string[]): string {
  return ingredients.slice().sort().join('+');
}

export interface BrewResult {
  soup: SoupDef;
  /** it was the two-spoon recipe, but only one player stirred */
  neededTwo?: boolean;
}

/** What the cauldron makes from three ingredients. `together`: both players stirred. */
export function brew(ingredients: string[], together = false): BrewResult {
  for (const s of MAGIC_SOUPS) {
    if (!s.needs || !fits(s.needs, ingredients)) continue;
    if (s.twoPlayer && !together) return { soup: SOUP_BY_ID['wobble-soup'], neededTwo: true };
    return { soup: s };
  }
  // no recipe: a silly soup, always the same one for the same combination
  const key = comboKey(ingredients);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return { soup: SILLY_SOUPS[h % SILLY_SOUPS.length] };
}

/** Bottled soups are backpack items: `soup:<id>`. */
export const soupItemId = (id: string) => `soup:${id}`;
export const soupFromItem = (itemId: string) => (itemId.startsWith('soup:') ? SOUP_BY_ID[itemId.slice(5)] : undefined);

/** Each neighbour's favourite soup (gifting it gives a big friendship boost). */
export const FAVOURITE_SOUP: Record<string, string> = {
  quill: 'sparkle-stew',
  bramble: 'sunbeam-squash',
  finnegan: 'whisker-bisque',
  juniper: 'hopscotch-chowder',
  rocco: 'ticktock-tomato',
  clover: 'together-tea',
  grandma: 'glowbroth',
  rosita: 'hopscotch-chowder',
  rollo: 'pirates-gumbo',
};
