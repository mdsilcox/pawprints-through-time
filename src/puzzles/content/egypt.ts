import { registerPuzzle } from '../registry';
import type { Riddle } from '../logic/riddle';

/**
 * Ancient Egypt (Giza, ~2500 BCE): the Sphinx's riddle gauntlet (three in a row) and the stone
 * blocks jammed on the builders' ramp (sliding blocks, proven solvable by the solver).
 * All riddles are original.
 */
export const EGYPT_RIDDLES: Riddle[] = [
  {
    id: 'eg-pyramid',
    q: 'I have a square bottom and a pointy top, four sloping sides, and thousands of stone blocks inside me. What am I?',
    answers: ['pyramid', 'a pyramid'],
    decoys: ['Obelisk', 'Temple', 'Tent', 'Palace'],
    hints: ['The builders here are making one!', 'My sides are triangles that meet at the top.', 'P Y R _ _ _ D.'],
  },
  {
    id: 'eg-nile',
    q: 'I am long and wet and full of fish. Each summer I spill over and make the fields rich, and boats ride on my back all the way to the sea. What am I?',
    answers: ['nile', 'river', 'the nile', 'river nile', 'nile river'],
    decoys: ['Desert', 'Road', 'Well', 'Pond'],
    hints: ['Look toward the reeds!', 'Farmers are happy when I flood.', 'A river — the one right here in Egypt.'],
  },
  {
    id: 'eg-papyrus',
    q: 'I grow tall beside the river. Slice me thin, press me flat, and scribes can write on me. What am I?',
    answers: ['papyrus', 'reed', 'reeds', 'papyrus reed'],
    decoys: ['Palm leaf', 'Clay', 'Linen', 'Stone'],
    hints: ['Scribes need me.', 'The word “paper” comes from my name.', 'P A P _ _ _ S.'],
  },
  {
    id: 'eg-shadow',
    q: 'I follow you all day under the desert sun. I am long in the morning, long in the evening, and tiny at noon. What am I?',
    answers: ['shadow', 'your shadow', 'my shadow'],
    decoys: ['Camel', 'Footprint', 'Hat', 'Sand'],
    hints: ['Look down at your feet on a sunny day.', 'The sun makes me, and I copy everything you do.', 'SH _ D _ W.'],
  },
  {
    id: 'eg-sphinx',
    q: 'I have a lion’s body and a person’s face, and I have lain here so long that sand heaps up around my paws. What am I?',
    answers: ['sphinx', 'the sphinx', 'you', 'a sphinx'],
    decoys: ['Lion', 'Cat', 'Hippo', 'Pharaoh'],
    hints: ['You are looking right at me!', 'I ask riddles for fun.', 'S P H _ N X.'],
  },
  {
    id: 'eg-sand',
    q: 'There is more of me in the desert than stars in the sky. I get into your sandals and your sandwiches, and I am made of teeny tiny rocks. What am I?',
    answers: ['sand'],
    decoys: ['Water', 'Grass', 'Salt', 'Snow'],
    hints: ['Look all around you!', 'Beaches have me too.', 'S _ N D.'],
  },
  {
    id: 'eg-cat',
    q: 'Egyptians loved me so much they painted me on their walls. I purr, I chase mice, and I nap in patches of sunshine. What am I?',
    answers: ['cat', 'a cat'],
    decoys: ['Dog', 'Mouse', 'Hippo', 'Crocodile'],
    hints: ['Ankhi the scribe is one!', 'I say “meow”.', 'C _ T.'],
  },
  {
    id: 'eg-glyph',
    q: 'I am a little picture that stands for a sound or a word. Scribes carve long rows of me on temple walls. What am I?',
    answers: ['hieroglyph', 'hieroglyphs', 'hieroglyphic', 'hieroglyphics'],
    decoys: ['Letter', 'Painting', 'Map', 'Number'],
    hints: ['Look at the tomb walls!', 'Birds, eyes and wavy water lines are some of me.', 'HIERO... G L Y P H.'],
  },
];

export const SPHINX_RIDDLES = registerPuzzle({
  id: 'sphinx-riddles',
  kind: 'riddle',
  title: 'The Sphinx’s Riddles',
  place: 'The Great Sphinx, Giza',
  era: 'egypt',
  intro: 'The great stone Sphinx rumbles: “Answer my riddles — three in a row — and the way to the old tomb is yours.”',
  howTo: 'Read the Sphinx’s riddle and pick (or type) the answer. Three right answers opens the way.',
  pool: EGYPT_RIDDLES,
  variants: { easy: { mode: 'choice3' }, medium: { mode: 'choice5' }, hard: { mode: 'typed' } },
  hints: { easy: ['', '', ''], medium: ['', '', ''], hard: ['', '', ''] },
});

export const RAMP_STONES = registerPuzzle({
  id: 'ramp-stones',
  kind: 'slide',
  title: 'Stones on the Ramp',
  place: 'The pyramid ramp, Giza',
  era: 'egypt',
  intro: 'The stone blocks have slid every which way on the ramp! Clear a path so the capstone sled can reach the top.',
  howTo: 'Blocks only slide the way they’re lying (long side). Clear the way so the golden capstone sled can slide out on the right.',
  variants: {
    easy: { rows: ['.....G', '..DBEG', 'KKDBEA', '..FBEA', '..F...', '..CC..'], best: 6, keyName: 'the capstone sled', blockName: 'stone block' },
    medium: { rows: ['.FFF.A', '..EHHA', 'KKEGDA', 'CC.GD.', 'JIBBB.', 'JI....'], best: 11, keyName: 'the capstone sled', blockName: 'stone block' },
    hard: { rows: ['J.AAA.', 'JEEIII', 'KKDF..', 'MGDF..', 'MGHH.C', 'BBLL.C'], best: 13, keyName: 'the capstone sled', blockName: 'stone block' },
  },
  hints: {
    easy: ['Which blocks are right in front of the sled?', 'Standing-up blocks only slide up and down.', 'Pip will show you a move that works!'],
    medium: ['Sometimes a block far from the sled has to move first.', 'Clear the sled’s row one block at a time.', 'Pip will show you a move that works!'],
    hard: ['Work backwards from the sled’s way out.', 'The bottom rows decide where the standing blocks can go.', 'Pip will show you a move that works!'],
  },
});
