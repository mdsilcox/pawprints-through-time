import Phaser from 'phaser';
import { app } from '../app';
import { returnToTitle } from '../flow';
import { h } from '../ui/dom';
import { button, ui } from '../ui/ui';

/** M0 placeholder: proves the title -> play -> save -> title loop. Replaced by the real world in M1. */
export class WorldScene extends Phaser.Scene {
  constructor() {
    super('world');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#8fcf6f');
    const el = h(
      'div',
      { class: 'center-wrap' },
      h(
        'div',
        { class: 'panel' },
        h('h2', null, 'Tockwood Isle'),
        h('p', null, `Save slot ${app.slot} is loaded. The island is being built!`),
        h('div', { class: 'row center' }, button('Back to title', () => void returnToTitle(), { testid: 'to-title' })),
      ),
    );
    ui.push({ id: 'world-placeholder', el, dim: false });
  }
}
