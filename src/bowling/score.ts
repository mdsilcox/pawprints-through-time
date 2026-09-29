/**
 * Ten-pin bowling scoring (pure, unit-tested): rolls → frames → running totals, with strikes,
 * spares and the tenth frame's bonus balls. Used by the lanes, the scorecard and the tournament.
 */
export interface FrameView {
  /** pins knocked down by each roll in this frame */
  rolls: number[];
  /** what the scorecard shows for each roll: "X", "/", "-" or a number */
  marks: string[];
  /** the running total once this frame can be scored (null while waiting for bonus rolls) */
  total: number | null;
}

/** Split a player's rolls into frames (10 frames; the 10th can have 3 rolls). */
export function toFrames(rolls: number[]): number[][] {
  const frames: number[][] = [];
  let i = 0;
  while (i < rolls.length && frames.length < 10) {
    if (frames.length === 9) {
      frames.push(rolls.slice(i, i + 3));
      break;
    }
    if (rolls[i] === 10) {
      frames.push([10]);
      i += 1;
    } else {
      frames.push(rolls.slice(i, i + 2));
      i += 2;
    }
  }
  return frames;
}

/** Is the game over (all ten frames complete)? */
export function gameOver(rolls: number[]): boolean {
  const f = toFrames(rolls);
  if (f.length < 10) return false;
  const t = f[9];
  if (t.length < 2) return false;
  if (t[0] === 10 || t[0] + t[1] === 10) return t.length === 3;
  return true;
}

/** How many pins are standing for the next roll (10 means a fresh rack). */
export function pinsStanding(rolls: number[]): number {
  const f = toFrames(rolls);
  if (!f.length) return 10;
  const last = f[f.length - 1];
  if (f.length < 10) {
    if (last.length === 1 && last[0] !== 10) return 10 - last[0];
    return 10;
  }
  // the tenth frame: fresh racks after a strike or a spare
  if (last.length === 1) return last[0] === 10 ? 10 : 10 - last[0];
  if (last.length === 2) {
    if (last[0] === 10) return last[1] === 10 ? 10 : 10 - last[1];
    return last[0] + last[1] === 10 ? 10 : 0;
  }
  return 0;
}

/** Which frame (1–10) and which ball of it comes next. */
export function nextBall(rolls: number[]): { frame: number; ball: number } {
  const f = toFrames(rolls);
  if (!f.length) return { frame: 1, ball: 1 };
  const last = f[f.length - 1];
  if (f.length < 10) {
    const done = last[0] === 10 || last.length === 2;
    return done ? { frame: f.length + 1, ball: 1 } : { frame: f.length, ball: 2 };
  }
  return { frame: 10, ball: Math.min(3, last.length + 1) };
}

/** The scorecard: marks and running totals for every frame so far. */
export function scorecard(rolls: number[]): FrameView[] {
  const frames = toFrames(rolls);
  const out: FrameView[] = [];
  let total = 0;
  let idx = 0; // index into rolls where this frame starts
  for (let f = 0; f < frames.length; f++) {
    const fr = frames[f];
    const marks: string[] = [];
    const mark = (n: number) => (n === 10 ? 'X' : n === 0 ? '-' : String(n));
    if (f < 9) {
      if (fr[0] === 10) marks.push('X');
      else {
        marks.push(mark(fr[0]));
        if (fr.length > 1) marks.push(fr[0] + fr[1] === 10 ? '/' : fr[1] === 0 ? '-' : String(fr[1]));
      }
    } else {
      // tenth frame: a fresh rack after each strike or spare
      let standing = 10;
      for (const n of fr) {
        if (standing === 10) marks.push(mark(n));
        else marks.push(n === standing ? '/' : n === 0 ? '-' : String(n));
        standing -= n;
        if (standing <= 0) standing = 10;
      }
    }
    let frameScore: number | null = null;
    if (f < 9) {
      if (fr[0] === 10) {
        const bonus = rolls.slice(idx + 1, idx + 3);
        if (bonus.length === 2) frameScore = 10 + bonus[0] + bonus[1];
      } else if (fr.length === 2) {
        if (fr[0] + fr[1] === 10) {
          const bonus = rolls[idx + 2];
          if (bonus !== undefined) frameScore = 10 + bonus;
        } else frameScore = fr[0] + fr[1];
      }
    } else if (gameOver(rolls)) frameScore = fr.reduce((a, b) => a + b, 0);
    if (frameScore !== null && (out.length === 0 || out[out.length - 1].total !== null)) {
      total += frameScore;
      out.push({ rolls: fr, marks, total });
    } else out.push({ rolls: fr, marks, total: null });
    idx += fr.length;
  }
  return out;
}

/** The final (or so-far) score. */
export function totalScore(rolls: number[]): number {
  const card = scorecard(rolls);
  for (let i = card.length - 1; i >= 0; i--) if (card[i].total !== null) return card[i].total!;
  return 0;
}
