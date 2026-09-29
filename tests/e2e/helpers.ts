import { expect, type Page } from '@playwright/test';

/** Collects console errors / page errors so tests can assert a clean run. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/** Load the game and wait until the title menu is interactive. */
export async function bootToTitle(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__game?.ready?.() === true, null, { timeout: 60_000 });
  await expect(page.locator('[data-screen="title"]')).toBeVisible();
}

/** Call a `window.__game` debug hook and return its (awaited) result. */
export async function hook<T = unknown>(page: Page, name: string, ...args: unknown[]): Promise<T> {
  return page.evaluate(
    async ([n, a]) => {
      const g = (window as any).__game;
      if (!g || typeof g[n as string] !== 'function') throw new Error(`missing debug hook ${n}`);
      return await g[n as string](...(a as unknown[]));
    },
    [name, args] as const,
  ) as Promise<T>;
}

export async function activeScenes(page: Page): Promise<string[]> {
  return hook<string[]>(page, 'scenes');
}

/** Tap on touch projects, click otherwise. */
export async function press(page: Page, selector: string): Promise<void> {
  const loc = page.locator(selector).first();
  await expect(loc).toBeVisible();
  // Menus ignore presses for ~0.3s after a screen opens/closes (anti double-tap), like a real player's pace.
  await page.waitForTimeout(330);
  const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
  if (touch) await loc.tap();
  else await loc.click();
}
