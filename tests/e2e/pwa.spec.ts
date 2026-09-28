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

  // Service worker installs and takes control.
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return !!reg?.active;
  }, null, { timeout: 60_000 });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30_000 });

  // Go offline and reload: the game still boots to its title screen from the cache.
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-screen="title"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.logo-top')).toHaveText('Pawprints');
  const canvas = page.locator('#game canvas');
  await expect(canvas).toBeVisible();
  await context.setOffline(false);
});
