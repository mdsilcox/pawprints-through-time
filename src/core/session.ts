/**
 * Play sessions. Leaving play (back to the title, or starting another game) ends the session:
 * any story script still waiting on a dialogue line, a timer or a scripted walk from the old
 * session is cancelled instead of waking up later in the new one.
 */
export class Cancelled extends Error {
  constructor() {
    super('story cancelled');
    this.name = 'Cancelled';
  }
}

let epoch = 0;
export const sessionEpoch = (): number => epoch;
export function endSession(): void {
  epoch++;
}
export const isCancelled = (err: unknown): boolean => err instanceof Cancelled;
