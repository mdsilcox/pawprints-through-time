import type { CharSpec, Species } from '../art/character';

/**
 * Everyone who can speak: name, how they look (for portraits), and their voice blip.
 * Visual specs for animal-folk use the shared paper-doll body with a species head.
 */
export interface CharacterDef {
  id: string;
  name: string;
  title?: string;
  /** 'fairy' and 'corgi' have bespoke art; everyone else is a paper doll */
  art: 'fairy' | 'corgi' | 'doll' | 'narrator' | 'player';
  spec?: CharSpec;
  voice: { midi: number; kind: 'soft' | 'squeak' | 'deep' | 'chime' };
  color: string;
}

const doll = (species: Species, skin: string, outfit: CharSpec['outfit'], extra: Partial<CharSpec> = {}): CharSpec => ({ species, skin, outfit, ...extra });
const P = (kind: string, main: string, accent: string, extra?: string) => ({ kind, main, accent, extra });

export const CHARACTERS: Record<string, CharacterDef> = {
  narrator: { id: 'narrator', name: '', art: 'narrator', voice: { midi: 72, kind: 'chime' }, color: '#b57a4e' },
  p1: { id: 'p1', name: 'Player 1', art: 'player', voice: { midi: 67, kind: 'soft' }, color: '#f29e4c' },
  p2: { id: 'p2', name: 'Player 2', art: 'player', voice: { midi: 64, kind: 'soft' }, color: '#6fb3e0' },
  pip: { id: 'pip', name: 'Pip', title: 'Time Fairy', art: 'fairy', voice: { midi: 84, kind: 'chime' }, color: '#a58bd6' },
  biscuit: { id: 'biscuit', name: 'Biscuit', title: 'Corgi', art: 'corgi', voice: { midi: 70, kind: 'squeak' }, color: '#f29e4c' },
  clover: {
    id: 'clover',
    name: 'Clover',
    title: 'Bunny Chef',
    art: 'doll',
    spec: doll('rabbit', '#f4ede4', { hat: P('bandana', '#7cc47f', '#ffffff'), top: P('shirt', '#9fe0c0', '#fff'), bottom: P('skirt', '#f4a3b4', '#fff'), shoes: P('slippers', '#e46a6a', '#fff') }, { fur2: '#fff8f0' }),
    voice: { midi: 76, kind: 'soft' },
    color: '#7cc47f',
  },
  quill: {
    id: 'quill',
    name: 'Dr. Quill',
    title: 'Time Historian',
    art: 'doll',
    spec: doll('hedgehog', '#a0785a', { top: P('cardigan', '#6f9fd8', '#fff'), bottom: P('skirt', '#8a5a3a', '#fff'), shoes: P('boots', '#5a4a3a', '#f7c65a'), acc: P('glasses', '#d9a23a', '#dff3ff') }, { fur2: '#f6e3c8' }),
    voice: { midi: 69, kind: 'soft' },
    color: '#6f9fd8',
  },
  bramble: {
    id: 'bramble',
    name: 'Bramble',
    title: 'Tailor',
    art: 'doll',
    spec: doll('badger', '#8c8c9a', { top: P('vest', '#a58bd6', '#f7c65a'), bottom: P('pants', '#4a3b35', '#fff'), shoes: P('buckle', '#4a3b35', '#f7c65a'), acc: P('scarf', '#f4a3b4', '#fff') }, { fur2: '#ffffff' }),
    voice: { midi: 66, kind: 'soft' },
    color: '#a58bd6',
  },
  finnegan: {
    id: 'finnegan',
    name: 'Finnegan',
    title: 'Fisherfrog',
    art: 'doll',
    spec: doll('frog', '#86c46a', { hat: P('bucket', '#f7c65a', '#b57a4e'), top: P('coat', '#f7c65a', '#fff4e0'), bottom: P('pants', '#3f5a8a', '#fff'), shoes: P('rainboots', '#3f5a8a', '#fff') }, { fur2: '#e8f5c8' }),
    voice: { midi: 55, kind: 'deep' },
    color: '#7cc47f',
  },
  juniper: {
    id: 'juniper',
    name: 'Juniper',
    title: 'Gardener',
    art: 'doll',
    spec: doll('goat', '#f3ecdf', { hat: P('sunhat', '#f3dca2', '#7cc47f'), top: P('shirt', '#f29e4c', '#fff'), bottom: P('shorts', '#b57a4e', '#fff'), shoes: P('boots', '#8a5a3a', '#e46a6a') }, { fur2: '#d9cbb3' }),
    voice: { midi: 69, kind: 'soft' },
    color: '#f29e4c',
  },
  rocco: {
    id: 'rocco',
    name: 'Rocco',
    title: 'Clock Tinkerer',
    art: 'doll',
    spec: doll('raccoon', '#9a938c', { hat: P('cap', '#6fb3e0', '#fff'), top: P('shirt', '#7cc47f', '#fff'), bottom: P('pants', '#8a5a3a', '#fff'), shoes: P('sneakers', '#e46a6a', '#fff'), acc: P('backpack', '#b57a4e', '#8a5a3a') }, { fur2: '#e8e2da' }),
    voice: { midi: 71, kind: 'squeak' },
    color: '#6fb3e0',
  },
  rosita: {
    id: 'rosita',
    name: 'Rosita',
    title: 'Dance Teacher',
    art: 'doll',
    spec: doll('flamingo', '#f7a7b8', { hat: P('flowercrown', '#7cc47f', '#f7c65a'), top: P('tee', '#ffffff', '#e46a6a', 'star'), bottom: P('skirt', '#e46a6a', '#fff'), shoes: P('slippers', '#f7c65a', '#fff') }, { fur2: '#ffd2dc' }),
    voice: { midi: 79, kind: 'soft' },
    color: '#f4a3b4',
  },
  grandma: { id: 'grandma', name: 'Grandma Hopkins', title: 'Warren Elder', art: 'doll', voice: { midi: 64, kind: 'soft' }, color: '#a58bd6' },
  rollo: {
    id: 'rollo',
    name: 'Rollo',
    title: 'Lanes Keeper',
    art: 'doll',
    spec: doll('bear', '#b07a52', { hat: P('cap', '#e46a6a', '#fff'), top: P('bowling', '#6fb3e0', '#fff4e0'), bottom: P('pants', '#3f5a8a', '#fff'), shoes: P('saddle', '#ffffff', '#4a3b35') }, { fur2: '#e6c29c' }),
    voice: { midi: 52, kind: 'deep' },
    color: '#e46a6a',
  },
  // ---------------------------------------------------------------- 1950s America
  duke: {
    id: 'duke',
    name: 'Duke',
    title: 'Captain of the Alley Cats',
    art: 'doll',
    spec: doll('owl', '#8a7a9e', { top: P('jacket', '#e0555f', '#fff4e0'), bottom: P('jeans', '#3f5a8a', '#fff4e0'), shoes: P('saddle', '#ffffff', '#4a3b35') }, { fur2: '#d8cfe6' }),
    voice: { midi: 59, kind: 'deep' },
    color: '#e0555f',
  },
  mabel: {
    id: 'mabel',
    name: 'Mabel',
    title: 'Owner of the Rock-a-Roll Diner',
    art: 'doll',
    spec: doll('cat', '#9aa4b1', { hat: P('headscarf', '#f7c9d9', '#e0555f'), top: P('shirt', '#f7c9d9', '#ffffff'), bottom: P('poodle', '#6ec9c0', '#ffffff'), shoes: P('skates', '#ffffff', '#e0555f'), acc: P('cateye', '#e0555f', '#f7c65a') }, { fur2: '#e6e9ee' }),
    voice: { midi: 74, kind: 'soft' },
    color: '#6ec9c0',
  },
  // ---------------------------------------------------------------- Renaissance Florence (~1500)
  lucia: {
    id: 'lucia',
    name: 'Maestra Lucia',
    title: 'Inventor',
    art: 'doll',
    spec: doll('badger', '#6d6a74', { hat: P('beret', '#4a3b35', '#f7c65a'), top: P('smock', '#e9e2d0', '#b57a4e'), bottom: P('breeches', '#3f5a8a', '#fff4e0'), shoes: P('slippers', '#8a5a3a', '#f7c65a'), acc: P('glasses', '#f7c65a', '#ffffff') }, { fur2: '#f4ede4' }),
    voice: { midi: 65, kind: 'soft' },
    color: '#b57a4e',
  },
  fiorella: {
    id: 'fiorella',
    name: 'Fiorella',
    title: 'Painter',
    art: 'doll',
    spec: doll('flamingo', '#f4a3b4', { hat: P('beret', '#b8404a', '#f7c65a'), top: P('smock', '#cfe3f0', '#b57a4e'), bottom: P('skirt', '#a58bd6', '#fff4e0'), shoes: P('slippers', '#b8404a', '#f7c65a') }, { fur2: '#fbd3dc' }),
    voice: { midi: 79, kind: 'chime' },
    color: '#f4a3b4',
  },
  orsola: {
    id: 'orsola',
    name: 'Duchess Orsola',
    title: 'Duchess of the Palazzo',
    art: 'doll',
    spec: doll('bear', '#a8785a', { hat: P('flowercrown', '#f7c65a', '#f4a3b4'), top: P('doublet', '#6f3fa0', '#f7c65a'), bottom: P('skirt', '#6f3fa0', '#f7c65a'), shoes: P('slippers', '#f7c65a', '#6f3fa0'), acc: P('pearls', '#ffffff', '#f7c65a') }, { fur2: '#d9b594' }),
    voice: { midi: 60, kind: 'soft' },
    color: '#a58bd6',
  },
  beppe: {
    id: 'beppe',
    name: 'Beppe',
    title: 'Grocer',
    art: 'doll',
    spec: doll('goat', '#e8e0d0', { hat: P('cap', '#4a8f4a', '#f7c65a'), top: P('shirt', '#fff4e0', '#4a8f4a'), bottom: P('breeches', '#8a5a3a', '#fff4e0'), shoes: P('boots', '#6d4a30', '#8a5a3a') }, { fur2: '#fbf6ea' }),
    voice: { midi: 62, kind: 'deep' },
    color: '#4a8f4a',
  },
  // ---------------------------------------------------------------- Ancient Egypt (Giza, ~2500 BCE)
  neb: {
    id: 'neb',
    name: 'Neb',
    title: 'Master Builder',
    art: 'doll',
    spec: doll('bear', '#b98a5e', { hat: P('headscarf', '#fbf6ea', '#6fb3e0'), top: P('tunic', '#fbf6ea', '#f7c65a'), bottom: P('shendyt', '#fbf6ea', '#f7c65a'), shoes: P('sandals', '#d9b77a', '#8a5a3a') }, { fur2: '#e2c29a' }),
    voice: { midi: 55, kind: 'deep' },
    color: '#c99a6b',
  },
  ankhi: {
    id: 'ankhi',
    name: 'Ankhi',
    title: 'Royal Scribe',
    art: 'doll',
    spec: doll('cat', '#4a4458', { top: P('tunic', '#fbf6ea', '#6fb3e0'), bottom: P('shendyt', '#fbf6ea', '#6fb3e0'), shoes: P('sandals', '#c9a060', '#6fb3e0'), acc: P('collar', '#4fb8b0', '#f7c65a') }, { fur2: '#6d6680' }),
    voice: { midi: 71, kind: 'soft' },
    color: '#4fb8b0',
  },
  sesi: {
    id: 'sesi',
    name: 'Sesi',
    title: 'Village Baker',
    art: 'doll',
    spec: doll('fox', '#e8c98f', { hat: P('headscarf', '#e46a6a', '#f7c65a'), top: P('tunic', '#fbf6ea', '#e46a6a'), bottom: P('shendyt', '#fbf6ea', '#e46a6a'), shoes: P('sandals', '#d9b77a', '#8a5a3a') }, { fur2: '#fff4e0' }),
    voice: { midi: 76, kind: 'squeak' },
    color: '#e0a458',
  },
  sphinx: { id: 'sphinx', name: 'The Great Sphinx', title: 'Keeper of Riddles', art: 'doll', voice: { midi: 48, kind: 'deep' }, color: '#c9a266' },
  // ---------------------------------------------------------------- the Golden Age of Piracy (~1715)
  marigold: {
    id: 'marigold',
    name: 'Captain Marigold',
    title: 'Captain of the Sunny Marigold',
    art: 'doll',
    spec: doll('fox', '#f29e4c', { hat: P('tricorn', '#4a3b35', '#f7c65a'), top: P('coat', '#c0464b', '#f7c65a'), bottom: P('pantaloons', '#fff4e0', '#c0464b'), shoes: P('buckle', '#4a3b35', '#f7c65a') }, { fur2: '#fff4e0' }),
    voice: { midi: 69, kind: 'soft' },
    color: '#e46a6a',
  },
  pepper: {
    id: 'pepper',
    name: 'Pepper',
    title: 'First Mate',
    art: 'doll',
    spec: doll('parrot', '#6fbe5a', { hat: P('bandana', '#6fb3e0', '#ffffff'), top: P('sailor', '#fff4e0', '#6fb3e0'), bottom: P('pantaloons', '#3f5a8a', '#fff'), shoes: P('buckle', '#4a3b35', '#f7c65a') }, { fur2: '#f7c65a' }),
    voice: { midi: 86, kind: 'squeak' },
    color: '#6fbe5a',
  },
  cookie: {
    id: 'cookie',
    name: 'Cookie',
    title: 'Ship’s Cook',
    art: 'doll',
    spec: doll('mouse', '#c9b8a6', { hat: P('bandana', '#fff8ec', '#e46a6a'), top: P('sailor', '#ffffff', '#e46a6a'), bottom: P('pants', '#8a5a3a', '#fff'), shoes: P('buckle', '#4a3b35', '#d9cfc2') }, { fur2: '#f4c7c3' }),
    voice: { midi: 78, kind: 'squeak' },
    color: '#e46a6a',
  },
  saltwhistle: {
    id: 'saltwhistle',
    name: 'Captain Saltwhistle',
    title: 'Captain of the Merry Mackerel',
    art: 'doll',
    spec: doll('dog', '#d9cfc2', { hat: P('tricorn', '#3f5a8a', '#f7c65a'), top: P('coat', '#3f5a8a', '#f7c65a'), bottom: P('pantaloons', '#fff4e0', '#3f5a8a'), shoes: P('buckle', '#4a3b35', '#f7c65a') }, { fur2: '#ffffff' }),
    voice: { midi: 57, kind: 'deep' },
    color: '#3f5a8a',
  },
  coco: {
    id: 'coco',
    name: 'Coco',
    title: 'Fruit Seller',
    art: 'doll',
    spec: doll('cat', '#f29e4c', { hat: P('bandana', '#f7c65a', '#e46a6a'), top: P('tee', '#7cc47f', '#fff4e0'), bottom: P('skirt', '#e46a6a', '#fff'), shoes: P('slippers', '#f7c65a', '#fff') }, { fur2: '#fff4e0' }),
    voice: { midi: 75, kind: 'soft' },
    color: '#7cc47f',
  },
};

export function character(id: string): CharacterDef {
  return CHARACTERS[id] ?? CHARACTERS.narrator;
}

export function registerCharacter(def: CharacterDef): void {
  CHARACTERS[def.id] = def;
}
