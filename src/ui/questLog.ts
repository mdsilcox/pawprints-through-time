import { app } from '../app';
import { audio } from '../audio/audio';
import { questLog } from '../story/quests';
import { h } from './dom';
import { button, closeOnBackdrop, ui } from './ui';
import { registerPauseEntry } from './pause';

/** The Adventure Log: current quests with their steps, and finished ones. */
export function openQuestLog(): void {
  if (ui.has('questlog') || !app.data) return;
  const d = app.data;
  const { active, finished } = questLog(d);
  const close = () => {
    audio.sfx('close');
    ui.pop('questlog');
  };
  const questCard = (p: ReturnType<typeof questLog>['active'][number], done: boolean) =>
    h(
      'div',
      { class: `quest-card ${done ? 'done' : ''}` },
      h('div', { class: 'quest-title' }, h('span', { class: 'quest-icon' }, p.quest.icon), p.quest.title, done ? h('span', { class: 'quest-check' }, '✔') : null),
      done
        ? null
        : h(
            'ul',
            { class: 'quest-steps' },
            p.quest.steps.map((s) => {
              const ok = s.done(d);
              const cur = p.current === s;
              if (!ok && !cur) return null; // don't spoil future steps
              return h('li', { class: ok ? 'ok' : 'cur' }, ok ? '✔ ' : '➜ ', s.text);
            }),
          ),
    );
  const panel = h(
    'div',
    { class: 'panel questlog-panel' },
    h('h2', null, '📜 Adventure Log'),
    active.length ? active.map((p) => questCard(p, false)) : h('p', null, 'Nothing to do right now — go explore!'),
    finished.length ? h('h3', { class: 'quest-done-head' }, 'Finished') : null,
    finished.map((p) => questCard(p, true)),
    h('div', { class: 'row end' }, button('Back', close, { cls: 'secondary', autofocus: true, testid: 'questlog-back' })),
  );
  ui.push({ id: 'questlog', el: closeOnBackdrop(h('div', { class: 'center-wrap backdrop' }, panel), close), onBack: close });
  audio.sfx('page');
}

registerPauseEntry({ id: 'log', icon: '📜', label: 'Adventure Log', order: 30, open: openQuestLog });
