import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './styles/main.css';
import './styles/menus.css';
import './styles/world.css';
import './styles/wardrobe.css';

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
import './art/species';
import './art/items';
import { showGallery } from './art/gallery';
import './story/opening';
import './story/tockwoodNpcs';
import { openMap } from './ui/mapScreen';
import { openBackpack } from './ui/backpack';
import { openBunnyTracker } from './ui/bunnyTracker';
import { openWardrobe } from './ui/wardrobe';
import { equip as wEquip, grant as wGrant } from './core/wardrobe';
import { registerPortraitSource } from './ui/portraits';
import { renderCorgiPortrait } from './art/corgi';
import { renderBunnyPortrait } from './art/bunny';
import { biscuitPieces } from './data/clothes';
import { GRANDMA } from './data/bunnies';
import { toast } from './ui/ui';

ui.mount(document.getElementById('ui-root')!);
audio.installUnlock();
audio.apply(app.settings);
app.events.on('settings', (s) => audio.apply(s));
app.boot([BootScene, TitleScene, WorldScene]);
installControls();
hud.onObjective = () => openQuestLog();
reminder.install();
installQuestRuntime();
registerPortraitSource((id) => {
  if (id === 'biscuit') return renderCorgiPortrait(biscuitPieces(app.data?.biscuit.outfit ?? {}), 160);
  if (id === 'grandma') return renderBunnyPortrait(GRANDMA, 160);
  return null;
});
app.events.on('open-portal-map', () => toast('The first Time Sand is calling from the Golden Age of Piracy... (the voyage opens in the next chapter!)', { icon: '🏴', ms: 4000 }));

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
  saves: () => app.saveCount,
  gallery: () => showGallery(),
  // world & story (M3)
  goTo: (map: string, spawn = 'in') => world().goTo(map, spawn),
  mapId: () => world().def.id,
  setTime: (hours: number) => {
    if (app.data) app.data.minutes = hours * 60;
  },
  time: () => (app.data ? { day: app.data.day, minutes: app.data.minutes, night: world().isNight } : null),
  digSpots: () => world().digSpots(),
  sniff: () => world().sniff(),
  npcs: () => [...world().npcs.values()].map((n) => ({ id: n.def.id, x: n.x / TILE, y: n.y / TILE })),
  biscuit: () => {
    const b = world().biscuit;
    return b ? { x: b.x / TILE, y: b.y / TILE, state: b.state } : null;
  },
  bunnies: () => world().bunnies.map((b) => ({ x: b.x / TILE, y: b.y / TILE, mode: b.mode })),
  give: (id: string, n = 1) => {
    if (app.data) app.data.inventory[id] = (app.data.inventory[id] ?? 0) + n;
  },
  inventory: () => ({ ...(app.data?.inventory ?? {}) }),
  rescueBunny: (id: string) => {
    if (app.data && !app.data.bunnies.includes(id)) app.data.bunnies.push(id);
  },
  skipOpening: () => {
    if (!app.data) return;
    for (const f of ['met:biscuit', 'met:pip', 'biscuit:companion', 'visited:clocktower']) app.data.flags[f] = true;
  },
  openMap: () => openMap(),
  openBackpack: () => openBackpack(),
  openBunnies: () => openBunnyTracker(),
  openWardrobe: (who: 0 | 1 | 'biscuit' = 0, shop = false) => openWardrobe({ who, shop }),
  equip: (who: 0 | 1 | 'biscuit', id: string, color = 0) => {
    const ok = app.data ? wEquip(app.data, who, id, color) : false;
    if (ok) app.events.emit('outfit-changed', who === 'biscuit' ? 2 : who);
    return ok;
  },
  grant: (id: string) => (app.data ? wGrant(app.data, id) : false),
  setTockens: (n: number) => {
    if (app.data) app.data.tockens = n;
  },
  textures: () => ({ players: world().players.map((p) => p.textureKey), biscuit: world().biscuit?.textureKey ?? null }),
});
installDebugHooks(app);
void registerPwa();

// Keep the page from scrolling/zooming on touch devices.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
