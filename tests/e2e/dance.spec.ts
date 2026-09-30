import { test, expect, type Page } from '@playwright/test';
import { advanceDialogue, hook, playThrough, press, pressUntil, startGame, talkTo, watchErrors } from './helpers';

const P1: Record<string, string> = { left: 'KeyA', down: 'KeyS', up: 'KeyW', right: 'KeyD' };
const P2: Record<string, string> = { left: 'ArrowLeft', down: 'ArrowDown', up: 'ArrowUp', right: 'ArrowRight' };

interface DanceState {
  running: boolean;
  pos: number;
  notes: { t: number; lane: string }[];
  players: { player: number; points: number; combo: number; counts: Record<string, number>; frame: string; moves: number }[];
  rival: number | null;
}
const state = (page: Page) => hook<DanceState | null>(page, 'danceState');
const hits = (c: Record<string, number>) => c.perfect + c.great + c.good;

/**
 * Press each arrow as it lands. The timing runs inside the page, frame by frame on the game's own
 * song clock (a busy test machine can take a few hundred ms per round trip — far too slow to dance).
 */
async function danceNotes(page: Page, keys: Record<string, string>, count: number): Promise<void> {
  await page.evaluate(
    async ([k, n]) => {
      const g = (window as any).__game;
      const frame = () => new Promise((r) => requestAnimationFrame(r));
      for (const note of g.danceState().notes.slice(0, n)) {
        while (g.danceState().pos < note.t - 0.012) await frame();
        const code = (k as Record<string, string>)[note.lane];
        window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true }));
        await frame();
        window.dispatchEvent(new KeyboardEvent('keyup', { code, key: code, bubbles: true }));
      }
    },
    [keys, count] as const,
  );
}

async function openFloor(page: Page) {
  await expect.poll(() => hook(page, 'prompt'), { timeout: 8000 }).toBe('Dance!');
  await pressUntil(page, 'KeyE', async () => (await hook<boolean>(page, 'dialogueOpen')) || (await page.getByTestId('dance-setup').count()) > 0);
  await advanceDialogue(page); // Pip's first-time hello
  await expect(page.getByTestId('dance-setup')).toBeVisible();
}

/** The rest of the song on the autopilot, fast-forwarded (what's being tested has already happened). */
async function finishWithAutopilot(page: Page) {
  await hook(page, 'danceAuto', true);
  await hook(page, 'danceSpeed', 4);
  await expect(page.getByTestId('dance-results')).toBeVisible({ timeout: 90_000 });
  await hook(page, 'danceAuto', false);
  await hook(page, 'danceSpeed', 1);
}

test.describe('dancing', () => {
  test('the plaza dance floor: arrows land on the beat, hits are judged, and your dancer strikes every move', async ({ page }) => {
    test.setTimeout(150_000);
    const errors = watchErrors(page);
    await startGame(page, [26.4, 22.4]);
    await openFloor(page);
    await press(page, '[data-testid="dance-level-easy"]');
    await press(page, '[data-testid="dance-start"]');
    await expect.poll(async () => (await state(page))?.running, { timeout: 10_000 }).toBe(true);
    await expect(page.locator('.hud-left')).toBeHidden(); // the HUD steps aside (the pause button stays)
    await expect(page.getByTestId('hud-pause')).toBeVisible();
    // a move during the count-in: your dancer dances even without an arrow (a real key press)...
    await page.keyboard.press('KeyW');
    await expect.poll(async () => (await state(page))!.players[0].moves, { timeout: 5000 }).toBe(1);
    // ...and strikes the pose for that arrow (checked inside the page: the pose lasts a moment)
    const pose = await page.evaluate(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd' }));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', key: 'd' }));
      return (window as any).__game.danceState().players[0].frame as string;
    });
    expect(pose).toBe('dance-right');
    await danceNotes(page, P1, 10);
    const st = (await state(page))!;
    expect(hits(st.players[0].counts)).toBeGreaterThanOrEqual(8);
    // (judged at the moment of each key press: on-the-beat presses are Perfect or Great)
    expect(st.players[0].counts.perfect + st.players[0].counts.great).toBeGreaterThanOrEqual(7);
    expect(st.players[0].points).toBeGreaterThan(0);
    await finishWithAutopilot(page);
    await expect(page.getByTestId('dance-result-p1')).toContainText('points');
    await expect(page.getByTestId('dance-result-p1').locator('.dr-stars .on')).not.toHaveCount(0);
    await press(page, '[data-testid="dance-done"]');
    await expect.poll(() => hook<string[]>(page, 'scenes')).not.toContain('dance');
    await expect(page.locator('.hud-left')).toBeVisible();
    expect(await hook(page, 'getFlag', 'danced:jig')).toBe(true);
    expect(errors).toEqual([]);
  });

  test('a press is judged at the moment the key went down, not when the next frame gets round to it', async ({ page }) => {
    test.setTimeout(150_000);
    const errors = watchErrors(page);
    await startGame(page, [26.4, 22.4]);
    await hook(page, 'openDance', 'jig');
    await press(page, '[data-testid="dance-level-medium"]');
    await press(page, '[data-testid="dance-start"]');
    await expect.poll(async () => (await state(page))?.running, { timeout: 10_000 }).toBe(true);
    // each key goes down right on its note — then the page is kept busy for 80 ms, so the game only
    // sees the key a frame later. Judged by that frame, every hit would be ~70 ms late (a Great at
    // best on Medium); judged by the key's own moment, they're Perfect.
    await page.evaluate(async (keys) => {
      const g = (window as any).__game;
      const frame = () => new Promise((r) => requestAnimationFrame(r));
      for (const note of g.danceState().notes.slice(0, 10)) {
        while (g.danceState().pos < note.t - 0.004) await frame();
        const code = (keys as Record<string, string>)[note.lane];
        window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true }));
        const t0 = performance.now();
        while (performance.now() - t0 < 80) {
          /* busy: the next frame comes late */
        }
        await frame();
        window.dispatchEvent(new KeyboardEvent('keyup', { code, key: code, bubbles: true }));
      }
    }, P1);
    const st = (await state(page))!;
    expect(st.players[0].counts.perfect).toBeGreaterThanOrEqual(8);
    expect(errors).toEqual([]);
  });

  test('phone: one dancer uses both thumbs — ← ↓ under the left thumb, ↑ → under the right', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'the split lanes are for touchscreens');
    const errors = watchErrors(page);
    await startGame(page, [26.4, 22.4]);
    await hook(page, 'openDance', 'jig');
    await press(page, '[data-testid="dance-start"]');
    await expect.poll(async () => (await state(page))?.running, { timeout: 10_000 }).toBe(true);
    const { width: W, height: H } = page.viewportSize()!;
    const margin = Math.max(10, W * 0.02);
    const laneW = Math.min(W * 0.1, H * 0.17);
    const lanes: [number, string][] = [
      [margin + laneW * 0.5, 'dance-left'],
      [margin + laneW * 1.5, 'dance-squat'],
      [W - margin - laneW * 1.5, 'dance-cheer'],
      [W - margin - laneW * 0.5, 'dance-right'],
    ];
    // (each pose only lasts a moment, so it's read inside the page, right after the tap)
    for (const [i, [x, pose]] of lanes.entries()) {
      const frame = await page.evaluate(async ([cx, cy]) => {
        const canvas = document.querySelector('#game canvas') as HTMLCanvasElement;
        canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: cx, clientY: cy, pointerType: 'touch', bubbles: true, cancelable: true }));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return (window as any).__game.danceState().players[0].frame as string;
      }, [x, H * 0.62] as const);
      expect(frame).toBe(pose);
      expect((await state(page))!.players[0].moves).toBe(i + 1);
      await page.waitForTimeout(250);
    }
    // and a real finger on the right thumb's side counts too
    await page.touchscreen.tap(W - margin - laneW * 0.5, H * 0.62);
    await expect.poll(async () => (await state(page))!.players[0].moves, { timeout: 5000 }).toBe(5);
    expect(errors).toEqual([]);
  });

  test('stopping the floor in the moment after the last arrow still brings the results — nothing is left paused', async ({ page }) => {
    test.setTimeout(150_000);
    const errors = watchErrors(page);
    await startGame(page, [26.4, 22.4]);
    await hook(page, 'openDance', 'jig');
    await press(page, '[data-testid="dance-start"]');
    await hook(page, 'danceAuto', true);
    await hook(page, 'danceSpeed', 4); // (the song itself isn't what's being tested)
    // the last arrow is done: a moment of cheering before the results card...
    await expect.poll(async () => (await state(page))?.running, { timeout: 120_000, intervals: [50] }).toBe(false);
    // ...and right then the floor is stopped (the pause menu's "Stop dancing")
    await hook(page, 'stopScene', 'dance');
    await hook(page, 'danceAuto', false);
    await hook(page, 'danceSpeed', 1);
    await expect(page.getByTestId('dance-results')).toBeVisible();
    await press(page, '[data-testid="dance-done"]');
    await expect.poll(() => hook<string[]>(page, 'scenes')).not.toContain('dance');
    await expect(page.locator('.hud-left')).toBeVisible();
    const before = (await hook<{ x: number; y: number }[]>(page, 'players'))[0];
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(600);
    await page.keyboard.up('KeyA');
    expect((await hook<{ x: number; y: number }[]>(page, 'players'))[0].x).toBeLessThan(before.x - 0.3);
    expect(errors).toEqual([]);
  });

  test('two players dance side by side, each with their own lanes and score', async ({ page }) => {
    test.setTimeout(150_000);
    await startGame(page, [26.4, 22.4]);
    await hook(page, 'joinP2');
    await hook(page, 'teleport', 27.4, 22.6, 1);
    await openFloor(page);
    await press(page, '[data-testid="dance-level-easy"]');
    await press(page, '[data-testid="dance-start"]');
    await expect.poll(async () => (await state(page))?.running, { timeout: 10_000 }).toBe(true);
    expect((await state(page))!.players.map((p) => p.player)).toEqual([0, 1]);
    // only player 2 dances (the arrow keys): only player 2 scores
    await danceNotes(page, P2, 8);
    let st = (await state(page))!;
    expect(hits(st.players[1].counts)).toBeGreaterThanOrEqual(6);
    expect(hits(st.players[0].counts)).toBe(0);
    expect(st.players[0].counts.miss).toBeGreaterThanOrEqual(4);
    await finishWithAutopilot(page);
    await expect(page.getByTestId('dance-result-p1')).toBeVisible();
    await expect(page.getByTestId('dance-result-p2')).toBeVisible();
    st = (await state(page)) ?? st;
    await press(page, '[data-testid="dance-done"]');
  });

  test('leaving play mid-song or at the results card goes cleanly to the title, and Continue brings back a world you can play', async ({ page }, info) => {
    test.setTimeout(200_000);
    const errors = watchErrors(page);
    await startGame(page, [26.4, 22.4]);
    for (const at of ['song', 'results'] as const) {
      await hook(page, 'openDance', 'jig');
      await press(page, '[data-testid="dance-start"]');
      await expect.poll(async () => (await state(page))?.pos ?? -9, { timeout: 10_000 }).toBeGreaterThan(0.5);
      if (at === 'results') await finishWithAutopilot(page);
      // (what Pip's "Take a break", "Say goodnight" and Save & quit all do)
      await hook(page, 'toTitle');
      await expect(page.locator('[data-screen="title"]')).toBeVisible();
      await expect.poll(() => hook<string[]>(page, 'scenes')).not.toContain('world');
      expect(await hook<string[]>(page, 'scenes')).not.toContain('dance');
      await page.waitForTimeout(600);
      expect(await hook<string[]>(page, 'scenes')).not.toContain('world'); // nothing woke the world up behind the title
      await press(page, '[data-testid="title-continue"]');
      await expect.poll(() => hook<string[]>(page, 'scenes')).toContain('world');
      await expect(page.locator('.dancing')).toHaveCount(0);
      if (info.project.name === 'phone') await expect(page.getByTestId('touch-a-p1')).toBeVisible();
      // and the players can walk again
      const before = (await hook<{ x: number; y: number }[]>(page, 'players'))[0];
      await page.keyboard.down('KeyA');
      await page.waitForTimeout(600);
      await page.keyboard.up('KeyA');
      expect((await hook<{ x: number; y: number }[]>(page, 'players'))[0].x).toBeLessThan(before.x - 0.3);
    }
    expect(errors).toEqual([]);
  });

  test('“Just dance”: no scores and nothing to fail — and pausing freezes the song and the arrows', async ({ page }) => {
    test.setTimeout(150_000);
    await startGame(page, [26.4, 22.4]);
    await openFloor(page);
    await press(page, '[data-testid="dance-relaxed"]');
    await expect(page.getByTestId('dance-relaxed')).toHaveAttribute('aria-pressed', 'true');
    await press(page, '[data-testid="dance-start"]');
    await expect.poll(async () => (await state(page))?.pos ?? -9, { timeout: 10_000 }).toBeGreaterThan(1);
    // pause: the song clock stops
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('pause-resume')).toBeVisible();
    const a = (await state(page))!.pos;
    await page.waitForTimeout(800);
    expect(Math.abs((await state(page))!.pos - a)).toBeLessThan(0.05);
    await press(page, '[data-testid="pause-resume"]');
    await expect.poll(async () => (await state(page))!.pos, { timeout: 5000 }).toBeGreaterThan(a + 0.3);
    // miss everything: still a happy ending
    await expect(page.getByTestId('dance-results')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('dance-results')).toHaveAttribute('data-won', 'true');
    await expect(page.getByTestId('dance-result-p1')).toContainText('happy moves');
    await expect(page.getByTestId('dance-result-p1')).not.toContainText('points');
    await press(page, '[data-testid="dance-done"]');
    // the floor remembers your choice
    await openFloor(page);
    await expect(page.getByTestId('dance-relaxed')).toHaveAttribute('aria-pressed', 'true');
    await press(page, '[data-testid="dance-cancel"]');
  });

  test('the hornpipe dance-off: out-dance Cookie to win the crew’s respect (and a so-close retry)', async ({ page }) => {
    test.setTimeout(360_000);
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    for (const f of ['pip:companion', 'cove:arrived', 'crew:aboard', 'met:marigold', 'map:search', 'map:whole', 'met:cookie']) await hook(page, 'setFlag', f, true);
    await hook(page, 'goTo', 'cove', 'from-isle');
    await expect.poll(() => hook<string>(page, 'mapId')).toBe('cove');
    await page.waitForTimeout(900);
    // no sailing before the dance-off
    await hook(page, 'teleport', 40.9, 24.3, 0);
    await expect.poll(() => hook(page, 'prompt'), { timeout: 8000 }).toBe('Set sail');
    await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
    await expect(page.getByTestId('dialogue-text')).toHaveAttribute('data-full', /hornpipe/);
    await advanceDialogue(page);
    // first try: dance nothing at all — Cookie wins, and you can try again
    const talkCookie = async () => {
      await talkTo(page, 'cookie'); // "Let's dance!"
      await expect(page.getByTestId('dance-setup')).toBeVisible();
    };
    await talkCookie();
    await press(page, '[data-testid="dance-level-easy"]');
    await press(page, '[data-testid="dance-start"]');
    await expect.poll(async () => (await state(page))?.rival ?? 0, { timeout: 10_000 }).toBeGreaterThan(0);
    await expect(page.getByTestId('dance-results')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('dance-results')).toHaveAttribute('data-won', 'false');
    await expect(page.getByTestId('dance-results')).toContainText('Cookie');
    await press(page, '[data-testid="dance-done"]');
    await playThrough(page);
    expect(await hook(page, 'getFlag', 'crew:respect')).toBeFalsy();
    // second try, with perfect feet
    await talkCookie();
    await press(page, '[data-testid="dance-start"]');
    await finishWithAutopilot(page);
    await expect(page.getByTestId('dance-results')).toHaveAttribute('data-won', 'true');
    await press(page, '[data-testid="dance-done"]');
    await playThrough(page);
    expect(await hook(page, 'getFlag', 'crew:respect')).toBe(true);
    expect((await hook<any>(page, 'state')).notes).toContain('pirate-hornpipe');
    // the hornpipe now plays on Tockwood's dance floor too
    expect(await hook(page, 'getFlag', 'danced:hornpipe')).toBe(true);
    expect(errors).toEqual([]);
  });
});
