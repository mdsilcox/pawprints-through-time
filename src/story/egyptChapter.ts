import { app } from '../app';
import { audio } from '../audio/audio';
import { ask, conversation, talk } from '../ui/dialogue';
import { toast } from '../ui/ui';
import { learnNote } from '../ui/notesScreen';
import { grant } from '../core/wardrobe';
import { hasEffect } from '../soup/effects';
import { learnClue } from '../soup/kitchen';
import { openCauldron } from '../ui/cauldron';
import { openStall } from '../ui/stallShop';
import { openPuzzle } from '../puzzles/ui/screen';
import { EGYPT_RIDDLES } from '../puzzles/content/egypt';
import { dance } from '../dance/openDance';
import { befriend, cutscene, flag, give, giveTockens, oncePerDay, onEnterMap, onTalk, onUse, registerNpcName, setFlag, take, wait } from './hooks';
import { registerQuest } from './quests';
import { registerSandHome, rescueBunny } from './pirateChapter';
import { HOPKINS_BY_ID } from '../data/bunnies';
import { GIZA } from '../world/maps/egypt';
import type { WorldScene } from '../scenes/WorldScene';

for (const [id, name] of Object.entries({ neb: 'Neb', ankhi: 'Ankhi', sesi: 'Sesi' })) registerNpcName(id, name);

/**
 * Chapter 3: Ancient Egypt (Giza, around 2500 BCE). The time-storm blew the master builder's
 * pyramid plans away, and the golden capstone started glowing all by itself — the Time Sand is
 * inside it. Win past the Sphinx's riddles, light up the pitch-dark old tomb with Glowbroth, bring
 * the plans back, clear the stone blocks off the ramp and raise the capstone — then dance at the
 * builders' festival. Three Hopkins cousins are here too.
 */

const knowsGlow = () => {
  const d = app.data!;
  return d.recipes.includes('glowbroth') || d.clues.includes('glowbroth');
};

// ------------------------------------------------------------------ arriving at Giza
onEnterMap('egypt', async () => {
  if (flag('giza:arrived')) return;
  setFlag('giza:arrived');
  await cutscene(async () => {
    await wait(400);
    await talk('narrator', 'Whoosh! Hot sunshine, soft sand, and the sound of the river...');
    await talk('pip', [
      'Ancient Egypt — about four and a half thousand years ago! Look: they’re still BUILDING that pyramid!',
      'But nobody’s working... and I can feel the Time Sand glowing up there, right at the top.',
      'Let’s find whoever’s in charge. Maybe that big striped tent?',
    ]);
  });
});

// ------------------------------------------------------------------ Neb, the master builder
onTalk('neb', async ({ world }) => {
  const d = app.data!;
  if (world.def.region === 'tockwood') {
    await talk('neb', 'Tockwood is lovely! Your clocktower is almost as tall as a pyramid. ALMOST.');
    return;
  }
  if (!flag('met:neb')) {
    await conversation(async () => {
      await talk('neb', [
        'Oh! Visitors. Mind the ropes, little ones — I’m Neb, the master builder.',
        'We were just about to raise the golden capstone to the very top... when a storm of glittering sand blew in and — WHOOSH — my plans flew away!',
        'Without the plans, nobody knows where the last blocks go. And the capstone started glowing, all by itself!',
      ]);
      await talk('pip', 'Glowing? That sounds like our Time Sand!');
      await talk('neb', [
        'The wind carried my plans north, past the Sphinx, toward the old builders’ tomb.',
        'But the Sphinx won’t let anyone near the tomb without answering its riddles. Could you try? Please?',
      ]);
    });
    setFlag('met:neb');
    befriend('neb', 10);
    return;
  }
  if (!flag('plans:found')) {
    await talk('neb', flag('sphinx:passed') ? 'You got past the Sphinx? Wonderful! The plans must be inside the old tomb. It’s very dark in there...' : 'The plans blew toward the old tomb, past the Sphinx. Good luck with the riddles!');
    return;
  }
  if (!flag('plans:given')) {
    await cutscene(async () => {
      await talk('neb', ['My plans! You found them! A little crumpled... but I can read every line.', 'The last blocks go HERE, and HERE... and then the capstone goes right on top.']);
      await talk('neb', 'But the storm knocked blocks all over the ramp! The capstone sled is stuck at the bottom. Can you clear the way?');
    });
    take('pyramid-plans', 1);
    setFlag('plans:given');
    learnNote('egypt-pyramids');
    befriend('neb', 15);
    return;
  }
  if (!flag('capstone:placed')) {
    await talk('neb', 'Clear the blocks off the ramp and the capstone can go up! It’s at the bottom of the ramp, on its sled.');
    return;
  }
  if (!flag('festival:danced')) {
    await talk('neb', 'The pyramid is finished! Now — FESTIVAL! Everybody to the dance floor in the village!');
    return;
  }
  const lines = ['A pyramid takes about twenty years to build. We had a LOT of lunch breaks.', 'Measure twice, cut once — that’s the builder’s way. Measure three times if the block is really heavy.', 'Did you know? The stones were dragged on sleds. Someone poured water on the sand in front so they slid more easily!'];
  await talk('neb', lines[d.day % lines.length]);
});

// ------------------------------------------------------------------ the Great Sphinx and its riddle gauntlet
onUse('sphinx', async ({ world }) => {
  if (!flag('met:sphinx')) {
    await conversation(async () => {
      await talk('sphinx', ['WHO WANDERS BEFORE THE GREAT SPHINX?', '...Oh! Small ones. Hello! Forgive my big voice — I have been stone for a very, very long time.', 'The time-storm woke me up, you see. I rather like talking. And I LOVE riddles.']);
    });
    setFlag('met:sphinx');
    learnNote('egypt-sphinx');
  }
  if (flag('sphinx:passed')) {
    await talk('sphinx', 'The way to the old tomb is open, clever friends. Come and share riddles with me any time!');
    return;
  }
  const pick = await ask('sphinx', 'Answer THREE riddles in a row, and I will open the way to the old tomb. Ready?', ['Ready!', 'Not yet']);
  if (pick !== 0) return;
  await sphinxGauntlet(world);
});

async function sphinxGauntlet(world: WorldScene): Promise<void> {
  const d = app.data!;
  const tries = Number(d.flags['sphinx:tries'] ?? 0);
  d.flags['sphinx:tries'] = tries + 1;
  // (a fresh set of riddles on every try)
  for (let i = 0; i < 3; i++) {
    const riddle = EGYPT_RIDDLES[(tries * 3 + i) % EGYPT_RIDDLES.length];
    if (i === 1) await talk('sphinx', 'CORRECT! Riddle number two...');
    if (i === 2) await talk('sphinx', 'CORRECT AGAIN! And the last one...');
    const r = await openPuzzle('sphinx-riddles', { riddle });
    if (!r.solved) {
      await talk('sphinx', 'Hmm-hmm-HMM. Riddles are tricky things! Come back and try again — I have plenty more.');
      return;
    }
  }
  setFlag('sphinx:passed');
  await cutscene(async () => {
    audio.sfx('fanfare');
    await talk('sphinx', ['MAGNIFICENT! Three in a row!', 'The old tomb is yours to explore. And take these — headdresses just like mine!']);
    await talk('sphinx', 'Oh — and someone small has been napping between my paws all morning. Wearing a very royal hat...');
  });
  world.removeObject('tomb-gate');
  world.spawnLostBunny({ id: 'nibbles', kind: 'lostbunny', x: GIZA.sphinx.x + 1.4, y: GIZA.sphinx.y + 0.9, p: { id: 'nibbles' } });
  if (grant(d, 'nemes')) toast('You got the Striped Nemes! (Wardrobe → Hats)', { icon: '🦁' });
  giveTockens(20);
}

// ------------------------------------------------------------------ the old builders' tomb (pitch dark without Glowbroth)
onUse('tomb-gate', async () => {
  await talk('narrator', ['A thick rope blocks the tomb’s doorway, with a sign: “? ? ?”', 'Across the sand, the Sphinx booms: “RIDDLES FIRST, SMALL ONES!”']);
});

onUse('tomb-door', async ({ world }) => {
  if (!flag('sphinx:passed')) {
    await talk('narrator', 'The Sphinx’s rope still blocks the way.');
    return;
  }
  audio.sfx('door');
  world.goTo('tomb', 'in');
});

onEnterMap('tomb', async () => {
  if (hasEffect('glow')) {
    if (!flag('tomb:lit')) {
      setFlag('tomb:lit');
      await talk('narrator', 'Your glow fills the old tomb! Painted walls covered in little pictures, two cat statues... and a scroll on a stone stand!');
    }
    return;
  }
  await talk('narrator', ['It’s pitch dark in here! You can’t see your own paws.', 'Somewhere in the dark, something rustles like paper... and a tiny voice squeaks!']);
  if (!knowsGlow()) {
    learnClue('glowbroth', 'pip');
    await talk('pip', ['We need to GLOW! Clover once told me about Glowbroth: something that grows in the dark, something from the sea, and something that grows under the ground.', 'Sesi the baker has a cooking pot — and her stall sells black cumin, sea salt and radishes!']);
  } else {
    await talk('pip', 'Glowbroth! A bowl of that and we’ll light up like lanterns. Sesi’s cooking pot is in the village.');
  }
});

onUse('plans', async ({ world }) => {
  if (!hasEffect('glow')) {
    await talk('narrator', 'You bump into a stone stand in the dark. Ouch! You can’t see a thing.');
    return;
  }
  if (flag('plans:found')) {
    await talk('narrator', 'An empty stone stand. The plans are safe with Neb now.');
    return;
  }
  setFlag('plans:found');
  audio.sfx('success');
  world.setPropTexture('plans', 'fur-scrollstand-empty');
  give('pyramid-plans', 1, { from: 'You found' });
  await talk('pip', 'Neb’s pyramid plans! Let’s take them back to the building site.');
});

onUse('glyphs', async () => {
  if (!hasEffect('glow')) {
    await talk('narrator', 'Your paw brushes something carved in the wall... but it’s far too dark to see.');
    return;
  }
  await talk('narrator', 'Rows of little carved pictures run along the wall: birds, eyes, wavy lines of water, a round sun...');
  await talk('pip', 'Hieroglyphs! Each little picture stands for a sound or a word. Ankhi the scribe can read them all!');
  learnNote('egypt-hieroglyphs');
});

// ------------------------------------------------------------------ the ramp and the golden capstone
onUse('ramp', async ({ world }) => {
  if (!flag('plans:given')) {
    await talk('narrator', 'The golden capstone waits on its sled at the bottom of the ramp. Fallen stone blocks are jammed all over the ramp.');
    if (flag('met:neb')) await talk('neb', 'First we need my plans — without them, I don’t know where anything goes!');
    return;
  }
  const r = await openPuzzle('ramp-stones');
  if (!r.solved) return;
  setFlag('capstone:placed');
  const d = app.data!;
  world.celebrate(6500);
  await cutscene(async () => {
    audio.sfx('fanfare');
    await talk('neb', ['The ramp is clear! Everyone — HEAVE! ...HEAVE!', 'The capstone is at the top! Our pyramid is FINISHED!']);
    world.setPropTexture('pyramid', 'bld-pyramid-done');
    world.removeObject('ramp');
    await world.raiseTimeSand(GIZA.pyramid.x, GIZA.pyramid.y - 6.5);
    await talk('narrator', 'As the capstone settles into place, a swirl of glowing sand lifts off it... and floats down into your hands!');
    await talk('pip', ['A Time Sand! Hooray!', 'And listen — drums! Neb says there’s a festival in the village tonight. Egyptians LOVED festivals, with music and dancing!']);
  });
  if (!d.sands.includes('egypt')) d.sands.push('egypt');
  toast(`Time Sand ${d.sands.length} of 8!`, { icon: '⏳', cls: 'quest', ms: 3600 });
  befriend('neb', 20);
  d.tockens += 40;
  app.autosave.request();
});

// ------------------------------------------------------------------ the village: Ankhi the scribe, Sesi the baker, the festival
onTalk('ankhi', async ({ world }) => {
  const d = app.data!;
  if (world.def.region === 'tockwood') {
    const lines = ['Dr. Quill lets me help label the museum. I write everything twice — once in hieroglyphs, once for you!', 'Your paper is so thin and white! I still prefer papyrus.', 'I have written a whole scroll about Biscuit. It is mostly pictures of him sleeping.'];
    await talk('ankhi', lines[d.day % lines.length]);
    return;
  }
  if (!flag('met:ankhi')) {
    await talk('ankhi', ['Greetings! I am Ankhi, royal scribe. I write down everything that happens here — on papyrus, with a reed pen.', 'Here — have a sheet of papyrus of your own. We make it from the reeds along the river!']);
    give('papyrus', 1, { from: 'Ankhi gave you' });
    learnNote('egypt-papyrus');
    setFlag('met:ankhi');
    befriend('ankhi', 10);
    if (!knowsGlow() && flag('met:neb')) await talk('ankhi', 'Going to the old tomb? It is darker than a cat’s dream in there. You will need a way to glow...');
    return;
  }
  if (flag('capstone:placed') && !flag('festival:danced')) {
    await talk('ankhi', 'The festival! Come to the dance floor in the village — I will play the drum!');
    return;
  }
  const lines = ['A scribe trains for years to learn all the hieroglyphs. There are hundreds!', 'I am writing down your adventure. How do you spell “Biscuit”?', 'Cats are very important in Egypt. I am just saying.'];
  await talk('ankhi', lines[d.day % lines.length]);
});

onTalk('sesi', async () => {
  const d = app.data!;
  if (!flag('met:sesi')) {
    await talk('sesi', ['Fresh bread! Get your fresh bread! Oh, hello! I’m Sesi — I bake for the whole building site.', 'Builders eat bread every single day — with onions, lentils and radishes. Some even get paid in bread!']);
    learnNote('egypt-bread');
    setFlag('met:sesi');
    befriend('sesi', 10);
    return;
  }
  if (oncePerDay('gift:sesi')) {
    await talk('sesi', 'Have some dates, fresh from the palms — sweet as honey!');
    give('dates', 2, { from: 'Sesi gave you' });
    return;
  }
  const lines = ['My stall has everything a cook needs. And my pot is always warm!', 'The oven is shaped like a beehive. That’s how bread likes it.', 'Radishes! Onions! Lentils! A builder’s best friends.'];
  await talk('sesi', lines[d.day % lines.length]);
});

onUse('sesi-stall', async () => {
  await openStall(
    '🍞 Sesi’s Market Stall',
    [
      { id: 'black-cumin', price: 5 },
      { id: 'sea-salt', price: 4 },
      { id: 'radish', price: 3 },
      { id: 'dates', price: 4 },
      { id: 'lentils', price: 3 },
      { id: 'onion', price: 2 },
    ],
    'Spices, salt from the Great Green sea, and fresh food from the fields by the river.',
  );
});

onUse('sesi-oven', async () => {
  const res = await openCauldron({ title: '🍲 Sesi’s Cooking Pot' });
  if (res?.soup.id === 'glowbroth') await talk('sesi', res.drank ? 'Ooh, you’re GLOWING! Now you can see in the darkest tomb.' : 'Glowbroth! Drink it when you get to the dark tomb.');
});

onUse('festival-floor', async ({ world }) => {
  const d = app.data!;
  if (!flag('capstone:placed')) {
    await talk('ankhi', 'This is our festival floor! The festival begins the day the pyramid is finished.');
    return;
  }
  const first = !flag('festival:danced');
  if (first) await talk('neb', 'The pyramid is finished — let the festival BEGIN! Drums! Flutes! Everybody dance!');
  const o = await dance({ style: 'festival', audience: ['neb', 'ankhi', 'sesi'], bunnies: d.bunnies.slice(0, 4), title: '💃 The Builders’ Festival', blurb: 'The whole village is dancing — walk like a builder, reach for the sun and spin like the Nile!' });
  if (!o?.finished || !first) return;
  setFlag('festival:danced');
  world.celebrate(5000);
  await cutscene(async () => {
    await talk('ankhi', ['What dancers! I shall write this festival down forever.', 'And this is for your home — a little lamp, so you always have light. Like the lamps that lit the tomb painters’ work!']);
    await talk('neb', 'And linen clothes, cool as the river. You are honorary builders now!');
    await talk('pip', 'Time to take the sand home! The portal is by the river.');
  });
  give('egypt-lamp', 1, { from: 'Ankhi gave you' });
  for (const id of ['linen-tunic', 'shendyt', 'reed-sandals']) grant(d, id);
  toast('You got a Linen Tunic, a Shendyt and Reed Sandals! (Wardrobe)', { icon: '🏺' });
  befriend('ankhi', 20);
  app.autosave.request();
});

// ------------------------------------------------------------------ three Hopkins cousins of ancient Egypt
async function cousin(id: string, world: WorldScene, extra?: () => Promise<void>): Promise<void> {
  const hb = HOPKINS_BY_ID.get(id)!;
  await conversation(async () => {
    await talk(`hop-${id}`, hb.found);
    await talk('pip', 'Another Hopkins cousin! Home you go — the warren is waiting.');
  });
  if (extra) await extra();
  await rescueBunny(id, world);
}

onTalk('lost:nibbles', async ({ world }) =>
  cousin('nibbles', world, async () => {
    await talk('hop-nibbles', 'The Sphinx let me sit between its paws. It’s VERY comfy for a stone lion.');
  }),
);
onTalk('lost:sandy', async ({ world }) => cousin('sandy', world));
onTalk('lost:lotus', async ({ world }) => {
  if (!hasEffect('glow')) {
    await talk('hop-lotus', 'H-hello? Who’s there? It’s so dark, I can’t see anything!');
    await talk('pip', 'A cousin, somewhere in the dark! If only we could glow...');
    return;
  }
  await cousin('lotus', world);
});

// ------------------------------------------------------------------ home again: the third sand
registerSandHome('egypt', {
  lines: [
    'The sand from the capstone! The hourglass is filling up nicely.',
    'And look who came through the portal to visit — Ankhi the scribe! She’s writing labels for Dr. Quill’s museum.',
  ],
  after: () => setFlag('ankhi:arrived'),
});

// ------------------------------------------------------------------ quests
registerQuest({
  id: 'egypt-sand',
  title: 'The Pyramid Plans',
  icon: '🔺',
  chapter: 'egypt',
  main: true,
  available: (d) => !!d.flags['giza:arrived'],
  steps: [
    { id: 'meet', text: 'Find the master builder by the pyramid', done: (d) => !!d.flags['met:neb'], where: () => ({ map: 'egypt', x: GIZA.tent.x, y: GIZA.tent.y + 1.6 }) },
    { id: 'sphinx', text: 'Answer the Sphinx’s three riddles', done: (d) => !!d.flags['sphinx:passed'], where: () => ({ map: 'egypt', x: GIZA.sphinx.x - 1.6, y: GIZA.sphinx.y + 0.6 }) },
    { id: 'plans', text: 'Find the lost plans in the dark old tomb (bring a glow!)', done: (d) => !!d.flags['plans:found'], where: (d) => (d.location.map === 'tomb' ? { map: 'tomb', x: 7, y: 5 } : { map: 'egypt', x: GIZA.tomb.x, y: GIZA.tomb.y + 0.8 }) },
    { id: 'give', text: 'Bring the plans back to Neb', done: (d) => !!d.flags['plans:given'], where: () => ({ map: 'egypt', x: GIZA.tent.x, y: GIZA.tent.y + 1.6 }) },
    { id: 'ramp', text: 'Clear the ramp and raise the golden capstone', done: (d) => !!d.flags['capstone:placed'], where: () => ({ map: 'egypt', x: GIZA.ramp.x, y: GIZA.ramp.y + 0.6 }) },
    { id: 'festival', text: 'Dance at the builders’ festival', done: (d) => !!d.flags['festival:danced'], where: () => ({ map: 'egypt', x: GIZA.floor.x, y: GIZA.floor.y }) },
    { id: 'home', text: 'Bring the Time Sand home to the Great Hourglass', done: (d) => !!d.flags['sand:egypt:placed'], where: () => ({ map: 'clocktower', x: 6.5, y: 5.4 }) },
  ],
  reward: '+50 Tockens',
  onComplete: (d) => {
    d.tockens += 50;
  },
});

registerQuest({
  id: 'egypt-bunnies',
  title: 'Cousins in the Sand',
  icon: '🐰',
  chapter: 'egypt',
  available: (d) => !!d.flags['giza:arrived'],
  steps: [
    { id: 'nibbles', text: 'Find the cousin somewhere very royal', done: (d) => d.bunnies.includes('nibbles'), where: () => ({ map: 'egypt', x: GIZA.sphinx.x + 1.4, y: GIZA.sphinx.y + 1 }) },
    { id: 'sandy', text: 'Sniff out the cousin hiding with the builders’ baskets', done: (d) => d.bunnies.includes('sandy'), where: () => ({ map: 'egypt', x: 42.4, y: 18.4 }) },
    { id: 'lotus', text: 'Find the cousin lost in the dark', done: (d) => d.bunnies.includes('lotus'), where: () => ({ map: 'tomb', x: 11.4, y: 6.4 }) },
  ],
  reward: '+20 Tockens',
  onComplete: (d) => {
    d.tockens += 20;
  },
});
