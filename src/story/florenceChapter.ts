import { app } from '../app';
import { audio } from '../audio/audio';
import { conversation, talk } from '../ui/dialogue';
import { toast } from '../ui/ui';
import { learnNote } from '../ui/notesScreen';
import { grant } from '../core/wardrobe';
import { hasEffect } from '../soup/effects';
import { learnClue } from '../soup/kitchen';
import { openCauldron } from '../ui/cauldron';
import { openStall } from '../ui/stallShop';
import { openPuzzle } from '../puzzles/ui/screen';
import { dance } from '../dance/openDance';
import { befriend, cutscene, flag, give, oncePerDay, onEnterMap, onTalk, onUse, registerNpcName, setFlag, wait } from './hooks';
import { registerQuest } from './quests';
import { registerSandHome, rescueBunny } from './pirateChapter';
import { HOPKINS_BY_ID } from '../data/bunnies';
import { FLOR } from '../world/maps/florence';
import type { WorldScene } from '../scenes/WorldScene';

for (const [id, name] of Object.entries({ lucia: 'Maestra Lucia', fiorella: 'Fiorella', orsola: 'Duchess Orsola', beppe: 'Beppe' })) registerNpcName(id, name);

/**
 * Chapter 4: Renaissance Florence (around 1500). Tonight Duchess Orsola holds a court dance,
 * and its two marvels have gone wrong in the glittering storm: Maestra Lucia's mechanical lion
 * has stopped (the Time Sand is jammed in its works) and Fiorella's fresco lost its border.
 * Mend the fresco's pattern, crack the lion's gear lock, put its parts back, then dance.
 */
const knowsHop = () => {
  const d = app.data!;
  return d.recipes.includes('hopscotch-chowder') || d.clues.includes('hopscotch-chowder');
};
const ready = () => flag('lion:awake') && flag('fresco:mended');

// ------------------------------------------------------------------ arriving in Florence
onEnterMap('florence', async () => {
  if (flag('flor:arrived')) return;
  setFlag('flor:arrived');
  await cutscene(async () => {
    await wait(400);
    await talk('narrator', 'Whoosh! Warm stone, church bells, and the smell of fresh paint...');
    await talk('pip', [
      'Florence, around the year 1500! Artists, builders and inventors everywhere — it’s called the Renaissance.',
      'Look at that enormous dome!',
      'I can feel a Time Sand close by... Let’s ask around. That grand lady by the palazzo looks important!',
    ]);
    learnNote('florence-renaissance');
  });
});

// ------------------------------------------------------------------ Duchess Orsola
onTalk('orsola', async () => {
  const d = app.data!;
  if (!flag('met:orsola')) {
    await conversation(async () => {
      await talk('orsola', [
        'Oh! Visitors, and on such a night! I am Orsola, Duchess of this palazzo. Tonight I hold a court dance for all of Florence.',
        'Maestra Lucia built a marvel for it — a mechanical lion that WALKS. But since that glittering storm, it won’t move a whisker.',
        'And Fiorella’s fresco for my ballroom? The storm smudged its lovely border! Whatever shall we do?',
      ]);
      await talk('pip', 'A glittering storm... that’s our Time Sand! We’ll help, Duchess!');
      await talk('orsola', ['You are very kind. Lucia’s workshop is to the west, with the gear sign. Fiorella’s studio is to the east.', 'Here — a few golden florins for your trouble. Florence’s own coin!']);
    });
    give('florin', 3, { from: 'Duchess Orsola gave you' });
    learnNote('florence-florin');
    setFlag('met:orsola');
    befriend('orsola', 10);
    return;
  }
  if (!ready()) {
    const left = [!flag('fresco:mended') ? 'Fiorella’s fresco' : '', !flag('lion:awake') ? 'Lucia’s lion' : ''].filter(Boolean).join(' and ');
    await talk('orsola', `The dance can’t begin until ${left} ${left.includes(' and ') ? 'are' : 'is'} ready. Thank you for helping!`);
    return;
  }
  if (!flag('court:danced')) {
    await talk('orsola', 'Everything is ready! Meet me on the dance floor in front of my palazzo — let the court dance begin!');
    return;
  }
  const lines = ['What a night that was! Florence will talk about it for a hundred years.', 'The lion walks up and down my hall every morning now. The cats are not amused.', 'Do visit again, my friends. There is always music at the palazzo.'];
  await talk('orsola', lines[d.day % lines.length]);
});

// ------------------------------------------------------------------ Fiorella and the fresco
onTalk('fiorella', async () => {
  const d = app.data!;
  if (!flag('met:fiorella')) {
    await talk('fiorella', [
      'Ciao! I’m Fiorella — I paint frescoes. That means painting on wet plaster, so the colours become part of the wall!',
      'But the storm smudged my border, and I can’t remember the pattern. Could you help me work it out? It’s on the wall there.',
    ]);
    learnNote('florence-fresco');
    setFlag('met:fiorella');
    befriend('fiorella', 10);
    return;
  }
  if (!flag('fresco:mended')) {
    await talk('fiorella', 'The pattern is on the wall — look at the tiles, and help me find which one comes next!');
    return;
  }
  const lines = ['Hold still — I’m painting you! ...Just kidding. Mostly.', 'The secret to blue paint? Crushed stones! Very expensive stones.', 'A painter learns in a master’s workshop for years before painting alone.'];
  await talk('fiorella', lines[d.day % lines.length]);
});

onUse('fresco', async ({ world }) => {
  if (flag('fresco:mended')) {
    await talk('narrator', 'The fresco is finished: a painted lion in a sunny meadow, with a bright border all the way round.');
    return;
  }
  const r = await openPuzzle('fiorella-fresco');
  if (!r.solved) return;
  setFlag('fresco:mended');
  world.setPropTexture('fresco', 'fur-fresco-mended');
  await cutscene(async () => {
    audio.sfx('success');
    await talk('fiorella', ['Bellissimo! The border is perfect again!', 'Take my spare smock — every painter needs one.', 'Oh, and when the storm hit, I saw a glowing speck zip right into Maestra Lucia’s workshop!']);
  });
  if (grant(app.data!, 'painter-smock')) toast('You got a Painter’s Smock! (Wardrobe)', { icon: '🎨' });
  befriend('fiorella', 20);
});

// ------------------------------------------------------------------ Maestra Lucia and the mechanical lion
onTalk('lucia', async ({ world }) => {
  const d = app.data!;
  if (world.def.region === 'tockwood') {
    const lines = ['Rocco’s clocks are marvels! We are building one that also makes soup.', 'Your clocktower has the finest gears I have ever seen. I took notes. Many notes.', 'Did you know your Biscuit would make an excellent flying-machine pilot? Very brave nose.'];
    await talk('lucia', lines[d.day % lines.length]);
    return;
  }
  if (!flag('met:lucia')) {
    await talk('lucia', [
      'Ah! Assistants! Good — I need clever hands. I am Maestra Lucia, inventor.',
      'I fill notebooks with machines: flying machines, water wheels... and THIS — a mechanical lion, to walk for the Duchess tonight.',
      'But in the storm, something glowing flew in and jammed it! And the lion’s gear lock spun right round. Can you open it?',
    ]);
    learnNote('florence-inventors');
    setFlag('met:lucia');
    befriend('lucia', 10);
    return;
  }
  if (!flag('lion:awake')) {
    await talk('lucia', flag('lion:open') ? 'The panel is open — now the parts! My notes say where each one goes.' : 'The gear lock is on the lion’s side. Gold stars mean a gear is in the right place!');
    return;
  }
  const lines = ['A machine is only a sort of puzzle that moves.', 'Tomorrow: a flying machine. The day after: a softer landing.', 'My lion winks at me when I oil its gears. I did not build it to do that.'];
  await talk('lucia', lines[d.day % lines.length]);
});

onUse('lion', async ({ world }) => {
  if (flag('lion:awake')) {
    await talk('narrator', 'The mechanical lion purrs like a clock and gives you a gentle bump with its brass nose.');
    return;
  }
  if (!flag('met:lucia')) {
    await talk('narrator', 'A lion made of brass and copper! It isn’t moving at all.');
    return;
  }
  if (!flag('lion:open')) {
    const r = await openPuzzle('lucia-lock');
    if (!r.solved) return;
    setFlag('lion:open');
    await talk('lucia', ['The panel is open! And — oh no. The storm shook every part loose inside!', 'My notes say where each one goes. Let’s put them back!']);
  }
  const r = await openPuzzle('lucia-lion');
  if (!r.solved) return;
  setFlag('lion:awake');
  const d = app.data!;
  await cutscene(async () => {
    world.setPropTexture('lion', 'fur-mechlion-awake');
    audio.sfx('fanfare');
    await talk('lucia', 'Wind the key... and... it’s WORKING!');
    await talk('narrator', 'The lion blinks, stretches its brass legs and lets out a mighty clockwork ROAR!');
    await world.raiseTimeSand(7, 5.4);
    await talk('narrator', 'With a whirr and a click, a swirl of glowing sand pops out of the lion’s chest... and floats into your hands!');
    await talk('pip', ['A Time Sand! Hooray!', 'Now nothing can stop the Duchess’s court dance!']);
  });
  if (!d.sands.includes('florence')) d.sands.push('florence');
  toast(`Time Sand ${d.sands.length} of 8!`, { icon: '⏳', cls: 'quest', ms: 3600 });
  d.tockens += 40;
  befriend('lucia', 20);
  app.autosave.request();
});

// ------------------------------------------------------------------ Beppe the grocer, his herb garden and his cooking pot
onTalk('beppe', async () => {
  const d = app.data!;
  if (!flag('met:beppe')) {
    await talk('beppe', ['Basil! Beans! Lettuce! The freshest in all of Florence! I’m Beppe.', 'Florentines love white beans so much, people call us “bean-eaters”. And proud of it!']);
    setFlag('met:beppe');
    befriend('beppe', 10);
    return;
  }
  if (oncePerDay('gift:beppe')) {
    await talk('beppe', 'For you — a bunch of basil. Smell that!');
    give('basil', 1, { from: 'Beppe gave you' });
    return;
  }
  const lines = ['My pot over the fire is always bubbling. Help yourself!', 'A little cousin keeps sniffing my basil. Ears like this! Very sweet.', 'Beans, beans, good for your... bones!'];
  await talk('beppe', lines[d.day % lines.length]);
});

onUse('beppe-stall', async () => {
  await openStall(
    '🌿 Beppe’s Market Stall',
    [
      { id: 'basil', price: 4 },
      { id: 'beans', price: 4 },
      { id: 'lettuce', price: 3 },
      { id: 'carrot', price: 3 },
      { id: 'honey', price: 5 },
    ],
    'Fresh from the garden by the river — and honey from the hills around Florence.',
  );
});

onUse('firepot', async () => {
  const res = await openCauldron({ title: '🍲 Beppe’s Garden Pot' });
  if (res?.soup.id === 'hopscotch-chowder') await talk('beppe', res.drank ? 'Look at you BOUNCE! Mind my basil!' : 'Hopscotch Chowder! Drink it when you need a big jump.');
});

// ------------------------------------------------------------------ the court dance
onUse('court-floor', async ({ world }) => {
  const d = app.data!;
  if (!ready()) {
    if (flag('met:orsola')) await talk('orsola', 'The court dance begins when Lucia’s lion walks and Fiorella’s fresco is finished!');
    else await talk('narrator', 'A marble dance floor with a golden star in the middle. It looks like it’s waiting for a party.');
    return;
  }
  const first = !flag('court:danced');
  if (first) await talk('orsola', 'Musicians — play! Everyone, to the floor! Bow to your partner...');
  const o = await dance({ style: 'court', audience: ['orsola', 'lucia', 'fiorella', 'beppe'], bunnies: d.bunnies.slice(0, 4), title: '💃 The Duchess’s Court Dance', blurb: 'Glide, bow, raise your hands and turn — and the mechanical lion dances too!' });
  if (!o?.finished || !first) return;
  setFlag('court:danced');
  world.celebrate(5500);
  await cutscene(async () => {
    await talk('orsola', ['Magnificent! The finest court dance Florence has ever seen!', 'For your home — a globe of the whole known world. And clothes fit for my court!']);
    await talk('pip', 'Time to take the sand home! The portal is by the river.');
  });
  give('globe', 1, { from: 'Duchess Orsola gave you' });
  for (const id of ['doublet', 'florentine-cap', 'velvet-slippers']) grant(d, id);
  toast('You got a Velvet Doublet, a Renaissance Cap and Velvet Slippers! (Wardrobe)', { icon: '👑' });
  befriend('orsola', 20);
  app.autosave.request();
});

// ------------------------------------------------------------------ three Hopkins cousins of Renaissance Florence
async function cousin(id: string, world: WorldScene, extra?: () => Promise<void>): Promise<void> {
  const hb = HOPKINS_BY_ID.get(id)!;
  await conversation(async () => {
    await talk(`hop-${id}`, hb.found);
    await talk('pip', 'Another Hopkins cousin! Home you go — the warren is waiting.');
  });
  if (extra) await extra();
  await rescueBunny(id, world);
}

onTalk('lost:pesto', async ({ world }) =>
  cousin('pesto', world, async () => {
    await talk('hop-pesto', 'Here — basil for Clover! It makes everything smell like summer.');
    give('basil', 2, { quiet: true });
  }),
);
onTalk('lost:sketch', async ({ world }) => cousin('sketch', world));

onUse('twirl-ledge', async ({ world }) => {
  if (flag('rescued:twirl')) {
    await talk('narrator', 'An empty stone column. Twirl is safe at home in the warren!');
    return;
  }
  if (!hasEffect('hop')) {
    await talk('hop-twirl', 'Help! I climbed up here to see the dome, and now I can’t get down!');
    if (!knowsHop()) learnClue('hopscotch-chowder', 'pip');
    await talk('pip', ['It’s much too high to jump... unless we had SUPER-bunny jumps!', 'Hopscotch Chowder: two things a bunny loves to munch, and something sweet. Beppe sells lettuce, carrots and honey — and his pot is by the garden!']);
    return;
  }
  await cutscene(async () => {
    audio.sfx('hop');
    await talk('narrator', 'BOING! With a super-bunny jump, you spring right up to the top of the column!');
  });
  world.setPropTexture('twirl-ledge', 'prop-column');
  await cousin('twirl', world);
});

// ------------------------------------------------------------------ home again: the fourth sand
registerSandHome('florence', {
  lines: [
    'The sand from the lion! The Great Hourglass is glowing like a lantern now.',
    'And look — Maestra Lucia came through the portal to see Rocco’s clocks. The two of them are already taking something apart...',
  ],
  after: () => setFlag('lucia:arrived'),
});

// ------------------------------------------------------------------ quests
registerQuest({
  id: 'florence-sand',
  title: 'The Mechanical Lion',
  icon: '🦁',
  chapter: 'florence',
  main: true,
  available: (d) => !!d.flags['flor:arrived'],
  steps: [
    { id: 'meet', text: 'Meet the Duchess by her palazzo', done: (d) => !!d.flags['met:orsola'], where: () => ({ map: 'florence', x: FLOR.palazzo.x - 3.6, y: FLOR.palazzo.y + 1.4 }) },
    { id: 'fresco', text: 'Mend the border of Fiorella’s fresco', done: (d) => !!d.flags['fresco:mended'], where: (d) => (d.location.map === 'studio' ? { map: 'studio', x: 6.5, y: 3.4 } : { map: 'florence', x: FLOR.studio.x, y: FLOR.studio.y + 0.8 }) },
    { id: 'lock', text: 'Open the mechanical lion’s gear lock', done: (d) => !!d.flags['lion:open'], where: (d) => (d.location.map === 'workshop' ? { map: 'workshop', x: 7, y: 6.6 } : { map: 'florence', x: FLOR.workshop.x, y: FLOR.workshop.y + 0.8 }) },
    { id: 'lion', text: 'Put the lion’s parts back where they belong', done: (d) => !!d.flags['lion:awake'], where: () => ({ map: 'workshop', x: 7, y: 6.6 }) },
    { id: 'court', text: 'Dance at the Duchess’s court dance', done: (d) => !!d.flags['court:danced'], where: () => ({ map: 'florence', x: FLOR.floor.x, y: FLOR.floor.y }) },
    { id: 'home', text: 'Bring the Time Sand home to the Great Hourglass', done: (d) => !!d.flags['sand:florence:placed'], where: () => ({ map: 'clocktower', x: 6.5, y: 5.4 }) },
  ],
  reward: '+50 Tockens',
  onComplete: (d) => {
    d.tockens += 50;
  },
});

registerQuest({
  id: 'florence-bunnies',
  title: 'Cousins in Florence',
  icon: '🐰',
  chapter: 'florence',
  available: (d) => !!d.flags['flor:arrived'],
  steps: [
    { id: 'pesto', text: 'Find the cousin somewhere that smells of herbs', done: (d) => d.bunnies.includes('pesto'), where: () => ({ map: 'florence', x: 4, y: 19.8 }) },
    { id: 'sketch', text: 'Sniff out the cousin among the paints and brushes', done: (d) => d.bunnies.includes('sketch'), where: () => ({ map: 'studio', x: 1.6, y: 6.6 }) },
    { id: 'twirl', text: 'Reach the cousin stuck way up high', done: (d) => d.bunnies.includes('twirl'), where: () => ({ map: 'florence', x: FLOR.ledge.x, y: FLOR.ledge.y + 0.8 }) },
  ],
  reward: '+20 Tockens',
  onComplete: (d) => {
    d.tockens += 20;
  },
});

