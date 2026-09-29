import { app } from '../app';
import { audio } from '../audio/audio';
import { iconUrl } from '../art/icons';
import { ITEM_BY_ID } from '../data/items';
import { h, clear } from './dom';
import { button, closeOnBackdrop, toast, ui } from './ui';

/** A small market stall (Juniper's seeds and honey): buy things one at a time with Tockens. */
export interface StallGood {
  id: string;
  price: number;
}

export function openStall(title: string, goods: StallGood[], blurb: string): Promise<void> {
  const d = app.data;
  if (!d || ui.has('stall')) return Promise.resolve();
  return new Promise((resolve) => {
    const list = h('div', { class: 'sell-list' });
    const coins = h('div', { class: 'wd-coins', attrs: { 'data-testid': 'stall-tockens' } });
    const close = () => {
      audio.sfx('close');
      ui.pop('stall');
      resolve();
    };
    const render = () => {
      const focusId = (document.activeElement as HTMLElement | null)?.getAttribute('data-testid');
      clear(coins);
      coins.append(h('img', { attrs: { src: iconUrl('tockens'), alt: '' } }), `${d.tockens}`);
      clear(list);
      for (const g of goods) {
        const it = ITEM_BY_ID.get(g.id)!;
        list.append(
          h(
            'div',
            { class: 'sell-row' },
            h('img', { class: 'sell-icon', attrs: { src: iconUrl(g.id), alt: '' } }),
            h('div', { class: 'sell-info' }, h('div', { class: 'sell-name' }, `${it.name}${d.inventory[g.id] ? ` (you have ${d.inventory[g.id]})` : ''}`), h('div', { class: 'small' }, it.desc)),
            button(`🪙 ${g.price}`, () => {
              if (d.tockens < g.price) {
                audio.sfx('error');
                toast('Not enough Tockens — sell spare finds to Dr. Quill!', { icon: '🪙', now: true });
                return;
              }
              d.tockens -= g.price;
              d.inventory[g.id] = (d.inventory[g.id] ?? 0) + 1;
              audio.sfx('coin');
              app.autosave.request();
              render();
            }, { cls: 'gold small-btn', testid: `stall-buy-${g.id}` }),
          ),
        );
      }
      if (focusId) {
        const again = list.parentElement?.querySelector<HTMLElement>(`[data-testid="${focusId}"]`);
        // that row sold out: move to the next thing you can press
        (again ?? list.querySelector<HTMLElement>('button') ?? list.parentElement?.querySelector<HTMLElement>('.sticky-foot button'))?.focus({ preventScroll: true });
      }
    };
    const panel = h(
      'div',
      { class: 'panel sell-panel' },
      h('div', { class: 'wd-head' }, h('h2', null, title), coins),
      h('p', { class: 'small' }, blurb),
      list,
      h('div', { class: 'row end sticky-foot' }, button('Done', close, { icon: '✔', autofocus: true, testid: 'stall-done' })),
    );
    ui.push({ id: 'stall', el: closeOnBackdrop(h('div', { class: 'center-wrap backdrop' }, panel), close), onBack: close });
    audio.sfx('open');
    render();
  });
}
