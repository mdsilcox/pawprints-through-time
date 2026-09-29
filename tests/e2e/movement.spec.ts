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

test.describe('movement & controls', () => {
  test('player 1 walks with WASD, and arrow keys also work in 1-player mode', async ({ page }) => {
    const errors = watchErrors(page);
    await startAt(page);
    const a = (await players(page))[0];
    await holdKey(page, 'KeyD', 800);
    const b = (await players(page))[0];
    expect(b.x - a.x).toBeGreaterThan(1);
    expect(b.facing).toBe('right');
    await holdKey(page, 'KeyW', 500);
    const c = (await players(page))[0];
    expect(c.y).toBeLessThan(b.y - 0.8);
    expect(c.facing).toBe('up');
    await holdKey(page, 'ArrowLeft', 500);
    const d = (await players(page))[0];
    expect(d.x).toBeLessThan(c.x - 0.8);
    expect(errors).toEqual([]);
  });

  test('player 2 drops in from the pause menu, uses the arrow keys, and drops out', async ({ page }) => {
    await startAt(page);
    await press(page, '[data-testid="hud-pause"]');
    await press(page, '[data-testid="pause-p2"]');
    await press(page, '[data-testid="pause-resume"]');
    await expect.poll(async () => (await players(page)).length).toBe(2);
    const [p1a, p2a] = await players(page);
    await holdKey(page, 'ArrowDown', 500);
    const [p1b, p2b] = await players(page);
    expect(p2b.y - p2a.y).toBeGreaterThan(0.8);
    expect(Math.abs(p1b.y - p1a.y)).toBeLessThan(0.05); // arrows no longer move P1
    await holdKey(page, 'KeyA', 400);
    const [p1c, p2c] = await players(page);
    expect(p1c.x).toBeLessThan(p1b.x - 0.6);
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
    await page.waitForTimeout(3500);
    expect(await hook(page, 'onScreen', 0)).toBe(true);
    expect(await hook(page, 'onScreen', 1)).toBe(true);
    const [p1, p2] = await players(page);
    expect(p2.x - p1.x).toBeGreaterThan(8); // they did walk apart, the camera pulled back
    // ... and vertically
    await hook(page, 'hold', 0, 0, -1);
    await hook(page, 'hold', 1, 0, 1);
    await page.waitForTimeout(3000);
    expect(await hook(page, 'onScreen', 0)).toBe(true);
    expect(await hook(page, 'onScreen', 1)).toBe(true);
    await hook(page, 'release', 0);
    await hook(page, 'release', 1);
  });

  test('water and buildings block the way', async ({ page }) => {
    await startAt(page, 30.5, 43.5); // end of the dock
    await hook(page, 'hold', 0, 1, 0); // walk right off the dock
    await page.waitForTimeout(800);
    await hook(page, 'release', 0);
    const p = (await players(page))[0];
    expect(p.x).toBeLessThan(32); // stayed on the 2-tile-wide dock
    // walk north into the clocktower from the plaza
    await hook(page, 'teleport', 30.5, 18.5, 0);
    await hook(page, 'hold', 0, 0, -1);
    await page.waitForTimeout(1200);
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
    await page.waitForTimeout(600);
    await touch('touchEnd', []);
    const b = (await players(page))[0];
    expect(b.x - a.x).toBeGreaterThan(1);

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
    await page.waitForTimeout(500);
    await touch('touchEnd', []);
    const [p1b, p2b] = await players(page);
    expect(p1b.y).toBeLessThan(p1a.y - 0.5); // P1 went up
    expect(p2b.y).toBeGreaterThan(p2a.y + 0.5); // P2 went down
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
