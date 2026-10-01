import { audio } from '../audio/audio';
import { input } from '../input/input';
import { h } from './dom';
import { button, ui } from './ui';
import { judge, STIRS } from './cauldron';

/**
 * The finale's giant pot: the family stirs Clover's celebration soup to the same bubbly beat as
 * the cauldron (both spoons in 2P) while the whole party watches. There's no wrong way to stir at
 * a party — every stir counts — and back/Escape lets anyone skip it.
 */
export function openPartyStir(): Promise<void> {
  if (ui.has('party-stir')) return Promise.resolve();
  return new Promise((resolve) => {
    const two = input.twoPlayer;
    const period = 1300;
    const t0 = performance.now() + 500;
    const done = two ? [0, 0] : [0];
    let raf = 0;
    let finished = false;

    const ring = h(
      'div',
      { class: 'cd-ring', style: `--period:${period}ms` },
      h('div', { class: 'cd-sweet' }),
      h('div', { class: 'cd-spoon p1' }),
      two ? h('div', { class: 'cd-spoon p2' }) : null,
      h('div', { class: 'cd-pot', style: '' }, h('div', { class: 'cd-bubbles' })),
    );
    const pops = [h('div', { class: 'cd-pop p1' }), h('div', { class: 'cd-pop p2' })];
    const counts = [h('div', { class: 'cd-count p1', attrs: { 'data-testid': 'ps-count-0' } }), h('div', { class: 'cd-count p2', attrs: { 'data-testid': 'ps-count-1' } })];
    const updateCounts = () => done.forEach((n, p) => (counts[p].textContent = `${two ? `P${p + 1}: ` : ''}${'🥄'.repeat(n)}${'·'.repeat(STIRS - n)}`));
    const tip = h('p', { class: 'cd-tip' }, two ? 'Both spoons! Stir when your spoon reaches the ✦ — the whole party is watching!' : 'Stir when the spoon reaches the ✦ — the whole party is watching!');
    const buttons = h(
      'div',
      { class: 'row center' },
      button(two ? 'Stir! (P1)' : 'Stir!', () => stir(0), { icon: '🥄', cls: 'big cd-stir-btn p1', testid: 'ps-stir-0' }),
      two ? button('Stir! (P2)', () => stir(1), { icon: '🥄', cls: 'big cd-stir-btn p2', testid: 'ps-stir-1' }) : null,
    );
    const panel = h(
      'div',
      { class: 'panel cd-panel', attrs: { 'data-testid': 'party-stir' } },
      h('h2', null, '🍲 Stir the celebration soup!'),
      tip,
      h('div', { class: 'cd-stage' }, ring, pops[0], two ? pops[1] : null),
      h('div', { class: 'cd-counts' }, counts[0], two ? counts[1] : null),
      buttons,
    );
    updateCounts();

    let lastBeat = -1;
    const tick = () => {
      const t = performance.now() - t0;
      const beat = Math.floor(t / period);
      if (t >= 0 && beat !== lastBeat && !finished) {
        lastBeat = beat;
        audio.sfx('bubble', { vol: 0.5 });
        ring.classList.remove('beat');
        void ring.offsetWidth;
        ring.classList.add('beat');
      }
      ring.style.setProperty('--angle', `${((((t % period) + period) % period) / period) * 360}deg`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const stir = (p: 0 | 1) => {
      const who = two ? p : 0;
      if (finished || done[who] >= STIRS) return;
      const t = performance.now() - t0;
      const phase = ((t % period) + period) % period;
      const j = judge(Math.min(phase, period - phase), false);
      done[who]++;
      audio.sfx(j === 'perfect' ? 'perfect' : j === 'good' ? 'hit' : 'bubble');
      // (every stir is a good stir at a party)
      const pop = pops[who];
      pop.textContent = j === 'perfect' ? 'Perfect!' : j === 'good' ? 'Yum!' : 'Splish!';
      pop.className = `cd-pop p${who + 1} ${j === 'splash' ? 'good' : j}`;
      void pop.offsetWidth;
      pop.classList.add('show');
      updateCounts();
      if (done.every((n) => n >= STIRS)) {
        finished = true;
        setTimeout(ready, 450);
      }
    };

    const ready = () => {
      if (!ui.has('party-stir')) return;
      audio.sfx('fanfare');
      tip.textContent = 'The celebration soup is ready — it smells like every time you visited!';
      buttons.replaceChildren(button('Serve the soup!', close, { icon: '🥣', cls: 'big', autofocus: true, testid: 'ps-serve' }));
      (buttons.querySelector('button') as HTMLElement | null)?.focus();
    };

    const close = () => ui.pop('party-stir');
    ui.push({
      id: 'party-stir',
      el: h('div', { class: 'center-wrap backdrop' }, panel),
      onBack: close,
      onConfirm: (p) => {
        if (finished) return false; // (the focused "Serve the soup!" button takes it)
        stir(p);
        return true;
      },
      onClose: () => {
        cancelAnimationFrame(raf);
        resolve();
      },
    });
    audio.sfx('open');
  });
}
