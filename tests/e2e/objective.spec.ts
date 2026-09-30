import { test, expect } from '@playwright/test';
import { hook, startGame, watchErrors } from './helpers';

/**
 * The HUD objective and the map's ★ follow the chapter you're playing. Once the first Time Sand is
 * home the finale's quest is running too — but its "bring all eight home" must wait its turn.
 */
test.describe('the objective', () => {
  test('in every era the HUD shows that chapter’s next step and the map has its ★ — the finale’s step only when the chapters are done', async ({ page }) => {
    test.setTimeout(150_000);
    const errors = watchErrors(page);
    await startGame(page);
    // the opening is done and the pirates' sand is home: the finale quest is running from here on
    for (const f of ['visited:clocktower', 'met:pip', 'met:clover', 'met:quill', 'met:bramble', 'met:rocco', 'dug:first', 'portal:ready', 'pip:companion', 'sand:pirate:placed']) await hook(page, 'setFlag', f, true);
    await hook(page, 'addSand', 'pirate');
    const eras = [
      ['egypt', 'portal', 'giza:arrived', 'egypt-sand'],
      ['fifties', 'portal', 'maple:arrived', 'fifties-sand'],
      ['florence', 'portal', 'flor:arrived', 'florence-sand'],
    ] as const;
    for (const [map, spawn, arrived, quest] of eras) {
      await hook(page, 'setFlag', arrived, true);
      await hook(page, 'goTo', map, spawn);
      await expect.poll(() => hook<string>(page, 'mapId'), { timeout: 15_000 }).toBe(map);
      await expect.poll(async () => (await hook<{ quest: string } | null>(page, 'objective'))?.quest, { timeout: 5000 }).toBe(quest);
      // the local map shows where to go
      await hook(page, 'openMap');
      await expect(page.locator('.map-mark.goal')).toHaveCount(1);
      await page.waitForTimeout(400); // (screens ignore presses for a moment after opening)
      await page.keyboard.press('Escape');
      await expect(page.locator('.map-mark.goal')).toHaveCount(0);
    }
    // back home with chapters still to finish: the earliest unfinished one leads
    await hook(page, 'goTo', 'tockwood', 'plaza');
    await expect.poll(() => hook<string>(page, 'mapId'), { timeout: 15_000 }).toBe('tockwood');
    await expect.poll(async () => (await hook<{ quest: string } | null>(page, 'objective'))?.quest, { timeout: 5000 }).toBe('egypt-sand');
    expect(errors).toEqual([]);
  });
});
