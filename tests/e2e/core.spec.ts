import { test, expect, type Page } from '@playwright/test';
import { bootToTitle, hook, playThrough, press, pressUntil, setDeviceHour, setHidden, startGame, talkTo, walkUntil, watchErrors } from './helpers';

const MIN = 60_000;

async function play(page: Page, at?: [number, number]): Promise<void> {
  await startGame(page, at);
  await page.waitForTimeout(100);
}

/** Press a button on Pip's cards. They ignore presses for their first 1.2-1.5 s (so nobody
 * skips Pip by mashing), so wait that out like a real player reading her message. */
async function pressPip(page: Page, testid: string): Promise<void> {
  await expect(page.getByTestId(testid)).toBeVisible();
  await page.waitForTimeout(1300);
  await press(page, `[data-testid="${testid}"]`);
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
  test('reading a sign opens the dialogue box', async ({ page }) => {
    const errors = watchErrors(page);
    await play(page, [29.2, 27]);
    await expect.poll(() => hook(page, 'prompt')).toBe('Read');
    await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
    await expect(page.getByTestId('dialogue')).toBeVisible();
    await playThrough(page);
    const lines = (await hook<{ who: string; text: string }[]>(page, 'dialogueLines')).map((l) => l.text).join(' ');
    expect(lines).toContain('TOCKWOOD PLAZA');
    expect(lines).toContain('North: the old clocktower');
    expect(await hook(page, 'getFlag', 'read:plaza-sign')).toBe(true);
    expect(errors).toEqual([]);
  });

  test('type-on text: one press shows the whole line, the next press moves on', async ({ page }) => {
    await play(page);
    await hook(page, 'setSettings', { textSpeed: 'slow' });
    const long = 'Tick tock! This is a rather long line of text so that it takes a good few seconds to type out, letter by letter, in the dialogue box.';
    void hook(page, 'talk', 'pip', [long, 'And this is the second line.']);
    const text = page.getByTestId('dialogue-text');
    await expect(text).toHaveAttribute('data-full', long);
    const partial = (await text.textContent()) ?? '';
    expect(partial.length).toBeLessThan(long.length);
    await page.keyboard.press('KeyE');
    await expect(text).toHaveText(long); // skipped to the full line
    await page.waitForTimeout(300);
    await page.keyboard.press('KeyE');
    await expect(text).toHaveAttribute('data-full', 'And this is the second line.');
    await playThrough(page);
    expect(await hook<boolean>(page, 'dialogueOpen')).toBe(false);
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
    // the main story quest takes the HUD first; finish its steps so the side quest shows
    for (const f of ['met:clover', 'met:rocco', 'met:juniper', 'met:finnegan', 'dug:first', 'portal:ready']) await hook(page, 'setFlag', f, true);
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

  test('manual save from the pause menu writes the latest progress to the slot', async ({ page }) => {
    await play(page);
    // let any autosave already on its way (e.g. from starting the game) finish first
    let prev = -1;
    await expect
      .poll(async () => {
        const n = await hook<number>(page, 'saves');
        const settled = n === prev;
        prev = n;
        return settled;
      }, { intervals: [2000], timeout: 20000 })
      .toBe(true);
    // change the live game state directly (no autosave is asked for)...
    expect(await hook(page, 'patchQuietly', { justChanged: 'banana' }, { 'shell-conch': 5 })).toBe(true);
    // ...and prove nothing else writes it to the slot in the meantime
    await page.waitForTimeout(2500);
    const before = await hook<number>(page, 'saves');
    expect(before).toBe(prev);
    const stored = await hook<any>(page, 'readSlot', 1);
    expect(stored.flags.justChanged).toBeUndefined();
    await page.keyboard.press('Escape');
    await press(page, '[data-testid="pause-save"]');
    await expect(page.getByTestId('pause-save')).toContainText('Saved!');
    await expect.poll(() => hook<number>(page, 'saves')).toBeGreaterThan(before);
    const after = await hook<any>(page, 'readSlot', 1);
    expect(after.flags.justChanged).toBe('banana');
    expect(after.inventory['shell-conch']).toBe(5);
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
    await pressPip(page, 'reminder-snooze');
    await expect(rem).toHaveCount(0);
    await hook(page, 'fastForward', 4 * MIN);
    await page.waitForTimeout(200);
    await expect(page.getByTestId('reminder')).toHaveCount(0);
    await hook(page, 'fastForward', 1 * MIN);
    await expect(page.getByTestId('reminder-snooze')).toContainText('1 left');
    await pressPip(page, 'reminder-snooze');
    await hook(page, 'fastForward', 5 * MIN);
    // third time: firm, no more snoozing, but you can still continue
    await expect(page.getByTestId('reminder')).toBeVisible();
    await expect(page.getByTestId('reminder-snooze')).toHaveCount(0);
    await expect(page.locator('.reminder-screen.firm')).toBeVisible();
    await pressPip(page, 'reminder-continue');
    await expect(page.getByTestId('reminder')).toHaveCount(0);
    await hook(page, 'fastForward', 5 * MIN);
    await expect(page.locator('.reminder-screen.firm')).toBeVisible();
    // take a break -> gentle goodbye -> title
    await pressPip(page, 'reminder-break');
    await expect(page.getByTestId('goodbye')).toBeVisible();
    await expect(page.getByTestId('goodbye')).toContainText('See you soon');
    await pressPip(page, 'goodbye-ok');
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
    await pressPip(page, 'reminder-continue');
    await expect(rem).toHaveCount(0);
    await hook(page, 'triggerReminder');
    await pressPip(page, 'reminder-break');
    const state = await hook<any>(page, 'state');
    await expect(page.getByTestId('goodbye')).toContainText(`${state.players[0].name} and ${state.players[1].name}`);
  });
});

test.describe('Pip never breaks the story (M2 review)', () => {
  test('break time waits for the sign to be read; after a break, signs, neighbours and doors still work', async ({ page }) => {
    const errors = watchErrors(page);
    await play(page, [29.2, 27]);
    await expect.poll(() => hook(page, 'prompt')).toBe('Read');
    await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
    // the 45 minutes run out mid-sign: Pip waits for a calm moment
    await hook(page, 'triggerReminder');
    await page.waitForTimeout(1600);
    await expect(page.getByTestId('reminder')).toHaveCount(0);
    await expect(page.getByTestId('dialogue')).toBeVisible();
    await playThrough(page);
    await expect(page.getByTestId('reminder')).toBeVisible({ timeout: 4000 });
    // take the break, say bye, come back
    await pressPip(page, 'reminder-break');
    await pressPip(page, 'goodbye-ok');
    await expect(page.locator('[data-screen="title"]')).toBeVisible();
    await press(page, '[data-testid="title-continue"]');
    await expect.poll(() => hook<string[]>(page, 'scenes')).toContain('world');
    // the sign
    await hook(page, 'teleport', 29.2, 27, 0);
    await expect.poll(() => hook(page, 'prompt')).toBe('Read');
    await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
    await expect(page.getByTestId('dialogue')).toBeVisible();
    await expect(page.getByTestId('dialogue-text')).toHaveAttribute('data-full', /TOCKWOOD PLAZA/);
    await playThrough(page);
    // a neighbour
    const before = (await hook<any[]>(page, 'dialogueLines')).length;
    await talkTo(page, 'rocco');
    const spoke = (await hook<{ who: string }[]>(page, 'dialogueLines')).slice(before).map((l) => l.who);
    expect(spoke).toContain('rocco');
    // a door
    await hook(page, 'teleport', 30.5, 16.7, 0);
    await expect.poll(() => hook(page, 'prompt')).toBe('Enter');
    await pressUntil(page, 'KeyE', async () => (await hook<string>(page, 'mapId')) === 'clocktower');
    expect(errors).toEqual([]);
  });

  test('after 9 PM the late-night nudge waits for the arrival scene; "Just a little longer" lets you play on', async ({ page }) => {
    const errors = watchErrors(page);
    await bootToTitle(page);
    await setDeviceHour(page, 22);
    await hook(page, 'newGame', 1);
    await hook(page, 'startWorld'); // the opening is not skipped
    await expect.poll(() => hook<boolean>(page, 'dialogueOpen'), { timeout: 10000 }).toBe(true);
    await page.waitForTimeout(2200);
    await expect(page.getByTestId('reminder')).toHaveCount(0); // not over the story
    await playThrough(page, 60_000);
    expect(await hook(page, 'getFlag', 'met:biscuit')).toBe(true);
    const rem = page.getByTestId('reminder');
    await expect(rem).toHaveAttribute('data-kind', 'late', { timeout: 5000 });
    await pressPip(page, 'reminder-continue');
    await expect(rem).toHaveCount(0);
    expect(await hook<string[]>(page, 'ui')).toEqual([]);
    await walkUntil(page, 0, -1, 1);
    expect(errors).toEqual([]);
  });

  test('Pip’s card owns the controls even over a story line; leaving mid-scene cancels it and the scene replays cleanly', async ({ page }) => {
    const errors = watchErrors(page);
    await bootToTitle(page);
    await hook(page, 'newGame', 1);
    await hook(page, 'startWorld');
    await expect.poll(() => hook<boolean>(page, 'dialogueOpen'), { timeout: 10000 }).toBe(true);
    // (a card that shows up over a story line, e.g. after a minute of nobody pressing anything)
    await hook(page, 'triggerLateNight');
    await expect(page.getByTestId('reminder')).toBeVisible();
    const lines = (await hook<any[]>(page, 'dialogueLines')).length;
    await page.keyboard.press('KeyE'); // too soon: the card ignores presses for a second
    await page.waitForTimeout(250);
    await expect(page.getByTestId('reminder')).toBeVisible();
    await page.waitForTimeout(1000);
    await page.keyboard.press('KeyE'); // goes to the card ("Say goodnight"), not the hidden dialogue
    await expect(page.getByTestId('goodbye')).toBeVisible();
    expect((await hook<any[]>(page, 'dialogueLines')).length).toBe(lines);
    await pressPip(page, 'goodbye-ok');
    await expect(page.locator('[data-screen="title"]')).toBeVisible();
    // Continue: the arrival plays again, visibly, and finishes
    await press(page, '[data-testid="title-continue"]');
    await expect.poll(() => hook<boolean>(page, 'dialogueOpen'), { timeout: 10000 }).toBe(true);
    await expect(page.getByTestId('dialogue')).toBeVisible();
    await playThrough(page, 60_000);
    expect(await hook(page, 'getFlag', 'met:biscuit')).toBe(true);
    await expect.poll(() => hook<string[]>(page, 'ui')).toEqual([]);
    await walkUntil(page, 0, -1, 1);
    expect(errors).toEqual([]);
  });

  test('the reminder keeps counting in the pause menu; Pip appears over Settings and hands control back', async ({ page }) => {
    await play(page);
    await page.keyboard.press('Escape');
    await press(page, '[data-testid="pause-settings"]');
    await expect(page.locator('.settings-panel')).toBeVisible();
    const a = (await hook<any>(page, 'reminderState')).elapsedMs;
    await page.waitForTimeout(2500);
    const b = (await hook<any>(page, 'reminderState')).elapsedMs;
    expect(b - a).toBeGreaterThan(1500); // real time counts while paused
    // move break time to ~1.5 s from now and let the real clock get there
    const st = await hook<any>(page, 'reminderState');
    await hook(page, 'fastForward', st.nextAt - st.elapsedMs - 1500);
    await expect(page.getByTestId('reminder')).toHaveCount(0);
    await expect(page.getByTestId('reminder')).toBeVisible({ timeout: 8000 });
    expect(await hook<string[]>(page, 'ui')).toEqual(['pause', 'settings', 'reminder']);
    await page.waitForTimeout(1100);
    // Esc goes to Pip (who ignores it), not to Settings underneath
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    expect(await hook<string[]>(page, 'ui')).toEqual(['pause', 'settings', 'reminder']);
    await pressPip(page, 'reminder-snooze');
    await expect(page.getByTestId('reminder')).toHaveCount(0);
    // control is back in Settings: Esc now closes it
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await expect.poll(() => hook<string[]>(page, 'ui')).toEqual(['pause']);
  });

  test('Pip’s card over a question: the key goes to Pip, and the question still works afterwards', async ({ page }) => {
    await play(page);
    const answer = hook<number>(page, 'ask', 'bramble', 'Stripes or spots?', ['Stripes', 'Spots']);
    await expect(page.getByTestId('choice-1')).toBeVisible();
    await hook(page, 'triggerLateNight'); // (a card that arrives while a question is open)
    await expect(page.getByTestId('reminder')).toBeVisible();
    await page.waitForTimeout(1700);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('KeyE'); // "Just a little longer" — not a choice under the card
    await expect(page.getByTestId('reminder')).toHaveCount(0);
    await expect(page.getByTestId('choice-1')).toBeVisible();
    await page.waitForTimeout(400);
    await press(page, '[data-testid="choice-1"]');
    expect(await answer).toBe(1);
  });

  test('a real trip to the background pauses the reminder clock', async ({ page }) => {
    await play(page);
    await setHidden(page, true);
    expect((await hook<any>(page, 'reminderState')).state).toBe('paused');
    const a = (await hook<any>(page, 'reminderState')).elapsedMs;
    await page.waitForTimeout(2000);
    expect((await hook<any>(page, 'reminderState')).elapsedMs - a).toBeLessThan(300);
    await setHidden(page, false);
    expect((await hook<any>(page, 'reminderState')).state).toBe('running');
    await page.waitForTimeout(1200);
    expect((await hook<any>(page, 'reminderState')).elapsedMs - a).toBeGreaterThan(700);
  });
});

test.describe('menus stay tidy (M2 review)', () => {
  test('quest news waits until the pause menu closes instead of covering it', async ({ page }) => {
    await play(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-screen="pause"]')).toBeVisible();
    await hook(page, 'setFlag', 'visited:plaza', true);
    await page.waitForTimeout(1200);
    await expect(page.locator('.toast')).toHaveCount(0);
    await press(page, '[data-testid="pause-resume"]');
    await expect(page.locator('.toast', { hasText: 'Walk up to the town plaza' })).toBeVisible({ timeout: 4000 });
  });

  test('names screen: Enter moves through the boxes, Esc only leaves a box; saves show both names', async ({ page }) => {
    await bootToTitle(page);
    await press(page, '[data-testid="title-new"]');
    await press(page, '[data-testid="slot-1"]');
    const p1 = page.getByTestId('name-p1');
    await expect(p1).toBeVisible();
    await p1.fill('Maisie');
    await p1.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('name-p2')).toBeFocused();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Theo');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('names-ok')).toBeFocused();
    await expect(page.locator('[data-screen="names"]')).toBeVisible(); // Esc did not cancel New Game
    // arrow keys can go back into a box (up to the dice, left to the name)
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('name-p2')).toBeFocused();
    await page.keyboard.press('ArrowUp'); // and up again out of the box to the row above
    await expect(page.getByTestId('name-p1')).toBeFocused();
    await page.getByTestId('names-ok').focus();
    await page.waitForTimeout(350);
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-screen="names"]')).toHaveCount(0);
    const st = await hook<any>(page, 'state');
    expect([st.players[0].name, st.players[1].name]).toEqual(['Maisie', 'Theo']);
    await expect.poll(async () => (await hook<any[]>(page, 'slots'))[0].exists).toBe(true);
    await hook(page, 'toTitle');
    await expect(page.getByTestId('title-continue')).toContainText('Maisie & Theo');
    await press(page, '[data-testid="title-load"]');
    await expect(page.getByTestId('slot-1')).toContainText('Maisie & Theo');
  });

  test('tapping anywhere on the screen moves a conversation on', async ({ page }) => {
    await play(page);
    void hook(page, 'talk', 'pip', ['First line.', 'Second line.']);
    const text = page.getByTestId('dialogue-text');
    await expect(text).toHaveText('First line.');
    await page.waitForTimeout(400);
    const vp = page.viewportSize()!;
    const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
    // far from the dialogue box (top middle of the screen)
    if (touch) await page.touchscreen.tap(vp.width / 2, vp.height * 0.3);
    else await page.mouse.click(vp.width / 2, vp.height * 0.3);
    await expect(text).toHaveAttribute('data-full', 'Second line.');
    await playThrough(page); // (let the conversation finish before the test ends)
  });
});
