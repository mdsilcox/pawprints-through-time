import { app } from '../app';
import { audio } from '../audio/audio';
import { ITEMS } from '../data/items';
import { iconUrl } from '../art/icons';
import { input } from '../input/input';
import { brew, comboKey, soupItemId, type SoupDef } from '../soup/recipes';
import { discover } from '../soup/kitchen';
import { drinkSoup, hasEffect } from '../soup/effects';
import { h, clear } from './dom';
import { button, closeOnBackdrop, toast, ui } from './ui';

/**
 * Grandma Hopkins' cauldron: pick three ingredients, stir to the bubbly beat (both players in
 * 2P — one special recipe needs two spoons), then drink the soup or bottle it for later.
 */
export interface BrewOutcome {
  soup: SoupDef;
  isNew: boolean;
  stars: number;
  drank: boolean;
  neededTwo: boolean;
}

export const STIRS = 4;

/** Timing judgement for one stir: how far (ms) from the spoon passing the top. */
export function judge(errMs: number, slow: boolean): 'perfect' | 'good' | 'splash' {
  const k = slow ? 1.6 : 1;
  if (errMs <= 110 * k) return 'perfect';
  if (errMs <= 230 * k) return 'good';
  return 'splash';
}

export function openCauldron(opts: { title?: string } = {}): Promise<BrewOutcome | null> {
  const d = app.data;
  if (!d || ui.has('cauldron')) return Promise.resolve(null);
  return new Promise((resolve) => {
    const picked: string[] = [];
    let outcome: BrewOutcome | null = null;
    let raf = 0;
    const body = h('div', { class: 'cd-body' });
    const panel = h('div', { class: 'panel cd-panel', attrs: { 'data-testid': 'cauldron' } }, h('h2', null, opts.title ?? '🍲 Grandma’s Cauldron'), body);
    let bottled = false;
    const bottle = (soupId: string) => {
      bottled = true;
      d.inventory[soupItemId(soupId)] = (d.inventory[soupItemId(soupId)] ?? 0) + 1;
      app.autosave.request();
    };
    const close = () => {
      cancelAnimationFrame(raf);
      // walking away from a finished pot bottles it — soup is never lost
      if (outcome && !outcome.drank && !bottled) bottle(outcome.soup.id);
      audio.sfx('close');
      ui.pop('cauldron');
      resolve(outcome);
    };
    let onConfirm: ((p: 0 | 1) => boolean) | null = null;

    // ------------------------------------------------------------ 1. pick three ingredients
    const renderPick = () => {
      onConfirm = null;
      clear(body);
      const have = ITEMS.filter((it) => it.kind === 'ingredient' && (d.inventory[it.id] ?? 0) > 0);
      const left = (id: string) => (d.inventory[id] ?? 0) - picked.filter((p) => p === id).length;
      const pot = h(
        'div',
        { class: 'cd-pot-slots', attrs: { 'data-testid': 'cd-slots' } },
        [0, 1, 2].map((i) =>
          h(
            'button',
            {
              class: `cd-slot ${picked[i] ? '' : 'empty'}`,
              dataset: { nav: '' },
              attrs: { type: 'button', 'data-testid': `cd-slot-${i}`, 'aria-label': picked[i] ? `remove ${picked[i]}` : 'empty' },
              onclick: (e: Event) => {
                e.stopPropagation();
                if (!picked[i]) return;
                picked.splice(i, 1);
                audio.sfx('back');
                renderPick();
              },
            },
            picked[i] ? h('img', { attrs: { src: iconUrl(picked[i]), alt: '' } }) : '+',
          ),
        ),
      );
      const grid = h(
        'div',
        { class: 'cd-grid' },
        have.length
          ? have.map((it) =>
              h(
                'button',
                {
                  class: 'cd-ing',
                  dataset: { nav: '' },
                  attrs: { type: 'button', 'data-testid': `cd-ing-${it.id}`, title: it.name, disabled: left(it.id) <= 0 || picked.length >= 3 },
                  onclick: (e: Event) => {
                    e.stopPropagation();
                    if (picked.length >= 3 || left(it.id) <= 0) return;
                    picked.push(it.id);
                    audio.sfx('bubble');
                    renderPick();
                    if (picked.length === 3) (body.querySelector('[data-testid="cd-stir"]') as HTMLElement | null)?.focus();
                  },
                },
                h('img', { attrs: { src: iconUrl(it.id), alt: '' } }),
                h('span', { class: 'cd-ing-name' }, it.name),
                h('span', { class: 'bp-count' }, `×${left(it.id)}`),
              ),
            )
          : h('p', { class: 'cd-empty' }, 'Your basket is empty! Grow veggies in your garden, pick clover in the meadow, and ask Finnegan and Juniper for kelp and honey.'),
      );
      body.append(
        h('p', { class: 'small cd-tip' }, 'Pick three ingredients, then stir to the bubbly beat! Clover’s riddle clues are in your Recipe Book.'),
        h('div', { class: 'cd-pick' }, h('div', { class: 'cd-pot-wrap' }, h('div', { class: 'cd-pot mini', attrs: { 'aria-hidden': 'true' } }), pot), grid),
        h(
          'div',
          { class: 'row end sticky-foot' },
          button('Close', close, { cls: 'secondary', testid: 'cd-close' }),
          button('Stir!', () => startStir(), { icon: '🥄', disabled: picked.length < 3, autofocus: picked.length === 3, testid: 'cd-stir' }),
        ),
      );
    };

    // ------------------------------------------------------------ 2. stir to the beat
    const startStir = () => {
      if (picked.length < 3) return;
      for (const id of picked) {
        d.inventory[id] = (d.inventory[id] ?? 0) - 1;
        if (d.inventory[id] <= 0) delete d.inventory[id];
      }
      const two = input.twoPlayer;
      const slow = hasEffect('ticktock');
      const period = slow ? 1900 : 1300;
      const t0 = performance.now() + 400;
      const done: number[][] = two ? [[], []] : [[]];
      clear(body);
      const ring = h('div', { class: 'cd-ring', style: `--period:${period}ms` }, h('div', { class: 'cd-sweet' }), h('div', { class: 'cd-spoon p1' }), two ? h('div', { class: 'cd-spoon p2' }) : null, h('div', { class: 'cd-pot', style: '' }, h('div', { class: 'cd-bubbles' })));
      const pops = [h('div', { class: 'cd-pop p1' }), h('div', { class: 'cd-pop p2' })];
      const counts = [h('div', { class: 'cd-count p1', attrs: { 'data-testid': 'cd-count-0' } }), h('div', { class: 'cd-count p2', attrs: { 'data-testid': 'cd-count-1' } })];
      const updateCounts = () => done.forEach((list, p) => (counts[p].textContent = `${two ? `P${p + 1}: ` : ''}${'🥄'.repeat(list.length)}${'·'.repeat(STIRS - list.length)}`));
      const stirBtn = (p: 0 | 1) => button(two ? `Stir! (P${p + 1})` : 'Stir!', () => stir(p), { icon: '🥄', cls: `big cd-stir-btn p${p + 1}`, testid: `cd-stir-${p}` });
      body.append(
        h('p', { class: 'cd-tip' }, two ? 'Both spoons! Press your action button when your spoon reaches the ✦ at the top.' : 'Press the action button when the spoon reaches the ✦ at the top!'),
        h('div', { class: 'cd-stage' }, ring, pops[0], two ? pops[1] : null),
        h('div', { class: 'cd-counts' }, counts[0], two ? counts[1] : null),
        h('div', { class: 'row center' }, stirBtn(0), two ? stirBtn(1) : null),
        ...(slow ? [h('p', { class: 'small' }, '🍅 Tick-Tock Tomato: the spoon moves slowly — easy stirring!')] : []),
      );
      updateCounts();
      let lastBeat = -1;
      const tick = () => {
        const t = performance.now() - t0;
        const beat = Math.floor(t / period);
        if (t >= 0 && beat !== lastBeat) {
          lastBeat = beat;
          audio.sfx('bubble', { vol: 0.5 });
          ring.classList.remove('beat');
          void ring.offsetWidth;
          ring.classList.add('beat');
        }
        const ang = ((((t % period) + period) % period) / period) * 360;
        ring.style.setProperty('--angle', `${ang}deg`);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      const stir = (p: 0 | 1) => {
        const who = two ? p : 0;
        if (done[who].length >= STIRS) return;
        const t = performance.now() - t0;
        const phase = ((t % period) + period) % period;
        const err = Math.min(phase, period - phase);
        const j = judge(err, slow);
        done[who].push(j === 'perfect' ? 3 : j === 'good' ? 2 : 1);
        audio.sfx(j === 'perfect' ? 'perfect' : j === 'good' ? 'hit' : 'splash');
        const pop = pops[who];
        pop.textContent = j === 'perfect' ? 'Perfect!' : j === 'good' ? 'Good!' : 'Splash!';
        pop.className = `cd-pop p${who + 1} ${j}`;
        void pop.offsetWidth;
        pop.classList.add('show');
        updateCounts();
        if (done.every((l) => l.length >= STIRS)) setTimeout(() => finishStir(done, two), 450);
      };
      onConfirm = (p) => {
        stir(p);
        return true;
      };
    };

    // ------------------------------------------------------------ 3. what did we make?
    const finishStir = (done: number[][], two: boolean) => {
      cancelAnimationFrame(raf);
      onConfirm = null;
      const all = done.flat();
      const stars = Math.max(1, Math.min(3, Math.round(all.reduce((a, b) => a + b, 0) / all.length)));
      const r = brew(picked, two);
      const isNew = discover(r.soup.id, comboKey(picked));
      d.flags['soup:brewed'] = true;
      outcome = { soup: r.soup, isNew, stars, drank: false, neededTwo: !!r.neededTwo };
      audio.sfx(r.soup.silly ? 'squeak' : 'fanfare');
      clear(body);
      body.append(
        h(
          'div',
          { class: 'cd-result', attrs: { 'data-testid': 'cd-result', 'data-soup': r.soup.id } },
          h('img', { class: 'cd-bowl', attrs: { src: iconUrl(`bowl:${r.soup.color}`), alt: '' } }),
          h('div', { class: 'cd-result-info' },
            isNew ? h('div', { class: 'cd-new' }, r.soup.silly ? '✨ New silly soup!' : '✨ New recipe!') : null,
            h('h3', { attrs: { 'data-testid': 'cd-soup-name' } }, r.soup.name),
            h('div', { class: 'cd-stars' }, '★'.repeat(stars) + '☆'.repeat(3 - stars)),
            h('p', null, r.soup.desc),
            r.neededTwo ? h('p', { class: 'cd-two' }, '🥄🥄 Clover: “This pot wanted two spoons! Stir it together with a friend and see what happens.”') : null,
            picked.length ? h('div', { class: 'cd-used' }, picked.map((id) => h('img', { attrs: { src: iconUrl(id), alt: '' } }))) : null,
          ),
        ),
        h(
          'div',
          { class: 'row end' },
          button('Bottle it', () => {
            bottle(r.soup.id);
            toast(`${r.soup.name} bottled for later — it's in your backpack.`, { icon: '🫙', now: true });
            close();
          }, { cls: 'secondary', testid: 'cd-bottle' }),
          button(input.twoPlayer ? 'Drink it together!' : 'Drink it!', () => {
            outcome!.drank = true;
            drinkSoup(r.soup.id, stars);
            app.autosave.request();
            close();
          }, { icon: '😋', autofocus: true, testid: 'cd-drink' }),
        ),
      );
      app.autosave.request();
    };

    renderPick();
    ui.push({
      id: 'cauldron',
      el: closeOnBackdrop(h('div', { class: 'center-wrap backdrop' }, panel), () => {
        if (!onConfirm && !outcome) close();
      }),
      onBack: () => {
        if (onConfirm) return; // mid-stir: keep stirring
        close();
      },
      onConfirm: (p) => (onConfirm ? onConfirm(p) : false),
    });
    audio.sfx('open');
  });
}
