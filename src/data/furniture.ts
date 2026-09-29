/**
 * The decorating catalogue: every piece of furniture you can own, place, move and turn in your
 * cottage. Each is also an inventory item (kind 'furniture') with the same id.
 */
export type FurniturePlace = 'floor' | 'wall' | 'rug';

export interface FurnitureView {
  /** texture key without the `fur-` prefix */
  art: string;
  /** mirrored drawing (facing the other way) */
  flip?: boolean;
  /** turned sideways: the footprint's width and depth swap */
  side?: boolean;
}

export interface FurnitureDef {
  id: string;
  name: string;
  desc: string;
  /** footprint in cells (width × depth) as it first arrives */
  w: number;
  h: number;
  place: FurniturePlace;
  /** the looks it cycles through when you turn it (the first is how it arrives) */
  views: FurnitureView[];
  /** something you can use where it stands */
  use?: { action: string; label: string; range: number };
  /** can be moved and turned but never put away (you need somewhere to sleep!) */
  keep?: boolean;
  /** where it comes from (shown in the planner and the backpack) */
  from: string;
  /** Rocco builds it for this many Tockens */
  price?: number;
  origin: 'tockwood' | 'pirate' | 'egypt' | 'fifties' | 'florence';
}

const four = (art: string): FurnitureView[] => [{ art }, { art: `${art}-side` }, { art: `${art}-back` }, { art: `${art}-side`, flip: true }];
const fourWide = (art: string): FurnitureView[] => [{ art }, { art: `${art}-side`, side: true }, { art: `${art}-back` }, { art: `${art}-side`, side: true, flip: true }];
const flips = (art: string): FurnitureView[] => [{ art }, { art, flip: true }];

export const FURNITURE: FurnitureDef[] = [
  // ---------------- your cottage came furnished
  { id: 'bed', name: 'Cosy Bed', desc: 'Polka-dot blankets and a squashy pillow. Biscuit naps on the end.', w: 2, h: 3, place: 'floor', views: [{ art: 'bed' }, { art: 'bed-side', side: true }, { art: 'bed-side', side: true, flip: true }], use: { action: 'bed', label: 'Sleep', range: 1.5 }, keep: true, from: 'Your cottage', origin: 'tockwood' },
  { id: 'wardrobe', name: 'Wardrobe', desc: 'All your outfits, hung up neatly.', w: 2, h: 2, place: 'floor', views: [{ art: 'wardrobe' }], use: { action: 'wardrobe', label: 'Wardrobe', range: 1.4 }, keep: true, from: 'Your cottage', origin: 'tockwood' },
  { id: 'table', name: 'Kitchen Table', desc: 'Just right for soup and board games.', w: 2, h: 1, place: 'floor', views: [{ art: 'table' }, { art: 'table-side', side: true }], from: 'Your cottage', origin: 'tockwood' },
  { id: 'chair', name: 'Wooden Chair', desc: 'A sturdy little chair.', w: 1, h: 1, place: 'floor', views: four('chair'), from: 'Your cottage', price: 15, origin: 'tockwood' },
  { id: 'bookshelf', name: 'Bookshelf', desc: 'Stories, maps and a few of Pip’s history books.', w: 2, h: 1, place: 'floor', views: [{ art: 'bookshelf' }], from: 'Your cottage', price: 45, origin: 'tockwood' },
  { id: 'plant', name: 'Leafy Plant', desc: 'It likes the sunny window.', w: 1, h: 1, place: 'floor', views: [{ art: 'plant' }], from: 'Your cottage', price: 15, origin: 'tockwood' },
  { id: 'lampfloor', name: 'Floor Lamp', desc: 'A warm glow for reading.', w: 1, h: 1, place: 'floor', views: [{ art: 'lampfloor' }], from: 'Your cottage', price: 20, origin: 'tockwood' },
  { id: 'rug-red', name: 'Red Rug', desc: 'A soft rug with a cream border.', w: 4, h: 3, place: 'rug', views: [{ art: 'rug-red-4x3' }, { art: 'rug-red-3x4', side: true }], from: 'Your cottage', origin: 'tockwood' },
  { id: 'cuckoo', name: 'Cuckoo Clock', desc: 'Rocco built it. On the hour, a wooden bird pops out to say hello.', w: 1, h: 1, place: 'wall', views: [{ art: 'cuckoo' }], from: 'Your cottage', price: 35, origin: 'tockwood' },
  // ---------------- Rocco builds these (Tockwood)
  { id: 'armchair', name: 'Comfy Armchair', desc: 'The squashiest seat in Tockwood.', w: 1, h: 1, place: 'floor', views: four('armchair'), from: 'Rocco’s workshop', price: 40, origin: 'tockwood' },
  { id: 'sofa', name: 'Squishy Sofa', desc: 'Room for two players and a corgi.', w: 2, h: 1, place: 'floor', views: fourWide('sofa'), from: 'Rocco’s workshop', price: 60, origin: 'tockwood' },
  { id: 'sidetable', name: 'Flower Table', desc: 'A little round table with a jug of meadow flowers.', w: 1, h: 1, place: 'floor', views: [{ art: 'sidetable' }], from: 'Rocco’s workshop', price: 25, origin: 'tockwood' },
  { id: 'fishbowl', name: 'Goldfish Bowl', desc: 'Bubbles the goldfish, on a little stand.', w: 1, h: 1, place: 'floor', views: flips('fishbowl'), from: 'Rocco’s workshop', price: 35, origin: 'tockwood' },
  { id: 'toybox', name: 'Toy Box', desc: 'Full of balls, blocks and one squeaky duck.', w: 1, h: 1, place: 'floor', views: flips('toybox'), from: 'Rocco’s workshop', price: 25, origin: 'tockwood' },
  { id: 'bunnyplush', name: 'Giant Bunny Plush', desc: 'Grandma Hopkins says it looks just like cousin Parsnip.', w: 1, h: 1, place: 'floor', views: flips('bunnyplush'), from: 'Rocco’s workshop', price: 40, origin: 'tockwood' },
  { id: 'rug-round', name: 'Round Rug', desc: 'Purple and gold, like the clocktower’s.', w: 3, h: 3, place: 'rug', views: [{ art: 'rug-round-3x3' }], from: 'Rocco’s workshop', price: 30, origin: 'tockwood' },
  { id: 'rug-stripes', name: 'Rainbow Rug', desc: 'Every colour of the rainbow, in stripes.', w: 3, h: 2, place: 'rug', views: [{ art: 'rug-stripes-3x2' }, { art: 'rug-stripes-2x3', side: true }], from: 'Rocco’s workshop', price: 30, origin: 'tockwood' },
  { id: 'painting-sea', name: 'Seaside Painting', desc: 'A little sailboat on a sparkly sea.', w: 1, h: 1, place: 'wall', views: flips('painting-sea'), from: 'Rocco’s workshop', price: 30, origin: 'tockwood' },
  { id: 'painting-meadow', name: 'Meadow Painting', desc: 'Tockwood’s meadow, with a bunny in the grass.', w: 1, h: 1, place: 'wall', views: flips('painting-meadow'), from: 'Rocco’s workshop', price: 30, origin: 'tockwood' },
  // ---------------- brought home from the eras
  { id: 'pirate-chest', name: 'Pirate Sea Chest', desc: 'A sturdy sea chest with brass corners, dug up on Treasure Island.', w: 1, h: 1, place: 'floor', views: flips('seachest'), from: 'Dug up on Treasure Island', origin: 'pirate' },
  { id: 'ship-wheel', name: 'Ship’s Wheel', desc: 'From the Marigold’s old ship. Steer your cottage anywhere!', w: 1, h: 1, place: 'wall', views: [{ art: 'shipwheel' }], from: 'A gift from Captain Marigold', origin: 'pirate' },
  { id: 'jukebox', name: 'Jukebox', desc: 'The Rock-a-Roll Diner’s spare jukebox. It still plays!', w: 1, h: 1, place: 'floor', views: [{ art: 'jukebox' }], from: 'A gift from Mabel', origin: 'fifties' },
  { id: 'globe', name: 'Renaissance Globe', desc: 'A globe of the whole known world, from Duchess Orsola.', w: 1, h: 1, place: 'floor', views: [{ art: 'globe' }], from: 'A gift from Duchess Orsola', origin: 'florence' },
  { id: 'easel', name: 'Painter’s Easel', desc: 'Fiorella says every home needs a painting in progress.', w: 1, h: 1, place: 'floor', views: [{ art: 'easel' }, { art: 'easel', flip: true }], from: 'Rocco’s workshop', price: 35, origin: 'florence' },
  { id: 'egypt-lamp', name: 'Egyptian Lamp', desc: 'A clay oil lamp on a tall stand, from Ankhi the scribe.', w: 1, h: 1, place: 'floor', views: [{ art: 'egyptlamp' }], from: 'A gift from Ankhi', origin: 'egypt' },
  { id: 'cat-statue', name: 'Cat Statue', desc: 'A little carved cat with a gold collar. Egyptians loved cats!', w: 1, h: 1, place: 'floor', views: [{ art: 'catstatue' }], from: 'Rocco’s workshop', price: 45, origin: 'egypt' },
  { id: 'carrot-lamp', name: 'Golden Carrot Lamp', desc: 'From the whole Hopkins family, for bringing every cousin home.', w: 1, h: 1, place: 'floor', views: [{ art: 'carrotlamp' }], from: 'Every bunny rescued', origin: 'tockwood' },
  { id: 'pin-trophy', name: 'Trick Shot Trophy', desc: 'For clearing every trick shot. A golden pin on a pedestal!', w: 1, h: 1, place: 'floor', views: [{ art: 'pintrophy' }], from: 'Every trick shot cleared', origin: 'fifties' },
  { id: 'starlight-cup', name: 'Starlight Cup', desc: 'Champions of the Starlight Junior Cup — that’s you!', w: 1, h: 1, place: 'floor', views: [{ art: 'starlightcup' }], from: 'Won at the Starlight Lanes', origin: 'fifties' },
];

export const FURNITURE_BY_ID = new Map(FURNITURE.map((f) => [f.id, f]));

/** Rocco's workshop stock. */
export const ROCCO_GOODS = FURNITURE.filter((f) => f.price && f.from === 'Rocco’s workshop');
