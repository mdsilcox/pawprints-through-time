import { app } from '../app';
import type { ActiveEffect } from '../core/state';
import { SOUP_BY_ID, type EffectId } from './recipes';

/**
 * Running soup effects. They live in the save (so a reload keeps your glow), tick down only
 * while you're actually playing (not in menus), and the world and HUD react to them.
 */
export function activeEffects(): ActiveEffect[] {
  return app.data?.effects ?? [];
}

export function hasEffect(id: EffectId): boolean {
  return activeEffects().some((e) => e.effect === id && e.left > 0);
}

export function effectLeft(id: EffectId): number {
  return activeEffects().find((e) => e.effect === id)?.left ?? 0;
}

function emit(): void {
  app.events.emit('effects', activeEffects().map((e) => e.effect));
}

/** Drinking a soup: its effect starts (or is topped up). `quality` 1..3 stars stretches it a little. */
export function drinkSoup(soupId: string, quality = 2): void {
  const d = app.data;
  const s = SOUP_BY_ID[soupId];
  if (!d || !s) return;
  const seconds = Math.round(s.seconds * (s.silly ? 1 : 0.85 + quality * 0.1));
  const cur = d.effects.find((e) => e.effect === s.effect);
  if (cur) {
    cur.left = Math.max(cur.left, seconds);
    cur.total = Math.max(cur.total, seconds);
    cur.soup = s.id;
  } else d.effects.push({ effect: s.effect, soup: s.id, left: seconds, total: seconds });
  app.events.emit('soup-drunk', s.id);
  emit();
}

/** Called by the world every frame with real seconds of play. */
export function tickEffects(dt: number): void {
  const d = app.data;
  if (!d || !d.effects.length) return;
  let changed = false;
  for (const e of d.effects) e.left -= dt;
  const before = d.effects.length;
  d.effects = d.effects.filter((e) => e.left > 0);
  if (d.effects.length !== before) changed = true;
  if (changed) emit();
}

export function clearEffects(): void {
  if (!app.data) return;
  app.data.effects = [];
  emit();
}
