import { test, expect } from '@playwright/test';
import { advanceDialogue, hook, playThrough, press, startGame, watchErrors } from './helpers';
import { danceItOut, flag, toMap, useAt } from './flows';
import { HOPKINS } from '../../src/data/bunnies';

const ALL_SANDS = ['pirate', 'pirate-cousins', 'fifties', 'fifties-cousins', 'egypt', 'egypt-cousins', 'florence', 'florence-cousins'];

test.describe('the finale', () => {
  test('the eighth sand makes the Great Hourglass whole; everyone comes to the plaza for the bunny hop and celebration soup; the ending and the credits', async ({ page }, info) => {
    test.setTimeout(600_000);
    const two = info.project.name === 'phone';
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    if (two) await hook(page, 'joinP2');
    await hook(page, 'setFlag', 'pip:companion', true);
    // seven sands are already in the hourglass; the eighth is in the players' pocket
    for (const s of ALL_SANDS) await hook(page, 'addSand', s);
    for (const s of ALL_SANDS.slice(0, 7)) await hook(page, 'setFlag', `sand:${s}:placed`, true);
    for (const b of HOPKINS) await hook(page, 'rescueBunny', b.id);
    await expect.poll(async () => (await hook<any>(page, 'quests')).finished).not.toContain('finale');

    // the last sand goes in: the Great Hourglass is whole
    await hook(page, 'goTo', 'clocktower', 'in');
    await toMap(page, 'clocktower');
    await useAt(page, 6.5, 5.8, 'Look');
    await playThrough(page, 60_000);
    expect(await flag(page, 'sand:florence-cousins:placed')).toBe(true);
    expect(await flag(page, 'hourglassRestored')).toBe(true);
    expect(await flag(page, 'finale:party')).toBe(true);

    // to the plaza: friends from every era, then the bunny hop
    await hook(page, 'goTo', 'tockwood', 'plaza');
    await toMap(page, 'tockwood');
    const npcs = (await hook<{ id: string }[]>(page, 'npcs')).map((n) => n.id);
    for (const id of ['cookie', 'neb', 'fiorella', 'orsola', 'duke']) expect(npcs).toContain(id);
    await advanceDialogue(page); // "Three cheers for the time travellers!" ... "A BUNNY HOP!"
    await danceItOut(page, two);

    // the celebration soup, then the ending storybook and the credits
    await playThrough(page, 60_000);
    await expect(page.locator('[data-screen="ending"]')).toBeVisible();
    await expect(page.getByTestId('story-text')).toContainText('Hourglass');
    for (let i = 0; i < 4; i++) await press(page, '[data-testid="story-next"]');
    await expect(page.getByTestId('credits')).toBeVisible();
    await press(page, '[data-testid="credits-done"]');
    await expect(page.getByTestId('credits')).toHaveCount(0);
    expect(await flag(page, 'finale:done')).toBe(true);
    expect((await hook<any>(page, 'state')).wardrobe).toContain('party-hat');
    await expect.poll(async () => (await hook<any>(page, 'quests')).finished).toContain('finale');
    // and life in Tockwood carries on
    await expect.poll(() => hook<string[]>(page, 'scenes')).toContain('world');
    expect(errors).toEqual([]);
  });
});
