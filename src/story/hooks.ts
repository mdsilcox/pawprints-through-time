import { app } from '../app';
import { audio } from '../audio/audio';
import { iconUrl } from '../art/icons';
import { ITEM_BY_ID } from '../data/items';
import { BISCUIT_BY_ID, CLOTHES_BY_ID } from '../data/clothes';
import { NOTE_BY_ID } from '../data/notes';
import { SOUP_BY_ID } from '../soup/recipes';
import { grant } from '../core/wardrobe';
import { h } from '../ui/dom';
import { toast, ui } from '../ui/ui';
import { dialogue } from '../ui/dialogue';
import { Cancelled, endSession, isCancelled, sessionEpoch } from '../core/session';
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
/** A talk handler that takes over while `when` holds (e.g. era friends visiting Tockwood for the party). */
const talkOverrides = new Map<string, { when: (ctx: StoryCtx) => boolean; fn: Handler }[]>();
export function onTalkWhen(npcId: string, when: (ctx: StoryCtx) => boolean, fn: Handler): void {
  const list = talkOverrides.get(npcId) ?? [];
  list.push({ when, fn });
  talkOverrides.set(npcId, list);
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
  const session = sessionEpoch();
  try {
    await fn(ctx);
  } catch (err) {
    if (!isCancelled(err)) console.error('[story] handler failed', err);
  } finally {
    // a script cancelled by leaving play must not unlock a newer session's script
    if (session === sessionEpoch()) busy = false;
  }
}
export const storyBusy = () => busy;
/**
 * Called when leaving play (e.g. Pip's "Take a break", back to the title): cancels whatever
 * scene was running and clears the dialogue box, so nothing from before can lock the story.
 */
export function resetStory(): void {
  endSession();
  busy = false;
  dialogue.reset();
}

/** Fire-and-forget story work (e.g. Biscuit trotting ahead) that quietly stops when play ends. */
export function background(fn: () => Promise<void>): void {
  fn().catch((err) => {
    if (!isCancelled(err)) console.error('[story] background task failed', err);
  });
}

export function triggerTalk(npcId: string, ctx: StoryCtx) {
  const special = (talkOverrides.get(npcId) ?? []).find((o) => o.when(ctx));
  return run(special ? special.fn : talkHandlers.get(npcId), ctx);
}
export function triggerUse(action: string, ctx: StoryCtx) {
  return run(useHandlers.get(action), ctx);
}
/**
 * A map's arrival scripts. If something else is playing (an eager button press already started
 * a conversation), they wait their turn instead of being dropped — unless play ends or the
 * players leave this map first.
 */
export async function triggerEnter(mapId: string, ctx: StoryCtx) {
  const session = sessionEpoch();
  const here = () => session === sessionEpoch() && ctx.world.def.id === mapId && ctx.world.scene.isActive() && !ctx.world.transitioning;
  for (const fn of enterHandlers.get(mapId) ?? []) {
    const t0 = performance.now();
    while (busy && here() && performance.now() - t0 < 180_000) await new Promise((r) => setTimeout(r, 100));
    if (!here()) return;
    await run(fn, ctx);
  }
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
  if (ITEM_BY_ID.get(id)?.kind === 'furniture' && !data.flags['home:hint']) {
    data.flags['home:hint'] = true;
    toast('New furniture! Place it in your cottage: press the action button just inside the door.', { icon: '🏠', ms: 4800 });
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

// ------------------------------------------------------------------ payoffs
/** One thing a story payoff hands out (or, with `line`, just says). */
export type Reward =
  | { sand: string }
  | { item: string; n?: number }
  | { clothes: string }
  | { tockens: number }
  | { note: string }
  | { friend: string; pts: number }
  | { clue: string; from?: string }
  | { icon: string; line: string };

interface RewardRow {
  icon?: string;
  img?: string;
  text: string;
}

/**
 * A story payoff. The progress flags and every reward land in the save together, in one step,
 * before the first celebration line — so Pip's break, "Save & quit" or a closed tab in the middle
 * of the celebration can never keep the "done" and lose the prize (a Time Sand, a keepsake...).
 * Returns `show()`: one card summing it all up, for when the celebration is over (instead of a
 * pile of pop-ups on top of the story).
 */
export function payout(flags: string[], rewards: Reward[], opts: { title?: string; world?: WorldScene } = {}): () => void {
  const d = app.data;
  if (!d) return () => undefined;
  for (const f of flags) d.flags[f] = true;
  const rows: RewardRow[] = [];
  let furniture = false;
  for (const r of rewards) {
    if ('sand' in r) {
      if (d.sands.includes(r.sand)) continue;
      d.sands.push(r.sand);
      rows.push({ icon: '⏳', text: `Time Sand — ${d.sands.length} of 8!` });
    } else if ('item' in r) {
      const n = r.n ?? 1;
      d.inventory[r.item] = (d.inventory[r.item] ?? 0) + n;
      const def = ITEM_BY_ID.get(r.item);
      if (def?.kind === 'furniture') furniture = true;
      rows.push({ img: iconUrl(r.item), text: `${def?.name ?? r.item}${n > 1 ? ` ×${n}` : ''}` });
    } else if ('clothes' in r) {
      if (!grant(d, r.clothes)) continue;
      const biscuit = BISCUIT_BY_ID.get(r.clothes);
      rows.push({ icon: biscuit ? '🐶' : '👕', text: `${(biscuit ?? CLOTHES_BY_ID.get(r.clothes))?.name ?? r.clothes}${biscuit ? ' for Biscuit' : ''} (Wardrobe)` });
    } else if ('tockens' in r) {
      d.tockens += r.tockens;
      rows.push({ icon: '🪙', text: `${r.tockens} Tockens` });
    } else if ('note' in r) {
      if (!NOTE_BY_ID.has(r.note) || d.notes.includes(r.note)) continue;
      d.notes.push(r.note);
      rows.push({ icon: '📜', text: `History Note: ${NOTE_BY_ID.get(r.note)!.title}` });
    } else if ('clue' in r) {
      if (!SOUP_BY_ID[r.clue] || d.clues.includes(r.clue)) continue;
      d.clues.push(r.clue);
      // (the Recipe Book credits whoever told you)
      if (r.from) d.flags[`cluefrom:${r.clue}`] = r.from;
      rows.push({ icon: '📜', text: `A recipe clue: ${d.recipes.includes(r.clue) ? SOUP_BY_ID[r.clue].name : 'a mystery soup'} (Recipe Book)` });
    } else if ('friend' in r) {
      const before = hearts(r.friend);
      d.friendship[r.friend] = Math.min(MAX_HEARTS * HEART, (d.friendship[r.friend] ?? 0) + r.pts);
      const after = hearts(r.friend);
      opts.world?.npc(r.friend)?.emote('heart', 1400);
      if (after > before) rows.push({ icon: '💕', text: `${'♥'.repeat(after)} Friendship with ${npcName(r.friend)} grew!` });
    } else rows.push({ icon: r.icon, text: r.line });
  }
  if (furniture && !d.flags['home:hint']) {
    d.flags['home:hint'] = true;
    rows.push({ icon: '🏠', text: 'Furniture goes in your cottage — press the action button just inside the door.' });
  }
  void app.autosave.flush();
  const session = sessionEpoch();
  let shown = false;
  return () => {
    if (shown || session !== sessionEpoch() || !rows.length) return;
    shown = true;
    rewardCard(opts.title ?? '🎁 You got', rows);
  };
}

/** Everything a payoff gave, in one card near the top of the screen (it fades by itself). */
function rewardCard(title: string, rows: RewardRow[]): void {
  if (!ui.toastLayer) return;
  const el = h(
    'div',
    { class: 'reward-card', attrs: { role: 'status', 'aria-live': 'polite', 'data-testid': 'reward-card' } },
    h('div', { class: 'rc-title' }, title),
    h(
      'ul',
      null,
      rows.map((r) => h('li', null, r.img ? h('img', { class: 'rc-icon', attrs: { src: r.img, alt: '' } }) : h('span', { class: 'rc-icon', attrs: { 'aria-hidden': 'true' } }, r.icon ?? '✨'), h('span', null, r.text))),
    ),
  );
  ui.toastLayer.appendChild(el);
  audio.sfx('coin');
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 450);
  }, 3200 + rows.length * 650);
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

/** Pause a script; rejects with Cancelled if play ended meanwhile. */
export function wait(ms: number): Promise<void> {
  const session = sessionEpoch();
  return new Promise<void>((resolve, reject) => setTimeout(() => (session === sessionEpoch() ? resolve() : reject(new Cancelled())), ms));
}

/** Block player movement for a scripted moment (dialogue still works). */
export async function cutscene<T>(fn: () => Promise<T>): Promise<T> {
  // a script left over from a finished play session never puts letterbox bars over the title
  if (!app.playing) throw new Cancelled();
  const screen = { id: 'cutscene', el: h('div', { class: 'cutscene-bars' }, h('div', { class: 'bar top' }), h('div', { class: 'bar bottom' })), dim: false, passive: false };
  const session = sessionEpoch();
  const own = ui.push(screen) === screen; // nested cutscenes share the outer bars
  try {
    return await fn();
  } finally {
    if (own && session === sessionEpoch()) ui.pop('cutscene');
  }
}
