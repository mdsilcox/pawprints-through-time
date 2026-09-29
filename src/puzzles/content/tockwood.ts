import { registerPuzzle } from '../registry';
import { TOCKWOOD_RIDDLES } from './riddles';

/**
 * Tockwood's brain-builders — one of each kind, each with an easy / medium / tricky variant.
 * Every grid has exactly one solution and every board is solvable within its move limit
 * (tests/unit/puzzles.test.ts proves it with the solvers).
 */

// ------------------------------------------------------------------ riddles: the Riddle Stone
export const RIDDLE_STONE = registerPuzzle({
  id: 'riddle-stone',
  kind: 'riddle',
  title: 'The Riddle Stone',
  place: 'Tockwood plaza',
  era: 'tockwood',
  intro: 'Words shimmer across the old stone. A new riddle appears every day!',
  howTo: 'Read the riddle and pick (or type) the answer.',
  pool: TOCKWOOD_RIDDLES,
  variants: { easy: { mode: 'choice3' }, medium: { mode: 'choice5' }, hard: { mode: 'typed' } },
  // riddle hints come from each riddle
  hints: {
    easy: ['', '', ''],
    medium: ['', '', ''],
    hard: ['', '', ''],
  },
});

// ------------------------------------------------------------------ logic grid: Grandma's scarves
const NEIGHBOURS3 = ['Rocco', 'Juniper', 'Finnegan'];
export const GRANDMA_SCARVES = registerPuzzle({
  id: 'grandma-scarves',
  kind: 'grid',
  title: 'Grandma’s Scarf Mix-up',
  place: 'The bunny warren',
  era: 'tockwood',
  intro: 'Grandma Hopkins knitted a scarf for each neighbour, but the name tags blew away!',
  howTo: 'Tap a square once for ✗ (“no”) and again for ✓ (“yes”). Use the clues to give everyone the right scarf.',
  variants: {
    easy: {
      subjects: NEIGHBOURS3,
      categories: [{ name: 'Colour', values: ['Red', 'Blue', 'Yellow'] }],
      clues: ['Juniper’s scarf is the colour of the sky.', 'Finnegan’s scarf is not red.'],
      facts: [
        { t: 'is', s: 1, c: 0, v: 1 },
        { t: 'not', s: 2, c: 0, v: 0 },
      ],
      answer: [[0, 1, 2]],
    },
    medium: {
      subjects: NEIGHBOURS3,
      categories: [
        { name: 'Colour', values: ['Red', 'Blue', 'Yellow'] },
        { name: 'Pattern', values: ['Stripes', 'Spots', 'Stars'] },
      ],
      clues: ['Juniper’s scarf is red.', 'The blue scarf has spots.', 'Rocco’s scarf doesn’t have stripes.', 'Finnegan’s scarf is not yellow.'],
      facts: [
        { t: 'is', s: 1, c: 0, v: 0 },
        { t: 'same', c1: 0, v1: 1, c2: 1, v2: 1 },
        { t: 'not', s: 0, c: 1, v: 0 },
        { t: 'not', s: 2, c: 0, v: 2 },
      ],
      answer: [
        [2, 0, 1],
        [2, 0, 1],
      ],
    },
    hard: {
      subjects: ['Rocco', 'Juniper', 'Finnegan', 'Bramble'],
      categories: [
        { name: 'Colour', values: ['Red', 'Blue', 'Yellow', 'Green'] },
        { name: 'Pattern', values: ['Stripes', 'Spots', 'Stars', 'Hearts'] },
      ],
      clues: [
        'Bramble’s scarf is the colour of the sky.',
        'The red scarf has stripes.',
        'Rocco’s scarf is not red, and not yellow either.',
        'The yellow scarf has hearts.',
        'Rocco’s scarf has no stars.',
        'Finnegan’s scarf isn’t yellow.',
      ],
      facts: [
        { t: 'is', s: 3, c: 0, v: 1 },
        { t: 'same', c1: 0, v1: 0, c2: 1, v2: 0 },
        { t: 'not', s: 0, c: 0, v: 0 },
        { t: 'not', s: 0, c: 0, v: 2 },
        { t: 'same', c1: 0, v1: 2, c2: 1, v2: 3 },
        { t: 'not', s: 0, c: 1, v: 2 },
        { t: 'not', s: 2, c: 0, v: 2 },
      ],
      answer: [
        [3, 2, 0, 1],
        [1, 3, 0, 2],
      ],
    },
  },
  hints: {
    easy: ['Start with the clue that tells you something for sure.', 'The sky is blue — so Juniper gets the blue scarf. Now look at Finnegan.', 'Finnegan can’t have red, and blue is taken... so Finnegan has yellow, and Rocco has red.'],
    medium: [
      'Clue 1 gives you Juniper’s colour straight away. Put a ✓ there.',
      'Finnegan isn’t yellow, and red is Juniper’s — so what colour is Finnegan’s? Then use the “blue has spots” clue.',
      'Finnegan: blue with spots. Rocco: yellow, and not stripes... so stars. Juniper gets stripes.',
    ],
    hard: [
      'Clue 1 tells you Bramble’s colour for sure. Then look at Rocco’s colour.',
      'Rocco isn’t red, yellow — or blue (that’s Bramble’s). So Rocco is green! Now Finnegan isn’t yellow...',
      'Finnegan is red (so stripes) and Juniper is yellow (so hearts). Rocco has no stars, so Rocco has spots — and Bramble has stars.',
    ],
  },
});

// ------------------------------------------------------------------ sliding blocks: Juniper's crates
export const JUNIPER_CRATES = registerPuzzle({
  id: 'juniper-crates',
  kind: 'slide',
  title: 'Crate Jam',
  place: 'Juniper’s garden stall',
  era: 'tockwood',
  intro: 'Juniper’s wheelbarrow is stuck behind a pile of vegetable crates!',
  howTo: 'Crates only slide the way they point. Clear a path and roll the wheelbarrow out of the gap on the right.',
  variants: {
    easy: { rows: ['...D.C', 'BB.D.C', 'KK.D..', '....FF', '..AGG.', '..AEEE'], best: 5 },
    medium: { rows: ['JJIIL.', '.AAAL.', 'KK..LG', '.B...G', 'CBEEFF', 'C.DDHH'], best: 10 },
    hard: { rows: ['...DDD', 'IIAJJ.', 'KKAH..', 'LLAH..', 'EEBBBF', '.GGCCF'], best: 12 },
  },
  hints: {
    easy: ['Which crates are right in front of the wheelbarrow?', 'A tall crate can only move up or down. Is there room above or below it?', 'Pip will show you a move that works!'],
    medium: ['Look at every crate between the wheelbarrow and the gap.', 'Sometimes you have to move a crate that’s NOT touching the wheelbarrow, to make room for one that is.', 'Pip will show you a move that works!'],
    hard: ['Work backwards: which crate is blocking the crate that’s blocking the wheelbarrow?', 'The long crates at the bottom decide where the tall crates can go.', 'Pip will show you a move that works!'],
  },
});

// ------------------------------------------------------------------ patterns: Dr. Quill's mosaic
export const QUILL_PATTERNS = registerPuzzle({
  id: 'quill-patterns',
  kind: 'sequence',
  title: 'The Mosaic Floor',
  place: 'The Museum of Time',
  era: 'tockwood',
  intro: 'Some of the museum’s old floor tiles are missing. What pattern did the tile-makers use?',
  howTo: 'Look at the row of tiles and pick the one that comes next. Solve three rows!',
  variants: {
    easy: {
      rounds: [
        { items: ['i:scallop', 'i:spiral', 'i:scallop', 'i:spiral', 'i:scallop'], answer: 'i:spiral', decoys: ['i:conch', 'i:scallop'], hints: ['Say the tiles out loud: fan, swirl, fan...', 'The two shells take turns.', 'After a fan shell comes... the swirly one!'] },
        { items: ['i:ammonite', 'i:ammonite', 'i:fern', 'i:ammonite', 'i:ammonite'], answer: 'i:fern', decoys: ['i:ammonite', 'i:tooth'], hints: ['Count the curly fossils before each leaf.', 'Two curly fossils, then a leaf. Two curly, then...?', 'The leaf comes next!'] },
        { items: ['i:carrot', 'i:radish', 'i:pumpkin', 'i:carrot', 'i:radish'], answer: 'i:pumpkin', decoys: ['i:carrot', 'i:radish'], hints: ['Three different veggies take turns.', 'Carrot, radish, pumpkin — then it starts again.', 'After the radish comes the pumpkin!'] },
      ],
    },
    medium: {
      rounds: [
        { items: ['i:conch', 'i:scallop', 'i:scallop', 'i:conch', 'i:scallop'], answer: 'i:scallop', decoys: ['i:conch', 'i:spiral'], hints: ['Find the bit that repeats.', 'One big shell, then two fan shells.', 'The second fan shell comes next!'] },
        { items: ['n:2', 'n:4', 'n:6', 'n:8'], answer: 'n:10', decoys: ['n:9', 'n:12'], hints: ['How much bigger is each number?', 'Each number is 2 more than the one before.', '8 + 2 = ?'] },
        { items: ['c:1', 'c:3', 'c:5', 'c:7'], answer: 'c:9', decoys: ['c:8', 'c:11'], hints: ['Look at the little hour hand on each clock.', 'The clocks jump forward 2 hours each time.', '7 o’clock + 2 hours = ?'] },
      ],
    },
    hard: {
      rounds: [
        { items: ['a:up', 'a:right', 'a:down', 'a:left', 'a:up'], answer: 'a:right', decoys: ['a:left', 'a:down'], hints: ['Which way is the arrow turning?', 'It turns like the hands of a clock.', 'Up, right, down, left, up... right!'] },
        { items: ['n:1', 'n:2', 'n:4', 'n:8'], answer: 'n:16', decoys: ['n:10', 'n:12'], hints: ['It isn’t adding the same number each time.', 'Each number is double the one before.', '8 + 8 = ?'] },
        {
          items: ['i:coin', 'i:coin', 'i:gear', 'i:coin', 'i:coin', 'i:coin', 'i:gear', 'i:coin', 'i:coin', 'i:coin'],
          answer: 'i:coin',
          decoys: ['i:gear', 'i:key'],
          hints: ['Count the coins between the gears.', 'Two coins, then three coins... the groups keep growing!', 'The last group needs four coins — so one more coin.'],
        },
      ],
    },
  },
  hints: {
    easy: ['Say the pattern out loud.', 'Find the part that repeats.', 'Pip can point at the answer.'],
    medium: ['Say the pattern out loud.', 'Find the part that repeats.', 'Pip can point at the answer.'],
    hard: ['Say the pattern out loud.', 'Find the part that repeats.', 'Pip can point at the answer.'],
  },
});

// ------------------------------------------------------------------ code-breaking: Rocco's gear lock
export const ROCCO_LOCK = registerPuzzle({
  id: 'rocco-lock',
  kind: 'code',
  title: 'The Gear Lock',
  place: 'Rocco’s clock stall',
  era: 'tockwood',
  intro: 'Rocco locked his best toolbox with a gear code... and then forgot it!',
  howTo: 'Guess the secret gears. ★ gold = right gear, right spot. ☆ silver = right gear, wrong spot.',
  variants: {
    easy: { slots: 3, symbols: 4, tries: 10 },
    medium: { slots: 4, symbols: 5, tries: 10 },
    hard: { slots: 4, symbols: 6, tries: 9 },
  },
  hints: {
    easy: ['Try a guess first — the stars tell you what you got right.', 'A gold star means one gear is already in the right spot. Keep that one and change another!', 'Pip will whisper one gear of the code.'],
    medium: ['Try a guess first — the stars tell you what you got right.', 'Silver stars mean a gear belongs somewhere else. Try moving it!', 'Pip will whisper one gear of the code.'],
    hard: ['Try a guess first — the stars tell you what you got right.', 'Change one gear at a time to find out which one earned the star.', 'Pip will whisper one gear of the code.'],
  },
});

// ------------------------------------------------------------------ turn-limited sailing: Finnegan's toy boat
export const FINNEGAN_BOAT = registerPuzzle({
  id: 'finnegan-boat',
  kind: 'sail',
  title: 'Toy Boat Regatta',
  place: 'The dock',
  era: 'tockwood',
  intro: 'Finnegan’s toy sailboat has to reach the buoy before the tide turns!',
  howTo: 'Pick a direction and the boat sails until something stops it. Swirly currents turn the boat. Reach the buoy within the moves.',
  variants: {
    easy: { chart: { rows: ['....#...', 'S#...#..', '.......#', '....###.', '#...#...', '#......G'] }, moves: 7 },
    medium: { chart: { rows: ['.....#..', '....#v..', 'S.<v..#.', '..##...<', '..#...G.', '.....#..'] }, moves: 8 },
    hard: { chart: { rows: ['..v^....', '..#.^...', 'v.S#....', '...#..#G', '.#..#...', '#......#'], wind: 'up' }, moves: 9 },
  },
  hints: {
    easy: ['The boat keeps going until it bumps into a rock or the edge.', 'Rocks are great for stopping exactly where you want!', 'Pip will show you a good next move.'],
    medium: ['Watch the currents — they turn your boat as it sails over them.', 'Sometimes the long way round is the only way.', 'Pip will show you a good next move.'],
    hard: ['The wind nudges the boat one more square after every move.', 'Use the wind: it can push you somewhere a rock can’t.', 'Pip will show you a good next move.'],
  },
});
