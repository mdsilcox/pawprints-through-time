import { registerPuzzle } from '../registry';

/**
 * 1950s America's brain-builder: the glittery storm blew every order ticket off Mabel's spike
 * just before the sock hop. Her notepad has a few notes — who ordered what? (A logic grid; every
 * level has exactly one answer, proven in the unit tests.)
 */
const REGULARS = ['Duke', 'Rollo', 'Rosita'];

export const MABEL_ORDERS = registerPuzzle({
  id: 'mabel-orders',
  kind: 'grid',
  title: 'Mabel’s Mixed-up Orders',
  place: 'The Rock-a-Roll Diner, Maple Street',
  era: 'fifties',
  intro: 'The storm blew every order ticket off Mabel’s spike! Her notepad has a few notes. Who ordered what?',
  howTo: 'Tap a square once for ✗ (“no”) and again for ✓ (“yes”). Use Mabel’s notes to match every order.',
  variants: {
    easy: {
      subjects: REGULARS,
      categories: [{ name: 'Ordered', values: ['Burger', 'Hot dog', 'Grilled cheese'] }],
      clues: ['Rosita ordered the hot dog — with extra mustard!', 'Rollo didn’t order the grilled cheese.'],
      facts: [
        { t: 'is', s: 2, c: 0, v: 1 },
        { t: 'not', s: 1, c: 0, v: 2 },
      ],
      answer: [[2, 0, 1]],
    },
    medium: {
      subjects: REGULARS,
      categories: [
        { name: 'Ordered', values: ['Burger', 'Hot dog', 'Grilled cheese'] },
        { name: 'Milkshake', values: ['Chocolate', 'Strawberry', 'Vanilla'] },
      ],
      clues: ['Duke ordered the burger.', 'Whoever ordered the hot dog wants a strawberry milkshake.', 'Rollo didn’t order the hot dog.', 'Rollo doesn’t like vanilla.'],
      facts: [
        { t: 'is', s: 0, c: 0, v: 0 },
        { t: 'same', c1: 0, v1: 1, c2: 1, v2: 1 },
        { t: 'not', s: 1, c: 0, v: 1 },
        { t: 'not', s: 1, c: 1, v: 2 },
      ],
      answer: [
        [0, 2, 1],
        [2, 0, 1],
      ],
    },
    hard: {
      subjects: [...REGULARS, 'The milkman'],
      categories: [
        { name: 'Ordered', values: ['Burger', 'Hot dog', 'Grilled cheese', 'Meatloaf'] },
        { name: 'Treat', values: ['Milkshake', 'Root beer float', 'Banana split', 'Apple pie'] },
      ],
      clues: [
        'The milkman ordered a hot dog.',
        'Rollo ordered a burger — the biggest one!',
        'Whoever ordered the meatloaf also wants a root beer float.',
        'Rosita wants apple pie for dessert.',
        'The milkman doesn’t want a banana split.',
      ],
      facts: [
        { t: 'is', s: 3, c: 0, v: 1 },
        { t: 'is', s: 1, c: 0, v: 0 },
        { t: 'same', c1: 0, v1: 3, c2: 1, v2: 1 },
        { t: 'is', s: 2, c: 1, v: 3 },
        { t: 'not', s: 3, c: 1, v: 2 },
      ],
      answer: [
        [3, 0, 2, 1],
        [1, 2, 3, 0],
      ],
    },
  },
  hints: {
    easy: ['Start with the note that tells you something for sure.', 'Rosita has the hot dog. Rollo didn’t order the grilled cheese — so what did he order?', 'Rollo ordered the burger, so Duke ordered the grilled cheese.'],
    medium: [
      'Note 1 tells you Duke’s order straight away.',
      'Rollo didn’t order the hot dog, and Duke has the burger — so Rollo has the grilled cheese. Who has the hot dog?',
      'Rosita: hot dog and strawberry. Rollo isn’t vanilla, so he’s chocolate — and Duke is vanilla.',
    ],
    hard: [
      'Two notes tell you orders for sure: the milkman’s and Rollo’s.',
      'Rosita wants apple pie, so she can’t be the meatloaf-eater (that one wants a root beer float). Who is?',
      'Duke: meatloaf and root beer float. Rosita: grilled cheese and apple pie. The milkman: milkshake. Rollo: banana split.',
    ],
  },
});
