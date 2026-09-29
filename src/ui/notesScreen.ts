import { app } from '../app';
import { audio } from '../audio/audio';
import { ERA_TITLE, NOTES, NOTE_BY_ID } from '../data/notes';
import { ITEMS } from '../data/items';
import { iconUrl } from '../art/icons';
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
    museumCatalogue(),
    h('div', { class: 'row end sticky-foot' }, button('Close', close, { cls: 'secondary', autofocus: true, testid: 'notes-close' })),
  );
  ui.push({ id: 'notes', el: closeOnBackdrop(h('div', { class: 'center-wrap backdrop' }, panel), close), onBack: close });
  audio.sfx('page');
}

/** Everything given to the Museum of Time (the cases show the latest; the catalogue keeps them all). */
function museumCatalogue(): HTMLElement {
  const d = app.data!;
  const pieces = ITEMS.filter((it) => it.museum);
  const from: Record<string, string> = { tockwood: 'Tockwood Isle', pirate: 'the Golden Age of Piracy', egypt: 'Ancient Egypt', fifties: '1950s America', florence: 'Renaissance Florence' };
  return h(
    'div',
    { class: 'nt-era', attrs: { 'data-testid': 'museum-catalogue' } },
    h('h3', null, `🏛️ In the Museum of Time — ${d.museum.filter((id) => pieces.some((p) => p.id === id)).length} of ${pieces.length}`),
    h('p', { class: 'small' }, 'Sell your first find of each kind to Dr. Quill and it goes into the museum with your names on its card.'),
    h(
      'div',
      { class: 'nt-finds' },
      pieces.map((it) =>
        d.museum.includes(it.id)
          ? h('div', { class: 'nt-find', attrs: { 'data-testid': `museum-${it.id}` } }, h('img', { attrs: { src: iconUrl(it.id), alt: '' } }), h('div', null, h('div', { class: 'nt-title' }, it.name), h('div', { class: 'small' }, it.desc)))
          : h('div', { class: 'nt-find locked' }, h('div', { class: 'nt-q' }, '?'), h('div', { class: 'small' }, `Something from ${from[it.origin] ?? 'somewhere'}...`)),
      ),
    ),
  );
}

registerPauseEntry({ id: 'notes', icon: '📜', label: 'History Notes', order: 45, open: openNotes, visible: () => (app.data?.notes.length ?? 0) > 0 || (app.data?.museum.length ?? 0) > 0 });
