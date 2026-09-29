import { app } from '../app';
import { audio } from '../audio/audio';
import { DEFAULT_TIMER, SessionTimer, isLateNight, type ReminderEvent } from '../core/sessionTimer';
import { returnToTitle } from '../flow';
import { storyBusy } from '../story/hooks';
import { input } from '../input/input';
import { renderPipPortrait } from '../art/fairy';
import { h } from './dom';
import { fmt } from './dialogue';
import { button, ui } from './ui';

/**
 * Pip's playtime reminder. Wires the pure SessionTimer to the game: starts when play begins,
 * pauses while the app is in the background, autosaves and shows Pip when it's break time.
 */
const MIN = 60_000;

const GENTLE = [
  'Even time fairies need a stretch! Let’s rest our eyes.',
  'Whew! We’ve been adventuring for a while. How about a wiggle-and-water break?',
  'My wings are a little wobbly! Shall we take a break and come back fresh?',
];
const AGAIN = [
  'Those five minutes flew by like a sparrow! Ready for that break now?',
  'Tick-tock! Five more minutes are up. A little rest would feel lovely.',
];
const FIRM =
  'We’ve been playing for a long, long time. Pip really, truly thinks it’s break time now — your eyes, legs and tummy will say thank you! Biscuit promises to guard your spot.';
const LATE = 'The stars are out and the moon is yawning… It’s getting late! How about we finish up soon and get cozy?';

class ReminderController {
  timer = new SessionTimer({ ...DEFAULT_TIMER }, () => Date.now());
  private lateShown = false;
  private showing: 'reminder' | 'late' | 'goodbye' | null = null;
  /** for tests: how many times each kind was shown */
  count = { gentle: 0, firm: 0, late: 0 };
  /** override the device clock (tests) */
  clock: () => Date = () => new Date();

  install(): void {
    this.timer.setInterval(app.settings.reminderMinutes * MIN);
    app.events.on('settings', (s) => this.timer.setInterval(s.reminderMinutes * MIN));
    app.events.on('play-start', () => {
      this.playStartAt = Date.now();
      this.timer.start();
    });
    app.events.on('play-end', () => this.timer.end());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.timer.pause();
      else if (this.timer.resume()) {
        // They had a real break: fresh session, nothing to nag about.
        if (this.showing === 'reminder' || this.showing === 'late') this.close();
        this.lateShown = false;
      }
    });
    setInterval(() => this.check(), 1000);
  }

  get isShowing(): string | null {
    return this.showing;
  }

  private deferredSince = 0;
  private playStartAt = 0;

  /**
   * Dialogue, cutscenes, storybooks and running story scripts finish first (up to a minute) —
   * Pip never interrupts a story beat. The first few seconds of play are also left alone, so a
   * scene that starts as you arrive (the ferry landing) gets going before Pip could pop in.
   */
  private busyMoment(): boolean {
    const settling = Date.now() - this.playStartAt < 3000;
    const busy = settling || ['dialogue', 'cutscene', 'intro', 'storybook', 'names'].some((id) => ui.has(id)) || storyBusy() || app.busy;
    if (!busy) {
      this.deferredSince = 0;
      return false;
    }
    if (!this.deferredSince) this.deferredSince = Date.now();
    return Date.now() - this.deferredSince < 60_000;
  }

  check(): void {
    if (!app.playing || this.showing) return;
    if (this.busyMoment()) return;
    const ev = this.timer.update();
    if (ev) {
      this.show(ev);
      return;
    }
    // Automated tests pin the device hour so results don't depend on when they run.
    const testHour = (window as unknown as { __testDeviceHour?: number }).__testDeviceHour;
    const now = testHour !== undefined ? new Date(2026, 0, 1, testHour) : this.clock();
    if (!this.lateShown && app.settings.lateNightNudge && isLateNight(now) && this.timer.state === 'running') {
      this.lateShown = true;
      this.showLate();
    }
  }

  fastForward(ms: number): void {
    this.timer.fastForward(ms);
    this.check();
  }

  private async show(ev: ReminderEvent): Promise<void> {
    this.count[ev.kind]++;
    void app.saveNow(); // the game autosaves whenever Pip pops in
    const firm = ev.kind === 'firm';
    const message = firm ? FIRM : ev.snoozesUsed === 0 ? GENTLE[Math.floor(Math.random() * GENTLE.length)] : AGAIN[(ev.snoozesUsed - 1) % AGAIN.length];
    const left = this.timer.cfg.maxSnoozes - ev.snoozesUsed;
    const buttons = firm
      ? [
          button('Take a break', () => this.takeBreak(), { icon: '🌙', cls: 'big', autofocus: true, testid: 'reminder-break' }),
          button('Keep playing', () => this.keepPlaying(), { cls: 'secondary small-btn', testid: 'reminder-continue' }),
        ]
      : [
          button('Take a break', () => this.takeBreak(), { icon: '🌙', autofocus: true, testid: 'reminder-break' }),
          button(`Five more minutes (${left} left)`, () => this.snooze(), { icon: '⏳', cls: 'secondary', testid: 'reminder-snooze' }),
        ];
    this.open('reminder', firm ? 'Time for a real break' : 'Break time?', message, buttons, firm);
  }

  private showLate(): void {
    this.count.late++;
    void app.saveNow();
    this.open('late', 'It’s getting late', LATE, [
      button('Say goodnight', () => this.takeBreak(), { icon: '🌙', autofocus: true, testid: 'reminder-break' }),
      button('Just a little longer', () => this.close(), { cls: 'secondary', testid: 'reminder-continue' }),
    ]);
  }

  /** debug/test hooks */
  forceLate(): void {
    if (this.showing) return;
    this.lateShown = true;
    this.showLate();
  }

  private open(kind: 'reminder' | 'late', title: string, message: string, buttons: HTMLElement[], firm = false): void {
    this.showing = kind;
    audio.sfx('chime');
    audio.sequencer?.pause();
    app.events.emit('reminder', true);
    const pip = renderPipPortrait(200, false);
    pip.classList.add('reminder-pip');
    const el = h(
      'div',
      { class: `reminder-screen ${firm ? 'firm' : ''}`, attrs: { 'data-testid': 'reminder', 'data-kind': kind } },
      h('div', { class: 'reminder-stars', attrs: { 'aria-hidden': 'true' } }),
      h(
        'div',
        { class: 'reminder-card' },
        h('div', { class: 'reminder-pip-wrap' }, pip),
        h('div', { class: 'reminder-bubble' }, h('h2', null, title), h('p', { class: 'reminder-text' }, fmt(message))),
        h('div', { class: 'reminder-buttons' }, buttons),
      ),
    );
    ui.push({ id: 'reminder', el, onBack: () => undefined }, ui.topLayer);
    // a child mashing the action button can't pick an answer without seeing Pip first
    ui.lock(1000);
  }

  private close(): void {
    ui.pop('reminder');
    this.showing = null;
    audio.sequencer?.resume();
    app.events.emit('reminder', false);
  }

  snooze(): void {
    if (this.timer.snooze()) this.close();
  }

  keepPlaying(): void {
    this.timer.continueAnyway();
    this.close();
  }

  async takeBreak(): Promise<void> {
    ui.pop('reminder');
    this.showing = 'goodbye';
    await app.saveNow();
    this.timer.end();
    const names = fmt('{players}');
    const done = async () => {
      ui.pop('goodbye');
      this.showing = null;
      app.events.emit('reminder', false);
      await returnToTitle('break');
    };
    const pip = renderPipPortrait(160, true);
    pip.classList.add('reminder-pip');
    const el = h(
      'div',
      { class: 'reminder-screen goodbye', attrs: { 'data-testid': 'goodbye' } },
      h('div', { class: 'reminder-stars', attrs: { 'aria-hidden': 'true' } }),
      h(
        'div',
        { class: 'reminder-card' },
        h('div', { class: 'reminder-pip-wrap' }, pip),
        h(
          'div',
          { class: 'reminder-bubble' },
          h('h2', null, `See you soon, ${names}!`),
          h('p', null, input.twoPlayer ? 'Your adventure is saved. Biscuit will keep your spots warm!' : 'Your adventure is saved. Biscuit will keep your spot warm!'),
          h('ul', { class: 'break-ideas' }, h('li', null, '🧃 Have a drink of water'), h('li', null, '🙆 Stretch up to the sky'), h('li', null, '👀 Look out of a window for a bit')),
        ),
        h('div', { class: 'reminder-buttons' }, button('Bye for now!', () => void done(), { icon: '👋', autofocus: true, testid: 'goodbye-ok' })),
      ),
    );
    ui.push({ id: 'goodbye', el, onBack: () => void done() }, ui.topLayer);
  }
}

export const reminder = new ReminderController();
