import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './styles/main.css';

import { app } from './app';
import { installDebugHooks, registerDebug } from './core/debug';
import { returnToTitle, switchToWorld } from './flow';
import { registerPwa } from './core/pwa';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldScene } from './scenes/WorldScene';
import { ui } from './ui/ui';
import { installControls } from './input/controls';
import { input } from './input/input';
import { setTwoPlayer } from './players';
import { openPause } from './ui/pause';
import { TILE } from './world/collision';

ui.mount(document.getElementById('ui-root')!);
app.boot([BootScene, TitleScene, WorldScene]);
installControls();

const world = () => app.phaser.scene.getScene('world') as WorldScene;
registerDebug({
  toTitle: () => returnToTitle('debug'),
  startWorld: () => switchToWorld(),
  joinP2: () => setTwoPlayer(true),
  leaveP2: () => setTwoPlayer(false),
  twoPlayer: () => input.twoPlayer,
  players: () => world().players.map((p) => ({ x: p.x / TILE, y: p.y / TILE, facing: p.facing })),
  teleport: (x: number, y: number, i = 0) => {
    const p = world().players[i];
    p.x = x * TILE;
    p.y = y * TILE;
  },
  hold: (i: 0 | 1, x: number, y: number) => {
    input.virtual[i] = { ...input.virtual[i], x, y };
  },
  release: (i: 0 | 1) => {
    input.virtual[i] = {};
  },
  tap: (i: 0 | 1, btn: 'a' | 'b' = 'a') => {
    input.virtual[i][btn === 'a' ? 'aPressed' : 'bPressed'] = true;
  },
  camera: () => {
    const c = world().cameras.main;
    const v = c.worldView;
    return { zoom: c.zoom, x: v.x, y: v.y, w: v.width, h: v.height };
  },
  onScreen: (i: 0 | 1) => {
    const p = world().players[i];
    return !!p && world().isOnScreen(p.x, p.y - TILE * 0.6);
  },
  isSolid: (cx: number, cy: number) => world().coll.isSolid(cx, cy),
  openPause: () => openPause(),
  ui: () => ui.ids,
  input: (i: 0 | 1) => ({ ...input.p[i] }),
  prompt: () => world().focusTarget?.label ?? null,
});
installDebugHooks(app);
void registerPwa();

// Keep the page from scrolling/zooming on touch devices.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
