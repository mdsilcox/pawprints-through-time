import { app } from '../app';
import { audio } from '../audio/audio';
import { ask, conversation, talk } from '../ui/dialogue';
import { toast } from '../ui/ui';
import { learnNote } from '../ui/notesScreen';
import { equip, grant, owns } from '../core/wardrobe';
import { input } from '../input/input';
import { CLOTHES_BY_ID } from '../data/clothes';
import { hasEffect } from '../soup/effects';
import { bowl } from '../bowling/openBowling';
import { dance } from '../dance/openDance';
import { openStall } from '../ui/stallShop';
import { befriend, count, cutscene, flag, give, oncePerDay, onEnterMap, onTalk, onUse, payout, registerNpcName, setFlag, take, wait } from './hooks';
import { registerQuest } from './quests';
import { rescueBunny } from './pirateChapter';
import { HOPKINS_BY_ID } from '../data/bunnies';
import type { WorldScene } from '../scenes/WorldScene';

for (const [id, name] of Object.entries({ rollo: 'Rollo', duke: 'Duke', mabel: 'Mabel', rosita: 'Rosita' })) registerNpcName(id, name);

/**
 * Chapter 2: 1950s America (Maple Street, around 1957). The Time Sand has landed in the
 * Starlight Junior Cup — the bowling trophy of tonight's tournament. Borrow bowling shoes, beat
 * Duke (the three-time champion) in a ten-frame final, then celebrate at the diner's sock hop.
 * Along the way: three Hopkins cousins, a skating waitress and the best jukebox in town.
 */
const activePlayers = (): (0 | 1)[] => (input.twoPlayer ? [0, 1] : [0]);
const wearingEra = (p: 0 | 1, slot: 'shoes' | 'any' = 'any') =>
  Object.entries(app.data!.players[p].outfit).some(([s, w]) => !!w && (slot === 'any' || s === slot) && CLOTHES_BY_ID.get(w.id)?.era === 'fifties');
const allInBowlingShoes = () => activePlayers().every((p) => wearingEra(p, 'shoes'));
const onWheels = () => activePlayers().some((p) => app.data!.players[p].outfit.shoes?.id === 'roller-skates') || hasEffect('zoom');

function wearShoes(id: string): void {
  const d = app.data!;
  for (const p of activePlayers()) {
    equip(d, p, id, 0);
    app.events.emit('outfit-changed', p);
  }
  app.autosave.request();
}

// ------------------------------------------------------------------ arriving on Maple Street
onEnterMap('fifties', async () => {
  if (flag('maple:arrived')) return;
  const show = payout(['maple:arrived'], [{ note: 'fifties-rock' }]);
  await cutscene(async () => {
    await wait(400);
    await talk('narrator', 'Whoosh! Warm pavement, shiny cars, and music drifting out of every doorway...');
    await talk('pip', [
      'We’re in America in the 1950s — a little town around the year 1957!',
      'Hear that? Rock and roll! Everybody’s crazy about it here.',
      'And the Time Sand... I can feel it glowing somewhere near that big sparkly sign. STARLIGHT LANES!',
    ]);
  });
  show();
});

// ------------------------------------------------------------------ the Starlight Lanes
onTalk('rollo', async ({ world }) => {
  const d = app.data!;
  if (world.def.region === 'tockwood') {
    const pick = await ask('rollo', oncePerDay('chat:rollo-home') ? 'Welcome to Tockwood Lanes, pals! My new lanes, your new home court. Bowl a game?' : 'Fancy a game?', ['Let’s bowl!', 'Just saying hi']);
    if (pick === 0) await bowl({ alley: 'tockwood', rival: { id: 'rollo', skill: 0.45 }, title: '🎳 Tockwood Lanes', blurb: 'A friendly game against Rollo — or bowl on your own in two-player mode!', tricks: true });
    return;
  }
  if (!flag('met:rollo')) {
    await conversation(async () => {
      await talk('rollo', [
        'Well, howdy! Welcome to the Starlight Lanes — best bowling this side of the Mississippi!',
        'You’re just in time: tonight’s the Starlight Junior Cup!',
        'And get this — during last night’s wild storm, a handful of glowing sand landed right inside the trophy. Folks say it hums!',
      ]);
      await talk('pip', 'That’s our Time Sand! We have to win that cup...');
      await talk('rollo', ['Then you’ll bowl against Duke in the final. He’s won three years running!', 'But house rules first: nobody bowls on my lanes in street shoes. Pick up a pair at the shoe counter!']);
    });
    setFlag('met:rollo');
    befriend('rollo', 10);
    learnNote('fifties-pinsetter');
    return;
  }
  if (!flag('lanes:shoes')) {
    await talk('rollo', 'Bowling shoes first, pal — the shoe counter’s right behind me!');
    return;
  }
  if (!flag('cup:won')) {
    await talk('rollo', ['Step up to lane two whenever you’re ready!', 'Tip: stand a little to the right and roll into the “pocket” — just beside the front pin.']);
    return;
  }
  const lines = ['That was the best final we’ve had in years!', 'Did you know machines set up the pins now? When I was a kid, “pinboys” did it by hand!', 'Keep those shoes — they suit you.'];
  await talk('rollo', lines[d.day % lines.length]);
  if (oncePerDay('chat:rollo')) befriend('rollo', 6);
});

onUse('shoes', async () => {
  const d = app.data!;
  if (!flag('met:rollo')) {
    await talk('narrator', 'Rows of two-tone bowling shoes, polished and ready.');
    return;
  }
  const had = owns(d, 'saddle-shoes');
  const fresh = [grant(d, 'saddle-shoes') && 'Saddle Shoes', grant(d, 'cuffed-jeans') && 'Cuffed Jeans'].filter(Boolean);
  if (fresh.length) {
    toast(`You got ${fresh.join(' and ')}! (Wardrobe)`, { icon: '👞' });
    app.autosave.request();
  }
  if (allInBowlingShoes()) {
    setFlag('lanes:shoes');
    await talk('rollo', 'Lookin’ sharp! Now you’re ready to bowl.');
    return;
  }
  await talk('rollo', had ? 'Swap into those saddle shoes and you’re good to go!' : 'Here you go — two-tone saddle shoes, the finest in 1957! And cuffed jeans, rolled up just so. Very bowler.');
  const pick = await ask('pip', 'Shall we put them on?', ['Yes, lace them up!', 'I’ll use the Wardrobe']);
  if (pick === 0) {
    wearShoes('saddle-shoes');
    setFlag('lanes:shoes');
    await talk('rollo', 'Lookin’ sharp! Now you’re ready to bowl.');
  } else await talk('pip', 'Open the Wardrobe from the pause menu — any 1950s shoes will do!');
});

onTalk('duke', async () => {
  if (!flag('met:duke')) {
    await talk('duke', ['Name’s Duke. Captain of the Alley Cats and three-time Junior Cup champ.', 'You bowl? Guess we’ll see tonight. May the best bowler win!']);
    setFlag('met:duke');
    befriend('duke', 5);
    return;
  }
  if (flag('cup:won')) {
    await talk('duke', ['You beat me fair and square. Next year, though... watch out!', 'Hey — see you at the sock hop?']);
    if (oncePerDay('chat:duke')) befriend('duke', 6);
    return;
  }
  await talk('duke', flag('cup:tried') ? 'Good game! Want a rematch? Lane two’s waiting.' : 'Warming up? Lane two, whenever you’re ready.');
});

onUse('trophy', async () => {
  if (flag('cup:won')) {
    await talk('narrator', 'The trophy case: a photo of tonight’s winners is already tucked beside the cup!');
    return;
  }
  await talk('narrator', ['The Starlight Junior Cup: a shining star on a golden cup.', 'Inside it, a swirl of purple sand glows and hums like a lullaby.']);
});

onUse('lanes-bowl', async ({ world }) => {
  if (!flag('met:rollo')) {
    await talk('rollo', 'Whoa there, pal — come say hi at the counter first!');
    return;
  }
  if (!allInBowlingShoes()) {
    await talk('rollo', 'Bowling shoes first, pal — house rules! The shoe counter’s by me.');
    return;
  }
  if (flag('cup:won')) {
    await bowl({ alley: 'starlight', rival: null, title: '🎳 A friendly game', blurb: 'The lanes are yours — bowl a game for fun!', tricks: true });
    return;
  }
  const pick = await ask('rollo', 'The Starlight Junior Cup final: you against Duke. Ready?', ['Let’s bowl!', 'Practice game first', 'Not yet']);
  if (pick === 1) {
    await bowl({ alley: 'starlight', rival: null, title: '🎳 Practice game', blurb: 'Warm up! Step, aim, pick your power — and curve it while it rolls.', tricks: true });
    return;
  }
  if (pick !== 0) return;
  setFlag('cup:tried');
  const losses = Number(app.data!.flags['cup:losses'] ?? 0);
  // the Cup and everything that comes with it land the moment Duke is beaten — then the ceremony
  const paid = { show: () => undefined as void };
  const o = await bowl({
    alley: 'starlight',
    // (Duke gets a little wobblier after every loss — nobody's first cup should be out of reach)
    rival: { id: 'duke', skill: dukeSkill(losses) },
    title: '🏆 The Starlight Junior Cup',
    blurb: 'The final! Beat Duke’s score to win the cup.',
    tip: POCKET_TIP,
    guide: losses > 0,
    settle: () => {
      paid.show = payout(
        ['cup:won'],
        [
          { sand: 'fifties' },
          { item: 'starlight-cup' },
          { item: 'bowling-pin' },
          { clothes: 'bowling-shirt' },
          { clothes: 'letter-jacket' },
          { tockens: 40 },
          { friend: 'rollo', pts: 20 },
          { friend: 'duke', pts: 15 },
        ],
        { title: '🏆 The Starlight Junior Cup!', world },
      );
    },
  });
  if (!o?.finished) return;
  if (!o.won) {
    setFlag('cup:losses', losses + 1);
    await talk('duke', ['Good game! Rematch? Lane two’s all yours whenever you want.']);
    await talk('rollo', losses === 0 ? 'Psst — see the glowing arrow on the lane next time? Stand there and roll into the pocket!' : 'You’re getting closer every game, pals. Keep rolling into that pocket!');
    return;
  }
  world.celebrate(7000);
  await cutscene(async () => {
    audio.sfx('fanfare');
    await talk('rollo', ['WE HAVE NEW CHAMPIONS! The Starlight Junior Cup goes to... {players}!']);
    await talk('duke', ['Aw, shucks. You earned it. Congratulations!', 'Here — Alley Cats letter jackets. Every champion needs one!']);
    await talk('narrator', 'Rollo lifts the cup out of the trophy case... and the glowing sand rises out of it!');
    world.setPropTexture('trophy', 'fur-trophycase-empty');
    await world.raiseTimeSand(2.2, 3.4);
    await talk('rollo', 'Take the cup home, champs — and Starlight Lanes bowling shirts to go with it!');
    await talk('pip', ['The second Time Sand! Hooray!', 'And listen — everyone’s going to the sock hop at the diner to celebrate. Let’s go!']);
  });
  paid.show();
});

const POCKET_TIP = 'Stand a little to the right of the middle and roll into the “pocket”, just beside the front pin.';
/** Duke's skill for the Cup: a notch wobblier after each loss (he's a good sport about it). */
export function dukeSkill(losses: number): number {
  return Math.max(0, 0.25 - 0.07 * losses);
}

// ------------------------------------------------------------------ the Rock-a-Roll Diner
onTalk('mabel', async ({ world }) => {
  const d = app.data!;
  if (!flag('met:mabel')) {
    await talk('mabel', [
      'Welcome to the Rock-a-Roll Diner, hon! Burgers, milkshakes, and the best jukebox in town.',
      'Scoot around on those wheels, why don’t you — I skate my orders to every booth!',
    ]);
    learnNote('fifties-diner');
    setFlag('met:mabel');
  }
  if (!flag('dot:found')) {
    if (!flag('mabel:milk')) {
      if (count('milk') > 0) {
        take('milk', 1);
        const show = payout(['mabel:milk', 'dot:told'], [{ clothes: 'sock-hop-cap' }], { title: '🥤 Mabel gave you' });
        await talk('mabel', [
          'Milk! You’re a lifesaver, hon. Now I can make milkshakes again!',
          'And a soda jerk cap for that sweet pup of yours — every milkshake needs a helper!',
          'Say... a teeny bunny in a headscarf has been helping in my kitchen. So shy! She hides in the pantry whenever the bell rings.',
        ]);
        show();
        return;
      }
      await talk('mabel', ['Oh, hon, I’m all out of milk for the milkshakes! The milk truck’s parked right out on Maple Street...', 'Bring me a bottle and I’ll tell you a secret. A fuzzy little secret.']);
      return;
    }
    await talk('mabel', 'Check the pantry, hon — gently! She’s shy.');
    return;
  }
  // Zippy the speedy skater
  if (!d.bunnies.includes('zippy') && !owns(d, 'roller-skates')) {
    await talk('mabel', ['That little speedster on skates? Nobody on two feet can catch him!', 'Here — borrow a pair of my roller skates. On wheels, you’ll be just as zippy!']);
    grant(d, 'roller-skates');
    toast('You got Roller Skates! (Wardrobe → Shoes)', { icon: '🛼' });
    const pick = await ask('pip', 'Put the skates on?', ['Wheee — yes!', 'Maybe later']);
    if (pick === 0) wearShoes('roller-skates');
    return;
  }
  const lines = ['Order up! ...Oh, you’re not an order. Hi, hon!', 'Milkshakes taste better when you skate them over. Science!', 'Put a coin in the jukebox — it’s free today!'];
  await talk('mabel', lines[d.day % lines.length]);
  if (oncePerDay('chat:mabel')) befriend('mabel', 6);
  void world;
});

onUse('milk-truck', async () => {
  if (!oncePerDay('milk-truck')) {
    await talk('narrator', 'The milkman has already been round today. Fresh bottles again tomorrow!');
    return;
  }
  audio.sfx('pickup');
  give('milk', 1, { from: 'The milkman handed you' });
});

onUse('farm-stand', async () => {
  await openStall(
    '🌽 Maple Street Farm Stand',
    [
      { id: 'tomato', price: 3 },
      { id: 'corn', price: 3 },
    ],
    'Fresh from the farms outside town. Tomato soup and corn on the cob — 1950s favourites!',
  );
});

onUse('jukebox', async () => {
  audio.sfx('select');
  await talk('narrator', ['The jukebox glows and bubbles. You pick a song — a little arm lifts a record onto the turntable... and it plays!']);
  learnNote('fifties-records');
  if (!flag('jukebox:record')) {
    setFlag('jukebox:record');
    give('jukebox-record', 1, { from: 'Mabel slides you a spare record:' });
  }
});

onUse('pantry', async ({ world }) => {
  if (flag('dot:found') || app.data!.bunnies.includes('dot')) {
    await talk('narrator', 'Shelves of flour, sugar and jars of cherries. Mmm.');
    return;
  }
  if (!flag('dot:told')) {
    await talk('narrator', 'The pantry door is closed. Something small rustles behind it...');
    return;
  }
  setFlag('dot:found');
  audio.sfx('door');
  world.spawnLostBunny({ id: 'dot', kind: 'lostbunny', x: 1.9, y: 5.6, p: { id: 'dot' } });
  await talk('narrator', 'You open the pantry door very gently... and a little bunny in a headscarf peeks out!');
});

onTalk('rosita', async ({ world }) => {
  const d = app.data!;
  if (world.def.region === 'tockwood') {
    const pick = await ask('rosita', 'Hello, dancers! Shall we dance on the plaza floor?', ['Let’s dance!', 'Just saying hi']);
    if (pick === 0) {
      const styles = ['sockhop', 'jig', ...(d.flags['crew:respect'] ? ['hornpipe'] : [])];
      await dance({ style: styles[d.day % styles.length], audience: ['rosita', 'rollo'], bunnies: d.bunnies.slice(0, 6) });
    }
    return;
  }
  if (!flag('cup:won')) {
    await talk('rosita', ['Hi there! I’m Rosita — I teach dancing at the sock hops.', 'Tonight there’s a big one here, right after the Starlight Cup. Win that cup and come celebrate!']);
    setFlag('met:rosita');
    return;
  }
  if (!flag('sockhop:danced')) {
    await talk('rosita', ['The champions are here! Everybody, shoes off — socks on! It’s a SOCK HOP!']);
    learnNote('fifties-sockhop');
    const paid = { show: () => undefined as void };
    const o = await dance(
      {
        style: 'sockhop',
        audience: ['mabel', 'duke', 'rollo'],
        bunnies: d.bunnies.slice(0, 4),
        title: '💃 The Sock Hop!',
        blurb: 'The whole diner is dancing — twist, stroll and hand-jive to the rock and roll!',
        settle: () => {
          paid.show = payout(
            ['sockhop:danced', 'rosita:invited'],
            [{ item: 'jukebox' }, { clothes: 'poodle-skirt' }, { clothes: 'cateye-glasses' }, { clothes: 'pearls' }, { friend: 'rosita', pts: 20 }],
            { title: '💃 From the sock hop', world },
          );
        },
      },
      { retry: false },
    );
    if (!o?.finished) return;
    await cutscene(async () => {
      await talk('rosita', ['What dancing! You kids are naturals.', 'Here — poodle skirts and cat-eye glasses, so you can twirl like a real 1950s dancer!', 'Say... I’d love to teach dancing somewhere brand new. Is your Tockwood a dancing kind of town?']);
      await talk('pip', 'The MOST dancing kind of town! There’s a dance floor right on the plaza.');
      await talk('rosita', 'Then save me a spot — I’ll be there!');
      await talk('mabel', ['Before you go, hon — take our spare jukebox home. Every home needs music!', 'And some pop-bead pearls. Sock hop style!']);
    });
    paid.show();
    // someone else was twirling to the music...
    if (!d.bunnies.includes('poppy')) world.spawnLostBunny({ id: 'poppy', kind: 'lostbunny', x: 8.6, y: 7.4, p: { id: 'poppy' } });
    return;
  }
  await talk('rosita', 'Keep dancing, darlings! See you in Tockwood!');
});

// ------------------------------------------------------------------ the three Hopkins cousins of the 1950s
async function cousin(id: string, world: WorldScene, extra?: () => Promise<void>): Promise<void> {
  const hb = HOPKINS_BY_ID.get(id)!;
  await conversation(async () => {
    await talk(`hop-${id}`, hb.found);
    await talk('pip', ['Another Hopkins cousin! Home you go — the warren is waiting.']);
  });
  if (extra) await extra();
  await rescueBunny(id, world);
}

onTalk('lost:poppy', async ({ world }) => cousin('poppy', world));
onTalk('lost:dot', async ({ world }) =>
  cousin('dot', world, async () => {
    await talk('hop-dot', 'Th-thank you... Here — a spare headscarf. Polka dots, just like mine!');
    payout([], [{ clothes: 'headscarf' }], { title: '🐰 Dot gave you' })();
  }),
);
onTalk('lost:zippy', async ({ world }) => {
  if (!onWheels()) {
    await talk('hop-zippy', 'Wheee! Can’t catch me! Nobody’s as fast as me — unless they’re on wheels too!');
    if (!owns(app.data!, 'roller-skates')) await talk('pip', 'He’s SO fast. Maybe Mabel has some roller skates we could borrow?');
    else await talk('pip', 'Let’s put on those roller skates! (Pause → Wardrobe → Shoes)');
    return;
  }
  world.stopSkating('zippy');
  await cousin('zippy', world);
});

// ------------------------------------------------------------------ Tockwood Lanes (open once the 1950s sand is home)
onUse('tlanes-bowl', async () => {
  const pick = await ask('rollo', 'Lane’s open, pals! Bowl against me, or just among yourselves?', ['Against Rollo!', 'Just us', 'Not now']);
  if (pick === 2 || pick < 0) return;
  await bowl({ alley: 'tockwood', rival: pick === 0 ? { id: 'rollo', skill: 0.45 } : null, title: '🎳 Tockwood Lanes', tricks: true });
});

// ------------------------------------------------------------------ quests
registerQuest({
  id: 'fifties-sand',
  title: 'The Starlight Junior Cup',
  icon: '🎳',
  chapter: 'fifties',
  main: true,
  available: (d) => !!d.flags['maple:arrived'],
  steps: [
    { id: 'lanes', text: 'Follow the sparkle to the Starlight Lanes', done: (d) => !!d.flags['met:rollo'], where: () => ({ map: 'fifties', x: 33, y: 11.4 }) },
    { id: 'shoes', text: 'Borrow bowling shoes — house rules!', done: (d) => !!d.flags['lanes:shoes'] || !!d.flags['cup:won'], where: () => ({ map: 'lanes', x: 13.6, y: 5 }) },
    { id: 'cup', text: 'Win the Starlight Junior Cup against Duke', done: (d) => !!d.flags['cup:won'], where: () => ({ map: 'lanes', x: 8, y: 7.4 }) },
    { id: 'sockhop', text: 'Celebrate at the sock hop in the Rock-a-Roll Diner', done: (d) => !!d.flags['sockhop:danced'], where: () => ({ map: 'diner', x: 9.6, y: 6.2 }) },
    { id: 'home', text: 'Bring the Time Sand home to the Great Hourglass', done: (d) => !!d.flags['sand:fifties:placed'], where: () => ({ map: 'clocktower', x: 6.5, y: 5.4 }) },
  ],
  reward: '+50 Tockens',
  onComplete: (d) => {
    d.tockens += 50;
  },
});

registerQuest({
  id: 'fifties-bunnies',
  title: 'Cousins on Maple Street',
  icon: '🐰',
  chapter: 'fifties',
  available: (d) => !!d.flags['maple:arrived'],
  steps: [
    { id: 'poppy', text: 'Find the twirling cousin where the music plays', done: (d) => d.bunnies.includes('poppy'), where: () => ({ map: 'diner', x: 8.6, y: 7.4 }) },
    { id: 'zippy', text: 'Catch the speedy cousin on wheels', done: (d) => d.bunnies.includes('zippy'), where: () => ({ map: 'diner', x: 5, y: 7.4 }) },
    { id: 'dot', text: 'Ask the diner’s friendly cat about a shy cousin', done: (d) => d.bunnies.includes('dot'), where: () => ({ map: 'diner', x: 7.6, y: 5.3 }) },
  ],
  reward: '+20 Tockens',
  onComplete: (d) => {
    d.tockens += 20;
  },
});
