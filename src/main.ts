import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './styles/main.css';
import './styles/menus.css';
import './styles/world.css';
import './styles/wardrobe.css';
import './styles/puzzles.css';
import './styles/soup.css';
import './styles/eras.css';
import './styles/dance.css';

import { app } from './app';
import { installCancelGuard } from './core/session';
import { openSellScreen } from './ui/sellScreen';
import { maxSeparation } from './world/cameraMath';
import { installDebugHooks, registerDebug } from './core/debug';
import { returnToTitle, switchToWorld } from './flow';
import { registerPwa } from './core/pwa';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldScene } from './scenes/WorldScene';
import { DanceScene, danceDebug } from './scenes/DanceScene';
import { dance } from './dance/openDance';
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
import './story/dancing';
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
import { GRANDMA, HOPKINS } from './data/bunnies';
import { registerCharacter } from './data/characters';
import { toast } from './ui/ui';
// M5: brain-builders and magic soup
import './puzzles/content/tockwood';
import './puzzles/ui/riddleView';
import './puzzles/ui/gridView';
import './puzzles/ui/slideView';
import './puzzles/ui/sequenceView';
import './puzzles/ui/codeView';
import './puzzles/ui/sailView';
import './story/brainBuilders';
import './story/soupStory';
import './puzzles/content/pirates';
import './puzzles/ui/jigsawView';
import './story/pirateChapter';
import { learnNote, openNotes } from './ui/notesScreen';
import { openWorldMap } from './ui/worldMap';
import { openRecipeBook } from './ui/recipeBook';
import { openPuzzleJournal } from './ui/puzzleJournal';
import { openPuzzle } from './puzzles/ui/screen';
import { codeDebug } from './puzzles/ui/codeView';
import { openCauldron } from './ui/cauldron';
import { activeEffects, clearEffects, drinkSoup } from './soup/effects';
import { discover, learnClue } from './soup/kitchen';
import { recordAttempt } from './puzzles/registry';
import { TOCKWOOD_RIDDLES } from './puzzles/content/riddles';
import { riddleOfTheDay } from './story/brainBuilders';
import { gameNow, plotInfo } from './soup/garden';
import type { Difficulty } from './core/state';

installCancelGuard();

ui.mount(document.getElementById('ui-root')!);
audio.installUnlock();
audio.apply(app.settings);
app.events.on('settings', (s) => audio.apply(s));
app.boot([BootScene, TitleScene, WorldScene, DanceScene]);
installControls();
hud.onObjective = () => openQuestLog();
reminder.install();
installQuestRuntime();
registerPortraitSource((id) => {
  if (id === 'biscuit') return renderCorgiPortrait(biscuitPieces(app.data?.biscuit.outfit ?? {}), 160);
  if (id === 'grandma') return renderBunnyPortrait(GRANDMA, 160);
  if (id.startsWith('hop-')) {
    const hb = HOPKINS.find((b) => `hop-${b.id}` === id);
    if (hb) return renderBunnyPortrait(hb.look, 160);
  }
  return null;
});
// each Hopkins cousin talks as themselves (name tag + portrait)
for (const hb of HOPKINS) registerCharacter({ id: `hop-${hb.id}`, name: hb.name, title: 'Hopkins cousin', art: 'doll', voice: { midi: 81, kind: 'squeak' }, color: hb.look.accent ?? '#f4a3b4' });

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
  /** how far apart (in tiles) two players may get before the tether stops them */
  tetherLimit: () => {
    const l = maxSeparation(world().frameOpts());
    return { w: l.w / TILE, h: l.h / TILE };
  },
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
    elapsedMs: reminder.timer.liveElapsedMs,
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
  readSlot: (n: number) => app.saves.load(n),
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
  bunnies: () =>
    world().bunnies.map((b) => ({ x: b.x / TILE, y: b.y / TILE, mode: b.mode, flees: b.flees, home: { x: (b.area.x + b.area.w / 2) / TILE, y: (b.area.y + b.area.h / 2) / TILE, w: b.area.w / TILE, h: b.area.h / TILE } })),
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
  openSell: () => void openSellScreen(),
  // M5: puzzles & soup
  openPuzzle: (id: string, difficulty?: Difficulty) => void openPuzzle(id, { difficulty }),
  puzzleSecret: () => codeDebug.secret.slice(),
  puzzles: () => (app.data ? { records: structuredClone(app.data.puzzles), skill: app.data.skill } : null),
  openJournal: () => openPuzzleJournal(),
  openNotes: () => openNotes(),
  openWorldMap: () => void openWorldMap(),
  // M7: dancing
  openDance: (style = 'jig', rival: string | null = null, audience: string[] = []) => void dance({ style, rival, audience }),
  danceState: () => danceDebug.state(),
  danceAuto: (on = true) => danceDebug.setAuto(on),
  learnNoteDebug: (id: string) => learnNote(id),
  sands: () => app.data?.sands.slice() ?? [],
  openRecipeBook: () => openRecipeBook(),
  openCauldron: () => void openCauldron(),
  drink: (soupId: string, stars = 2) => drinkSoup(soupId, stars),
  effects: () => activeEffects().map((e) => ({ ...e })),
  clearEffects: () => clearEffects(),
  learnClue: (id: string) => learnClue(id),
  soupBook: () => (app.data ? { recipes: app.data.recipes.slice(), clues: app.data.clues.slice() } : null),
  garden: () => (app.data ? app.data.garden.map((p) => ({ ...p, ...plotInfo(p, gameNow(app.data!)) })) : null),
  /** move the island clock forward (garden growth etc.) */
  skipMinutes: (m: number) => {
    const d = app.data;
    if (!d) return;
    d.minutes += m;
    while (d.minutes >= 1440) {
      d.minutes -= 1440;
      d.day++;
    }
    world().refreshPlots();
  },
  speed: (i: 0 | 1 = 0) => world().players[i]?.speedMult ?? 1,
  discoverSoup: (id: string, combo = '') => discover(id, combo),
  riddleToday: () => {
    const d = app.data;
    const id = d ? d.flags[`riddle:day:${d.day}`] : undefined;
    const r = TOCKWOOD_RIDDLES.find((x) => x.id === id) ?? riddleOfTheDay();
    return { id: r.id, answer: r.answers[0] };
  },
  solvePuzzle: (id: string, hints = 0) => (app.data ? recordAttempt(app.data, id, { solved: true, hintsUsed: hints, difficulty: 'easy' }) : false),
  /** set a garden plot directly: crop id, watered this many in-game minutes ago (-1 = not watered) */
  gardenSet: (i: number, crop: string | null, wateredAgo = -1) => {
    const d = app.data;
    if (!d) return;
    const now = gameNow(d);
    d.garden[i] = { seed: crop, plantedAt: now, wateredAt: crop && wateredAgo >= 0 ? Math.max(1, now - wateredAgo) : 0 };
    world().refreshPlots();
  },
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
