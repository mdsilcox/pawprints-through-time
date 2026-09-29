import { test, expect, type Page } from '@playwright/test';
import { advanceDialogue, bootToTitle, hook, playThrough, press, pressUntil, startGame, talkTo, watchErrors } from './helpers';

const effects = async (page: Page) => (await hook<{ effect: string; left: number }[]>(page, 'effects')).map((e) => e.effect);
const inv = async (page: Page, id: string) => (await hook<Record<string, number>>(page, 'inventory'))[id] ?? 0;

/** Stir the pot: `presses` alternating keys (E = player 1, / = player 2). */
async function stir(page: Page, keys: string[]) {
  await press(page, '[data-testid="cd-stir"]');
  for (const k of keys) {
    await page.waitForTimeout(420);
    await page.keyboard.press(k);
  }
  await expect(page.getByTestId('cd-result')).toBeVisible({ timeout: 6000 });
  await page.waitForTimeout(350);
}

async function pick(page: Page, ids: string[]) {
  for (const id of ids) await page.getByTestId(`cd-ing-${id}`).click();
}

test.describe('magic soup', () => {
  test('the cottage garden: plant, water, wait, harvest', async ({ page }) => {
    await startGame(page, [8.5, 14.9]);
    await hook(page, 'give', 'seed-carrot', 1);
    const before = await inv(page, 'carrot');
    await expect.poll(() => hook(page, 'prompt')).toBe('Garden');
    await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
    await advanceDialogue(page); // "Plant carrot seeds" → "Planted!" → "Splish splash!"
    let plot = (await hook<any[]>(page, 'garden'))[0];
    expect(plot).toMatchObject({ seed: 'carrot', state: 'growing' });
    expect(await inv(page, 'seed-carrot')).toBe(0);
    await hook(page, 'skipMinutes', 370);
    plot = (await hook<any[]>(page, 'garden'))[0];
    expect(plot.state).toBe('ready');
    await pressUntil(page, 'KeyE', async () => (await inv(page, 'carrot')) > before);
    expect(await inv(page, 'carrot')).toBe(before + 3);
    expect((await hook<any[]>(page, 'garden'))[0].state).toBe('empty');
  });

  test('Juniper’s stall sells seeds and honey for Tockens', async ({ page }) => {
    await startGame(page, [22.5, 14.6]);
    await hook(page, 'setFlag', 'met:juniper', true);
    await talkTo(page, 'juniper'); // "Seeds & honey, please!"
    await expect(page.locator('[data-screen="stall"]')).toBeVisible();
    const tockens = (await hook<any>(page, 'state')).tockens;
    await press(page, '[data-testid="stall-buy-seed-tomato"]');
    expect((await hook<any>(page, 'state')).tockens).toBe(tockens - 3);
    expect(await inv(page, 'seed-tomato')).toBe(1);
    await press(page, '[data-testid="stall-done"]');
    await expect(page.locator('[data-screen="stall"]')).toHaveCount(0);
  });

  test('at the pot: the clues you’ve heard and what each ingredient is like; Pip’s break mid-stir costs nothing', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page);
    await hook(page, 'learnClue', 'glowbroth');
    for (const id of ['glowcap', 'kelp', 'carrot']) await hook(page, 'give', id, 1);
    await hook(page, 'openCauldron');
    await expect(page.getByTestId('cauldron')).toBeVisible();
    await expect(page.getByTestId('cd-note')).toContainText('grows in the dark');
    await page.getByTestId('cd-ing-kelp').focus();
    await expect(page.getByTestId('cd-note')).toContainText('Kelp');
    await press(page, '[data-testid="cd-clues"]');
    await expect(page.getByTestId('cd-note')).toContainText('grows in the dark');
    await pick(page, ['glowcap', 'kelp', 'carrot']);
    await press(page, '[data-testid="cd-stir"]');
    await expect(page.getByTestId('cd-stir-0')).toBeVisible();
    // Pip's break arrives mid-stir: back to the title with nothing lost
    await hook(page, 'triggerReminder');
    await expect(page.getByTestId('reminder-break')).toBeVisible();
    await page.waitForTimeout(1300);
    await press(page, '[data-testid="reminder-break"]');
    await expect(page.getByTestId('goodbye')).toBeVisible();
    await page.waitForTimeout(1300);
    await press(page, '[data-testid="goodbye-ok"]');
    await expect(page.locator('[data-screen="title"]')).toBeVisible();
    const saved = await hook<any>(page, 'readSlot', 1);
    for (const id of ['glowcap', 'kelp', 'carrot']) expect(saved.inventory[id] ?? 0).toBeGreaterThanOrEqual(1);
    expect(saved.recipes).not.toContain('glowbroth');
    expect(errors).toEqual([]);
  });

  test('cooking with Clover: a riddle clue, three ingredients, a stir to the beat — and Glowbroth makes you glow', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page);
    await hook(page, 'setFlag', 'met:clover', true);
    await hook(page, 'goTo', 'burrow', 'in');
    await expect.poll(() => hook<string>(page, 'mapId')).toBe('burrow');
    await talkTo(page, 'clover'); // "Let's cook soup!" — the first time she explains and gives you a start
    await expect(page.getByTestId('cauldron')).toBeVisible();
    expect((await hook<any>(page, 'soupBook')).clues).toContain('glowbroth');
    await pick(page, ['glowcap', 'kelp', 'carrot']);
    await stir(page, ['KeyE', 'KeyE', 'KeyE', 'KeyE']);
    await expect(page.getByTestId('cd-result')).toHaveAttribute('data-soup', 'glowbroth');
    await expect(page.getByTestId('cd-result')).toContainText('New recipe!');
    await press(page, '[data-testid="cd-drink"]');
    await playThrough(page); // Clover cheers, then shares her next riddle
    expect(await effects(page)).toContain('glow');
    await expect(page.locator('[data-testid="hud-effects"] [data-effect="glow"]')).toBeVisible();
    const book = await hook<any>(page, 'soupBook');
    expect(book.recipes).toContain('glowbroth');
    expect(book.clues).toContain('hopscotch-chowder');
    // the recipe book shows the discovery with the ingredients used
    await hook(page, 'openRecipeBook');
    await expect(page.getByTestId('rb-glowbroth')).toContainText('Glowbroth');
    await expect(page.getByTestId('rb-glowbroth').locator('.rb-combo img')).toHaveCount(3);
    await expect(page.getByTestId('rb-hopscotch-chowder')).toContainText('bunny loves to munch');
    expect(errors).toEqual([]);
  });

  test('a wrong pot makes a silly soup; the two-spoon recipe needs both players stirring', async ({ page }) => {
    await startGame(page);
    for (const [id, n] of [['honey', 2], ['clover-leaf', 2], ['kelp', 2]] as const) await hook(page, 'give', id, n);
    // alone: the pot wobbles
    await hook(page, 'openCauldron');
    await pick(page, ['honey', 'clover-leaf', 'kelp']);
    await stir(page, ['KeyE', 'KeyE', 'KeyE', 'KeyE']);
    await expect(page.getByTestId('cd-result')).toHaveAttribute('data-soup', 'wobble-soup');
    await expect(page.locator('.cd-two')).toContainText('two spoons');
    await press(page, '[data-testid="cd-bottle"]');
    expect(await inv(page, 'soup:wobble-soup')).toBe(1);
    // together: Player 2 stirs with /
    await hook(page, 'joinP2');
    await hook(page, 'openCauldron');
    await pick(page, ['honey', 'clover-leaf', 'kelp']);
    await expect(page.getByTestId('cd-stir-1')).toBeHidden(); // (the stir buttons appear once stirring starts)
    await stir(page, ['KeyE', 'Slash', 'KeyE', 'Slash', 'KeyE', 'Slash', 'KeyE', 'Slash']);
    await expect(page.getByTestId('cd-result')).toHaveAttribute('data-soup', 'together-tea');
    await press(page, '[data-testid="cd-drink"]');
    expect(await effects(page)).toContain('together');
  });

  test('soup effects matter: zoom, sparkle-sniffing, hopping up the lookout rock, slow time', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    // Sunbeam Squash: faster feet
    await hook(page, 'drink', 'sunbeam-squash', 2);
    await expect.poll(() => hook<number>(page, 'speed')).toBeGreaterThan(1.6);
    await hook(page, 'clearEffects');
    await expect.poll(() => hook<number>(page, 'speed')).toBe(1);
    // Sparkle Stew: hidden treasure near you reveals itself
    const hidden = (await hook<any[]>(page, 'digSpots')).find((s) => !s.revealed);
    expect(hidden, 'a hidden spot today').toBeTruthy();
    await hook(page, 'teleport', hidden.cx + 0.5, hidden.cy + 2.5, 0);
    await page.waitForTimeout(800);
    expect((await hook<any[]>(page, 'digSpots')).find((s) => s.id === hidden.id).revealed).toBe(false);
    await hook(page, 'drink', 'sparkle-stew', 2);
    await expect.poll(async () => (await hook<any[]>(page, 'digSpots')).find((s) => s.id === hidden.id)?.revealed, { timeout: 5000 }).toBe(true);
    // Hopscotch Chowder: the lookout rock is too high... until you can hop like a bunny
    await hook(page, 'teleport', 42.5, 8.7, 0);
    await expect.poll(() => hook(page, 'prompt')).toBe('Hop up!');
    await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
    await expect(page.getByTestId('dialogue-text')).toHaveAttribute('data-full', /too high/);
    await playThrough(page);
    const acorns = await inv(page, 'golden-acorn');
    await hook(page, 'drink', 'hopscotch-chowder', 2);
    await page.waitForTimeout(400);
    await pressUntil(page, 'KeyE', async () => (await inv(page, 'golden-acorn')) > acorns);
    expect(await hook(page, 'getFlag', 'ledge:lookout')).toBe(true);
    // Tick-Tock Tomato: the island clock slows right down (measured once the hop scene is over)
    await expect.poll(() => hook<string[]>(page, 'ui')).toEqual([]);
    await hook(page, 'setTime', 12);
    const rate = async () => {
      const a = (await hook<any>(page, 'time')).minutes;
      await page.waitForTimeout(2500);
      return (await hook<any>(page, 'time')).minutes - a;
    };
    const normal = await rate();
    await hook(page, 'drink', 'ticktock-tomato', 2);
    const slow = await rate();
    expect(slow).toBeLessThan(normal * 0.6);
  });

  test('Glowbroth lights up the dark Glimmer Grotto — and the treasure chest inside', async ({ page }) => {
    await startGame(page);
    await hook(page, 'goTo', 'grotto', 'in');
    await expect.poll(() => hook<string>(page, 'mapId')).toBe('grotto');
    await expect.poll(() => hook<boolean>(page, 'dialogueOpen'), { timeout: 8000 }).toBe(true);
    await expect(page.getByTestId('dialogue-text')).toHaveAttribute('data-full', /dark/);
    await playThrough(page);
    await hook(page, 'teleport', 9.5, 5.5, 0);
    await expect.poll(() => hook(page, 'prompt')).toBe('Chest');
    await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
    await expect(page.getByTestId('dialogue-text')).toHaveAttribute('data-full', /can’t see/);
    await playThrough(page);
    const tockens = (await hook<any>(page, 'state')).tockens;
    await hook(page, 'drink', 'glowbroth', 2);
    await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
    await playThrough(page);
    expect(await hook(page, 'getFlag', 'grotto:chest')).toBe(true);
    expect((await hook<any>(page, 'state')).tockens).toBe(tockens + 25);
  });

  test('Whisker Bisque: Biscuit’s barks come with words', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await hook(page, 'drink', 'whisker-bisque', 2);
    void hook(page, 'talk', 'biscuit', 'Woof!');
    await expect(page.getByTestId('dialogue-text')).toHaveAttribute('data-full', /Woof! \(.+\)/);
    await playThrough(page);
    await hook(page, 'clearEffects');
    void hook(page, 'talk', 'biscuit', 'Woof!');
    await expect(page.getByTestId('dialogue-text')).toHaveAttribute('data-full', 'Woof!');
    await playThrough(page);
  });

  test('gifting soup: a neighbour’s favourite makes them very happy', async ({ page }) => {
    await startGame(page, [35.5, 19.6]);
    await hook(page, 'setFlag', 'met:rocco', true);
    await hook(page, 'give', 'soup:ticktock-tomato', 1);
    const before = (await hook<any>(page, 'state')).friendship.rocco ?? 0;
    await talkTo(page, 'rocco'); // daily chat → "Is that soup I smell?" → give it
    expect(await inv(page, 'soup:ticktock-tomato')).toBe(0);
    expect(await hook(page, 'getFlag', 'fav:rocco')).toBe(true);
    expect((await hook<any>(page, 'state')).friendship.rocco).toBeGreaterThanOrEqual(before + 40);
    const lines = (await hook<{ who: string; text: string }[]>(page, 'dialogueLines')).map((l) => l.text).join(' ');
    expect(lines).toContain('FAVOURITE');
  });

  test('bottled soup can be drunk from the backpack; effects only tick while you play, and survive a reload', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await hook(page, 'give', 'soup:sunbeam-squash', 1);
    await hook(page, 'openBackpack');
    await press(page, '[data-testid="bp-soup:sunbeam-squash"]');
    await press(page, '[data-testid="bp-drink"]');
    await expect.poll(() => effects(page)).toContain('zoom');
    const left = async () => (await hook<{ effect: string; left: number }[]>(page, 'effects')).find((e) => e.effect === 'zoom')!.left;
    // paused: the timer waits
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-screen="pause"]')).toBeVisible();
    const a = await left();
    await page.waitForTimeout(2000);
    expect(Math.abs((await left()) - a)).toBeLessThan(0.3);
    await press(page, '[data-testid="pause-resume"]');
    await page.waitForTimeout(2000);
    expect(await left()).toBeLessThan(a - 1.2);
    // it's in the save
    await hook(page, 'save');
    await page.reload();
    await bootToTitle(page);
    await press(page, '[data-testid="title-continue"]');
    await expect.poll(() => hook<string[]>(page, 'scenes')).toContain('world');
    expect(await effects(page)).toContain('zoom');
  });
});
