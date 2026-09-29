import { test, expect } from '@playwright/test';
import { hook, startGame, watchErrors } from './helpers';
import { egyptChapter, travel } from './flows';

test.describe('Ancient Egypt', () => {
  test('a full chapter: the Map of Time → Giza → the Sphinx’s riddles → Glowbroth in the dark tomb → the plans → the ramp → the capstone’s Time Sand → the festival → three cousins → home', async ({ page }, info) => {
    test.setTimeout(900_000);
    const two = info.project.name === 'phone'; // solo on the desktop, a pair on the phone
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    if (two) await hook(page, 'joinP2');
    for (const f of ['portal:ready', 'pip:companion', 'sand:pirate:placed']) await hook(page, 'setFlag', f, true);
    await hook(page, 'addSand', 'pirate'); // Egypt opens on the Map of Time once the first sand is home
    await travel(page, 'egypt', 'egypt', 'giza:arrived');
    await egyptChapter(page, two);
    expect(errors).toEqual([]);
  });
});
