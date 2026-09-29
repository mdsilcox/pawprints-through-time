import { app } from '../app';
import { audio } from '../audio/audio';
import { ITEM_BY_ID } from '../data/items';
import { ask, conversation, talk } from '../ui/dialogue';
import { toast } from '../ui/ui';
import { openCauldron } from '../ui/cauldron';
import { openStall } from '../ui/stallShop';
import { CROP_BY_SEED, GARDEN_CROPS, gameNow, GROW_MINUTES, harvest, plant, plotInfo, water } from '../soup/garden';
import { FAVOURITE_SOUP, SOUP_BY_ID, soupItemId } from '../soup/recipes';
import { learnClue, magicDiscovered, soupsHeld } from '../soup/kitchen';
import { befriend, flag, give, npcName, oncePerDay, onEnterMap, onUse, payout, setFlag, take } from './hooks';
import { hasEffect } from '../soup/effects';
import { registerQuest } from './quests';
import type { WorldScene } from '../scenes/WorldScene';

/**
 * Magic soup in Tockwood: the cottage garden, clover in the meadow, Juniper's stall, Grandma's
 * cauldron at the Bubbling Burrow (with Clover as your teacher) and soup gifts for neighbours.
 */

// ------------------------------------------------------------------ garden plots
onUse('plot', async ({ world, objectId }) => {
  const d = app.data!;
  const i = Number(String(objectId ?? 'plot-0').split('-')[1] ?? 0);
  const p = d.garden[i];
  const now = gameNow(d);
  const info = plotInfo(p, now);
  if (info.state === 'empty') {
    const seeds = GARDEN_CROPS.filter((c) => (d.inventory[c.seed] ?? 0) > 0);
    if (!seeds.length) {
      await talk('narrator', 'A little garden plot of soft, dark soil. You need seeds to plant — Juniper sells them at her stall!');
      return;
    }
    const opts = seeds.slice(0, 3).map((c) => `Plant ${ITEM_BY_ID.get(c.seed)!.name.replace(' Seeds', '').toLowerCase()} seeds`);
    const pick = await ask('narrator', 'What shall we plant here?', [...opts, 'Not now']);
    if (pick >= seeds.length || pick >= 3) return;
    const crop = seeds[pick];
    take(crop.seed, 1);
    plant(p, crop.seed, now);
    setFlag('garden:planted');
    audio.sfx('dig');
    refreshGarden(world);
    await talk('narrator', 'Planted! Now give the seeds a drink of water to help them grow.');
    await waterPlot(world, i);
    return;
  }
  if (info.state === 'thirsty') {
    await waterPlot(world, i);
    return;
  }
  if (info.state === 'growing') {
    const hours = Math.max(1, Math.ceil(((1 - info.progress) * GROW_MINUTES) / 60));
    await talk('narrator', `The ${p.seed} is growing nicely! About ${hours} more hour${hours === 1 ? '' : 's'} to go — or sleep in your bed and it’ll be ready by morning.`);
    return;
  }
  const got = harvest(p, now);
  if (got) {
    audio.sfx('pickup');
    give(got.crop, got.n, { from: 'You harvested' });
    setFlag('garden:harvested');
    refreshGarden(world);
  }
});

async function waterPlot(world: WorldScene, i: number): Promise<void> {
  const d = app.data!;
  const pick = await ask('narrator', 'Water the seeds?', ['Splish splash!', 'Not now']);
  if (pick !== 0) return;
  if (water(d.garden[i], gameNow(d))) {
    audio.sfx('splash');
    setFlag('garden:watered');
    refreshGarden(world);
    toast('Watered! Ready in about 6 hours (or tomorrow morning).', { icon: '💧' });
  }
}

function refreshGarden(world: WorldScene): void {
  world.refreshPlots?.();
  app.autosave.request();
}

// ------------------------------------------------------------------ clover patches in the meadow
onUse('clover', async ({ objectId }) => {
  if (!oncePerDay(`clover:${objectId}`)) {
    await talk('narrator', 'You’ve picked this patch today. Clover grows back overnight!');
    return;
  }
  audio.sfx('pickup');
  give('clover-leaf', 2, { from: 'You picked' });
});

// ------------------------------------------------------------------ the cauldron
export async function cookWithClover(): Promise<void> {
  const d = app.data!;
  if (!flag('soup:intro')) {
    await conversation(async () => {
      await talk('clover', [
        'Ooh, you want to try Grandma’s cauldron? Wonderful!',
        'Here’s how it works: pick three ingredients, then stir to the bubbly beat. The three things you choose decide the soup!',
        'Grandma wrote her recipes as riddles. Here’s the first one...',
      ]);
      learnClue('glowbroth', 'clover');
      await talk('clover', [
        '“Something that grows in the dark, something from the sea, and something that grows under the ground.”',
        'And here’s a little something to start you off!',
      ]);
    });
    give('glowcap', 1, { quiet: true });
    give('kelp', 1, { quiet: true });
    give('carrot', 2, { from: 'Clover gave you' });
    setFlag('soup:intro');
  }
  const res = await openCauldron();
  if (!res) return;
  if (res.isNew && !res.soup.silly) {
    audio.sfx('cheer');
    await talk('clover', res.soup.id === 'glowbroth' ? 'GLOWBROTH! Your very first magic soup! Grandma would be so proud!' : `${res.soup.name}! Ooh, I’ll write that in the book!`);
  } else if (res.isNew && res.soup.silly) {
    await talk('clover', res.neededTwo ? 'Hee hee — wobbly! That pot wanted two spoons stirring together.' : `A silly soup! ${res.soup.name}! Every cook makes those. It’s how you learn!`);
  }
  // Clover shares her next recipe once you've made your first magic soup
  if (magicDiscovered().length >= 1 && learnClue('hopscotch-chowder', 'clover')) {
    await talk('clover', ['You’re a natural! Here’s another of Grandma’s riddles:', `“${SOUP_BY_ID['hopscotch-chowder'].clue}”`]);
  }
  void d;
}

onUse('cauldron', async () => {
  if (!flag('met:clover')) {
    await talk('narrator', 'A big old cauldron, bubbling gently. Maybe the cook who lives here can show you how it works.');
    return;
  }
  await cookWithClover();
});

// ------------------------------------------------------------------ Juniper's stall
export async function juniperStall(): Promise<void> {
  await openStall(
    '🌱 Juniper’s Garden Stall',
    [...GARDEN_CROPS.map((c) => ({ id: c.seed, price: c.price })), { id: 'honey', price: 4 }],
    'Seeds for your cottage garden and honey from Juniper’s bees. Plant, water, and harvest in about 6 hours!',
  );
}

// ------------------------------------------------------------------ soup gifts
/** After chatting: if you carry soup, you can give some (once a day per neighbour). */
export async function offerSoupGift(npc: string): Promise<void> {
  const d = app.data!;
  const soups = soupsHeld();
  if (!soups.length || d.lastGift[npc] === d.day) return;
  const shown = soups.slice(0, 3);
  const pick = await ask(npc, 'Mmm… is that soup I smell?', [...shown.map((s) => `Give ${s.name}`), 'Not today']);
  if (pick >= shown.length) return;
  const s = shown[pick];
  take(soupItemId(s.id), 1);
  d.lastGift[npc] = d.day;
  const fav = FAVOURITE_SOUP[npc] === s.id;
  const show = payout(['soup:gifted', ...(fav ? [`fav:${npc}`] : [])], [{ friend: npc, pts: fav ? 40 : 12 }], { title: `🍲 ${npcName(npc)} loved it` });
  if (fav) {
    audio.sfx('cheer');
    await talk(npc, `${s.name}?! That’s my FAVOURITE! How did you know?`);
  } else {
    await talk(npc, `${s.name}! How kind of you. Slurp!`);
  }
  show();
  void npcName;
}

// ------------------------------------------------------------------ quest: Soup's On!
registerQuest({
  id: 'soups-on',
  title: 'Soup’s On!',
  icon: '🍲',
  chapter: 'side',
  available: (d) => !!d.flags['met:clover'],
  steps: [
    { id: 'plant', text: 'Plant seeds in your cottage garden', done: (d) => !!d.flags['garden:planted'], where: () => ({ map: 'tockwood', x: 9, y: 15 }) },
    { id: 'brew', text: 'Brew a soup in Grandma’s cauldron', done: (d) => !!d.flags['soup:brewed'], where: () => ({ map: 'burrow', x: 6.5, y: 6.2 }) },
    { id: 'harvest', text: 'Harvest something you grew', done: (d) => !!d.flags['garden:harvested'], where: () => ({ map: 'tockwood', x: 9, y: 15 }) },
    { id: 'three', text: 'Discover 3 magic soup recipes', done: (d) => d.recipes.filter((r) => !SOUP_BY_ID[r]?.silly).length >= 3, where: () => ({ map: 'burrow', x: 6.5, y: 6.2 }) },
    { id: 'gift', text: 'Give a soup to a neighbour', done: (d) => !!d.flags['soup:gifted'] },
  ],
  reward: '+20 Tockens',
  onComplete: (d) => {
    d.tockens += 20;
  },
});

export { CROP_BY_SEED };

// ------------------------------------------------------------------ the Glimmer Grotto: too dark without Glowbroth

onEnterMap('grotto', async () => {
  if (hasEffect('glow')) {
    if (!flag('grotto:lit')) {
      setFlag('grotto:lit');
      await talk('narrator', 'Your glow fills the cave! Crystals sparkle on every wall... and look — an old treasure chest in the corner!');
    }
    return;
  }
  await talk('narrator', ['It’s so dark in here you can hardly see your own paws!', 'Something glints far in the back... If only you could glow like a lantern.']);
  if (flag('met:clover') && learnClue('glowbroth', 'clover')) await talk('narrator', 'You remember Clover talking about a soup that makes you glow...');
});

onUse('grotto-chest', async ({ world }) => {
  if (!hasEffect('glow')) {
    await talk('narrator', 'You bump into something wooden in the dark. Ouch! You can’t see a thing.');
    return;
  }
  if (flag('grotto:chest')) {
    await talk('narrator', 'The chest is empty now — but the crystals are still lovely.');
    return;
  }
  const show = payout(['grotto:chest'], [{ item: 'golden-acorn' }, { item: 'fossil-trilobite' }, { tockens: 25 }], { title: '✨ Inside the chest' });
  audio.sfx('fanfare');
  world.openChestProp('grotto-chest');
  await talk('narrator', 'The chest creaks open...');
  show();
});
