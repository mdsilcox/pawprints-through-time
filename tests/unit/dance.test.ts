import { describe, expect, it } from 'vitest';
import { getSong } from '../../src/audio/songs';
import { songSteps, stepTime } from '../../src/audio/music';
import {
  DANCE_STYLES,
  LANES,
  RIVAL_SHARE,
  SLOW_WIDEN,
  accuracy,
  addJudgement,
  emptyScore,
  judge,
  makeChart,
  maxPoints,
  rivalPoints,
  starsFor,
  windowsFor,
  type DanceLevel,
} from '../../src/dance/logic';

const LEVELS: DanceLevel[] = ['easy', 'medium', 'hard'];

describe('dance charts', () => {
  for (const style of Object.values(DANCE_STYLES)) {
    const song = getSong(style.song)!;
    it(`${style.id}: the song exists, has a lead melody and every bar is complete`, () => {
      expect(song).toBeTruthy();
      const lead = song.tracks.find((t) => t.lead);
      expect(lead?.notes?.length).toBeGreaterThan(8);
      const total = songSteps(song);
      for (const n of lead!.notes!) expect(n.step).toBeLessThan(total);
    });

    it(`${style.id}: charts follow the beat and get busier from Easy to Tricky`, () => {
      const counts = LEVELS.map((lv) => makeChart(song, lv, style.loops).length);
      expect(counts[0]).toBeGreaterThan(10);
      expect(counts[0]).toBeLessThan(counts[1]);
      expect(counts[1]).toBeLessThan(counts[2]);
      const beat = 60 / song.bpm;
      const loopLen = stepTime(song, songSteps(song));
      for (const lv of LEVELS) {
        const chart = makeChart(song, lv, style.loops);
        // sorted, inside the song, nothing in the first bar (time to find the beat)
        for (let i = 1; i < chart.length; i++) expect(chart[i].t).toBeGreaterThan(chart[i - 1].t);
        expect(chart[0].t).toBeGreaterThanOrEqual(song.beatsPerBar * beat - 1e-6);
        expect(chart[chart.length - 1].t).toBeLessThan(loopLen * style.loops);
        for (const n of chart) expect(LANES).toContain(n.lane);
        // easy and medium land on beats; easy leaves at least a beat between arrows
        if (lv !== 'hard') for (const n of chart) expect(Math.abs(n.t / beat - Math.round(n.t / beat))).toBeLessThan(1e-6);
        if (lv === 'easy') for (let i = 1; i < chart.length; i++) expect(chart[i].t - chart[i - 1].t).toBeGreaterThan(beat * 1.5);
        // every arrow gets used
        for (const lane of LANES) expect(chart.some((n) => n.lane === lane)).toBe(true);
      }
    });

    it(`${style.id}: easy never asks for the same arrow three times running`, () => {
      const chart = makeChart(song, 'easy', style.loops);
      for (let i = 2; i < chart.length; i++) expect(chart[i].lane === chart[i - 1].lane && chart[i].lane === chart[i - 2].lane).toBe(false);
    });
  }
});

describe('dance judging and scoring', () => {
  it('timing windows: perfect, great, good — or no hit at all', () => {
    const w = windowsFor('easy');
    expect(judge(0, w)).toBe('perfect');
    expect(judge(-0.07, w)).toBe('perfect');
    expect(judge(0.1, w)).toBe('great');
    expect(judge(-0.2, w)).toBe('good');
    expect(judge(0.3, w)).toBeNull();
    // harder levels are stricter
    expect(judge(0.1, windowsFor('hard'))).toBe('good');
    expect(judge(0.16, windowsFor('hard'))).toBeNull();
  });

  it('Tick-Tock Tomato widens every window', () => {
    const w = windowsFor('medium');
    const slow = windowsFor('medium', { slow: true });
    expect(slow.perfect).toBeCloseTo(w.perfect * SLOW_WIDEN);
    expect(slow.good).toBeCloseTo(w.good * SLOW_WIDEN);
    expect(judge(0.2, w)).toBeNull();
    expect(judge(0.2, slow)).toBe('good');
  });

  it('combos add a bonus, a miss resets the combo, stars follow accuracy', () => {
    let s = emptyScore();
    s = addJudgement(s, 'perfect');
    expect(s.points).toBe(303);
    s = addJudgement(s, 'great');
    expect(s.combo).toBe(2);
    s = addJudgement(s, 'miss');
    expect(s.combo).toBe(0);
    expect(s.maxCombo).toBe(2);
    expect(s.counts).toEqual({ perfect: 1, great: 1, good: 0, miss: 1 });
    expect(accuracy(s, 3)).toBeCloseTo((1 + 0.75) / 3);
    expect(starsFor(0.9)).toBe(3);
    expect(starsFor(0.7)).toBe(2);
    expect(starsFor(0.1)).toBe(1);
  });

  it('a rival dancer scores a fixed share of the best possible score (beatable at every level)', () => {
    for (const lv of LEVELS) {
      const total = 40;
      expect(rivalPoints(lv, total)).toBe(Math.round(maxPoints(total) * RIVAL_SHARE[lv]));
      // all "great" (not a single perfect) beats the rival on every level
      let s = emptyScore();
      for (let i = 0; i < total; i++) s = addJudgement(s, 'great');
      expect(s.points).toBeGreaterThan(rivalPoints(lv, total));
    }
    // on Easy, a young dancer who misses one arrow in five still wins
    let s = emptyScore();
    const mix = ['great', 'good', 'great', 'good', 'miss'] as const;
    for (let i = 0; i < 40; i++) s = addJudgement(s, mix[i % mix.length]);
    expect(s.points).toBeGreaterThan(rivalPoints('easy', 40));
  });
});
