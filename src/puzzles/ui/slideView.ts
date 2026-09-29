import { audio } from '../../audio/audio';
import { iconUrl } from '../../art/icons';
import { h } from '../../ui/dom';
import { button, type Dir } from '../../ui/ui';
import { applyMove, isSolved, parseLevel, range, solve, type Block } from '../logic/sliding';
import { registerView } from './screen';
import { pop, wiggle } from './common';

/** Crates are labelled with a vegetable so kids (and Pip) can name them. */
const CRATE_LABELS: [string, string][] = [
  ['pumpkin', 'pumpkin'],
  ['carrot', 'carrot'],
  ['radish', 'radish'],
  ['tomato', 'tomato'],
  ['corn', 'corn'],
  ['cloverleaf', 'clover'],
  ['honey', 'honey'],
  ['kelp', 'kelp'],
  ['basil', 'basil'],
  ['onion', 'onion'],
  ['beans', 'bean'],
  ['dates', 'date'],
  ['coconut', 'coconut'],
  ['lentils', 'lentil'],
];

/** Sliding blocks: drag a crate along its direction, or pick it (Enter / tap) and use the arrows. */
registerView('slide', (ctx) => {
  const level = parseLevel(ctx.variant.rows);
  let blocks: Block[] = level.blocks.map((b) => ({ ...b }));
  let moves = 0;
  let grabbed: string | null = null;
  /** where the picked-up crate started (a pick-up + put-down is one move, however far it slid) */
  let grabFrom = 0;
  let finished = false;
  const label = new Map<string, [string, string]>();
  level.blocks.filter((b) => !b.key).forEach((b, i) => label.set(b.id, CRATE_LABELS[i % CRATE_LABELS.length]));
  const keyName = ctx.variant.keyName ?? 'the wheelbarrow';
  const blockName = ctx.variant.blockName ?? 'crate';
  const nameOf = (id: string) => (level.blocks.find((b) => b.id === id)?.key ? keyName : `the ${label.get(id)?.[1]} ${blockName}`);

  const board = h('div', { class: `sl-board ${ctx.variant.blockName === 'barrel' ? 'barrels' : ''}`, style: `--w:${level.w}; --h:${level.h}`, attrs: { 'data-testid': 'slide-board' } });
  const keyRow = level.blocks.find((b) => b.key)!.y;
  board.append(h('div', { class: 'sl-exit', style: `top: ${(keyRow / level.h) * 100}%; height: ${100 / level.h}%`, attrs: { 'aria-hidden': 'true' } }, '➜'));
  const counter = h('div', { class: 'sl-count', attrs: { 'data-testid': 'slide-moves' } });
  const els = new Map<string, HTMLButtonElement>();

  const place = (b: Block, el: HTMLElement) => {
    el.style.left = `${(b.x / level.w) * 100}%`;
    el.style.top = `${(b.y / level.h) * 100}%`;
    el.style.width = `${((b.dir === 'h' ? b.len : 1) / level.w) * 100}%`;
    el.style.height = `${((b.dir === 'v' ? b.len : 1) / level.h) * 100}%`;
  };
  const updateCount = () => (counter.textContent = `Moves: ${moves} · Pip can do it in ${ctx.variant.best}`);

  const posOf = (id: string) => {
    const b = blocks.find((x) => x.id === id)!;
    return b.dir === 'h' ? b.x : b.y;
  };
  const doMove = (id: string, d: number, count = true): boolean => {
    if (finished || d === 0) return false;
    const r = range(level, blocks, id);
    if (d < r.min || d > r.max) return false;
    blocks = applyMove(blocks, { id, d });
    if (count) moves++;
    const b = blocks.find((x) => x.id === id)!;
    place(b, els.get(id)!);
    audio.sfx('roll', { vol: 0.5 });
    updateCount();
    board.querySelectorAll('.hinted').forEach((x) => x.classList.remove('hinted'));
    if (isSolved(level, blocks)) {
      if (!count && grabbed === id && posOf(id) !== grabFrom) moves++;
      updateCount();
      finished = true;
      const k = els.get(level.blocks.find((x) => x.key)!.id)!;
      k.classList.add('escape');
      audio.sfx('success');
      setTimeout(() => ctx.solved(), 650);
    }
    return true;
  };

  const release = () => {
    if (!grabbed) return false;
    if (!finished && posOf(grabbed) !== grabFrom) {
      moves++;
      updateCount();
    }
    const el = els.get(grabbed);
    el?.classList.remove('grabbed');
    if (el) delete el.dataset.navDir;
    grabbed = null;
    return true;
  };
  const grab = (id: string) => {
    release();
    grabbed = id;
    grabFrom = posOf(id);
    const el = els.get(id)!;
    el.classList.add('grabbed');
    el.dataset.navDir = 'consume';
    el.focus({ preventScroll: true });
    pop(el);
    audio.sfx('select');
  };

  for (const b of blocks) {
    const [icon] = label.get(b.id) ?? ['carrot'];
    const el = h(
      'button',
      {
        class: `sl-block ${b.key ? 'key' : ''} ${b.dir}`,
        dataset: { nav: '' },
        attrs: { type: 'button', 'data-testid': `block-${b.id}`, 'aria-label': `${nameOf(b.id)}, slides ${b.dir === 'h' ? 'left and right' : 'up and down'}` },
      },
      b.key ? h('span', { class: 'sl-barrow', attrs: { 'aria-hidden': 'true' } }, h('img', { attrs: { src: iconUrl('carrot'), alt: '' } }), h('img', { attrs: { src: iconUrl('pumpkin'), alt: '' } })) : h('img', { class: 'sl-icon', attrs: { src: iconUrl(icon), alt: '' } }),
    );
    place(b, el);
    els.set(b.id, el);
    board.append(el);
    // keyboard / pad: Enter picks the crate up, arrows slide it, Enter or Back puts it down
    el.addEventListener('navdir', ((e: CustomEvent<Dir>) => {
      const dir = e.detail;
      const cur = blocks.find((x) => x.id === b.id)!;
      const along = cur.dir === 'h' ? (dir === 'left' ? -1 : dir === 'right' ? 1 : 0) : dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
      if (!along || !doMove(b.id, along, false)) {
        wiggle(el);
        audio.sfx('error', { vol: 0.4 });
      }
    }) as EventListener);
    // pointer: drag along the crate's direction, or tap to pick it up
    let start: { x: number; y: number; id: number } | null = null;
    let shift = 0;
    el.addEventListener('pointerdown', (e) => {
      if (finished) return;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
      shift = 0;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.id) return;
      const cur = blocks.find((x) => x.id === b.id)!;
      const cell = board.getBoundingClientRect().width / level.w;
      const delta = cur.dir === 'h' ? e.clientX - start.x : e.clientY - start.y;
      const r = range(level, blocks, b.id);
      shift = Math.max(r.min, Math.min(r.max, Math.round(delta / cell)));
      const px = Math.max(r.min * cell, Math.min(r.max * cell, delta));
      el.style.transform = cur.dir === 'h' ? `translateX(${px}px)` : `translateY(${px}px)`;
      el.classList.add('dragging');
    });
    const end = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6;
      start = null;
      el.style.transform = '';
      el.classList.remove('dragging');
      if (shift) doMove(b.id, shift);
      else if (!moved) (grabbed === b.id ? release() : grab(b.id));
      shift = 0;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      // keyboard / gamepad "press" (a synthetic click): pick the crate up or put it down
      if (e.detail === 0 && !finished) {
        if (grabbed === b.id) release();
        else grab(b.id);
      }
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
    });
  }

  const reset = () => {
    if (finished) return;
    blocks = level.blocks.map((b) => ({ ...b }));
    moves = 0;
    release();
    for (const b of blocks) place(b, els.get(b.id)!);
    updateCount();
    audio.sfx('back');
  };
  updateCount();
  const el = h('div', { class: 'sl' }, board, h('div', { class: 'row center sl-tools' }, counter, button('Start over', reset, { icon: '↺', cls: 'secondary small-btn', testid: 'slide-reset' })));

  return {
    el,
    onBack: () => release(),
    hint: (level3) => {
      if (level3 < 3) return null;
      const sol = solve(level, blocks);
      if (!sol || !sol.length) return `Almost there — ${keyName} can roll right out!`;
      const m = sol[0];
      const b = blocks.find((x) => x.id === m.id)!;
      const dir = b.dir === 'h' ? (m.d > 0 ? 'right' : 'left') : m.d > 0 ? 'down' : 'up';
      const target = els.get(m.id)!;
      target.classList.add('hinted');
      return `Try sliding ${nameOf(m.id)} ${dir}${Math.abs(m.d) > 1 ? ` ${Math.abs(m.d)} squares` : ''}. It’s glowing!`;
    },
    // Enter on a focused crate picks it up (handled here so the screen doesn't "click" it)
    onDir: () => false,
  };
});
