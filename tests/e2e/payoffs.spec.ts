import { test, expect, type Page } from '@playwright/test';
import { hook, playThrough, press, startGame, talkTo, watchErrors } from './helpers';
import { celebrate, flag, inv, toMap, useAt } from './flows';

/**
 * Leaving play in the middle of a story payoff — Pip's "Take a break", "Say goodnight" or
 * Save & quit — never keeps the "done" and loses the prize: the prize lands the moment it's
 * earned (a won final settles before its results card), and the celebration after it is just a
 * celebration. Nothing from the interrupted scene carries on over the title, either.
 */

/** What Pip's "Take a break" (and Save & quit) does: back to the title — then Continue. */
async function breakThenContinue(page: Page): Promise<void> {
  await hook(page, 'toTitle');
  await expect(page.locator('[data-screen="title"]')).toBeVisible();
  // (longer than the autosave's wait) no line, letterbox or save from the old scene turns up
  await page.waitForTimeout(2200);
  expect(await hook<boolean>(page, 'dialogueOpen')).toBe(false);
  await expect(page.locator('.cutscene-bars')).toHaveCount(0);
  await press(page, '[data-testid="title-continue"]');
  await expect.poll(() => hook<string[]>(page, 'scenes')).toContain('world');
  await page.waitForTimeout(800);
}

async function bowlTheFinal(page: Page): Promise<void> {
  await useAt(page, 8, 8.6, 'Bowl!');
  await press(page, '[data-testid="choice-0"]'); // "Let's bowl!"
  await expect(page.getByTestId('bowl-setup')).toBeVisible();
  await hook(page, 'bowlSpeed', 6);
  await hook(page, 'bowlAuto', true);
  await press(page, '[data-testid="bowl-start"]');
  await expect(page.getByTestId('bowl-results')).toBeVisible({ timeout: 280_000 });
  await hook(page, 'bowlAuto', false);
}

test.describe('story payoffs survive a break', () => {
  test('the treasure chest: a break during the treasure scene still leaves the first Time Sand and the whole haul', async ({ page }) => {
    test.setTimeout(180_000);
    const errors = watchErrors(page);
    await startGame(page);
    for (const f of ['pip:companion', 'cove:arrived', 'isle:landed', 'isle:door']) await hook(page, 'setFlag', f, true);
    await hook(page, 'goTo', 'cave', 'in');
    await toMap(page, 'cave');
    await useAt(page, 5.5, 5.0, 'Treasure!');
    await expect(page.getByTestId('puzzle')).toBeVisible();
    await page.waitForTimeout(400);
    for (const n of await hook<number[]>(page, 'puzzleSecret')) await page.getByTestId(`code-pick-${n}`).click();
    await page.getByTestId('code-check').click();
    await celebrate(page);
    // the treasure scene is playing (the sand rising out of the chest, the narrator)...
    await expect.poll(() => hook<boolean>(page, 'dialogueOpen'), { timeout: 20_000 }).toBe(true);
    await breakThenContinue(page);
    const st = await hook<any>(page, 'state');
    expect(st.sands).toContain('pirate');
    expect(st.notes).toContain('pirate-treasure');
    expect(await inv(page, 'spyglass')).toBe(1);
    expect(await inv(page, 'doubloon')).toBe(5);
    expect(await flag(page, 'chest:treasure-chest')).toBe(true);
    expect(errors).toEqual([]);
  });

  test('the Cup final: beating Duke settles it at once — no "Play again" to throw it away — and a break over the card keeps the Cup and its Time Sand', async ({ page }) => {
    test.setTimeout(900_000);
    const errors = watchErrors(page);
    await startGame(page);
    for (const f of ['pip:companion', 'maple:arrived', 'met:rollo', 'lanes:shoes']) await hook(page, 'setFlag', f, true);
    await hook(page, 'grant', 'saddle-shoes');
    await hook(page, 'equip', 0, 'saddle-shoes');
    await hook(page, 'goTo', 'lanes', 'in');
    await toMap(page, 'lanes');
    for (let attempt = 0; attempt < 3; attempt++) {
      await bowlTheFinal(page);
      if ((await page.getByTestId('bowl-results').getAttribute('data-won')) === 'true') break;
      // a loss: Rollo's pocket tip is right on the card (and Duke eases off a notch next time)
      await expect(page.getByTestId('bowl-tip')).toBeVisible();
      await press(page, '[data-testid="bowl-done"]');
      await playThrough(page, 60_000);
    }
    await expect(page.getByTestId('bowl-results')).toHaveAttribute('data-won', 'true');
    await expect(page.getByTestId('bowl-again')).toHaveCount(0);
    expect(await flag(page, 'cup:won')).toBe(true);
    // Pip's break lands on the results card
    await breakThenContinue(page);
    const st = await hook<any>(page, 'state');
    expect(st.sands).toContain('fifties');
    expect(await inv(page, 'starlight-cup')).toBe(1);
    expect(st.wardrobe).toEqual(expect.arrayContaining(['bowling-shirt', 'letter-jacket']));
    expect(errors).toEqual([]);
  });

  test('Cookie’s dance-off: out-dancing her settles it before the results card — a break over the card keeps the crew’s respect, and she still tells the gumbo secret', async ({ page }) => {
    test.setTimeout(300_000);
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    for (const f of ['pip:companion', 'cove:arrived', 'crew:aboard', 'met:marigold', 'map:search', 'map:whole', 'met:cookie']) await hook(page, 'setFlag', f, true);
    await hook(page, 'goTo', 'cove', 'from-isle');
    await toMap(page, 'cove');
    const tockens = (await hook<any>(page, 'state')).tockens;
    await talkTo(page, 'cookie'); // "Let's dance!"
    await expect(page.getByTestId('dance-setup')).toBeVisible();
    await hook(page, 'danceAuto', true);
    await hook(page, 'danceSpeed', 4);
    await press(page, '[data-testid="dance-start"]');
    await expect(page.getByTestId('dance-results')).toBeVisible({ timeout: 120_000 });
    await hook(page, 'danceAuto', false);
    await hook(page, 'danceSpeed', 1);
    await expect(page.getByTestId('dance-results')).toHaveAttribute('data-won', 'true');
    await expect(page.getByTestId('dance-again')).toHaveCount(0);
    await breakThenContinue(page);
    const st = await hook<any>(page, 'state');
    expect(await flag(page, 'crew:respect')).toBe(true);
    expect(st.notes).toContain('pirate-hornpipe');
    expect(st.tockens).toBe(tockens + 15);
    await talkTo(page, 'cookie');
    await playThrough(page);
    expect((await hook<any>(page, 'soupBook')).clues).toContain('pirates-gumbo');
    expect(errors).toEqual([]);
  });

  test('winning the dance-off from Cookie’s galley pot goes straight on to her gumbo secret', async ({ page }) => {
    test.setTimeout(240_000);
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    for (const f of ['pip:companion', 'cove:arrived', 'crew:aboard', 'met:marigold', 'map:search', 'map:whole', 'met:cookie']) await hook(page, 'setFlag', f, true);
    await hook(page, 'goTo', 'cove', 'from-isle');
    await toMap(page, 'cove');
    await useAt(page, 37.3, 25.4, 'Cook');
    await press(page, '[data-testid="choice-0"]'); // "Dance-off!"
    await expect(page.getByTestId('dance-setup')).toBeVisible();
    await hook(page, 'danceAuto', true);
    await hook(page, 'danceSpeed', 4);
    await press(page, '[data-testid="dance-start"]');
    await expect(page.getByTestId('dance-results')).toBeVisible({ timeout: 120_000 });
    await hook(page, 'danceAuto', false);
    await hook(page, 'danceSpeed', 1);
    await press(page, '[data-testid="dance-done"]');
    await playThrough(page, 60_000);
    expect(await flag(page, 'crew:respect')).toBe(true);
    expect((await hook<any>(page, 'soupBook')).clues).toContain('pirates-gumbo');
    expect(errors).toEqual([]);
  });

  test('the sock hop: a break over the results card keeps the jukebox and the 1950s outfits, and Poppy is still there to find', async ({ page }) => {
    test.setTimeout(300_000);
    const errors = watchErrors(page);
    await startGame(page);
    for (const f of ['pip:companion', 'maple:arrived', 'met:rollo', 'lanes:shoes', 'cup:won', 'met:mabel', 'orders:sorted']) await hook(page, 'setFlag', f, true);
    await hook(page, 'goTo', 'diner', 'in');
    await toMap(page, 'diner');
    await talkTo(page, 'rosita'); // "Everybody, shoes off — socks on!"
    await expect(page.getByTestId('dance-setup')).toBeVisible();
    await hook(page, 'danceAuto', true);
    await hook(page, 'danceSpeed', 4);
    await press(page, '[data-testid="dance-start"]');
    await expect(page.getByTestId('dance-results')).toBeVisible({ timeout: 120_000 });
    await hook(page, 'danceAuto', false);
    await hook(page, 'danceSpeed', 1);
    // (a story's one-off dance: no "Dance again" on its card)
    await expect(page.getByTestId('dance-again')).toHaveCount(0);
    await breakThenContinue(page);
    const st = await hook<any>(page, 'state');
    expect(await flag(page, 'sockhop:danced')).toBe(true);
    expect(await inv(page, 'jukebox')).toBe(1);
    expect(st.wardrobe).toEqual(expect.arrayContaining(['poodle-skirt', 'cateye-glasses', 'pearls']));
    expect((await hook<{ id: string }[]>(page, 'bunnies')).map((b) => b.id)).toContain('poppy');
    expect(errors).toEqual([]);
  });

  test('the Great Hourglass: a break in the middle of its scene still leaves the party on — and all eight sands home always mends it', async ({ page }) => {
    test.setTimeout(180_000);
    const errors = watchErrors(page);
    const ALL = ['pirate', 'pirate-cousins', 'fifties', 'fifties-cousins', 'egypt', 'egypt-cousins', 'florence', 'florence-cousins'];
    await startGame(page);
    await hook(page, 'setFlag', 'pip:companion', true);
    for (const s of ALL) await hook(page, 'addSand', s);
    for (const s of ALL.slice(0, 7)) await hook(page, 'setFlag', `sand:${s}:placed`, true);
    await hook(page, 'goTo', 'clocktower', 'in');
    await toMap(page, 'clocktower');
    await useAt(page, 6.5, 5.8, 'Look');
    // the eighth sand's little ceremony (pressed through), then the whole hourglass glowing...
    await expect
      .poll(
        async () => {
          if (await flag(page, 'hourglassRestored')) return true;
          if (await hook<boolean>(page, 'dialogueOpen')) await page.keyboard.press('KeyE');
          return false;
        },
        { timeout: 60_000, intervals: [350] },
      )
      .toBe(true);
    await expect.poll(() => hook<boolean>(page, 'dialogueOpen'), { timeout: 10_000 }).toBe(true);
    await breakThenContinue(page);
    expect(await flag(page, 'hourglassRestored')).toBe(true);
    expect(await flag(page, 'finale:party')).toBe(true);

    // and a save where all eight went in but the hourglass never mended (an older version): one look fixes it
    await hook(page, 'setFlag', 'hourglassRestored', false);
    await hook(page, 'setFlag', 'finale:party', false);
    await hook(page, 'goTo', 'clocktower', 'in');
    await toMap(page, 'clocktower');
    await useAt(page, 6.5, 5.8, 'Look');
    await playThrough(page, 60_000);
    expect(await flag(page, 'hourglassRestored')).toBe(true);
    expect(await flag(page, 'finale:party')).toBe(true);
    expect(errors).toEqual([]);
  });
});
