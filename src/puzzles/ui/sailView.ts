import { audio } from '../../audio/audio';
import { h } from '../../ui/dom';
import { button, type Dir } from '../../ui/ui';
import { find, sail, solve, type Dir as SailDir, type NavState } from '../logic/navigation';
import { registerView } from './screen';
import { pop, wiggle } from './common';

const ARROWS: Record<string, string> = { '^': 'up', v: 'down', '<': 'left', '>': 'right' };

/** Sailing charts: pick a direction, the boat sails until something stops it. */
registerView('sail', (ctx) => {
  const v = ctx.variant;
  const chart = v.chart;
  const calm = ctx.effects.calm;
  const W = chart.rows[0].length;
  const H = chart.rows.length;
  let at: NavState = find(chart, 'S');
  let used = 0;
  let busy = false;
  let finished = false;

  const board = h('div', { class: `sa-board ${calm ? 'calm' : ''}`, style: `--w:${W}; --h:${H}`, attrs: { 'data-testid': 'sail-board', tabindex: 0 }, dataset: { nav: '', navDir: 'consume', autofocus: '' } });
  chart.rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const cls = ch === '#' ? 'rock' : ch === 'G' ? 'goal' : ch === '@' ? 'whirl' : ARROWS[ch] ? `current c-${ARROWS[ch]}` : 'water';
      board.append(
        h(
          'div',
          { class: `sa-cell ${cls}`, style: `left:${(x / W) * 100}%; top:${(y / H) * 100}%` },
          ch === 'G' ? h('span', { class: 'sa-buoy' }) : ch === '@' ? h('span', { class: 'sa-whirl', attrs: { 'aria-label': calm ? 'a calm whirlpool' : 'a whirlpool' } }) : ARROWS[ch] ? h('span', { class: 'sa-arrow' }, '➜') : null,
        ),
      );
    }),
  );
  const boat = h('div', { class: 'sa-boat', attrs: { 'data-testid': 'sail-boat', 'aria-label': 'toy boat' } }, h('span', { class: 'sa-sail' }), h('span', { class: 'sa-hull' }));
  board.append(boat);
  if (chart.wind) board.append(h('div', { class: `sa-wind w-${chart.wind}`, attrs: { 'aria-label': `wind blowing ${chart.wind}` } }, `💨 wind: ${chart.wind}`));
  const placeBoat = () => {
    boat.style.left = `${(at.x / W) * 100}%`;
    boat.style.top = `${(at.y / H) * 100}%`;
  };
  placeBoat();
  const counter = h('div', { class: 'sa-count', attrs: { 'data-testid': 'sail-moves' } });
  const updateCount = () => (counter.textContent = `Moves: ${used} of ${v.moves}`);

  const reset = (msg?: string) => {
    at = find(chart, 'S');
    used = 0;
    placeBoat();
    updateCount();
    if (msg) ctx.say(msg);
  };

  const go = async (dir: SailDir) => {
    if (busy || finished) return;
    const r = sail(chart, at, dir, calm);
    if (!r.path.length) {
      wiggle(boat);
      audio.sfx('error', { vol: 0.4 });
      return;
    }
    busy = true;
    board.dataset.busy = 'true';
    used++;
    updateCount();
    audio.sfx('splash', { vol: 0.5 });
    for (const [i, p] of r.path.entries()) {
      at = p;
      placeBoat();
      if (r.whirled && i === r.path.length - 2) {
        boat.classList.add('spin');
        audio.sfx('bubble');
        await new Promise((res) => setTimeout(res, 520));
        boat.classList.remove('spin');
      }
      await new Promise((res) => setTimeout(res, 110));
    }
    if (r.whirled) ctx.say(calm ? 'Whoops!' : 'Whoa — the whirlpool spun us right back! If only the sea were calm...');
    busy = false;
    board.dataset.busy = 'false';
    el.querySelectorAll('.hinted').forEach((x) => x.classList.remove('hinted'));
    if (r.reachedGoal) {
      finished = true;
      pop(boat);
      audio.sfx('success');
      setTimeout(() => ctx.solved(), 450);
      return;
    }
    if (used >= v.moves) {
      await new Promise((res) => setTimeout(res, 350));
      reset('The tide turned and the boat drifted home! Let’s try a new way.');
    }
  };

  board.addEventListener('navdir', ((e: CustomEvent<Dir>) => void go(e.detail as SailDir)) as EventListener);
  // swipe on the chart
  let sw: { x: number; y: number } | null = null;
  board.addEventListener('pointerdown', (e) => (sw = { x: e.clientX, y: e.clientY }));
  board.addEventListener('pointerup', (e) => {
    if (!sw) return;
    const dx = e.clientX - sw.x;
    const dy = e.clientY - sw.y;
    sw = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    void go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  });
  const pad = h(
    'div',
    { class: 'sa-pad' },
    (['up', 'left', 'right', 'down'] as SailDir[]).map((d) => button('➜', () => void go(d), { cls: `secondary sa-btn d-${d}`, testid: `sail-${d}` })),
  );
  const el = h(
    'div',
    { class: 'sa' },
    board,
    h('div', { class: 'sa-side' }, counter, pad, button('Start over', () => reset(), { icon: '↺', cls: 'secondary small-btn', testid: 'sail-reset' }), calm ? h('div', { class: 'small sa-calm' }, '🍲 Calm seas: the whirlpools have settled — sail right over them!') : null),
  );
  updateCount();
  return {
    el,
    refocus: () => board.focus({ preventScroll: true }),
    onBack: () => {
      // step out of the chart to the buttons instead of leaving the puzzle
      if (document.activeElement === board) {
        (el.querySelector('[data-testid="sail-up"]') as HTMLElement | null)?.focus();
        return true;
      }
      return false;
    },
    hint: (level) => {
      if (level < 3) return null;
      const sol = solve(chart, calm, at);
      if (!sol || !sol.length || sol.length > v.moves - used) {
        // from here the tide would turn first: start again, and show the first move from the dock
        reset();
        const first = solve(chart, calm, at)?.[0];
        if (!first) return 'Let’s start fresh from the dock!';
        el.querySelector<HTMLElement>(`[data-testid="sail-${first}"]`)?.classList.add('hinted');
        return `The tide would turn before we got there from here — so let’s start fresh from the dock. Try sailing ${first} first! (The button is glowing!)`;
      }
      const btn = el.querySelector<HTMLElement>(`[data-testid="sail-${sol[0]}"]`);
      btn?.classList.add('hinted');
      return `Try sailing ${sol[0]} next. (The button is glowing!)`;
    },
  };
});
