import { h } from './dom';
import { ui } from './ui';
import type { TouchControls } from '../input/touch';
import type { WorldScene } from '../scenes/WorldScene';

/**
 * In-world heads-up display: place name (top-left), Player 2 + pause buttons (top-right).
 * Also owns the touch controls' visibility and their contextual action labels.
 */
class Hud {
  el!: HTMLElement;
  private place!: HTMLElement;
  private p2Btn!: HTMLButtonElement;
  private pauseBtn!: HTMLButtonElement;
  touch: TouchControls | null = null;
  world: WorldScene | null = null;
  touchWanted = false;
  onPause: () => void = () => undefined;
  onToggleP2: () => void = () => undefined;
  twoPlayer = false;

  mount(): void {
    this.place = h('div', { class: 'hud-place' });
    this.p2Btn = h(
      'button',
      {
        class: 'hud-btn',
        attrs: { type: 'button', 'aria-label': 'Player 2 join or leave', 'data-testid': 'hud-p2' },
        onclick: (e: Event) => {
          e.stopPropagation();
          this.onToggleP2();
        },
      },
      '👥',
    );
    this.pauseBtn = h(
      'button',
      {
        class: 'hud-btn',
        attrs: { type: 'button', 'aria-label': 'Pause', 'data-testid': 'hud-pause' },
        onclick: (e: Event) => {
          e.stopPropagation();
          this.onPause();
        },
      },
      h('span', { class: 'pause-glyph' }, '❚❚'),
    );
    this.el = h('div', { class: 'hud hidden' }, h('div', { class: 'hud-left' }, this.place), h('div', { class: 'hud-right' }, this.p2Btn, this.pauseBtn));
    ui.hud.appendChild(this.el);
    ui.onChange(() => this.sync());
  }

  setWorld(scene: WorldScene | null): void {
    this.world = scene;
    if (scene) this.place.textContent = scene.def.name;
    this.sync();
  }

  setTwoPlayer(on: boolean): void {
    this.twoPlayer = on;
    this.p2Btn.classList.toggle('on', on);
    this.p2Btn.title = on ? 'Player 2: leave' : 'Player 2: join';
    this.touch?.setTwoPlayer(on);
  }

  setActionLabel(player: 0 | 1, label: string | null): void {
    this.touch?.setActionLabel(player, label);
  }

  sync(): void {
    const inWorld = !!this.world;
    this.el?.classList.toggle('hidden', !inWorld);
    if (this.touch) {
      this.touch.setEnabled(this.touchWanted);
      this.touch.setProfile(inWorld && !ui.blocking ? 'world' : 'none');
    }
  }
}

export const hud = new Hud();
