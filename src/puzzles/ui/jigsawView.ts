import { audio } from '../../audio/audio';
import { treasureMapUrl } from '../../art/treasureMap';
import { h, clear } from '../../ui/dom';
import { isSolved, nextFix, placedCount, scramble, swap, turn, type JigsawState } from '../logic/jigsaw';
import { registerView } from './screen';
import { pop } from './common';

const WHERE = (cols: number, rows: number, slot: number) => {
  const x = slot % cols;
  const y = Math.floor(slot / cols);
  const col = cols === 2 ? ['left', 'right'][x] : ['left', 'middle', 'right'][x];
  const row = rows === 2 ? ['top', 'bottom'][y] : ['top', 'middle', 'bottom'][y];
  return row === 'middle' && col === 'middle' ? 'the very middle' : `the ${row} ${col}`;
};

/**
 * Torn-map jigsaw: tap a piece to pick it, tap another to swap them, tap the picked piece
 * again to turn it. (Keyboard / gamepad: the same with the action button.)
 */
registerView('jigsaw', (ctx) => {
  const v = ctx.variant;
  let s: JigsawState = scramble(v.cols, v.rows, Date.now() & 0xffff, v.turn);
  let picked: number | null = null;
  let done = false;
  const url = treasureMapUrl(600, 400);
  const board = h('div', { class: 'jg-board', style: `--cols:${v.cols}; --rows:${v.rows}`, attrs: { 'data-testid': 'jigsaw-board' } });
  const count = h('div', { class: 'jg-count', attrs: { 'data-testid': 'jigsaw-count' } });

  const render = () => {
    const active = document.activeElement as HTMLElement | null;
    const focusId = active && board.contains(active) ? active.getAttribute('data-testid') : null;
    clear(board);
    s.slots.forEach((piece, slot) => {
      const px = piece % v.cols;
      const py = Math.floor(piece / v.cols);
      const right = piece === slot && s.rot[piece] === 0;
      const tile = h(
        'button',
        {
          class: `jg-piece ${picked === slot ? 'picked' : ''} ${right ? 'home' : ''}`,
          dataset: { nav: '' },
          attrs: { type: 'button', 'data-testid': `jig-${slot}`, 'data-piece': piece, 'data-rot': s.rot[piece], 'aria-label': `map piece in ${WHERE(v.cols, v.rows, slot)}` },
          onclick: (e: Event) => {
            e.stopPropagation();
            act(slot);
          },
        },
        h('span', {
          class: 'jg-art',
          style: `background-image:url(${url}); background-size:${v.cols * 100}% ${v.rows * 100}%; background-position:${v.cols > 1 ? (px / (v.cols - 1)) * 100 : 0}% ${v.rows > 1 ? (py / (v.rows - 1)) * 100 : 0}%; transform: rotate(${s.rot[piece] * 90}deg)`,
        }),
      );
      board.append(tile);
    });
    count.textContent = `Pieces in place: ${placedCount(s)} of ${v.cols * v.rows}`;
    if (focusId) board.querySelector<HTMLElement>(`[data-testid="${focusId}"]`)?.focus({ preventScroll: true });
  };

  const act = (slot: number) => {
    if (done) return;
    board.querySelectorAll('.hinted').forEach((x) => x.classList.remove('hinted'));
    if (picked === null) {
      picked = slot;
      audio.sfx('select');
    } else if (picked === slot) {
      if (v.turn) {
        s = turn(s, slot);
        audio.sfx('blip');
      }
      // keep turning until it's right — then it's put down by itself
      const p = s.slots[slot];
      picked = v.turn && !(p === slot && s.rot[p] === 0) ? slot : null;
    } else {
      s = swap(s, picked, slot);
      audio.sfx('page');
      picked = null;
    }
    render();
    const el = board.querySelector<HTMLElement>(`[data-testid="jig-${slot}"]`);
    if (el) pop(el);
    if (isSolved(s)) {
      done = true;
      board.classList.add('whole');
      audio.sfx('success');
      setTimeout(() => ctx.solved(), 700);
    }
  };

  render();
  const el = h(
    'div',
    { class: 'jg' },
    board,
    h('div', { class: 'jg-side' }, count, h('p', { class: 'small' }, v.turn ? 'Tap a piece to pick it up. Tap another to swap them. Tap the picked piece again to turn it.' : 'Tap a piece, then tap where it should go.')),
  );
  return {
    el,
    onBack: () => {
      if (picked === null) return false;
      picked = null;
      render();
      return true;
    },
    hint: (level) => {
      if (level < 3) return null;
      const f = nextFix(s);
      if (!f) return null;
      board.querySelector(`[data-testid="jig-${f.from}"]`)?.classList.add('hinted');
      const turns = f.turns ? ` and turn it ${f.turns === 1 ? 'once' : f.turns === 2 ? 'twice' : 'three times'}` : '';
      return `The glowing piece belongs in ${WHERE(v.cols, v.rows, f.to)}${turns}!`;
    },
  };
});
