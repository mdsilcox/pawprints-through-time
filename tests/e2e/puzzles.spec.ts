import { test, expect, type Page } from '@playwright/test';
import { advanceDialogue, hook, playThrough, press, pressUntil, startGame, watchErrors } from './helpers';
import { parseLevel, solve as solveSlide } from '../../src/puzzles/logic/sliding';
import { solve as solveSail } from '../../src/puzzles/logic/navigation';
import { score } from '../../src/puzzles/logic/codebreak';
import { QUILL_PATTERNS, JUNIPER_CRATES, FINNEGAN_BOAT } from '../../src/puzzles/content/tockwood';

const ARROW: Record<string, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

async function openPz(page: Page, id: string, difficulty?: 'easy' | 'medium' | 'hard') {
  await hook(page, 'openPuzzle', id, difficulty);
  await expect(page.getByTestId('puzzle')).toBeVisible();
  await page.waitForTimeout(350); // screens ignore presses for a moment after opening
}

async function celebrate(page: Page) {
  await expect(page.getByTestId('pz-solved')).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(750);
  await press(page, '[data-testid="pz-done"]');
  await expect(page.getByTestId('puzzle')).toHaveCount(0);
}

const record = async (page: Page, id: string) => (await hook<any>(page, 'puzzles')).records[id];

test.describe('brain-builders', () => {
  test('riddles: pick the answer (a wrong pick is fine), or type it — case, dashes and "the" don’t matter', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    await openPz(page, 'riddle-stone', 'easy');
    await expect(page.getByTestId('riddle-text')).toContainText('tallest thing in Tockwood');
    const labels = await page.locator('[data-testid^="riddle-choice-"]').allTextContents();
    expect(labels).toHaveLength(3);
    const right = labels.findIndex((l) => /clocktower/i.test(l));
    const wrong = labels.findIndex((l) => !/clocktower/i.test(l));
    await press(page, `[data-testid="riddle-choice-${wrong}"]`);
    await expect(page.getByTestId(`riddle-choice-${wrong}`)).toBeDisabled();
    await expect(page.getByTestId('pz-bubble')).toContainText(/try|Nearly|Not/i);
    await press(page, `[data-testid="riddle-choice-${right}"]`);
    await celebrate(page);
    expect((await record(page, 'riddle-stone')).solved).toBe(true);
    // tricky: type it
    await openPz(page, 'riddle-stone', 'hard');
    await page.getByTestId('riddle-input').fill('The Clock-Tower!');
    await page.getByTestId('riddle-input').press('Enter');
    await celebrate(page);
    expect(errors).toEqual([]);
  });

  test('the Riddle Stone in the plaza has a riddle of the day and pays Tockens', async ({ page }) => {
    await startGame(page, [35.2, 27.5]);
    const before = (await hook<any>(page, 'state')).tockens;
    await expect.poll(() => hook(page, 'prompt')).toBe('Riddle');
    await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
    await playThrough(page);
    await expect(page.getByTestId('puzzle')).toBeVisible();
    const today = await hook<{ id: string; answer: string }>(page, 'riddleToday');
    await page.waitForTimeout(350);
    const labels = await page.locator('[data-testid^="riddle-choice-"]').allTextContents();
    const i = labels.findIndex((l) => l.trim().toLowerCase() === today.answer.toLowerCase());
    expect(i).toBeGreaterThanOrEqual(0);
    await press(page, `[data-testid="riddle-choice-${i}"]`);
    await celebrate(page);
    await expect.poll(async () => (await hook<any>(page, 'state')).tockens).toBe(before + 5);
    expect(await hook(page, 'getFlag', `riddle:${today.id}`)).toBe(true);
    // same day: the stone says come back tomorrow (or replay an old one)
    await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
    await expect(page.getByTestId('dialogue-text')).toHaveAttribute('data-full', /solved today/);
    await press(page, '[data-testid="choice-1"]');
  });

  test('logic grid: ✗ then ✓, a wrong full grid is pointed out gently, the right grid solves it', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await openPz(page, 'grandma-scarves', 'easy');
    const tap = async (id: string, times: number) => {
      for (let i = 0; i < times; i++) await page.getByTestId(id).click();
    };
    // Rocco blue, Juniper red, Finnegan yellow: wrong
    await tap('grid-0-0-1', 2);
    await expect(page.getByTestId('grid-0-0-1')).toHaveText('✓');
    await expect(page.getByTestId('grid-0-0-0')).toHaveText('✗'); // the rest of the row crossed out
    await tap('grid-0-1-0', 2);
    await tap('grid-0-2-2', 2);
    await expect(page.getByTestId('pz-bubble')).toContainText('isn’t happy');
    await expect(page.locator('.lg-cell.bad')).not.toHaveCount(0);
    await press(page, '[data-testid="pz-leave"]');
    // start again and get it right
    await openPz(page, 'grandma-scarves', 'easy');
    await tap('grid-0-0-0', 2);
    await tap('grid-0-1-1', 2);
    await tap('grid-0-2-2', 2);
    await celebrate(page);
    expect((await record(page, 'grandma-scarves')).solved).toBe(true);
  });

  test('sliding blocks: pick a crate up and slide it with the arrow keys until the wheelbarrow rolls out', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await openPz(page, 'juniper-crates', 'easy');
    const level = parseLevel(JUNIPER_CRATES.variants.easy.rows);
    const moves = solveSlide(level)!;
    for (const m of moves) {
      const b = level.blocks.find((x) => x.id === m.id)!;
      await page.getByTestId(`block-${m.id}`).click(); // pick it up
      const key = b.dir === 'h' ? (m.d > 0 ? 'ArrowRight' : 'ArrowLeft') : m.d > 0 ? 'ArrowDown' : 'ArrowUp';
      for (let i = 0; i < Math.abs(m.d); i++) await page.keyboard.press(key);
      await page.keyboard.press('Escape'); // put it down
      await page.waitForTimeout(120);
    }
    await expect(page.getByTestId('slide-moves')).toContainText(`Moves: ${moves.length}`);
    await celebrate(page);
  });

  test('sliding blocks: crates can be dragged, but never sideways or through each other', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'mouse drag');
    await startGame(page, [30.5, 24]);
    await openPz(page, 'juniper-crates', 'easy');
    // 'A' is a vertical crate in the easy level; try to drag it sideways: it doesn't move
    const a = page.getByTestId('block-A');
    const box = (await a.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    const after = (await a.boundingBox())!;
    expect(Math.abs(after.x - box.x)).toBeLessThan(2);
    await expect(page.getByTestId('slide-moves')).toContainText('Moves: 0');
    // drag the wheelbarrow right: it stops at the first crate in its way
    const k = page.getByTestId('block-K');
    const kb = (await k.boundingBox())!;
    await page.mouse.move(kb.x + 10, kb.y + kb.height / 2);
    await page.mouse.down();
    await page.mouse.move(kb.x + 10 + kb.width * 3, kb.y + kb.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByTestId('slide-moves')).toContainText('Moves: 1');
    const moved = (await k.boundingBox())!;
    expect(moved.x).toBeGreaterThan(kb.x + 5);
  });

  test('patterns: three rows of “what comes next?”', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await openPz(page, 'quill-patterns', 'easy');
    for (const r of QUILL_PATTERNS.variants.easy.rounds) {
      const choice = page.locator(`.sq-choice[data-token="${r.answer}"]`);
      await expect(choice).toBeVisible();
      await expect(choice).toBeEnabled();
      await page.waitForTimeout(250);
      await choice.click();
      await page.waitForTimeout(700);
    }
    await celebrate(page);
  });

  test('code-breaking: gold and silver stars tell you how close you are', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await openPz(page, 'rocco-lock', 'easy');
    const secret = await hook<number[]>(page, 'puzzleSecret');
    expect(secret).toHaveLength(3);
    const guess = [secret[1], secret[0], [0, 1, 2, 3].find((n) => !secret.includes(n))!];
    for (const n of guess) await page.getByTestId(`code-pick-${n}`).click();
    await page.getByTestId('code-check').click();
    const s = score(secret, guess);
    const row = page.locator('.cb-row').first();
    await expect(row.locator('.cb-star.gold')).toHaveCount(s.gold);
    await expect(row.locator('.cb-star.silver')).toHaveCount(s.silver);
    for (const n of secret) await page.getByTestId(`code-pick-${n}`).click();
    await page.getByTestId('code-check').click();
    await celebrate(page);
  });

  test('sailing: pick a direction and the boat sails until it bumps into something — and Pirate’s Gumbo calms the sea', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    const sailIt = async (dirs: string[]) => {
      for (const [i, d] of dirs.entries()) {
        await page.keyboard.press(ARROW[d]);
        await expect(page.getByTestId('sail-moves')).toContainText(`Moves: ${i + 1}`);
        await page.waitForTimeout(1300);
      }
    };
    await openPz(page, 'finnegan-boat', 'easy');
    await sailIt(solveSail(FINNEGAN_BOAT.variants.easy.chart)!);
    await celebrate(page);
    // medium with calm seas: currents stop pushing, so the short route works
    await hook(page, 'drink', 'pirates-gumbo', 2);
    await openPz(page, 'finnegan-boat', 'medium');
    await expect(page.getByTestId('sail-board')).toHaveClass(/calm/);
    const calm = solveSail(FINNEGAN_BOAT.variants.medium.chart, true)!;
    expect(calm.length).toBeLessThan(solveSail(FINNEGAN_BOAT.variants.medium.chart)!.length);
    await sailIt(calm);
    await celebrate(page);
  });

  test('Pip’s hints: three per puzzle, from a nudge to showing you a move; fewer hints, more stars', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await openPz(page, 'finnegan-boat', 'easy');
    const bubble = page.getByTestId('pz-bubble');
    await press(page, '[data-testid="pz-hint"]');
    await expect(bubble).toHaveText(FINNEGAN_BOAT.hints.easy[0]);
    await expect(page.getByTestId('pz-hint')).toContainText('(2)');
    await press(page, '[data-testid="pz-hint"]');
    await expect(bubble).toHaveText(FINNEGAN_BOAT.hints.easy[1]);
    await press(page, '[data-testid="pz-hint"]');
    await expect(bubble).toContainText('Try sailing');
    await expect(page.locator('.sa-btn.hinted')).toHaveCount(1);
    await expect(page.getByTestId('pz-hint')).toBeDisabled();
    await expect(page.getByTestId('pz-hint')).toContainText('No hints left');
    // follow Pip's arrows to the buoy
    for (let i = 0; i < 8 && !(await page.getByTestId('pz-solved').count()); i++) {
      const dir = solveSail(FINNEGAN_BOAT.variants.easy.chart)![i];
      await page.keyboard.press(ARROW[dir]);
      await page.waitForTimeout(1300);
    }
    await expect(page.locator('.pz-star.on')).toHaveCount(1);
    await celebrate(page);
    expect((await record(page, 'finnegan-boat')).bestHints).toBe(3);
  });

  test('adaptive difficulty: a clean solve makes the next puzzle a little harder; Settings can pin it', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await openPz(page, 'riddle-stone');
    await expect(page.getByTestId('pz-difficulty')).toHaveText('Easy');
    const labels = await page.locator('[data-testid^="riddle-choice-"]').allTextContents();
    await press(page, `[data-testid="riddle-choice-${labels.findIndex((l) => /clocktower/i.test(l))}"]`);
    await celebrate(page);
    expect((await hook<any>(page, 'puzzles')).skill).toBeCloseTo(0.5, 5);
    await openPz(page, 'quill-patterns');
    await expect(page.getByTestId('pz-difficulty')).toHaveText('Medium');
    await press(page, '[data-testid="pz-leave"]'); // leaving is fine — the next one is a touch easier
    expect((await hook<any>(page, 'puzzles')).skill).toBeLessThan(0.5);
    await hook(page, 'setSettings', { puzzleMode: 'hard' });
    await openPz(page, 'quill-patterns');
    await expect(page.getByTestId('pz-difficulty')).toHaveText('Tricky');
  });

  test('the Puzzle Journal shows your stars and replays a puzzle at any difficulty', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await openPz(page, 'riddle-stone', 'easy');
    const labels = await page.locator('[data-testid^="riddle-choice-"]').allTextContents();
    await press(page, `[data-testid="riddle-choice-${labels.findIndex((l) => /clocktower/i.test(l))}"]`);
    await celebrate(page);
    await page.keyboard.press('Escape');
    await press(page, '[data-testid="pause-journal"]');
    const card = page.getByTestId('jr-riddle-stone');
    await expect(card).toBeVisible();
    await expect(card.locator('.jr-stars span:not(.off)')).toHaveCount(3);
    await expect(page.getByTestId('jr-juniper-crates')).toContainText('???');
    await press(page, '[data-testid="jr-play-riddle-stone-hard"]');
    await expect(page.getByTestId('pz-difficulty')).toHaveText('Tricky');
    await expect(page.locator('.pz-chip', { hasText: 'Replay' })).toBeVisible();
    await press(page, '[data-testid="pz-leave"]');
    await expect(page.getByTestId('puzzle-journal')).toBeVisible();
  });

  test('in play: Grandma Hopkins’ scarf puzzle rewards two soup-recipe clues', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page, [11.2, 31.5]);
    await hook(page, 'setFlag', 'met:grandma', true);
    const tockens = (await hook<any>(page, 'state')).tockens;
    await expect.poll(() => hook(page, 'prompt')).toBe('Talk');
    await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
    await advanceDialogue(page); // she asks; "Let's puzzle it out!"
    await expect(page.getByTestId('puzzle')).toBeVisible();
    await page.waitForTimeout(350);
    await expect(page.getByTestId('pz-difficulty')).toHaveText('Easy');
    for (const id of ['grid-0-0-0', 'grid-0-1-1', 'grid-0-2-2']) for (let i = 0; i < 2; i++) await page.getByTestId(id).click();
    await celebrate(page);
    await playThrough(page);
    const book = await hook<any>(page, 'soupBook');
    expect(book.clues).toEqual(expect.arrayContaining(['whisker-bisque', 'together-tea']));
    expect((await hook<any>(page, 'state')).tockens).toBe(tockens + 15);
    expect(errors).toEqual([]);
  });
});
