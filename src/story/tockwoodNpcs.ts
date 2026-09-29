import { app } from '../app';
import { audio } from '../audio/audio';
import { talk, ask, conversation } from '../ui/dialogue';
import { toast } from '../ui/ui';
import { MORNING, sleepUntilMorning, nightAmount } from '../world/clock';
import { befriend, count, flag, give, giveTockens, hearts, oncePerDay, onTalk, onUse, registerNpcName, setFlag, take, cutscene, wait } from './hooks';
import { registerQuest, flagDone } from './quests';
import { TW } from '../world/maps/tockwood';
import { openWardrobe } from '../ui/wardrobe';
import { openSellScreen, sellable } from '../ui/sellScreen';
import { cookWithClover, juniperStall, offerSoupGift } from './soupStory';
import { grandmaPuzzle, juniperPuzzle, puzzleSolved } from './brainBuilders';
import { CLOTHES_BY_ID } from '../data/clothes';
import { input } from '../input/input';
import { openPlanner } from '../ui/planner';
import { openStall } from '../ui/stallShop';
import { ROCCO_GOODS } from '../data/furniture';

/**
 * Tockwood's neighbours: first meetings, daily chatter that changes with the day, the time
 * and your friendship, plus little favours. Chatting once a day grows friendship.
 */
const NAMES: Record<string, string> = {
  quill: 'Dr. Quill',
  bramble: 'Bramble',
  finnegan: 'Finnegan',
  juniper: 'Juniper',
  rocco: 'Rocco',
  clover: 'Clover',
  grandma: 'Grandma Hopkins',
  rosita: 'Rosita',
  rollo: 'Rollo',
};
for (const [id, n] of Object.entries(NAMES)) registerNpcName(id, n);

const pickDaily = (id: string, lines: string[]) => lines[((app.data?.day ?? 1) * 7 + id.length * 3) % lines.length];
const night = () => nightAmount(app.data?.minutes ?? MORNING) > 0.5;

/** Shared chat flow: meet once, then daily lines (+friendship once a day). */
async function chat(id: string, first: string[], daily: string[], opts: { nightLine?: string; hearts?: Record<number, string> } = {}): Promise<boolean> {
  const who = id;
  if (!flag(`met:${id}`)) {
    await talk(who, first);
    setFlag(`met:${id}`);
    befriend(id, 10);
    return true;
  }
  const h = hearts(id);
  const special = opts.hearts?.[h];
  const line = night() && opts.nightLine ? opts.nightLine : special && !flag(`heartline:${id}:${h}`) ? special : pickDaily(id, daily);
  if (special && line === special) setFlag(`heartline:${id}:${h}`);
  await talk(who, line);
  if (oncePerDay(`chat:${id}`)) befriend(id, 6);
  await offerSoupGift(id);
  return false;
}

// ------------------------------------------------------------------ Dr. Quill (hedgehog, time historian)
onTalk('quill', async () => {
  const first = await chat(
    'quill',
    [
      'Prickles and pocketwatches — visitors! Welcome! I’m Dr. Quill, Tockwood’s time historian.',
      'This is the Museum of Time. Well... it WILL be. The storm that cracked Pip’s hourglass whisked my whole collection off into the past!',
      'If you find anything old and wonderful — on the beach, under the ground, or in another century — bring it here. It gets a little card with your names on it!',
    ],
    [
      'Did you know? Long before clocks had gears, people told the time with sundials — by watching a shadow move!',
      'I sort my notes by century, then by decade, then by how much they make my prickles stand up.',
      'A hedgehog’s prickles are really just stiff, hollow hairs. Very handy for holding pencils!',
      'The clocktower ticked backwards all morning. Most irregular!',
      'Every object has a story. Even a button! ESPECIALLY a button.',
      'A good historian asks three questions: Who? When? And... is there cake?',
    ],
    { nightLine: 'Working late? Me too! I’m labelling every drawer — twice.', hearts: { 2: 'Curious, careful and kind — that’s what makes a true historian. And that’s {you}! Prickles and pocketwatches!' } },
  );
  if (first) return;
  const fossils = ['fossil-ammonite', 'fossil-trilobite', 'fossil-fern', 'fossil-tooth'].filter((f) => count(f) > 0);
  if (fossils.length && !flag('quill:first-fossil')) {
    const pick = await ask('quill', 'My prickles are tingling... is that something ANCIENT in your pocket? Would you lend it to the Museum of Time?', ['Here you go!', 'Maybe later']);
    if (pick === 0) {
      take(fossils[0]);
      app.data!.museum.push(fossils[0]);
      setFlag('quill:first-fossil');
      await talk('quill', 'Splendid! Spectacular! The very first treasure of the new Museum of Time! Here — a thank-you for our finest finders.');
      giveTockens(25);
      befriend('quill', 20);
    }
  }
  if (sellable().length) {
    const pick = await ask('quill', 'Have you brought any finds for my trading table? I pay in shiny Tockens — and the best pieces go in the museum!', ['Let’s trade!', 'Not today']);
    if (pick === 0) {
      await openSellScreen();
      if (oncePerDay('trade:quill')) befriend('quill', 5);
    }
  }
});

// ------------------------------------------------------------------ Bramble (badger, tailor)
/** Bramble can't resist remarking on clothes from other times (once per piece). */
const ERA_REMARK: Record<string, string> = {
  pirate: 'Is that a real {item}? From the Golden Age of Piracy?! Sailors mended their own clothes on long voyages, you know — look at these tiny stitches!',
  egypt: 'Linen from Ancient Egypt! {item}! So light, so cool — perfect for the desert sun.',
  fifties: 'A {item}, straight out of the 1950s! Oh, the swing of it! Oh, the SNAP!',
  florence: 'Renaissance tailoring! This {item} could have walked right out of a painting!',
};
async function brambleNotices(): Promise<boolean> {
  const d = app.data!;
  const who: (0 | 1)[] = input.twoPlayer ? [0, 1] : [0];
  for (const p of who)
    for (const w of Object.values(d.players[p].outfit)) {
      const it = w ? CLOTHES_BY_ID.get(w.id) : undefined;
      if (!it?.era || flag(`bramble:saw:${it.id}`)) continue;
      setFlag(`bramble:saw:${it.id}`);
      await talk('bramble', ERA_REMARK[it.era].replace('{item}', it.name));
      befriend('bramble', 4);
      return true;
    }
  return false;
}

onTalk('bramble', async () => {
  if (flag('met:bramble')) await brambleNotices();
  if (flag('met:bramble')) {
    const pick = await ask('bramble', 'What can I do for you, darlings?', ['Browse your clothes', 'Just chatting', 'Dress up Biscuit']);
    if (pick === 0) {
      await talk('bramble', 'Try anything on! My mirror shows you before you buy. Tockens only when you love it.');
      if (oncePerDay('chat:bramble')) befriend('bramble', 6);
      openWardrobe({ shop: true });
      return;
    }
    if (pick === 2) {
      await talk('bramble', 'Ooh, a canine client! Biscuit, hold still, sweetie...');
      openWardrobe({ shop: true, who: 'biscuit' });
      return;
    }
  }
  await chat(
    'bramble',
    [
      'Oh! Oh, darlings, look at you! Come in, come in! I’m Bramble — tailor, stylist, and friend to all fabrics.',
      'Clothes aren’t just clothes, you know. They’re stories you can wear!',
      'My magic mirror over there shows every outfit you own. And if you bring back clothes from faraway times, I’ll help you wear them with flair!',
    ],
    [
      'Sew exciting to see you!',
      'I dreamed of a scarf so long it wrapped around the whole island. Magnificent. Impractical.',
      'Stripes this season, darlings. Stripes and confidence.',
      'Badgers are champion diggers, you know. I dig through fabric bins.',
      'A button here, a bow there, and suddenly — ta-da!',
      'Biscuit came in for a fitting yesterday. He wanted a cape. I’m considering it.',
    ],
    { hearts: { 2: 'You two have such lovely style. It makes my whiskers twitch with joy!' } },
  );
});

// ------------------------------------------------------------------ Finnegan (frog, dock)
onTalk('finnegan', async () => {
  const first = await chat(
    'finnegan',
    [
      'Well, ribbit and howdy! Name’s Finnegan. I fish off this here dock, rain or shine.',
      'Rough storm last night. Saw a wave so big it waved back at me.',
      'If you ever need something from the sea — kelp, a sardine or two — just ask old Finnegan.',
    ],
    [
      'Once caught a fish so big, the photo weighed three pounds!',
      'Why don’t fish play basketball? Scared of the net! Ribbit!',
      'The tide’s in, the tide’s out... very indecisive, the tide.',
      'Biscuit tried to catch a crab yesterday. The crab won.',
      'Frogs don’t need to drink water, y’know. We soak it up through our skin. Handy on a hot day.',
    ],
    { nightLine: 'Night fishing’s the best. The stars jump right into the water to say hello.' },
  );
  if (!first && oncePerDay('gift:finnegan')) {
    if ((app.data?.day ?? 1) % 2 === 0) {
      await talk('finnegan', 'Caught a few too many sardines this morning — they’re yours! Good in a soup, I hear.');
      give('sardine', 2, { from: 'Finnegan gave you' });
    } else {
      await talk('finnegan', 'Here, take some kelp for your soup pot. I’d eat it myself, but I’m more of a fly frog.');
      give('kelp', 2, { from: 'Finnegan gave you' });
    }
  }
  if (!first && !puzzleSolved('finnegan-boat')) await talk('finnegan', 'Say — have you seen my toy racing boat in the tub by the beach? She’s itching for a skipper!');
});

// ------------------------------------------------------------------ Juniper (goat, garden stall)
onTalk('juniper', async () => {
  const first = await chat(
    'juniper',
    [
      'Oh hi hi hi! I’m Juniper! I grow things! Carrots, radishes, pumpkins — the works!',
      'You live in the cottage with the garden? Ooh, then you’ve got four empty plots just waiting for seeds!',
    ],
    [
      'Plants love it when you talk to them! I tell mine jokes. The corn thinks they’re a-maize-ing.',
      'Bleat-iful day, isn’t it?',
      'Goats can eat almost anything! But I prefer carrots. And your shoelaces. Kidding! Mostly.',
      'My bees are buzzing extra happily today. Must be the flowers in the meadow!',
      'Water your plants every day and they’ll be ready in no time!',
    ],
  );
  if (first) {
    await talk('juniper', 'Here — a welcome gift! Carrot seeds! Plant them in your garden and watch them grow!');
    give('seed-carrot', 3, { from: 'Juniper gave you' });
    give('seed-radish', 2, { quiet: true });
    return;
  }
  if (oncePerDay('gift:juniper')) {
    await talk('juniper', 'Ooh, and have a little honey from my bees! Sweet as sunshine.');
    give('honey', 1, { from: 'Juniper gave you' });
  }
  const crates = !puzzleSolved('juniper-crates');
  const pick = await ask('juniper', crates ? 'Need anything? (And — um — my wheelbarrow’s stuck behind the crates again...)' : 'Need anything for your garden?', [
    'Seeds & honey, please!',
    ...(crates ? ['We’ll free your wheelbarrow!'] : []),
    'Just saying hi',
  ]);
  if (pick === 0) await juniperStall();
  else if (crates && pick === 1) await juniperPuzzle();
});

// ------------------------------------------------------------------ Rocco (raccoon, clock stall) + his favour
registerQuest({
  id: 'roccos-gears',
  title: 'Rocco’s Missing Gears',
  icon: '⚙️',
  chapter: 'side',
  available: (d) => !!d.flags['met:rocco'],
  steps: [
    { id: 'find', text: 'Find 3 Tiny Clock Gears (Biscuit can dig them up)', done: (d) => (d.inventory['clock-gear'] ?? 0) >= 3 || !!d.flags['rocco:gears'], where: () => ({ map: 'tockwood', x: 30, y: 26 }) },
    { id: 'bring', text: 'Bring the gears to Rocco', done: flagDone('rocco:gears'), where: () => ({ map: 'tockwood', x: TW.rocco.x, y: TW.rocco.y + 1 }) },
  ],
});

onTalk('rocco', async () => {
  const first = await chat(
    'rocco',
    [
      'Wah! Oh — sorry, sorry, you startled me. I’m Rocco. I fix clocks. Well — I USED to fix clocks.',
      'Ever since the storm, every clock on the island runs backwards! Tick... tock... tock... tick. It’s driving me nuts. And raccoons LOVE nuts, so that’s saying something.',
      'If you find any tiny clock gears lying around — they fell out of the clocktower in the storm — could you bring me three? I have an idea...',
    ],
    [
      'Did you know the very first mechanical clocks didn’t have minute hands? Just an hour hand! Nobody was in a hurry back then.',
      'My paws are made for tinkering. And for washing snacks. Mostly snacks.',
      'Backwards clocks mean I’m getting younger, right? ...Right?',
      'Tick, tock! Tock, tick! Ugh.',
      'I built a clock that tells jokes. It’s always a little late with the punchline.',
      'I build furniture too, you know! Have a look at my stall — every piece handmade. Mostly paw-made.',
    ],
  );
  if (!first && !puzzleSolved('rocco-lock') && oncePerDay('hint:rocco-lock')) await talk('rocco', 'Oh, and if you’re good at codes... I locked my toolbox and forgot the gear code. It’s right there by my stall. Sigh.');
  if (first || flag('rocco:gears')) return;
  if (count('clock-gear') >= 3) {
    const pick = await ask('rocco', 'Are those... CLOCK GEARS? Three of them?!', ['They’re for you!', 'Not yet']);
    if (pick === 0) {
      take('clock-gear', 3);
      setFlag('rocco:gears');
      await cutscene(async () => {
        await talk('rocco', 'Yes yes YES! Hold on, hold on... *clink* *clank* *boing*...');
        audio.sfx('success');
        await wait(300);
        await talk('rocco', [
          'Ta-da! A Forward-Only Pocket Clock! It’s the only clock on the island that ticks the right way!',
          'Well — until you fix the Great Hourglass. Then they ALL will! Here, take some Tockens for your trouble.',
        ]);
      });
      giveTockens(30);
      befriend('rocco', 25);
    }
  }
});

// ------------------------------------------------------------------ Clover (bunny chef)
onTalk('clover', async () => {
  if (!flag('met:clover')) {
    await conversation(async () => {
      await talk('clover', [
        'Oh! Hello hello! Welcome to The Bubbling Burrow! I’m Clover — chef, soup-stirrer, and carrot enthusiast!',
        'Pip sent you? Then you know about the storm...',
        'My little cousins — the Hopkins bunnies — were playing hide-and-seek in the clocktower when the hourglass cracked. Whoosh! They tumbled right through the crack into history!',
        'All twelve of them, scattered all over time. Oh, I do hope they’re eating their vegetables.',
      ]);
      const pick = await ask('clover', 'If you find any of them on your adventures... will you bring them home?', ['We promise!', 'Of course, Clover!']);
      void pick;
      await talk('clover', [
        'Oh, thank you thank you! Grandma Hopkins will be so happy. She’s sitting by the warren in the meadow, waiting.',
        'And in return, I’ll teach you to brew magic soups in Grandma’s cauldron! It can do amazing things — soups that glow, soups that bounce...',
        'Bring me ingredients from anywhere — the garden, the beach, even other times — and we’ll cook up some magic!',
      ]);
    });
    setFlag('met:clover');
    befriend('clover', 15);
    return;
  }
  const cook = await ask('clover', 'What shall we do today?', ['Let’s cook soup!', 'Just chatting']);
  if (cook === 0) {
    await cookWithClover();
    return;
  }
  const bunniesHome = app.data?.bunnies.length ?? 0;
  const daily = [
    'Soup’s on! Well, almost. Soup’s... warming up.',
    'Grandma says a happy stir makes a happy soup.',
    'Carrot fact! Long ago most carrots were purple or yellow. Orange carrots became popular a few hundred years ago!',
    'Every ingredient has a story. Salt from the sea, dates from a palm tree, basil from a sunny garden...',
    bunniesHome ? `${bunniesHome} of my cousins are home now. The warren is getting so noisy — I love it!` : 'The warren is so quiet without my cousins...',
  ];
  await talk('clover', pickDaily('clover', daily));
  if (oncePerDay('chat:clover')) befriend('clover', 6);
  await offerSoupGift('clover');
});

onTalk('grandma', async () => {
  const n = app.data?.bunnies.length ?? 0;
  if (!flag('met:grandma')) {
    await talk('narrator', 'An old bunny in a lavender shawl rocks gently in her chair.');
    await talk('grandma', [
      'Oh my, visitors! Clover says you’re going to find my grandbunnies? Bless your whiskers.',
      'There are twelve of them, you know. Each one wearing whatever they found in their new time, I expect. Little rascals.',
    ]);
    setFlag('met:grandma');
    return;
  }
  if (!puzzleSolved('grandma-scarves')) {
    await grandmaPuzzle();
    return;
  }
  const line =
    n === 0
      ? 'The warren is so quiet without the little ones. I keep a carrot warm for each of them.'
      : n < 12
        ? `${n} home, ${12 - n} to go! Listen to all that giggling. My heart is as full as a carrot patch.`
        : 'Every last one of them, home safe. You wonderful, wonderful friends.';
  await talk('grandma', line);
  if (oncePerDay('chat:grandma')) befriend('grandma', 6);
  await offerSoupGift('grandma');
});

// ------------------------------------------------------------------ cottage: sleep in your bed
onUse('bed', async ({ world }) => {
  const d = app.data!;
  const late = nightAmount(d.minutes) > 0.3 || d.minutes < MORNING;
  const pick = await ask('narrator', late ? 'Snuggle into bed and sleep until morning?' : 'It’s still daytime... take a cozy nap until the next morning?', ['Sleep', 'Not yet']);
  if (pick !== 0) return;
  await cutscene(async () => {
    world.cameras.main.fadeOut(600, 30, 25, 60);
    await wait(900);
    sleepUntilMorning(d);
    world.buildDigSpots();
    app.events.emit('new-day', d.day);
    await app.saveNow();
    world.cameras.main.fadeIn(800, 255, 244, 224);
    await wait(500);
  });
  audio.sfx('chime');
  toast(`Good morning! ☀️ Day ${d.day}`, { icon: '🐓', ms: 3000 });
  world.biscuit?.bark();
});

// Placeholders that later chapters replace with the real screens.
onUse('mirror', async () => {
  openWardrobe({ shop: true });
});
onUse('wardrobe', async () => {
  openWardrobe();
});
onUse('planner', async ({ world }) => {
  await openPlanner(() => world.reloadRoom());
});
onUse('rocco-shop', async () => {
  await openStall(
    '🔨 Rocco’s Workshop',
    ROCCO_GOODS.map((f) => ({ id: f.id, price: f.price! })),
    'Handmade furniture for your cottage! Arrange it with the planner by your cottage door.',
  );
});
onUse('exhibit', async () => {
  const n = app.data?.museum.length ?? 0;
  await talk(
    'narrator',
    n
      ? `The display cases are filling up! ${n} treasure${n === 1 ? '' : 's'} on show, each with a little card: “Found by {players}”.`
      : 'An empty display case, polished and waiting for something wonderful. Dr. Quill keeps the first of every treasure you sell here.',
  );
});
