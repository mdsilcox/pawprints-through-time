import { app } from './app';
import { ui } from './ui/ui';
import { askNames } from './ui/newGame';
import { audio } from './audio/audio';
import { playIntroStorybook } from './story/opening';
import { resetStory } from './story/hooks';

/** High-level game flow: title <-> play. */

export function switchToWorld(): void {
  ui.closeAll();
  ui.clearToasts();
  resetStory(); // cancels any old scene and clears the dialogue box
  const sm = app.phaser.scene;
  if (sm.isActive('title')) sm.stop('title');
  sm.start('world');
  app.markPlayStart();
}

export async function startNewGame(slot: number): Promise<boolean> {
  const names = await askNames();
  if (!names) return false;
  await app.newGame(slot, (d) => {
    d.players[0].name = names.p1;
    d.players[1].name = names.p2;
  });
  await playIntroStorybook();
  switchToWorld();
  return true;
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
  ui.clearToasts();
  resetStory();
  const sm = app.phaser.scene;
  for (const s of sm.getScenes(true)) if (s.scene.key !== 'title') sm.stop(s.scene.key);
  sm.start('title');
  audio.music('title');
}
