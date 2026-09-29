import { app } from '../app';
import { audio } from '../audio/audio';
import { REMINDER_CHOICES, type Settings } from '../core/settings';
import { h } from './dom';
import { button, ui } from './ui';
import { segmented, slider, toggle } from './widgets';

/** Settings: volume, text speed, playtime reminder, colorblind colours, puzzles, touch, motion, controls. */
export function openSettings(): void {
  if (ui.has('settings')) return;
  const s = app.settings;
  const set = (p: Partial<Settings>) => {
    app.setSettings(p);
  };
  const close = () => {
    audio.sfx('close');
    ui.pop('settings');
  };
  const panel = h(
    'div',
    { class: 'panel settings-panel' },
    h('h2', null, '⚙️ Settings'),
    h(
      'section',
      { class: 'set-section' },
      h('h3', null, '🔊 Sound'),
      slider('Volume', s.masterVolume, (v) => set({ masterVolume: v }), 'set-volume'),
      slider('Music', s.musicVolume, (v) => set({ musicVolume: v }), 'set-music'),
      slider('Effects', s.sfxVolume, (v) => {
        set({ sfxVolume: v });
        audio.sfx('blip');
      }, 'set-sfx'),
      toggle('Mute everything', s.muted, (v) => set({ muted: v }), 'set-mute'),
    ),
    h(
      'section',
      { class: 'set-section' },
      h('h3', null, '💬 Text'),
      segmented(
        'Text speed',
        [
          { value: 'slow', text: 'Slow' },
          { value: 'normal', text: 'Normal' },
          { value: 'fast', text: 'Fast' },
          { value: 'instant', text: 'Instant' },
        ],
        s.textSpeed,
        (v) => set({ textSpeed: v }),
        'set-text',
      ),
    ),
    h(
      'section',
      { class: 'set-section' },
      h('h3', null, '⏰ Playtime reminder'),
      h('p', { class: 'small set-note' }, 'Pip suggests a stretch break after this much play:'),
      segmented(
        'Remind after',
        REMINDER_CHOICES.map((m) => ({ value: m, text: `${m} min` })),
        s.reminderMinutes,
        (v) => set({ reminderMinutes: v }),
        'set-reminder',
      ),
      toggle('Late-night nudge (after 9 PM)', s.lateNightNudge, (v) => set({ lateNightNudge: v }), 'set-late'),
    ),
    h(
      'section',
      { class: 'set-section' },
      h('h3', null, '🎨 Colours & comfort'),
      toggle('Colourblind-friendly colours', s.colorblind, (v) => set({ colorblind: v }), 'set-colorblind'),
      toggle('Reduce motion', s.reduceMotion, (v) => set({ reduceMotion: v }), 'set-motion'),
    ),
    h(
      'section',
      { class: 'set-section' },
      h('h3', null, '🧩 Puzzles'),
      segmented(
        'Puzzle difficulty',
        [
          { value: 'adaptive', text: 'Adaptive' },
          { value: 'easy', text: 'Easy' },
          { value: 'medium', text: 'Medium' },
          { value: 'hard', text: 'Hard' },
        ],
        s.puzzleMode,
        (v) => set({ puzzleMode: v }),
        'set-puzzle',
      ),
    ),
    h(
      'section',
      { class: 'set-section' },
      h('h3', null, '🎮 Controls'),
      segmented(
        'On-screen touch controls',
        [
          { value: 'auto', text: 'Auto' },
          { value: 'on', text: 'On' },
          { value: 'off', text: 'Off' },
        ],
        s.touchControls,
        (v) => set({ touchControls: v }),
        'set-touch',
      ),
      button('Controls guide', () => openControls(), { icon: '🕹️', cls: 'blue', testid: 'set-controls' }),
    ),
    h('div', { class: 'row end sticky-foot' }, button('Done', close, { icon: '✔', testid: 'settings-done' })),
  );
  ui.push({ id: 'settings', el: h('div', { class: 'center-wrap' }, panel), onBack: close });
  audio.sfx('open');
}

export function openControls(): void {
  if (ui.has('controls')) return;
  const close = () => ui.pop('controls');
  const row = (what: string, p1: string, p2: string) => h('tr', null, h('th', null, what), h('td', null, p1), h('td', null, p2));
  const panel = h(
    'div',
    { class: 'panel controls-panel' },
    h('h2', null, '🕹️ Controls'),
    h(
      'div',
      { class: 'controls-grid' },
      h(
        'div',
        { class: 'controls-card' },
        h('h3', null, '⌨️ Keyboard'),
        h(
          'table',
          { class: 'keys' },
          h('tr', null, h('th', null, ''), h('th', null, 'Player 1'), h('th', null, 'Player 2')),
          row('Move', 'W A S D', 'Arrows'),
          row('Action / talk', 'E  (Space)', '/  (Enter)'),
          row('Sniff / back', 'Q', '.'),
          row('Pause', 'Esc / P', 'Esc / P'),
        ),
        h('p', { class: 'small' }, 'Playing alone? Both sets of keys move you.'),
      ),
      h(
        'div',
        { class: 'controls-card' },
        h('h3', null, '🎮 Gamepad'),
        h('ul', null, h('li', null, 'Stick / d-pad: move'), h('li', null, 'A: action · B: sniff / back'), h('li', null, 'Start: pause'), h('li', null, 'Pad 2 + Start: Player 2 joins!')),
      ),
      h(
        'div',
        { class: 'controls-card' },
        h('h3', null, '📱 Touch'),
        h('ul', null, h('li', null, 'Drag on the left: move'), h('li', null, 'A: action · B: sniff'), h('li', null, '❚❚ top-right: pause'), h('li', null, '2 players: each gets half the screen')),
      ),
    ),
    h('div', { class: 'row end sticky-foot' }, button('Back', close, { cls: 'secondary', autofocus: true, testid: 'controls-back' })),
  );
  ui.push({ id: 'controls', el: h('div', { class: 'center-wrap backdrop' }, panel), onBack: close });
}
