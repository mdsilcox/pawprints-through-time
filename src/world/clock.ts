/**
 * Tockwood's in-game clock (not the device clock): one in-game minute passes per real second
 * while playing in Tockwood, so a full day takes 24 real minutes. Pure functions for testing.
 */
export const DAY_MINUTES = 24 * 60;
export const GAME_MINUTES_PER_SECOND = 1;
export const MORNING = 6 * 60 + 30;

export interface Clock {
  day: number;
  minutes: number;
}

/** Advance the clock by real milliseconds; returns true if a new day began. */
export function advance(c: Clock, realMs: number): boolean {
  c.minutes += (realMs / 1000) * GAME_MINUTES_PER_SECOND;
  if (c.minutes >= DAY_MINUTES) {
    c.minutes -= DAY_MINUTES;
    c.day += 1;
    return true;
  }
  return false;
}

export type Phase = 'night' | 'dawn' | 'day' | 'dusk';

export function phase(minutes: number): Phase {
  const h = minutes / 60;
  if (h < 5 || h >= 20.5) return 'night';
  if (h < 6.5) return 'dawn';
  if (h < 18.5) return 'day';
  return 'dusk';
}

/** 0 = full day, 1 = full night, smooth in between (dawn/dusk). */
export function nightAmount(minutes: number): number {
  const h = minutes / 60;
  if (h >= 6.5 && h < 18.5) return 0;
  if (h >= 20.5 || h < 5) return 1;
  if (h >= 18.5) return (h - 18.5) / 2; // dusk 18:30 -> 20:30
  return 1 - (h - 5) / 1.5; // dawn 5:00 -> 6:30
}

/** How golden the light is (peaks at sunset/sunrise). */
export function warmAmount(minutes: number): number {
  const h = minutes / 60;
  const dusk = Math.max(0, 1 - Math.abs(h - 19) / 1.4);
  const dawn = Math.max(0, 1 - Math.abs(h - 5.8) / 1.0);
  return Math.max(dusk, dawn);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Multiply-tint colour for the world at this time (0xRRGGBB). */
export function tint(minutes: number): number {
  const n = nightAmount(minutes);
  const w = warmAmount(minutes) * (1 - n * 0.6);
  // day white -> warm gold -> night blue
  let r = 255;
  let g = 255;
  let b = 255;
  r = lerp(r, 255, w);
  g = lerp(g, 214, w);
  b = lerp(b, 170, w);
  r = lerp(r, 104, n);
  g = lerp(g, 110, n);
  b = lerp(b, 190, n);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

export function formatTime(minutes: number): string {
  const m = Math.floor(minutes) % DAY_MINUTES;
  let hh = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12;
  if (hh === 0) hh = 12;
  return `${hh}:${String(mm).padStart(2, '0')} ${ampm}`;
}

export function timeIcon(minutes: number): string {
  const p = phase(minutes);
  return p === 'night' ? '🌙' : p === 'dusk' ? '🌇' : p === 'dawn' ? '🌅' : '☀️';
}

/** Sleep until morning: if it's already past midnight, wake the same day; else next day. */
export function sleepUntilMorning(c: Clock): void {
  if (c.minutes >= MORNING) c.day += 1;
  c.minutes = MORNING;
}
