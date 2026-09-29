import { app } from '../app';
import { audio } from '../audio/audio';
import { iconUrl } from '../art/icons';
import { ITEM_BY_ID } from '../data/items';
import { h } from '../ui/dom';
import { toast, ui } from '../ui/ui';
import type { WorldScene } from '../scenes/WorldScene';

/**
 * Glue between the world and story scripts. Scripts register handlers for talking to people,
 * using things and entering maps; they get a small context with the world and the player.
 */
export interface StoryCtx {
  world: WorldScene;
  player: 0 | 1;
  objectId?: string;
}

type Handler = (ctx: StoryCtx) => Promise<void> | void;

const talkHandlers = new Map<string, Handler>();
const useHandlers = new Map<string, Handler>();
const enterHandlers = new Map<string, Handler[]>();

export function onTalk(npcId: string, fn: Handler): void {
  talkHandlers.set(npcId, fn);
}
export function onUse(action: string, fn: Handler): void {
  useHandlers.set(action, fn);
}
export function onEnterMap(mapId: string, fn: Handler): void {
  const list = enterHandlers.get(mapId) ?? [];
  list.push(fn);
  enterHandlers.set(mapId, list);
}

export function hasTalk(npcId: string): boolean {
  return talkHandlers.has(npcId);
}

let busy = false;
/** Run one story handler at a time (no double-triggers while a scene plays). */
async function run(fn: Handler | undefined, ctx: StoryCtx): Promise<void> {
  if (!fn || busy) return;
  busy = true;
  try {
    await fn(ctx);
  } catch (err) {
    console.error('[story] handler failed', err);
  } finally {
    busy = false;
  }
}
export const storyBusy = () => busy;
/** Called when leaving play (e.g. back to the title) so an interrupted scene can't lock the story. */
export function resetStory(): void {
  busy = false;
}

export function triggerTalk(npcId: string, ctx: StoryCtx) {
  return run(talkHandlers.get(npcId), ctx);
}
export function triggerUse(action: string, ctx: StoryCtx) {
  return run(useHandlers.get(action), ctx);
}
export async function triggerEnter(mapId: string, ctx: StoryCtx) {
  for (const fn of enterHandlers.get(mapId) ?? []) await run(fn, ctx);
}

// ------------------------------------------------------------------ state helpers
export const d = () => app.data!;
export const flag = (k: string) => !!app.data?.flags[k];
export const setFlag = (k: string, v: boolean | number | string = true) => app.setFlag(k, v);

export function count(id: string): number {
  return app.data?.inventory[id] ?? 0;
}

/** Add items with a friendly pop-up. */
export function give(id: string, n = 1, opts: { quiet?: boolean; from?: string } = {}): void {
  const data = app.data;
  if (!data) return;
  data.inventory[id] = (data.inventory[id] ?? 0) + n;
  if (!opts.quiet) {
    const name = ITEM_BY_ID.get(id)?.name ?? id;
    itemPopup(id, n > 1 ? `${name} ×${n}` : name, opts.from);
    audio.sfx('pickup');
  }
  app.autosave.request();
}

export function take(id: string, n = 1): boolean {
  const data = app.data;
  if (!data || (data.inventory[id] ?? 0) < n) return false;
  data.inventory[id] -= n;
  if (data.inventory[id] <= 0) delete data.inventory[id];
  app.autosave.request();
  return true;
}

export function giveTockens(n: number): void {
  const data = app.data;
  if (!data) return;
  data.tockens += n;
  toast(`+${n} Tockens`, { icon: '🪙' });
  audio.sfx('coin');
}

/** A card that pops up in the middle of the screen showing what you got. */
export function itemPopup(id: string, label: string, from?: string): void {
  const el = h(
    'div',
    { class: 'item-popup' },
    h('img', { class: 'item-popup-icon', attrs: { src: iconUrl(id), alt: '' } }),
    h('div', { class: 'item-popup-text' }, from ? h('div', { class: 'small' }, from) : null, h('div', { class: 'item-popup-name' }, label)),
  );
  ui.toastLayer.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, 2200);
}

// ------------------------------------------------------------------ friendship
export const HEART = 20; // friendship points per heart
export const MAX_HEARTS = 5;

export function hearts(npc: string): number {
  return Math.min(MAX_HEARTS, Math.floor((app.data?.friendship[npc] ?? 0) / HEART));
}

/** Raise friendship; returns true if a new heart was earned. */
export function befriend(npc: string, pts: number, world?: WorldScene): boolean {
  const data = app.data;
  if (!data) return false;
  const before = hearts(npc);
  data.friendship[npc] = Math.min(MAX_HEARTS * HEART, (data.friendship[npc] ?? 0) + pts);
  const after = hearts(npc);
  world?.npc(npc)?.emote('heart', 1400);
  if (after > before) {
    toast(`${'♥'.repeat(after)} Friendship with ${npcName(npc)} grew!`, { icon: '💕', cls: 'quest' });
    audio.sfx('success');
  }
  app.autosave.request();
  return after > before;
}

const NAMES: Record<string, string> = {};
export function registerNpcName(id: string, name: string): void {
  NAMES[id] = name;
}
export function npcName(id: string): string {
  return NAMES[id] ?? id;
}

/** True once per in-game day per key (daily chats, gifts, freebies). */
export function oncePerDay(key: string): boolean {
  const data = app.data;
  if (!data) return false;
  const last = data.lastChat[key] ?? -1;
  if (last === data.day) return false;
  data.lastChat[key] = data.day;
  return true;
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Block player movement for a scripted moment (dialogue still works). */
export async function cutscene<T>(fn: () => Promise<T>): Promise<T> {
  const screen = { id: 'cutscene', el: h('div', { class: 'cutscene-bars' }, h('div', { class: 'bar top' }), h('div', { class: 'bar bottom' })), dim: false, passive: false };
  ui.push(screen);
  try {
    return await fn();
  } finally {
    ui.pop('cutscene');
  }
}
