import { h } from './dom';
import { button, ui } from './ui';

const FUN_NAMES = ['Maple', 'Pepper', 'Sunny', 'Robin', 'Pebble', 'Poppy', 'Otis', 'Wren', 'Milo', 'Luna', 'Kit', 'Hazel', 'Theo', 'Ivy', 'Sky', 'Bean', 'Rory', 'Nova', 'Ziggy', 'Tilly'];

export function randomName(avoid: string[] = []): string {
  const pool = FUN_NAMES.filter((n) => !avoid.includes(n));
  return pool[Math.floor(Math.random() * pool.length)];
}

export function cleanName(raw: string, fallback: string): string {
  const s = raw.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14);
  return s || fallback;
}

/** "Who's adventuring today?" — name the players so every save slot is easy to recognise. */
export function askNames(): Promise<{ p1: string; p2: string } | null> {
  if (ui.has('names')) return Promise.resolve(null);
  return new Promise((resolve) => {
    const n1 = randomName();
    const n2 = randomName([n1]);
    const mkInput = (value: string, testid: string, label: string) =>
      h('input', {
        class: 'name-input',
        dataset: { nav: '' },
        attrs: { type: 'text', maxlength: 14, value, 'aria-label': label, 'data-testid': testid, autocomplete: 'off', spellcheck: 'false' },
      });
    const i1 = mkInput(n1, 'name-p1', 'Player 1 name');
    const i2 = mkInput(n2, 'name-p2', 'Player 2 name');
    const dice = (inp: HTMLInputElement, other: () => string) =>
      button('🎲', () => (inp.value = randomName([other()])), { cls: 'secondary dice' });
    const finish = (ok: boolean) => {
      ui.pop('names');
      resolve(ok ? { p1: cleanName(i1.value, n1), p2: cleanName(i2.value, n2) } : null);
    };
    for (const inp of [i1, i2])
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          inp.blur();
        }
      });
    const panel = h(
      'div',
      { class: 'panel names-panel' },
      h('h2', null, 'Who’s adventuring today?'),
      h('p', { class: 'small' }, 'Pick names (or roll the dice). Player 2 can join any time from the pause menu.'),
      h('div', { class: 'name-row' }, h('span', { class: 'name-tag p1' }, 'Player 1'), i1, dice(i1, () => i2.value)),
      h('div', { class: 'name-row' }, h('span', { class: 'name-tag p2' }, 'Player 2'), i2, dice(i2, () => i1.value)),
      h('div', { class: 'row end' }, button('Back', () => finish(false), { cls: 'secondary', testid: 'names-back' }), button('Let’s go!', () => finish(true), { icon: '✦', autofocus: true, testid: 'names-ok' })),
    );
    ui.push({ id: 'names', el: h('div', { class: 'center-wrap' }, panel), onBack: () => finish(false) });
  });
}
