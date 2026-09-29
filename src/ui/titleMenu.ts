import { app } from '../app';
import { startNewGame, continueGame } from '../flow';
import { h } from './dom';
import { pickSlot } from './slots';
import { button, ui } from './ui';
import { openSettings } from './settingsScreen';
import { audio } from '../audio/audio';

export async function showTitleMenu(): Promise<void> {
  ui.pop('title');
  const cont = await app.saves.continueSlot().catch(() => null);
  // The player (or a test) may already have started a game while we were reading the saves.
  if (!app.phaser.scene.isActive('title') || ui.has('title')) return;
  const anySave = cont !== null;

  const buttons = h(
    'div',
    { class: 'title-buttons' },
    anySave ? button('Continue', () => void continueGame(cont!), { icon: '▶', autofocus: true, testid: 'title-continue' }) : null,
    button(
      'New Game',
      async () => {
        const slot = await pickSlot('new');
        if (slot) await startNewGame(slot);
      },
      { icon: '✦', autofocus: !anySave, testid: 'title-new', cls: anySave ? 'secondary' : '' },
    ),
    anySave
      ? button(
          'Load Game',
          async () => {
            const slot = await pickSlot('load');
            if (slot) await continueGame(slot);
          },
          { icon: '📖', cls: 'secondary', testid: 'title-load' },
        )
      : null,
    button('Settings', () => openSettings(), { icon: '⚙️', cls: 'secondary', testid: 'title-settings' }),
  );
  audio.music('title');

  const el = h(
    'div',
    { class: 'title-screen' },
    h(
      'div',
      { class: 'logo' },
      h('div', { class: 'logo-paw', attrs: { 'aria-hidden': 'true' } }, '🐾'),
      h('div', { class: 'logo-top' }, 'Pawprints'),
      h('div', { class: 'logo-bottom' }, 'Through Time'),
    ),
    buttons,
    h('div', { class: 'title-foot' }, '1 or 2 players · keyboard, gamepad or touch'),
  );
  ui.push({ id: 'title', el, dim: false });
}
