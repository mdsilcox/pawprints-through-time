import { app } from '../app';
import { audio } from '../audio/audio';
import { input } from '../input/input';
import { returnToTitle } from '../flow';
import { setTwoPlayer } from '../players';
import { h } from './dom';
import { button, ui } from './ui';
import { openSettings } from './settingsScreen';

/**
 * Pause menu: a grid of big tiles (map, wardrobe, journal, recipes, bunnies, museum notes, log,
 * settings...) plus resume / save / quit. Systems register their tiles as they come online.
 */
export interface PauseEntry {
  id: string;
  icon: string;
  label: string;
  order: number;
  open: () => void;
  visible?: () => boolean;
  badge?: () => string | null;
}

const entries: PauseEntry[] = [];
export function registerPauseEntry(e: PauseEntry): void {
  const i = entries.findIndex((x) => x.id === e.id);
  if (i >= 0) entries[i] = e;
  else entries.push(e);
  entries.sort((a, b) => a.order - b.order);
}

registerPauseEntry({ id: 'settings', icon: '⚙️', label: 'Settings', order: 90, open: () => openSettings() });

/** Who opened the pause menu (Player 2's gamepad Start opens it for Player 2): their wardrobe opens first. */
let opener: 0 | 1 = 0;
export const pauseOpener = (): 0 | 1 => (input.twoPlayer ? opener : 0);

export function openPause(by: 0 | 1 = 0): void {
  if (ui.has('pause')) return;
  opener = by;
  audio.sfx('open');
  app.setFlag('opened:pause');
  const close = () => {
    audio.sfx('close');
    ui.pop('pause');
  };
  const tiles = entries
    .filter((e) => !e.visible || e.visible())
    .map((e) => {
      const badge = e.badge?.();
      return h(
        'button',
        {
          class: 'pause-tile',
          dataset: { nav: '' },
          attrs: { type: 'button', 'data-testid': `pause-${e.id}` },
          onclick: (ev: Event) => {
            ev.stopPropagation();
            if (ui.locked) return;
            audio.sfx('select');
            e.open();
          },
        },
        h('span', { class: 'tile-icon', attrs: { 'aria-hidden': 'true' } }, e.icon),
        h('span', { class: 'tile-label' }, e.label),
        badge ? h('span', { class: 'tile-badge' }, badge) : null,
      );
    });
  const p2Label = () => (input.twoPlayer ? 'Player 2: Leave' : 'Player 2: Join');
  const p2 = button(
    p2Label(),
    () => {
      setTwoPlayer(!input.twoPlayer);
      p2.querySelector('.btn-label')!.textContent = p2Label();
      audio.sfx('join');
    },
    { icon: '👥', cls: 'blue', testid: 'pause-p2' },
  );
  const saveBtn = button(
    'Save',
    async () => {
      await app.saveNow();
      audio.sfx('success');
      // feedback right on the button (a toast would cover the panel on a phone)
      const label = saveBtn.querySelector('.btn-label')!;
      label.textContent = 'Saved!';
      saveBtn.classList.add('saved');
      setTimeout(() => {
        label.textContent = 'Save';
        saveBtn.classList.remove('saved');
      }, 1800);
    },
    { icon: '💾', cls: 'gold', testid: 'pause-save' },
  );
  // mid-game (bowling or dancing): step off the lane / the floor without quitting play
  const sm = app.phaser.scene;
  const game = (['bowl', 'dance'] as const).find((k) => sm.isActive(k) && !ui.has(`${k === 'bowl' ? 'bowl' : 'dance'}-results`));
  const leave = game
    ? button(
        game === 'bowl' ? 'Leave the game' : 'Stop dancing',
        () => {
          ui.pop('pause');
          sm.stop(game);
        },
        { icon: '🚪', cls: 'secondary', testid: 'pause-leave-game' },
      )
    : null;
  const el = h(
    'div',
    { class: 'center-wrap' },
    h(
      'div',
      { class: 'panel pause-panel' },
      h('div', { class: 'pause-head' }, h('h2', null, 'Paused'), h('div', { class: 'pause-sub small' }, app.data ? `Day ${app.data.day} · ⌛ ${app.data.sands.length}/8 · 🐰 ${app.data.bunnies.length}` : '')),
      h('div', { class: 'pause-tiles' }, tiles),
      h(
        'div',
        { class: 'pause-actions' },
        button('Resume', close, { icon: '▶', autofocus: true, testid: 'pause-resume' }),
        leave,
        p2,
        saveBtn,
        button('Save & quit', () => void returnToTitle('quit'), { icon: '🏠', cls: 'secondary', testid: 'pause-quit' }),
      ),
    ),
  );
  ui.push({ id: 'pause', el, onBack: close });
}
