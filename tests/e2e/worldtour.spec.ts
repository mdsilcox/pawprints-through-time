import { test, expect } from '@playwright/test';
import { hook, startGame, watchErrors } from './helpers';

/**
 * A walk through the whole world: every map (every era, every room) loads with no errors, in a
 * finished game with everything unlocked, and the players land on ground they can stand on.
 */
test.describe('the whole world', () => {
  test('every map loads cleanly and its spawn point is walkable', async ({ page }) => {
    test.setTimeout(240_000);
    const errors = watchErrors(page);
    await startGame(page);
    for (const f of ['pip:companion', 'portal:ready', 'hourglassRestored', 'finale:done', 'bowling:open', 'rosita:arrived', 'lucia:arrived', 'ankhi:arrived', 'marigold:friend', 'cup:won', 'sockhop:danced', 'capstone:placed', 'lion:awake', 'court:danced']) await hook(page, 'setFlag', f, true);
    const tour = await hook<{ id: string; spawn: string }[]>(page, 'mapTour');
    expect(tour.length).toBeGreaterThanOrEqual(20);
    for (const { id, spawn } of tour) {
      await expect.poll(() => hook<boolean>(page, 'transitioning'), { timeout: 10_000, message: `before ${id}` }).toBe(false);
      await hook(page, 'goTo', id, spawn);
      await expect.poll(() => hook<string>(page, 'mapId'), { timeout: 10_000, message: `loading ${id}` }).toBe(id);
      await expect.poll(() => hook<boolean>(page, 'transitioning'), { timeout: 10_000 }).toBe(false);
      await page.waitForTimeout(250);
      const [p] = await hook<{ x: number; y: number }[]>(page, 'players');
      const solid = await hook<boolean>(page, 'solidAt', Math.floor(p.x), Math.floor(p.y));
      expect(solid, `${id} (${spawn}) puts the players inside a wall at ${p.x.toFixed(1)},${p.y.toFixed(1)}`).toBe(false);
      expect(await hook<string[]>(page, 'scenes'), id).toContain('world');
    }
    expect(errors).toEqual([]);
  });
});
