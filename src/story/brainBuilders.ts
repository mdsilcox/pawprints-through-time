import { app } from '../app';
import { audio } from '../audio/audio';
import { ask, talk } from '../ui/dialogue';
import { toast } from '../ui/ui';
import { openPuzzle, type OpenOpts } from '../puzzles/ui/screen';
import { TOCKWOOD_RIDDLES } from '../puzzles/content/riddles';
import type { Riddle } from '../puzzles/logic/riddle';
import type { PuzzleResult } from '../puzzles/types';
import { befriend, flag, give, giveTockens, onUse, setFlag } from './hooks';
import { registerQuest } from './quests';
import { learnClue } from '../soup/kitchen';

/**
 * Tockwood's brain-builders: each neighbour has a puzzle (the Riddle Stone has a new riddle
 * every day). First solves give story rewards — Tockens, seeds and soup-recipe clues.
 */
export function puzzleSolved(id: string): boolean {
  return !!app.data?.puzzles[id]?.solved;
}

/** Offer a neighbour's puzzle: ask, play, reward the first solve, offer replays afterwards. */
export async function offerPuzzle(o: {
  id: string;
  who: string;
  pitch: string;
  yes?: string;
  replayPitch?: string;
  onFirstSolve: (r: PuzzleResult) => Promise<void> | void;
  opts?: OpenOpts;
}): Promise<void> {
  const solved = puzzleSolved(o.id);
  const pick = await ask(o.who, solved ? (o.replayPitch ?? 'Fancy another go at my puzzle? It’s a bit different every time you choose a new difficulty!') : o.pitch, [solved ? 'Yes, again!' : (o.yes ?? 'Let’s try!'), 'Maybe later']);
  if (pick !== 0) return;
  const r = await openPuzzle(o.id, { ...(o.opts ?? {}), replay: solved });
  if (r.firstSolve) {
    await o.onFirstSolve(r);
    app.autosave.request();
  } else if (!r.solved && !solved) {
    await talk(o.who, 'No rush at all! Come back whenever you like — puzzles keep.');
  }
}

// ------------------------------------------------------------------ the Riddle Stone: one riddle a day
export function riddleOfTheDay(day = app.data?.day ?? 1): Riddle {
  const pool = TOCKWOOD_RIDDLES;
  const start = (day * 7) % pool.length;
  // prefer riddles you haven't solved yet, starting from today's spot in the list
  for (let i = 0; i < pool.length; i++) {
    const r = pool[(start + i) % pool.length];
    if (!flag(`riddle:${r.id}`)) return r;
  }
  return pool[start];
}

function todaysRiddle(): Riddle {
  const d = app.data!;
  const key = `riddle:day:${d.day}`;
  const stored = d.flags[key];
  const found = typeof stored === 'string' ? TOCKWOOD_RIDDLES.find((r) => r.id === stored) : undefined;
  if (found) return found;
  const r = riddleOfTheDay(d.day);
  d.flags[key] = r.id;
  return r;
}

onUse('riddle-stone', async () => {
  if (!flag('riddle:intro')) {
    await talk('narrator', ['An old standing stone, humming softly. Words shimmer across its face...', '“Answer me true, and a Tocken for you! A new riddle blooms with every sunrise.”']);
    setFlag('riddle:intro');
  }
  const r = todaysRiddle();
  if (flag(`riddle:${r.id}`)) {
    const solvedOnes = TOCKWOOD_RIDDLES.filter((x) => flag(`riddle:${x.id}`));
    const pick = await ask('narrator', 'You solved today’s riddle! A new one appears tomorrow. Try an old favourite again?', ['Yes please!', 'Maybe tomorrow']);
    if (pick !== 0) return;
    const again = solvedOnes[Math.floor(Math.random() * solvedOnes.length)] ?? r;
    await openPuzzle('riddle-stone', { riddle: again, replay: true });
    return;
  }
  const res = await openPuzzle('riddle-stone', { riddle: r });
  if (res.solved) {
    setFlag(`riddle:${r.id}`);
    const n = TOCKWOOD_RIDDLES.filter((x) => flag(`riddle:${x.id}`)).length;
    setFlag('riddles:solved', n);
    giveTockens(5);
    toast(`Riddles solved: ${n} of ${TOCKWOOD_RIDDLES.length}`, { icon: '❓' });
  }
});

// ------------------------------------------------------------------ Grandma Hopkins' scarves (logic grid)
export async function grandmaPuzzle(): Promise<void> {
  await offerPuzzle({
    id: 'grandma-scarves',
    who: 'grandma',
    pitch: 'Oh, dearie me. I knitted a scarf for each of the neighbours, but the storm blew all the name tags away! Would you help me work out whose is whose?',
    yes: 'Let’s puzzle it out!',
    replayPitch: 'Would you like to sort my scarves again? I do love watching you think!',
    onFirstSolve: async () => {
      await talk('grandma', [
        'Every scarf in the right place! What clever little minds you have.',
        'Now, a thank-you. When I was young, my grandmother taught me two soup secrets...',
      ]);
      learnClue('whisker-bisque', 'grandma');
      learnClue('together-tea', 'grandma');
      giveTockens(15);
      befriend('grandma', 20);
    },
  });
}
onUse('knitting', async () => {
  if (!flag('met:grandma')) {
    await talk('narrator', 'A basket of yarn and needles, and three scarves without name tags.');
    return;
  }
  await grandmaPuzzle();
});

// ------------------------------------------------------------------ Juniper's crates (sliding blocks)
export async function juniperPuzzle(): Promise<void> {
  await offerPuzzle({
    id: 'juniper-crates',
    who: 'juniper',
    pitch: 'Oh no no no — my wheelbarrow is stuck behind the veggie crates, and they only slide one way each! Can you get it out?',
    replayPitch: 'The crates got all jumbled again! Want to un-jam them?',
    onFirstSolve: async () => {
      audio.sfx('cheer');
      await talk('juniper', ['WHEELBARROW, you’re FREE! Thank you thank you!', 'Here — seeds for your garden, and a soup secret my bees told me.']);
      give('seed-radish', 2, { from: 'Juniper gave you' });
      give('seed-pumpkin', 2, { from: 'Juniper gave you' });
      learnClue('sunbeam-squash', 'juniper');
      befriend('juniper', 20);
    },
  });
}
onUse('crates', async () => {
  if (!flag('met:juniper')) {
    await talk('narrator', 'A jumble of vegetable crates, with a wheelbarrow stuck behind them. Whose could it be?');
    return;
  }
  await juniperPuzzle();
});

// ------------------------------------------------------------------ Dr. Quill's mosaic (patterns)
onUse('mosaic', async () => {
  await offerPuzzle({
    id: 'quill-patterns',
    who: 'quill',
    pitch: 'Ah, the old mosaic! A few tiles went missing long ago. If you can work out the pattern, I can have new ones made. Shall we look?',
    replayPitch: 'Back to the mosaic? Patterns are wonderful exercise for the brain!',
    onFirstSolve: async () => {
      await talk('quill', ['Prickles and pocketwatches, that’s it! The tile-makers loved a good pattern.', 'Here’s a finder’s fee for a pair of sharp-eyed historians.']);
      giveTockens(15);
      befriend('quill', 20);
    },
  });
});

// ------------------------------------------------------------------ Rocco's gear lock (code-breaking)
onUse('lockbox', async () => {
  if (!flag('met:rocco')) {
    await talk('narrator', 'A blue toolbox with three gear dials on the front. Locked tight!');
    return;
  }
  await offerPuzzle({
    id: 'rocco-lock',
    who: 'rocco',
    pitch: 'Ohh, my toolbox! I locked it with a gear code and — tick-tock — the code fell right out of my head. Can you crack it? I’ll tell you when you’re close!',
    yes: 'We’ll crack it!',
    replayPitch: 'I changed the code again! Want to crack it?',
    onFirstSolve: async () => {
      await talk('rocco', ['CLICK! My tools! My lovely tools! You two are code-cracking champions!', 'Take these tomato seeds. And a secret: tomatoes make the best time-slowing soup...']);
      give('seed-tomato', 3, { from: 'Rocco gave you' });
      learnClue('ticktock-tomato', 'rocco');
      befriend('rocco', 20);
    },
  });
});

// ------------------------------------------------------------------ Finnegan's toy boat (turn-limited sailing)
onUse('toy-boat', async () => {
  if (!flag('met:finnegan')) {
    await talk('narrator', 'A little toy sailboat bobbing in a tub of seawater. It looks well loved.');
    return;
  }
  await offerPuzzle({
    id: 'finnegan-boat',
    who: 'finnegan',
    pitch: 'Ribbit! That’s my racing boat! Every year I sail her to the buoy before the tide turns. Want to skipper her this year?',
    yes: 'Aye aye!',
    replayPitch: 'Another race to the buoy? The tide’s just right!',
    onFirstSolve: async () => {
      await talk('finnegan', ['What a skipper! You’d make any pirate jealous.', 'Here — a couple of sardines, and two old sailor soup secrets.']);
      give('sardine', 2, { from: 'Finnegan gave you' });
      learnClue('sparkle-stew', 'finnegan');
      learnClue('pirates-gumbo', 'finnegan');
      befriend('finnegan', 20);
    },
  });
});

// ------------------------------------------------------------------ a side quest that points at all of them
registerQuest({
  id: 'brain-builders',
  title: 'Brain-builders of Tockwood',
  icon: '🧩',
  chapter: 'side',
  available: (d) => !!d.flags['met:pip'],
  steps: [
    { id: 'riddle', text: 'Solve a riddle on the Riddle Stone in the plaza', done: (d) => Number(d.flags['riddles:solved'] ?? 0) >= 1, where: () => ({ map: 'tockwood', x: 35.2, y: 26.6 }) },
    { id: 'crates', text: 'Free Juniper’s wheelbarrow', done: (d) => !!d.puzzles['juniper-crates']?.solved, where: () => ({ map: 'tockwood', x: 25, y: 12.5 }) },
    { id: 'boat', text: 'Sail Finnegan’s toy boat to the buoy', done: (d) => !!d.puzzles['finnegan-boat']?.solved, where: () => ({ map: 'tockwood', x: 33.6, y: 38.5 }) },
    { id: 'lock', text: 'Crack Rocco’s gear lock', done: (d) => !!d.puzzles['rocco-lock']?.solved, where: () => ({ map: 'tockwood', x: 37.7, y: 18 }) },
    { id: 'scarves', text: 'Sort out Grandma Hopkins’ scarves', done: (d) => !!d.puzzles['grandma-scarves']?.solved, where: () => ({ map: 'tockwood', x: 11.2, y: 31 }) },
    { id: 'mosaic', text: 'Finish the museum’s mosaic floor', done: (d) => !!d.puzzles['quill-patterns']?.solved, where: () => ({ map: 'museum', x: 3.4, y: 9 }) },
  ],
  reward: '+30 Tockens',
  onComplete: (d) => {
    d.tockens += 30;
  },
});
