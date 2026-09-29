import { app } from '../app';
import { audio } from '../audio/audio';
import { talk } from '../ui/dialogue';
import { button, toast, ui } from '../ui/ui';
import { h } from '../ui/dom';
import { storybook } from '../ui/storybook';
import { grant } from '../core/wardrobe';
import { dance } from '../dance/openDance';
import { renderEndingPanel, ENDING_TEXT } from '../art/endingPanels';
import { cutscene, flag, onEnterMap, onTalkWhen, onUse, payout, setFlag, wait } from './hooks';
import { registerQuest } from './quests';
import type { SaveData } from '../core/state';
import type { WorldScene } from '../scenes/WorldScene';

/**
 * The finale. When all eight Time Sands are home, the Great Hourglass is whole again — and
 * every friend from every era comes through the portal for one big party on Tockwood's plaza:
 * the bunny hop with the rescued Hopkins cousins, then Clover's giant pot of celebration soup,
 * then the ending storybook. Afterwards Tockwood carries on: every era stays open to visit.
 */
export const ALL_SANDS = ['pirate', 'pirate-cousins', 'fifties', 'fifties-cousins', 'egypt', 'egypt-cousins', 'florence', 'florence-cousins'];

export function sandsHome(d: SaveData): number {
  return ALL_SANDS.filter((s) => d.flags[`sand:${s}:placed`]).length;
}

export function allSandsHome(d: SaveData): boolean {
  return sandsHome(d) === ALL_SANDS.length;
}

/** The friends who come to the party (and who's on the dance floor's audience). */
export const PARTY_GUESTS = ['marigold', 'cookie', 'pepper', 'rollo', 'duke', 'mabel', 'rosita', 'neb', 'ankhi', 'sesi', 'lucia', 'fiorella', 'orsola', 'beppe'];

/** The eighth sand is in: the Great Hourglass is whole (called from the hourglass in the clocktower). */
export async function restoreHourglass(world: WorldScene): Promise<void> {
  if (flag('hourglassRestored')) return;
  // (the hourglass and the party it starts, in one step: a break during the scene can't strand the ending)
  payout(['hourglassRestored', 'finale:party'], []);
  world.refreshHourglass();
  world.celebrate(6000);
  await cutscene(async () => {
    audio.sfx('fanfare');
    await talk('narrator', 'The eighth sand swirls into its socket... and the whole Great Hourglass begins to GLOW.');
    await talk('pip', [
      'It’s whole! It’s WHOLE! Listen — tick, tock, tick, tock! Every clock on the island is ticking the right way!',
      'History is flowing smoothly again. You did it — all of you. Even you, Biscuit.',
    ]);
    await talk('pip', ['And guess what? I sent a little message through time... EVERYONE wants to come and celebrate!', 'To the plaza — quick!']);
  });
}

// ------------------------------------------------------------------ the party on the plaza
onEnterMap('tockwood', async ({ world }) => {
  if (!flag('finale:party') || flag('finale:done') || flag('finale:welcomed')) return;
  setFlag('finale:welcomed');
  await cutscene(async () => {
    await wait(500);
    await talk('narrator', 'The plaza is FULL. Captains and cooks, builders and scribes, bowlers and painters — friends from every corner of history, all in one place!');
    await talk('marigold', 'Three cheers for the time travellers! Hip hip — HOORAY!');
    await talk('grandma', ['And every one of my grandbunnies came home safe. Thank you, dears.', 'Now — what does a party need? A BUNNY HOP! Everyone to the dance floor!']);
  });
  await finaleDance(world);
});

/** The bunny hop (the finale's dance) — then the soup and the ending. Also re-offered at the dance floor. */
export async function finaleDance(world: WorldScene): Promise<void> {
  const d = app.data!;
  if (!flag('finale:party') || flag('finale:done')) return;
  const paid = { show: () => undefined as void };
  const o = await dance({
    style: 'bunnyhop',
    audience: PARTY_GUESTS.slice(0, 6),
    bunnies: d.bunnies,
    title: '🐰 The Bunny Hop!',
    blurb: 'Everyone’s here — the whole of history and every Hopkins cousin. Hop left, hop right, kick, and the BIG bunny jump!',
    settle: () => {
      paid.show = payout(['finale:danced'], [{ clothes: 'party-hat' }, { clothes: 'party-bow' }], { title: '🎉 For the party' });
    },
  }, { retry: false });
  if (!o?.finished) {
    await talk('pip', 'Whenever you’re ready — the dance floor is waiting! (It’s right there on the plaza.)');
    return;
  }
  await soupAndEnding(world, paid.show);
}

/** Clover's celebration soup, then the ending (the giant pot offers it again if a break cut the party short). */
async function soupAndEnding(world: WorldScene, show?: () => void): Promise<void> {
  world.celebrate(6000);
  await cutscene(async () => {
    await talk('clover', ['What dancing! And now... the CELEBRATION SOUP! A little something from every time you visited:', 'Coconut from the Caribbean, dates from Egypt, sweet corn from Maple Street, basil from Florence — and a carrot from my garden, of course.']);
    await talk('narrator', 'Everyone takes a turn stirring the giant pot. Round and round, round and round... Biscuit supervises very closely.');
    audio.sfx('bubble');
    await talk('clover', 'A bowl for everyone! And a party hat to go with it!');
    await talk('pip', 'This is the best day in the whole history of history.');
  });
  await ending(show);
}

/**
 * The ending storybook, then the credits — then Tockwood carries on. The story is only "done" once
 * they're over: a break in the middle of the ending brings it back next time (from the giant pot).
 */
export async function ending(after?: () => void): Promise<void> {
  audio.music('title');
  await storybook(
    ENDING_TEXT.map((text, i) => ({ draw: () => renderEndingPanel(i), text })),
    { id: 'ending' },
  );
  if (!app.playing) return;
  await credits();
  if (!app.playing) return;
  setFlag('finale:done');
  void app.autosave.flush();
  audio.music('tockwood-day');
  after?.();
  toast('Every era is still open on the Map of Time — and your friends visit Tockwood often!', { icon: '🌀', ms: 5200 });
}

function credits(): Promise<void> {
  if (ui.has('credits')) return Promise.resolve();
  return new Promise((resolve) => {
    const close = () => {
      audio.sfx('close');
      ui.pop('credits');
      resolve();
    };
    const panel = h(
      'div',
      { class: 'panel credits-panel', attrs: { 'data-testid': 'credits' } },
      h('h2', null, '🐾 Pawprints Through Time'),
      h('p', null, 'A cozy time-travel adventure for one or two players.'),
      h(
        'ul',
        { class: 'credits-list small' },
        h('li', null, 'Story, characters, art and music: made fresh for this game — every drawing painted in code, every tune played by a tiny synthesizer.'),
        h('li', null, 'Starring Pip the time fairy, Biscuit the corgi, Clover and all twelve Hopkins cousins.'),
        h('li', null, 'With friends from the Golden Age of Piracy, Ancient Egypt, 1950s America and Renaissance Florence.'),
        h('li', null, 'And YOU — the time travellers who put history back together.'),
      ),
      h('p', { class: 'credits-thanks' }, 'Thank you for playing!'),
      h('div', { class: 'row end sticky-foot' }, button('Back to Tockwood', close, { icon: '🏡', autofocus: true, testid: 'credits-done' })),
    );
    ui.push({ id: 'credits', el: h('div', { class: 'center-wrap backdrop' }, panel), onBack: close, onClose: () => resolve() });
    audio.sfx('open');
  });
}

// ------------------------------------------------------------------ what everyone says at the party
const PARTY_LINES: Record<string, string[]> = {
  marigold: ['Ahoy, time travellers! The Sunny Marigold has never sailed so far. Worth every wave!'],
  cookie: ['Squeak! I brought ship’s biscuits for the soup. Dunk them — trust me!'],
  pepper: ['SQUAWK! Party! Party! Crew only — and today EVERYONE is crew!'],
  rollo: ['Cool party, pals! After the soup: bowling. That’s the rule.'],
  duke: ['What a turnout! Three-time champion of parties too, you know. Well — now it’s four.'],
  mabel: ['I skated all the way through the portal, hon! Milkshakes are on me.'],
  rosita: ['Everybody on the floor! Bunnies in front — they have the best hops!'],
  neb: ['A party this big needs a plan. I drew one. It says: DANCE.'],
  ankhi: ['I am writing all of this down. It will be the longest scroll in history.'],
  sesi: ['I baked bread for the whole island! Well — for the first half of the island.'],
  lucia: ['Rocco and I built a clock that plays the bunny hop. It is slightly too loud.'],
  fiorella: ['I must paint this! Hold still, everyone! ...Nobody is holding still.'],
  orsola: ['What a court you have, little ones! Even my palazzo has never seen a dance like this.'],
  beppe: ['Basil for the soup! Beans for later! Joy for everyone!'],
};
const partyOn = () => flag('finale:party') && !flag('finale:done');
for (const [id, lines] of Object.entries(PARTY_LINES))
  onTalkWhen(id, (ctx) => ctx.world.def.region === 'tockwood' && partyOn(), async () => {
    await talk(id, lines);
  });

/** The giant pot on the plaza (before the soup's ready). */
onUse('giant-pot', async ({ world }) => {
  if (!flag('finale:danced')) {
    await talk('clover', 'Not yet, not yet — first the BUNNY HOP! Then everyone gets a bowl.');
    return;
  }
  if (!flag('finale:done')) {
    await soupAndEnding(world);
    return;
  }
  await talk('clover', 'Mmm — celebration soup. There’s plenty more!');
});

// ------------------------------------------------------------------ the finale quest
registerQuest({
  id: 'finale',
  title: 'The Great Hourglass',
  icon: '⏳',
  chapter: 'finale',
  main: true,
  available: (d) => !!d.flags['sand:pirate:placed'],
  steps: [
    { id: 'sands', text: 'Bring all eight Time Sands home (one from each era’s story, and one from each era’s three cousins)', done: (d) => allSandsHome(d) && !!d.flags.hourglassRestored, where: () => ({ map: 'clocktower', x: 6.5, y: 5.4 }) },
    { id: 'party', text: 'Celebrate on the plaza with friends from every era', done: (d) => !!d.flags['finale:done'], where: () => ({ map: 'tockwood', x: 26.4, y: 22 }) },
  ],
  reward: 'The end of the story (and the start of many happy visits)',
  onComplete: () => undefined,
});
