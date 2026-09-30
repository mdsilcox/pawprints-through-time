import { test, expect, type Page } from '@playwright/test';
import { hook, startGame, watchErrors } from './helpers';

interface TexStats {
  count: number;
  megapixels: number;
  big: string[];
}
const stats = (page: Page) => hook<TexStats>(page, 'texStats');

async function visit(page: Page, map: string, spawn: string): Promise<void> {
  await hook(page, 'goTo', map, spawn);
  await expect.poll(() => hook<string>(page, 'mapId'), { timeout: 15_000 }).toBe(map);
  await page.waitForTimeout(700);
}

test.describe('phones: memory', () => {
  test('big pictures (buildings, the pyramid, the dome) are drawn when a place needs them and let go when you leave it', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await startGame(page);
    // nothing from the eras is drawn until you go there
    expect((await stats(page)).big).not.toContain('bld-pyramid');
    await visit(page, 'egypt', 'portal');
    expect((await stats(page)).big).toContain('bld-pyramid');
    // Florence has its own big pictures — Giza's are let go
    await visit(page, 'florence', 'portal');
    const flor = await stats(page);
    expect(flor.big).toContain('bld-duomo');
    expect(flor.big).not.toContain('bld-pyramid');
    // ...and drawn again on the way back
    await visit(page, 'egypt', 'portal');
    const giza = await stats(page);
    expect(giza.big).toContain('bld-pyramid');
    expect(giza.big).not.toContain('bld-duomo');
    // after a tour of every era, home holds no more than a normal day in Tockwood does
    const home0 = await (async () => {
      await visit(page, 'tockwood', 'plaza');
      return stats(page);
    })();
    for (const [m, s] of [
      ['cove', 'from-isle'],
      ['fifties', 'portal'],
      ['florence', 'portal'],
    ] as const)
      await visit(page, m, s);
    await visit(page, 'tockwood', 'plaza');
    const home1 = await stats(page);
    // none of the eras' big pictures stayed behind (only small props are kept — they're cheap)
    expect(home1.big.filter((k) => !home0.big.includes(k))).toEqual([]);
    expect(home1.megapixels).toBeLessThanOrEqual(home0.megapixels + 3);
    expect(errors).toEqual([]);
  });

  test('the whole party dances the Bunny Hop — and its fourteen watchers’ pictures are let go afterwards', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page);
    const guests = ['marigold', 'cookie', 'pepper', 'rollo', 'duke', 'mabel', 'rosita', 'neb', 'ankhi', 'sesi', 'lucia', 'fiorella', 'orsola', 'beppe'];
    const cousins = ['skipper', 'shelly', 'bosun', 'nibbles', 'sandy', 'lotus', 'poppy', 'zippy', 'dot', 'pesto', 'sketch', 'twirl'];
    await hook(page, 'openDance', 'bunnyhop', null, guests, cousins);
    await expect(page.getByTestId('dance-setup')).toBeVisible();
    await page.getByTestId('dance-start').click();
    // every friend and every cousin is on the floor
    await expect.poll(async () => (await hook<string[]>(page, 'textureKeys', 'dance-npc-')).length).toBe(guests.length);
    expect((await hook<string[]>(page, 'textureKeys', 'bunny-')).length).toBeGreaterThanOrEqual(cousins.length);
    await hook(page, 'stopScene', 'dance');
    await expect.poll(async () => (await hook<string[]>(page, 'textureKeys', 'dance-npc-')).length).toBe(0);
    expect(errors).toEqual([]);
  });
});
