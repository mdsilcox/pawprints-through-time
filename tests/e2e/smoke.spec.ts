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
    await expect(page.getByTestId('name-p1')).toBeVisible();
    await page.getByTestId('name-p1').fill('Robin');
    await press(page, '[data-testid="names-ok"]');
    await expect.poll(() => activeScenes(page)).toContain('world');
    expect((await hook<any>(page, 'state')).players[0].name).toBe('Robin');
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

test('a quick double-tap never skips a menu or stacks duplicate screens', async ({ page }) => {
  await bootToTitle(page);
  await page.waitForTimeout(350);
  const btn = page.getByTestId('title-new');
  await btn.dblclick();
  await expect(page.locator('[data-screen="slots"]')).toHaveCount(1);
  expect(await hook<string[]>(page, 'scenes')).not.toContain('world');
  // a tap landing right as a screen opens is ignored (e.g. the second half of a double-tap)
  await page.getByTestId('slots-back').click();
  await expect(page.locator('[data-screen="slots"]')).toHaveCount(0);
  await page.waitForTimeout(350);
  await page.getByTestId('title-new').click();
  const started = await page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const tryClick = () => {
          const el = document.querySelector('[data-testid="slot-1"]') as HTMLElement | null;
          if (el) {
            el.click(); // same frame the picker appeared in
            setTimeout(() => resolve((window as any).__game.scenes().includes('world')), 600);
          } else requestAnimationFrame(tryClick);
        };
        tryClick();
      }),
  );
  expect(started).toBe(false);
  // ...while a deliberate tap a moment later works
  await press(page, '[data-testid="slot-1"]');
  await press(page, '[data-testid="names-ok"]');
  await expect.poll(() => hook<string[]>(page, 'scenes')).toContain('world');
});

test('an old adventure can be deleted from the load screen (after confirming)', async ({ page }) => {
  await bootToTitle(page);
  await hook(page, 'newGame', 1);
  await hook(page, 'newGame', 2);
  await page.reload();
  await bootToTitle(page);
  await press(page, '[data-testid="title-load"]');
  await press(page, '[data-testid="slot-del-1"]');
  await press(page, '[data-testid="confirm-no"]'); // changed our mind
  expect((await hook<any[]>(page, 'slots'))[0].exists).toBe(true);
  await press(page, '[data-testid="slot-del-1"]');
  await press(page, '[data-testid="confirm-yes"]');
  await expect.poll(async () => (await hook<any[]>(page, 'slots'))[0].exists).toBe(false);
  await expect(page.getByTestId('slot-1')).toBeDisabled();
  expect((await hook<any[]>(page, 'slots'))[1].exists).toBe(true);
});
