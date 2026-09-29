import { audio } from '../audio/audio';
import { h } from './dom';

/** Accessible, gamepad-friendly form widgets for menus (all keyboard/touch/pad operable). */

export function slider(label: string, value: number, onChange: (v: number) => void, testid?: string): HTMLElement {
  let v = value;
  const fill = h('div', { class: 'slider-fill' });
  const knob = h('div', { class: 'slider-knob' });
  const pct = h('span', { class: 'slider-pct' });
  const track = h('div', { class: 'slider-track' }, fill, knob);
  const el = h(
    'div',
    {
      class: 'slider',
      dataset: { nav: '', navDir: 'horizontal' },
      attrs: { role: 'slider', tabindex: 0, 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, ...(testid ? { 'data-testid': testid } : {}) },
    },
    h('span', { class: 'slider-label' }, label),
    track,
    pct,
  );
  const render = () => {
    const p = Math.round(v * 100);
    fill.style.width = `${p}%`;
    knob.style.left = `${p}%`;
    pct.textContent = `${p}%`;
    el.setAttribute('aria-valuenow', String(p));
  };
  const set = (nv: number) => {
    const c = Math.round(Math.min(1, Math.max(0, nv)) * 20) / 20;
    if (c === v) return;
    v = c;
    render();
    onChange(v);
  };
  el.addEventListener('navdir', ((e: CustomEvent) => {
    if (e.detail === 'left') set(v - 0.1);
    if (e.detail === 'right') set(v + 0.1);
    audio.sfx('blip');
  }) as EventListener);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
  });
  const fromPointer = (e: PointerEvent) => {
    const r = track.getBoundingClientRect();
    set((e.clientX - r.left) / r.width);
  };
  track.addEventListener('pointerdown', (e) => {
    track.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  track.addEventListener('pointermove', (e) => {
    if (track.hasPointerCapture(e.pointerId)) fromPointer(e);
  });
  render();
  return el;
}

export function toggle(label: string, value: boolean, onChange: (v: boolean) => void, testid?: string): HTMLElement {
  let v = value;
  const state = h('span', { class: 'toggle-state' });
  const el = h(
    'button',
    {
      class: 'toggle',
      dataset: { nav: '' },
      attrs: { type: 'button', role: 'switch', ...(testid ? { 'data-testid': testid } : {}) },
      onclick: () => {
        v = !v;
        render();
        onChange(v);
        audio.sfx(v ? 'select' : 'back');
      },
    },
    h('span', { class: 'toggle-label' }, label),
    h('span', { class: 'toggle-pill' }, h('span', { class: 'toggle-dot' })),
    state,
  );
  const render = () => {
    el.classList.toggle('on', v);
    el.setAttribute('aria-checked', String(v));
    state.textContent = v ? 'On' : 'Off';
  };
  render();
  return el;
}

export function segmented<T extends string | number>(label: string, options: { value: T; text: string }[], value: T, onChange: (v: T) => void, testid?: string): HTMLElement {
  let v = value;
  const buttons = options.map((o) =>
    h(
      'button',
      {
        class: 'seg-btn',
        dataset: { nav: '', value: String(o.value) },
        attrs: { type: 'button', ...(testid ? { 'data-testid': `${testid}-${o.value}` } : {}) },
        onclick: () => {
          v = o.value;
          render();
          onChange(v);
          audio.sfx('select');
        },
      },
      o.text,
    ),
  );
  const el = h('div', { class: 'segmented' }, h('div', { class: 'seg-label' }, label), h('div', { class: 'seg-row', attrs: { role: 'radiogroup', 'aria-label': label } }, buttons));
  const render = () =>
    buttons.forEach((b, i) => {
      const on = options[i].value === v;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
      b.setAttribute('role', 'radio');
    });
  render();
  return el;
}
