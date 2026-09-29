import { audio } from '../../audio/audio';
import { iconUrl } from '../../art/icons';
import { h, clear } from '../../ui/dom';
import { button } from '../../ui/ui';
import { makeSecret, score, type CodeScore } from '../logic/codebreak';
import { registerView } from './screen';
import { pop, wiggle } from './common';

const GEAR_NAMES = ['red circle', 'blue triangle', 'yellow square', 'green star', 'purple heart', 'orange diamond'];

/** For the debug hooks / tests only: the current secret. */
export const codeDebug = { secret: [] as number[] };

/** Code-breaking: fill the slots with gears, press Check, read the stars. */
registerView('code', (ctx) => {
  const v = ctx.variant;
  let secret = makeSecret(v.slots, v.symbols, Date.now() & 0xffff);
  codeDebug.secret = secret;
  let guess: (number | null)[] = Array(v.slots).fill(null);
  let locked: (number | null)[] = Array(v.slots).fill(null);
  let history: { guess: number[]; score: CodeScore }[] = [];
  let solved = false;

  const slotsEl = h('div', { class: 'cb-slots', attrs: { 'data-testid': 'code-slots' } });
  const palette = h('div', { class: 'cb-palette' });
  const hist = h('div', { class: 'cb-history', attrs: { 'data-testid': 'code-history' } });
  const tries = h('div', { class: 'cb-tries' });
  const gearImg = (n: number) => h('img', { class: 'cb-gear', attrs: { src: iconUrl(`codegear:${n}`), alt: GEAR_NAMES[n] } });

  const renderSlots = () => {
    clear(slotsEl);
    guess.forEach((g, i) =>
      slotsEl.append(
        h(
          'button',
          {
            class: `cb-slot ${g === null ? 'empty' : ''} ${locked[i] !== null ? 'locked' : ''}`,
            dataset: { nav: '' },
            attrs: { type: 'button', 'data-testid': `code-slot-${i}`, 'aria-label': g === null ? `slot ${i + 1}, empty` : `slot ${i + 1}: ${GEAR_NAMES[g]}` },
            onclick: (e: Event) => {
              e.stopPropagation();
              if (locked[i] !== null || guess[i] === null) return;
              guess[i] = null;
              audio.sfx('back');
              renderSlots();
            },
          },
          g === null ? '' : gearImg(g),
        ),
      ),
    );
    tries.textContent = `Tries left: ${v.tries - history.length}`;
  };

  const renderHistory = () => {
    clear(hist);
    history
      .slice()
      .reverse()
      .forEach((row) =>
        hist.append(
          h(
            'div',
            { class: 'cb-row' },
            h('div', { class: 'cb-row-gears' }, row.guess.map(gearImg)),
            h(
              'div',
              { class: 'cb-stars', attrs: { 'aria-label': `${row.score.gold} gold, ${row.score.silver} silver` } },
              Array.from({ length: row.score.gold }, () => h('span', { class: 'cb-star gold' }, '★')),
              Array.from({ length: row.score.silver }, () => h('span', { class: 'cb-star silver' }, '☆')),
              row.score.gold + row.score.silver === 0 ? h('span', { class: 'cb-none' }, '—') : null,
            ),
          ),
        ),
      );
  };

  for (let n = 0; n < v.symbols; n++) {
    palette.append(
      h(
        'button',
        {
          class: 'cb-pick',
          dataset: { nav: '', ...(n === 0 ? { autofocus: '' } : {}) },
          attrs: { type: 'button', 'data-testid': `code-pick-${n}`, 'aria-label': GEAR_NAMES[n] },
          onclick: (e: Event) => {
            e.stopPropagation();
            if (solved) return;
            const i = guess.findIndex((g) => g === null);
            if (i < 0) {
              wiggle(slotsEl);
              return;
            }
            guess[i] = n;
            audio.sfx('blip');
            renderSlots();
            pop(slotsEl.children[i] as HTMLElement);
          },
        },
        gearImg(n),
      ),
    );
  }

  const check = () => {
    if (solved) return;
    if (guess.some((g) => g === null)) {
      wiggle(slotsEl);
      ctx.say('Fill every slot with a gear first!');
      return;
    }
    const g = guess as number[];
    const s = score(secret, g);
    history.push({ guess: g.slice(), score: s });
    renderHistory();
    if (s.gold === v.slots) {
      solved = true;
      audio.sfx('success');
      slotsEl.classList.add('open');
      setTimeout(() => ctx.solved(), 500);
      return;
    }
    audio.sfx(s.gold ? 'pickup' : 'blip');
    ctx.say(s.gold || s.silver ? `${s.gold} gold and ${s.silver} silver! You’re getting warmer.` : 'No stars — so none of those gears are in the code. That’s useful to know!');
    if (history.length >= v.tries) {
      // never a dead end: the lock "resets" with a fresh code
      ctx.say('Whew, the lock needs a rest… it picked a brand-new code. You know how it works now — try again!');
      secret = makeSecret(v.slots, v.symbols, (Date.now() + history.length) & 0xffff);
      codeDebug.secret = secret;
      history = [];
      locked = Array(v.slots).fill(null);
      renderHistory();
    }
    guess = locked.slice();
    renderSlots();
  };

  const el = h(
    'div',
    { class: 'cb' },
    h('div', { class: 'cb-lock' }, h('div', { class: 'cb-lock-top', attrs: { 'aria-hidden': 'true' } }), slotsEl, h('div', { class: 'row center' }, button('Check', check, { icon: '🔑', cls: 'gold', testid: 'code-check' }), tries)),
    h('div', { class: 'cb-palette-wrap' }, h('div', { class: 'small' }, 'Pick gears:'), palette),
    hist,
  );
  renderSlots();
  return {
    el,
    hint: (level) => {
      if (level < 3) return null;
      const i = locked.findIndex((l) => l === null);
      if (i < 0) return null;
      locked[i] = secret[i];
      guess[i] = secret[i];
      renderSlots();
      return `Psst… gear number ${i + 1} is the ${GEAR_NAMES[secret[i]]}! I locked it in for you.`;
    },
  };
});
