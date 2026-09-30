import { test, expect } from '@playwright/test';
import { hook, press, startGame, talkTo, watchErrors } from './helpers';
import { toMap, useAt } from './flows';

/**
 * The Museum of Time fills up (spec: "the museum fills"; History Notes "fill the Tockwood Museum
 * alongside artifacts brought home"): treasures from the eras are donated at Dr. Quill's trading
 * table, each goes into a case of its own, and Pip's History Notes are pinned up on the board.
 */
test.describe('the Museum of Time', () => {
  test('treasures from the eras go on show: Dr. Quill takes them, each case shows its own find at once, and the History Notes are pinned up', async ({ page }) => {
    test.setTimeout(150_000);
    const errors = watchErrors(page);
    await startGame(page);
    for (const id of ['scarab', 'spyglass', 'bowling-pin']) await hook(page, 'give', id, 1);
    await hook(page, 'setFlag', 'met:quill', true);
    await hook(page, 'learnNoteDebug', 'egypt-sphinx');
    await hook(page, 'goTo', 'museum', 'in');
    await toMap(page, 'museum');
    expect(await hook<string[]>(page, 'exhibits')).toEqual([]);
    // "Have you brought any finds for my trading table?" — "Let's trade!"
    await talkTo(page, 'quill');
    await expect(page.getByTestId('sell-row-scarab')).toBeVisible();
    for (const id of ['scarab', 'spyglass', 'bowling-pin']) await press(page, `[data-testid="sell-one-${id}"]`);
    expect((await hook<{ museum: string[] }>(page, 'state')).museum).toEqual(['scarab', 'spyglass', 'bowling-pin']);
    await press(page, '[data-testid="sell-done"]');
    // each case shows its own treasure (not the same marble in every one), straight away
    await expect.poll(() => hook<string[]>(page, 'exhibits'), { timeout: 10_000 }).toEqual(['icon-scarab', 'icon-spyglass', 'icon-pin']);
    // the notice board: Pip's History Notes, and the catalogue of finds
    await useAt(page, 7, 4.1, 'History Notes');
    await expect(page.getByTestId('history-notes')).toBeVisible();
    await expect(page.getByTestId('museum-catalogue')).toContainText('3 of');
    expect(errors).toEqual([]);
  });
});
