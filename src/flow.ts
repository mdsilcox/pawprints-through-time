import { app } from './app';
import { ui } from './ui/ui';

/** High-level game flow: title <-> play. */

export function switchToWorld(): void {
  ui.closeAll();
  const sm = app.phaser.scene;
  if (sm.isActive('title')) sm.stop('title');
  sm.start('world');
  app.markPlayStart();
}

export async function startNewGame(slot: number): Promise<void> {
  await app.newGame(slot);
  switchToWorld();
}

export async function continueGame(slot: number): Promise<void> {
  const data = await app.loadGame(slot);
  if (!data) return;
  switchToWorld();
}

export async function returnToTitle(reason = 'quit'): Promise<void> {
  if (app.data) await app.saveNow();
  app.markPlayEnd(reason);
  ui.closeAll();
  const sm = app.phaser.scene;
  for (const s of sm.getScenes(true)) if (s.scene.key !== 'title') sm.stop(s.scene.key);
  sm.start('title');
}
