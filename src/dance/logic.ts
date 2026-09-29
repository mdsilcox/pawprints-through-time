import type { Song } from '../audio/music';
import { songSteps, stepTime } from '../audio/music';

/**
 * The dance game's rules (pure, unit-tested): charts made from a song's lead melody, timing
 * windows, judging, scoring and stars. The scene (DanceScene) only draws and listens.
 */
export type Lane = 'left' | 'down' | 'up' | 'right';
export const LANES: Lane[] = ['left', 'down', 'up', 'right'];
export type DanceLevel = 'easy' | 'medium' | 'hard';
export type Judgement = 'perfect' | 'great' | 'good' | 'miss';

export interface DanceNote {
  /** seconds from the start of the song */
  t: number;
  lane: Lane;
}

export interface DanceStyleDef {
  id: string;
  name: string;
  /** the era it comes from (for the Map of Time / notes) */
  era: 'pirate' | 'egypt' | 'fifties' | 'florence' | 'tockwood';
  song: string;
  /** how many times the song's loop plays */
  loops: number;
  /** what the dancers call out for each arrow */
  moves: Record<Lane, string>;
  /** backdrop key for the dance floor */
  stage: string;
}

export const DANCE_STYLES: Record<string, DanceStyleDef> = {
  hornpipe: {
    id: 'hornpipe',
    name: 'The Sailor’s Hornpipe',
    era: 'pirate',
    song: 'hornpipe',
    loops: 3,
    moves: { left: 'Haul the rope!', down: 'Climb the rigging!', up: 'Look out to sea!', right: 'Heel and toe!' },
    stage: 'deck',
  },
  sockhop: {
    id: 'sockhop',
    name: 'The Sock Hop',
    era: 'fifties',
    song: 'sockhop',
    loops: 2,
    moves: { left: 'Twist!', down: 'Hand jive!', up: 'Jump for joy!', right: 'Stroll!' },
    stage: 'diner',
  },
  jig: {
    id: 'jig',
    name: 'The Tockwood Jig',
    era: 'tockwood',
    song: 'plaza-dance',
    loops: 2,
    moves: { left: 'Skip to the left!', down: 'Bounce!', up: 'Wave to the clocktower!', right: 'Twirl!' },
    stage: 'plaza',
  },
};

/** How far from the beat (seconds, either side) still counts, by level. Tick-Tock Tomato widens every window. */
export const WINDOWS: Record<DanceLevel, { perfect: number; great: number; good: number }> = {
  easy: { perfect: 0.075, great: 0.14, good: 0.22 },
  medium: { perfect: 0.06, great: 0.115, good: 0.18 },
  hard: { perfect: 0.045, great: 0.09, good: 0.14 },
};
export const SLOW_WIDEN = 1.45;

export function windowsFor(level: DanceLevel, opts: { slow?: boolean } = {}): { perfect: number; great: number; good: number } {
  const w = WINDOWS[level];
  const k = opts.slow ? SLOW_WIDEN : 1;
  return { perfect: w.perfect * k, great: w.great * k, good: w.good * k };
}

/** Judge a press `offset` seconds away from its note (null = too far to count for that note). */
export function judge(offset: number, w: { perfect: number; great: number; good: number }): Exclude<Judgement, 'miss'> | null {
  const a = Math.abs(offset);
  if (a <= w.perfect) return 'perfect';
  if (a <= w.great) return 'great';
  if (a <= w.good) return 'good';
  return null;
}

/** Which melody notes each level dances to: every other beat, every beat, or every note. */
function keepsStep(step: number, spb: number, level: DanceLevel): boolean {
  if (level === 'hard') return true;
  if (step % spb !== 0) return false;
  return level === 'medium' || (step / spb) % 2 === 0;
}

/**
 * A chart from the song's lead melody: note onsets become arrows, and the melody's shape picks
 * which (going up → up/right, going down → down/left, repeating → a side step). The first bar
 * of the first loop is left empty so everyone can find the beat.
 */
export function makeChart(song: Song, level: DanceLevel, loops: number): DanceNote[] {
  const lead = song.tracks.find((t) => t.lead)?.notes ?? [];
  const total = songSteps(song);
  const loopLen = stepTime(song, total);
  const byStep = new Map<number, number>();
  for (const n of lead) if (!byStep.has(n.step) || n.midi > byStep.get(n.step)!) byStep.set(n.step, n.midi);
  const steps = [...byStep.keys()].sort((a, b) => a - b).filter((s) => keepsStep(s, song.spb, level));
  const lanes: Lane[] = [];
  let prev = -1;
  let side: Lane = 'right';
  for (const s of steps) {
    const midi = byStep.get(s)!;
    let lane: Lane;
    if (prev < 0) lane = 'left';
    else if (midi > prev) lane = midi - prev >= 5 ? 'up' : 'right';
    else if (midi < prev) lane = prev - midi >= 5 ? 'down' : 'left';
    else lane = side = side === 'right' ? 'left' : 'right';
    lanes.push(lane);
    prev = midi;
  }
  const firstBar = song.beatsPerBar * song.spb;
  const out: DanceNote[] = [];
  for (let l = 0; l < loops; l++)
    steps.forEach((s, i) => {
      if (l === 0 && s < firstBar) return;
      out.push({ t: l * loopLen + stepTime(song, s), lane: lanes[i] });
    });
  // never the same arrow three times in a row on Easy (little feet get bored), even across loops
  if (level === 'easy')
    for (let i = 2; i < out.length; i++)
      if (out[i].lane === out[i - 1].lane && out[i].lane === out[i - 2].lane) out[i] = { ...out[i], lane: out[i].lane === 'up' ? 'down' : out[i].lane === 'down' ? 'up' : out[i].lane === 'left' ? 'right' : 'left' };
  return out;
}

export const POINTS: Record<Judgement, number> = { perfect: 300, great: 200, good: 100, miss: 0 };

export interface DanceScore {
  points: number;
  combo: number;
  maxCombo: number;
  counts: Record<Judgement, number>;
}

export function emptyScore(): DanceScore {
  return { points: 0, combo: 0, maxCombo: 0, counts: { perfect: 0, great: 0, good: 0, miss: 0 } };
}

/** Add one judged note: a growing combo adds up to +50% to each hit. */
export function addJudgement(s: DanceScore, j: Judgement): DanceScore {
  const combo = j === 'miss' ? 0 : s.combo + 1;
  const bonus = 1 + Math.min(combo, 50) / 100;
  return {
    points: s.points + Math.round(POINTS[j] * bonus),
    combo,
    maxCombo: Math.max(s.maxCombo, combo),
    counts: { ...s.counts, [j]: s.counts[j] + 1 },
  };
}

/** 0..1: how well the dance went (perfect = 1, great = ¾, good = ½, missed = 0). */
export function accuracy(s: DanceScore, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, (s.counts.perfect + s.counts.great * 0.75 + s.counts.good * 0.5) / total);
}

/** Every finished dance earns at least one star. */
export function starsFor(acc: number): 1 | 2 | 3 {
  return acc >= 0.85 ? 3 : acc >= 0.6 ? 2 : 1;
}

/** The best possible score for a chart (every note perfect, full combo). */
export function maxPoints(total: number): number {
  let s = emptyScore();
  for (let i = 0; i < total; i++) s = addJudgement(s, 'perfect');
  return s.points;
}

/** A rival dancer's final score: a steady dancer who gets about this share of the best score. */
export const RIVAL_SHARE: Record<DanceLevel, number> = { easy: 0.3, medium: 0.48, hard: 0.6 };

export function rivalPoints(level: DanceLevel, total: number): number {
  return Math.round(maxPoints(total) * RIVAL_SHARE[level]);
}
