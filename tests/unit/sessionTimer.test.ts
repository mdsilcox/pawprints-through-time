import { describe, it, expect, beforeEach } from 'vitest';
import { SessionTimer, DEFAULT_TIMER, isLateNight } from '../../src/core/sessionTimer';

const MIN = 60_000;

describe('SessionTimer (playtime reminder)', () => {
  let t = 0;
  let timer: SessionTimer;
  const advance = (ms: number) => {
    t += ms;
    return timer.update();
  };
  beforeEach(() => {
    t = 1_000_000;
    timer = new SessionTimer(DEFAULT_TIMER, () => t);
  });

  it('does nothing until play starts', () => {
    expect(advance(60 * MIN)).toBeNull();
    expect(timer.state).toBe('idle');
    expect(timer.elapsedMs).toBe(0);
  });

  it('reminds after 45 minutes of play by default, not before', () => {
    timer.start();
    expect(advance(44 * MIN)).toBeNull();
    const ev = advance(1 * MIN);
    expect(ev).toMatchObject({ kind: 'gentle', canSnooze: true, snoozesUsed: 0 });
    expect(timer.state).toBe('reminding');
    // it doesn't fire again while the reminder is on screen
    expect(advance(10 * MIN)).toBeNull();
  });

  it('counts accurately with many small ticks', () => {
    timer.start();
    for (let i = 0; i < 45 * 60 - 1; i++) expect(advance(1000)).toBeNull();
    expect(advance(1000)).not.toBeNull();
  });

  it('allows "five more minutes" at most twice, then turns firm but still lets you continue', () => {
    timer.start();
    advance(45 * MIN);
    expect(timer.snooze()).toBe(true);
    expect(advance(4 * MIN)).toBeNull();
    expect(advance(1 * MIN)).toMatchObject({ kind: 'gentle', snoozesUsed: 1, canSnooze: true });
    expect(timer.snooze()).toBe(true);
    const firm = advance(5 * MIN);
    expect(firm).toMatchObject({ kind: 'firm', snoozesUsed: 2, canSnooze: false });
    expect(timer.snooze()).toBe(false); // no third snooze
    timer.continueAnyway();
    expect(timer.state).toBe('running');
    expect(advance(4 * MIN)).toBeNull();
    expect(advance(1 * MIN)).toMatchObject({ kind: 'firm' }); // comes back, still firm
  });

  it('keeps counting while the in-game pause menu is open (the family is still at the screen)', () => {
    timer.start();
    // (the pause menu does not call pause(); only backgrounding does)
    expect(advance(45 * MIN)).not.toBeNull();
  });

  it('does not count time while the app is in the background', () => {
    timer.start();
    advance(30 * MIN);
    timer.pause();
    t += 8 * MIN; // backgrounded, shorter than a real break
    expect(timer.update()).toBeNull();
    expect(timer.resume()).toBe(false);
    expect(timer.elapsedMs).toBe(30 * MIN);
    expect(advance(14 * MIN)).toBeNull();
    expect(advance(1 * MIN)).not.toBeNull(); // 30 + 15 = 45 minutes of *active* play
  });

  it('starts a fresh session after a real break in the background', () => {
    timer.start();
    advance(40 * MIN);
    timer.pause();
    t += 12 * MIN;
    expect(timer.resume()).toBe(true);
    expect(timer.elapsedMs).toBe(0);
    expect(advance(44 * MIN)).toBeNull();
    expect(advance(1 * MIN)).not.toBeNull();
  });

  it('a long background while the reminder is showing also counts as a break', () => {
    timer.start();
    advance(45 * MIN);
    timer.pause();
    t += 20 * MIN;
    expect(timer.resume()).toBe(true);
    expect(timer.state).toBe('running');
    expect(timer.current).toBeNull();
  });

  it('pause/resume are safe to call repeatedly', () => {
    timer.start();
    advance(10 * MIN);
    timer.pause();
    timer.pause();
    t += MIN;
    timer.resume();
    timer.resume();
    advance(MIN);
    expect(timer.elapsedMs).toBe(11 * MIN);
  });

  it('"take a break" then coming straight back resumes the session and reminds again soon', () => {
    timer.start();
    advance(45 * MIN);
    timer.end();
    t += 2 * MIN; // back after only two minutes
    timer.start();
    expect(timer.elapsedMs).toBe(45 * MIN);
    expect(advance(4 * MIN)).toBeNull();
    expect(advance(1 * MIN)).not.toBeNull();
  });

  it('after a real break, starting again is a brand-new session', () => {
    timer.start();
    advance(45 * MIN);
    timer.snooze();
    timer.end();
    t += 30 * MIN;
    timer.start();
    expect(timer.elapsedMs).toBe(0);
    expect(timer.snoozes).toBe(0);
    expect(advance(45 * MIN)).toMatchObject({ kind: 'gentle', canSnooze: true });
  });

  it('respects the configured interval (15/30/45/60/90) and changes to it', () => {
    for (const m of [15, 30, 60, 90]) {
      t = 0;
      timer = new SessionTimer({ ...DEFAULT_TIMER, intervalMs: m * MIN }, () => t);
      timer.start();
      expect(advance(m * MIN - 1000)).toBeNull();
      expect(advance(1000)).not.toBeNull();
    }
    t = 0;
    timer = new SessionTimer(DEFAULT_TIMER, () => t);
    timer.start();
    advance(20 * MIN);
    timer.setInterval(15 * MIN); // already past the new interval -> reminds on next update
    expect(timer.update()).not.toBeNull();
  });

  it('fast-forward (debug) moves the session clock', () => {
    timer.start();
    timer.fastForward(45 * MIN);
    expect(timer.update()).not.toBeNull();
  });
});

describe('late-night nudge', () => {
  it('is late after 9 PM and before 5 AM (device clock)', () => {
    const at = (h: number, m = 0) => new Date(2026, 8, 28, h, m);
    expect(isLateNight(at(20, 59))).toBe(false);
    expect(isLateNight(at(21, 0))).toBe(true);
    expect(isLateNight(at(23, 30))).toBe(true);
    expect(isLateNight(at(2, 0))).toBe(true);
    expect(isLateNight(at(5, 0))).toBe(false);
    expect(isLateNight(at(14, 0))).toBe(false);
  });
});
