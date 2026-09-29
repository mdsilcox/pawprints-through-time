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

/** Press through dialogue (tapping the first choice) until the box stays closed. */
export async function advanceDialogue(page: Page, max = 30): Promise<void> {
  for (let i = 0; i < max; i++) {
    if (!(await hook<boolean>(page, 'dialogueOpen'))) {
      await page.waitForTimeout(500);
      if (!(await hook<boolean>(page, 'dialogueOpen'))) return;
    }
    if (await page.getByTestId('choice-0').isVisible().catch(() => false)) {
      await press(page, '[data-testid="choice-0"]');
      continue;
    }
    await page.waitForTimeout(160);
    await page.keyboard.press('KeyE');
  }
}

/** Walk up to a neighbour (they wander) and chat until the conversation ends. */
export async function talkTo(page: Page, npc: string): Promise<void> {
  const list = await hook<{ id: string; x: number; y: number }[]>(page, 'npcs');
  const n = list.find((x) => x.id === npc)!;
  expect(n).toBeTruthy();
  // neighbours wander a little, so keep stepping up to them until the prompt shows
  await expect
    .poll(async () => {
      const cur = (await hook<{ id: string; x: number; y: number }[]>(page, 'npcs')).find((x) => x.id === npc)!;
      await hook(page, 'teleport', cur.x, cur.y + 0.9, 0);
      // a second player tags along right behind
      if ((await hook<unknown[]>(page, 'players')).length === 2) await hook(page, 'teleport', cur.x + 1, cur.y + 1.4, 1);
      await page.waitForTimeout(120);
      return hook(page, 'prompt');
    }, { timeout: 12000 })
    .toBe('Talk');
  await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
  await advanceDialogue(page);
}

/** Pretend the app went to the background / came back (real visibilitychange event). */
export async function setHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((hid) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hid });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hid ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

/** Pin the device clock the reminder sees (tests default to noon). */
export async function setDeviceHour(page: Page, hour: number): Promise<void> {
  await page.evaluate((hr) => {
    (window as unknown as { __testDeviceHour: number }).__testDeviceHour = hr;
  }, hour);
}
