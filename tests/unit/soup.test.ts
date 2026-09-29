import { describe, it, expect } from 'vitest';
import { ITEMS } from '../../src/data/items';
import { GARDEN_CROPS } from '../../src/soup/garden';
import { brew, comboKey, fits, FAVOURITE_SOUP, MAGIC_SOUPS, SILLY_SOUPS, SOUPS, SOUP_BY_ID } from '../../src/soup/recipes';

const INGREDIENTS = ITEMS.filter((i) => i.kind === 'ingredient').map((i) => i.id);

function* combos(): Generator<string[]> {
  for (let a = 0; a < INGREDIENTS.length; a++)
    for (let b = a; b < INGREDIENTS.length; b++) for (let c = b; c < INGREDIENTS.length; c++) yield [INGREDIENTS[a], INGREDIENTS[b], INGREDIENTS[c]];
}

describe('magic soup recipes', () => {
  it('has 8+ soups including the spec’s five, silly soups and a two-player recipe', () => {
    expect(SOUPS.length).toBeGreaterThanOrEqual(8);
    for (const id of ['glowbroth', 'hopscotch-chowder', 'whisker-bisque', 'ticktock-tomato', 'pirates-gumbo']) expect(SOUP_BY_ID[id]).toBeTruthy();
    expect(SILLY_SOUPS.length).toBeGreaterThanOrEqual(3);
    expect(MAGIC_SOUPS.filter((s) => s.twoPlayer)).toHaveLength(1);
    for (const s of MAGIC_SOUPS) {
      expect(s.needs, s.id).toHaveLength(3);
      expect(s.clue, s.id).toBeTruthy();
      expect(s.seconds).toBeGreaterThan(0);
    }
  });

  it('no combination of three ingredients fits two magic recipes (the riddle clues are never ambiguous)', () => {
    let n = 0;
    for (const combo of combos()) {
      const matches = MAGIC_SOUPS.filter((s) => fits(s.needs!, combo));
      expect(matches.length, comboKey(combo)).toBeLessThanOrEqual(1);
      n++;
    }
    expect(n).toBeGreaterThan(1000);
  });

  it('every magic soup can be made, most from Tockwood ingredients alone', () => {
    // at home: Tockwood's own ingredients plus everything the cottage garden grows
    const tockwood = [...ITEMS.filter((i) => i.kind === 'ingredient' && i.origin === 'tockwood').map((i) => i.id), ...GARDEN_CROPS.map((c) => c.crop)];
    const makeable = new Set<string>();
    const local = new Set<string>();
    for (const combo of combos()) {
      const r = brew(combo, true);
      if (r.soup.silly) continue;
      makeable.add(r.soup.id);
      if (combo.every((c) => tockwood.includes(c))) local.add(r.soup.id);
    }
    for (const s of MAGIC_SOUPS) expect(makeable.has(s.id), s.id).toBe(true);
    // everything except the island gumbo can be brewed at home (tomatoes grow in the garden)
    expect([...local].sort()).toEqual(MAGIC_SOUPS.filter((s) => s.id !== 'pirates-gumbo').map((s) => s.id).sort());
  });

  it('brews the right soup regardless of ingredient order', () => {
    expect(brew(['glowcap', 'kelp', 'carrot']).soup.id).toBe('glowbroth');
    expect(brew(['carrot', 'glowcap', 'sardine']).soup.id).toBe('glowbroth');
    expect(brew(['honey', 'clover-leaf', 'carrot']).soup.id).toBe('hopscotch-chowder');
    expect(brew(['sardine', 'clover-leaf', 'honey']).soup.id).toBe('whisker-bisque');
    expect(brew(['pumpkin', 'carrot', 'honey']).soup.id).toBe('sunbeam-squash');
    expect(brew(['sardine', 'radish', 'honey']).soup.id).toBe('sparkle-stew');
    expect(brew(['tomato', 'carrot', 'clover-leaf']).soup.id).toBe('ticktock-tomato');
    expect(brew(['island-pepper', 'kelp', 'coconut']).soup.id).toBe('pirates-gumbo');
  });

  it('the two-spoon recipe needs both players; alone it wobbles', () => {
    const r1 = brew(['honey', 'clover-leaf', 'kelp'], false);
    expect(r1.neededTwo).toBe(true);
    expect(r1.soup.silly).toBe(true);
    expect(brew(['honey', 'clover-leaf', 'kelp'], true).soup.id).toBe('together-tea');
  });

  it('wrong combinations make a silly soup — always the same one for the same pot', () => {
    const a = brew(['onion', 'milk', 'dates']);
    expect(a.soup.silly).toBe(true);
    expect(brew(['dates', 'onion', 'milk']).soup.id).toBe(a.soup.id);
    const seen = new Set<string>();
    for (const combo of combos()) {
      const r = brew(combo);
      if (r.soup.silly) seen.add(r.soup.id);
    }
    expect(seen.size).toBe(SILLY_SOUPS.length);
  });

  it('every neighbour has a favourite soup that exists', () => {
    for (const [npc, soup] of Object.entries(FAVOURITE_SOUP)) expect(SOUP_BY_ID[soup], npc).toBeTruthy();
  });
});
