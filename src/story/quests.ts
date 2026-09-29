import type { SaveData } from '../core/state';

/**
 * Quests are pure data derived from save flags: a step is "done" when its condition holds.
 * That keeps quests consistent with the save no matter how the player got there.
 */
export interface Marker {
  map: string;
  x: number;
  y: number;
}

export interface QuestStep {
  id: string;
  text: string;
  done: (d: SaveData) => boolean;
  /** where the quest marker should point while this step is current */
  where?: (d: SaveData) => Marker | null;
}

export interface QuestDef {
  id: string;
  title: string;
  icon: string;
  chapter: 'tockwood' | 'pirate' | 'egypt' | 'fifties' | 'florence' | 'finale' | 'side';
  /** main-story quests drive the HUD objective; side quests show in the log */
  main?: boolean;
  available: (d: SaveData) => boolean;
  steps: QuestStep[];
  /** runs once when the last step completes */
  onComplete?: (d: SaveData) => void;
}

const QUESTS: QuestDef[] = [];

export function registerQuest(q: QuestDef): void {
  const i = QUESTS.findIndex((x) => x.id === q.id);
  if (i >= 0) QUESTS[i] = q;
  else QUESTS.push(q);
}

export function allQuests(): QuestDef[] {
  return QUESTS;
}

export function getQuest(id: string): QuestDef | undefined {
  return QUESTS.find((q) => q.id === id);
}

export interface QuestProgress {
  quest: QuestDef;
  done: boolean;
  current: QuestStep | null;
  completedSteps: number;
}

export function progress(q: QuestDef, d: SaveData): QuestProgress {
  let completed = 0;
  let current: QuestStep | null = null;
  for (const s of q.steps) {
    if (s.done(d)) completed++;
    else if (!current) current = s;
  }
  return { quest: q, done: completed === q.steps.length, current, completedSteps: completed };
}

export const flagDone = (flag: string) => (d: SaveData) => !!d.flags[flag];

/** Quests the player can see right now (available), split into active and finished. */
export function questLog(d: SaveData): { active: QuestProgress[]; finished: QuestProgress[] } {
  const active: QuestProgress[] = [];
  const finished: QuestProgress[] = [];
  for (const q of QUESTS) {
    if (!q.available(d) && !d.flags[`quest:${q.id}`]) continue;
    const p = progress(q, d);
    if (p.done || d.flags[`quest:${q.id}`]) finished.push(p);
    else active.push(p);
  }
  return { active, finished };
}

/** The objective shown on the HUD: the first unfinished main quest's current step. */
export function currentObjective(d: SaveData): { quest: QuestDef; step: QuestStep } | null {
  for (const q of QUESTS) {
    if (!q.main || !q.available(d)) continue;
    const p = progress(q, d);
    if (!p.done && p.current) return { quest: q, step: p.current };
  }
  for (const q of QUESTS) {
    if (q.main || !q.available(d)) continue;
    const p = progress(q, d);
    if (!p.done && p.current) return { quest: q, step: p.current };
  }
  return null;
}

/**
 * Detects newly finished steps/quests since the last check. Returns what changed so the caller
 * can celebrate (toast, sound) and autosave; marks finished quests with a `quest:<id>` flag.
 */
export function checkQuests(d: SaveData, seen: Map<string, number>): { steps: { quest: QuestDef; step: QuestStep }[]; quests: QuestDef[] } {
  const out = { steps: [] as { quest: QuestDef; step: QuestStep }[], quests: [] as QuestDef[] };
  for (const q of QUESTS) {
    if (!q.available(d)) continue;
    const p = progress(q, d);
    const before = seen.get(q.id);
    if (before !== undefined && p.completedSteps > before) {
      for (const s of q.steps) if (s.done(d) && q.steps.indexOf(s) >= before && q.steps.indexOf(s) < p.completedSteps) out.steps.push({ quest: q, step: s });
    }
    seen.set(q.id, p.completedSteps);
    if (p.done && !d.flags[`quest:${q.id}`]) {
      d.flags[`quest:${q.id}`] = true;
      out.quests.push(q);
      q.onComplete?.(d);
    }
  }
  return out;
}
