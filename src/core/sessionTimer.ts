/**
 * Playtime reminder logic (pure, clock-injected, unit-tested).
 *
 * - Counts *active* play time for the whole household (shared by both players).
 * - The in-game pause menu does NOT stop the count: the family is still in front of the screen.
 * - Backgrounding the app (tab hidden / phone locked) pauses the count; coming back after a real
 *   break (>= breakResetMs) starts a fresh session.
 * - First reminder at `intervalMs` (45 min default). "Five more minutes" snoozes up to `maxSnoozes`
 *   times; after that the reminder turns firm but still lets players continue (it returns every
 *   `firmRepeatMs`).
 * - Taking a break ends the session; if play resumes before the break was long enough, the
 *   session continues (and the reminder comes back soon) so the reminder can't be dodged.
 */

export type ReminderKind = 'gentle' | 'firm';

export interface TimerConfig {
  intervalMs: number;
  snoozeMs: number;
  maxSnoozes: number;
  firmRepeatMs: number;
  breakResetMs: number;
}

export const DEFAULT_TIMER: TimerConfig = {
  intervalMs: 45 * 60_000,
  snoozeMs: 5 * 60_000,
  maxSnoozes: 2,
  firmRepeatMs: 5 * 60_000,
  breakResetMs: 10 * 60_000,
};

export type TimerState = 'idle' | 'running' | 'paused' | 'reminding';

export interface ReminderEvent {
  kind: ReminderKind;
  snoozesUsed: number;
  canSnooze: boolean;
  elapsedMs: number;
}

export class SessionTimer {
  state: TimerState = 'idle';
  /** active play time in this session */
  elapsedMs = 0;
  snoozes = 0;
  nextAt: number;
  private lastTick = 0;
  private pausedAt: number | null = null;
  private endedAt: number | null = null;
  private pending: ReminderEvent | null = null;

  constructor(
    public cfg: TimerConfig = DEFAULT_TIMER,
    private now: () => number = () => Date.now(),
  ) {
    this.nextAt = cfg.intervalMs;
  }

  /** Play begins (new game, continue...). Resumes the previous session if the break was short. */
  start(): void {
    const t = this.now();
    const shortBreak = this.endedAt !== null && t - this.endedAt < this.cfg.breakResetMs && this.elapsedMs > 0;
    if (!shortBreak) this.reset();
    else if (this.elapsedMs >= this.nextAt) {
      // They came straight back after "take a break": remind again soon rather than never.
      this.nextAt = this.elapsedMs + this.cfg.snoozeMs;
    }
    this.endedAt = null;
    this.pausedAt = null;
    this.state = 'running';
    this.lastTick = t;
  }

  private reset(): void {
    this.elapsedMs = 0;
    this.snoozes = 0;
    this.nextAt = this.cfg.intervalMs;
    this.pending = null;
  }

  /** App backgrounded (tab hidden, phone locked). */
  pause(): void {
    if (this.pausedAt !== null) return;
    if (this.state === 'running') {
      this.accumulate();
      this.state = 'paused';
      this.pausedAt = this.now();
    } else if (this.state === 'reminding') {
      this.pausedAt = this.now(); // the reminder stays up; only the time away is measured
    }
  }

  /** App visible again. Returns true if the time away counted as a real break (fresh session). */
  resume(): boolean {
    if (this.pausedAt === null) return false;
    const away = this.now() - this.pausedAt;
    this.pausedAt = null;
    this.lastTick = this.now();
    if (away >= this.cfg.breakResetMs) {
      this.reset();
      this.state = 'running';
      return true;
    }
    if (this.state === 'paused') this.state = 'running';
    return false;
  }

  /** Players chose "Take a break": session ends (a quick return continues it, see start()). */
  end(): void {
    this.accumulate();
    this.state = 'idle';
    this.endedAt = this.now();
    this.pending = null;
  }

  private accumulate(): void {
    const t = this.now();
    if (this.state === 'running' && this.pausedAt === null) this.elapsedMs += Math.max(0, t - this.lastTick);
    this.lastTick = t;
  }

  /** Call regularly (e.g. every second). Returns a reminder event when one is due. */
  update(): ReminderEvent | null {
    if (this.state !== 'running') return null;
    this.accumulate();
    if (this.elapsedMs >= this.nextAt) {
      this.state = 'reminding';
      const firm = this.snoozes >= this.cfg.maxSnoozes;
      this.pending = { kind: firm ? 'firm' : 'gentle', snoozesUsed: this.snoozes, canSnooze: !firm, elapsedMs: this.elapsedMs };
      return this.pending;
    }
    return null;
  }

  get current(): ReminderEvent | null {
    return this.state === 'reminding' ? this.pending : null;
  }

  /** "Five more minutes" (gentle) — only allowed maxSnoozes times. */
  snooze(): boolean {
    if (this.state !== 'reminding' || this.snoozes >= this.cfg.maxSnoozes) return false;
    this.snoozes++;
    this.nextAt = this.elapsedMs + this.cfg.snoozeMs;
    this.state = 'running';
    this.lastTick = this.now();
    this.pending = null;
    return true;
  }

  /** "Keep playing" after the firm reminder — allowed, but it will come back. */
  continueAnyway(): void {
    if (this.state !== 'reminding') return;
    this.nextAt = this.elapsedMs + this.cfg.firmRepeatMs;
    this.state = 'running';
    this.lastTick = this.now();
    this.pending = null;
  }

  /** Settings changed the interval. Applies to the next (un-snoozed) reminder. */
  setInterval(ms: number): void {
    this.cfg = { ...this.cfg, intervalMs: ms };
    if (this.snoozes === 0 && this.state !== 'reminding') this.nextAt = ms;
  }

  /** Debug / tests: pretend time has passed while playing. */
  fastForward(ms: number): void {
    if (this.state === 'running') this.elapsedMs += ms;
  }

  get remainingMs(): number {
    return Math.max(0, this.nextAt - this.elapsedMs);
  }
}

/** Device-clock late-night check: after 9 PM (and before 5 AM). */
export function isLateNight(d: Date): boolean {
  const h = d.getHours();
  return h >= 21 || h < 5;
}
