import { app } from '../app';
import { audio } from '../audio/audio';
import { iconUrl } from '../art/icons';
import { character } from '../data/characters';
import { FAVOURITE_SOUP, MAGIC_SOUPS, SILLY_SOUPS } from '../soup/recipes';
import { h } from './dom';
import { button, closeOnBackdrop, ui } from './ui';
import { registerPauseEntry } from './pause';

/**
 * The Recipe Book: every magic soup is a page. Before you've brewed it, the page shows the
 * riddle clue you heard (or a mystery); afterwards, the ingredients you used and what it does.
 */
export function openRecipeBook(): void {
  const d = app.data;
  if (!d || ui.has('recipes')) return;
  const close = () => {
    audio.sfx('close');
    ui.pop('recipes');
  };
  const who = (id?: string) => (id ? character(id).name || id : '');
  const pages = MAGIC_SOUPS.map((s) => {
    const found = d.recipes.includes(s.id);
    const clue = d.clues.includes(s.id);
    const combo = String(d.flags[`recipe:combo:${s.id}`] ?? '');
    const lovers = Object.entries(FAVOURITE_SOUP)
      .filter(([npc, soup]) => soup === s.id && d.flags[`fav:${npc}`])
      .map(([npc]) => who(npc));
    return h(
      'div',
      { class: `rb-page ${found ? 'found' : clue ? 'clue' : 'unknown'}`, attrs: { 'data-testid': `rb-${s.id}` } },
      h('img', { class: 'rb-bowl', attrs: { src: iconUrl(found ? `bowl:${s.color}` : 'bowl:#d9cfc2'), alt: '' } }),
      h(
        'div',
        { class: 'rb-text' },
        h('div', { class: 'rb-name' }, found ? s.name : '???', s.twoPlayer ? h('span', { class: 'rb-two', attrs: { title: 'needs two players stirring together' } }, ' 🥄🥄') : null),
        found ? h('div', { class: 'small' }, s.desc) : null,
        found && combo ? h('div', { class: 'rb-combo' }, combo.split('+').map((id) => h('img', { attrs: { src: iconUrl(id), alt: id, title: id } }))) : null,
        !found && clue ? h('div', { class: 'rb-clue' }, `“${s.clue}”`, h('span', { class: 'small rb-from' }, ` — ${who(String(d.flags[`cluefrom:${s.id}`] ?? s.clueFrom ?? ''))}`)) : null,
        !found && !clue ? h('div', { class: 'small rb-mystery' }, 'A mystery soup… keep helping your neighbours to hear a clue!') : null,
        lovers.length ? h('div', { class: 'small rb-fav' }, `❤ Favourite of ${lovers.join(', ')}`) : null,
      ),
    );
  });
  const silly = SILLY_SOUPS.filter((s) => d.recipes.includes(s.id));
  const panel = h(
    'div',
    { class: 'panel recipes-panel', attrs: { 'data-testid': 'recipe-book' } },
    h('div', { class: 'wd-head' }, h('h2', null, '📜 Recipe Book'), h('div', { class: 'small' }, `${MAGIC_SOUPS.filter((s) => d.recipes.includes(s.id)).length} of ${MAGIC_SOUPS.length} magic soups · ${Number(d.flags['soup:pots'] ?? 0)} pots brewed`)),
    h('p', { class: 'small' }, 'Each clue describes three ingredients. Any ingredient that fits the description works — experiment at Grandma’s cauldron!'),
    h('div', { class: 'rb-pages' }, pages),
    h('h3', null, '🤪 Silly soups'),
    h('div', { class: 'rb-silly' }, silly.length ? silly.map((s) => h('span', { class: 'rb-silly-chip' }, h('img', { attrs: { src: iconUrl(`bowl:${s.color}`), alt: '' } }), s.name)) : h('span', { class: 'small' }, 'None yet — wrong combinations make silly soups. Try some!')),
    h('div', { class: 'row end sticky-foot' }, button('Close', close, { cls: 'secondary', autofocus: true, testid: 'recipes-close' })),
  );
  ui.push({ id: 'recipes', el: closeOnBackdrop(h('div', { class: 'center-wrap backdrop' }, panel), close), onBack: close });
  audio.sfx('page');
}

registerPauseEntry({ id: 'recipes', icon: '📜', label: 'Recipe Book', order: 35, open: openRecipeBook });
