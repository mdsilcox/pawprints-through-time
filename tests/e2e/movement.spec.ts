import { test, expect, type Page } from '@playwright/test';
import { bootToTitle, hook, playThrough, press, startGame, watchErrors } from './helpers';

type Pos = { x: number; y: number; facing: string };

async function startAt(page: Page, x = 30.5, y = 27): Promise<void> {
  await startGame(page, [x, y]);
}

const players = (page: Page) => hook<Pos[]>(page, 'players');

async function holdKey(page: Page, code: string, ms: number) {
  await page.keyboard.down(code);
  await page.waitForTimeout(ms);
  await page.keyboard.up(code);
  await page.waitForTimeout(80);
}

/** Hold a key until player `i` has moved at least `dist` tiles along the expected axis (load-proof). */
async function holdKeyUntil(page: Page, code: string, i: 0 | 1, axis: 'x' | 'y', sign: 1 | -1, dist: number) {
  const start = (await players(page))[i];
  await page.keyboard.down(code);
  try {
    await expect.poll(async () => ((await players(page))[i][axis] - start[axis]) * sign, { timeout: 8000 }).toBeGreaterThan(dist);
  } finally {
    await page.keyboard.up(code);
    await page.waitForTimeout(80);
  }
}

test.describe('movement & controls', () => {
  test('player 1 walks with WASD, and arrow keys also work in 1-player mode', async ({ page }) => {
    const errors = watchErrors(page);
    await startAt(page);
    await holdKeyUntil(page, 'KeyD', 0, 'x', 1, 1);
    expect((await players(page))[0].facing).toBe('right');
    await holdKeyUntil(page, 'KeyW', 0, 'y', -1, 0.8);
    expect((await players(page))[0].facing).toBe('up');
    await holdKeyUntil(page, 'ArrowLeft', 0, 'x', -1, 0.8);
    expect(errors).toEqual([]);
  });

  test('player 2 drops in from the pause menu, uses the arrow keys, and drops out', async ({ page }) => {
    await startAt(page);
    await press(page, '[data-testid="hud-pause"]');
    await press(page, '[data-testid="pause-p2"]');
    await press(page, '[data-testid="pause-resume"]');
    await expect.poll(async () => (await players(page)).length).toBe(2);
    const [p1a] = await players(page);
    await holdKeyUntil(page, 'ArrowDown', 1, 'y', 1, 0.8);
    const [p1b, p2b] = await players(page);
    expect(Math.abs(p1b.y - p1a.y)).toBeLessThan(0.05); // arrows no longer move P1
    await holdKeyUntil(page, 'KeyA', 0, 'x', -1, 0.6);
    const [, p2c] = await players(page);
    expect(Math.abs(p2c.x - p2b.x)).toBeLessThan(0.05);
    // leave again
    await press(page, '[data-testid="hud-pause"]');
    await press(page, '[data-testid="pause-p2"]');
    await press(page, '[data-testid="pause-resume"]');
    await expect.poll(async () => (await players(page)).length).toBe(1);
  });

  test('the shared camera keeps both players on screen (soft tether)', async ({ page }) => {
    await startAt(page, 30.5, 27);
    await hook(page, 'joinP2');
    await hook(page, 'teleport', 31.5, 27, 1);
    // pull in opposite directions for a long time
    await hook(page, 'hold', 0, -1, 0);
    await hook(page, 'hold', 1, 1, 0);
    // they walk apart (the camera pulls back) until the tether stops them
    await expect.poll(async () => {
      const [p1, p2] = await players(page);
      return p2.x - p1.x;
    }, { timeout: 15000 }).toBeGreaterThan(8);
    // keep pulling: the tether holds them and the camera keeps both in view
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(250);
      expect(await hook(page, 'onScreen', 0)).toBe(true);
      expect(await hook(page, 'onScreen', 1)).toBe(true);
    }
    // ... and vertically
    const [v1, v2] = await players(page);
    await hook(page, 'hold', 0, 0, -1);
    await hook(page, 'hold', 1, 0, 1);
    await expect
      .poll(async () => {
        const [p1, p2] = await players(page);
        return p1.y < v1.y - 1 && p2.y > v2.y + 1;
      }, { timeout: 15000 })
      .toBe(true);
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(250);
      expect(await hook(page, 'onScreen', 0)).toBe(true);
      expect(await hook(page, 'onScreen', 1)).toBe(true);
    }
    await hook(page, 'release', 0);
    await hook(page, 'release', 1);
  });

  test('water and buildings block the way', async ({ page }) => {
    await startAt(page, 30.5, 43.5); // end of the dock
    // walk right off the dock: they reach the edge and stop there
    await hook(page, 'hold', 0, 1, 0);
    await expect.poll(async () => (await players(page))[0].x, { timeout: 8000 }).toBeGreaterThan(31);
    await page.waitForTimeout(700);
    await hook(page, 'release', 0);
    const p = (await players(page))[0];
    expect(p.x).toBeLessThan(32); // stayed on the 2-tile-wide dock
    // walk north into the clocktower wall from the plaza
    await hook(page, 'teleport', 30.5, 18.5, 0);
    await hook(page, 'hold', 0, 0, -1);
    await expect.poll(async () => (await players(page))[0].y, { timeout: 8000 }).toBeLessThan(18);
    await page.waitForTimeout(900);
    await hook(page, 'release', 0);
    const q = (await players(page))[0];
    expect(q.y).toBeGreaterThan(16);
  });

  test('gamepads: stick moves player 1, Start on a second pad drops in player 2', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__pads = [];
      navigator.getGamepads = () => (window as any).__pads;
    });
    await startAt(page);
    const setPads = (pads: { axes: number[]; pressed: number[] }[]) =>
      page.evaluate((list) => {
        (window as any).__pads = list.map((p, index) => ({
          index,
          connected: true,
          id: `test-pad-${index}`,
          mapping: 'standard',
          axes: p.axes,
          buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: p.pressed.includes(i), value: p.pressed.includes(i) ? 1 : 0 })),
        }));
      }, pads);
    const a = (await players(page))[0];
    await setPads([{ axes: [1, 0, 0, 0], pressed: [] }]);
    await expect.poll(async () => (await players(page))[0].x - a.x, { timeout: 6000 }).toBeGreaterThan(1);
    await setPads([{ axes: [0, 0, 0, 0], pressed: [] }]);
    await setPads([
      { axes: [0, 0, 0, 0], pressed: [] },
      { axes: [0, 0, 0, 0], pressed: [9] },
    ]);
    await expect.poll(async () => (await players(page)).length).toBe(2);
    // second pad now moves player 2
    const [, p2a] = await players(page);
    await setPads([
      { axes: [0, 0, 0, 0], pressed: [] },
      { axes: [0, 1, 0, 0], pressed: [] },
    ]);
    await expect.poll(async () => (await players(page))[1].y - p2a.y, { timeout: 6000 }).toBeGreaterThan(0.8);
    await setPads([]);
  });

  test('menus work with the keyboard alone', async ({ page }) => {
    await bootToTitle(page);
    await page.waitForTimeout(350);
    await page.keyboard.press('Enter'); // "New Game" is focused
    await expect(page.locator('[data-screen="slots"]')).toBeVisible();
    await page.waitForTimeout(350);
    await page.keyboard.press('KeyS'); // slot 1 -> slot 2
    await page.keyboard.press('KeyE');
    await expect(page.locator('[data-screen="names"]')).toBeVisible();
    await page.waitForTimeout(350);
    await page.keyboard.press('Enter'); // "Let's go!" has focus
    await expect(page.locator('[data-screen="intro"]')).toBeVisible();
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(320);
      await page.keyboard.press('KeyE'); // page through the storybook
    }
    await expect.poll(() => hook<string[]>(page, 'scenes')).toContain('world');
    // the arrival cutscene talks first; play through it with the action key
    await expect.poll(() => hook<boolean>(page, 'dialogueOpen'), { timeout: 10000 }).toBe(true);
    await playThrough(page);
    expect(await hook<string[]>(page, 'ui')).toEqual([]);
    expect(await hook(page, 'slot')).toBe(2);
    await page.keyboard.press('Escape'); // pause
    await expect(page.locator('[data-screen="pause"]')).toBeVisible();
    await page.waitForTimeout(350);
    await page.keyboard.press('Escape'); // back = resume
    await expect(page.locator('[data-screen="pause"]')).toHaveCount(0);
  });
});

test.describe('touch controls', () => {
  test('virtual joystick moves the player, 2P splits the screen into two thumb zones', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'touch controls are for phones');
    await startAt(page);
    await expect(page.locator('.touch-controls')).toBeVisible();
    const cdp = await page.context().newCDPSession(page);
    const touch = async (type: string, points: { x: number; y: number; id: number }[]) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p) => ({ x: p.x, y: p.y, id: p.id })) } as any);
    const a = (await players(page))[0];
    await touch('touchStart', [{ x: 120, y: 260, id: 1 }]);
    await touch('touchMove', [{ x: 175, y: 260, id: 1 }]);
    await expect.poll(async () => (await players(page))[0].x - a.x, { timeout: 8000 }).toBeGreaterThan(1);
    await touch('touchEnd', []);

    // two players: each thumb zone drives its own player at the same time
    await press(page, '[data-testid="hud-p2"]');
    await expect.poll(async () => (await players(page)).length).toBe(2);
    await expect(page.locator('.touch-zone.p2')).toBeVisible();
    const [p1a, p2a] = await players(page);
    await touch('touchStart', [
      { x: 90, y: 250, id: 1 },
      { x: 560, y: 250, id: 2 },
    ]);
    await touch('touchMove', [
      { x: 90, y: 200, id: 1 },
      { x: 560, y: 300, id: 2 },
    ]);
    await expect
      .poll(async () => {
        const [p1b, p2b] = await players(page);
        return Math.min(p1a.y - p1b.y, p2b.y - p2a.y); // P1 went up AND P2 went down
      }, { timeout: 8000 })
      .toBeGreaterThan(0.5);
    await touch('touchEnd', []);
    // action buttons are big enough to hit with a thumb
    const box = await page.getByTestId('touch-a-p1').boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
  });
});

test.describe('controls regressions (M1 review)', () => {
  test('with an idle gamepad connected, one key press moves menu focus exactly one step', async ({ page }) => {
    await page.addInitScript(() => {
      const pad = { index: 0, connected: true, id: 'idle', mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
      navigator.getGamepads = () => [pad as unknown as Gamepad];
    });
    await startGame(page, [30.5, 24]);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-screen="pause"]')).toBeVisible();
    await page.waitForTimeout(350);
    await page.getByTestId('pause-resume').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('pause-p2')).toBeFocused();
    await page.keyboard.press('KeyD');
    await expect(page.getByTestId('pause-save')).toBeFocused();
  });

  test('clicking the 👥 button never leaves Enter toggling player 2', async ({ page }, info) => {
    test.skip(info.project.name === 'phone', 'mouse + keyboard scenario');
    await startGame(page, [29.2, 27]);
    await page.getByTestId('hud-p2').click();
    await expect.poll(async () => (await hook<any[]>(page, 'players')).length).toBe(2);
    await hook(page, 'teleport', 29.2, 27, 1); // player 2 at the signpost
    await page.waitForTimeout(400);
    await page.keyboard.press('Enter'); // P2's action key
    await expect.poll(() => hook<boolean>(page, 'dialogueOpen')).toBe(true);
    expect((await hook<any[]>(page, 'players')).length).toBe(2);
    expect(await hook(page, 'twoPlayer')).toBe(true);
  });
});
