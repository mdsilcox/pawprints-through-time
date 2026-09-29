import { test, expect, type Page } from '@playwright/test';
import { hook, playThrough, press, pressUntil, startGame, talkTo, watchErrors } from './helpers';
import { enter, fiftiesChapter, flag, greetBunny, inv, toMap, tp, useAt } from './flows';

test.describe('1950s America', () => {
  test('a full chapter: Maple Street → bowling shoes → the Starlight Junior Cup → the sock hop → home, and Tockwood Lanes opens', async ({ page }, info) => {
    test.setTimeout(900_000);
    const two = info.project.name === 'phone'; // solo on the desktop, a pair on the phone
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    if (two) await hook(page, 'joinP2');
    for (const f of ['portal:ready', 'pip:companion', 'sand:pirate:placed']) await hook(page, 'setFlag', f, true);
    await hook(page, 'addSand', 'pirate');
    await fiftiesChapter(page, two);
    // Tockwood Lanes is open, with Rollo
    await hook(page, 'goTo', 'tockwood', 'bowling-out');
    await toMap(page, 'tockwood');
    await enter(page, 47.5, 22.9, 'bowling');
    expect((await hook<{ id: string }[]>(page, 'npcs')).map((n) => n.id)).toContain('rollo');
    await useAt(page, 6.5, 8.1, 'Bowl!');
    await expect(page.getByTestId('choice-2')).toBeVisible();
    await press(page, '[data-testid="choice-2"]'); // "Not now"
    expect(errors).toEqual([]);
  });

  test('three cousins on Maple Street: milk for Mabel (a shy one in the pantry), skates to catch a speedy one', async ({ page }) => {
    test.setTimeout(240_000);
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    for (const f of ['pip:companion', 'maple:arrived']) await hook(page, 'setFlag', f, true);
    await hook(page, 'goTo', 'fifties', 'portal');
    await toMap(page, 'fifties');
    // the milk truck
    await useAt(page, 26, 17.4, 'Milk truck');
    await playThrough(page);
    expect(await inv(page, 'milk')).toBe(1);
    // Mabel: milk → a secret → the pantry
    await enter(page, 10, 11.6, 'diner');
    await talkTo(page, 'mabel');
    expect(await flag(page, 'dot:told')).toBe(true);
    await useAt(page, 1.8, 5.6, 'Pantry');
    await playThrough(page);
    await greetBunny(page, 'dot');
    // Zippy is too fast on foot...
    const zippy = async () => (await hook<any[]>(page, 'bunnies')).find((b) => b.id === 'zippy');
    const catchZippy = async () => {
      await expect
        .poll(async () => {
          const z = await zippy();
          await hook(page, 'teleport', z.x, z.y + 0.5, 0);
          return hook(page, 'prompt');
        }, { timeout: 10000 })
        .toBe('Talk');
      // Zippy keeps skating while the key is on its way: stay alongside and try again
      for (let i = 0; i < 15 && !(await hook<boolean>(page, 'dialogueOpen')); i++) {
        const z = await zippy();
        await hook(page, 'teleport', z.x, z.y + 0.5, 0);
        await page.keyboard.press('KeyE');
        await page.waitForTimeout(400);
      }
      await expect.poll(() => hook<boolean>(page, 'dialogueOpen'), { timeout: 5000 }).toBe(true);
      await playThrough(page);
    };
    await catchZippy();
    expect((await hook<any>(page, 'state')).bunnies).not.toContain('zippy');
    // ...but Mabel lends roller skates
    await talkTo(page, 'mabel'); // "Wheee — yes!" puts them on
    expect((await hook<any>(page, 'state')).players[0].outfit.shoes.id).toBe('roller-skates');
    await catchZippy();
    expect((await hook<any>(page, 'state')).bunnies).toContain('zippy');
    expect(errors).toEqual([]);
  });
});
