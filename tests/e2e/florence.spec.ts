import { test, expect } from '@playwright/test';
import { hook, startGame, watchErrors } from './helpers';
import { florenceChapter, travel } from './flows';

test.describe('Renaissance Florence', () => {
  test('a full chapter: the Map of Time → Florence → the fresco’s border → the lion’s gear lock and parts → its Time Sand → three cousins (one needs super-jumps) → the court dance → home', async ({ page }, info) => {
    test.setTimeout(900_000);
    const two = info.project.name === 'phone'; // solo on the desktop, a pair on the phone
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    if (two) await hook(page, 'joinP2');
    for (const f of ['portal:ready', 'pip:companion']) await hook(page, 'setFlag', f, true);
    // Florence opens on the Map of Time once Egypt's and the 1950s' sands are home
    for (const s of ['pirate', 'egypt', 'fifties']) {
      await hook(page, 'addSand', s);
      await hook(page, 'setFlag', `sand:${s}:placed`, true);
    }
    await travel(page, 'florence', 'florence', 'flor:arrived');
    await florenceChapter(page, two);
    expect(errors).toEqual([]);
  });
});
