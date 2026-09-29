import { audio } from '../../audio/audio';
import { iconUrl } from '../../art/icons';
import { h, clear } from '../../ui/dom';
import { tokenKind, tokenValue } from '../logic/sequence';
import { seededShuffle, hashString } from '../logic/riddle';
import { registerView } from './screen';
import { notQuite, pop, wiggle } from './common';

/** Draw one pattern token: an item icon, a number, a little clock or an arrow. */
export function token(t: string): HTMLElement {
  const kind = tokenKind(t);
  const v = tokenValue(t);
  if (kind === 'icon') return h('span', { class: 'sq-tok icon' }, h('img', { attrs: { src: iconUrl(v), alt: v } }));
  if (kind === 'number') return h('span', { class: 'sq-tok num' }, v);
  if (kind === 'arrow') return h('span', { class: `sq-tok arrow a-${v}`, attrs: { 'aria-label': v } }, h('span', null, '➜'));
  // clock: hour hand pointing at the hour
  const hour = Number(v) % 12;
  return h(
    'span',
    { class: 'sq-tok clock', attrs: { 'aria-label': `${v} o’clock` } },
    h('span', { class: 'clock-face' }, h('i', { class: 'hand hour', style: `transform: rotate(${hour * 30}deg)` }), h('i', { class: 'hand min' }), h('b', null, v)),
  );
}

/** Pattern puzzles: a few rounds of "what comes next?". */
registerView('sequence', (ctx) => {
  const rounds = ctx.variant.rounds;
  let round = 0;
  const row = h('div', { class: 'sq-row', attrs: { 'data-testid': 'seq-row' } });
  const choices = h('div', { class: 'sq-choices' });
  const dots = h('div', { class: 'sq-dots', attrs: { 'aria-label': 'rounds' } });
  const el = h('div', { class: 'sq' }, dots, row, h('div', { class: 'sq-ask' }, 'What comes next?'), choices);

  const render = () => {
    const r = rounds[round];
    clear(dots);
    rounds.forEach((_, i) => dots.append(h('span', { class: `sq-dot ${i < round ? 'done' : i === round ? 'now' : ''}` })));
    clear(row);
    r.items.forEach((t) => row.append(token(t)));
    const slot = h('span', { class: 'sq-tok slot', attrs: { 'data-testid': 'seq-slot' } }, '?');
    row.append(slot);
    clear(choices);
    const opts = seededShuffle([r.answer, ...r.decoys], hashString(ctx.def.id) + round * 7);
    opts.forEach((t, i) => {
      const b = h(
        'button',
        {
          class: 'sq-choice',
          dataset: { nav: '', ...(i === 0 ? { autofocus: '' } : {}) },
          attrs: { type: 'button', 'data-testid': `seq-choice-${i}`, 'data-token': t },
          onclick: (e: Event) => {
            e.stopPropagation();
            if (t === r.answer) {
              audio.sfx('success');
              clear(slot);
              slot.classList.remove('slot');
              slot.append(token(t));
              pop(slot);
              choices.querySelectorAll('button').forEach((x) => ((x as HTMLButtonElement).disabled = true));
              setTimeout(() => {
                if (round + 1 >= rounds.length) ctx.solved();
                else {
                  round++;
                  ctx.say(`Row ${round + 1} of ${rounds.length}!`, 'happy');
                  render();
                  (choices.querySelector('button') as HTMLElement | null)?.focus();
                }
              }, 550);
            } else {
              audio.sfx('error');
              wiggle(b);
              b.disabled = true;
              b.classList.add('wrong');
              ctx.say(notQuite());
            }
          },
        },
        token(t),
      );
      choices.append(b);
    });
  };
  render();
  return {
    el,
    hint: (level) => {
      const r = rounds[round];
      if (level < 3) return r.hints[level - 1];
      const right = choices.querySelector<HTMLElement>(`[data-token="${r.answer}"]`);
      right?.classList.add('hinted');
      return `${r.hints[2]} (It’s glowing!)`;
    },
  };
});
