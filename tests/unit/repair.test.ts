import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { migrateSave, newGameSave } from '../../src/core/state';
import { repairStory } from '../../src/core/repair';
import { BISCUIT_ITEMS, CLOTHES } from '../../src/data/clothes';
import { HOPKINS } from '../../src/data/bunnies';

describe('save repair (on every load)', () => {
  it('a healthy save comes out exactly the same', () => {
    const d = migrateSave(newGameSave(1000));
    const before = JSON.stringify(d);
    repairStory(d);
    expect(JSON.stringify(d)).toBe(before);
  });

  it('a payoff that a mid-celebration break left without its prize gets it back — above all its Time Sand', () => {
    const raw = newGameSave(1000);
    raw.tockens = 10;
    Object.assign(raw.flags, { 'chest:treasure-chest': true, 'cup:won': true, 'crew:respect': true, 'sockhop:danced': true, 'pirate:party': true, hourglassRestored: true });
    const d = migrateSave(structuredClone(raw));
    expect(d.sands).toEqual(expect.arrayContaining(['pirate', 'fifties']));
    expect(d.inventory.spyglass).toBe(1);
    expect(d.inventory['starlight-cup']).toBe(1);
    expect(d.inventory.jukebox).toBe(1);
    expect(d.inventory['ship-wheel']).toBe(1);
    expect(d.notes).toEqual(expect.arrayContaining(['pirate-treasure', 'pirate-hornpipe']));
    expect(d.tockens).toBe(10 + 40 + 40 + 15);
    expect(d.flags['marigold:friend']).toBe(true);
    expect(d.flags['finale:party']).toBe(true);
    // ...and only once: loading it again changes nothing
    expect(migrateSave(structuredClone(d))).toEqual(d);
  });

  it('three cousins home from an era means that era’s cousins’ sand', () => {
    const raw = newGameSave(1000);
    raw.bunnies = HOPKINS.filter((b) => b.era === 'egypt').map((b) => b.id);
    const d = migrateSave(raw);
    expect(d.sands).toContain('egypt-cousins');
    expect(d.sands).not.toContain('pirate-cousins');
  });

  it('finished chapters get the era clothes they hand out now (the 1950s used to give only shoes)', () => {
    const raw = newGameSave(1000);
    Object.assign(raw.flags, { 'cup:won': true, 'sockhop:danced': true, 'mabel:milk': true });
    raw.sands.push('fifties');
    raw.wardrobe.push('saddle-shoes');
    const d = migrateSave(raw);
    expect(d.wardrobe).toEqual(expect.arrayContaining(['bowling-shirt', 'letter-jacket', 'poodle-skirt', 'cateye-glasses', 'pearls', 'sock-hop-cap', 'cuffed-jeans']));
  });
});

describe('era clothes', () => {
  it('every era outfit piece (for the players and for Biscuit) can really be earned somewhere in the story', () => {
    const root = join(__dirname, '../../src');
    const story = readdirSync(join(root, 'story'))
      .filter((f) => f.endsWith('.ts'))
      .map((f) => readFileSync(join(root, 'story', f), 'utf8'));
    const src = [...story, readFileSync(join(root, 'data/scraps.ts'), 'utf8')].join('\n');
    const era = [...CLOTHES, ...BISCUIT_ITEMS].filter((c) => c.source === 'era').map((c) => c.id);
    expect(era.length).toBeGreaterThan(30);
    expect(era.filter((id) => !src.includes(`'${id}'`))).toEqual([]);
  });
});
