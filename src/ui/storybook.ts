import { audio } from '../audio/audio';
import { h } from './dom';
import { button, ui } from './ui';

/** A page-turning storybook overlay: illustrated panels with captions. Resolves when finished. */
export function storybook(panels: { draw: () => HTMLCanvasElement; text: string }[], opts: { id?: string; lastLabel?: string } = {}): Promise<void> {
  const id = opts.id ?? 'storybook';
  if (ui.has(id)) return Promise.resolve();
  return new Promise((resolve) => {
    let i = 0;
    const art = h('div', { class: 'story-art' });
    const text = h('p', { class: 'story-text', attrs: { 'data-testid': 'story-text' } });
    const dots = h('div', { class: 'story-dots' }, panels.map(() => h('span', { class: 'story-dot' })));
    const finish = () => {
      ui.pop(id);
      resolve();
    };
    const next = h(
      'button',
      {
        class: 'btn story-next',
        dataset: { nav: '', autofocus: '' },
        attrs: { type: 'button', 'data-testid': 'story-next' },
        onclick: (e: Event) => {
          e.stopPropagation();
          advance();
        },
      },
      'Next ▶',
    );
    const show = () => {
      art.innerHTML = '';
      const c = panels[i].draw();
      c.classList.add('story-canvas');
      art.appendChild(c);
      text.textContent = panels[i].text;
      [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
      next.textContent = i === panels.length - 1 ? (opts.lastLabel ?? 'Begin! ✦') : 'Next ▶';
      art.classList.remove('turn');
      void art.offsetWidth;
      art.classList.add('turn');
    };
    const advance = () => {
      if (ui.locked) return;
      audio.sfx('page');
      i++;
      if (i >= panels.length) finish();
      else {
        ui.lock(250);
        show();
      }
    };
    const el = h(
      'div',
      { class: 'storybook', attrs: { 'data-testid': id }, onclick: () => advance() },
      h('div', { class: 'story-book' }, art, h('div', { class: 'story-foot' }, text, h('div', { class: 'story-controls' }, dots, button('Skip', finish, { cls: 'secondary small-btn', testid: 'story-skip' }), next))),
    );
    ui.push({ id, el, onConfirm: () => (advance(), true), onBack: () => undefined });
    show();
  });
}
