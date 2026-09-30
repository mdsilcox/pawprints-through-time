import { app } from '../../app';
import { audio } from '../../audio/audio';
import type { Difficulty } from '../../core/state';
import { renderPipPortrait } from '../../art/fairy';
import { h } from '../../ui/dom';
import { button, ui } from '../../ui/ui';
import { difficultyFor, DIFFICULTY_LABEL } from '../difficulty';
import { getPuzzle, recordAttempt, starsFor } from '../registry';
import type { Riddle } from '../logic/riddle';
import type { PuzzleDef, PuzzleKind, PuzzleResult } from '../types';
import type { PuzzleView, ViewFactory } from './common';
import { hasEffect } from '../../soup/effects';

/**
 * The puzzle screen: a story line, the puzzle itself, and Pip with up to three escalating
 * hints (a nudge, a clue, a near-answer). Solving shows a little celebration with stars
 * (more stars for fewer hints — but every solve counts, and leaving is always fine).
 */
const VIEWS: Partial<Record<PuzzleKind, ViewFactory>> = {};
export function registerView<K extends PuzzleKind>(kind: K, f: ViewFactory<K>): void {
  VIEWS[kind] = f as unknown as ViewFactory;
}

const KIND_ICON: Record<PuzzleKind, string> = { riddle: '❓', grid: '🧶', slide: '📦', sequence: '🔷', code: '⚙️', sail: '⛵', jigsaw: '🗺️' };
export const kindIcon = (k: PuzzleKind) => KIND_ICON[k];
export const KIND_NAME: Record<PuzzleKind, string> = { riddle: 'Riddle', grid: 'Logic grid', slide: 'Sliding blocks', sequence: 'Pattern', code: 'Code-breaking', sail: 'Sailing chart', jigsaw: 'Torn map' };

export const MAX_HINTS = 3;

export interface OpenOpts {
  difficulty?: Difficulty;
  riddle?: Riddle;
  /** replaying from the journal: no story rewards, same stars */
  replay?: boolean;
  /** just a look (e.g. the Shoals before the gumbo): Pip explains instead of hinting, and it never counts as a try */
  preview?: string;
}

export function openPuzzle(id: string, opts: OpenOpts = {}): Promise<PuzzleResult> {
  const def = getPuzzle(id) as PuzzleDef;
  const d = app.data!;
  const difficulty = opts.difficulty ?? difficultyFor(app.settings.puzzleMode, d.skill);
  const variant = def.variants[difficulty];
  const riddle = opts.riddle ?? def.pool?.[0];
  d.flags[`puzzle:seen:${id}`] = true;
  if (ui.has('puzzle')) return Promise.resolve({ solved: false, hintsUsed: 0, difficulty, firstSolve: false });

  return new Promise((resolve) => {
    let hintsUsed = 0;
    let done = false;
    let view: PuzzleView | null = null;
    const pipImg = renderPipPortrait(96, false);
    pipImg.classList.add('pz-pip');
    const bubble = h('div', { class: 'pz-bubble', attrs: { 'data-testid': 'pz-bubble', 'aria-live': 'polite' } });
    const say = (text: string, mood: 'happy' | 'think' = 'think') => {
      bubble.textContent = text;
      bubble.dataset.mood = mood;
      bubble.classList.remove('show');
      void bubble.offsetWidth;
      bubble.classList.add('show');
    };
    const hintBtn = button('', () => giveHint(), { icon: '💡', cls: 'secondary pz-hint', testid: 'pz-hint' });
    const setHintLabel = () => {
      const left = MAX_HINTS - hintsUsed;
      hintBtn.querySelector('.btn-label')!.textContent = left > 0 ? `Pip’s hint (${left})` : 'No hints left';
      hintBtn.disabled = left <= 0;
    };
    const giveHint = () => {
      if (opts.preview) {
        say(opts.preview, 'think');
        return;
      }
      if (hintsUsed >= MAX_HINTS || done) return;
      hintsUsed++;
      const level = hintsUsed as 1 | 2 | 3;
      const fromView = view?.hint?.(level);
      const fallback = riddle && def.kind === 'riddle' ? riddle.hints[level - 1] : def.hints[difficulty][level - 1];
      say(fromView ?? fallback ?? 'Take your time — you can do it!', 'think');
      audio.sfx('sparkle');
      setHintLabel();
      view?.refocus?.();
    };

    let closed = false;
    const finish = (solved: boolean) => {
      if (closed) return;
      closed = true;
      view?.destroy?.();
      ui.pop('puzzle');
      // (a look at a chart you can't sail yet isn't a try: it never nudges the difficulty down)
      const firstSolve = opts.preview && !solved ? false : recordAttempt(d, id, { solved, hintsUsed, difficulty, noSkill: def.kind === 'riddle' }) && !opts.replay;
      app.autosave.request();
      resolve({ solved, hintsUsed, difficulty, firstSolve, riddleId: riddle?.id });
    };

    const celebrate = () => {
      if (done) return;
      done = true;
      audio.sfx('fanfare');
      const stars = starsFor(hintsUsed);
      const card = h(
        'div',
        { class: 'pz-win', attrs: { 'data-testid': 'pz-solved' } },
        h('div', { class: 'pz-win-card' },
          h('div', { class: 'pz-win-title' }, 'Solved!'),
          h('div', { class: 'pz-stars', attrs: { 'aria-label': `${stars} stars` } }, [1, 2, 3].map((i) => h('span', { class: `pz-star ${i <= stars ? 'on' : ''}`, style: `animation-delay: ${0.15 + i * 0.18}s` }, '★'))),
          h('p', null, hintsUsed === 0 ? 'All by yourselves — brilliant brains!' : hintsUsed === 1 ? 'With one little hint from Pip. Great thinking!' : 'Teamwork with Pip! Every puzzle solved makes your brain stronger.'),
          button('Hooray!', () => finish(true), { icon: '🎉', autofocus: true, testid: 'pz-done' }),
        ),
        h('div', { class: 'pz-confetti', attrs: { 'aria-hidden': 'true' } }, Array.from({ length: 18 }, (_, i) => h('i', { style: `--i:${i}` }))),
      );
      screen.el.appendChild(card);
      ui.lock(700);
      requestAnimationFrame(() => (card.querySelector('[data-testid="pz-done"]') as HTMLElement | null)?.focus());
      say('You did it!', 'happy');
    };

    const factory = VIEWS[def.kind];
    if (!factory) throw new Error(`no view for ${def.kind}`);
    // (a replay from the journal of a chart that needs calm seas gets them — no gumbo required)
    const calm = hasEffect('calm') || (!!opts.replay && !!(variant as { needsCalm?: boolean }).needsCalm);
    view = factory({ def, variant, difficulty, riddle, solved: celebrate, say, effects: { calm } });

    const head = h(
      'div',
      { class: 'pz-head' },
      h('h2', null, `${KIND_ICON[def.kind]} ${def.title}`),
      h(
        'div',
        { class: 'pz-chips' },
        // short phones hide the how-to paragraph: this shows the rules on a card over the puzzle
        h('button', { class: 'pz-rules', dataset: { nav: '' }, attrs: { type: 'button', 'data-testid': 'pz-rules' }, onclick: (e: Event) => (e.stopPropagation(), showRules()) }, '❔ How to play'),
        h('span', { class: `pz-chip diff-${difficulty}`, attrs: { 'data-testid': 'pz-difficulty' } }, DIFFICULTY_LABEL[difficulty]),
        opts.replay ? h('span', { class: 'pz-chip' }, 'Replay') : null,
        opts.preview ? h('span', { class: 'pz-chip', attrs: { 'data-testid': 'pz-preview' } }, 'Just looking') : null,
      ),
    );
    // the rules on a card that floats over the puzzle (never squeezes the board on a small phone)
    const rulesCard = h(
      'div',
      { class: 'pz-rules-card hidden', attrs: { 'data-testid': 'pz-rules-card', role: 'dialog', 'aria-label': 'How to play' } },
      h('div', { class: 'pz-rules-title' }, '❔ How to play'),
      h('p', null, def.howTo),
      button('Got it!', () => hideRules(), { icon: '👍', testid: 'pz-rules-ok' }),
    );
    const rulesOpen = () => !rulesCard.classList.contains('hidden');
    function showRules() {
      rulesCard.classList.remove('hidden');
      requestAnimationFrame(() => (rulesCard.querySelector('button') as HTMLElement | null)?.focus({ preventScroll: true }));
    }
    function hideRules() {
      rulesCard.classList.add('hidden');
      const top = ui.top;
      if (top) ui.focusFirst(top);
    }
    const panel = h(
      'div',
      { class: `panel pz-panel kind-${def.kind}`, attrs: { 'data-testid': 'puzzle', 'data-kind': def.kind } },
      rulesCard,
      head,
      h('p', { class: 'pz-intro' }, def.intro),
      h('p', { class: 'pz-howto small' }, def.howTo),
      h('div', { class: 'pz-body' }, view.el),
      h('div', { class: 'pz-foot' }, h('div', { class: 'pz-pip-wrap' }, pipImg, bubble), h('div', { class: 'row end' }, hintBtn, button('Leave', () => finish(false), { cls: 'secondary', testid: 'pz-leave' }))),
    );
    setHintLabel();
    const screen = ui.push({
      id: 'puzzle',
      el: h('div', { class: 'center-wrap backdrop' }, panel),
      onBack: () => {
        if (done) return;
        if (rulesOpen()) return void hideRules();
        if (view?.onBack?.()) return;
        finish(false);
      },
      onDir: (dir) => (done ? false : (view?.onDir?.(dir) ?? false)),
    });
    audio.sfx('open');
    const short = typeof window.matchMedia === 'function' && window.matchMedia('(max-height: 460px)').matches;
    // (small phones: the rules wait on their card behind ❔ How to play, so the board gets the room)
    if (opts.preview) say(opts.preview, 'think');
    else if (short && view.pipLine) say(view.pipLine, 'happy');
    else if (short && def.kind !== 'riddle') say('New to this one? Tap ❔ How to play — or ask me for a hint!', 'happy');
    else say(def.kind === 'riddle' ? 'Read it out loud together — riddles love to be heard!' : 'Take your time. Ask me for a hint whenever you like!', 'happy');
  });
}
