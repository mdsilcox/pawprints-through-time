import { app } from '../app';
import { audio } from '../audio/audio';
import { renderBunnyPortrait } from '../art/bunny';
import { HOPKINS, BUNNY_REWARDS } from '../data/bunnies';
import { h } from './dom';
import { button, ui } from './ui';
import { registerPauseEntry } from './pause';

const ERA_NAMES: Record<string, string> = {
  pirate: '🏴 Golden Age of Piracy',
  egypt: '🔺 Ancient Egypt',
  fifties: '🎳 1950s America',
  florence: '🎨 Renaissance Florence',
};

const portraitCache = new Map<string, string>();
function portrait(id: string): string {
  if (!portraitCache.has(id)) {
    const b = HOPKINS.find((x) => x.id === id)!;
    portraitCache.set(id, renderBunnyPortrait(b.look, 120).toDataURL());
  }
  return portraitCache.get(id)!;
}

/** Bunny Tracker: which Hopkins cousins are home, hints for the rest, and rescue rewards. */
export function openBunnyTracker(): void {
  if (ui.has('bunnies') || !app.data) return;
  const home = new Set(app.data.bunnies);
  const close = () => {
    audio.sfx('close');
    ui.pop('bunnies');
  };
  const eras = Object.keys(ERA_NAMES).map((era) =>
    h(
      'div',
      { class: 'bt-era' },
      h('h3', null, ERA_NAMES[era]),
      h(
        'div',
        { class: 'bt-row' },
        HOPKINS.filter((b) => b.era === era).map((b) =>
          home.has(b.id)
            ? h('div', { class: 'bt-card found', attrs: { 'data-testid': `bt-${b.id}` } }, h('img', { attrs: { src: portrait(b.id), alt: '' } }), h('div', { class: 'bt-name' }, b.name), h('div', { class: 'small' }, 'Home safe! 🏡'))
            : h('div', { class: 'bt-card', attrs: { 'data-testid': `bt-${b.id}` } }, h('div', { class: 'bt-silhouette' }, '?'), h('div', { class: 'bt-name' }, '???'), h('div', { class: 'small' }, b.hint)),
        ),
      ),
    ),
  );
  const next = BUNNY_REWARDS.find((r) => r.count > home.size);
  const panel = h(
    'div',
    { class: 'panel tracker-panel' },
    h('h2', null, `🐰 Bunny Tracker — ${home.size}/12 home`),
    h('div', { class: 'bt-bar' }, h('div', { class: 'bt-fill', style: { width: `${(home.size / 12) * 100}%` } })),
    next ? h('p', { class: 'small' }, `Next surprise at ${next.count} bunnies home!`) : h('p', { class: 'small' }, 'Every bunny is home! 🥕'),
    eras,
    h('div', { class: 'row end' }, button('Close', close, { cls: 'secondary', autofocus: true, testid: 'bunnies-close' })),
  );
  ui.push({ id: 'bunnies', el: h('div', { class: 'center-wrap backdrop' }, panel), onBack: close });
  audio.sfx('open');
}

registerPauseEntry({ id: 'bunnies', icon: '🐰', label: 'Bunny Tracker', order: 60, open: openBunnyTracker, badge: () => (app.data?.bunnies.length ? `${app.data.bunnies.length}` : null) });
