import { app } from '../app';
import { audio } from '../audio/audio';
import { h } from './dom';
import { button, closeOnBackdrop, ui } from './ui';

/**
 * The Map of Time (opened at the clocktower portal): Tockwood and the eras along a winding
 * river of time. Unlocked eras can be visited; the rest wait until their Time Sand calls.
 */
export interface EraStop {
  id: 'pirate' | 'egypt' | 'fifties' | 'florence';
  name: string;
  when: string;
  icon: string;
  /** where the portal drops you */
  map: string;
  spawn: string;
  /** can the family go there yet? */
  open: () => boolean;
  /** the era's Time Sand is already home */
  done: () => boolean;
  /** built yet? (later chapters) */
  built: boolean;
}

const f = (k: string) => !!app.data?.flags[k];
const hasSand = (id: string) => !!app.data?.sands.includes(id);

export const ERAS: EraStop[] = [
  { id: 'pirate', name: 'The Golden Age of Piracy', when: 'The Caribbean, around 1715', icon: '🏴', map: 'cove', spawn: 'portal', open: () => f('portal:ready'), done: () => hasSand('pirate'), built: true },
  { id: 'egypt', name: 'Ancient Egypt', when: 'Giza, around 2500 BCE', icon: '🔺', map: 'egypt', spawn: 'portal', open: () => hasSand('pirate'), done: () => hasSand('egypt'), built: false },
  { id: 'fifties', name: '1950s America', when: 'A little town, the 1950s', icon: '🎳', map: 'fifties', spawn: 'portal', open: () => hasSand('pirate'), done: () => hasSand('fifties'), built: true },
  { id: 'florence', name: 'Renaissance Florence', when: 'Italy, around 1500', icon: '🎨', map: 'florence', spawn: 'portal', open: () => hasSand('egypt') && hasSand('fifties'), done: () => hasSand('florence'), built: false },
];

export function openWorldMap(): Promise<EraStop | null> {
  if (ui.has('worldmap')) return Promise.resolve(null);
  return new Promise((resolve) => {
    const close = (v: EraStop | null) => {
      audio.sfx(v ? 'portal' : 'close');
      ui.pop('worldmap');
      resolve(v);
    };
    const stops = ERAS.map((e, i) => {
      const open = e.open() && e.built;
      const status = e.done() ? '✨ Time Sand found!' : open ? 'The sand is calling!' : e.open() ? 'Coming soon...' : 'The sands haven’t called you here yet.';
      return h(
        'div',
        { class: `wm-stop ${open ? 'open' : 'locked'} ${e.done() ? 'done' : ''}`, style: `--i:${i}` },
        h('div', { class: 'wm-icon', attrs: { 'aria-hidden': 'true' } }, open || e.done() ? e.icon : '❔'),
        h('div', { class: 'wm-text' }, h('div', { class: 'wm-name' }, open || e.done() ? e.name : '???'), h('div', { class: 'small' }, open || e.done() ? e.when : 'A faraway time'), h('div', { class: 'small wm-status' }, status)),
        open ? button(e.done() ? 'Visit again' : 'Travel!', () => close(e), { icon: '🌀', testid: `wm-go-${e.id}`, cls: e.done() ? 'secondary' : '' }) : null,
      );
    });
    const panel = h(
      'div',
      { class: 'panel worldmap-panel', attrs: { 'data-testid': 'world-map' } },
      h('div', { class: 'wd-head' }, h('h2', null, '🌀 The Map of Time'), h('div', { class: 'small' }, `⌛ ${app.data?.sands.length ?? 0} of 8 Time Sands home`)),
      h('p', { class: 'small' }, 'Pip’s portal can carry you through history. Where does a Time Sand call from?'),
      h('div', { class: 'wm-home' }, '🏝️ Tockwood Isle — home'),
      h('div', { class: 'wm-river' }, stops),
      h('div', { class: 'row end sticky-foot' }, button('Stay home', () => close(null), { cls: 'secondary', testid: 'wm-close' })),
    );
    ui.push({ id: 'worldmap', el: closeOnBackdrop(h('div', { class: 'center-wrap backdrop' }, panel), () => close(null)), onBack: () => close(null) });
    audio.sfx('page');
  });
}
