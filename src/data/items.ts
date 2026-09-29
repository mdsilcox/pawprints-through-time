/**
 * Every collectable thing: beach finds, fossils, trinkets, soup ingredients, seeds and era
 * artifacts. Icons are drawn procedurally by art/icons.ts from the `icon` key.
 */
export type ItemKind = 'shell' | 'fossil' | 'trinket' | 'ingredient' | 'seed' | 'artifact' | 'soup' | 'furniture' | 'quest';
export type Origin = 'tockwood' | 'pirate' | 'egypt' | 'fifties' | 'florence';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  icon: string;
  desc: string;
  origin: Origin;
  /** can be donated to the museum */
  museum?: boolean;
  /** Tockens given when sold/donated for the first time */
  value?: number;
  /** soup ingredient tags used in Clover's riddle clues */
  tags?: string[];
}

export const ITEMS: ItemDef[] = [
  // ---------------- beach finds
  { id: 'shell-scallop', name: 'Scallop Shell', kind: 'shell', icon: 'scallop', origin: 'tockwood', museum: true, value: 5, desc: 'A ridged fan of a shell, still smelling of the sea.' },
  { id: 'shell-spiral', name: 'Spiral Shell', kind: 'shell', icon: 'spiral', origin: 'tockwood', museum: true, value: 5, desc: 'It twists round and round like a tiny staircase.' },
  { id: 'shell-conch', name: 'Pink Conch', kind: 'shell', icon: 'conch', origin: 'tockwood', museum: true, value: 15, desc: 'Hold it to your ear — is that the ocean?' },
  { id: 'sand-dollar', name: 'Sand Dollar', kind: 'shell', icon: 'sanddollar', origin: 'tockwood', museum: true, value: 8, desc: 'Not real money, but Biscuit thinks it is.' },
  { id: 'sea-glass', name: 'Sea Glass', kind: 'trinket', icon: 'seaglass', origin: 'tockwood', value: 4, desc: 'Glass smoothed by the waves into a little gem.' },
  // ---------------- fossils
  { id: 'fossil-ammonite', name: 'Ammonite Fossil', kind: 'fossil', icon: 'ammonite', origin: 'tockwood', museum: true, value: 20, desc: 'An ancient sea creature with a coiled shell, turned to stone.' },
  { id: 'fossil-trilobite', name: 'Trilobite Fossil', kind: 'fossil', icon: 'trilobite', origin: 'tockwood', museum: true, value: 20, desc: 'Trilobites scuttled on the sea floor over 250 million years ago.' },
  { id: 'fossil-fern', name: 'Fern Fossil', kind: 'fossil', icon: 'fern', origin: 'tockwood', museum: true, value: 15, desc: 'A leaf print from a forest older than the dinosaurs.' },
  { id: 'fossil-tooth', name: 'Shark Tooth Fossil', kind: 'fossil', icon: 'tooth', origin: 'tockwood', museum: true, value: 18, desc: 'Sharks lose thousands of teeth in a lifetime!' },
  // ---------------- Tockwood trinkets
  { id: 'old-key', name: 'Old Brass Key', kind: 'trinket', icon: 'key', origin: 'tockwood', value: 6, desc: 'What does it open? Nobody remembers.' },
  { id: 'marble', name: 'Glass Marble', kind: 'trinket', icon: 'marble', origin: 'tockwood', value: 3, desc: 'A swirl of colour caught in glass.' },
  { id: 'button', name: 'Lost Button', kind: 'trinket', icon: 'button', origin: 'tockwood', value: 2, desc: 'Bramble might want this back.' },
  { id: 'clock-gear', name: 'Tiny Clock Gear', kind: 'trinket', icon: 'gear', origin: 'tockwood', value: 5, desc: 'A little brass gear. Rocco collects these!' },
  { id: 'golden-acorn', name: 'Golden Acorn', kind: 'trinket', icon: 'acorn', origin: 'tockwood', museum: true, value: 30, desc: 'A rare, shiny acorn. Lucky!' },
  // ---------------- Tockwood ingredients
  { id: 'carrot', name: 'Carrot', kind: 'ingredient', icon: 'carrot', origin: 'tockwood', value: 3, tags: ['orange', 'crunchy', 'root', 'garden', 'bunny'], desc: 'Crunchy and orange. Every bunny’s favourite.' },
  { id: 'radish', name: 'Radish', kind: 'ingredient', icon: 'radish', origin: 'tockwood', value: 3, tags: ['red', 'root', 'garden', 'spicy'], desc: 'A peppery little red root.' },
  { id: 'pumpkin', name: 'Pumpkin', kind: 'ingredient', icon: 'pumpkin', origin: 'tockwood', value: 5, tags: ['orange', 'big', 'garden', 'sweet'], desc: 'Round, orange and ready for soup.' },
  { id: 'glowcap', name: 'Glowcap Mushroom', kind: 'ingredient', icon: 'glowcap', origin: 'tockwood', value: 6, tags: ['dark', 'glow', 'forest'], desc: 'A mushroom that grows in the dark woods and glows softly.' },
  { id: 'honey', name: 'Honey', kind: 'ingredient', icon: 'honey', origin: 'tockwood', value: 5, tags: ['sweet', 'golden', 'bees'], desc: 'Golden honey from Juniper’s bees.' },
  { id: 'kelp', name: 'Kelp', kind: 'ingredient', icon: 'kelp', origin: 'tockwood', value: 3, tags: ['sea', 'green', 'sways'], desc: 'Seaweed that sways under the waves.' },
  { id: 'sardine', name: 'Sardine', kind: 'ingredient', icon: 'fish', origin: 'tockwood', value: 4, tags: ['sea', 'fish', 'cat'], desc: 'A shiny little fish from Finnegan’s net.' },
  { id: 'clover-leaf', name: 'Clover Leaf', kind: 'ingredient', icon: 'cloverleaf', origin: 'tockwood', value: 2, tags: ['green', 'leafy', 'meadow', 'bunny'], desc: 'Fresh from the bunny meadow.' },
  // ---------------- seeds
  { id: 'seed-carrot', name: 'Carrot Seeds', kind: 'seed', icon: 'seeds-orange', origin: 'tockwood', value: 2, desc: 'Plant in the cottage garden.' },
  { id: 'seed-radish', name: 'Radish Seeds', kind: 'seed', icon: 'seeds-red', origin: 'tockwood', value: 2, desc: 'Plant in the cottage garden.' },
  { id: 'seed-pumpkin', name: 'Pumpkin Seeds', kind: 'seed', icon: 'seeds-cream', origin: 'tockwood', value: 3, desc: 'Plant in the cottage garden.' },
  // ---------------- era ingredients (real foods of each time and place)
  { id: 'coconut', name: 'Coconut', kind: 'ingredient', icon: 'coconut', origin: 'pirate', value: 5, tags: ['hairy', 'island', 'sweet'], desc: 'From a Caribbean palm. Hairy on the outside!' },
  { id: 'sea-salt', name: 'Sea Salt', kind: 'ingredient', icon: 'salt', origin: 'pirate', value: 4, tags: ['sea', 'white', 'salty'], desc: 'Salt dried from Caribbean seawater.' },
  { id: 'island-pepper', name: 'Island Pepper', kind: 'ingredient', icon: 'pepper', origin: 'pirate', value: 5, tags: ['red', 'spicy', 'small', 'island'], desc: 'A tiny pepper that bites back!' },
  { id: 'dates', name: 'Dates', kind: 'ingredient', icon: 'dates', origin: 'egypt', value: 5, tags: ['sweet', 'brown', 'palm'], desc: 'Sweet fruit from the date palm, loved in ancient Egypt.' },
  { id: 'lentils', name: 'Lentils', kind: 'ingredient', icon: 'lentils', origin: 'egypt', value: 4, tags: ['tiny', 'round', 'builders'], desc: 'Tiny round seeds the pyramid builders ate.' },
  { id: 'onion', name: 'Onion', kind: 'ingredient', icon: 'onion', origin: 'egypt', value: 3, tags: ['layers', 'cry'], desc: 'Egyptian workers ate lots of onions. Careful — they make you cry!' },
  { id: 'tomato', name: 'Tomato', kind: 'ingredient', icon: 'tomato', origin: 'fifties', value: 4, tags: ['red', 'round', 'juicy'], desc: 'Tomato soup was a 1950s favourite.' },
  { id: 'corn', name: 'Sweet Corn', kind: 'ingredient', icon: 'corn', origin: 'fifties', value: 4, tags: ['golden', 'teeth', 'sweet'], desc: 'A cob with a thousand golden teeth.' },
  { id: 'milk', name: 'Milk Bottle', kind: 'ingredient', icon: 'milk', origin: 'fifties', value: 3, tags: ['white', 'creamy', 'cat'], desc: 'Delivered to the door in a glass bottle, 1950s-style.' },
  { id: 'basil', name: 'Basil', kind: 'ingredient', icon: 'basil', origin: 'florence', value: 4, tags: ['green', 'leafy', 'summer', 'smell'], desc: 'A fragrant herb from a Florentine garden.' },
  { id: 'beans', name: 'White Beans', kind: 'ingredient', icon: 'beans', origin: 'florence', value: 4, tags: ['climbs', 'white', 'tuscan'], desc: 'Tuscans loved beans so much they were nicknamed "bean-eaters"!' },
  // ---------------- era artifacts (museum)
  { id: 'doubloon', name: 'Gold Doubloon', kind: 'artifact', icon: 'coin', origin: 'pirate', museum: true, value: 25, desc: 'A Spanish gold coin, the treasure pirates dreamed of.' },
  { id: 'spyglass', name: 'Brass Spyglass', kind: 'artifact', icon: 'spyglass', origin: 'pirate', museum: true, value: 20, desc: 'Sailors used spyglasses to spot land and other ships.' },
  { id: 'half-hour-glass', name: 'Ship’s Half-Hour Glass', kind: 'artifact', icon: 'hourglass', origin: 'pirate', museum: true, value: 20, desc: 'Turned every half hour; the ship’s bell rang each time.' },
  { id: 'scarab', name: 'Scarab Amulet', kind: 'artifact', icon: 'scarab', origin: 'egypt', museum: true, value: 25, desc: 'Egyptians carved beetle-shaped charms called scarabs.' },
  { id: 'papyrus', name: 'Papyrus Scroll', kind: 'artifact', icon: 'scroll', origin: 'egypt', museum: true, value: 20, desc: 'Paper made from the papyrus reeds that grow along the Nile.' },
  { id: 'blue-hippo', name: 'Blue Hippo Figurine', kind: 'artifact', icon: 'hippo', origin: 'egypt', museum: true, value: 20, desc: 'A little hippo made of shiny blue faience.' },
  { id: 'jukebox-record', name: 'Vinyl Record', kind: 'artifact', icon: 'record', origin: 'fifties', museum: true, value: 20, desc: 'Records spun at 45 turns a minute in 1950s jukeboxes.' },
  { id: 'bowling-pin', name: 'Starlight Pin', kind: 'artifact', icon: 'pin', origin: 'fifties', museum: true, value: 20, desc: 'A pin from the Starlight Lanes tournament.' },
  { id: 'soda-glass', name: 'Soda-Fountain Glass', kind: 'artifact', icon: 'soda', origin: 'fifties', museum: true, value: 18, desc: 'Milkshakes and floats were served in tall glasses.' },
  { id: 'paintbrush', name: 'Painter’s Brush', kind: 'artifact', icon: 'brush', origin: 'florence', museum: true, value: 20, desc: 'Renaissance painters often made their own brushes.' },
  { id: 'flying-model', name: 'Flying-Machine Model', kind: 'artifact', icon: 'glider', origin: 'florence', museum: true, value: 25, desc: 'A model of an inventor’s dream: flying like a bird.' },
  { id: 'pigment-jar', name: 'Pigment Jar', kind: 'artifact', icon: 'pigment', origin: 'florence', museum: true, value: 18, desc: 'Ground-up minerals made the bright colours of Renaissance paint.' },
  // ---------------- quest items
  { id: 'map-piece', name: 'Treasure Map Piece', kind: 'quest', icon: 'mappiece', origin: 'pirate', desc: 'A torn corner of a pirate map.' },
];

export const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

export function item(id: string): ItemDef {
  const it = ITEM_BY_ID.get(id);
  if (!it) throw new Error(`unknown item ${id}`);
  return it;
}

export function itemName(id: string): string {
  return ITEM_BY_ID.get(id)?.name ?? id;
}
