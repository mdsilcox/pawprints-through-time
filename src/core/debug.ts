import type { GameApp } from '../app';

/**
 * `window.__game` — a scripting surface for Playwright playthroughs and manual debugging.
 * Only installed in dev builds (vite dev server) or when the page is opened with `?debug`.
 * Systems register extra hooks via `registerDebug()` as they come online.
 */
export type DebugApi = Record<string, (...args: any[]) => unknown>;

const extra: DebugApi = {};

export function registerDebug(hooks: DebugApi): void {
  Object.assign(extra, hooks);
  const w = window as unknown as { __game?: DebugApi };
  if (w.__game) Object.assign(w.__game, hooks);
}

export function debugEnabled(): boolean {
  return import.meta.env.DEV || new URLSearchParams(location.search).has('debug');
}

export function installDebugHooks(app: GameApp): void {
  if (!debugEnabled()) return;
  const api: DebugApi = {
    ready: () => app.booted,
    scenes: () =>
      app.phaser.scene
        .getScenes(true)
        .map((s) => s.scene.key),
    state: () => (app.data ? structuredClone(app.data) : null),
    slot: () => app.slot,
    newGame: (slot = 1) => app.newGame(slot),
    load: (slot: number) => app.loadGame(slot),
    save: () => app.saveNow(),
    slots: () => app.saves.list(),
    deleteSlot: (slot: number) => app.saves.delete(slot),
    setFlag: (k: string, v: boolean | number | string = true) => app.setFlag(k, v),
    getFlag: (k: string) => app.flag(k),
    settings: () => ({ ...app.settings }),
    setSettings: (p: Record<string, unknown>) => app.setSettings(p),
    ...extra,
  };
  (window as unknown as { __game: DebugApi }).__game = api;
}
