import { h } from './dom';
import { button, ui } from './ui';
import { input } from '../input/input';
import { returnToTitle } from '../flow';
import { setTwoPlayer } from '../players';

/** Pause menu. Opening it freezes the world (any blocking screen does). */
export function openPause(): void {
  if (ui.has('pause')) return;
  const close = () => ui.pop('pause');
  const p2Label = () => (input.twoPlayer ? 'Player 2: Leave' : 'Player 2: Join');
  const p2 = button(
    p2Label(),
    () => {
      setTwoPlayer(!input.twoPlayer);
      p2.querySelector('.btn-label')!.textContent = p2Label();
    },
    { icon: '👥', cls: 'blue', testid: 'pause-p2' },
  );
  const el = h(
    'div',
    { class: 'center-wrap' },
    h(
      'div',
      { class: 'panel pause-panel' },
      h('h2', null, 'Paused'),
      h(
        'div',
        { class: 'pause-grid' },
        button('Resume', close, { icon: '▶', autofocus: true, testid: 'pause-resume' }),
        p2,
        button('Save & quit to title', () => void returnToTitle('quit'), { icon: '🏠', cls: 'secondary', testid: 'pause-quit' }),
      ),
    ),
  );
  ui.push({ id: 'pause', el, onBack: close });
}
