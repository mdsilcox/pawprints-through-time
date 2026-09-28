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

ui.mount(document.getElementById('ui-root')!);
app.boot([BootScene, TitleScene, WorldScene]);
registerDebug({ toTitle: () => returnToTitle('debug'), startWorld: () => switchToWorld() });
installDebugHooks(app);
void registerPwa();

// Keep the page from scrolling/zooming on touch devices.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
