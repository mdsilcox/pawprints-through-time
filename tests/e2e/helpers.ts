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
  // Tests run at any time of day: pin the device clock to noon so the (real) late-night
  // nudge doesn't pop up in the middle of unrelated tests. The nudge has its own test.
  await page.addInitScript(() => {
    (window as unknown as { __testDeviceHour: number }).__testDeviceHour = 12;
  });
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

/** New game in slot 1, skip the opening story, walk into Tockwood (optionally teleport). */
export async function startGame(page: Page, at?: [number, number], opts: { opening?: boolean } = {}): Promise<void> {
  await bootToTitle(page);
  await hook(page, 'newGame', 1);
  if (!opts.opening) await hook(page, 'skipOpening');
  await hook(page, 'startWorld');
  await expect.poll(() => hook<string[]>(page, 'scenes')).toContain('world');
  await page.waitForTimeout(150);
  if (at) await hook(page, 'teleport', at[0], at[1], 0);
  await page.waitForTimeout(150);
}

/** Press the action key through dialogue (picking the first choice) until no scene/dialogue is open. */
export async function playThrough(page: Page, maxMs = 30_000): Promise<void> {
  const end = Date.now() + maxMs;
  let quiet = 0;
  while (Date.now() < end) {
    const ids = await hook<string[]>(page, 'ui');
    if (!ids.includes('dialogue') && !ids.includes('cutscene')) {
      quiet++;
      if (quiet >= 3) return;
      await page.waitForTimeout(250);
      continue;
    }
    quiet = 0;
    if (ids.includes('dialogue')) {
      const choice = page.getByTestId('choice-0');
      if (await choice.isVisible().catch(() => false)) {
        await page.waitForTimeout(330);
        await choice.click();
      } else {
        await page.keyboard.press('KeyE');
      }
    }
    await page.waitForTimeout(180);
  }
  throw new Error('cutscene/dialogue did not finish');
}

/** Hold a direction for player 1 until they have moved `dist` tiles (robust under CPU load). */
export async function walkUntil(page: Page, dx: number, dy: number, dist: number, timeout = 6000): Promise<void> {
  const start = (await hook<{ x: number; y: number }[]>(page, 'players'))[0];
  await hook(page, 'hold', 0, dx, dy);
  try {
    await expect
      .poll(async () => {
        const p = (await hook<{ x: number; y: number }[]>(page, 'players'))[0];
        return Math.hypot(p.x - start.x, p.y - start.y);
      }, { timeout })
      .toBeGreaterThan(dist);
  } finally {
    await hook(page, 'release', 0);
  }
}

/** Press a key until `done()` is true (a player would press again if the first tap didn't land). */
export async function pressUntil(page: Page, key: string, done: () => Promise<boolean>, tries = 4): Promise<void> {
  for (let i = 0; i < tries; i++) {
    await page.keyboard.press(key);
    try {
      await expect.poll(done, { timeout: 2500 }).toBe(true);
      return;
    } catch {
      /* try again */
    }
  }
  await expect.poll(done, { timeout: 2500 }).toBe(true);
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
