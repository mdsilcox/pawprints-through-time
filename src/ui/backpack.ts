import { app } from '../app';
import { audio } from '../audio/audio';
import { iconUrl } from '../art/icons';
import { ITEMS, type ItemKind } from '../data/items';
import { h } from './dom';
import { button, closeOnBackdrop, ui } from './ui';
import { registerPauseEntry } from './pause';
import { soupFromItem } from '../soup/recipes';
import { drinkSoup } from '../soup/effects';

/** The backpack: everything you've collected, sorted into tabs, with descriptions. */
const TABS: { id: string; label: string; kinds: ItemKind[] }[] = [
  { id: 'all', label: 'All', kinds: [] },
  { id: 'food', label: '🥕 Ingredients', kinds: ['ingredient', 'seed', 'soup'] },
  { id: 'finds', label: '🐚 Finds', kinds: ['shell', 'fossil', 'trinket'] },
  { id: 'treasure', label: '🏺 Treasures', kinds: ['artifact', 'quest', 'furniture'] },
];

export function openBackpack(): void {
  if (ui.has('backpack') || !app.data) return;
  const inv = app.data.inventory;
  let tab = 'all';
  const grid = h('div', { class: 'bp-grid' });
  const detail = h('div', { class: 'bp-detail' }, h('div', { class: 'small' }, 'Pick something to look at it.'));
  const tabRow = h('div', { class: 'bp-tabs' });
  const close = () => {
    audio.sfx('close');
    ui.pop('backpack');
  };
  const render = () => {
    grid.innerHTML = '';
    const kinds = TABS.find((t) => t.id === tab)!.kinds;
    const owned = ITEMS.filter((it) => (inv[it.id] ?? 0) > 0 && (!kinds.length || kinds.includes(it.kind)));
    if (!owned.length) grid.appendChild(h('div', { class: 'bp-empty' }, 'Nothing here yet — explore and let Biscuit dig!'));
    for (const it of owned) {
      const b = h(
        'button',
        {
          class: 'bp-item',
          dataset: { nav: '' },
          attrs: { type: 'button', 'data-testid': `bp-${it.id}`, title: it.name },
          onclick: () => show(it.id),
          onfocus: () => show(it.id),
        },
        h('img', { attrs: { src: iconUrl(it.id), alt: '' } }),
        h('span', { class: 'bp-count' }, `×${inv[it.id]}`),
      );
      grid.appendChild(b);
    }
    [...tabRow.children].forEach((c) => c.classList.toggle('on', (c as HTMLElement).dataset.tab === tab));
  };
  const show = (id: string) => {
    const it = ITEMS.find((x) => x.id === id)!;
    detail.innerHTML = '';
    detail.append(h('img', { class: 'bp-detail-icon', attrs: { src: iconUrl(id), alt: '' } }), h('div', null, h('h3', null, it.name), h('p', { class: 'small' }, it.desc)));
    const soup = soupFromItem(id);
    if (soup && (inv[id] ?? 0) > 0)
      detail.append(
        button('Drink it!', () => {
          inv[id] = (inv[id] ?? 0) - 1;
          if (inv[id] <= 0) delete inv[id];
          app.autosave.request();
          close();
          drinkSoup(soup.id, 2);
        }, { icon: '😋', testid: 'bp-drink' }),
      );
  };
  for (const t of TABS)
    tabRow.appendChild(
      h(
        'button',
        {
          class: 'seg-btn',
          dataset: { nav: '', tab: t.id },
          attrs: { type: 'button' },
          onclick: () => {
            tab = t.id;
            audio.sfx('blip');
            render();
          },
        },
        t.label,
      ),
    );
  const panel = h(
    'div',
    { class: 'panel backpack-panel' },
    h('div', { class: 'bp-head' }, h('h2', null, '🎒 Backpack'), h('div', { class: 'bp-tockens', attrs: { 'data-testid': 'bp-tockens' } }, h('img', { attrs: { src: iconUrl('tockens'), alt: '' } }), `${app.data.tockens} Tockens`)),
    tabRow,
    h('div', { class: 'bp-body' }, grid, detail),
    h('div', { class: 'row end sticky-foot' }, button('Close', close, { cls: 'secondary', testid: 'backpack-close' })),
  );
  render();
  ui.push({ id: 'backpack', el: closeOnBackdrop(h('div', { class: 'center-wrap backdrop' }, panel), close), onBack: close });
  audio.sfx('open');
}

registerPauseEntry({ id: 'backpack', icon: '🎒', label: 'Backpack', order: 20, open: openBackpack });
