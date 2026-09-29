import { app } from '../app';
import { audio } from '../audio/audio';
import type { Difficulty } from '../core/state';
import { allPuzzles } from '../puzzles/registry';
import { kindIcon, KIND_NAME, openPuzzle } from '../puzzles/ui/screen';
import { DIFFICULTY_LABEL, difficultyFor } from '../puzzles/difficulty';
import { TOCKWOOD_RIDDLES } from '../puzzles/content/riddles';
import type { Era } from '../puzzles/types';
import { h } from './dom';
import { button, closeOnBackdrop, ui } from './ui';
import { registerPauseEntry } from './pause';

const ERA_NAME: Record<Era, string> = {
  tockwood: '🏝️ Tockwood Isle',
  pirates: '🏴 The Golden Age of Piracy',
  egypt: '🔺 Ancient Egypt',
  fifties: '🎳 1950s America',
  florence: '🎨 Renaissance Florence',
};

/**
 * The Puzzle Journal: every brain-builder you've found, with your best stars. Solved puzzles
 * can be replayed at any difficulty (no rewards, just fun).
 */
export function openPuzzleJournal(): void {
  const d = app.data;
  if (!d || ui.has('journal')) return;
  const close = () => {
    audio.sfx('close');
    ui.pop('journal');
  };
  const eras = [...new Set(allPuzzles().map((p) => p.era))];
  const replay = async (id: string, difficulty: Difficulty) => {
    ui.pop('journal');
    const pool = id === 'riddle-stone' ? TOCKWOOD_RIDDLES.filter((r) => d.flags[`riddle:${r.id}`]) : [];
    const riddle = pool.length ? pool[Math.floor(Math.random() * pool.length)] : undefined;
    await openPuzzle(id, { difficulty, replay: true, riddle });
    openPuzzleJournal();
  };
  const now = difficultyFor(app.settings.puzzleMode, d.skill);
  const sections = eras.map((era) =>
    h(
      'div',
      { class: 'jr-era' },
      h('h3', null, ERA_NAME[era]),
      h(
        'div',
        { class: 'jr-list' },
        allPuzzles()
          .filter((p) => p.era === era)
          .map((p) => {
            const rec = d.puzzles[p.id];
            const seen = !!d.flags[`puzzle:seen:${p.id}`] || !!rec;
            if (!seen)
              return h('div', { class: 'jr-card unknown', attrs: { 'data-testid': `jr-${p.id}` } }, h('div', { class: 'jr-title' }, `${kindIcon(p.kind)} ???`), h('div', { class: 'small' }, `Somewhere: ${p.place}`));
            const stars = rec?.solved ? (rec.bestHints === 0 ? 3 : rec.bestHints === 1 ? 2 : 1) : 0;
            const riddles = p.id === 'riddle-stone' ? TOCKWOOD_RIDDLES.filter((r) => d.flags[`riddle:${r.id}`]).length : 0;
            return h(
              'div',
              { class: 'jr-card', attrs: { 'data-testid': `jr-${p.id}` } },
              h('div', { class: 'jr-title' }, `${kindIcon(p.kind)} ${p.title}`),
              h('div', { class: 'small' }, `${KIND_NAME[p.kind]} · ${p.place}`),
              h('div', { class: 'jr-stars', attrs: { 'aria-label': `${stars} stars` } }, [1, 2, 3].map((i) => h('span', { class: i <= stars ? '' : 'off' }, '★'))),
              p.id === 'riddle-stone' ? h('div', { class: 'small' }, `${riddles} of ${TOCKWOOD_RIDDLES.length} riddles solved`) : null,
              rec?.solved
                ? h(
                    'div',
                    { class: 'jr-play' },
                    (['easy', 'medium', 'hard'] as Difficulty[]).map((lvl) =>
                      button(DIFFICULTY_LABEL[lvl], () => void replay(p.id, lvl), { cls: lvl === now ? '' : 'secondary', testid: `jr-play-${p.id}-${lvl}` }),
                    ),
                  )
                : h('div', { class: 'small' }, 'Not solved yet — go back and try!'),
            );
          }),
      ),
    ),
  );
  const solved = Object.values(d.puzzles).filter((r) => r.solved).length;
  const panel = h(
    'div',
    { class: 'panel journal-panel', attrs: { 'data-testid': 'puzzle-journal' } },
    h('div', { class: 'wd-head' }, h('h2', null, '🧩 Puzzle Journal'), h('div', { class: 'small' }, `${solved} solved · puzzles now: ${DIFFICULTY_LABEL[now]}`)),
    sections,
    h('div', { class: 'row end sticky-foot' }, button('Close', close, { cls: 'secondary', autofocus: true, testid: 'journal-close' })),
  );
  ui.push({ id: 'journal', el: closeOnBackdrop(h('div', { class: 'center-wrap backdrop' }, panel), close), onBack: close });
  audio.sfx('page');
}

registerPauseEntry({ id: 'journal', icon: '🧩', label: 'Puzzle Journal', order: 30, open: openPuzzleJournal });
