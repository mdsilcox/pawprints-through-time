import { app } from '../app';
import { audio } from '../audio/audio';
import { renderPanel, OPENING_TEXT } from '../art/storybook';
import { talk, ask, conversation } from '../ui/dialogue';
import { storybook } from '../ui/storybook';
import { toast } from '../ui/ui';
import { TILE } from '../world/collision';
import { TW } from '../world/maps/tockwood';
import { registerQuest, type QuestDef } from './quests';
import { cutscene, flag, onEnterMap, onTalk, onUse, setFlag, wait, give, background } from './hooks';
import type { WorldScene } from '../scenes/WorldScene';

/**
 * The opening chapter: storybook intro -> ferry arrival -> Biscuit leads the way ->
 * meet Pip at the cracked Great Hourglass -> get ready (Clover, neighbours, first dig).
 */

export function playIntroStorybook(): Promise<void> {
  return storybook(OPENING_TEXT.map((text, i) => ({ draw: () => renderPanel(i), text })), { id: 'intro' });
}

export const NEIGHBOURS = ['quill', 'bramble', 'finnegan', 'juniper', 'rocco'];
export function metNeighbours(): number {
  return NEIGHBOURS.filter((n) => flag(`met:${n}`)).length;
}

const mainQuest: QuestDef = {
  id: 'crack-in-time',
  title: 'A Crack in Time',
  icon: '⌛',
  chapter: 'tockwood',
  main: true,
  available: () => true,
  steps: [
    { id: 'follow', text: 'Follow Biscuit to the clocktower', done: (d) => !!d.flags['visited:clocktower'], where: () => ({ map: 'tockwood', x: TW.clocktower.x, y: TW.clocktower.y + 0.5 }) },
    { id: 'pip', text: 'Talk to Pip in the clocktower', done: (d) => !!d.flags['met:pip'], where: () => ({ map: 'clocktower', x: 6.5, y: 7 }) },
    { id: 'clover', text: 'Visit Clover at The Bubbling Burrow', done: (d) => !!d.flags['met:clover'], where: () => ({ map: 'tockwood', x: TW.oak.x, y: TW.oak.y + 0.3 }) },
    {
      id: 'neighbours',
      text: 'Say hello to 3 neighbours',
      done: () => metNeighbours() >= 3,
      where: () => ({ map: 'tockwood', x: TW.rocco.x, y: TW.rocco.y + 1 }),
    },
    { id: 'dig', text: 'Dig up treasure with Biscuit', done: (d) => !!d.flags['dug:first'], where: () => ({ map: 'tockwood', x: 32.5, y: 27.5 }) },
    { id: 'ready', text: 'Tell Pip you’re ready to go', done: (d) => !!d.flags['portal:ready'], where: () => ({ map: 'clocktower', x: 6.5, y: 7 }) },
  ],
};
registerQuest(mainQuest);

// ------------------------------------------------------------------ arrival
onEnterMap('tockwood', async ({ world }) => {
  if (flag('met:biscuit')) return;
  await arrival(world);
});

async function arrival(world: WorldScene): Promise<void> {
  const p1 = world.players[0];
  await cutscene(async () => {
    const b = world.addBiscuit(TW.beach.x * TILE - TILE * 6, (TW.beach.y + 1) * TILE);
    b.state = 'stay';
    await talk('narrator', ['The little ferry toots goodbye and chugs away across the sparkly sea.', 'Welcome to Tockwood Isle!']);
    audio.sfx('bark');
    b.emote('exclaim', 900);
    await wait(300);
    // Biscuit zooms across the beach and up the dock
    await b.goTo(30.5 * TILE, 38.5 * TILE, TILE * 5.5);
    await b.goTo(p1.x - TILE * 0.2, p1.y - TILE * 0.9, TILE * 5);
    b.facing = 'down';
    b.play('happy');
    b.bark();
    b.emote('heart', 1600);
    await wait(500);
    await conversation(async () => {
      await talk('narrator', 'A corgi in a red bandana bounces up to you, wiggling from his nose all the way to his fluffy bottom!');
      await talk('biscuit', ['Woof! Woof woof!', 'Arf! *sniff sniff* ...Woof!']);
      await talk('narrator', 'His name tag says BISCUIT. He tugs at your sleeve, then scampers off toward town. He wants you to follow!');
    });
    b.play(null);
  });
  setFlag('met:biscuit');
  const b = world.biscuit!;
  // Biscuit trots ahead to the clocktower, pausing whenever you fall behind
  background(async () => {
    const path = [
      [30.5, 36],
      [30.5, 30],
      [30.5, 24.5],
      [30.5, 17.4],
    ];
    for (const [x, y] of path) {
      if (b.destroyed) return;
      await b.goTo(x * TILE, y * TILE, TILE * 3.6);
      for (let i = 0; i < 60 && !b.destroyed; i++) {
        const near = world.players.some((p) => Math.hypot(p.x - b.x, p.y - b.y) < TILE * 4.5);
        if (near) break;
        if (i % 12 === 0) {
          b.faceToward(world.players[0].x, world.players[0].y);
          b.bark();
        }
        await wait(250);
      }
    }
    if (!b.destroyed) {
      b.facing = 'down';
      b.play('sit');
      b.emote('exclaim', 1500);
      audio.sfx('bark');
    }
  });
}

// ------------------------------------------------------------------ the clocktower & Pip
onEnterMap('clocktower', async ({ world }) => {
  if (flag('met:pip')) return;
  await meetPip(world);
});

async function meetPip(world: WorldScene): Promise<void> {
  await cutscene(async () => {
    audio.sfx('chime');
    world.pip?.emote('exclaim', 1200);
    await wait(500);
    await conversation(async () => {
      await talk('pip', ['Oh! Oh my wings and whiskers — visitors! And Biscuit brought you! Good boy, Biscuit!']);
      await talk('biscuit', 'Woof!');
      await talk('pip', [
        'I’m Pip, the time fairy of Tockwood. I look after the Great Hourglass. Well... I DID.',
        'Last night a storm rattled the tower and — CRACK! — the hourglass broke, and all eight Time Sands flew off into history!',
        'Without them, the past is getting all tangled up. Pirates are popping up in the wrong centuries, the pyramid builders have lost their plans...',
        '...and listen! Tick... tock... tock... tick. Even our village clocks are running backwards!',
      ]);
      let pick = await ask('pip', 'Will {you} help me bring the Time Sands home?', ['Of course we will!', 'Um... time travel?!']);
      if (pick === 1) {
        await talk('pip', ['Don’t worry! I’ll open the way with my portal, and I’ll be right beside you.', 'And Biscuit has the best nose in all of history. He can sniff out Time Sand anywhere!']);
        pick = await ask('pip', 'So... will {you} help?', ['Yes! Let’s do it!']);
      }
      audio.sfx('success');
      await talk('pip', [
        'Hooray! Thank you, {players}!',
        'Mending time takes a little getting ready, though.',
        'First, visit Clover at The Bubbling Burrow — the round red door under the old oak. Her grandma’s cauldron makes the most magical soups... and her family needs help too.',
        'And say hello to the neighbours! Friends make every adventure better.',
        'Oh! And Biscuit can dig up buried treasure. Look for sparkly spots — or ask him to sniff with the B button!',
        'I’ll get the portal warmed up. Biscuit, show them around!',
      ]);
    });
  });
  setFlag('met:pip');
  setFlag('biscuit:companion');
  if (world.biscuit) world.biscuit.resumeFollow();
  toast('Biscuit is your companion now! He follows you everywhere.', { icon: '🐶', ms: 3200 });
}

onTalk('pip', async ({ world }) => {
  if (!flag('met:pip')) return meetPip(world);
  const ready = flag('met:clover') && metNeighboursDone() && flag('dug:first');
  if (!ready) {
    const todo: string[] = [];
    if (!flag('met:clover')) todo.push('visit Clover at The Bubbling Burrow');
    if (!metNeighboursDone()) todo.push(`say hello to ${3 - Math.min(3, countMet())} more neighbour${3 - countMet() === 1 ? '' : 's'}`);
    if (!flag('dug:first')) todo.push('dig up something with Biscuit');
    await talk('pip', ['The portal is warming up nicely!', `Before we go, remember to ${todo.join(', then ')}.`]);
    return;
  }
  if (!flag('portal:ready')) {
    await conversation(async () => {
      await talk('pip', ['You met Clover, made new friends AND Biscuit found treasure? You’re ready!', 'Watch this...']);
      audio.sfx('portal');
      setFlag('portal:ready');
      await talk('pip', [
        'The portal is ready! It can take us to any place the Time Sands fell.',
        'I can feel the first sand already... it smells like salt and sea breeze, and something about pirates!',
        'Step up to the portal ring whenever you’re ready to go.',
      ]);
    });
    return;
  }
  const lines = [
    'Tick, tock! The portal is humming whenever you’re ready.',
    'Did you know the Great Hourglass has eight sockets, one for each Time Sand? We’ll fill them all!',
    'If you ever get stuck on a puzzle, call on me — I have hints! Just not too many, or your brain gets lazy.',
    'Remember to take breaks! Even time fairies need a stretch.',
  ];
  await talk('pip', lines[(app.data?.day ?? 0) % lines.length]);
});

function countMet(): number {
  return metNeighbours();
}
function metNeighboursDone(): boolean {
  return metNeighbours() >= 3;
}

onUse('hourglass', async () => {
  const n = app.data?.sands.length ?? 0;
  await talk('narrator', [
    n === 0
      ? 'The Great Hourglass. A jagged crack runs down the glass, and all eight sand sockets around the top are empty.'
      : `The Great Hourglass. ${n} of its 8 sockets glow with Time Sand.`,
  ]);
});

onUse('portal', async ({ world }) => {
  if (!flag('portal:ready')) {
    await talk('narrator', 'A great stone ring covered in little stars. It hums very quietly... but it isn’t awake yet.');
    return;
  }
  // The portal opens the world map (the eras arrive in later chapters)
  app.events.emit('open-portal-map', world);
});

// Pip's first gift: a welcome snack for Biscuit
onEnterMap('clocktower', async () => {
  if (flag('met:pip') && !flag('gift:welcome')) {
    setFlag('gift:welcome');
    give('carrot', 2, { from: 'Pip found these in her pocket' });
  }
});
