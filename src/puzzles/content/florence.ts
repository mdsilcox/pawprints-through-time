import { registerPuzzle } from '../registry';

/**
 * Renaissance Florence (~1500): Fiorella's smudged fresco border (patterns in paint), Maestra
 * Lucia's gear lock on the mechanical lion (code-breaking) and the lion's jumbled parts (a logic
 * grid). Every paint colour also has its own motif, so colour is never the only clue.
 */
export const FIORELLA_FRESCO = registerPuzzle({
  id: 'fiorella-fresco',
  kind: 'sequence',
  title: 'The Fresco Border',
  place: 'Fiorella’s studio, Florence',
  era: 'florence',
  intro: 'The storm smudged the painted border of Fiorella’s fresco! Which painted tile comes next?',
  howTo: 'Look at the row of painted tiles and pick the one that comes next. Mend three rows of the border!',
  variants: {
    easy: {
      rounds: [
        { items: ['p:red', 'p:blue', 'p:red', 'p:blue', 'p:red'], answer: 'p:blue', decoys: ['p:red', 'p:gold'], hints: ['Say the tiles out loud: heart, dot, heart...', 'The red heart and the blue dot take turns.', 'After a red heart comes... the blue dot!'] },
        { items: ['p:gold', 'p:gold', 'p:green', 'p:gold', 'p:gold'], answer: 'p:green', decoys: ['p:gold', 'p:blue'], hints: ['Count the gold stars before each leaf.', 'Two gold stars, then a green leaf. Two gold stars, then...?', 'The green leaf comes next!'] },
        { items: ['p:red', 'p:gold', 'p:blue', 'p:red', 'p:gold'], answer: 'p:blue', decoys: ['p:red', 'p:green'], hints: ['Three paints take turns.', 'Red, gold, blue — then it starts again.', 'After the gold star comes the blue dot!'] },
      ],
    },
    medium: {
      rounds: [
        { items: ['p:blue', 'p:green', 'p:green', 'p:blue', 'p:green'], answer: 'p:green', decoys: ['p:blue', 'p:purple'], hints: ['Find the bit that repeats.', 'One blue dot, then two green leaves.', 'The second green leaf comes next!'] },
        { items: ['p:red', 'p:gold', 'p:blue', 'p:gold', 'p:red', 'p:gold'], answer: 'p:blue', decoys: ['p:gold', 'p:red'], hints: ['Every other tile is the same.', 'Gold stars sit between the others: red, then blue, then red...', 'After red and gold comes... blue!'] },
        { items: ['n:3', 'n:6', 'n:9', 'n:12'], answer: 'n:15', decoys: ['n:14', 'n:18'], hints: ['These are brushstrokes. How many more each time?', 'Each number is 3 more than the one before.', '12 + 3 = ?'] },
      ],
    },
    hard: {
      rounds: [
        {
          items: ['p:purple', 'p:red', 'p:purple', 'p:gold', 'p:purple', 'p:blue', 'p:purple', 'p:red', 'p:purple'],
          answer: 'p:gold',
          decoys: ['p:red', 'p:blue'],
          hints: ['Purple comes back every other tile.', 'Between the purples: red, gold, blue — and around again.', 'Red came last between purples, so next is... gold!'],
        },
        { items: ['n:2', 'n:6', 'n:18'], answer: 'n:54', decoys: ['n:24', 'n:36'], hints: ['It isn’t adding the same number each time.', 'Each number is three times the one before.', '18 × 3 = ?'] },
        {
          items: ['p:green', 'p:green', 'p:red', 'p:red', 'p:gold', 'p:green', 'p:green', 'p:red', 'p:red'],
          answer: 'p:gold',
          decoys: ['p:green', 'p:red'],
          hints: ['Find where the pattern starts again.', 'Two green, two red, one gold — then again.', 'Two reds have just gone by... so gold!'],
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

export const LUCIA_LOCK = registerPuzzle({
  id: 'lucia-lock',
  kind: 'code',
  title: 'The Lion’s Gear Lock',
  place: 'Maestra Lucia’s workshop, Florence',
  era: 'florence',
  intro: 'The mechanical lion’s panel is locked with a gear code — and the storm spun the gears!',
  howTo: 'Guess the secret gears. ★ gold = right gear, right spot. ☆ silver = right gear, wrong spot.',
  variants: {
    easy: { slots: 3, symbols: 4, tries: 10 },
    medium: { slots: 4, symbols: 5, tries: 10 },
    hard: { slots: 4, symbols: 6, tries: 9 },
  },
  hints: {
    easy: ['Try a guess first — the stars tell you what you got right.', 'A gold star means one gear is already in the right spot. Keep it and change another!', 'Pip will whisper one gear of the code.'],
    medium: ['Try a guess first — the stars tell you what you got right.', 'Silver stars mean a gear belongs somewhere else. Try moving it!', 'Pip will whisper one gear of the code.'],
    hard: ['Try a guess first — the stars tell you what you got right.', 'Change one gear at a time to find out which one earned the star.', 'Pip will whisper one gear of the code.'],
  },
});

const PARTS3 = ['Wind-up key', 'Big gear', 'Spring'];

export const LUCIA_LION = registerPuzzle({
  id: 'lucia-lion',
  kind: 'grid',
  title: 'The Mechanical Lion',
  place: 'Maestra Lucia’s workshop, Florence',
  era: 'florence',
  intro: 'The storm shook the lion’s insides loose! Maestra Lucia’s notes say where every part belongs... in riddles, of course.',
  howTo: 'Tap a square once for ✗ (“no”) and again for ✓ (“yes”). Use Lucia’s notes to put every part back.',
  variants: {
    easy: {
      subjects: PARTS3,
      categories: [{ name: 'Goes in', values: ['Head', 'Belly', 'Tail'] }],
      clues: ['The spring goes in the lion’s tail, to make it swish.', 'The big gear doesn’t go in the head.'],
      facts: [
        { t: 'is', s: 2, c: 0, v: 2 },
        { t: 'not', s: 1, c: 0, v: 0 },
      ],
      answer: [[0, 1, 2]],
    },
    medium: {
      subjects: PARTS3,
      categories: [
        { name: 'Goes in', values: ['Head', 'Belly', 'Tail'] },
        { name: 'Made of', values: ['Brass', 'Copper', 'Iron'] },
      ],
      clues: ['The wind-up key goes in the lion’s belly.', 'The iron part goes in the head.', 'The spring is made of brass.'],
      facts: [
        { t: 'is', s: 0, c: 0, v: 1 },
        { t: 'same', c1: 0, v1: 0, c2: 1, v2: 2 },
        { t: 'is', s: 2, c: 1, v: 0 },
      ],
      answer: [
        [1, 0, 2],
        [1, 2, 0],
      ],
    },
    hard: {
      subjects: ['Wind-up key', 'Big gear', 'Spring', 'Bellows'],
      categories: [
        { name: 'Goes in', values: ['Head', 'Chest', 'Legs', 'Tail'] },
        { name: 'Made of', values: ['Brass', 'Copper', 'Iron', 'Wood'] },
      ],
      clues: [
        'The bellows goes in the head — that’s how the lion ROARS.',
        'The iron part goes in the legs.',
        'The wind-up key is made of brass.',
        'The copper part goes in the tail.',
        'The big gear is made of iron.',
      ],
      facts: [
        { t: 'is', s: 3, c: 0, v: 0 },
        { t: 'same', c1: 0, v1: 2, c2: 1, v2: 2 },
        { t: 'is', s: 0, c: 1, v: 0 },
        { t: 'same', c1: 0, v1: 3, c2: 1, v2: 1 },
        { t: 'is', s: 1, c: 1, v: 2 },
      ],
      answer: [
        [1, 2, 3, 0],
        [0, 2, 1, 3],
      ],
    },
  },
  hints: {
    easy: ['Start with the note that tells you something for sure.', 'The spring is in the tail. Now: the big gear isn’t in the head — so where can it go?', 'The big gear goes in the belly, so the wind-up key goes in the head.'],
    medium: [
      'Note 1 gives you the key’s place straight away.',
      'Which part could be iron AND in the head? Not the key (it’s in the belly), not the spring (it’s brass)...',
      'The big gear is iron and goes in the head; the spring goes in the tail; the key is copper.',
    ],
    hard: [
      'Two notes tell you something for sure: the bellows’ place and the key’s metal.',
      'The big gear is iron, and iron goes in the legs. What’s left for the key?',
      'Key: chest, brass. Gear: legs, iron. Spring: tail, copper. Bellows: head, wood.',
    ],
  },
});
