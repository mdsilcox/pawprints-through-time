import { Sequencer, type Song } from './music';
import { getSong } from './songs';
import { noiseBuffer, playDrum, playNote, midiToFreq } from './synth';
import type { Settings } from '../core/settings';

/**
 * The game's audio engine: master → (music bus, sfx bus) → compressor → speakers.
 * The AudioContext is created on the first user gesture (browser autoplay rules);
 * music requested before that starts as soon as audio unlocks.
 */
export type Sfx =
  | 'blip'
  | 'select'
  | 'back'
  | 'open'
  | 'close'
  | 'error'
  | 'success'
  | 'fanfare'
  | 'coin'
  | 'pickup'
  | 'sparkle'
  | 'chime'
  | 'bark'
  | 'dig'
  | 'hop'
  | 'join'
  | 'door'
  | 'portal'
  | 'splash'
  | 'bubble'
  | 'gulp'
  | 'step-grass'
  | 'step-sand'
  | 'step-wood'
  | 'step-stone'
  | 'roll'
  | 'pins'
  | 'strike'
  | 'cheer'
  | 'hit'
  | 'perfect'
  | 'miss'
  | 'clap'
  | 'hiccup'
  | 'sniff'
  | 'page'
  | 'squeak';

class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private seq: Sequencer | null = null;
  private wantedSong: string | null = null;
  current: string | null = null;
  private settings: Pick<Settings, 'masterVolume' | 'musicVolume' | 'sfxVolume' | 'muted'> = { masterVolume: 0.8, musicVolume: 0.6, sfxVolume: 0.8, muted: false };
  private lastSfx = new Map<string, number>();
  /** Count of sounds played (tests use this to verify sound hooks fire). */
  played: Record<string, number> = {};

  installUnlock(): void {
    const unlock = () => {
      this.ensure();
      if (this.ctx?.state === 'suspended') void this.ctx.resume();
    };
    for (const ev of ['pointerdown', 'keydown', 'touchstart', 'mousedown']) window.addEventListener(ev, unlock, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctx = new AC({ latencyHint: 'interactive' });
    } catch {
      return null;
    }
    const ctx = this.ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.connect(comp);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    noiseBuffer(ctx);
    this.applyLevels();
    if (this.wantedSong) {
      const w = this.wantedSong;
      this.wantedSong = null;
      this.music(w);
    }
    return ctx;
  }

  get unlocked(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  apply(s: Pick<Settings, 'masterVolume' | 'musicVolume' | 'sfxVolume' | 'muted'>): void {
    this.settings = { ...s };
    this.applyLevels();
  }

  private applyLevels(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const m = this.settings.muted ? 0 : this.settings.masterVolume;
    this.master.gain.setTargetAtTime(m, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.settings.musicVolume * 0.55, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfxVolume, t, 0.05);
  }

  // ---------------------------------------------------------------- music
  /** Crossfade to a song (no-op if it's already playing). */
  music(id: string | null, opts: { loops?: number; restart?: boolean } = {}): Sequencer | null {
    if (!id) {
      this.stopMusic();
      return null;
    }
    if (!this.ctx) {
      this.wantedSong = id;
      this.current = id;
      return null;
    }
    if (this.current === id && this.seq?.song && !opts.restart) return this.seq;
    const song = getSong(id);
    if (!song) return null;
    return this.playSong(song, opts);
  }

  playSong(song: Song, opts: { loops?: number; fadeIn?: number; at?: number } = {}): Sequencer | null {
    const ctx = this.ensure();
    if (!ctx) return null;
    this.seq?.stop(0.7);
    const seq = new Sequencer(ctx, this.musicBus);
    seq.play(song, { fadeIn: opts.fadeIn ?? 0.8, loops: opts.loops, at: opts.at });
    this.seq = seq;
    this.current = song.id;
    return seq;
  }

  stopMusic(fade = 0.6): void {
    this.seq?.stop(fade);
    this.seq = null;
    this.current = null;
    this.wantedSong = null;
  }

  get sequencer(): Sequencer | null {
    return this.seq;
  }

  get time(): number {
    return this.ctx?.currentTime ?? performance.now() / 1000;
  }

  // ---------------------------------------------------------------- sound effects
  sfx(name: Sfx, opts: { pitch?: number; vol?: number } = {}): void {
    this.played[name] = (this.played[name] ?? 0) + 1;
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    // avoid machine-gunning the same sound
    const now = ctx.currentTime;
    const last = this.lastSfx.get(name) ?? -1;
    if (now - last < 0.03) return;
    this.lastSfx.set(name, now);
    const out = this.sfxBus;
    const t = now + 0.005;
    const p = opts.pitch ?? 1;
    const v = opts.vol ?? 1;
    const tone = (midi: number, at: number, dur: number, inst: Parameters<typeof playNote>[2] = 'bell', vel = 0.7) => playNote(ctx, out, inst, midi, at, dur, vel * v);
    const beep = (f0: number, f1: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, at = t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0 * p, at);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * p), at + dur);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(vol * v, at + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g);
      g.connect(out);
      o.start(at);
      o.stop(at + dur + 0.02);
    };
    const hiss = (dur: number, type: BiquadFilterType, freq: number, vol: number, at = t, q = 1) => {
      const n = ctx.createBufferSource();
      n.buffer = noiseBuffer(ctx);
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(vol * v, at + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      n.connect(f);
      f.connect(g);
      g.connect(out);
      n.start(at, Math.random() * 0.8);
      n.stop(at + dur + 0.02);
    };
    switch (name) {
      case 'blip':
        beep(880, 990, 0.05, 'sine', 0.12);
        break;
      case 'select':
        beep(660, 990, 0.08, 'triangle', 0.16);
        beep(990, 1320, 0.08, 'triangle', 0.12, t + 0.06);
        break;
      case 'back':
        beep(700, 440, 0.1, 'triangle', 0.14);
        break;
      case 'open':
        beep(520, 780, 0.12, 'sine', 0.14);
        break;
      case 'close':
        beep(780, 520, 0.12, 'sine', 0.12);
        break;
      case 'error':
        beep(300, 240, 0.16, 'triangle', 0.14);
        break;
      case 'page':
        hiss(0.12, 'bandpass', 2500, 0.12, t, 0.8);
        break;
      case 'success':
        [72, 76, 79, 84].forEach((m, i) => tone(m, t + i * 0.08, 0.2, 'bell', 0.6));
        break;
      case 'fanfare':
        [67, 72, 76, 79].forEach((m, i) => tone(m, t + i * 0.1, 0.25, 'brass', 0.5));
        tone(84, t + 0.42, 0.6, 'brass', 0.6);
        tone(79, t + 0.42, 0.6, 'bell', 0.5);
        break;
      case 'coin':
        beep(988, 988, 0.06, 'square', 0.06);
        beep(1319, 1319, 0.18, 'square', 0.06, t + 0.06);
        break;
      case 'pickup':
        beep(600, 1200, 0.12, 'sine', 0.16);
        tone(84, t + 0.06, 0.2, 'bell', 0.4);
        break;
      case 'sparkle':
        [88, 91, 96, 100].forEach((m, i) => tone(m, t + i * 0.05, 0.1, 'bell', 0.35));
        break;
      case 'chime': // Pip's fairy chime
        [84, 88, 91, 96, 91].forEach((m, i) => tone(m, t + i * 0.07, 0.3, 'bell', 0.35));
        break;
      case 'bark': {
        // a happy two-woof corgi bark: formant-filtered pitch sweeps
        for (const [at, f] of [
          [0, 560],
          [0.17, 640],
        ] as const) {
          const o = ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(f * 0.8 * p, t + at);
          o.frequency.linearRampToValueAtTime(f * 1.35 * p, t + at + 0.03);
          o.frequency.exponentialRampToValueAtTime(f * 0.7 * p, t + at + 0.11);
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 1300;
          bp.Q.value = 2.5;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t + at);
          g.gain.linearRampToValueAtTime(0.5 * v, t + at + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.12);
          o.connect(bp);
          bp.connect(g);
          g.connect(out);
          o.start(t + at);
          o.stop(t + at + 0.15);
          hiss(0.05, 'bandpass', 2400, 0.12, t + at, 2);
        }
        break;
      }
      case 'sniff':
        hiss(0.07, 'bandpass', 3000, 0.1, t, 3);
        hiss(0.07, 'bandpass', 3200, 0.1, t + 0.1, 3);
        hiss(0.09, 'bandpass', 2800, 0.12, t + 0.2, 3);
        break;
      case 'dig':
        for (let i = 0; i < 4; i++) hiss(0.08, 'bandpass', 900 + i * 200, 0.2, t + i * 0.09, 1.5);
        break;
      case 'hop':
        beep(300, 700, 0.14, 'sine', 0.18);
        break;
      case 'squeak':
        beep(1200, 1800, 0.08, 'sine', 0.12);
        break;
      case 'join':
        [72, 79, 84].forEach((m, i) => tone(m, t + i * 0.07, 0.2, 'marimba', 0.7));
        break;
      case 'door':
        beep(180, 120, 0.15, 'triangle', 0.2);
        hiss(0.1, 'lowpass', 800, 0.1);
        break;
      case 'portal': {
        const n = ctx.createBufferSource();
        n.buffer = noiseBuffer(ctx);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.Q.value = 6;
        f.frequency.setValueAtTime(300, t);
        f.frequency.exponentialRampToValueAtTime(4000, t + 1.1);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.35 * v, t + 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
        n.connect(f);
        f.connect(g);
        g.connect(out);
        n.start(t);
        n.stop(t + 1.4);
        [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => tone(m, t + 0.2 + i * 0.09, 0.3, 'bell', 0.3));
        break;
      }
      case 'splash':
        hiss(0.35, 'lowpass', 1800, 0.25);
        break;
      case 'bubble':
        for (let i = 0; i < 3; i++) beep(300 + Math.random() * 300, 900 + Math.random() * 400, 0.07, 'sine', 0.12, t + i * 0.07);
        break;
      case 'gulp':
        beep(400, 180, 0.12, 'sine', 0.2);
        beep(380, 160, 0.12, 'sine', 0.18, t + 0.16);
        break;
      case 'hiccup':
        beep(500, 1100, 0.07, 'sine', 0.18);
        break;
      case 'step-grass':
        hiss(0.05, 'lowpass', 1200, 0.07);
        break;
      case 'step-sand':
        hiss(0.07, 'bandpass', 2400, 0.06, t, 0.8);
        break;
      case 'step-wood':
        beep(260, 200, 0.05, 'triangle', 0.08);
        hiss(0.03, 'bandpass', 1500, 0.04);
        break;
      case 'step-stone':
        hiss(0.03, 'highpass', 3000, 0.06);
        beep(900, 700, 0.02, 'sine', 0.03);
        break;
      case 'roll':
        hiss(0.5, 'lowpass', 300, 0.25);
        break;
      case 'pins':
        for (let i = 0; i < 7; i++) {
          const at = t + Math.random() * 0.25;
          beep(900 + Math.random() * 900, 500 + Math.random() * 300, 0.07, 'triangle', 0.1, at);
          hiss(0.06, 'bandpass', 2000 + Math.random() * 2000, 0.1, at, 2);
        }
        break;
      case 'strike':
        playDrum(ctx, out, 'openhat', t, 0.6);
        [72, 76, 79, 84, 88].forEach((m, i) => tone(m, t + 0.05 + i * 0.06, 0.25, 'brass', 0.45));
        break;
      case 'cheer':
        for (let i = 0; i < 6; i++) hiss(0.25, 'bandpass', 1400 + i * 300, 0.07, t + i * 0.03, 3);
        [79, 84].forEach((m, i) => tone(m, t + i * 0.12, 0.25, 'bell', 0.35));
        break;
      case 'hit':
        tone(84, t, 0.08, 'marimba', 0.45);
        break;
      case 'perfect':
        tone(88, t, 0.1, 'bell', 0.45);
        tone(91, t + 0.05, 0.1, 'bell', 0.35);
        break;
      case 'miss':
        beep(220, 170, 0.1, 'triangle', 0.08);
        break;
      case 'clap':
        playDrum(ctx, out, 'clap', t, 0.7);
        break;
    }
  }

  /** Dialogue voice blip with a per-character pitch (midi). */
  voice(midi: number, kind: 'soft' | 'squeak' | 'deep' | 'chime' = 'soft'): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.003;
    const f = midiToFreq(midi + (Math.random() * 2 - 1));
    const o = ctx.createOscillator();
    o.type = kind === 'deep' ? 'triangle' : kind === 'chime' ? 'sine' : 'square';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * (kind === 'squeak' ? 1.25 : 1.06), t + 0.05);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = kind === 'chime' ? 6000 : 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(kind === 'soft' ? 0.05 : 0.07, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(lp);
    lp.connect(g);
    g.connect(this.sfxBus);
    o.start(t);
    o.stop(t + 0.07);
    this.played.voice = (this.played.voice ?? 0) + 1;
  }
}

export const audio = new AudioEngine();
