import { test, expect } from '@playwright/test';
import { bootToTitle, hook, press, watchErrors } from './helpers';
import { enter, fiftiesChapter, openingToPortal, pirateChapter, toMap, useAt } from './flows';

/**
 * The checkpoint playthrough: a brand-new family game from the title screen, through the opening,
 * the pirate chapter and the 1950s chapter, home with two Time Sands — solo on the desktop and as
 * a pair on the phone. Mini-games run on their autopilots; everything else is played for real.
 */
test('the whole journey so far: title → opening → the Golden Age of Piracy → 1950s America → home with two Time Sands', async ({ page }, info) => {
  test.setTimeout(1_800_000);
  const two = info.project.name === 'phone';
  const errors = watchErrors(page);
  await bootToTitle(page);
  await openingToPortal(page);
  if (two) await hook(page, 'joinP2');
  await pirateChapter(page, two);
  await fiftiesChapter(page, two);
  const st = await hook<any>(page, 'state');
  expect(st.sands).toEqual(['pirate', 'fifties']);
  expect(st.bunnies).toEqual(expect.arrayContaining(['poppy']));
  expect(st.flags['bowling:open']).toBe(true);
  const quests = await hook<any>(page, 'quests');
  expect(quests.finished).toEqual(expect.arrayContaining(['crack-in-time', 'pirate-sand', 'fifties-sand']));
  // back home, Tockwood Lanes is open, with Rollo
  await hook(page, 'goTo', 'tockwood', 'bowling-out');
  await toMap(page, 'tockwood');
  await enter(page, 47.5, 22.9, 'bowling');
  expect((await hook<{ id: string }[]>(page, 'npcs')).map((n) => n.id)).toContain('rollo');
  await useAt(page, 6.5, 8.1, 'Bowl!');
  await expect(page.getByTestId('choice-2')).toBeVisible();
  await press(page, '[data-testid="choice-2"]'); // "Not now"
  expect(errors).toEqual([]);
});
