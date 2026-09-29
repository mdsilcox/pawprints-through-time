import { app } from '../app';
import { isTouchDevice } from '../core/display';
import { input } from './input';
import { TouchControls } from './touch';
import { hud } from '../ui/hud';
import { ui } from '../ui/ui';
import { openPause } from '../ui/pause';
import { setTwoPlayer } from '../players';
import { toast } from '../ui/ui';

/** Wires devices → per-frame input → menus / world. Call once after the UI is mounted. */
export function installControls(): void {
  input.attach();
  input.menuCheck = () => ui.blocking;
  const touch = new TouchControls(ui.touchLayer);
  input.touch = touch;
  hud.touch = touch;
  hud.mount();
  const updateTouchWanted = () => {
    const mode = app.settings.touchControls;
    hud.touchWanted = mode === 'on' || (mode === 'auto' && isTouchDevice());
    hud.sync();
  };
  updateTouchWanted();
  app.events.on('settings', updateTouchWanted);

  hud.onPause = () => openPause();
  hud.onToggleP2 = () => setTwoPlayer(!input.twoPlayer);

  input.events.on('nav', (d) => ui.nav(d));
  input.events.on('confirm', () => ui.confirm());
  input.events.on('back', () => ui.back());
  input.events.on('pause', () => {
    if (hud.world && !ui.blocking) openPause();
  });
  input.events.on('join-request', () => {
    if (!input.twoPlayer && hud.world) {
      setTwoPlayer(true);
    } else if (!hud.world) toast('Player 2 can join once the adventure starts!', { icon: '🎮' });
  });

  // Poll every frame, just before Phaser steps the scenes.
  app.phaser.events.on('prestep', () => {
    input.update();
  });
}
