import { registerPuzzle } from '../registry';
import type { Riddle } from '../logic/riddle';

/**
 * The Golden Age of Piracy's brain-builders: Captain Marigold's torn map, the Swirling Shoals
 * sailing chart (impassable without Pirate's Gumbo), the stone door's riddles, the treasure
 * chest's lock and Bosun's barrel jam. Solvability is proven in tests/unit/puzzles.test.ts.
 */

export const MARIGOLD_MAP = registerPuzzle({
  id: 'marigold-map',
  kind: 'jigsaw',
  title: 'The Torn Treasure Map',
  place: 'The Sunny Marigold',
  era: 'pirates',
  intro: 'Four soggy pieces of Captain Marigold’s treasure map... can you fit them back together?',
  howTo: 'Swap pieces into place and turn them the right way up until the map makes sense.',
  variants: {
    easy: { cols: 2, rows: 2, turn: false },
    medium: { cols: 3, rows: 2, turn: true },
    hard: { cols: 3, rows: 3, turn: true },
  },
  hints: {
    easy: ['Look for the corners first — the compass rose and the X are on opposite sides.', 'Sandy Cove is in the top-left; Treasure Island is in the bottom-right.', 'Pip will make the next piece glow!'],
    medium: ['Find the four corners first: Sandy Cove, the rocky islet, the compass rose and Treasure Island.', 'The red dotted line should join up from piece to piece. Turn pieces until the words read the right way.', 'Pip will make the next piece glow!'],
    hard: ['Corners first, then edges, then the middle.', 'Writing and the “N” on the compass must be the right way up — that tells you how to turn a piece.', 'Pip will make the next piece glow!'],
  },
});

export const MARIGOLD_CHART = registerPuzzle({
  id: 'marigold-chart',
  kind: 'sail',
  title: 'Through the Swirling Shoals',
  place: 'The Sunny Marigold',
  era: 'pirates',
  intro: 'The Swirling Shoals: rocks, currents, a stiff wind — and whirlpools that spin ships right back. Steer the Sunny Marigold to Treasure Island!',
  howTo: 'Pick a direction and the ship sails until something stops it. Currents turn the ship, the wind nudges it one more square after each move, and whirlpools spin it back — unless the sea is calm.',
  variants: {
    easy: { chart: { rows: ['S...#.#..', '#...^.#..', '^....<..>', '.@...#.v.', '##@..#.#.', '#.@.>@..G'], wind: 'up' }, moves: 7, needsCalm: true },
    medium: { chart: { rows: ['......@..', '.......@#', '......#..', '..>#@..##', '@...#..@G', 'S..#...^.'], wind: 'up' }, moves: 8, needsCalm: true },
    hard: { chart: { rows: ['S...#.##G', '.^..#>...', '@#...##.@', '....##.#.', '.^..##...', '..>...@..'], wind: 'up' }, moves: 9, needsCalm: true },
  },
  hints: {
    easy: ['The wind pushes the ship up one square after every move — use it!', 'With calm seas you can sail straight over a whirlpool.', 'Pip will show you a good next move.'],
    medium: ['Currents turn the ship as it sails over them. Where will this one send you?', 'Plan two moves ahead: where will you stop after this one?', 'Pip will show you a good next move.'],
    hard: ['Count the moves: you have just a few spare.', 'A current can carry you round a corner a rock can’t.', 'Pip will show you a good next move.'],
  },
});

const PIRATE_RIDDLES: Riddle[] = [
  {
    id: 'pr-mast',
    q: 'I’m the tallest thing on a ship. I wear the sails like a coat, and I hold up the crow’s nest. What am I?',
    answers: ['mast', 'ship mast'],
    decoys: ['Anchor', 'Plank', 'Rope', 'Flag'],
    hints: ['Look up from the deck!', 'The sails hang from me.', 'M _ S T.'],
  },
  {
    id: 'pr-spyglass',
    q: 'Pull me out long and look through my eye, and ships far away seem to sail right by. What am I?',
    answers: ['spyglass', 'telescope'],
    decoys: ['Compass', 'Lantern', 'Map', 'Bottle'],
    hints: ['Lookouts use me in the crow’s nest.', 'I make faraway things look close.', 'SPY + something you drink from.'],
  },
  {
    id: 'pr-hammock',
    q: 'I’m a sailor’s bed, tied up at both ends. I swing when the waves rock the ship to sleep. What am I?',
    answers: ['hammock'],
    decoys: ['Pillow', 'Barrel', 'Blanket', 'Sail'],
    hints: ['Sailors sleep in me below deck.', 'I’m made of cloth or rope and I sway.', 'H _ M M _ C K.'],
  },
  {
    id: 'pr-eight',
    q: 'I’m a silver coin from Spain. Pirates called me a “piece of ___”, because I was worth that many small coins. Which number am I?',
    answers: ['eight', '8', 'pieces of eight', 'piece of eight'],
    decoys: ['Three', 'Five', 'Ten', 'Twelve'],
    hints: ['It’s a number between seven and nine.', 'Pieces of ... !', 'Count the legs on an octopus.'],
  },
  {
    id: 'pr-deck',
    q: 'I’m the floor of a ship. Sailors scrub me every morning — and if you’re aboard, you’re standing on me right now! What am I?',
    answers: ['deck', 'ship deck'],
    decoys: ['Cabin', 'Hull', 'Mast', 'Galley'],
    hints: ['Look down!', '“All hands on ...!”', 'D _ C K.'],
  },
];

export const ISLE_DOOR = registerPuzzle({
  id: 'isle-door',
  kind: 'riddle',
  title: 'The Stone Door',
  place: 'Treasure Island',
  era: 'pirates',
  intro: 'Carved words glow on the stone door: “Only a clever crew may pass. Answer me true!”',
  howTo: 'Read the pirate riddle and pick (or type) the answer.',
  pool: PIRATE_RIDDLES,
  variants: { easy: { mode: 'choice3' }, medium: { mode: 'choice5' }, hard: { mode: 'typed' } },
  hints: { easy: ['', '', ''], medium: ['', '', ''], hard: ['', '', ''] },
});

export const MARIGOLD_CHEST = registerPuzzle({
  id: 'marigold-chest',
  kind: 'code',
  title: 'The Treasure Chest Lock',
  place: 'The Treasure Cave',
  era: 'pirates',
  intro: 'The treasure chest has a gear lock — the same kind Rocco uses! Can you crack it?',
  howTo: 'Guess the secret gears. ★ gold = right gear, right spot. ☆ silver = right gear, wrong spot.',
  variants: {
    easy: { slots: 3, symbols: 4, tries: 10 },
    medium: { slots: 4, symbols: 5, tries: 10 },
    hard: { slots: 4, symbols: 6, tries: 9 },
  },
  hints: {
    easy: ['Try a guess — the stars tell you what you got right.', 'Keep the gears that earned gold stars, and move the silver ones.', 'Pip will whisper one gear of the code.'],
    medium: ['Try a guess — the stars tell you what you got right.', 'Change one gear at a time to see which one earned a star.', 'Pip will whisper one gear of the code.'],
    hard: ['Try a guess — the stars tell you what you got right.', 'A guess with no stars at all tells you which gears to leave out.', 'Pip will whisper one gear of the code.'],
  },
});

export const BOSUN_BARRELS = registerPuzzle({
  id: 'bosun-barrels',
  kind: 'slide',
  title: 'Barrel Jam',
  place: 'Sandy Cove pier',
  era: 'pirates',
  intro: 'A little bunny voice squeaks from behind the barrels: “I’m stuck! Can you roll these out of the way?”',
  howTo: 'Barrels only roll the way they point. Clear a path so Bosun’s little cart can roll out on the right.',
  variants: {
    easy: { rows: ['.GDD..', '.G.EB.', 'KK.EB.', '...FF.', '..AA..', '....CC'], best: 5, keyName: 'Bosun’s cart', blockName: 'barrel' },
    medium: { rows: ['C...I.', 'C.F.IE', 'KKFDGE', '.BADG.', '.BAHH.', '......'], best: 11, keyName: 'Bosun’s cart', blockName: 'barrel' },
    hard: { rows: ['DLGGG.', 'DL.JIE', 'KK.JIE', '...BB.', 'HAAAFF', 'H.CC..'], best: 11, keyName: 'Bosun’s cart', blockName: 'barrel' },
  },
  hints: {
    easy: ['Which barrels are right in front of the cart?', 'Upright barrels only roll up and down.', 'Pip will show you a move that works!'],
    medium: ['Sometimes a barrel far away has to move first.', 'Try clearing the row with the cart one barrel at a time.', 'Pip will show you a move that works!'],
    hard: ['Work backwards from the cart’s way out.', 'The bottom rows decide where the upright barrels can go.', 'Pip will show you a move that works!'],
  },
});

export { PIRATE_RIDDLES };
