import { test, expect } from '@playwright/test';
import { activeScenes, bootToTitle, hook, press, watchErrors } from './helpers';

test.describe('smoke', () => {
  test('boots to the title screen with no errors', async ({ page }) => {
    const errors = watchErrors(page);
    await bootToTitle(page);
    await expect(page.locator('.logo-top')).toHaveText('Pawprints');
    await expect(page.getByTestId('title-new')).toBeVisible();
    expect(await activeScenes(page)).toContain('title');
    // The Phaser canvas fills the viewport.
    const box = await page.locator('#game canvas').boundingBox();
    const vp = page.viewportSize()!;
    expect(Math.round(box!.width)).toBe(vp.width);
    expect(Math.round(box!.height)).toBe(vp.height);
    expect(errors).toEqual([]);
  });

  test('new game -> play -> back to title -> continue from the save', async ({ page }) => {
    const errors = watchErrors(page);
    await bootToTitle(page);
    // No saves yet, so there is no Continue button.
    await expect(page.getByTestId('title-continue')).toHaveCount(0);
    await press(page, '[data-testid="title-new"]');
    await press(page, '[data-testid="slot-2"]');
    await expect.poll(() => activeScenes(page)).toContain('world');
    expect(await hook(page, 'slot')).toBe(2);
    const state = await hook<any>(page, 'state');
    expect(state.location.map).toBe('tockwood');

    await hook(page, 'setFlag', 'smokeTest', 42);
    await hook(page, 'save');
    await hook(page, 'toTitle');
    await expect(page.locator('[data-screen="title"]')).toBeVisible();

    // Reload the page: the save must come back from IndexedDB.
    await bootToTitle(page);
    await expect(page.getByTestId('title-continue')).toBeVisible();
    const slots = await hook<any[]>(page, 'slots');
    expect(slots[1].exists).toBe(true);
    await press(page, '[data-testid="title-continue"]');
    await expect.poll(() => activeScenes(page)).toContain('world');
    expect(await hook(page, 'getFlag', 'smokeTest')).toBe(42);
    expect(errors).toEqual([]);
  });

  test('save slots are independent', async ({ page }) => {
    await bootToTitle(page);
    await hook(page, 'newGame', 1);
    await hook(page, 'setFlag', 'which', 'one');
    await hook(page, 'save');
    await hook(page, 'newGame', 3);
    await hook(page, 'setFlag', 'which', 'three');
    await hook(page, 'save');
    await hook(page, 'load', 1);
    expect(await hook(page, 'getFlag', 'which')).toBe('one');
    await hook(page, 'load', 3);
    expect(await hook(page, 'getFlag', 'which')).toBe('three');
    const slots = await hook<any[]>(page, 'slots');
    expect(slots.map((s) => s.exists)).toEqual([true, false, true]);
  });
});
