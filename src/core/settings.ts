/** Player-facing settings, persisted in localStorage (shared by all save slots). */

export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';
export type PuzzleMode = 'adaptive' | 'easy' | 'medium' | 'hard';
export type TouchMode = 'auto' | 'on' | 'off';

export const REMINDER_CHOICES = [15, 30, 45, 60, 90] as const;
export type ReminderMinutes = (typeof REMINDER_CHOICES)[number];

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  textSpeed: TextSpeed;
  reminderMinutes: ReminderMinutes;
  lateNightNudge: boolean;
  colorblind: boolean;
  puzzleMode: PuzzleMode;
  touchControls: TouchMode;
  reduceMotion: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  muted: false,
  textSpeed: 'normal',
  reminderMinutes: 45,
  lateNightNudge: true,
  colorblind: false,
  puzzleMode: 'adaptive',
  touchControls: 'auto',
  reduceMotion: false,
};

const KEY = 'pawprints-settings-v1';

export function sanitizeSettings(raw: unknown): Settings {
  const s: Settings = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== 'object') return s;
  const r = raw as Record<string, unknown>;
  const vol = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
  s.masterVolume = vol(r.masterVolume, s.masterVolume);
  s.musicVolume = vol(r.musicVolume, s.musicVolume);
  s.sfxVolume = vol(r.sfxVolume, s.sfxVolume);
  s.muted = typeof r.muted === 'boolean' ? r.muted : s.muted;
  if (['slow', 'normal', 'fast', 'instant'].includes(r.textSpeed as string)) s.textSpeed = r.textSpeed as TextSpeed;
  if ((REMINDER_CHOICES as readonly number[]).includes(r.reminderMinutes as number))
    s.reminderMinutes = r.reminderMinutes as ReminderMinutes;
  s.lateNightNudge = typeof r.lateNightNudge === 'boolean' ? r.lateNightNudge : s.lateNightNudge;
  s.colorblind = typeof r.colorblind === 'boolean' ? r.colorblind : s.colorblind;
  if (['adaptive', 'easy', 'medium', 'hard'].includes(r.puzzleMode as string)) s.puzzleMode = r.puzzleMode as PuzzleMode;
  if (['auto', 'on', 'off'].includes(r.touchControls as string)) s.touchControls = r.touchControls as TouchMode;
  s.reduceMotion = typeof r.reduceMotion === 'boolean' ? r.reduceMotion : s.reduceMotion;
  return s;
}

export function loadSettings(storage: Pick<Storage, 'getItem'> | null = safeStorage()): Settings {
  try {
    const raw = storage?.getItem(KEY);
    return sanitizeSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function storeSettings(s: Settings, storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode etc. — settings just won't persist */
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export const TEXT_SPEED_CPS: Record<TextSpeed, number> = { slow: 28, normal: 50, fast: 95, instant: 100000 };
