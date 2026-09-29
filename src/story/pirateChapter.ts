import { app } from '../app';
import { audio } from '../audio/audio';
import { ask, conversation, talk } from '../ui/dialogue';
import { toast } from '../ui/ui';
import { openWorldMap } from '../ui/worldMap';
import { openStall } from '../ui/stallShop';
import { openCauldron } from '../ui/cauldron';
import { learnNote } from '../ui/notesScreen';
import { openPuzzle } from '../puzzles/ui/screen';
import { PIRATE_RIDDLES } from '../puzzles/content/pirates';
import { equip, grant, owns } from '../core/wardrobe';
import { input } from '../input/input';
import { CLOTHES_BY_ID } from '../data/clothes';
import { findScrap } from './treasureScraps';
import { dance } from '../dance/openDance';
import { SCRAPS } from '../data/scraps';
import type { SaveData } from '../core/state';

/** where each scrap is found (quest markers before you have it) */
const SCRAP_SOURCE: Record<string, { map: string; x: number; y: number }> = {
  'scrap-cove-west': { map: 'cove', x: 28.6, y: 20.4 },
  'scrap-cove-camp': { map: 'cove', x: 25.6, y: 18.6 },
  'scrap-isle-north': { map: 'cave', x: 5.5, y: 4 },
};
import { HOPKINS_BY_ID, BUNNY_REWARDS } from '../data/bunnies';
import { hasEffect } from '../soup/effects';
import { learnClue } from '../soup/kitchen';
import { count, cutscene, flag, give, giveTockens, befriend, oncePerDay, onEnterMap, onTalk, onUse, setFlag, take, wait } from './hooks';
import { registerQuest } from './quests';
import type { WorldScene } from '../scenes/WorldScene';
import { registerNpcName } from './hooks';

for (const [id, name] of Object.entries({ marigold: 'Captain Marigold', pepper: 'Pepper', cookie: 'Cookie', saltwhistle: 'Captain Saltwhistle', coco: 'Coco' })) registerNpcName(id, name);

/**
 * Chapter 1: The Golden Age of Piracy (~1715). Captain Marigold's treasure map was torn up
 * by the time-tangle storm — and she blames her rival, Captain Saltwhistle. Find the four
 * pieces, put the map together, brew Pirate's Gumbo to calm the Swirling Shoals, sail to
 * Treasure Island, open the stone door and the chest... and bring the first Time Sand home.
 */

// ------------------------------------------------------------------ dressing the part
const activePlayers = (): (0 | 1)[] => (input.twoPlayer ? [0, 1] : [0]);

/** Is this player wearing anything from the Golden Age of Piracy? */
function piratey(p: 0 | 1): boolean {
  return Object.values(app.data!.players[p].outfit).some((w) => !!w && CLOTHES_BY_ID.get(w.id)?.era === 'pirate');
}
/** Everyone playing looks like crew. */
export const crewReady = (): boolean => activePlayers().every(piratey);
const anyPiratey = (): boolean => activePlayers().some(piratey);
const wearing = (id: string): boolean => activePlayers().some((p) => Object.values(app.data!.players[p].outfit).some((w) => w?.id === id));

/** Put the borrowed deckhand clothes on whoever isn't dressed for the sea yet. */
function dressAsCrew(): void {
  const d = app.data!;
  for (const p of activePlayers()) {
    if (piratey(p)) continue;
    equip(d, p, 'deckhand-bandana', p);
    equip(d, p, 'sailor-shirt', p);
    app.events.emit('outfit-changed', p);
  }
  app.autosave.request();
}

// ------------------------------------------------------------------ the portal and the Map of Time
export async function useTimePortal(world: WorldScene): Promise<void> {
  const era = await openWorldMap();
  if (!era) return;
  await cutscene(async () => {
    await talk('pip', era.done() ? 'Back we go! Hold on tight...' : ['Everybody hold hands — and paws!', `Next stop: ${era.name}!`]);
  });
  setFlag('pip:companion');
  audio.sfx('portal');
  world.goTo(era.map, era.spawn);
}

async function goHome(world: WorldScene): Promise<void> {
  const pick = await ask('pip', 'Shall I open the portal home to Tockwood?', ['Yes, home we go!', 'Not yet']);
  if (pick !== 0) return;
  audio.sfx('portal');
  world.goTo('clocktower', 'in');
}

// ------------------------------------------------------------------ lost Hopkins cousins
async function applyBunnyReward(n: number): Promise<void> {
  const d = app.data!;
  for (const r of BUNNY_REWARDS.filter((x) => x.count === n)) {
    if (r.reward === 'recipe:hopscotch') learnClue('hopscotch-chowder', 'clover');
    else if (r.reward === 'recipe:sparkle') learnClue('sparkle-stew', 'grandma');
    else if (r.reward === 'wardrobe:bunny-ears') grant(d, 'bunny-ears');
    else if (r.reward === 'biscuit:bunny-ear-hat') grant(d, 'bunny-ear-hat');
    else if (r.reward.startsWith('furniture:')) d.inventory[r.reward.slice(10)] = (d.inventory[r.reward.slice(10)] ?? 0) + 1;
    toast(r.text, { icon: '🐰', cls: 'quest', ms: 3600 });
  }
}

/** A lost cousin is found: they hop home to the warren through Pip's portal. */
export async function rescueBunny(id: string, world?: WorldScene): Promise<void> {
  const d = app.data!;
  if (d.bunnies.includes(id)) return;
  d.bunnies.push(id);
  setFlag(`rescued:${id}`);
  world?.sendBunnyHome(id);
  audio.sfx('fanfare');
  const hb = HOPKINS_BY_ID.get(id);
  toast(`${hb?.name ?? id} is hopping home to the warren! (${d.bunnies.length} of 12)`, { icon: '🐰', cls: 'quest', ms: 3400 });
  await applyBunnyReward(d.bunnies.length);
  app.autosave.request();
}

async function lostBunnyChat(id: string, world: WorldScene, extra?: () => Promise<void>): Promise<void> {
  const hb = HOPKINS_BY_ID.get(id)!;
  await conversation(async () => {
    await talk(`hop-${id}`, hb.found);
    await talk('pip', ['A Hopkins cousin! Clover will be SO happy.', 'I’ll send you home through a tiny time-door — the warren is waiting!']);
  });
  if (extra) await extra();
  await rescueBunny(id, world);
}

onTalk('lost:skipper', async ({ world }) =>
  lostBunnyChat('skipper', world, async () => {
    await talk('hop-skipper', 'Oh! And take this — I made it for the dog. He looks like a captain!');
    if (grant(app.data!, 'pirate-hat')) toast('Biscuit got a Tiny Pirate Hat! (Wardrobe → Biscuit)', { icon: '🏴' });
  }),
);
onTalk('lost:shelly', async ({ world }) => lostBunnyChat('shelly', world));
const bosunScrap = (world: WorldScene) => async () => {
  await talk('hop-bosun', 'Oh! And I was sitting on this the whole time — an old scrap of map! You have it.');
  findScrap('scrap-cove-camp', world);
};
onTalk('lost:bosun', async ({ world }) => lostBunnyChat('bosun', world, bosunScrap(world)));

// ------------------------------------------------------------------ Sandy Cove
onEnterMap('cove', async ({ world }) => {
  if (!flag('cove:arrived')) {
    setFlag('cove:arrived');
    await cutscene(async () => {
      await wait(400);
      await talk('narrator', ['Whoosh! Warm sand, a salty breeze, and the sound of a fiddle drifting over the water...']);
      await talk('pip', [
        'We made it! The Golden Age of Piracy — the Caribbean Sea, around the year 1715!',
        'I can feel the Time Sand somewhere nearby... and look — a pirate ship at the pier!',
      ]);
      learnNote('pirate-golden-age');
      await talk('biscuit', 'Woof! *sniff sniff* ...Woof!');
    });
    return;
  }
  // after the treasure: the crew throws a party (and two captains make friends)
  if (app.data!.sands.includes('pirate') && !flag('pirate:party')) {
    setFlag('pirate:party');
    // the whole crew — and Captain Saltwhistle — gather on the deck
    world.bringNpc('saltwhistle', 35, 23.6);
    world.bringNpc('marigold', 36.6, 23.4);
    world.bringNpc('pepper', 34, 22.6);
    world.bringNpc('coco', 38.2, 23.9);
    world.celebrate(9000);
    audio.music('hornpipe');
    await cutscene(async () => {
      await talk('marigold', ['THE TREASURE! And a glowing sand that hums like a lullaby! Crew — this calls for a party!']);
      await talk('saltwhistle', ['Ahem. Congratulations, Captain. I... may have been a bit grumpy about the map.']);
      await talk('marigold', ['And I may have shouted “THIEF” a teeny bit too loudly. Friends, Saltwhistle?', 'Friends! And friends of the future too — {players}, you’ll always have a place aboard the Sunny Marigold.']);
      await talk('marigold', ['I’d love to see this Tockwood of yours someday. Save me a spot on your dock!', 'And take this — the wheel from my very first ship. Hang it in your cottage and think of us!']);
    });
    give('ship-wheel', 1, { from: 'Captain Marigold gave you' });
    setFlag('marigold:friend');
    befriend('marigold', 40);
    befriend('saltwhistle', 20);
    if (grant(app.data!, 'captain-coat')) toast('You got the Captain’s Coat! (Wardrobe)', { icon: '🧥' });
  }
});

onUse('portal-home', async ({ world }) => goHome(world));

/** Pepper guards the gangplank: only the crew may board — so look like the crew! */
async function gangplank(world: WorldScene): Promise<void> {
  if (flag('crew:aboard')) return;
  if (!crewReady()) {
    await talk('pepper', ['SQUAWK! Crew only! Crew only!', 'No crew clothes, no boarding! Squawk!']);
    const d = app.data!;
    if (!owns(d, 'deckhand-bandana') && !owns(d, 'sailor-shirt')) {
      await talk('pip', ['Hmm... Pepper only lets the crew aboard.', 'But if we LOOKED like deckhands... I saw sailor clothes drying on a washing line by the path!']);
      return;
    }
    const pick = await ask('pip', 'We’ve got the crew’s clothes! Shall we put them on?', ['Yes, dress up!', 'Not yet']);
    if (pick !== 0) return;
    dressAsCrew();
    await talk('pip', 'Ta-da! Deckhands, reporting for duty!');
  }
  await talk('pepper', ['Squawk! Crew! Crew! Welcome aboard!', 'Pretty bandana! Squawk!']);
  setFlag('crew:aboard');
  world.removeObject('gangplank');
  audio.sfx('chime');
  await talk('pip', 'We’re aboard! Now let’s find the captain.');
}
onUse('gangplank', async ({ world }) => gangplank(world));

onUse('laundry', async () => {
  const d = app.data!;
  if (!owns(d, 'deckhand-bandana') || !owns(d, 'sailor-shirt')) {
    await talk('narrator', ['The crew’s washing line: striped sailor shirts and red bandanas, flapping in the sea breeze.', 'A little sign says: “CREW LAUNDRY — borrow what you need, bring it back clean!”']);
    grant(d, 'deckhand-bandana');
    grant(d, 'sailor-shirt');
    toast('You borrowed Deckhand Bandanas and Striped Sailor Shirts! (Wardrobe)', { icon: '🏴' });
    app.autosave.request();
  } else if (crewReady()) {
    await talk('narrator', 'Sailor clothes flap in the breeze. You already look just like the crew!');
    return;
  }
  if (crewReady()) return;
  const pick = await ask('pip', 'Shall we put them on? Then we’ll look just like the crew!', ['Yes, dress up!', 'I’ll use the Wardrobe']);
  if (pick === 0) {
    dressAsCrew();
    await talk('pip', 'Ta-da! Deckhands, reporting for duty! Let’s try the gangplank.');
  } else await talk('pip', 'Open the Wardrobe from the pause menu — a bandana or a sailor shirt will do!');
});

onUse('salt', async ({ objectId }) => {
  if (!oncePerDay(`salt:${objectId}`)) {
    await talk('narrator', 'You’ve gathered the salt here today. The sun will dry more by tomorrow!');
    return;
  }
  audio.sfx('pickup');
  give('sea-salt', 1, { from: 'You scraped up' });
});

onUse('bottle', async ({ world }) => {
  if (flag('map:bottle')) return;
  world.removeObject('bottle');
  audio.sfx('splash');
  await talk('narrator', ['A message in a bottle, bobbing at the edge of the waves!', 'You pull out the cork... and find a soggy piece of treasure map!']);
  give('map-piece', 1, { from: 'Inside the bottle:' });
  setFlag('map:bottle');
});

const piecesFound = () => ['map:saltwhistle', 'map:bottle', 'map:dug', 'map:pepper'].filter((k) => flag(k)).length;

onTalk('marigold', async ({ world }) => {
  const d = app.data!;
  if (world.def.region === 'tockwood') {
    const lines = [
      'What a lovely island! That Biscuit of yours would make a fine ship’s dog.',
      'Ahoy, shipmates! I sailed through time just to say hello. Pip’s portal is VERY bumpy.',
      'Your clocktower is almost as tall as my mast! Almost.',
    ];
    await talk('marigold', lines[d.day % lines.length]);
    if (oncePerDay('chat:marigold')) befriend('marigold', 6);
    return;
  }
  if (!flag('met:marigold')) {
    await conversation(async () => {
      await talk('marigold', [
        'Ahoy there, landlubbers! And... a very small, very fluffy landlubber!',
        'I’m Captain Marigold of the Sunny Marigold — finest ship in the Caribbean!',
        'But woe! WOE! Our treasure map is gone — torn to pieces by last night’s strange storm!',
        'And I’d bet my best boots that sneaky Captain Saltwhistle scooped up the pieces. His camp is just up the beach!',
      ]);
      await talk('pip', 'A strange storm... that’s the time-tangle! The Time Sand must be mixed up in this.');
      await talk('marigold', [
        'Find the four pieces and you can join my crew — and share the treasure!',
        'My crew voted me captain fair and square, you know. That’s how we pirates do things!',
      ]);
    });
    learnNote('pirate-articles');
    setFlag('met:marigold');
    setFlag('map:search');
    befriend('marigold', 10);
    return;
  }
  if (wearing('tricorn') && !flag('marigold:saw-hat')) {
    setFlag('marigold:saw-hat');
    await talk('marigold', 'Now THAT’s a proper crew hat! You wear it well, shipmate.');
  }
  if (!flag('map:whole')) {
    const n = count('map-piece');
    if (n >= 4) {
      await talk('marigold', 'All four pieces?! Quick, quick — spread them out on my map table!');
      return;
    }
    await talk('marigold', [
      `You’ve found ${n} piece${n === 1 ? '' : 's'}! ${n ? 'Keep going!' : ''}`,
      !flag('map:saltwhistle') ? 'Try that rascal Saltwhistle’s camp up the beach.' : !flag('map:pepper') ? 'And my parrot Pepper keeps squawking about something shiny in her nest — ask her at the gangplank!' : !flag('map:bottle') ? 'The tide washes all sorts of things onto the west beach...' : 'Maybe that clever dog can sniff one out on the beach!',
    ]);
    return;
  }
  if (!flag('crew:respect')) {
    await talk('marigold', 'A Sunny Marigold tradition: dance the hornpipe with Cookie, and the crew will follow you anywhere!');
    return;
  }
  if (!d.recipes.includes('pirates-gumbo')) {
    await talk('marigold', ['To Treasure Island! ...Through the Swirling Shoals. Gulp.', 'Nobody sails the Shoals without a belly full of Pirate’s Gumbo. Ask Cookie in the galley!']);
    return;
  }
  if (!flag('isle:reached')) {
    await talk('marigold', 'Got a warm bowl of gumbo in your belly? Then take the wheel, {players}! Set sail!');
    return;
  }
  if (!d.sands.includes('pirate')) {
    await talk('marigold', 'The treasure is on that island somewhere — the stone door by the hill looked mighty mysterious!');
    return;
  }
  await talk('marigold', 'You’ll always be welcome aboard the Sunny Marigold, shipmates!');
  if (oncePerDay('chat:marigold')) befriend('marigold', 6);
});

onTalk('saltwhistle', async () => {
  if (!flag('met:saltwhistle')) {
    await conversation(async () => {
      await talk('saltwhistle', [
        'Stolen?! STOLEN? Why, I never!',
        'I FOUND this soggy bit of map floating by the Merry Mackerel this morning. I tried to give it back, but Marigold just shouted “THIEF!” and stomped off.',
        'Here — you take it to her. And tell her... well. Tell her I’m sorry about all the shouting. Even though it was HER shouting.',
      ]);
    });
    give('map-piece', 1, { from: 'Captain Saltwhistle gave you' });
    setFlag('map:saltwhistle');
    setFlag('met:saltwhistle');
    befriend('saltwhistle', 10);
    return;
  }
  if (anyPiratey() && !flag('saltwhistle:saw-clothes')) {
    setFlag('saltwhistle:saw-clothes');
    await talk('saltwhistle', 'Well, look at you — proper sailor clothes! Very ship-shape. ...Don’t tell Marigold I said so.');
  }
  const lines = ['The Merry Mackerel may be small, but she’s speedy!', 'A good captain listens more than she shouts. Or he. Or me. I’m working on it.', 'Fine weather for sailing, eh?'];
  await talk('saltwhistle', lines[(app.data!.day + 1) % lines.length]);
  if (oncePerDay('chat:saltwhistle')) befriend('saltwhistle', 6);
});

onTalk('pepper', async ({ world }) => {
  if (!flag('crew:aboard')) {
    await gangplank(world);
    return;
  }
  if (flag('map:pepper')) {
    if (!flag('scrap:scrap-cove-west')) {
      await talk('pepper', ['Squawk! Another pretty map! Another pretty map!', 'Take it! Take it! Nest too full! Squawk!']);
      findScrap('scrap-cove-west', world);
      return;
    }
    await talk('pepper', ['Squawk! Pretty map! Pretty map!', 'Coconut! Thank you! Squawk!']);
    return;
  }
  setFlag('met:pepper');
  if (count('coconut') > 0) {
    const pick = await ask('pepper', 'Squawk! Shiny map piece in my nest! Trade? Trade for... COCONUT?', ['Here’s a coconut!', 'Not now']);
    if (pick !== 0) return;
    take('coconut', 1);
    audio.sfx('squeak');
    await talk('pepper', ['COCONUT! Squawk! Here — pretty map, pretty map!', 'And a present! My little cousin Paprika wants to ride on your shoulder!']);
    give('map-piece', 1, { from: 'Pepper gave you' });
    setFlag('map:pepper');
    if (grant(app.data!, 'parrot')) toast('You got a Parrot Pal! (Wardrobe → Extras)', { icon: '🦜' });
    befriend('pepper', 20);
    return;
  }
  await talk('pepper', ['Squawk! Pretty map! Pretty map in my nest!', 'Coconut? COCONUT? Squawk!']);
  await talk('pip', 'I think Pepper wants to trade... Coco at the market sells coconuts!');
});

onTalk('coco', async () => {
  if (!flag('met:coco')) {
    await talk('coco', [
      'Welcome to Coco’s fruit stall! Coconuts, island peppers — the freshest in the Caribbean!',
      'I take Tockens... how strange and shiny! Most folk here pay with pieces of eight.',
    ]);
    learnNote('pirate-eight');
    setFlag('met:coco');
  }
  // dressed like sailors? Coco gives crew prices
  const crew = anyPiratey();
  if (crew && !flag('coco:crew')) {
    setFlag('coco:crew');
    await talk('coco', 'Ooh, proper sailor clothes! Crew get sailor’s prices at my stall.');
  }
  await openStall('🥥 Coco’s Fruit Stall', [
    { id: 'coconut', price: crew ? 1 : 2 },
    { id: 'island-pepper', price: crew ? 2 : 3 },
  ], `${crew ? '⚓ Sailor’s prices! ' : ''}Tropical treats for your soup pot — Pirate’s Gumbo needs something spicy, something from the sea and something from a sunny island.`);
});

/** Cookie's hornpipe dance-off (from a chat with her, or from her galley pot). True once the crew's respect is won. */
async function cookieDanceOff(world: WorldScene, alreadyAsked = false): Promise<boolean> {
  if (!alreadyAsked) {
    const pick = await ask('cookie', flag('hornpipe:tried') ? 'Squeak! Ready for another hornpipe?' : 'Squeak! So you want to sail with us? Then show me your HORNPIPE! A dance-off, right here on deck!', ['Let’s dance!', 'Not yet']);
    if (pick !== 0) return false;
  }
  setFlag('hornpipe:tried');
  const o = await dance({ style: 'hornpipe', rival: 'cookie', audience: ['marigold', 'pepper'], title: '💃 Hornpipe Dance-off!', blurb: 'Dance the Sailor’s Hornpipe against Cookie — the whole crew is watching!' });
  if (!o?.finished) return false;
  if (!o.won) {
    await talk('cookie', ['Squeak! Good try! Sailors practise their hornpipe for years, you know.', 'Try again whenever you like — I’ll be right here! (And “Just dance” counts too — it’s the spirit that matters!)']);
    return false;
  }
  setFlag('crew:respect');
  befriend('cookie', 20);
  // the whole crew cheers (confetti, dancing on deck)
  world.celebrate(6500);
  await cutscene(async () => {
    audio.sfx('cheer');
    await talk('cookie', 'SQUEAK! What footwork! You dance like true sailors!');
    await talk('marigold', 'Three cheers for our new crew! Hip hip — HOORAY!');
  });
  learnNote('pirate-hornpipe');
  giveTockens(15);
  return true;
}

onTalk('cookie', async ({ world }) => {
  if (!flag('met:cookie')) {
    await talk('cookie', [
      'Squeak! Welcome to my galley — the tastiest kitchen on the seven seas!',
      'Hungry? Have a ship’s biscuit! Careful — they’re hard as rocks. Sailors dunk them in soup to soften them up.',
    ]);
    learnNote('pirate-hardtack');
    setFlag('met:cookie');
  }
  if (flag('map:whole') && !flag('crew:respect')) {
    if (!(await cookieDanceOff(world))) return;
  }
  if (flag('map:whole') && !app.data!.recipes.includes('pirates-gumbo')) {
    await talk('cookie', ['Sailing the Swirling Shoals? Then you need my famous Pirate’s Gumbo! It calms the stormiest seas.', 'Here’s the secret...']);
    learnClue('pirates-gumbo', 'cookie');
    await talk('cookie', ['“Something spicy, something from the sea, and something from a sunny tropical island.”', 'Coco sells peppers and coconuts, and there’s sea salt drying in the pans on the beach. Use my pot any time!']);
    return;
  }
  const pick = await ask('cookie', 'Want to use my galley pot?', ['Let’s cook!', 'Just saying hi']);
  if (pick === 0) await openCauldron({ title: '🍲 Cookie’s Galley Pot' });
});

onUse('galley', async ({ world }) => {
  if (!flag('met:cookie')) await talk('cookie', 'Squeak! Help yourself to my pot — I’ll be right here!');
  setFlag('met:cookie');
  // before the crew's respect is won, the pot is where most players find Cookie — so she asks
  if (flag('map:whole') && !flag('crew:respect')) {
    const pick = await ask('cookie', 'Squeak! Here to cook — or here for our HORNPIPE dance-off? Win it, and the crew will sail with you!', ['Dance-off!', 'Just cook', 'Not now']);
    if (pick === 0) {
      await cookieDanceOff(world, true);
      return;
    }
    if (pick !== 1) return;
  }
  const res = await openCauldron({ title: '🍲 Cookie’s Galley Pot' });
  if (res?.soup.id === 'pirates-gumbo') await talk('cookie', res.drank ? 'THAT’S the stuff! Now the Shoals will be smooth as custard. To the wheel!' : 'Perfect gumbo! Don’t forget to eat it before we sail!');
});

onUse('map-table', async ({ world }) => {
  if (flag('map:whole')) {
    await talk('narrator', 'The treasure map, whole again: Sandy Cove, the Swirling Shoals... and a big red X on Treasure Island.');
    return;
  }
  const n = count('map-piece');
  if (n < 4) {
    await talk('narrator', `The captain’s map table. You have ${n} of the 4 torn map pieces.`);
    return;
  }
  const r = await openPuzzle('marigold-map');
  if (!r.solved) return;
  take('map-piece', 4);
  setFlag('map:whole');
  await cutscene(async () => {
    audio.sfx('fanfare');
    await talk('marigold', ['Shiver me whiskers — it’s whole again! Look: Treasure Island, past the Swirling Shoals!', 'You’re true crew now. Every one of my crew gets a proper hat!']);
  });
  const hats = grant(app.data!, 'tricorn');
  const pants = grant(app.data!, 'pantaloons');
  if (hats || pants) toast('You got Tricorn Hats and Sailor Pantaloons! (Wardrobe)', { icon: '🏴‍☠️' });
  await talk('marigold', [
    'But nobody takes the wheel of the Sunny Marigold until they’ve danced the hornpipe with Cookie — she’s our champion!',
    'Win the crew’s respect, and Cookie will tell you how we get through the Shoals.',
  ]);
  void world;
});

onUse('ship-wheel', async ({ world }) => {
  if (!flag('map:whole')) {
    await talk('marigold', 'We can’t set sail without a map, shipmate! Find those pieces!');
    return;
  }
  if (!flag('crew:respect')) {
    await talk('marigold', ['The crew won’t follow a helmsman who hasn’t danced the hornpipe!', 'Show Cookie your best steps — she’s by the galley.']);
    return;
  }
  if (!hasEffect('calm') && !flag('shoals:seen')) {
    setFlag('shoals:seen');
    await talk('marigold', 'Take a look at the chart, shipmate... see those whirlpools? They spin a ship right round and back again!');
    await openPuzzle('marigold-chart', { preview: 'See the whirlpools? In rough seas they spin the ship right back — nobody can sail this yet. We need calm water: Pirate’s Gumbo!' });
  }
  if (!hasEffect('calm')) {
    const d = app.data!;
    const knows = d.recipes.includes('pirates-gumbo') || d.clues.includes('pirates-gumbo');
    await talk('marigold', ['Nobody sails the Swirling Shoals without a belly full of Pirate’s Gumbo!', knows ? 'You know Cookie’s recipe — brew some in the galley, and drink it before we sail.' : 'Ask Cookie in the galley — she knows the recipe.']);
    return;
  }
  await talk('marigold', 'All hands on deck! {players}, you take the wheel!');
  const r = await openPuzzle('marigold-chart');
  if (!r.solved) {
    await talk('marigold', 'No shame in turning back, shipmates. We’ll try again when you’re ready!');
    return;
  }
  setFlag('isle:reached');
  await cutscene(async () => {
    await talk('narrator', 'The Sunny Marigold glides through the calm, sparkling Shoals... and there it is: Treasure Island!');
  });
  world.goTo('isle', 'landing');
});

onUse('hatch', async ({ world }) => {
  audio.sfx('door');
  world.goTo('hold', 'in');
});

onUse('barrels', async ({ world }) => {
  if (flag('bosun:free')) {
    await talk('narrator', 'Just barrels now — neatly stacked, thanks to you.');
    return;
  }
  if (!flag('bosun:heard')) {
    await talk('narrator', 'A tiny voice squeaks from behind the barrels: “Hello? I’m stuck! Can anybody roll these out of the way?”');
    setFlag('bosun:heard');
  }
  const r = await openPuzzle('bosun-barrels');
  if (!r.solved) return;
  setFlag('bosun:free');
  // out hops Bosun!
  world.spawnLostBunny({ id: 'bosun', kind: 'lostbunny', x: 25.6, y: 19.4, p: { id: 'bosun' } });
  await wait(500);
  await lostBunnyChat('bosun', world, bosunScrap(world));
});

// ------------------------------------------------------------------ Treasure Island
onEnterMap('isle', async () => {
  if (flag('isle:landed')) return;
  setFlag('isle:landed');
  await cutscene(async () => {
    await talk('narrator', 'You row the little boat onto a beach of sugar-white sand.');
    await talk('pip', ['Treasure Island! The X on the map was by that rocky hill.', 'And Biscuit’s nose is twitching... is somebody else here?']);
  });
});

onUse('rowboat', async ({ world }) => {
  const pick = await ask('narrator', 'Row back to the Sunny Marigold?', ['Row, row, row!', 'Stay a while']);
  if (pick !== 0) return;
  audio.sfx('splash');
  world.goTo('cove', 'from-isle');
});

onUse('isle-door', async ({ world }) => {
  if (!flag('isle:door:seen')) {
    await talk('narrator', 'A great stone door, carved with anchors and shells. Glowing words appear: “Only a clever crew may pass. Answer me true!”');
    setFlag('isle:door:seen');
  }
  const riddle = PIRATE_RIDDLES[(app.data!.day + count('doubloon')) % PIRATE_RIDDLES.length];
  const r = await openPuzzle('isle-door', { riddle });
  if (!r.solved) return;
  setFlag('isle:door');
  audio.sfx('pins');
  await talk('narrator', 'RUMBLE... RUMBLE... The stone door slides open!');
  world.goTo('isle', 'from-cave');
});

onUse('treasure-chest', async ({ world }) => {
  const d = app.data!;
  if (flag('chest:treasure-chest')) {
    await talk('narrator', 'The treasure chest is empty now — but what a treasure it was!');
    return;
  }
  const r = await openPuzzle('marigold-chest');
  if (!r.solved) return;
  setFlag('chest:treasure-chest');
  world.openChestProp('treasure-chest');
  await cutscene(async () => {
    audio.sfx('fanfare');
    await world.raiseTimeSand(5.5, 3.6);
    await talk('narrator', ['The lid swings open... gold coins, a spyglass, and — glowing softly in the middle — a swirl of shining sand!']);
    await talk('pip', [
      'THE TIME SAND! The first one!',
      'Oh, and a fun fact for your notes: real pirates almost never buried their treasure — they spent it! But this one was hidden by the time-tangle.',
    ]);
  });
  if (!d.sands.includes('pirate')) d.sands.push('pirate');
  toast('The first Time Sand! (1 of 8)', { icon: '⏳', cls: 'quest', ms: 4200 });
  give('doubloon', 5, { quiet: true });
  give('spyglass', 1, { quiet: true });
  // one line for the whole haul (not a pile of toasts over the players)
  d.tockens += 40;
  audio.sfx('coin');
  toast('From the chest: 5 gold doubloons, a brass spyglass and +40 Tockens', { icon: '🪙', ms: 3600 });
  learnNote('pirate-treasure');
  findScrap('scrap-isle-north', world);
  app.autosave.request();
});

// ------------------------------------------------------------------ back home: the first sand in the Great Hourglass
const SAND_HOME: Record<string, { lines: string[]; after?: () => void }> = {
  pirate: {
    lines: [
      'One home, seven to go! And listen...',
      'Tick... tock. Tick, tock! One of Rocco’s clocks is ticking FORWARDS again!',
      'The Map of Time is shimmering — new places are calling. We’ll go when they’re ready!',
    ],
    after: () => befriend('rocco', 10),
  },
  fifties: {
    lines: [
      'Two sands home! The hourglass is glowing brighter already.',
      'And look out the window — Rollo is hanging a new sign on the bowling alley: TOCKWOOD LANES is open!',
      'Rosita has come to Tockwood too. There’ll be dancing on the plaza tonight!',
    ],
    after: () => {
      setFlag('bowling:open');
      setFlag('rosita:arrived');
    },
  },
};

/** Put every Time Sand you've brought home into the Great Hourglass (one little ceremony each). */
export async function placeSands(): Promise<boolean> {
  const d = app.data!;
  const todo = d.sands.filter((s) => !flag(`sand:${s}:placed`));
  if (!todo.length) return false;
  for (const s of todo) {
    const home = SAND_HOME[s] ?? { lines: ['Another sand home! The Great Hourglass sparkles.'] };
    await cutscene(async () => {
      await talk('narrator', 'You hold up the Time Sand. It floats out of your hands... and swirls into a socket of the Great Hourglass with a bright TING!');
      audio.sfx('chime');
      await talk('pip', home.lines);
    });
    setFlag(`sand:${s}:placed`);
    home.after?.();
  }
  app.autosave.request();
  return true;
}

// ------------------------------------------------------------------ the chapter quest
registerQuest({
  id: 'pirate-sand',
  title: 'The Lost Map of the Sunny Marigold',
  icon: '🏴',
  chapter: 'pirate',
  main: true,
  available: (d) => !!d.flags['cove:arrived'],
  steps: [
    {
      id: 'board',
      text: 'Get aboard the Sunny Marigold — crew only!',
      done: (d) => !!d.flags['crew:aboard'] || !!d.flags['met:marigold'],
      where: (d) => (d.wardrobe.includes('deckhand-bandana') ? { map: 'cove', x: 28.6, y: 22.4 } : { map: 'cove', x: 24.8, y: 13.6 }),
    },
    { id: 'meet', text: 'Meet the captain of the Sunny Marigold', done: (d) => !!d.flags['met:marigold'], where: () => ({ map: 'cove', x: 31.2, y: 23.8 }) },
    {
      id: 'pieces',
      text: 'Find the 4 torn pieces of the treasure map',
      done: (d) => !!d.flags['map:whole'] || (d.inventory['map-piece'] ?? 0) >= 4,
      where: (d) =>
        !d.flags['map:saltwhistle'] ? { map: 'cove', x: 38.6, y: 8.6 } : !d.flags['map:pepper'] ? { map: 'cove', x: 28.6, y: 20.4 } : !d.flags['map:bottle'] ? { map: 'cove', x: 3.6, y: 13.4 } : { map: 'cove', x: 21, y: 18 },
    },
    { id: 'assemble', text: 'Put the map together at the captain’s table', done: (d) => !!d.flags['map:whole'], where: () => ({ map: 'cove', x: 32.4, y: 22.6 }) },
    { id: 'dance', text: 'Win the crew’s respect: a hornpipe dance-off with Cookie', done: (d) => !!d.flags['crew:respect'], where: () => ({ map: 'cove', x: 39.4, y: 24.8 }) },
    { id: 'gumbo', text: 'Brew Pirate’s Gumbo in the ship’s galley', done: (d) => d.recipes.includes('pirates-gumbo'), where: () => ({ map: 'cove', x: 38.4, y: 25.2 }) },
    { id: 'sail', text: 'Eat the gumbo and sail through the Swirling Shoals', done: (d) => !!d.flags['isle:reached'], where: () => ({ map: 'cove', x: 40.6, y: 23.4 }) },
    { id: 'door', text: 'Open the stone door on Treasure Island', done: (d) => !!d.flags['isle:door'], where: () => ({ map: 'isle', x: 23.5, y: 7.4 }) },
    { id: 'treasure', text: 'Find the treasure!', done: (d) => d.sands.includes('pirate'), where: () => ({ map: 'cave', x: 5.5, y: 4 }) },
    { id: 'home', text: 'Bring the Time Sand home to the Great Hourglass', done: (d) => !!d.flags['sand:pirate:placed'], where: () => ({ map: 'clocktower', x: 6.5, y: 5.4 }) },
  ],
  reward: '+50 Tockens',
  onComplete: (d) => {
    d.tockens += 50;
  },
});

registerQuest({
  id: 'pirate-bunnies',
  title: 'Cousins Lost at Sea',
  icon: '🐰',
  chapter: 'pirate',
  available: (d) => !!d.flags['cove:arrived'],
  steps: [
    { id: 'skipper', text: 'Find the stowaway hiding in the cargo hold', done: (d) => d.bunnies.includes('skipper'), where: () => ({ map: 'hold', x: 10, y: 6 }) },
    { id: 'bosun', text: 'Help the little voice behind the barrels on the pier', done: (d) => d.bunnies.includes('bosun'), where: () => ({ map: 'cove', x: 25.6, y: 18.6 }) },
    { id: 'shelly', text: 'Find the shell collector on Treasure Island', done: (d) => d.bunnies.includes('shelly'), where: () => ({ map: 'isle', x: 27.5, y: 16 }) },
  ],
  reward: '+20 Tockens',
  onComplete: (d) => {
    d.tockens += 20;
  },
});

registerQuest({
  id: 'pirate-scraps',
  title: 'X Marks the Spot',
  icon: '✖️',
  chapter: 'pirate',
  available: (d) => !!d.flags['cove:arrived'],
  steps: SCRAPS.filter((s) => s.era === 'pirate').map((s) => ({
    id: s.id,
    text: `Dig at the X on the ${s.name.replace('Map Scrap: ', '').replace(/^the /, '')} map`,
    done: (d: SaveData) => !!d.flags[`dug:${s.id}`],
    where: (d: SaveData) => (d.flags[`scrap:${s.id}`] ? { map: s.map, x: s.cx + 0.5, y: s.cy + 0.5 } : SCRAP_SOURCE[s.id]),
  })),
  reward: '+15 Tockens',
  onComplete: (d) => {
    d.tockens += 15;
  },
});
