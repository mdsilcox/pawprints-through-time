import { test, expect } from '@playwright/test';

// Runs against the production build (`vite build` + `vite preview`), see playwright.config.ts.
test('installable PWA that keeps working offline', async ({ page, context }) => {
  await page.goto('/');
  // Manifest is linked and describes an installable landscape app.
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await (await page.request.get(new URL(href!, page.url()).toString())).json();
  expect(manifest.name).toBe('Pawprints Through Time');
  expect(manifest.display).toBe('fullscreen');
  expect(manifest.orientation).toBe('landscape');
  expect(manifest.icons.some((i: any) => i.sizes === '512x512')).toBe(true);
  for (const icon of manifest.icons) {
    const res = await page.request.get(new URL(icon.src, page.url()).toString());
    expect(res.ok()).toBe(true);
  }

  // Wait until the service worker has fully installed and activated (precache complete).
  // (`serviceWorker.ready` only resolves once there is an *active* worker.)
  const activeState = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    const sw = reg.active!;
    if (sw.state !== 'activated') {
      await new Promise<void>((resolve) => sw.addEventListener('statechange', () => sw.state === 'activated' && resolve()));
    }
    return sw.state;
  });
  expect(activeState).toBe('activated');

  // The worker claims open pages; if this page loaded before that, a reload hands it over.
  await expect
    .poll(
      async () => {
        const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
        if (!controlled) await page.reload();
        return controlled;
      },
      { timeout: 30_000, intervals: [500, 1000, 2000] },
    )
    .toBe(true);

  // Go offline and reload: the game still boots to its title screen from the cache.
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-screen="title"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.logo-top')).toHaveText('Pawprints');
  await expect(page.locator('#game canvas')).toBeVisible();
  await context.setOffline(false);
});
