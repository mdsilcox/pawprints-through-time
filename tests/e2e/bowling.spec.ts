import { test, expect, type Page } from '@playwright/test';
import { hook, press, startGame, watchErrors } from './helpers';
import { gameOver, scorecard, totalScore } from '../../src/bowling/score';

interface BowlState {
  phase: string;
  frame: number;
  turn: number;
  standX: number;
  angle: number;
  power: number;
  spinUsed: number;
  lastThrow: { x: number; angle: number; speed: number; spin: number } | null;
  xAtPins: number | null;
  bowlers: { name: string; npc: boolean; rolls: number[]; total: number }[];
  finished: boolean;
  standing: number;
  trick: string | null;
  tries: number;
  cleared: boolean;
}
const st = (page: Page) => hook<BowlState | null>(page, 'bowlState');

async function startBowling(page: Page, rival: string | null = null) {
  await hook(page, 'openBowl', rival);
  await expect(page.getByTestId('bowl-setup')).toBeVisible();
  await press(page, '[data-testid="bowl-start"]');
  // (on the autopilot the lane moves quickly — any phase means the game is on)
  await expect.poll(async () => (await st(page))?.phase ?? null, { timeout: 10_000 }).not.toBeNull();
}

test.describe('bowling', () => {
  test('keyboard: step, aim, pick the power, steer the spin — the pins fall and the scorecard marks it', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    await startBowling(page);
    await expect(page.getByTestId('bowl-card')).toBeVisible();
    await page.waitForTimeout(400);
    await page.keyboard.down('KeyD');
    await expect.poll(async () => (await st(page))!.standX, { timeout: 5000 }).toBeGreaterThan(1);
    await page.keyboard.up('KeyD');
    await page.keyboard.press('KeyE');
    await expect.poll(async () => (await st(page))!.phase).toBe('aim');
    await page.waitForTimeout(350);
    await page.keyboard.down('KeyA');
    await expect.poll(async () => (await st(page))!.angle, { timeout: 5000 }).toBeLessThan(-0.002);
    await page.keyboard.up('KeyA');
    await page.keyboard.press('KeyE');
    await expect.poll(async () => (await st(page))!.phase).toBe('power');
    await page.waitForTimeout(600);
    await page.keyboard.press('KeyE');
    await expect.poll(async () => (await st(page))!.phase).toBe('rolling');
    // hold left while it rolls: it curves
    await page.keyboard.down('KeyA');
    await expect.poll(async () => (await st(page))!.spinUsed, { timeout: 5000 }).toBeLessThan(-0.5);
    await page.keyboard.up('KeyA');
    await expect.poll(async () => (await st(page))!.bowlers[0].rolls.length, { timeout: 20_000 }).toBe(1);
    const s = (await st(page))!;
    const n = s.bowlers[0].rolls[0];
    const mark = scorecard(s.bowlers[0].rolls)[0].marks[0];
    expect(mark).toBe(n === 10 ? 'X' : n === 0 ? '-' : String(n));
    await expect(page.getByTestId('bowl-row-0')).toContainText(mark);
    expect(errors).toEqual([]);
  });

  test('a full ten-frame game: strikes, spares and the tenth frame, scored like the real thing', async ({ page }) => {
    test.setTimeout(240_000);
    await startGame(page, [30.5, 24]);
    await hook(page, 'bowlSpeed', 6);
    await hook(page, 'bowlAuto', true);
    await startBowling(page);
    await expect(page.getByTestId('bowl-results')).toBeVisible({ timeout: 200_000 });
    const s = (await st(page))!;
    const rolls = s.bowlers[0].rolls;
    expect(gameOver(rolls)).toBe(true);
    expect(s.bowlers[0].total).toBe(totalScore(rolls));
    await expect(page.getByTestId('bowl-total-0')).toHaveText(String(totalScore(rolls)));
    await expect(page.getByTestId('bowl-result-0')).toContainText(`${totalScore(rolls)} points`);
    // every frame on the card has its marks and a running total
    const card = scorecard(rolls);
    expect(card).toHaveLength(10);
    expect(card.every((f) => f.total !== null)).toBe(true);
    await press(page, '[data-testid="bowl-done"]');
    await expect.poll(() => hook<string[]>(page, 'scenes')).not.toContain('bowl');
    await expect(page.getByTestId('bowl-card')).toHaveCount(0);
  });

  test('two players (and a rival) take turns, frame by frame, each with their own score', async ({ page }) => {
    test.setTimeout(300_000);
    await startGame(page, [30.5, 24]);
    await hook(page, 'joinP2');
    await hook(page, 'bowlSpeed', 6);
    await hook(page, 'bowlAuto', true);
    await startBowling(page, 'rollo');
    // turn order: P1, P2, then Rollo, every frame
    await expect.poll(async () => (await st(page))!.turn, { timeout: 30_000 }).toBe(1);
    await expect.poll(async () => (await st(page))!.turn, { timeout: 30_000 }).toBe(2);
    let s = (await st(page))!;
    expect(s.bowlers.map((b) => b.npc)).toEqual([false, false, true]);
    expect(s.bowlers[0].rolls.length).toBeGreaterThan(0);
    expect(s.bowlers[1].rolls.length).toBeGreaterThan(0);
    await expect(page.getByTestId('bowl-results')).toBeVisible({ timeout: 280_000 });
    s = (await st(page))!;
    for (const [i, b] of s.bowlers.entries()) {
      expect(gameOver(b.rolls)).toBe(true);
      await expect(page.getByTestId(`bowl-total-${i}`)).toHaveText(String(totalScore(b.rolls)));
    }
    await expect(page.getByTestId('bowl-result-2')).toContainText('Rollo');
  });

  test('trick shots unlock after a whole game: clear “Hello, Head Pin”, then the next one opens (three tries each)', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    await hook(page, 'openBowl', null, 0.3, true);
    await expect(page.getByTestId('bowl-setup')).toBeVisible();
    // locked until you've bowled a whole game
    await press(page, '[data-testid="bowl-tricks"]');
    await expect(page.getByTestId('bowl-trick-head-pin')).toBeDisabled();
    await press(page, '[data-testid="bowl-tricks-back"]');
    await press(page, '[data-testid="bowl-cancel"]');
    await hook(page, 'setFlag', 'bowled', true);
    const tockens = (await hook<any>(page, 'state')).tockens;
    await hook(page, 'openBowl', null, 0.3, true);
    await press(page, '[data-testid="bowl-bumpers"]'); // bumpers off: a real trick shot
    await press(page, '[data-testid="bowl-tricks"]');
    await expect(page.getByTestId('bowl-trick-head-pin')).toBeEnabled();
    await expect(page.getByTestId('bowl-trick-corner')).toBeDisabled();
    await press(page, '[data-testid="bowl-trick-head-pin"]');
    await expect.poll(async () => (await st(page))?.trick ?? null, { timeout: 10_000 }).toBe('head-pin');
    await expect(page.getByTestId('bowl-trick')).toContainText('Hello, Head Pin');
    expect((await st(page))!.standing).toBe(1);
    // one good ball
    await expect.poll(() => hook<boolean>(page, 'bowlThrow', -15, 1.0, 250, 0), { timeout: 10_000 }).toBe(true);
    await expect(page.getByTestId('bowl-results')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('bowl-results')).toHaveAttribute('data-won', 'true');
    expect(await hook(page, 'getFlag', 'trick:head-pin')).toBe(true);
    expect((await hook<any>(page, 'state')).tockens).toBe(tockens + 10);
    // the next trick shot opens straight from the results
    await press(page, '[data-testid="bowl-next-trick"]');
    await expect.poll(async () => (await st(page))?.trick ?? null, { timeout: 10_000 }).toBe('corner');
    // three misses and it's "so close" (with a tip), not a scolding
    for (let i = 0; i < 3; i++) {
      await expect.poll(() => hook<boolean>(page, 'bowlThrow', -15, -3.0, 250, 0), { timeout: 15_000 }).toBe(true);
      await expect.poll(async () => (await st(page))!.tries, { timeout: 15_000 }).toBe(i + 1);
    }
    await expect(page.getByTestId('bowl-results')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('bowl-results')).toHaveAttribute('data-won', 'false');
    await expect(page.getByTestId('bowl-results')).toContainText('Tip');
    expect(await hook(page, 'getFlag', 'trick:corner')).toBeFalsy();
    await press(page, '[data-testid="bowl-done"]');
    await expect(page.getByTestId('bowl-results')).toHaveCount(0);
    await expect.poll(() => hook<string[]>(page, 'scenes')).toContain('world');
    expect(errors).toEqual([]);
  });

  test('touch: swipe up to bowl — a curved swipe spins the ball, a straight swipe doesn’t', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'swipes are the phone’s controls');
    await startGame(page, [30.5, 24]);
    await startBowling(page);
    await page.waitForTimeout(500);
    const box = (await page.locator('#game canvas').boundingBox())!;
    const swipe = async (bend: number) => {
      const x = box.x + box.width / 2;
      const y0 = box.y + box.height * 0.85;
      const y1 = box.y + box.height * 0.4;
      await page.mouse.move(x, y0);
      await page.mouse.down();
      for (let i = 1; i <= 10; i++) {
        const t = i / 10;
        await page.mouse.move(x + Math.sin(t * Math.PI) * bend, y0 + (y1 - y0) * t);
      }
      await page.mouse.up();
    };
    await swipe(0);
    await expect.poll(async () => (await st(page))!.phase).toBe('rolling');
    const straight = (await st(page))!.lastThrow!;
    expect(straight.spin).toBe(0);
    await expect.poll(async () => (await st(page))!.bowlers[0].rolls.length, { timeout: 20_000 }).toBe(1);
    await expect.poll(async () => (await st(page))!.phase, { timeout: 10_000 }).toBe('position');
    await page.waitForTimeout(400);
    await swipe(70);
    await expect.poll(async () => (await st(page))!.phase).toBe('rolling');
    const curved = (await st(page))!.lastThrow!;
    expect(Math.abs(curved.spin)).toBeGreaterThan(0.3);
  });
});
