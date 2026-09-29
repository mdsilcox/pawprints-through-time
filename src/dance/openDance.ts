import { app } from '../app';
import { sessionEpoch } from '../core/session';
import { audio } from '../audio/audio';
import { input } from '../input/input';
import { h } from '../ui/dom';
import { button, closeOnBackdrop, ui } from '../ui/ui';
import { hud } from '../ui/hud';
import { character } from '../data/characters';
import { hasEffect } from '../soup/effects';
import { DANCE_STYLES, type DanceLevel } from './logic';
import { DanceScene, type DanceOutcome, type DanceSetup } from '../scenes/DanceScene';
import type { WorldScene } from '../scenes/WorldScene';

/**
 * Dancing, from the story's point of view: a setup card (level, or "just dance"), the dance
 * floor itself, then a results card. Resolves with how it went (null if you didn't dance).
 */
export interface DanceInvite {
  style: string;
  /** the story's dance-off partner */
  rival?: string | null;
  audience?: string[];
  bunnies?: string[];
  title?: string;
  blurb?: string;
}

const LEVEL_LABEL: Record<DanceLevel, string> = { easy: 'Easy', medium: 'Medium', hard: 'Tricky' };

/** The setup card: pick a level (or "just dance"). */
export function openDanceSetup(inv: DanceInvite): Promise<{ level: DanceLevel; relaxed: boolean } | null> {
  const d = app.data!;
  const style = DANCE_STYLES[inv.style];
  const saved = String(d.flags['dance:level'] ?? 'easy');
  let level: DanceLevel = saved === 'medium' || saved === 'hard' ? saved : 'easy';
  let relaxed = !!d.flags['dance:relaxed'];
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v: { level: DanceLevel; relaxed: boolean } | null) => {
      if (settled) return;
      settled = true;
      audio.sfx(v ? 'select' : 'close');
      ui.pop('dance-setup');
      resolve(v);
    };
    const levels = h('div', { class: 'ds-levels', attrs: { role: 'radiogroup', 'aria-label': 'Level' } });
    const relaxBtn = h('button', { class: 'ds-relax', dataset: { nav: '' }, attrs: { type: 'button', 'data-testid': 'dance-relaxed', 'aria-pressed': 'false' } });
    const render = () => {
      levels.replaceChildren(
        ...(Object.keys(LEVEL_LABEL) as DanceLevel[]).map((lv) =>
          h(
            'button',
            {
              class: `ds-level ${lv === level && !relaxed ? 'on' : ''}`,
              dataset: { nav: '' },
              attrs: { type: 'button', role: 'radio', 'aria-checked': String(lv === level && !relaxed), 'data-testid': `dance-level-${lv}` },
              onclick: (e: Event) => {
                e.stopPropagation();
                level = lv;
                relaxed = false;
                audio.sfx('blip');
                render();
              },
            },
            LEVEL_LABEL[lv],
          ),
        ),
      );
      relaxBtn.classList.toggle('on', relaxed);
      relaxBtn.setAttribute('aria-pressed', String(relaxed));
      relaxBtn.textContent = relaxed ? '🎈 Just dance — on!' : '🎈 Just dance (no scores)';
    };
    relaxBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      relaxed = !relaxed;
      audio.sfx('blip');
      render();
    });
    render();
    const two = input.twoPlayer;
    const rival = inv.rival ? character(inv.rival).name : null;
    const panel = h(
      'div',
      { class: 'panel dance-setup', attrs: { 'data-testid': 'dance-setup' } },
      h('h2', null, inv.title ?? `💃 ${style.name}`),
      h('p', null, inv.blurb ?? 'Dance to the music! Press the matching arrow just as it reaches the ring.'),
      h(
        'ul',
        { class: 'ds-how small' },
        h('li', null, two ? 'Player 1: W A S D · Player 2: the arrow keys' : 'Arrow keys or W A S D (or the d-pad)'),
        h('li', null, 'On a touchscreen, tap the lane as the arrow lands'),
        rival ? h('li', null, `Beat ${rival}’s score to win — or pick “Just dance” and simply have fun!`) : h('li', null, 'Biscuit dances along, whatever happens!'),
      ),
      h('div', { class: 'ds-row' }, levels, relaxBtn),
      hasEffect('ticktock') ? h('p', { class: 'small' }, '🍅 Tick-Tock Tomato: the timing is extra roomy!') : null,
      h('div', { class: 'row end sticky-foot' }, button('Not now', () => finish(null), { cls: 'secondary', testid: 'dance-cancel' }), button('Let’s dance!', () => {
        d.flags['dance:level'] = level;
        d.flags['dance:relaxed'] = relaxed;
        finish({ level, relaxed });
      }, { icon: '💃', autofocus: true, testid: 'dance-start' })),
    );
    ui.push({ id: 'dance-setup', el: closeOnBackdrop(h('div', { class: 'center-wrap backdrop' }, panel), () => finish(null)), onBack: () => finish(null), onClose: () => finish(null) });
    audio.sfx('open');
  });
}

/** The results card after a dance. */
function openDanceResults(setup: DanceSetup, o: DanceOutcome, canRetry: boolean): Promise<'again' | 'done'> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v: 'again' | 'done') => {
      if (settled) return;
      settled = true;
      audio.sfx('select');
      ui.pop('dance-results');
      resolve(v);
    };
    const d = app.data!;
    const rivalName = setup.rival ? character(setup.rival).name : null;
    const cards = setup.players.map((p, i) =>
      h(
        'div',
        { class: `dr-card p${p + 1}`, attrs: { 'data-testid': `dance-result-p${p + 1}` } },
        h('div', { class: 'dr-name' }, d.players[p]?.name || `Player ${p + 1}`),
        setup.relaxed
          ? h('div', { class: 'dr-line' }, `${o.scores[i].counts.perfect + o.scores[i].counts.great + o.scores[i].counts.good} happy moves!`)
          : [
              h('div', { class: 'dr-stars', attrs: { 'aria-label': `${o.stars[i]} stars` } }, [1, 2, 3].map((k) => h('span', { class: k <= o.stars[i] ? 'on' : '' }, '★'))),
              h('div', { class: 'dr-line' }, `${o.scores[i].points.toLocaleString()} points · best combo ${o.scores[i].maxCombo}`),
              h('div', { class: 'dr-line small' }, `Perfect ${o.scores[i].counts.perfect} · Great ${o.scores[i].counts.great} · Good ${o.scores[i].counts.good} · Missed ${o.scores[i].counts.miss}`),
            ],
      ),
    );
    const verdict = setup.relaxed
      ? 'What a dance! Biscuit is SO proud.'
      : rivalName && o.rival !== null
        ? o.won
          ? `You out-danced ${rivalName} (${o.rival.toLocaleString()} points)!`
          : Math.max(...o.scores.map((s) => s.points)) >= o.rival * 0.7
            ? `So close! ${rivalName} scored ${o.rival.toLocaleString()} — want another go?`
            : `${rivalName} scored ${o.rival.toLocaleString()}. Every dancer starts somewhere — try Easy, or “Just dance” for fun!`
        : o.won
          ? 'Brilliant dancing!'
          : 'Good dancing! Practice makes perfect.';
    const panel = h(
      'div',
      { class: 'panel dance-results', attrs: { 'data-testid': 'dance-results', 'data-won': String(o.won) } },
      h('h2', null, o.won ? '🎉 Hooray!' : '💃 Nice moves!'),
      h('p', { class: 'dr-verdict' }, verdict),
      h('div', { class: 'dr-cards' }, cards),
      h('div', { class: 'row end sticky-foot' }, canRetry ? button('Dance again', () => finish('again'), { cls: 'secondary', icon: '🔁', testid: 'dance-again' }) : null, button('Done', () => finish('done'), { icon: '✔', autofocus: true, testid: 'dance-done' })),
    );
    ui.push({ id: 'dance-results', el: h('div', { class: 'center-wrap backdrop' }, panel), onBack: () => finish('done'), onClose: () => finish('done') });
    ui.lock(700);
  });
}

/**
 * Run the dance floor once. It stays up (everyone cheering) after the last arrow, so the results
 * card shows over it; leaving play mid-dance (Pip's break, quitting) resolves as unfinished.
 */
function runDance(setup: DanceSetup): Promise<DanceOutcome> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (o: DanceOutcome) => {
      if (settled) return;
      settled = true;
      resolve(o);
    };
    // (start() restarts the scene if a finished dance is still showing)
    app.phaser.scene.start(DanceScene.KEY, { setup, done });
  });
}

/**
 * Invite everyone to dance: setup → dance → results (→ again?). Returns the last outcome,
 * or null if the players said "not now".
 */
export async function dance(inv: DanceInvite, opts: { retry?: boolean } = {}): Promise<DanceOutcome | null> {
  const pick = await openDanceSetup(inv);
  if (!pick) return null;
  const game = app.phaser;
  const world = game.scene.getScene('world') as WorldScene | null;
  const worldActive = !!world && game.scene.isActive('world');
  if (worldActive) game.scene.pause('world');
  hud.setDancing(true);
  const session = sessionEpoch();
  try {
    return await danceLoop(inv, pick, opts);
  } finally {
    if (game.scene.isActive(DanceScene.KEY) || game.scene.isPaused(DanceScene.KEY)) game.scene.stop(DanceScene.KEY);
    hud.setDancing(false);
    // (if play ended mid-dance — a break, or quitting — the world stays stopped behind the title)
    if (session === sessionEpoch() && worldActive && world && game.scene.isPaused('world')) {
      game.scene.resume('world');
      world.playMusic();
    }
  }
}

async function danceLoop(inv: DanceInvite, pick: { level: DanceLevel; relaxed: boolean }, opts: { retry?: boolean }): Promise<DanceOutcome> {
  for (;;) {
    const setup: DanceSetup = {
      style: inv.style,
      level: pick.level,
      relaxed: pick.relaxed,
      players: input.twoPlayer ? [0, 1] : [0],
      rival: inv.rival ?? null,
      audience: inv.audience ?? [],
      bunnies: inv.bunnies ?? [],
      slow: hasEffect('ticktock'),
    };
    const o = await runDance(setup);
    if (!o.finished) return o;
    app.data!.flags[`danced:${inv.style}`] = true;
    const next = await openDanceResults(setup, o, opts.retry !== false);
    if (next === 'done') return o;
  }
}
