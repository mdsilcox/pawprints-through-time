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
  private placeName!: HTMLElement;
  private clock!: HTMLElement;
  private objective!: HTMLButtonElement;
  onObjective: () => void = () => undefined;
  private p2Btn!: HTMLButtonElement;
  private pauseBtn!: HTMLButtonElement;
  touch: TouchControls | null = null;
  world: WorldScene | null = null;
  touchWanted = false;
  onPause: () => void = () => undefined;
  onToggleP2: () => void = () => undefined;
  twoPlayer = false;

  mount(): void {
    this.placeName = h('span', { class: 'hud-place-name' });
    this.clock = h('span', { class: 'hud-clock', attrs: { 'data-testid': 'hud-clock' } });
    this.place = h('div', { class: 'hud-place' }, this.placeName, this.clock);
    this.p2Btn = h(
      'button',
      {
        class: 'hud-btn',
        attrs: { type: 'button', tabindex: -1, 'aria-label': 'Player 2 join or leave', 'data-testid': 'hud-p2' },
        onpointerdown: (e: Event) => e.preventDefault(),
        onclick: (e: Event) => {
          e.stopPropagation();
          (e.currentTarget as HTMLElement).blur();
          this.onToggleP2();
        },
      },
      '👥',
    );
    this.pauseBtn = h(
      'button',
      {
        class: 'hud-btn',
        attrs: { type: 'button', tabindex: -1, 'aria-label': 'Pause', 'data-testid': 'hud-pause' },
        onpointerdown: (e: Event) => e.preventDefault(),
        onclick: (e: Event) => {
          e.stopPropagation();
          (e.currentTarget as HTMLElement).blur();
          this.onPause();
        },
      },
      h('span', { class: 'pause-glyph' }, '❚❚'),
    );
    this.objective = h('button', {
      class: 'hud-objective hidden',
      attrs: { type: 'button', tabindex: -1, 'data-testid': 'hud-objective' },
      onpointerdown: (e: Event) => e.preventDefault(),
      onclick: (e: Event) => {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).blur();
        this.onObjective();
      },
    });
    this.el = h('div', { class: 'hud hidden' }, h('div', { class: 'hud-left' }, this.place, this.objective), h('div', { class: 'hud-right' }, this.p2Btn, this.pauseBtn));
    ui.hud.appendChild(this.el);
    ui.onChange(() => this.sync());
  }

  setWorld(scene: WorldScene | null): void {
    this.world = scene;
    if (scene) {
      this.placeName.textContent = scene.def.name;
      if (!scene.usesClock && scene.def.region !== 'tockwood') this.clock.textContent = '';
    }
    this.sync();
  }

  setTwoPlayer(on: boolean): void {
    this.twoPlayer = on;
    this.p2Btn.classList.toggle('on', on);
    this.p2Btn.title = on ? 'Player 2: leave' : 'Player 2: join';
    this.touch?.setTwoPlayer(on);
  }

  setClock(text: string): void {
    if (this.clock && this.clock.textContent !== text) this.clock.textContent = text;
  }

  setObjective(text: string | null, icon = '📍'): void {
    if (!this.objective) return;
    const t = text ? icon + ' ' + text : '';
    if (this.objective.textContent !== t) {
      this.objective.textContent = t;
      this.objective.classList.remove('pop');
      void this.objective.offsetWidth;
      if (text) this.objective.classList.add('pop');
    }
    this.objective.classList.toggle('hidden', !text);
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
