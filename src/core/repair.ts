import type { SaveData } from './state';
import { HOPKINS } from '../data/bunnies';
import { NOTE_BY_ID } from '../data/notes';

/**
 * Save repair, run on every load. Earlier versions could save a story payoff's "done" flag
 * without its prize (a break or "Save & quit" in the middle of the celebration), and some
 * chapters used to hand out fewer keepsakes. This puts back what the story says the players have
 * earned — above all the Time Sands, without which the adventure can never end — and the era
 * clothes that finished chapters give now. Pure and idempotent: a healthy save comes out the same.
 */
export function repairStory(d: SaveData): void {
  const f = d.flags;
  const sand = (s: string) => {
    if (!d.sands.includes(s)) d.sands.push(s);
  };
  const add = (id: string, n = 1) => {
    d.inventory[id] = (d.inventory[id] ?? 0) + n;
  };
  const note = (id: string) => {
    if (!d.notes.includes(id)) d.notes.push(id);
  };

  // The payoffs whose prize used to come after the celebration. A missing Time Sand means none of
  // that payoff's rewards arrived (they were all handed out together, at the very end).
  if (f['chest:treasure-chest'] && !d.sands.includes('pirate')) {
    sand('pirate');
    add('doubloon', 5);
    add('spyglass');
    d.tockens += 40;
    note('pirate-treasure');
  }
  if (f['cup:won'] && !d.sands.includes('fifties')) {
    sand('fifties');
    add('starlight-cup');
    add('bowling-pin');
    d.tockens += 40;
  }
  if (f['capstone:placed'] && !d.sands.includes('egypt')) {
    sand('egypt');
    d.tockens += 40;
  }
  if (f['lion:awake'] && !d.sands.includes('florence')) {
    sand('florence');
    d.tockens += 40;
  }
  // (the hornpipe's History Note only ever came from winning the dance-off)
  if (f['crew:respect'] && !d.notes.includes('pirate-hornpipe')) {
    note('pirate-hornpipe');
    d.tockens += 15;
  }
  if (f['sockhop:danced'] && !f['rosita:invited']) {
    f['rosita:invited'] = true;
    add('jukebox');
  }
  if (f['pirate:party'] && !f['marigold:friend']) {
    f['marigold:friend'] = true;
    add('ship-wheel');
  }
  if (f['mabel:milk']) f['dot:told'] = true;
  // treasures for the museum that newer versions hand out along the way
  const owned = (id: string) => (d.inventory[id] ?? 0) > 0 || d.museum.includes(id);
  if (f['pirate:party'] && !owned('half-hour-glass')) add('half-hour-glass');
  if (f['mabel:milk'] && !owned('soda-glass')) add('soda-glass');
  if (f['lion:awake'] && !owned('flying-model')) add('flying-model');
  // History Notes that were merged or replaced in newer versions
  d.notes = d.notes.filter((id) => NOTE_BY_ID.has(id));
  if (f['met:beppe']) note('florence-food');
  // the Great Hourglass whole always means the party is on
  if (f.hourglassRestored) f['finale:party'] = true;

  // three cousins home from an era means that era's cousins' sand
  for (const era of ['pirate', 'fifties', 'egypt', 'florence'] as const) {
    const cousins = HOPKINS.filter((b) => b.era === era);
    if (cousins.length && cousins.every((b) => d.bunnies.includes(b.id))) sand(`${era}-cousins`);
  }

  // every era outfit piece a finished moment hands out
  for (const [done, ids] of ERA_GIFTS) {
    if (!done(d)) continue;
    for (const id of ids) if (!d.wardrobe.includes(id)) d.wardrobe.push(id);
  }
}

/** Which moments give which era clothes (kept in step with the chapter scripts). */
export const ERA_GIFTS: [(d: SaveData) => boolean, string[]][] = [
  [(d) => !!d.flags['map:whole'], ['tricorn', 'pantaloons']],
  [(d) => !!d.flags['map:pepper'], ['parrot']],
  [(d) => !!d.flags['pirate:party'], ['captain-coat']],
  [(d) => d.bunnies.includes('skipper'), ['pirate-hat']],
  [(d) => d.wardrobe.includes('saddle-shoes'), ['cuffed-jeans']],
  [(d) => !!d.flags['mabel:milk'], ['sock-hop-cap']],
  [(d) => d.bunnies.includes('dot'), ['headscarf']],
  [(d) => !!d.flags['cup:won'], ['bowling-shirt', 'letter-jacket']],
  [(d) => !!d.flags['sockhop:danced'], ['poodle-skirt', 'cateye-glasses', 'pearls']],
  [(d) => !!d.flags['sphinx:passed'], ['nemes', 'gold-collar']],
  [(d) => !!d.flags['festival:danced'], ['linen-tunic', 'shendyt', 'reed-sandals', 'broad-collar']],
  [(d) => !!d.flags['fresco:mended'], ['painter-smock', 'lace-collar']],
  [(d) => !!d.flags['lion:awake'], ['gold-chain']],
  [(d) => !!d.flags['court:danced'], ['doublet', 'breeches', 'florentine-cap', 'velvet-slippers']],
  [(d) => !!d.flags['finale:danced'], ['party-hat', 'party-bow']],
];
