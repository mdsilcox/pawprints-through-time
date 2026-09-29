import { audio } from '../../audio/audio';
import { h, clear } from '../../ui/dom';
import { cycleMark, emptyMarks, isComplete, isSolved, revealOne, wrongTicks, type Marks } from '../logic/logicGrid';
import { registerView } from './screen';
import { wiggle } from './common';

/** Logic grids: clues on one side, a tap-to-mark grid on the other (✗ then ✓). */
registerView('grid', (ctx) => {
  const g = ctx.variant;
  let marks: Marks = emptyMarks(g);
  const table = h('div', { class: 'lg-table', attrs: { 'data-testid': 'grid-table' } });
  const clues = h(
    'ol',
    { class: 'lg-clues' },
    g.clues.map((c) => h('li', null, c)),
  );
  const el = h('div', { class: 'lg' }, h('div', { class: 'lg-clue-box' }, h('div', { class: 'lg-clue-title' }, '🧶 Clues'), clues), table);

  const render = () => {
    const active = document.activeElement as HTMLElement | null;
    const focusId = active && table.contains(active) ? active.getAttribute('data-testid') : null;
    clear(table);
    const cols = g.categories.reduce((n, c) => n + c.values.length, 0);
    table.style.gridTemplateColumns = `minmax(3.6rem, auto) repeat(${cols}, minmax(1.9rem, 1fr))`;
    // header rows: category names, then values
    table.append(h('div', { class: 'lg-corner' }));
    g.categories.forEach((cat) => table.append(h('div', { class: 'lg-cat', style: `grid-column: span ${cat.values.length}` }, cat.name)));
    table.append(h('div', { class: 'lg-corner' }));
    g.categories.forEach((cat, c) => cat.values.forEach((v, vi) => table.append(h('div', { class: `lg-val ${vi === 0 && c > 0 ? 'sep' : ''}` }, v))));
    const wrong = isComplete(marks) ? wrongTicks(g, marks) : [];
    g.subjects.forEach((subj, s) => {
      table.append(h('div', { class: 'lg-subj' }, subj));
      g.categories.forEach((cat, c) =>
        cat.values.forEach((_, v) => {
          const m = marks[c][s][v];
          const isWrong = m === 2 && wrong.some((w) => w.c === c && w.s === s);
          table.append(
            h(
              'button',
              {
                class: `lg-cell m${m} ${v === 0 && c > 0 ? 'sep' : ''} ${isWrong ? 'bad' : ''}`,
                dataset: { nav: '' },
                attrs: { type: 'button', 'data-testid': `grid-${c}-${s}-${v}`, 'aria-label': `${subj}: ${g.categories[c].values[v]} — ${m === 2 ? (isWrong ? 'yes, but check this one' : 'yes') : m === 1 ? 'no' : 'not sure'}` },
                onclick: (e: Event) => {
                  e.stopPropagation();
                  marks = cycleMark(marks, c, s, v);
                  audio.sfx(marks[c][s][v] === 2 ? 'pickup' : 'blip');
                  render();
                  check();
                },
              },
              m === 2 ? '✓' : m === 1 ? '✗' : '',
              // a wrong tick gets a shape cue too (never colour alone)
              isWrong ? h('span', { class: 'lg-q', attrs: { 'aria-hidden': 'true' } }, '?') : null,
            ),
          );
        }),
      );
    });
    if (focusId) table.querySelector<HTMLElement>(`[data-testid="${focusId}"]`)?.focus({ preventScroll: true });
  };

  const check = () => {
    if (isSolved(g, marks)) {
      ctx.solved();
      return;
    }
    if (isComplete(marks)) {
      wiggle(table);
      ctx.say('Everyone has an answer — but one clue isn’t happy yet. Check the ticks with a question mark!');
    }
  };

  render();
  return {
    el,
    hint: (level) => {
      if (level < 3) return null; // the puzzle's written hints
      const r = revealOne(g, marks);
      if (!r) return null;
      marks = cycleMark(marks, r.c, r.s, r.v);
      while (marks[r.c][r.s][r.v] !== 2) marks = cycleMark(marks, r.c, r.s, r.v);
      render();
      check();
      return `Psst… ${g.subjects[r.s]}: ${g.categories[r.c].values[r.v]}! I ticked it for you.`;
    },
  };
});
