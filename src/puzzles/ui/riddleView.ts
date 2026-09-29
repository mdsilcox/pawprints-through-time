import { audio } from '../../audio/audio';
import { h } from '../../ui/dom';
import { button } from '../../ui/ui';
import { checkAnswer, choicesFor } from '../logic/riddle';
import { registerView } from './screen';
import { notQuite, pop, wiggle } from './common';

/** Riddles: pick from 3 (easy) or 5 (medium) answers, or type it (tricky). */
registerView('riddle', (ctx) => {
  const r = ctx.riddle!;
  const mode = ctx.variant.mode;
  const q = h('div', { class: 'rd-question', attrs: { 'data-testid': 'riddle-text' } }, r.q);
  const el = h('div', { class: 'rd' }, h('div', { class: 'rd-scroll' }, h('span', { class: 'rd-mark', attrs: { 'aria-hidden': 'true' } }, '?'), q));
  let removedWrong = 0;

  if (mode === 'typed') {
    const input = h('input', {
      class: 'rd-input',
      dataset: { nav: '' },
      attrs: { type: 'text', maxlength: 24, autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Your answer', placeholder: 'Type your answer…', 'data-testid': 'riddle-input' },
    });
    const check = () => {
      if (!input.value.trim()) {
        input.focus();
        return;
      }
      if (checkAnswer(r, input.value)) {
        input.classList.add('right');
        audio.sfx('success');
        ctx.solved();
      } else {
        audio.sfx('error');
        wiggle(input);
        ctx.say(notQuite());
      }
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        check();
      }
    });
    el.append(h('div', { class: 'rd-typed' }, input, button('Check', check, { icon: '✔', testid: 'riddle-check' })));
    return {
      el,
      hint: (level) => {
        if (level < 3) return r.hints[level - 1];
        const a = r.answers[0];
        return `${r.hints[2]} (It has ${a.replace(/\s/g, '').length} letters.)`;
      },
    };
  }

  const choices = choicesFor(r, mode === 'choice3' ? 3 : 5);
  const btns = choices.map((c, i) =>
    button(
      c,
      () => {
        const b = btns[i];
        if (checkAnswer(r, c)) {
          b.classList.add('right');
          pop(b);
          audio.sfx('success');
          ctx.solved();
        } else {
          audio.sfx('error');
          b.classList.add('wrong');
          b.disabled = true;
          wiggle(b);
          ctx.say(notQuite());
        }
      },
      { cls: 'secondary rd-choice', testid: `riddle-choice-${i}` },
    ),
  );
  el.append(h('div', { class: 'rd-choices' }, btns));
  return {
    el,
    hint: (level) => {
      if (level < 3) return r.hints[level - 1];
      // near-answer: cross out some wrong choices
      for (const b of btns) {
        const label = b.textContent ?? '';
        if (removedWrong >= Math.max(1, btns.length - 2)) break;
        if (!b.disabled && !checkAnswer(r, label.trim())) {
          b.disabled = true;
          b.classList.add('wrong');
          removedWrong++;
        }
      }
      return `${r.hints[2]} I crossed out ${removedWrong === 1 ? 'a wrong answer' : 'some wrong answers'} for you.`;
    },
  };
});
