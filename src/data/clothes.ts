import type { OutfitSlot, BiscuitSlot, Outfit, BiscuitOutfit, PlayerProfile } from '../core/state';
import { SKIN_TONES, HAIR_COLORS } from '../core/state';
import type { CharSpec, WornPiece } from '../art/character';

export type EraId = 'pirate' | 'egypt' | 'fifties' | 'florence';

export interface ClothingItem {
  id: string;
  name: string;
  slot: OutfitSlot;
  kind: string;
  /** colour variants: [main, accent] */
  colors: [string, string][];
  colorNames: string[];
  extra?: string;
  era?: EraId;
  /** where it comes from: starting wardrobe, Bramble's shop, an era reward, bunny rescue... */
  source: 'start' | 'shop' | 'era' | 'bunny' | 'story';
  price?: number;
  desc: string;
}

export interface BiscuitItem {
  id: string;
  name: string;
  slot: BiscuitSlot;
  kind: string;
  colors: [string, string][];
  colorNames: string[];
  era?: EraId;
  source: 'start' | 'shop' | 'era' | 'bunny' | 'story';
  price?: number;
  desc: string;
}

const C = {
  red: ['#e46a6a', '#fff4e0'] as [string, string],
  blue: ['#6fb3e0', '#fff4e0'] as [string, string],
  green: ['#7cc47f', '#f7c65a'] as [string, string],
  gold: ['#f7c65a', '#b57a4e'] as [string, string],
  pink: ['#f4a3b4', '#ffffff'] as [string, string],
  purple: ['#a58bd6', '#fff4e0'] as [string, string],
  navy: ['#3f5a8a', '#f7c65a'] as [string, string],
  cream: ['#fff4e0', '#b57a4e'] as [string, string],
  brown: ['#b57a4e', '#fff4e0'] as [string, string],
  black: ['#4a3b35', '#f7c65a'] as [string, string],
  mint: ['#9fe0c0', '#4a8f4a'] as [string, string],
  orange: ['#f29e4c', '#fff4e0'] as [string, string],
};

export const CLOTHES: ClothingItem[] = [
  // ---------------- hats
  { id: 'beanie', name: 'Cozy Beanie', slot: 'hat', kind: 'beanie', colors: [C.red, C.blue, C.green], colorNames: ['Berry', 'Sky', 'Meadow'], source: 'start', desc: 'Warm ears, happy heart.' },
  { id: 'sunhat', name: 'Straw Sun Hat', slot: 'hat', kind: 'sunhat', colors: [['#f3dca2', '#e46a6a'], ['#f3dca2', '#6fb3e0'], ['#f3dca2', '#7cc47f']], colorNames: ['Cherry ribbon', 'Sky ribbon', 'Leaf ribbon'], source: 'shop', price: 30, desc: 'For sunny strolls on the beach.' },
  { id: 'cap', name: 'Sporty Cap', slot: 'hat', kind: 'cap', colors: [C.blue, C.red, C.purple], colorNames: ['Blue', 'Red', 'Grape'], source: 'shop', price: 25, desc: 'Brim forward, ready for anything.' },
  { id: 'flower-crown', name: 'Flower Crown', slot: 'hat', kind: 'flowercrown', colors: [['#7cc47f', '#f4a3b4'], ['#7cc47f', '#f7c65a'], ['#7cc47f', '#a58bd6']], colorNames: ['Roses', 'Buttercups', 'Violets'], source: 'shop', price: 40, desc: 'Woven fresh from the meadow.' },
  { id: 'hair-bow', name: 'Big Bow', slot: 'hat', kind: 'bow', colors: [C.pink, C.red, C.blue], colorNames: ['Pink', 'Red', 'Blue'], source: 'shop', price: 20, desc: 'A bow big enough to wave hello.' },
  { id: 'bucket-hat', name: 'Bucket Hat', slot: 'hat', kind: 'bucket', colors: [C.mint, C.gold, C.cream], colorNames: ['Mint', 'Sunny', 'Oat'], source: 'shop', price: 30, desc: 'Floppy, friendly, fishing-ready.' },
  { id: 'tricorn', name: 'Tricorn Hat', slot: 'hat', kind: 'tricorn', colors: [['#4a3b35', '#f7c65a'], ['#3f5a8a', '#f7c65a'], ['#8a3b3b', '#f7c65a']], colorNames: ['Classic', 'Navy', 'Crimson'], era: 'pirate', source: 'era', desc: 'Three corners, zero frowns. A gift from Captain Marigold.' },
  { id: 'deckhand-bandana', name: 'Deckhand Bandana', slot: 'hat', kind: 'bandana', colors: [['#e46a6a', '#ffffff'], ['#3f5a8a', '#ffffff'], ['#4a3b35', '#ffffff']], colorNames: ['Red', 'Navy', 'Charcoal'], era: 'pirate', source: 'era', desc: 'What every sailor on the Periwinkle wears.' },
  { id: 'nemes', name: 'Striped Nemes', slot: 'hat', kind: 'nemes', colors: [['#6fb3e0', '#f7c65a'], ['#4a8f4a', '#f7c65a'], ['#f4a3b4', '#f7c65a']], colorNames: ['Nile blue', 'Papyrus green', 'Lotus pink'], era: 'egypt', source: 'era', desc: 'A striped cloth headdress like those worn in ancient Egypt.' },
  { id: 'headscarf', name: 'Polka Headscarf', slot: 'hat', kind: 'headscarf', colors: [['#e46a6a', '#ffffff'], ['#6fb3e0', '#ffffff'], ['#f7c65a', '#ffffff']], colorNames: ['Cherry', 'Blue', 'Lemon'], era: 'fifties', source: 'era', desc: 'Tied with a bow, 1950s style.' },
  { id: 'florentine-cap', name: 'Renaissance Cap', slot: 'hat', kind: 'beret', colors: [['#b8404a', '#f7c65a'], ['#4a3b35', '#f7c65a'], ['#3f5a8a', '#f7c65a']], colorNames: ['Crimson', 'Velvet black', 'Lapis'], era: 'florence', source: 'era', desc: 'A soft velvet cap, just like the painters of Florence wore.' },
  { id: 'bunny-ears', name: 'Bunny-Ear Headband', slot: 'hat', kind: 'bunnyears', colors: [['#ffffff', '#f4a3b4'], ['#c9a27e', '#f4a3b4'], ['#8c8c9a', '#f4a3b4']], colorNames: ['Snowy', 'Toffee', 'Pebble'], source: 'bunny', desc: 'A thank-you from the Hopkins family.' },
  { id: 'chef-hat', name: 'Little Chef Hat', slot: 'hat', kind: 'chef', colors: [['#ffffff', '#e46a6a'], ['#ffffff', '#6fb3e0']], colorNames: ['Cherry band', 'Sky band'], source: 'story', desc: "Clover says you've earned it." },
  { id: 'party-hat', name: 'Party Hat', slot: 'hat', kind: 'party', colors: [C.pink, C.gold, C.blue], colorNames: ['Pink', 'Gold', 'Blue'], source: 'story', desc: 'For the biggest celebration in history.' },

  // ---------------- tops
  { id: 'tee-striped', name: 'Striped Tee', slot: 'top', kind: 'tee', extra: 'stripes', colors: [['#f29e4c', '#fff4e0'], ['#6fb3e0', '#fff4e0'], ['#7cc47f', '#fff4e0']], colorNames: ['Tangerine', 'Sky', 'Clover'], source: 'start', desc: 'Your favourite tee.' },
  { id: 'tee-star', name: 'Star Tee', slot: 'top', kind: 'tee', extra: 'star', colors: [['#a58bd6', '#f7c65a'], ['#3f5a8a', '#f7c65a'], ['#e46a6a', '#f7c65a']], colorNames: ['Grape', 'Midnight', 'Cherry'], source: 'shop', price: 30, desc: 'Twinkle twinkle, stylish star.' },
  { id: 'hoodie', name: 'Comfy Hoodie', slot: 'top', kind: 'hoodie', colors: [['#7cc47f', '#fff4e0'], ['#a58bd6', '#fff4e0'], ['#f4a3b4', '#fff4e0']], colorNames: ['Fern', 'Lavender', 'Blossom'], source: 'start', desc: 'Soft as a bunny.' },
  { id: 'cardigan', name: 'Button Cardigan', slot: 'top', kind: 'cardigan', colors: [C.gold, C.mint, C.pink], colorNames: ['Honey', 'Mint', 'Rose'], source: 'shop', price: 35, desc: 'Cozy buttons all the way down.' },
  { id: 'raincoat', name: 'Puddle Raincoat', slot: 'top', kind: 'coat', colors: [['#f7c65a', '#fff4e0'], ['#e46a6a', '#fff4e0'], ['#6fb3e0', '#fff4e0']], colorNames: ['Sunshine', 'Tomato', 'Rain'], source: 'shop', price: 45, desc: 'Splashing encouraged.' },
  { id: 'button-shirt', name: 'Button-Up Shirt', slot: 'top', kind: 'shirt', colors: [C.blue, C.cream, C.pink], colorNames: ['Chambray', 'Oat', 'Rose'], source: 'shop', price: 30, desc: 'Smart enough for the museum.' },
  { id: 'sailor-shirt', name: 'Striped Sailor Shirt', slot: 'top', kind: 'sailor', colors: [['#fff4e0', '#3f5a8a'], ['#fff4e0', '#e46a6a']], colorNames: ['Navy stripes', 'Red stripes'], era: 'pirate', source: 'era', desc: 'Standard deckhand gear. Perfect for blending in with a crew.' },
  { id: 'captain-coat', name: "Captain's Coat", slot: 'top', kind: 'coat', colors: [['#c0464b', '#f7c65a'], ['#3f5a8a', '#f7c65a'], ['#f29e4c', '#f7c65a']], colorNames: ['Crimson', 'Admiral', 'Marigold'], era: 'pirate', source: 'era', desc: 'Long coat, shiny buttons, big adventures.' },
  { id: 'linen-tunic', name: 'Linen Tunic', slot: 'top', kind: 'tunic', colors: [['#fbf6ea', '#f7c65a'], ['#fbf6ea', '#6fb3e0']], colorNames: ['Gold sash', 'Blue sash'], era: 'egypt', source: 'era', desc: 'Light linen for the hot Egyptian sun.' },
  { id: 'bowling-shirt', name: 'Bowling Shirt', slot: 'top', kind: 'bowling', colors: [['#6fb3e0', '#fff4e0'], ['#e46a6a', '#fff4e0'], ['#4a3b35', '#f4a3b4']], colorNames: ['Lane blue', 'Strike red', 'Night owl'], era: 'fifties', source: 'era', desc: 'Official Starlight Lanes team shirt.' },
  { id: 'letter-jacket', name: 'Letter Jacket', slot: 'top', kind: 'jacket', colors: [['#c0464b', '#fff4e0'], ['#3f5a8a', '#fff4e0'], ['#4a8f4a', '#fff4e0']], colorNames: ['Cherry', 'Navy', 'Forest'], era: 'fifties', source: 'era', desc: 'A big letter T for Tockwood.' },
  { id: 'doublet', name: 'Velvet Doublet', slot: 'top', kind: 'doublet', colors: [['#3f5a8a', '#f7c65a'], ['#b8404a', '#f7c65a'], ['#4a8f4a', '#f7c65a']], colorNames: ['Lapis', 'Crimson', 'Emerald'], era: 'florence', source: 'era', desc: 'Puffy sleeves, very Renaissance.' },
  { id: 'painter-smock', name: "Painter's Smock", slot: 'top', kind: 'smock', colors: [['#e9e2d0', '#b57a4e'], ['#cfe3f0', '#b57a4e']], colorNames: ['Canvas', 'Sky'], era: 'florence', source: 'era', desc: 'Splattered with every colour of the workshop.' },

  // ---------------- bottoms
  { id: 'shorts-denim', name: 'Denim Shorts', slot: 'bottom', kind: 'shorts', colors: [['#5d86b8', '#fff4e0'], ['#b57a4e', '#fff4e0'], ['#7cc47f', '#fff4e0']], colorNames: ['Denim', 'Khaki', 'Sage'], source: 'start', desc: 'Pockets for pebbles.' },
  { id: 'pants-comfy', name: 'Comfy Pants', slot: 'bottom', kind: 'pants', colors: [['#6b5a8e', '#fff4e0'], ['#3f5a8a', '#fff4e0'], ['#8a5a3a', '#fff4e0']], colorNames: ['Plum', 'Navy', 'Cocoa'], source: 'start', desc: 'Stretchy and splendid.' },
  { id: 'skirt', name: 'Twirly Skirt', slot: 'bottom', kind: 'skirt', colors: [C.pink, C.blue, C.gold], colorNames: ['Pink', 'Blue', 'Buttercup'], source: 'shop', price: 30, desc: 'Excellent for spinning.' },
  { id: 'pleated-skirt', name: 'Pleated Skirt', slot: 'bottom', kind: 'pleated', colors: [['#8a5a3a', '#fff4e0'], ['#3f5a8a', '#fff4e0'], ['#4a8f4a', '#fff4e0']], colorNames: ['Cocoa', 'Navy', 'Moss'], source: 'shop', price: 30, desc: 'Neat pleats for neat feats.' },
  { id: 'pantaloons', name: 'Sailor Pantaloons', slot: 'bottom', kind: 'pantaloons', colors: [['#fff4e0', '#8a5a3a'], ['#d9c9a6', '#8a5a3a']], colorNames: ['Sailcloth', 'Sand'], era: 'pirate', source: 'era', desc: 'Loose and breezy for climbing rigging.' },
  { id: 'shendyt', name: 'Linen Shendyt', slot: 'bottom', kind: 'shendyt', colors: [['#fbf6ea', '#f7c65a'], ['#fbf6ea', '#6fb3e0']], colorNames: ['Gold belt', 'Blue belt'], era: 'egypt', source: 'era', desc: 'A pleated linen kilt, the everyday wear of ancient Egypt.' },
  { id: 'poodle-skirt', name: 'Poodle Skirt', slot: 'bottom', kind: 'poodle', colors: [['#f4a3b4', '#ffffff'], ['#6fb3e0', '#ffffff'], ['#4a3b35', '#f4a3b4']], colorNames: ['Bubblegum', 'Soda blue', 'Jukebox'], era: 'fifties', source: 'era', desc: 'A wide felt skirt with a poodle on it. Very sock hop.' },
  { id: 'cuffed-jeans', name: 'Cuffed Jeans', slot: 'bottom', kind: 'jeans', colors: [['#4d6f9e', '#a9c3e0'], ['#2f4a70', '#a9c3e0']], colorNames: ['Classic', 'Dark wash'], era: 'fifties', source: 'era', desc: 'Rolled up, rocking out.' },
  { id: 'breeches', name: 'Breeches & Hose', slot: 'bottom', kind: 'breeches', colors: [['#3f5a8a', '#fff4e0'], ['#b8404a', '#fff4e0'], ['#4a3b35', '#f7c65a']], colorNames: ['Lapis', 'Crimson', 'Ink'], era: 'florence', source: 'era', desc: 'Puffy breeches over stockings, as worn in 1500s Florence.' },

  // ---------------- shoes
  { id: 'sneakers', name: 'Sneakers', slot: 'shoes', kind: 'sneakers', colors: [['#e46a6a', '#ffffff'], ['#6fb3e0', '#ffffff'], ['#f7c65a', '#ffffff']], colorNames: ['Red', 'Blue', 'Yellow'], source: 'start', desc: 'Built for running after corgis.' },
  { id: 'rainboots', name: 'Rain Boots', slot: 'shoes', kind: 'rainboots', colors: [['#f7c65a', '#fff4e0'], ['#e46a6a', '#fff4e0'], ['#7cc47f', '#fff4e0']], colorNames: ['Yellow', 'Red', 'Frog'], source: 'shop', price: 25, desc: 'Puddles fear them.' },
  { id: 'hiking-boots', name: 'Hiking Boots', slot: 'shoes', kind: 'boots', colors: [['#8a5a3a', '#e46a6a'], ['#5a4a3a', '#f7c65a']], colorNames: ['Trail', 'Summit'], source: 'shop', price: 30, desc: 'For every trail, even through time.' },
  { id: 'buckle-shoes', name: 'Buckle Shoes', slot: 'shoes', kind: 'buckle', colors: [['#4a3b35', '#f7c65a'], ['#8a5a3a', '#f7c65a']], colorNames: ['Black', 'Brown'], era: 'pirate', source: 'era', desc: 'Shiny buckles for a shipshape look.' },
  { id: 'reed-sandals', name: 'Reed Sandals', slot: 'shoes', kind: 'sandals', colors: [['#d9b77a', '#8a5a3a'], ['#c9a060', '#6fb3e0']], colorNames: ['Natural', 'Painted'], era: 'egypt', source: 'era', desc: 'Woven from papyrus reeds.' },
  { id: 'saddle-shoes', name: 'Saddle Shoes', slot: 'shoes', kind: 'saddle', colors: [['#ffffff', '#4a3b35'], ['#ffffff', '#c0464b']], colorNames: ['Classic', 'Cherry'], era: 'fifties', source: 'era', desc: 'Two-tone and toe-tapping.' },
  { id: 'roller-skates', name: 'Roller Skates', slot: 'shoes', kind: 'skates', colors: [['#f4a3b4', '#ffffff'], ['#6fb3e0', '#ffffff']], colorNames: ['Pink', 'Blue'], era: 'fifties', source: 'era', desc: 'Straight from the roller rink.' },
  { id: 'velvet-slippers', name: 'Velvet Slippers', slot: 'shoes', kind: 'slippers', colors: [['#b8404a', '#f7c65a'], ['#3f5a8a', '#f7c65a']], colorNames: ['Crimson', 'Lapis'], era: 'florence', source: 'era', desc: 'Soft slippers fit for a court dance.' },

  // ---------------- accessories
  { id: 'round-glasses', name: 'Round Glasses', slot: 'acc', kind: 'glasses', colors: [['#4a3b35', '#dff3ff'], ['#d9a23a', '#dff3ff'], ['#e46a6a', '#dff3ff']], colorNames: ['Classic', 'Gold', 'Red'], source: 'shop', price: 25, desc: 'Great for reading history notes.' },
  { id: 'scarf', name: 'Knitted Scarf', slot: 'acc', kind: 'scarf', colors: [C.red, C.mint, C.gold], colorNames: ['Berry', 'Mint', 'Honey'], source: 'shop', price: 20, desc: 'Grandma-level coziness.' },
  { id: 'backpack', name: 'Explorer Backpack', slot: 'acc', kind: 'backpack', colors: [['#f29e4c', '#8a5a3a'], ['#6fb3e0', '#3f5a8a'], ['#7cc47f', '#4a8f4a']], colorNames: ['Orange', 'Blue', 'Green'], source: 'start', desc: 'Room for snacks and souvenirs.' },
  { id: 'bowtie', name: 'Bow Tie', slot: 'acc', kind: 'bowtie', colors: [C.red, C.blue, ['#f4a3b4', '#fff']], colorNames: ['Red', 'Blue', 'Pink'], source: 'shop', price: 15, desc: 'Instantly fancy.' },
  { id: 'parrot', name: 'Parrot Pal', slot: 'acc', kind: 'parrot', colors: [['#7cc47f', '#e46a6a'], ['#6fb3e0', '#f7c65a']], colorNames: ['Green', 'Blue'], era: 'pirate', source: 'era', desc: 'Squawks "Pieces of eight!" (it means coins).' },
  { id: 'eyepatch', name: 'Pirate Eye Patch', slot: 'acc', kind: 'eyepatch', colors: [['#4a3b35', '#4a3b35']], colorNames: ['Black'], era: 'pirate', source: 'era', desc: 'Just for fun — you can still see perfectly!' },
  { id: 'broad-collar', name: 'Broad Collar', slot: 'acc', kind: 'collar', colors: [['#6fb3e0', '#f7c65a'], ['#e46a6a', '#f7c65a'], ['#7cc47f', '#f7c65a']], colorNames: ['Turquoise', 'Carnelian', 'Malachite'], era: 'egypt', source: 'era', desc: 'A beaded wesekh collar, the height of Egyptian fashion.' },
  { id: 'cateye-glasses', name: 'Cat-Eye Glasses', slot: 'acc', kind: 'cateye', colors: [['#e46a6a', '#dff3ff'], ['#4a3b35', '#dff3ff'], ['#a58bd6', '#dff3ff']], colorNames: ['Cherry', 'Classic', 'Grape'], era: 'fifties', source: 'era', desc: 'Pointy, sparkly, and very 1957.' },
  { id: 'pearls', name: 'Pearl Necklace', slot: 'acc', kind: 'pearls', colors: [['#fff8ec', '#e8dcc8']], colorNames: ['Pearl'], era: 'fifties', source: 'era', desc: 'Pop-bead pearls for the sock hop.' },
  { id: 'gold-chain', name: 'Guild Chain', slot: 'acc', kind: 'chain', colors: [['#f7c65a', '#b8404a']], colorNames: ['Gold'], era: 'florence', source: 'era', desc: 'A medallion chain like the ones Florentine guild members wore.' },
];

export const BISCUIT_ITEMS: BiscuitItem[] = [
  { id: 'biscuit-bandana', name: 'Bandana', slot: 'neck', kind: 'bandana', colors: [['#e46a6a', '#ffffff'], ['#6fb3e0', '#ffffff'], ['#7cc47f', '#ffffff'], ['#f7c65a', '#ffffff']], colorNames: ['Red', 'Blue', 'Green', 'Yellow'], source: 'start', desc: "Biscuit's trusty bandana." },
  { id: 'biscuit-bowtie', name: 'Dapper Bow Tie', slot: 'neck', kind: 'bowtie', colors: [['#a58bd6', '#fff'], ['#e46a6a', '#fff']], colorNames: ['Grape', 'Red'], source: 'shop', price: 15, desc: 'Very good boy. Very dapper.' },
  { id: 'biscuit-scarf', name: 'Puppy Scarf', slot: 'neck', kind: 'scarf', colors: [['#f7c65a', '#e46a6a'], ['#9fe0c0', '#fff']], colorNames: ['Sunny', 'Mint'], source: 'shop', price: 15, desc: 'Keeps a corgi cozy.' },
  { id: 'gold-collar', name: 'Golden Collar', slot: 'neck', kind: 'goldcollar', colors: [['#f7c65a', '#6fb3e0']], colorNames: ['Gold & lapis'], era: 'egypt', source: 'era', desc: 'Egyptians adored their dogs — and their collars!' },
  { id: 'lace-collar', name: 'Lace Collar', slot: 'neck', kind: 'lace', colors: [['#ffffff', '#f7c65a']], colorNames: ['Lace'], era: 'florence', source: 'era', desc: 'Fancy enough for a Florentine portrait.' },
  { id: 'pirate-hat', name: 'Tiny Pirate Hat', slot: 'hat', kind: 'tricorn', colors: [['#4a3b35', '#f7c65a'], ['#3f5a8a', '#f7c65a']], colorNames: ['Classic', 'Navy'], era: 'pirate', source: 'era', desc: 'Captain Biscuit reporting for duty!' },
  { id: 'party-bow', name: 'Party Bow', slot: 'hat', kind: 'bow', colors: [['#f4a3b4', '#fff'], ['#6fb3e0', '#fff'], ['#f7c65a', '#fff']], colorNames: ['Pink', 'Blue', 'Gold'], source: 'shop', price: 10, desc: 'Every day is a party with Biscuit.' },
  { id: 'bunny-ear-hat', name: 'Bunny-Ear Hat', slot: 'hat', kind: 'bunnyears', colors: [['#ffffff', '#f4a3b4']], colorNames: ['Snowy'], source: 'bunny', desc: 'A corgi who thinks he is a bunny.' },
  { id: 'sock-hop-cap', name: 'Soda Jerk Cap', slot: 'hat', kind: 'paper', colors: [['#ffffff', '#e46a6a']], colorNames: ['Diner'], era: 'fifties', source: 'era', desc: 'From the Rocket Diner, with love.' },
];

export const CLOTHES_BY_ID = new Map(CLOTHES.map((c) => [c.id, c]));
export const BISCUIT_BY_ID = new Map(BISCUIT_ITEMS.map((c) => [c.id, c]));

export function pieceFor(worn: { id: string; color: number } | null | undefined): WornPiece | null {
  if (!worn) return null;
  const item = CLOTHES_BY_ID.get(worn.id);
  if (!item) return null;
  const [main, accent] = item.colors[Math.min(worn.color, item.colors.length - 1)] ?? item.colors[0];
  return { kind: item.kind, main, accent, extra: item.extra };
}

export function biscuitPieceFor(worn: { id: string; color: number } | null | undefined): WornPiece | null {
  if (!worn) return null;
  const item = BISCUIT_BY_ID.get(worn.id);
  if (!item) return null;
  const [main, accent] = item.colors[Math.min(worn.color, item.colors.length - 1)] ?? item.colors[0];
  return { kind: item.kind, main, accent };
}

/** Convert a saved player profile into a drawable character spec. */
export function specForPlayer(p: PlayerProfile): CharSpec {
  return {
    species: 'human',
    skin: SKIN_TONES[p.look.skin] ?? SKIN_TONES[1],
    hair: HAIR_COLORS[p.look.hair] ?? HAIR_COLORS[0],
    hairStyle: p.look.hairStyle,
    outfit: outfitPieces(p.outfit),
  };
}

export function outfitPieces(o: Outfit): CharSpec['outfit'] {
  return { hat: pieceFor(o.hat), top: pieceFor(o.top), bottom: pieceFor(o.bottom), shoes: pieceFor(o.shoes), acc: pieceFor(o.acc) };
}

export function biscuitPieces(o: BiscuitOutfit): { hat: WornPiece | null; neck: WornPiece | null } {
  return { hat: biscuitPieceFor(o.hat), neck: biscuitPieceFor(o.neck) };
}

/** A stable key for caching generated sprite sheets per outfit/look. */
export function lookKey(p: PlayerProfile): string {
  const o = p.outfit;
  const k = (w: { id: string; color: number } | null | undefined) => (w ? `${w.id}:${w.color}` : '-');
  return `${p.look.skin}.${p.look.hair}.${p.look.hairStyle}|${k(o.hat)}|${k(o.top)}|${k(o.bottom)}|${k(o.shoes)}|${k(o.acc)}`;
}

/** How many worn pieces belong to a given era (for "dressing the part" checks and reactions). */
export function eraPieces(o: Outfit, era: EraId): number {
  let n = 0;
  for (const w of Object.values(o)) {
    if (w && CLOTHES_BY_ID.get(w.id)?.era === era) n++;
  }
  return n;
}
