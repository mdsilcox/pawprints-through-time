import { playDrum, playNote, type Drum, type Inst } from './synth';

/**
 * A tiny tracker: songs are lists of tracks with note/drum events on a step grid,
 * written with a compact string DSL, and played by a lookahead scheduler on the audio clock.
 */

export interface NoteEv {
  step: number;
  len: number;
  midi: number;
  vel: number;
}
export interface DrumEv {
  step: number;
  drum: Drum;
  vel: number;
}
export interface Track {
  name?: string;
  inst?: Inst;
  vol: number;
  notes?: NoteEv[];
  drums?: DrumEv[];
  /** the melody the dance game follows */
  lead?: boolean;
}
export interface Song {
  id: string;
  bpm: number;
  /** steps per beat (2 = eighth notes, 4 = sixteenths) */
  spb: number;
  beatsPerBar: number;
  bars: number;
  swing?: number;
  tracks: Track[];
}

const NOTE_BASE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteNum(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  let n = NOTE_BASE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  n += (parseInt(m[3], 10) + 1) * 12;
  return n;
}

/**
 * Melody string: one token per step. Note names ("C5", "F#4", "Bb3", chords "C4+E4+G4"),
 * "-" holds the previous note one more step, "." is a rest, "|" is a readable bar line (ignored).
 * A trailing "!" accents a note.
 */
export function mel(str: string, vel = 0.8, offset = 0): NoteEv[] {
  const out: NoteEv[] = [];
  let step = offset;
  let last: NoteEv[] = [];
  for (const tok of str.split(/\s+/)) {
    if (!tok || tok === '|') continue;
    if (tok === '-') {
      last.forEach((n) => n.len++);
    } else if (tok === '.') {
      last = [];
    } else {
      const accent = tok.endsWith('!');
      const names = (accent ? tok.slice(0, -1) : tok).split('+');
      last = names.map((nm) => ({ step, len: 1, midi: noteNum(nm), vel: accent ? Math.min(1, vel * 1.25) : vel }));
      out.push(...last);
    }
    step++;
  }
  return out;
}

/** Drum pattern: "x" hit, "X" accent, "o" ghost, "." rest; spaces and "|" ignored. */
export function beat(str: string, drum: Drum, vel = 0.7, bars = 1, stepsPerBar = 0): DrumEv[] {
  const chars = str.replace(/[\s|]/g, '').split('');
  const len = stepsPerBar || chars.length;
  const out: DrumEv[] = [];
  for (let b = 0; b < bars; b++)
    chars.forEach((c, i) => {
      const v = c === 'X' ? vel * 1.3 : c === 'x' ? vel : c === 'o' ? vel * 0.45 : 0;
      if (v > 0) out.push({ step: b * len + i, drum, vel: Math.min(1, v) });
    });
  return out;
}

const QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  dim: [0, 3, 6],
  sus4: [0, 5, 7],
  '6': [0, 4, 7, 9],
  aug: [0, 4, 8],
};

export function chordNotes(name: string, octave = 4): number[] {
  const m = /^([A-G])(#|b)?(.*)$/.exec(name);
  if (!m) throw new Error(`bad chord ${name}`);
  const root = NOTE_BASE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (octave + 1) * 12;
  const q = QUALITIES[m[3]] ?? QUALITIES[''];
  return q.map((i) => root + i);
}

export type CompStyle = 'pad' | 'arp' | 'stab' | 'strum' | 'waltz' | 'boogie' | 'offbeat';

/** Accompaniment from a chord list (each chord lasts `each` steps). */
export function comp(chords: string[], each: number, style: CompStyle, octave = 4, vel = 0.6): NoteEv[] {
  const out: NoteEv[] = [];
  chords.forEach((ch, ci) => {
    const base = ci * each;
    const notes = chordNotes(ch, octave);
    switch (style) {
      case 'pad':
        notes.forEach((midi) => out.push({ step: base, len: each, midi, vel }));
        break;
      case 'arp':
        for (let s = 0; s < each; s++) out.push({ step: base + s, len: 1, midi: notes[s % notes.length] + (Math.floor(s / notes.length) % 2) * 12, vel: vel * (s % 2 ? 0.8 : 1) });
        break;
      case 'stab':
        for (let s = 0; s < each; s += 2) notes.forEach((midi) => out.push({ step: base + s + 1, len: 1, midi, vel: vel * 0.8 }));
        break;
      case 'offbeat':
        for (let s = 1; s < each; s += 2) notes.forEach((midi) => out.push({ step: base + s, len: 1, midi, vel: vel * 0.8 }));
        break;
      case 'strum':
        notes.forEach((midi, k) => out.push({ step: base, len: Math.max(1, each / 2), midi, vel: vel * (1 - k * 0.08) }));
        notes.forEach((midi) => out.push({ step: base + each / 2, len: each / 2, midi, vel: vel * 0.7 }));
        break;
      case 'waltz': // "oom-pah-pah": skip beat 1 (bass takes it), chords on beats 2 and 3
        for (let s = each / 3; s < each; s += each / 3) notes.forEach((midi) => out.push({ step: base + s, len: each / 3, midi, vel: vel * 0.75 }));
        break;
      case 'boogie': {
        // rocking eighths: root+fifth / root+sixth
        const r = notes[0];
        for (let s = 0; s < each; s++) {
          const upper = s % 4 < 2 ? r + 7 : r + 9;
          out.push({ step: base + s, len: 1, midi: r, vel: vel * 0.7 });
          out.push({ step: base + s, len: 1, midi: upper, vel: vel * 0.7 });
        }
        break;
      }
    }
  });
  return out;
}

export type BassStyle = 'root' | 'rootfifth' | 'walk' | 'waltz' | 'octave' | 'pulse';

export function bassline(chords: string[], each: number, style: BassStyle, octave = 2, vel = 0.8): NoteEv[] {
  const out: NoteEv[] = [];
  chords.forEach((ch, ci) => {
    const base = ci * each;
    const [r, third, fifth] = chordNotes(ch, octave);
    const next = chordNotes(chords[(ci + 1) % chords.length], octave)[0];
    switch (style) {
      case 'root':
        out.push({ step: base, len: each, midi: r, vel });
        break;
      case 'rootfifth':
        out.push({ step: base, len: each / 2, midi: r, vel });
        out.push({ step: base + each / 2, len: each / 2, midi: fifth - 12 >= r - 7 ? fifth - 12 : fifth, vel: vel * 0.85 });
        break;
      case 'waltz':
        out.push({ step: base, len: each / 3, midi: r, vel });
        break;
      case 'octave':
        for (let s = 0; s < each; s += 2) out.push({ step: base + s, len: 1, midi: s % 4 === 0 ? r : r + 12, vel: vel * (s % 4 === 0 ? 1 : 0.8) });
        break;
      case 'pulse':
        for (let s = 0; s < each; s += 2) out.push({ step: base + s, len: 2, midi: r, vel: vel * (s === 0 ? 1 : 0.75) });
        break;
      case 'walk': {
        const q = each / 4;
        const approach = next + (next > r ? -1 : 1);
        [r, third, fifth, approach].forEach((m, i) => out.push({ step: base + i * q, len: q, midi: m, vel: vel * (i === 0 ? 1 : 0.85) }));
        break;
      }
    }
  });
  return out;
}

/** Repeat a list of events n times, each copy shifted by `len` steps. */
export function loop<T extends { step: number }>(evs: T[], times: number, len: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < times; i++) for (const e of evs) out.push({ ...e, step: e.step + i * len });
  return out;
}

export function songSteps(s: Song): number {
  return s.bars * s.beatsPerBar * s.spb;
}

export function stepDuration(s: Song): number {
  return 60 / s.bpm / s.spb;
}

/** Absolute time offset (seconds from song start) of a step, including swing. */
export function stepTime(s: Song, step: number): number {
  const d = stepDuration(s);
  const swing = s.swing ?? 0;
  return step * d + (step % 2 === 1 ? swing * d : 0);
}

// ------------------------------------------------------------------ scheduler
export class Sequencer {
  song: Song | null = null;
  startTime = 0;
  private nextStep = 0;
  private loops = 0;
  private maxLoops = Infinity;
  private byStep = new Map<number, { t: Track; n?: NoteEv; d?: DrumEv }[]>();
  private timer: ReturnType<typeof setInterval> | null = null;
  readonly gain: GainNode;
  onEnd: (() => void) | null = null;
  private pausedAt: number | null = null;

  constructor(
    private ctx: AudioContext,
    out: AudioNode,
  ) {
    this.gain = ctx.createGain();
    this.gain.connect(out);
  }

  play(song: Song, opts: { at?: number; fadeIn?: number; loops?: number } = {}): void {
    this.song = song;
    this.byStep.clear();
    for (const t of song.tracks) {
      for (const n of t.notes ?? []) {
        const arr = this.byStep.get(n.step) ?? [];
        arr.push({ t, n });
        this.byStep.set(n.step, arr);
      }
      for (const d of t.drums ?? []) {
        const arr = this.byStep.get(d.step) ?? [];
        arr.push({ t, d });
        this.byStep.set(d.step, arr);
      }
    }
    const now = this.ctx.currentTime;
    this.startTime = opts.at ?? now + 0.08;
    this.nextStep = 0;
    this.loops = 0;
    this.maxLoops = opts.loops ?? Infinity;
    const fade = opts.fadeIn ?? 0.5;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(fade > 0 ? 0.0001 : 1, now);
    if (fade > 0) this.gain.gain.linearRampToValueAtTime(1, now + fade);
    this.stopTimer();
    this.timer = setInterval(() => this.tick(), 25);
    this.tick();
  }

  private stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  stop(fadeOut = 0.5): void {
    this.stopTimer();
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0.0001, now + Math.max(0.02, fadeOut));
    this.song = null;
    setTimeout(() => this.gain.disconnect(), (fadeOut + 0.2) * 1000);
  }

  /** Pause playback (used when the game is paused mid-dance). */
  pause(): void {
    if (this.pausedAt !== null || !this.song) return;
    this.pausedAt = this.ctx.currentTime;
    this.stopTimer();
    this.gain.gain.setTargetAtTime(0.0001, this.pausedAt, 0.03);
  }

  resume(): void {
    if (this.pausedAt === null || !this.song) return;
    const now = this.ctx.currentTime;
    this.startTime += now - this.pausedAt;
    this.pausedAt = null;
    this.gain.gain.setTargetAtTime(1, now, 0.03);
    this.timer = setInterval(() => this.tick(), 25);
  }

  get paused(): boolean {
    return this.pausedAt !== null;
  }

  /** Seconds since the song started (continues across loops). */
  position(): number {
    const now = this.pausedAt ?? this.ctx.currentTime;
    return now - this.startTime;
  }

  private tick(): void {
    const s = this.song;
    if (!s) return;
    const total = songSteps(s);
    const loopLen = stepTime(s, total) - (s.swing ? 0 : 0);
    const horizon = this.ctx.currentTime + 0.14;
    for (;;) {
      const stepInLoop = this.nextStep % total;
      const loopIdx = Math.floor(this.nextStep / total);
      if (loopIdx >= this.maxLoops) {
        const endAt = this.startTime + loopIdx * loopLen;
        this.stopTimer();
        const cb = this.onEnd;
        setTimeout(() => cb?.(), Math.max(0, (endAt - this.ctx.currentTime) * 1000));
        return;
      }
      const t = this.startTime + loopIdx * loopLen + stepTime(s, stepInLoop);
      if (t > horizon) break;
      if (t >= this.ctx.currentTime - 0.05) {
        const d = stepDuration(s);
        for (const ev of this.byStep.get(stepInLoop) ?? []) {
          if (ev.n && ev.t.inst) playNote(this.ctx, this.gain, ev.t.inst, ev.n.midi, Math.max(t, this.ctx.currentTime), ev.n.len * d * 0.95, ev.n.vel * ev.t.vol);
          else if (ev.d) playDrum(this.ctx, this.gain, ev.d.drum, Math.max(t, this.ctx.currentTime), ev.d.vel * ev.t.vol);
        }
      }
      this.nextStep++;
      this.loops = loopIdx;
    }
  }
}
