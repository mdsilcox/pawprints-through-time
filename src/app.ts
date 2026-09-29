import Phaser from 'phaser';
import { Emitter } from './core/emitter';
import { loadSettings, sanitizeSettings, storeSettings, type Settings } from './core/settings';
import { AutoSaver, SaveManager } from './core/save';
import { defaultSave, type SaveData } from './core/state';
import { initialScaleConfig, installResizeHandling } from './core/display';

export interface AppEvents extends Record<string, unknown> {
  settings: Settings;
  'data-loaded': SaveData;
  'before-save': SaveData;
  saved: { slot: number; at: number };
  'play-start': { slot: number };
  'play-end': { reason: string };
  'two-player': boolean;
  reminder: boolean;
  'map-changed': string;
}

/**
 * The game's hub: owns settings, the current save data and slot, the Phaser game and the
 * cross-cutting services. Scenes and UI talk to each other through `app`.
 */
export class GameApp {
  phaser!: Phaser.Game;
  settings: Settings = loadSettings();
  saves = new SaveManager();
  data: SaveData | null = null;
  slot = 0;
  events = new Emitter<AppEvents>();
  playing = false;
  booted = false;
  autosave = new AutoSaver(() => this.saveNow());
  private playStartedAt = 0;

  boot(scenes: Phaser.Types.Scenes.SceneType[]): void {
    this.phaser = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      backgroundColor: '#fff4e0',
      scale: initialScaleConfig('game'),
      scene: scenes,
      render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
      input: { gamepad: false, keyboard: false },
      audio: { noAudio: true },
      banner: false,
      disableContextMenu: true,
    });
    installResizeHandling(this.phaser);
    // Autosave at least once a minute while playing, and immediately when the app is backgrounded.
    setInterval(() => {
      if (this.playing && this.data) this.autosave.tick();
    }, 5000);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.playing && this.data) void this.autosave.flush();
    });
    window.addEventListener('pagehide', () => {
      if (this.playing && this.data) void this.autosave.flush();
    });
  }

  // ---------------------------------------------------------------- settings
  setSettings(patch: Partial<Settings>): void {
    this.settings = sanitizeSettings({ ...this.settings, ...patch });
    storeSettings(this.settings);
    this.events.emit('settings', this.settings);
  }

  // ---------------------------------------------------------------- saves
  async newGame(slot: number, init?: (d: SaveData) => void): Promise<SaveData> {
    const data = defaultSave();
    init?.(data);
    this.data = data;
    this.slot = slot;
    await this.saves.save(slot, data);
    this.events.emit('data-loaded', data);
    return data;
  }

  async loadGame(slot: number): Promise<SaveData | null> {
    const data = await this.saves.load(slot);
    if (!data) return null;
    this.data = data;
    this.slot = slot;
    this.events.emit('data-loaded', data);
    return data;
  }

  /** Write the current game to its slot (autosave + manual save both land here). */
  async saveNow(): Promise<void> {
    if (!this.data || !this.slot) return;
    this.accumulatePlayTime();
    this.events.emit('before-save', this.data);
    await this.saves.save(this.slot, this.data);
    this.events.emit('saved', { slot: this.slot, at: Date.now() });
  }

  markPlayStart(): void {
    this.playing = true;
    this.playStartedAt = performance.now();
    this.events.emit('play-start', { slot: this.slot });
  }

  markPlayEnd(reason: string): void {
    this.accumulatePlayTime();
    this.playing = false;
    this.events.emit('play-end', { reason });
  }

  private accumulatePlayTime(): void {
    if (!this.data || !this.playing) return;
    const now = performance.now();
    this.data.playTimeMs += Math.max(0, now - this.playStartedAt);
    this.playStartedAt = now;
  }

  // ---------------------------------------------------------------- flags
  flag<T extends boolean | number | string = boolean>(key: string): T | undefined {
    return this.data?.flags[key] as T | undefined;
  }

  setFlag(key: string, value: boolean | number | string = true): void {
    if (!this.data) return;
    this.data.flags[key] = value;
    this.autosave.request();
  }
}

export const app = new GameApp();
