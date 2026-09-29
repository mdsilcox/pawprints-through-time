import { app } from '../app';
import { audio } from '../audio/audio';
import { ERA_TITLE, NOTES, NOTE_BY_ID } from '../data/notes';
import { h } from './dom';
import { button, closeOnBackdrop, toast, ui } from './ui';
import { registerPauseEntry } from './pause';

/** Collect one of Pip's History Notes (once). */
export function learnNote(id: string): boolean {
  const d = app.data;
  const n = NOTE_BY_ID.get(id);
  if (!d || !n || d.notes.includes(id)) return false;
  d.notes.push(id);
  audio.sfx('page');
  toast(`New History Note: ${n.title}`, { icon: '📜', cls: 'quest', ms: 3200 });
  app.autosave.request();
  return true;
}

/** Pip's History Notes, by era (also shown in the Museum of Time later). */
export function openNotes(): void {
  const d = app.data;
  if (!d || ui.has('notes')) return;
  const close = () => {
    audio.sfx('close');
    ui.pop('notes');
  };
  const eras = [...new Set(NOTES.map((n) => n.era))];
  const panel = h(
    'div',
    { class: 'panel notes-panel', attrs: { 'data-testid': 'history-notes' } },
    h('div', { class: 'wd-head' }, h('h2', null, '📜 Pip’s History Notes'), h('div', { class: 'small' }, `${d.notes.length} of ${NOTES.length} collected`)),
    h('p', { class: 'small' }, 'True facts from every time you visit. Pip writes one down whenever you learn something new!'),
    eras.map((era) =>
      h(
        'div',
        { class: 'nt-era' },
        h('h3', null, ERA_TITLE[era]),
        NOTES.filter((n) => n.era === era).map((n) =>
          d.notes.includes(n.id)
            ? h('div', { class: 'nt-card', attrs: { 'data-testid': `note-${n.id}` } }, h('div', { class: 'nt-title' }, n.title), h('div', null, n.text))
            : h('div', { class: 'nt-card locked' }, h('div', { class: 'nt-title' }, '???'), h('div', { class: 'small' }, 'Keep exploring to find this note!')),
        ),
      ),
    ),
    h('div', { class: 'row end sticky-foot' }, button('Close', close, { cls: 'secondary', autofocus: true, testid: 'notes-close' })),
  );
  ui.push({ id: 'notes', el: closeOnBackdrop(h('div', { class: 'center-wrap backdrop' }, panel), close), onBack: close });
  audio.sfx('page');
}

registerPauseEntry({ id: 'notes', icon: '📜', label: 'History Notes', order: 45, open: openNotes, visible: () => (app.data?.notes.length ?? 0) > 0 });
