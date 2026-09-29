import { app } from '../app';
import { audio } from '../audio/audio';
import { ITEMS, ITEM_BY_ID, type ItemDef } from '../data/items';
import { iconUrl } from '../art/icons';
import { h, clear } from './dom';
import { button, closeOnBackdrop, toast, ui } from './ui';

/**
 * Dr. Quill's trading table: sell spare finds (shells, fossils, trinkets) for Tockens.
 * The first of every museum piece goes into the Museum of Time instead, with a finder's fee —
 * so digging every day → Tockens → Bramble's clothes is a loop that never runs dry.
 */
const SELLABLE_KINDS = new Set(['shell', 'fossil', 'trinket']);

export function sellable(d = app.data): ItemDef[] {
  if (!d) return [];
  return ITEMS.filter(
    (it) =>
      SELLABLE_KINDS.has(it.kind) &&
      (it.value ?? 0) > 0 &&
      (d.inventory[it.id] ?? 0) > 0 &&
      // Rocco needs three clock gears for his favour: never sell those out from under the quest
      !(it.id === 'clock-gear' && !d.flags['rocco:gears']),
  );
}

/** Sell (or, the first time for a museum piece, donate) `n` of an item. Returns the Tockens paid. */
export function sellItem(id: string, n = 1): { paid: number; donated: boolean } {
  const d = app.data;
  const it = ITEM_BY_ID.get(id);
  if (!d || !it || !SELLABLE_KINDS.has(it.kind)) return { paid: 0, donated: false };
  const have = d.inventory[id] ?? 0;
  n = Math.min(n, have);
  if (n <= 0) return { paid: 0, donated: false };
  let paid = 0;
  let donated = false;
  if (it.museum && !d.museum.includes(id)) {
    // the very first one goes on display, with a finder's fee on top
    d.museum.push(id);
    paid += (it.value ?? 0) + 5;
    donated = true;
  } else paid += it.value ?? 0;
  paid += (n - 1) * (it.value ?? 0);
  d.inventory[id] = have - n;
  if (d.inventory[id] <= 0) delete d.inventory[id];
  d.tockens += paid;
  app.autosave.request();
  return { paid, donated };
}

export function openSellScreen(): Promise<void> {
  const d = app.data;
  if (!d || ui.has('sell')) return Promise.resolve();
  return new Promise((resolve) => {
    const list = h('div', { class: 'sell-list' });
    const coins = h('div', { class: 'wd-coins', attrs: { 'data-testid': 'sell-tockens' } });
    const close = () => {
      audio.sfx('close');
      ui.pop('sell');
      resolve();
    };
    const render = () => {
      const focusId = (document.activeElement as HTMLElement | null)?.getAttribute('data-testid');
      clear(coins);
      coins.append(h('img', { attrs: { src: iconUrl('tockens'), alt: '' } }), `${d.tockens}`);
      clear(list);
      const items = sellable(d);
      if (!items.length) list.append(h('p', { class: 'sell-empty' }, 'Nothing to sell right now. Biscuit can dig up more treasures — look for sparkly mounds!'));
      for (const it of items) {
        const n = d.inventory[it.id] ?? 0;
        const museumFirst = it.museum && !d.museum.includes(it.id);
        const sell = (all: boolean) => {
          const r = sellItem(it.id, all ? n : 1);
          if (!r.paid) return;
          audio.sfx(r.donated ? 'fanfare' : 'coin');
          toast(r.donated ? `Your ${it.name} is going in the Museum of Time! +${r.paid} Tockens` : `+${r.paid} Tockens`, { icon: r.donated ? '🏛️' : '🪙', now: true });
          render();
        };
        list.append(
          h(
            'div',
            { class: 'sell-row', attrs: { 'data-testid': `sell-row-${it.id}` } },
            h('img', { class: 'sell-icon', attrs: { src: iconUrl(it.id), alt: '' } }),
            h('div', { class: 'sell-info' }, h('div', { class: 'sell-name' }, `${it.name} ×${n}`), h('div', { class: 'small' }, museumFirst ? `🏛️ First one goes in the museum: +${(it.value ?? 0) + 5}` : `🪙 ${it.value} each`)),
            button('Sell 1', () => sell(false), { cls: 'secondary small-btn', testid: `sell-one-${it.id}` }),
            n > 1 ? button('Sell all', () => sell(true), { cls: 'gold small-btn', testid: `sell-all-${it.id}` }) : null,
          ),
        );
      }
      if (focusId) list.parentElement?.querySelector<HTMLElement>(`[data-testid="${focusId}"]`)?.focus({ preventScroll: true });
    };
    const panel = h(
      'div',
      { class: 'panel sell-panel' },
      h('div', { class: 'wd-head' }, h('h2', null, '🏛️ Dr. Quill’s Trading Table'), coins),
      h('p', { class: 'small' }, 'Dr. Quill pays Tockens for spare finds — and keeps the first of every treasure for the Museum of Time.'),
      list,
      h('div', { class: 'row end sticky-foot' }, button('Done', close, { icon: '✔', autofocus: true, testid: 'sell-done' })),
    );
    ui.push({ id: 'sell', el: closeOnBackdrop(h('div', { class: 'center-wrap backdrop' }, panel), close), onBack: close });
    audio.sfx('open');
    render();
  });
}
