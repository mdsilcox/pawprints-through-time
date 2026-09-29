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
};

export function character(id: string): CharacterDef {
  return CHARACTERS[id] ?? CHARACTERS.narrator;
}

export function registerCharacter(def: CharacterDef): void {
  CHARACTERS[def.id] = def;
}
