import { app } from '../app';
import { audio } from '../audio/audio';
import { TEXT_SPEED_CPS } from '../core/settings';
import { character } from '../data/characters';
import { input } from '../input/input';
import { h, clear } from './dom';
import { portraitUrl } from './portraits';
import { ui, type Screen } from './ui';
import { Cancelled, sessionEpoch } from '../core/session';

/**
 * Dialogue box with portrait, name tag and type-on text (tap / action to skip, again to advance).
 * Story code is plain async functions:
 *   await talk('pip', ['Hello!', 'Welcome to Tockwood.']);
 *   const pick = await ask('pip', 'Will you help?', ['Of course!', 'Tell me more']);
 * Consecutive lines inside `conversation()` share one open box.
 */

type LineFilter = (who: string, text: string) => string;
const filters: LineFilter[] = [];
/** e.g. Whisker Bisque translates animal speech. */
export function addLineFilter(f: LineFilter): () => void {
  filters.push(f);
  return () => {
    const i = filters.indexOf(f);
    if (i >= 0) filters.splice(i, 1);
  };
}

export function fmt(text: string): string {
  const d = app.data;
  const p1 = d?.players[0].name ?? 'friend';
  const p2 = d?.players[1].name ?? 'friend';
  const both = input.twoPlayer ? `${p1} and ${p2}` : p1;
  return text
    .replace(/\{p1\}/g, p1)
    .replace(/\{p2\}/g, p2)
    .replace(/\{players\}/g, both)
    .replace(/\{you\}/g, input.twoPlayer ? 'you two' : 'you')
    .replace(/\{You\}/g, input.twoPlayer ? 'You two' : 'You');
}

class DialogueBox {
  private screen: Screen | null = null;
  private box!: HTMLElement;
  private portrait!: HTMLImageElement;
  private portraitWrap!: HTMLElement;
  private name!: HTMLElement;
  private text!: HTMLElement;
  private next!: HTMLElement;
  private choices!: HTMLElement;
  private advance: (() => void) | null = null;
  private typing = false;
  private full = '';
  private raf = 0;
  private depth = 0;
  private typeDone: (() => void) | null = null;
  /** rejects whatever the current script is waiting on (typing, the next press, a choice) */
  private cancel: ((err: Error) => void) | null = null;
  /** lines shown since boot (tests) */
  shown: { who: string; text: string }[] = [];

  get isOpen(): boolean {
    return !!this.screen;
  }

  open(): void {
    // a stale reference (screen removed behind our back) must not block new conversations
    if (this.screen && !ui.has('dialogue')) this.screen = null;
    if (this.screen) return;
    this.portrait = h('img', { class: 'dlg-portrait', attrs: { alt: '' } });
    this.portraitWrap = h('div', { class: 'dlg-portrait-wrap' }, this.portrait);
    this.name = h('div', { class: 'dlg-name' });
    this.text = h('div', { class: 'dlg-text', attrs: { 'aria-live': 'polite', 'data-testid': 'dialogue-text' } });
    this.next = h('div', { class: 'dlg-next', attrs: { 'aria-hidden': 'true' } }, '▼');
    this.choices = h('div', { class: 'dlg-choices' });
    this.box = h('div', { class: 'dlg-box', attrs: { 'data-testid': 'dialogue' } }, this.portraitWrap, h('div', { class: 'dlg-body' }, this.name, this.text, this.next));
    // tap anywhere to skip / continue (choice buttons stop the click themselves)
    const el = h('div', { class: 'dlg-screen', onclick: () => this.press() }, this.choices, this.box);
    this.screen = ui.push({
      id: 'dialogue',
      el,
      dim: false,
      onConfirm: () => {
        if (this.choices.childElementCount) return false; // let focus navigation pick a choice
        this.press();
        return true;
      },
      onBack: () => {
        if (!this.choices.childElementCount) this.press();
      },
    });
  }

  close(): void {
    cancelAnimationFrame(this.raf);
    if (this.screen) ui.pop('dialogue');
    this.screen = null;
    this.advance = null;
  }

  /**
   * Forget everything (used when leaving play, e.g. Pip's "Take a break"). Any script that was
   * mid-conversation is abandoned; the next conversation starts from a clean box.
   */
  reset(): void {
    cancelAnimationFrame(this.raf);
    if (ui.has('dialogue')) ui.pop('dialogue');
    this.screen = null;
    this.advance = null;
    this.typeDone = null;
    this.typing = false;
    this.depth = 0;
    const cancel = this.cancel;
    this.cancel = null;
    cancel?.(new Cancelled());
  }

  private press(): void {
    if (ui.locked && !this.typing) return;
    if (this.typing) {
      this.finishTyping();
      return;
    }
    if (this.choices.childElementCount) return;
    const a = this.advance;
    this.advance = null;
    a?.();
  }

  private setSpeaker(who: string): void {
    const def = character(who);
    const isPlayer = def.art === 'player';
    const name = isPlayer ? (app.data?.players[who === 'p2' ? 1 : 0].name ?? def.name) : def.name;
    this.name.textContent = name;
    this.name.style.background = def.color;
    this.name.classList.toggle('hidden', !name);
    const url = portraitUrl(who);
    this.portraitWrap.classList.toggle('hidden', !url);
    if (url && this.portrait.src !== url) this.portrait.src = url;
    this.box.classList.toggle('narration', def.art === 'narrator');
    this.portraitWrap.classList.remove('bounce');
    void this.portraitWrap.offsetWidth;
    this.portraitWrap.classList.add('bounce');
  }

  private type(who: string, text: string): Promise<void> {
    this.full = text;
    this.typing = true;
    this.next.classList.add('hidden');
    const cps = TEXT_SPEED_CPS[app.settings.textSpeed];
    const voice = character(who).voice;
    const start = performance.now();
    let shown = 0;
    clear(this.text);
    const node = document.createTextNode('');
    this.text.appendChild(node);
    this.text.dataset.full = text;
    return new Promise((resolve, reject) => {
      this.typeDone = resolve;
      this.cancel = reject;
      const step = () => {
        if (!this.typing) {
          resolve();
          return;
        }
        const n = Math.min(text.length, Math.floor(((performance.now() - start) / 1000) * cps) + 1);
        if (n > shown) {
          for (let i = shown; i < n; i++) if (i % 2 === 0 && /[a-z0-9]/i.test(text[i])) audio.voice(voice.midi, voice.kind);
          shown = n;
          node.textContent = text.slice(0, n);
        }
        if (n >= text.length) {
          this.finishTyping();
          resolve();
          return;
        }
        this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    });
  }

  private finishTyping(): void {
    cancelAnimationFrame(this.raf);
    this.typing = false;
    const done = this.typeDone;
    this.typeDone = null;
    done?.();
    clear(this.text);
    this.text.textContent = this.full;
    this.next.classList.toggle('hidden', !!this.choices.childElementCount);
    // A skip press shouldn't also count as "next" on the same frame.
    ui.lock(120);
  }

  async line(who: string, raw: string): Promise<void> {
    this.open();
    let text = fmt(raw);
    for (const f of filters) text = f(who, text);
    this.shown.push({ who, text });
    this.setSpeaker(who);
    clear(this.choices);
    await this.type(who, text);
    await new Promise<void>((resolve, reject) => {
      this.advance = resolve;
      this.cancel = reject;
    });
    this.cancel = null;
    audio.sfx('blip', { vol: 0.5 });
  }

  async choice(who: string, raw: string, options: string[]): Promise<number> {
    this.open();
    const text = fmt(raw);
    this.shown.push({ who, text });
    this.setSpeaker(who);
    clear(this.choices);
    await this.type(who, text);
    // (a long list — e.g. every dance you know — flows into a grid, so it never runs off a phone's screen)
    this.choices.classList.toggle('many', options.length >= 5);
    return new Promise<number>((resolve, reject) => {
      this.cancel = reject;
      options.forEach((opt, i) => {
        const b = h(
          'button',
          {
            class: 'btn dlg-choice',
            dataset: { nav: '' },
            attrs: { type: 'button', 'data-testid': `choice-${i}` },
            onclick: (e: Event) => {
              e.stopPropagation();
              if (ui.locked) return;
              clear(this.choices);
              audio.sfx('select');
              this.cancel = null;
              resolve(i);
            },
          },
          fmt(opt),
        );
        if (i === 0) b.dataset.autofocus = '';
        this.choices.appendChild(b);
      });
      this.next.classList.add('hidden');
      requestAnimationFrame(() => (this.choices.firstElementChild as HTMLElement | null)?.focus());
    });
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    this.depth++;
    const session = sessionEpoch();
    try {
      return await fn();
    } finally {
      // after a reset the box belongs to the new session: leave it alone
      if (session === sessionEpoch()) {
        this.depth--;
        if (this.depth === 0) this.close();
      }
    }
  }

  get inConversation(): boolean {
    return this.depth > 0;
  }
}

export const dialogue = new DialogueBox();

/** Say one or more lines as a character. */
export async function talk(who: string, lines: string | string[]): Promise<void> {
  // a script left over from a finished play session never talks over the title screen
  if (!app.playing) throw new Cancelled();
  const list = Array.isArray(lines) ? lines : [lines];
  const own = !dialogue.inConversation;
  const session = sessionEpoch();
  try {
    for (const l of list) await dialogue.line(who, l);
  } finally {
    if (own && session === sessionEpoch()) dialogue.close();
  }
}

/** Ask a question; resolves with the chosen option's index. */
export async function ask(who: string, question: string, options: string[]): Promise<number> {
  if (!app.playing) throw new Cancelled();
  const own = !dialogue.inConversation;
  const session = sessionEpoch();
  try {
    return await dialogue.choice(who, question, options);
  } finally {
    if (own && session === sessionEpoch()) dialogue.close();
  }
}

/** Keep one dialogue box open across several talk/ask calls. */
export function conversation<T>(fn: () => Promise<T>): Promise<T> {
  return dialogue.run(fn);
}
