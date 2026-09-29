import { app } from '../app';
import type { SlotSummary } from '../core/state';
import { h } from './dom';
import { button, ui } from './ui';

export function formatPlayTime(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just started';
  if (min < 60) return `${min} min played`;
  const hr = Math.floor(min / 60);
  return `${hr} h ${min % 60} min played`;
}

const PLACE_NAMES: Record<string, string> = {
  tockwood: 'Tockwood Isle',
};

export function placeName(map: string): string {
  return PLACE_NAMES[map] ?? map.replace(/[-_]/g, ' ');
}

/**
 * Pick one of the save slots. `mode` decides which slots are selectable:
 * new: all (occupied ones ask before overwriting); load: only occupied ones.
 */
export async function pickSlot(mode: 'new' | 'load'): Promise<number | null> {
  if (ui.has('slots')) return null;
  const list = await app.saves.list();
  if (ui.has('slots')) return null;
  return new Promise((resolve) => {
    const done = (v: number | null) => {
      ui.pop('slots');
      resolve(v);
    };
    const card = (s: SlotSummary) => {
      const disabled = mode === 'load' && !s.exists;
      const body = s.exists
        ? h(
            'div',
            { class: 'slot-info' },
            h('div', { class: 'slot-title' }, `${s.p1Name} · Day ${s.day}`),
            h('div', { class: 'slot-sub' }, `${placeName(s.location)} · ⌛ ${s.sands} sands · 🐰 ${s.bunnies}`),
            h('div', { class: 'slot-sub small' }, formatPlayTime(s.playTimeMs)),
          )
        : h('div', { class: 'slot-info' }, h('div', { class: 'slot-title' }, 'Empty slot'), h('div', { class: 'slot-sub' }, 'A brand-new adventure'));
      return button(
        h('div', { class: 'slot-card-inner' }, h('div', { class: 'slot-num' }, String(s.slot)), body),
        async () => {
          if (mode === 'new' && s.exists) {
            const ok = await confirmDialog(`Start over in slot ${s.slot}? The adventure saved there will be replaced.`, 'Start over', 'Keep it');
            if (!ok) return;
          }
          done(s.slot);
        },
        { cls: 'slot-card', disabled, testid: `slot-${s.slot}` },
      );
    };
    const el = h(
      'div',
      { class: 'panel slots-panel' },
      h('h2', null, mode === 'new' ? 'Choose a save slot' : 'Load an adventure'),
      h('div', { class: 'slot-list' }, list.map(card)),
      h('div', { class: 'row end' }, button('Back', () => done(null), { cls: 'secondary', testid: 'slots-back' })),
    );
    ui.push({ id: 'slots', el: h('div', { class: 'center-wrap' }, el), onBack: () => done(null) });
  });
}

export function confirmDialog(message: string, yes = 'Yes', no = 'No'): Promise<boolean> {
  if (ui.has('confirm')) return Promise.resolve(false);
  return new Promise((resolve) => {
    const finish = (v: boolean) => {
      ui.pop('confirm');
      resolve(v);
    };
    const el = h(
      'div',
      { class: 'center-wrap backdrop' },
      h(
        'div',
        { class: 'panel confirm-panel' },
        h('p', { class: 'confirm-text' }, message),
        h('div', { class: 'row center' }, button(no, () => finish(false), { autofocus: true, testid: 'confirm-no' }), button(yes, () => finish(true), { cls: 'secondary danger', testid: 'confirm-yes' })),
      ),
    );
    ui.push({ id: 'confirm', el, onBack: () => finish(false) });
  });
}
