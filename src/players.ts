import { app } from './app';
import { input } from './input/input';
import { hud } from './ui/hud';
import type { WorldScene } from './scenes/WorldScene';

/** Drop-in / drop-out for Player 2. Works any time: in the world, menus, or mini-games. */
export function setTwoPlayer(on: boolean): void {
  if (input.twoPlayer === on) return;
  input.twoPlayer = on;
  hud.setTwoPlayer(on);
  const world = app.phaser?.scene.getScene('world') as WorldScene | undefined;
  if (world && world.scene.isActive()) {
    if (on) world.spawnPlayer2();
    else world.removePlayer2();
  }
  app.events.emit('two-player', on);
}
