/**
 * Synthesized instruments and drums (Web Audio only — no samples).
 * Every voice is a tiny graph (oscillators/noise → filter → envelope) that cleans itself up.
 */

export type Inst =
  | 'bell'
  | 'marimba'
  | 'pluck'
  | 'lute'
  | 'oud'
  | 'piano'
  | 'flute'
  | 'recorder'
  | 'ney'
  | 'fiddle'
  | 'accordion'
  | 'organ'
  | 'bass'
  | 'pad'
  | 'brass'
  | 'sax';

export type Drum = 'kick' | 'snare' | 'hat' | 'openhat' | 'clap' | 'shaker' | 'doum' | 'tek' | 'wood' | 'stomp' | 'tamb' | 'tick' | 'cowbell';

export function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

let noiseBuf: AudioBuffer | null = null;
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const len = ctx.sampleRate;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let seed = 12345;
  for (let i = 0; i < len; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    d[i] = (seed / 0x7fffffff) * 2 - 1;
  }
  return noiseBuf;
}

function env(ctx: BaseAudioContext, dest: AudioNode, t: number, a: number, peak: number, d: number, sustain: number, hold: number, r: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sustain), t + a + d);
  const end = t + Math.max(a + d, hold);
  g.gain.setValueAtTime(Math.max(0.0001, peak * sustain), end);
  g.gain.exponentialRampToValueAtTime(0.0001, end + r);
  g.connect(dest);
  return g;
}

function osc(ctx: BaseAudioContext, type: OscillatorType, f: number, dest: AudioNode, t0: number, t1: number, detune = 0): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (detune) o.detune.setValueAtTime(detune, t0);
  o.connect(dest);
  o.start(t0);
  o.stop(t1);
  return o;
}

function vibrato(ctx: BaseAudioContext, o: OscillatorNode, t0: number, t1: number, rate: number, depthHz: number, delay = 0.12) {
  const lfo = ctx.createOscillator();
  const lg = ctx.createGain();
  lfo.frequency.value = rate;
  lg.gain.setValueAtTime(0, t0);
  lg.gain.linearRampToValueAtTime(depthHz, t0 + delay + 0.1);
  lfo.connect(lg);
  lg.connect(o.frequency);
  lfo.start(t0);
  lfo.stop(t1);
}

/** Play one pitched note. `dur` = held length in seconds. */
export function playNote(ctx: BaseAudioContext, dest: AudioNode, inst: Inst, midi: number, t: number, dur: number, vel = 0.8): void {
  const f = midiToFreq(midi);
  const v = vel;
  switch (inst) {
    case 'bell': {
      const g = env(ctx, dest, t, 0.004, 0.32 * v, 1.3, 0.001, 0, 0.05);
      osc(ctx, 'sine', f, g, t, t + 1.5);
      const g2 = env(ctx, dest, t, 0.002, 0.09 * v, 0.5, 0.001, 0, 0.05);
      osc(ctx, 'sine', f * 3.01, g2, t, t + 0.6);
      const g3 = env(ctx, dest, t, 0.004, 0.12 * v, 0.9, 0.001, 0, 0.05);
      osc(ctx, 'triangle', f * 2, g3, t, t + 1);
      break;
    }
    case 'marimba': {
      const g = env(ctx, dest, t, 0.003, 0.38 * v, 0.55, 0.001, 0, 0.05);
      osc(ctx, 'sine', f, g, t, t + 0.7);
      const g2 = env(ctx, dest, t, 0.001, 0.12 * v, 0.07, 0.001, 0, 0.02);
      osc(ctx, 'sine', f * 4, g2, t, t + 0.12);
      break;
    }
    case 'pluck':
    case 'lute':
    case 'oud': {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      const bright = inst === 'oud' ? 3200 : inst === 'lute' ? 2200 : 2800;
      lp.frequency.setValueAtTime(bright, t);
      lp.frequency.exponentialRampToValueAtTime(500, t + 0.35);
      lp.Q.value = 2;
      const g = env(ctx, dest, t, 0.003, 0.3 * v, inst === 'lute' ? 0.9 : 0.7, 0.001, 0, 0.05);
      lp.connect(g);
      const o = osc(ctx, inst === 'lute' ? 'triangle' : 'sawtooth', f, lp, t, t + 1.1);
      if (inst === 'oud') {
        o.frequency.setValueAtTime(f * 1.02, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      }
      break;
    }
    case 'piano': {
      const g = env(ctx, dest, t, 0.004, 0.28 * v, Math.max(0.5, dur * 1.4), 0.001, 0, 0.1);
      osc(ctx, 'triangle', f, g, t, t + dur * 1.5 + 0.6);
      const g2 = env(ctx, dest, t, 0.003, 0.08 * v, 0.4, 0.001, 0, 0.05);
      osc(ctx, 'sine', f * 2, g2, t, t + 0.5);
      const g3 = env(ctx, dest, t, 0.001, 0.05 * v, 0.05, 0.001, 0, 0.02);
      osc(ctx, 'square', f * 4, g3, t, t + 0.08);
      break;
    }
    case 'flute':
    case 'recorder':
    case 'ney': {
      const g = env(ctx, dest, t, inst === 'ney' ? 0.1 : 0.05, 0.22 * v, 0.1, 0.8, dur, 0.12);
      const o = osc(ctx, 'sine', f, g, t, t + dur + 0.3);
      vibrato(ctx, o, t, t + dur + 0.3, inst === 'ney' ? 4.5 : 5.5, f * 0.006);
      if (inst === 'recorder') {
        const g2 = env(ctx, dest, t, 0.05, 0.05 * v, 0.1, 0.8, dur, 0.1);
        osc(ctx, 'triangle', f * 2, g2, t, t + dur + 0.3);
      }
      // breath
      const n = ctx.createBufferSource();
      n.buffer = noiseBuffer(ctx);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f * 2;
      bp.Q.value = 4;
      const ng = env(ctx, dest, t, 0.03, (inst === 'ney' ? 0.07 : 0.03) * v, 0.15, 0.3, dur, 0.1);
      n.connect(bp);
      bp.connect(ng);
      n.start(t, Math.random() * 0.5);
      n.stop(t + dur + 0.3);
      break;
    }
    case 'fiddle': {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2600;
      lp.Q.value = 1.5;
      const g = env(ctx, dest, t, 0.035, 0.16 * v, 0.1, 0.75, dur, 0.08);
      lp.connect(g);
      const o = osc(ctx, 'sawtooth', f, lp, t, t + dur + 0.2);
      vibrato(ctx, o, t, t + dur + 0.2, 6, f * 0.008, 0.08);
      break;
    }
    case 'accordion':
    case 'organ': {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = inst === 'accordion' ? 1900 : 2400;
      const g = env(ctx, dest, t, 0.025, (inst === 'accordion' ? 0.1 : 0.12) * v, 0.08, 0.85, dur, 0.08);
      lp.connect(g);
      if (inst === 'accordion') {
        osc(ctx, 'square', f, lp, t, t + dur + 0.2, -6);
        osc(ctx, 'square', f, lp, t, t + dur + 0.2, 7);
      } else {
        osc(ctx, 'sine', f, lp, t, t + dur + 0.2);
        osc(ctx, 'sine', f * 2, lp, t, t + dur + 0.2);
        osc(ctx, 'triangle', f * 3, lp, t, t + dur + 0.2);
      }
      break;
    }
    case 'brass':
    case 'sax': {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(600, t);
      lp.frequency.linearRampToValueAtTime(inst === 'sax' ? 2200 : 3000, t + 0.06);
      lp.Q.value = inst === 'sax' ? 3 : 1;
      const g = env(ctx, dest, t, 0.03, 0.15 * v, 0.1, 0.7, dur, 0.08);
      lp.connect(g);
      const o = osc(ctx, 'sawtooth', f, lp, t, t + dur + 0.2);
      vibrato(ctx, o, t, t + dur + 0.2, 5, f * 0.006, 0.2);
      break;
    }
    case 'bass': {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      const g = env(ctx, dest, t, 0.006, 0.42 * v, Math.min(0.5, dur), 0.35, dur, 0.06);
      lp.connect(g);
      osc(ctx, 'triangle', f, lp, t, t + dur + 0.2);
      osc(ctx, 'sine', f / 2, g, t, t + dur + 0.2);
      break;
    }
    case 'pad': {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1300;
      const g = env(ctx, dest, t, 0.35, 0.055 * v, 0.2, 0.9, dur, 0.5);
      lp.connect(g);
      osc(ctx, 'sawtooth', f, lp, t, t + dur + 0.8, -8);
      osc(ctx, 'sawtooth', f, lp, t, t + dur + 0.8, 8);
      break;
    }
  }
}

/** Play one drum/percussion hit. */
export function playDrum(ctx: BaseAudioContext, dest: AudioNode, d: Drum, t: number, vel = 0.8): void {
  const v = vel;
  const noise = (dur: number, type: BiquadFilterType, freq: number, q: number, peak: number, a = 0.001) => {
    const n = ctx.createBufferSource();
    n.buffer = noiseBuffer(ctx);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = env(ctx, dest, t, a, peak * v, dur, 0.001, 0, 0.01);
    n.connect(f);
    f.connect(g);
    n.start(t, Math.random() * 0.8);
    n.stop(t + dur + 0.05);
  };
  switch (d) {
    case 'kick':
    case 'stomp': {
      const g = env(ctx, dest, t, 0.002, (d === 'stomp' ? 0.7 : 0.8) * v, 0.28, 0.001, 0, 0.02);
      const o = osc(ctx, 'sine', d === 'stomp' ? 110 : 150, g, t, t + 0.35);
      o.frequency.exponentialRampToValueAtTime(d === 'stomp' ? 40 : 48, t + 0.13);
      if (d === 'stomp') noise(0.08, 'lowpass', 900, 0.7, 0.35);
      break;
    }
    case 'snare':
      noise(0.16, 'highpass', 1200, 0.7, 0.35);
      {
        const g = env(ctx, dest, t, 0.002, 0.25 * v, 0.08, 0.001, 0, 0.02);
        osc(ctx, 'triangle', 190, g, t, t + 0.12);
      }
      break;
    case 'hat':
      noise(0.045, 'highpass', 7500, 0.8, 0.18);
      break;
    case 'openhat':
      noise(0.22, 'highpass', 7000, 0.8, 0.14);
      break;
    case 'clap':
      for (let i = 0; i < 3; i++) {
        const n = ctx.createBufferSource();
        n.buffer = noiseBuffer(ctx);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 1500;
        f.Q.value = 1.2;
        const g = env(ctx, dest, t + i * 0.012, 0.001, 0.3 * v, i === 2 ? 0.12 : 0.02, 0.001, 0, 0.01);
        n.connect(f);
        f.connect(g);
        n.start(t + i * 0.012, Math.random() * 0.8);
        n.stop(t + i * 0.012 + 0.2);
      }
      break;
    case 'shaker':
      noise(0.07, 'highpass', 5500, 1, 0.12, 0.015);
      break;
    case 'tamb':
      noise(0.1, 'highpass', 6500, 2, 0.16);
      {
        const g = env(ctx, dest, t, 0.001, 0.05 * v, 0.1, 0.001, 0, 0.02);
        osc(ctx, 'square', 5200, g, t, t + 0.12);
      }
      break;
    case 'doum': {
      const g = env(ctx, dest, t, 0.002, 0.6 * v, 0.35, 0.001, 0, 0.02);
      const o = osc(ctx, 'sine', 120, g, t, t + 0.4);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.2);
      noise(0.05, 'lowpass', 600, 0.7, 0.2);
      break;
    }
    case 'tek': {
      const g = env(ctx, dest, t, 0.001, 0.22 * v, 0.05, 0.001, 0, 0.01);
      osc(ctx, 'triangle', 700, g, t, t + 0.08);
      noise(0.04, 'bandpass', 3500, 2, 0.2);
      break;
    }
    case 'wood':
    case 'tick': {
      const g = env(ctx, dest, t, 0.001, (d === 'tick' ? 0.12 : 0.25) * v, 0.06, 0.001, 0, 0.01);
      osc(ctx, 'sine', d === 'tick' ? 1600 : 900, g, t, t + 0.1);
      break;
    }
    case 'cowbell': {
      const g = env(ctx, dest, t, 0.001, 0.12 * v, 0.25, 0.001, 0, 0.02);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 800;
      bp.connect(g);
      osc(ctx, 'square', 540, bp, t, t + 0.3);
      osc(ctx, 'square', 800, bp, t, t + 0.3);
      break;
    }
  }
}
