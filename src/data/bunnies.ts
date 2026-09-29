import type { BunnyLook } from '../art/bunny';

/**
 * The Hopkins bunnies: Clover's twelve little cousins who tumbled through the hourglass crack,
 * three in each era, each wearing a tiny outfit from their time. Rescued ones move into the
 * warren in the Tockwood meadow.
 */
export interface HopkinsBunny {
  id: string;
  name: string;
  era: 'pirate' | 'egypt' | 'fifties' | 'florence';
  look: BunnyLook;
  /** what they say when found */
  found: string;
  /** line when visited in the warren */
  home: string;
  /** hint shown in the Bunny Tracker before they're found */
  hint: string;
}

export const HOPKINS: HopkinsBunny[] = [
  { id: 'skipper', name: 'Skipper', era: 'pirate', look: { fur: '#c9a27e', outfit: 'bandana', accent: '#e46a6a' }, found: 'Ahoy! I was a stowaway! Can I go home now? I miss carrots.', home: 'Arr! I sail the warren seas now!', hint: 'Snuggled up somewhere aboard a ship.' },
  { id: 'shelly', name: 'Shelly', era: 'pirate', look: { fur: '#f4ede4', outfit: 'sailor' }, found: 'I found SO many shells! ...Wait, where’s the warren?', home: 'Want to see my shell collection?', hint: 'Listening for waves, near sand and seashells.' },
  { id: 'bosun', name: 'Bosun', era: 'pirate', look: { fur: '#9c8f86', outfit: 'captain' }, found: 'Captain Bosun, reporting! ...I got a little stuck behind those barrels.', home: 'All hands on deck! Er, paws.', hint: 'A tiny voice, stuck behind something heavy by the pier.' },
  { id: 'nibbles', name: 'Nibbles', era: 'egypt', look: { fur: '#e8cfa9', outfit: 'nemes' }, found: 'I was a pharaoh for a day! But pharaohs miss their grandma too.', home: 'Bow down to Pharaoh Nibbles! ...Just kidding, hug?', hint: 'Somewhere very royal.' },
  { id: 'sandy', name: 'Sandy', era: 'egypt', look: { fur: '#d9b77a', outfit: 'basket' }, found: 'It’s SO hot here. My ears are sunburnt!', home: 'Cool grass! Finally!', hint: 'Hiding where the builders keep their baskets.' },
  { id: 'lotus', name: 'Lotus', era: 'egypt', look: { fur: '#f4ede4', outfit: 'lotus' }, found: 'It was so dark in there... thank you for the glowing soup!', home: 'I like it here. It’s bright.', hint: 'Deep in the dark, where only glowing soup can light the way.' },
  { id: 'poppy', name: 'Poppy', era: 'fifties', look: { fur: '#f4ede4', outfit: 'poodle' }, found: 'I learned to twirl! Wanna see? Wheee!', home: 'Poodle skirt twirl! Wheee!', hint: 'Twirling where the music plays.' },
  { id: 'zippy', name: 'Zippy', era: 'fifties', look: { fur: '#c9a27e', outfit: 'jacket', accent: '#c0464b' }, found: 'I was roller skating! Fastest bunny in 1957!', home: 'Zoom zoom! Race you!', hint: 'Zooming around on wheels.' },
  { id: 'dot', name: 'Dot', era: 'fifties', look: { fur: '#9c8f86', outfit: 'headscarf' }, found: 'The diner cat told me you’d come! Er, I think. I don’t speak cat.', home: 'Milkshake party at the warren!', hint: 'Only a friendly cat knows where.' },
  { id: 'pesto', name: 'Pesto', era: 'florence', look: { fur: '#e8cfa9', outfit: 'beret', accent: '#b8404a' }, found: 'I was helping in the garden. The basil smells SO good.', home: 'Smell this basil I brought back!', hint: 'Somewhere that smells of herbs.' },
  { id: 'sketch', name: 'Sketch', era: 'florence', look: { fur: '#f4ede4', outfit: 'smock' }, found: 'I painted a picture of a carrot! It’s a masterpiece!', home: 'Hold still, I’m painting you!', hint: 'Among the paints and brushes.' },
  { id: 'twirl', name: 'Twirl', era: 'florence', look: { fur: '#9c8f86', outfit: 'ruff' }, found: 'I got stuck up high! Thank you for the bouncy soup!', home: 'I’m never climbing that high again. Probably.', hint: 'Way up high, too high for normal jumping.' },
];

export const GRANDMA: BunnyLook = { fur: '#e6ddd2', outfit: 'shawl', accent: '#a58bd6' };
export const CLOVER_SIBLINGS: BunnyLook[] = [{ fur: '#f4ede4', outfit: 'bow', accent: '#f4a3b4' }];

export const HOPKINS_BY_ID = new Map(HOPKINS.map((b) => [b.id, b]));

/** Rescue milestones that unlock rewards. */
export const BUNNY_REWARDS = [
  { count: 2, reward: 'recipe:hopscotch', text: 'Clover teaches you Hopscotch Chowder!' },
  { count: 3, reward: 'wardrobe:bunny-ears', text: 'The Hopkins family knitted Bunny-Ear Headbands for you!' },
  { count: 4, reward: 'biscuit:bunny-ear-hat', text: 'Biscuit gets his very own Bunny-Ear Hat!' },
  { count: 6, reward: 'recipe:sparkle', text: 'Grandma Hopkins shares her Sparkle Stew recipe!' },
  { count: 12, reward: 'furniture:carrot-lamp', text: 'Every bunny is home! A Golden Carrot Lamp for your cottage!' },
];
