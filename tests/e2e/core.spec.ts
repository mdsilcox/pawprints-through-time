import { test, expect, type Page } from '@playwright/test';
import { bootToTitle, hook, press, watchErrors } from './helpers';

const MIN = 60_000;

async function play(page: Page, at?: [number, number]): Promise<void> {
  await bootToTitle(page);
  await hook(page, 'newGame', 1);
  await hook(page, 'startWorld');
  await expect.poll(() => hook<string[]>(page, 'scenes')).toContain('world');
  if (at) await hook(page, 'teleport', at[0], at[1], 0);
  await page.waitForTimeout(200);
}

/** Advance dialogue by pressing the action key until the box closes. */
async function finishDialogue(page: Page, max = 12) {
  for (let i = 0; i < max && (await hook<boolean>(page, 'dialogueOpen')); i++) {
    await page.waitForTimeout(160);
    await page.keyboard.press('KeyE');
  }
  await expect.poll(() => hook<boolean>(page, 'dialogueOpen')).toBe(false);
}

test.describe('dialogue & quests', () => {
  test('reading a sign opens a type-on dialogue box that skips and advances', async ({ page }) => {
    const errors = watchErrors(page);
    await play(page, [29.2, 27]);
    await hook(page, 'setSettings', { textSpeed: 'slow' });
    await expect.poll(() => hook(page, 'prompt')).toBe('Read');
    await page.keyboard.press('KeyE');
    const box = page.getByTestId('dialogue');
    await expect(box).toBeVisible();
    const text = page.getByTestId('dialogue-text');
    // type-on: the first line is still being written, a press completes it instantly
    const partial = (await text.textContent()) ?? '';
    const full = (await text.getAttribute('data-full')) ?? '';
    expect(full).toContain('TOCKWOOD PLAZA');
    expect(partial.length).toBeLessThan(full.length);
    await page.keyboard.press('KeyE');
    await expect(text).toHaveText(full);
    // advancing goes to the second line, then closes
    await page.waitForTimeout(200);
    await page.keyboard.press('KeyE');
    await expect(text).toHaveAttribute('data-full', /North: the old clocktower/);
    await finishDialogue(page);
    expect(await hook(page, 'getFlag', 'read:plaza-sign')).toBe(true);
    expect(errors).toEqual([]);
  });

  test('choices can be picked with keyboard or touch, and any player can answer', async ({ page }) => {
    await play(page);
    const answer = hook<number>(page, 'ask', 'pip', 'Which way, {players}?', ['North', 'South']);
    await expect(page.getByTestId('choice-1')).toBeVisible();
    await page.waitForTimeout(400);
    await press(page, '[data-testid="choice-1"]');
    expect(await answer).toBe(1);
    // player 2's arrows + "/" can answer too
    await hook(page, 'joinP2');
    const answer2 = hook<number>(page, 'ask', 'pip', 'Again?', ['Yes', 'No']);
    await expect(page.getByTestId('choice-0')).toBeVisible();
    await page.waitForTimeout(400);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Slash');
    expect(await answer2).toBe(1);
  });

  test('the island quest tracks progress on the HUD and completes with a reward', async ({ page }) => {
    await play(page);
    await expect(page.getByTestId('hud-objective')).toContainText('Walk up to the town plaza');
    const tockens = (await hook<any>(page, 'state')).tockens;
    await hook(page, 'teleport', 30.5, 22);
    await expect(page.getByTestId('hud-objective')).toContainText('Read the plaza signpost');
    await hook(page, 'setFlag', 'read:plaza-sign', true);
    await expect(page.getByTestId('hud-objective')).toContainText('beach');
    await hook(page, 'teleport', 36, 36);
    await expect(page.getByTestId('hud-objective')).toContainText('meadow');
    await hook(page, 'teleport', 11, 27);
    await expect.poll(async () => (await hook<any>(page, 'quests')).finished).toContain('explore-island');
    await expect.poll(async () => (await hook<any>(page, 'state')).tockens).toBe(tockens + 10);
    // the adventure log lists it as finished
    await press(page, '[data-testid="hud-objective"]').catch(async () => {
      await hook(page, 'openPause');
      await press(page, '[data-testid="pause-log"]');
    });
    if (!(await page.locator('[data-screen="questlog"]').count())) {
      await hook(page, 'openPause');
      await press(page, '[data-testid="pause-log"]');
    }
    await expect(page.locator('.questlog-panel')).toContainText('Explore Tockwood Isle');
  });
});

test.describe('saving', () => {
  test('position and progress survive a reload; backgrounding the app autosaves', async ({ page }) => {
    await play(page, [36, 36]);
    await hook(page, 'setFlag', 'savedThing', 'yes');
    // simulate the phone going to the home screen
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => hook<number>(page, 'saves')).toBeGreaterThan(0);
    await page.reload();
    await bootToTitle(page);
    await press(page, '[data-testid="title-continue"]');
    await expect.poll(() => hook<string[]>(page, 'scenes')).toContain('world');
    const p = (await hook<any[]>(page, 'players'))[0];
    expect(Math.abs(p.x - 36)).toBeLessThan(0.5);
    expect(Math.abs(p.y - 36)).toBeLessThan(0.5);
    expect(await hook(page, 'getFlag', 'savedThing')).toBe('yes');
  });

  test('manual save from the pause menu', async ({ page }) => {
    await play(page);
    const before = await hook<number>(page, 'saves');
    await page.keyboard.press('Escape');
    await press(page, '[data-testid="pause-save"]');
    await expect(page.locator('.toast')).toContainText('saved');
    const slots = await hook<any[]>(page, 'slots');
    expect(slots[0].exists).toBe(true);
    expect(before).toBeGreaterThanOrEqual(0);
  });
});

test.describe('pause menu & settings', () => {
  test('pausing freezes the world and offers every built system', async ({ page }) => {
    await play(page, [30.5, 27]);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-screen="pause"]')).toBeVisible();
    for (const id of ['pause-settings', 'pause-log', 'pause-resume', 'pause-save', 'pause-quit', 'pause-p2']) await expect(page.getByTestId(id)).toBeVisible();
    const a = (await hook<any[]>(page, 'players'))[0];
    await hook(page, 'hold', 0, 1, 0);
    await page.waitForTimeout(500);
    await hook(page, 'release', 0);
    const b = (await hook<any[]>(page, 'players'))[0];
    expect(b.x).toBeCloseTo(a.x, 2);
    await press(page, '[data-testid="pause-resume"]');
    await expect(page.locator('[data-screen="pause"]')).toHaveCount(0);
  });

  test('settings change the game and persist across reloads', async ({ page }) => {
    await play(page);
    await page.keyboard.press('Escape');
    await press(page, '[data-testid="pause-settings"]');
    await expect(page.locator('.settings-panel')).toBeVisible();
    // reminder interval
    await press(page, '[data-testid="set-reminder-15"]');
    expect((await hook<any>(page, 'reminderState')).intervalMs).toBe(15 * MIN);
    // mute + text speed + colourblind
    await press(page, '[data-testid="set-mute"]');
    await press(page, '[data-testid="set-text-instant"]');
    await press(page, '[data-testid="set-colorblind"]');
    // volume slider moves with the keyboard
    await page.getByTestId('set-volume').focus();
    const before = (await hook<any>(page, 'settings')).masterVolume;
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    const after = (await hook<any>(page, 'settings')).masterVolume;
    expect(after).toBeCloseTo(before - 0.2, 5);
    const s = await hook<any>(page, 'settings');
    expect(s).toMatchObject({ reminderMinutes: 15, muted: true, textSpeed: 'instant', colorblind: true });
    // the controls guide opens from settings
    await press(page, '[data-testid="set-controls"]');
    await expect(page.locator('.controls-panel')).toContainText('W A S D');
    await press(page, '[data-testid="controls-back"]');
    await press(page, '[data-testid="settings-done"]');
    // instant text: dialogue lines appear in full immediately
    await press(page, '[data-testid="pause-resume"]');
    void hook(page, 'talk', 'pip', 'Tick tock, all at once!');
    await expect(page.getByTestId('dialogue-text')).toHaveText('Tick tock, all at once!', { timeout: 300 });
    await finishDialogue(page);
    await page.reload();
    await bootToTitle(page);
    expect(await hook<any>(page, 'settings')).toMatchObject({ reminderMinutes: 15, muted: true, textSpeed: 'instant' });
    // settings are reachable from the title screen too
    await press(page, '[data-testid="title-settings"]');
    await expect(page.locator('.settings-panel')).toBeVisible();
  });
});

test.describe('playtime reminder', () => {
  test('Pip reminds at 45 minutes, allows two snoozes, then turns firm; taking a break saves and says goodbye', async ({ page }) => {
    await play(page);
    expect((await hook<any>(page, 'reminderState')).intervalMs).toBe(45 * MIN);
    await hook(page, 'fastForward', 44 * MIN);
    await page.waitForTimeout(300);
    await expect(page.getByTestId('reminder')).toHaveCount(0);
    const savesBefore = await hook<number>(page, 'saves');
    await hook(page, 'fastForward', 1 * MIN);
    const rem = page.getByTestId('reminder');
    await expect(rem).toBeVisible();
    await expect(rem).toHaveAttribute('data-kind', 'reminder');
    await expect(rem.locator('.reminder-pip')).toBeVisible();
    await expect(page.getByTestId('reminder-snooze')).toContainText('2 left');
    await expect.poll(() => hook<number>(page, 'saves')).toBeGreaterThan(savesBefore); // autosaved
    // the world is frozen while Pip talks
    expect(await hook<string[]>(page, 'ui')).toContain('reminder');
    await press(page, '[data-testid="reminder-snooze"]');
    await expect(rem).toHaveCount(0);
    await hook(page, 'fastForward', 4 * MIN);
    await page.waitForTimeout(200);
    await expect(page.getByTestId('reminder')).toHaveCount(0);
    await hook(page, 'fastForward', 1 * MIN);
    await expect(page.getByTestId('reminder-snooze')).toContainText('1 left');
    await press(page, '[data-testid="reminder-snooze"]');
    await hook(page, 'fastForward', 5 * MIN);
    // third time: firm, no more snoozing, but you can still continue
    await expect(page.getByTestId('reminder')).toBeVisible();
    await expect(page.getByTestId('reminder-snooze')).toHaveCount(0);
    await expect(page.locator('.reminder-screen.firm')).toBeVisible();
    await press(page, '[data-testid="reminder-continue"]');
    await expect(page.getByTestId('reminder')).toHaveCount(0);
    await hook(page, 'fastForward', 5 * MIN);
    await expect(page.locator('.reminder-screen.firm')).toBeVisible();
    // take a break -> gentle goodbye -> title
    await press(page, '[data-testid="reminder-break"]');
    await expect(page.getByTestId('goodbye')).toBeVisible();
    await expect(page.getByTestId('goodbye')).toContainText('See you soon');
    await press(page, '[data-testid="goodbye-ok"]');
    await expect(page.locator('[data-screen="title"]')).toBeVisible();
    expect(await hook<string[]>(page, 'scenes')).toContain('title');
    expect((await hook<any>(page, 'reminderState')).state).toBe('idle');
  });

  test('uses the interval chosen in settings and pauses while the app is in the background', async ({ page }) => {
    await play(page);
    await hook(page, 'setSettings', { reminderMinutes: 15 });
    await hook(page, 'fastForward', 10 * MIN);
    // 20 minutes in the background (a real break) starts a fresh session
    expect(await hook<boolean>(page, 'simulateBackground', 20 * MIN)).toBe(true);
    expect((await hook<any>(page, 'reminderState')).elapsedMs).toBeLessThan(MIN);
    await hook(page, 'fastForward', 14 * MIN);
    await page.waitForTimeout(200);
    await expect(page.getByTestId('reminder')).toHaveCount(0);
    await hook(page, 'fastForward', 1 * MIN);
    await expect(page.getByTestId('reminder')).toBeVisible();
  });

  test('late-night nudge and two-player wording', async ({ page }) => {
    await play(page);
    await hook(page, 'joinP2');
    await hook(page, 'triggerLateNight');
    const rem = page.getByTestId('reminder');
    await expect(rem).toHaveAttribute('data-kind', 'late');
    await expect(rem).toContainText('late');
    await press(page, '[data-testid="reminder-continue"]');
    await expect(rem).toHaveCount(0);
    await hook(page, 'triggerReminder');
    await press(page, '[data-testid="reminder-break"]');
    const state = await hook<any>(page, 'state');
    await expect(page.getByTestId('goodbye')).toContainText(`${state.players[0].name} and ${state.players[1].name}`);
  });
});
