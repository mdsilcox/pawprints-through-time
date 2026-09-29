import { app } from '../app';
import { sessionEpoch } from '../core/session';
import { audio } from '../audio/audio';
import { input } from '../input/input';
import { h } from '../ui/dom';
import { button, closeOnBackdrop, ui } from '../ui/ui';
import { hud } from '../ui/hud';
import { character } from '../data/characters';
import { BowlScene, type BowlOutcome, type BowlSetup } from '../scenes/BowlScene';
import type { AlleyKind } from '../art/bowlingArt';
import type { WorldScene } from '../scenes/WorldScene';
import { TRICK_SHOTS, allTricksCleared, trickCleared, trickUnlocked, type TrickShot } from './tricks';
import { give } from '../story/hooks';
import { toast } from '../ui/ui';

/**
 * Bowling, from the story's point of view: a setup card (bumpers?), a full ten-frame game on the
 * lane, then a results card. Resolves with how it went (null if nobody bowled).
 */
export interface BowlInvite {
  rival?: { id: string; skill: number } | null;
  alley?: AlleyKind;
  title?: string;
  blurb?: string;
  /** friendly games offer the trick-shot challenges too */
  tricks?: boolean;
}

interface BowlPick {
  bumpers: boolean;
  trick: TrickShot | null;
}

function openBowlSetup(inv: BowlInvite): Promise<BowlPick | null> {
  const d = app.data!;
  let bumpers = d.flags['bowl:bumpers'] === undefined ? true : !!d.flags['bowl:bumpers'];
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v: BowlPick | null) => {
      if (settled) return;
      settled = true;
      audio.sfx(v ? 'select' : 'close');
      ui.pop('bowl-setup');
      resolve(v);
    };
    const bump = h('button', { class: 'ds-relax', dataset: { nav: '' }, attrs: { type: 'button', 'data-testid': 'bowl-bumpers', 'aria-pressed': String(bumpers) } });
    const render = () => {
      bump.classList.toggle('on', bumpers);
      bump.setAttribute('aria-pressed', String(bumpers));
      bump.textContent = bumpers ? '🟨 Bumpers: on (no gutter balls!)' : '⬜ Bumpers: off';
    };
    bump.addEventListener('click', (e) => {
      e.stopPropagation();
      bumpers = !bumpers;
      audio.sfx('blip');
      render();
    });
    render();
    const two = input.twoPlayer;
    const rival = inv.rival ? character(inv.rival.id).name : null;
    const panel = h(
      'div',
      { class: 'panel dance-setup bowl-setup', attrs: { 'data-testid': 'bowl-setup' } },
      h('h2', null, inv.title ?? '🎳 Bowling'),
      h('p', null, inv.blurb ?? 'Ten frames, real scoring — strikes, spares and all!'),
      h(
        'ul',
        { class: 'ds-how small' },
        h('li', null, two ? 'Take turns! Player 1: A/D and E · Player 2: ←/→ and /' : 'Step with ← →, press E to set your spot, aim, then press E at the right power'),
        h('li', null, 'While the ball rolls, hold ← or → to curve it · on a touchscreen, swipe up (curve your swipe to spin it)'),
        rival ? h('li', null, `Beat ${rival}’s score to win!`) : null,
      ),
      h('div', { class: 'ds-row' }, bump),
      h(
        'div',
        { class: 'row end sticky-foot' },
        button('Not now', () => finish(null), { cls: 'secondary', testid: 'bowl-cancel' }),
        inv.tricks ? button('Trick shots', () => showTricks(), { cls: 'secondary', icon: '🎯', testid: 'bowl-tricks' }) : null,
        button('Let’s bowl!', () => {
          d.flags['bowl:bumpers'] = bumpers;
          finish({ bumpers, trick: null });
        }, { icon: '🎳', autofocus: true, testid: 'bowl-start' }),
      ),
    );
    // the trick-shot list replaces the card's contents (Back returns to it)
    const main = [...panel.childNodes];
    let listing = false;
    const showMain = () => {
      listing = false;
      panel.replaceChildren(...main);
      ui.focusFirst(ui.top!);
    };
    function showTricks() {
      listing = true;
      const flags = d.flags;
      const rows = TRICK_SHOTS.map((t, i) => {
        const open = trickUnlocked(flags, i);
        const done = trickCleared(flags, t.id);
        return button(
          h('span', { class: 'bt-row' }, h('span', { class: 'bt-row-name' }, `${done ? '✅' : open ? '🎯' : '🔒'} ${t.name}`), h('span', { class: 'bt-row-goal small' }, open ? t.goal : i === 0 ? 'Bowl a whole game first!' : `Clear “${TRICK_SHOTS[i - 1].name}” first`)),
          () => {
            d.flags['bowl:bumpers'] = bumpers;
            finish({ bumpers, trick: t });
          },
          { cls: `bt-pick ${done ? 'done' : ''}`, disabled: !open, testid: `bowl-trick-${t.id}` },
        );
      });
      panel.replaceChildren(
        h('h2', null, '🎯 Trick shots'),
        h('p', null, 'Special sets of pins — knock them all down with one ball! Three tries each (take turns in two-player). Clear one to unlock the next.'),
        h('div', { class: 'bt-list' }, rows),
        h('div', { class: 'row end sticky-foot' }, button('Back', () => showMain(), { cls: 'secondary', icon: '◀', testid: 'bowl-tricks-back' })),
      );
      ui.focusFirst(ui.top!);
    }
    ui.push({
      id: 'bowl-setup',
      el: closeOnBackdrop(h('div', { class: 'center-wrap backdrop' }, panel), () => finish(null)),
      onBack: () => (listing ? showMain() : finish(null)),
      onClose: () => finish(null),
    });
    audio.sfx('open');
  });
}

function openBowlResults(o: BowlOutcome, rival: string | null): Promise<'again' | 'done'> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v: 'again' | 'done') => {
      if (settled) return;
      settled = true;
      audio.sfx('select');
      ui.pop('bowl-results');
      resolve(v);
    };
    const best = Math.max(...o.bowlers.map((b) => b.total));
    const cards = o.bowlers.map((b, i) =>
      h(
        'div',
        { class: `dr-card ${b.npc ? 'npc' : `p${(b.player ?? 0) + 1}`}`, attrs: { 'data-testid': `bowl-result-${i}` } },
        h('div', { class: 'dr-name' }, `${b.total === best ? '🏆 ' : ''}${b.name}`),
        h('div', { class: 'dr-line' }, `${b.total} points`),
        h('div', { class: 'dr-line small' }, `Strikes ${countStrikes(b.rolls)} · Spares ${countSpares(b.rolls)}`),
      ),
    );
    const humans = o.bowlers.filter((b) => !b.npc);
    const verdict = rival
      ? o.won
        ? `You beat ${rival}! What a game!`
        : `${rival} wins this time — so close! Want a rematch?`
      : humans.length > 1
        ? `${humans.reduce((a, b) => (b.total > a.total ? b : a)).name} wins — great bowling, both of you!`
        : 'Great bowling!';
    const panel = h(
      'div',
      { class: 'panel dance-results', attrs: { 'data-testid': 'bowl-results', 'data-won': String(o.won) } },
      h('h2', null, o.won ? '🎉 Hooray!' : '🎳 Good game!'),
      h('p', { class: 'dr-verdict' }, verdict),
      h('div', { class: 'dr-cards' }, cards),
      h('div', { class: 'row end sticky-foot' }, button('Play again', () => finish('again'), { cls: 'secondary', icon: '🔁', testid: 'bowl-again' }), button('Done', () => finish('done'), { icon: '✔', autofocus: true, testid: 'bowl-done' })),
    );
    ui.push({ id: 'bowl-results', el: h('div', { class: 'center-wrap backdrop' }, panel), onBack: () => finish('done'), onClose: () => finish('done') });
    ui.lock(700);
  });
}

function countStrikes(rolls: number[]): number {
  let n = 0;
  let standing = 10;
  for (const r of rolls) {
    if (standing === 10 && r === 10) n++;
    standing = standing === 10 ? (r === 10 ? 10 : 10 - r) : 10;
  }
  return n;
}
function countSpares(rolls: number[]): number {
  let n = 0;
  let standing = 10;
  for (const r of rolls) {
    if (standing < 10 && r === standing) n++;
    standing = standing === 10 ? (r === 10 ? 10 : 10 - r) : 10;
  }
  return n;
}

function runBowl(setup: BowlSetup): Promise<BowlOutcome> {
  return new Promise((resolve) => {
    let settled = false;
    app.phaser.scene.start(BowlScene.KEY, {
      setup,
      done: (o: BowlOutcome) => {
        if (settled) return;
        settled = true;
        resolve(o);
      },
    });
  });
}

/** After a trick shot: cleared (and what's next) or not this time. */
function openTrickResults(o: BowlOutcome, trick: TrickShot, firstClear: boolean): Promise<'again' | 'next' | 'done'> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v: 'again' | 'next' | 'done') => {
      if (settled) return;
      settled = true;
      audio.sfx('select');
      ui.pop('bowl-results');
      resolve(v);
    };
    const flags = app.data!.flags;
    const i = TRICK_SHOTS.indexOf(trick);
    const next = TRICK_SHOTS[i + 1] ?? null;
    const nextOpen = !!next && trickUnlocked(flags, i + 1);
    const verdict = o.cleared
      ? `${o.clearedBy ?? 'You'} cleared “${trick.name}”!${firstClear ? ' +10 Tockens.' : ''} ${next ? (nextOpen ? `Next up: “${next.name}”.` : '') : 'That’s every trick shot — you’re Trick Shot Champions! 🏆'}`
      : `The pins win this time! Tip: ${trick.tip}`;
    const panel = h(
      'div',
      { class: 'panel dance-results', attrs: { 'data-testid': 'bowl-results', 'data-won': String(!!o.cleared), 'data-trick': trick.id } },
      h('h2', null, o.cleared ? '🎯 Trick shot!' : '🎳 So close!'),
      h('p', { class: 'dr-verdict' }, verdict),
      h(
        'div',
        { class: 'row end sticky-foot' },
        button('Try again', () => finish('again'), { cls: 'secondary', icon: '🔁', testid: 'bowl-again' }),
        o.cleared && nextOpen ? button('Next trick', () => finish('next'), { cls: 'secondary', icon: '🎯', testid: 'bowl-next-trick' }) : null,
        button('Done', () => finish('done'), { icon: '✔', autofocus: true, testid: 'bowl-done' }),
      ),
    );
    ui.push({ id: 'bowl-results', el: h('div', { class: 'center-wrap backdrop' }, panel), onBack: () => finish('done'), onClose: () => finish('done') });
    ui.lock(700);
  });
}

/** A trick shot's rewards: Tockens the first time, and a trophy for clearing them all. */
function rewardTrick(trick: TrickShot): boolean {
  const d = app.data!;
  if (trickCleared(d.flags, trick.id)) return false;
  d.flags[`trick:${trick.id}`] = true;
  d.tockens += 10;
  if (allTricksCleared(d.flags) && !d.flags['trick:trophy']) {
    d.flags['trick:trophy'] = true;
    give('pin-trophy', 1, { from: 'Every trick shot cleared!' });
    toast('The Trick Shot Trophy is yours — find it in your cottage’s storage!', { icon: '🏆', cls: 'quest', ms: 4200 });
  }
  app.autosave.request();
  return true;
}

/** Invite everyone to bowl: setup → a ten-frame game (or a trick shot) → results (→ again?). */
export async function bowl(inv: BowlInvite = {}): Promise<BowlOutcome | null> {
  const pick = await openBowlSetup(inv);
  if (!pick) return null;
  const game = app.phaser;
  const world = game.scene.getScene('world') as WorldScene | null;
  const worldActive = !!world && game.scene.isActive('world');
  if (worldActive) game.scene.pause('world');
  hud.setDancing(true);
  const session = sessionEpoch();
  let trick = pick.trick;
  try {
    for (;;) {
      const o = await runBowl({
        players: input.twoPlayer ? [0, 1] : [0],
        rival: trick ? null : (inv.rival ?? null),
        bumpers: pick.bumpers,
        alley: inv.alley ?? 'starlight',
        seed: (app.data!.day * 7919 + Math.floor(Math.random() * 1e6)) >>> 0,
        trick,
      });
      if (!o.finished) return o;
      if (trick) {
        const first = o.cleared ? rewardTrick(trick) : false;
        const next = await openTrickResults(o, trick, first);
        if (next === 'done') return o;
        if (next === 'next') trick = TRICK_SHOTS[TRICK_SHOTS.indexOf(trick) + 1] ?? trick;
        continue;
      }
      app.data!.flags['bowled'] = true;
      const next = await openBowlResults(o, inv.rival ? character(inv.rival.id).name : null);
      if (next === 'done') return o;
    }
  } finally {
    if (game.scene.isActive(BowlScene.KEY) || game.scene.isPaused(BowlScene.KEY)) game.scene.stop(BowlScene.KEY);
    hud.setDancing(false);
    if (session === sessionEpoch() && worldActive && world && game.scene.isPaused('world')) {
      game.scene.resume('world');
      world.playMusic();
    }
  }
}
