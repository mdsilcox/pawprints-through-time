import { describe, it, expect } from 'vitest';
import { checkQuests, currentObjective, flagDone, progress, questLog, registerQuest } from '../../src/story/quests';
import { defaultSave } from '../../src/core/state';

registerQuest({
  id: 't-main',
  title: 'Main test quest',
  icon: '⭐',
  chapter: 'tockwood',
  main: true,
  available: (d) => !!d.flags.started,
  steps: [
    { id: 'a', text: 'Do A', done: flagDone('a') },
    { id: 'b', text: 'Do B', done: flagDone('b') },
  ],
  onComplete: (d) => {
    d.tockens += 5;
  },
});
registerQuest({
  id: 't-side',
  title: 'Side test quest',
  icon: '🌼',
  chapter: 'side',
  available: () => true,
  steps: [{ id: 'x', text: 'Do X', done: flagDone('x') }],
});

describe('quests', () => {
  it('derives progress from flags', () => {
    const d = defaultSave();
    d.flags.started = true;
    const q = questLog(d).active.find((p) => p.quest.id === 't-main')!;
    expect(q.current?.id).toBe('a');
    d.flags.a = true;
    expect(progress(q.quest, d).current?.id).toBe('b');
    d.flags.b = true;
    expect(progress(q.quest, d).done).toBe(true);
  });

  it('hides quests that are not available yet', () => {
    const d = defaultSave();
    expect(questLog(d).active.map((p) => p.quest.id)).not.toContain('t-main');
  });

  it('prefers the main quest for the HUD objective', () => {
    const d = defaultSave();
    d.flags.started = true;
    expect(currentObjective(d)?.quest.id).toBe('t-main');
    d.flags.a = d.flags.b = true;
    // main done -> falls back to side quests
    const o = currentObjective(d);
    expect(o?.quest.id).not.toBe('t-main');
  });

  it('the objective follows the era you are in, then the story order — the finale waits for every chapter', () => {
    // (registered finale-first on purpose: registration order must not decide the objective)
    registerQuest({ id: 'o-finale', title: 'F', icon: '⏳', chapter: 'finale', main: true, available: (d) => !!d.flags.o, steps: [{ id: 's', text: 'all eight home', done: () => false }] });
    registerQuest({ id: 'o-fifties', title: 'C', icon: '🎳', chapter: 'fifties', main: true, available: (d) => !!d.flags.o, steps: [{ id: 's', text: 'the cup', done: (d) => !!d.flags.o5 }] });
    registerQuest({ id: 'o-egypt', title: 'E', icon: '🔺', chapter: 'egypt', main: true, available: (d) => !!d.flags.o, steps: [{ id: 's', text: 'the capstone', done: (d) => !!d.flags.o2 }] });
    const d = defaultSave();
    d.flags.o = true;
    expect(currentObjective(d)?.quest.id).toBe('o-egypt');
    expect(currentObjective(d, 'fifties')?.quest.id).toBe('o-fifties');
    expect(currentObjective(d, 'tockwood')?.quest.id).toBe('o-egypt');
    d.flags.o2 = true;
    expect(currentObjective(d, 'egypt')?.quest.id).toBe('o-fifties');
    d.flags.o5 = true;
    expect(currentObjective(d)?.quest.id).toBe('o-finale');
  });

  it('reports newly finished steps and quests exactly once, and runs rewards once', () => {
    const d = defaultSave();
    d.flags.started = true;
    const seen = new Map<string, Set<string>>();
    checkQuests(d, seen); // prime
    d.flags.a = true;
    let r = checkQuests(d, seen);
    expect(r.steps.map((s) => s.step.id)).toEqual(['a']);
    expect(r.quests).toEqual([]);
    d.flags.b = true;
    r = checkQuests(d, seen);
    expect(r.quests.map((q) => q.id)).toEqual(['t-main']);
    expect(d.tockens).toBe(25);
    r = checkQuests(d, seen);
    expect(r.quests).toEqual([]);
    expect(d.tockens).toBe(25);
    expect(d.flags['quest:t-main']).toBe(true);
    expect(questLog(d).finished.map((p) => p.quest.id)).toContain('t-main');
  });

  it('steps finished out of order are each announced as themselves (not by position)', () => {
    const d = defaultSave();
    d.flags.started = true;
    const seen = new Map<string, Set<string>>();
    checkQuests(d, seen); // prime
    d.flags.b = true; // second step first
    expect(checkQuests(d, seen).steps.map((s) => s.step.id)).toEqual(['b']);
    d.flags.a = true;
    const r = checkQuests(d, seen);
    expect(r.steps.map((s) => s.step.id)).toEqual(['a']);
    expect(r.quests.map((q) => q.id)).toEqual(['t-main']);
  });
});
