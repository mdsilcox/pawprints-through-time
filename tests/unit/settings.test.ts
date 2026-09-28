import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, sanitizeSettings, storeSettings, REMINDER_CHOICES } from '../../src/core/settings';

function memStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

describe('settings', () => {
  it('defaults to a 45 minute playtime reminder that is switched on', () => {
    expect(DEFAULT_SETTINGS.reminderMinutes).toBe(45);
    expect(REMINDER_CHOICES).toEqual([15, 30, 45, 60, 90]);
  });

  it('only accepts the offered reminder intervals (the reminder can never be switched off)', () => {
    expect(sanitizeSettings({ reminderMinutes: 0 }).reminderMinutes).toBe(45);
    expect(sanitizeSettings({ reminderMinutes: 9999 }).reminderMinutes).toBe(45);
    expect(sanitizeSettings({ reminderMinutes: 90 }).reminderMinutes).toBe(90);
  });

  it('clamps volumes and rejects bad enum values', () => {
    const s = sanitizeSettings({ masterVolume: 3, musicVolume: -1, textSpeed: 'warp', puzzleMode: 'hard', colorblind: 'yes' });
    expect(s.masterVolume).toBe(1);
    expect(s.musicVolume).toBe(0);
    expect(s.textSpeed).toBe('normal');
    expect(s.puzzleMode).toBe('hard');
    expect(s.colorblind).toBe(false);
  });

  it('persists and reloads', () => {
    const st = memStorage();
    storeSettings({ ...DEFAULT_SETTINGS, muted: true, reminderMinutes: 30 }, st);
    const s = loadSettings(st);
    expect(s.muted).toBe(true);
    expect(s.reminderMinutes).toBe(30);
  });

  it('survives corrupted storage', () => {
    const s = loadSettings({ getItem: () => '{not json' });
    expect(s).toEqual(DEFAULT_SETTINGS);
  });
});
