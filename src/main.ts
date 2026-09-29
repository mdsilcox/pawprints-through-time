import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './styles/main.css';
import './styles/menus.css';

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
import { openSettings } from './ui/settingsScreen';
import { openQuestLog } from './ui/questLog';
import { reminder } from './ui/reminder';
import { audio } from './audio/audio';
import { dialogue, talk, ask } from './ui/dialogue';
import { hud } from './ui/hud';
import { installQuestRuntime } from './story/runtime';
import { currentObjective, questLog } from './story/quests';
import { TILE } from './world/collision';
import './story/sideQuests';

ui.mount(document.getElementById('ui-root')!);
audio.installUnlock();
audio.apply(app.settings);
app.events.on('settings', (s) => audio.apply(s));
app.boot([BootScene, TitleScene, WorldScene]);
installControls();
hud.onObjective = () => openQuestLog();
reminder.install();
installQuestRuntime();

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
  openSettings: () => openSettings(),
  ui: () => ui.ids,
  input: (i: 0 | 1) => ({ ...input.p[i] }),
  prompt: () => world().focusTarget?.label ?? null,
  // dialogue
  talk: (who: string, lines: string | string[]) => talk(who, lines),
  ask: (who: string, q: string, opts: string[]) => ask(who, q, opts),
  dialogueOpen: () => dialogue.isOpen,
  dialogueLines: () => dialogue.shown.slice(),
  // quests
  objective: () => {
    const o = app.data ? currentObjective(app.data) : null;
    return o ? { quest: o.quest.id, step: o.step.id, text: o.step.text } : null;
  },
  quests: () => {
    if (!app.data) return null;
    const log = questLog(app.data);
    return { active: log.active.map((p) => p.quest.id), finished: log.finished.map((p) => p.quest.id) };
  },
  // playtime reminder
  fastForward: (ms: number) => reminder.fastForward(ms),
  triggerReminder: () => reminder.fastForward(reminder.timer.remainingMs + 1),
  triggerLateNight: () => reminder.forceLate(),
  reminderState: () => ({
    state: reminder.timer.state,
    elapsedMs: reminder.timer.elapsedMs,
    snoozes: reminder.timer.snoozes,
    nextAt: reminder.timer.nextAt,
    intervalMs: reminder.timer.cfg.intervalMs,
    showing: reminder.isShowing,
    count: { ...reminder.count },
  }),
  simulateBackground: (ms: number) => {
    reminder.timer.pause();
    const t = reminder.timer as unknown as { pausedAt: number | null };
    if (t.pausedAt !== null) t.pausedAt -= ms;
    return reminder.timer.resume();
  },
  // audio
  audioState: () => ({ unlocked: audio.unlocked, music: audio.current, played: { ...audio.played } }),
  saves: () => app.autosave.saves,
});
installDebugHooks(app);
void registerPwa();

// Keep the page from scrolling/zooming on touch devices.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
