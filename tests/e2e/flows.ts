import { expect, type Page } from '@playwright/test';
import { advanceDialogue, hook, playThrough, press, pressUntil, talkTo } from './helpers';
import { solve as solveSail } from '../../src/puzzles/logic/navigation';
import { MARIGOLD_CHART, PIRATE_RIDDLES } from '../../src/puzzles/content/pirates';
import { EGYPT_RIDDLES, RAMP_STONES } from '../../src/puzzles/content/egypt';
import { FIORELLA_FRESCO, LUCIA_LION } from '../../src/puzzles/content/florence';
import { parseLevel, solve as solveSlide } from '../../src/puzzles/logic/sliding';
import type { Riddle } from '../../src/puzzles/logic/riddle';

/**
 * Whole-chapter playthroughs, played the way a family would (walk up, press the action button,
 * answer, solve), shared by the chapter tests and the start-to-finish journey test. Mini-games
 * run on their test autopilots so the story, not the reflexes, is what's being checked.
 */
export const ARROW: Record<string, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
export const inv = async (page: Page, id: string) => (await hook<Record<string, number>>(page, 'inventory'))[id] ?? 0;
export const flag = (page: Page, k: string) => hook(page, 'getFlag', k);

/** Hop player 1 (and player 2 right behind, in a two-player game) to a spot. */
export async function tp(page: Page, x: number, y: number): Promise<void> {
  await hook(page, 'teleport', x, y, 0);
  if (await hook<boolean>(page, 'twoPlayer')) await hook(page, 'teleport', x - 0.9, y + 0.3, 1);
}

/** Walk up to a lost cousin (they wander, so find them first) and bring them home. */
export async function greetBunny(page: Page, id: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const b = (await hook<{ id: string; x: number; y: number }[]>(page, 'bunnies')).find((x) => x.id === id);
        if (!b) return null;
        await tp(page, b.x, b.y + 0.7);
        await page.waitForTimeout(250);
        return hook(page, 'prompt');
      },
      { timeout: 12000 },
    )
    .toBe('Talk');
  await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
  await playThrough(page);
  expect((await hook<any>(page, 'state')).bunnies).toContain(id);
}

export async function useAt(page: Page, x: number, y: number, label: string): Promise<void> {
  await tp(page, x, y);
  await expect.poll(() => hook(page, 'prompt'), { timeout: 8000 }).toBe(label);
  await pressUntil(page, 'KeyE', async () => (await hook<boolean>(page, 'dialogueOpen')) || (await page.getByTestId('puzzle').count()) > 0 || (await hook<string[]>(page, 'ui')).length > 0);
}

export async function enter(page: Page, x: number, y: number, map: string): Promise<void> {
  await tp(page, x, y);
  await expect.poll(() => hook(page, 'prompt'), { timeout: 8000 }).toBe('Enter');
  await pressUntil(page, 'KeyE', async () => (await hook<string>(page, 'mapId')) === map);
  await toMap(page, map);
}

export async function celebrate(page: Page): Promise<void> {
  await expect(page.getByTestId('pz-solved')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(750);
  await press(page, '[data-testid="pz-done"]');
  await expect(page.getByTestId('puzzle')).toHaveCount(0);
}

/** Press through a conversation, answering every question with choice `n`. */
export async function answerAll(page: Page, n: number): Promise<void> {
  for (let i = 0; i < 40; i++) {
    if (!(await hook<boolean>(page, 'dialogueOpen'))) {
      await page.waitForTimeout(450);
      if (!(await hook<boolean>(page, 'dialogueOpen'))) return;
    }
    if (await page.getByTestId(`choice-${n}`).isVisible().catch(() => false)) {
      await press(page, `[data-testid="choice-${n}"]`);
      continue;
    }
    await page.waitForTimeout(160);
    await page.keyboard.press('KeyE');
  }
}

export async function toMap(page: Page, id: string): Promise<void> {
  await expect.poll(() => hook<string>(page, 'mapId'), { timeout: 15000 }).toBe(id);
  await page.waitForTimeout(900);
}

/** Solve the torn-map jigsaw by reading which piece sits where. */
export async function solveJigsaw(page: Page): Promise<void> {
  const board = page.getByTestId('jigsaw-board');
  const n = await board.locator('.jg-piece').count();
  for (let slot = 0; slot < n; slot++) {
    const pieces = await board.locator('.jg-piece').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-piece'))));
    const from = pieces.indexOf(slot);
    if (from !== slot) {
      await page.getByTestId(`jig-${from}`).click();
      await page.getByTestId(`jig-${slot}`).click();
    }
    for (let i = 0; i < 5; i++) {
      const rot = Number(await page.getByTestId(`jig-${slot}`).getAttribute('data-rot'));
      if (rot === 0) break;
      await page.getByTestId(`jig-${slot}`).click();
    }
  }
}

/** Dance on the autopilot until the results card, then close it. */
export async function danceItOut(page: Page, two: boolean): Promise<void> {
  await expect(page.getByTestId('dance-setup')).toBeVisible();
  await hook(page, 'danceAuto', true);
  await press(page, '[data-testid="dance-start"]');
  await expect(page.getByTestId('dance-results')).toBeVisible({ timeout: 120_000 });
  await hook(page, 'danceAuto', false);
  if (two) await expect(page.getByTestId('dance-result-p2')).toBeVisible();
  await press(page, '[data-testid="dance-done"]');
  await playThrough(page, 60_000);
}

/** Travel from the clocktower portal through the Map of Time. */
export async function travel(page: Page, era: string, map: string, arrivedFlag: string): Promise<void> {
  await hook(page, 'goTo', 'clocktower', 'in');
  await toMap(page, 'clocktower');
  await useAt(page, 10.5, 7.6, 'Portal');
  await expect(page.getByTestId('world-map')).toBeVisible();
  await press(page, `[data-testid="wm-go-${era}"]`);
  await playThrough(page);
  await toMap(page, map);
  // (the arrival scene may already be playing: playThrough just carries on through it)
  await expect.poll(() => flag(page, arrivedFlag), { timeout: 10000 }).toBe(true);
  await playThrough(page, 60_000);
}

/** Back through the portal and into the Great Hourglass. */
export async function homeWithTheSand(page: Page, portal: [number, number], era: string): Promise<void> {
  await useAt(page, portal[0], portal[1], 'Portal home');
  await press(page, '[data-testid="choice-0"]');
  await toMap(page, 'clocktower');
  await useAt(page, 6.5, 5.8, 'Look');
  await playThrough(page, 60_000);
  expect(await flag(page, `sand:${era}:placed`)).toBe(true);
}

// ------------------------------------------------------------------ the opening (from the title screen)
export async function openingToPortal(page: Page): Promise<void> {
  await press(page, '[data-testid="title-new"]');
  await press(page, '[data-testid="slot-1"]');
  await press(page, '[data-testid="names-ok"]');
  await expect(page.locator('[data-screen="intro"]')).toBeVisible();
  for (let i = 0; i < 4; i++) await press(page, '[data-testid="story-next"]');
  await expect.poll(() => hook<string[]>(page, 'scenes')).toContain('world');
  await expect.poll(() => hook<boolean>(page, 'dialogueOpen'), { timeout: 10000 }).toBe(true);
  await playThrough(page);
  // follow Biscuit into the clocktower: Pip's scene
  await tp(page, 30.5, 16.7);
  await expect.poll(() => hook(page, 'prompt')).toBe('Enter');
  await pressUntil(page, 'KeyE', async () => (await hook<string>(page, 'mapId')) === 'clocktower');
  await expect.poll(() => hook<boolean>(page, 'dialogueOpen'), { timeout: 10000 }).toBe(true);
  await playThrough(page, 60_000);
  expect(await flag(page, 'met:pip')).toBe(true);
  // Clover under the old oak
  await hook(page, 'goTo', 'burrow', 'in');
  await toMap(page, 'burrow');
  await talkTo(page, 'clover');
  await playThrough(page);
  expect(await flag(page, 'met:clover')).toBe(true);
  // three neighbours, and a first dig with Biscuit
  await hook(page, 'goTo', 'tockwood', 'plaza');
  await toMap(page, 'tockwood');
  for (const n of ['rocco', 'juniper', 'finnegan']) {
    await talkTo(page, n);
    await playThrough(page);
  }
  await tp(page, 32.5, 28.2);
  await expect.poll(() => hook(page, 'prompt'), { timeout: 8000 }).toBe('Dig');
  await pressUntil(page, 'KeyE', async () => !!(await flag(page, 'dug:first')));
  // tell Pip we're ready
  await hook(page, 'goTo', 'clocktower', 'in');
  await toMap(page, 'clocktower');
  await tp(page, 6.5, 8.1);
  await expect.poll(() => hook(page, 'prompt'), { timeout: 8000 }).toBe('Talk');
  await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
  await playThrough(page, 60_000);
  expect(await flag(page, 'portal:ready')).toBe(true);
}

// ------------------------------------------------------------------ chapter 1: the Golden Age of Piracy
export async function pirateChapter(page: Page, two: boolean): Promise<void> {
  const tockens0 = (await hook<any>(page, 'state')).tockens;
  await travel(page, 'pirate', 'cove', 'cove:arrived');

  // crew only! borrow sailor clothes from the washing line, dress the part, board
  await useAt(page, 24.8, 15.0, 'Washing line');
  await playThrough(page); // "Yes, dress up!"
  const st = await hook<any>(page, 'state');
  expect(st.players[0].outfit.hat.id).toBe('deckhand-bandana');
  if (two) expect(st.players[1].outfit.top.id).toBe('sailor-shirt');
  await useAt(page, 28.5, 22.6, 'Board ship');
  await playThrough(page);
  expect(await flag(page, 'crew:aboard')).toBe(true);

  // Captain Marigold, then the four pieces
  await talkTo(page, 'marigold');
  expect(await flag(page, 'map:search')).toBe(true);
  await talkTo(page, 'saltwhistle');
  expect(await inv(page, 'map-piece')).toBe(1);
  await talkTo(page, 'coco');
  await expect(page.locator('[data-screen="stall"]')).toBeVisible();
  await press(page, '[data-testid="stall-buy-coconut"]');
  await press(page, '[data-testid="stall-buy-coconut"]');
  await press(page, '[data-testid="stall-buy-island-pepper"]');
  await press(page, '[data-testid="stall-done"]');
  await talkTo(page, 'pepper'); // trades a piece for a coconut
  expect(await inv(page, 'map-piece')).toBe(2);
  await useAt(page, 3.6, 14.3, 'Bottle');
  await playThrough(page);
  expect(await inv(page, 'map-piece')).toBe(3);
  // Biscuit sniffs out the last one on the beach
  await tp(page, 21.5, 19.3);
  await page.waitForTimeout(1200);
  await pressUntil(page, 'KeyQ', async () => (await hook<any[]>(page, 'digSpots')).some((s) => s.id === 'cove:mappiece' && s.revealed));
  await page.waitForTimeout(900);
  await expect.poll(() => hook(page, 'prompt'), { timeout: 8000 }).toBe('Dig');
  await pressUntil(page, 'KeyE', async () => (await inv(page, 'map-piece')) >= 4);

  // the torn map at the captain's table
  await useAt(page, 33.2, 23.3, 'Map table');
  await expect(page.getByTestId('puzzle')).toBeVisible();
  await page.waitForTimeout(400);
  await solveJigsaw(page);
  await celebrate(page);
  await playThrough(page);
  expect(await flag(page, 'map:whole')).toBe(true);
  expect((await hook<any>(page, 'state')).wardrobe).toContain('tricorn');

  // the crew's respect: a hornpipe dance-off with Cookie (then her gumbo secret)
  await talkTo(page, 'cookie'); // "Let's dance!"
  await danceItOut(page, two);
  expect(await flag(page, 'crew:respect')).toBe(true);
  expect((await hook<any>(page, 'soupBook')).clues).toContain('pirates-gumbo');
  await useAt(page, 12, 20.5, 'Gather salt');
  await playThrough(page);
  expect(await inv(page, 'sea-salt')).toBe(1);
  await useAt(page, 37.3, 25.4, 'Cook');
  await expect(page.getByTestId('cauldron')).toBeVisible();
  for (const id of ['island-pepper', 'sea-salt', 'coconut']) await page.getByTestId(`cd-ing-${id}`).click();
  await press(page, '[data-testid="cd-stir"]');
  for (const k of two ? ['KeyE', 'Slash', 'KeyE', 'Slash', 'KeyE', 'Slash', 'KeyE', 'Slash'] : ['KeyE', 'KeyE', 'KeyE', 'KeyE']) {
    await page.waitForTimeout(420);
    await page.keyboard.press(k);
  }
  await expect(page.getByTestId('cd-result')).toHaveAttribute('data-soup', 'pirates-gumbo');
  await page.waitForTimeout(350);
  await press(page, '[data-testid="cd-drink"]');
  await playThrough(page);
  expect((await hook<any[]>(page, 'effects')).map((e) => e.effect)).toContain('calm');

  // the Swirling Shoals
  await useAt(page, 40.9, 24.3, 'Set sail');
  await advanceDialogue(page);
  await expect(page.getByTestId('puzzle')).toBeVisible();
  await expect(page.getByTestId('sail-board')).toHaveClass(/calm/);
  await page.waitForTimeout(400);
  const diff = (await page.getByTestId('pz-difficulty').textContent())!.trim();
  const variant = diff === 'Easy' ? 'easy' : diff === 'Medium' ? 'medium' : 'hard';
  for (const [i, d] of solveSail(MARIGOLD_CHART.variants[variant].chart, true)!.entries()) {
    await page.keyboard.press(ARROW[d]);
    await expect(page.getByTestId('sail-moves')).toContainText(`Moves: ${i + 1}`);
    await expect(page.getByTestId('sail-board')).not.toHaveAttribute('data-busy', 'true', { timeout: 15000 });
    await page.waitForTimeout(250);
  }
  await celebrate(page);
  await playThrough(page);
  await toMap(page, 'isle');
  await expect.poll(() => flag(page, 'isle:landed'), { timeout: 10000 }).toBe(true);
  await playThrough(page);

  // the stone door's pirate riddle (pick it, or type it on Tricky)
  await useAt(page, 23.5, 8.5, 'Read the door');
  await playThrough(page);
  await expect(page.getByTestId('puzzle')).toBeVisible();
  await page.waitForTimeout(400);
  const q = (await page.getByTestId('riddle-text').textContent())!;
  const riddle = PIRATE_RIDDLES.find((r) => r.q === q)!;
  expect(riddle).toBeTruthy();
  if (await page.getByTestId('riddle-input').count()) {
    await page.getByTestId('riddle-input').fill(riddle.answers[0]);
    await page.getByTestId('riddle-input').press('Enter');
  } else {
    const labels = await page.locator('[data-testid^="riddle-choice-"]').allTextContents();
    const right = labels.findIndex((l) => riddle.answers.some((a) => a.toLowerCase() === l.trim().toLowerCase()));
    await press(page, `[data-testid="riddle-choice-${right}"]`);
  }
  await celebrate(page);
  await playThrough(page);
  expect(await flag(page, 'isle:door')).toBe(true);
  await toMap(page, 'isle');
  await tp(page, 23.5, 8.3);
  await expect.poll(() => hook(page, 'prompt'), { timeout: 8000 }).toBe('Enter');
  await pressUntil(page, 'KeyE', async () => (await hook<string>(page, 'mapId')) === 'cave');
  await toMap(page, 'cave');

  // the treasure chest's gear lock
  await useAt(page, 5.5, 5.0, 'Treasure!');
  await expect(page.getByTestId('puzzle')).toBeVisible();
  await page.waitForTimeout(400);
  for (const n of await hook<number[]>(page, 'puzzleSecret')) await page.getByTestId(`code-pick-${n}`).click();
  await page.getByTestId('code-check').click();
  await celebrate(page);
  await playThrough(page);
  expect(await hook<string[]>(page, 'sands')).toContain('pirate');

  // back to Sandy Cove for the party, then home
  await hook(page, 'goTo', 'isle', 'landing');
  await toMap(page, 'isle');
  await useAt(page, 3.8, 14.8, 'Row back');
  await press(page, '[data-testid="choice-0"]');
  await toMap(page, 'cove');
  await expect.poll(() => flag(page, 'pirate:party'), { timeout: 10000 }).toBe(true);
  await playThrough(page, 60_000);
  expect(await flag(page, 'marigold:friend')).toBe(true);
  await homeWithTheSand(page, [7.5, 19.3], 'pirate');
  await expect.poll(async () => (await hook<any>(page, 'quests')).finished).toContain('pirate-sand');
  expect((await hook<any>(page, 'state')).tockens).toBeGreaterThan(tockens0 + 50);
  expect((await hook<any>(page, 'state')).notes.length).toBeGreaterThanOrEqual(5);
}

// ------------------------------------------------------------------ chapter 2: 1950s America
/** Bowl the Starlight Junior Cup final on autopilot until it's won. */
export async function winTheCup(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 3 && !(await flag(page, 'cup:won')); attempt++) {
    await useAt(page, 8, 8.6, 'Bowl!');
    await expect(page.getByTestId('choice-0')).toBeVisible();
    await press(page, '[data-testid="choice-0"]'); // "Let's bowl!"
    await expect(page.getByTestId('bowl-setup')).toBeVisible();
    await hook(page, 'bowlSpeed', 6);
    await hook(page, 'bowlAuto', true);
    await press(page, '[data-testid="bowl-start"]');
    await expect(page.getByTestId('bowl-results')).toBeVisible({ timeout: 280_000 });
    await hook(page, 'bowlAuto', false);
    await press(page, '[data-testid="bowl-done"]');
    await playThrough(page, 60_000);
  }
  expect(await flag(page, 'cup:won')).toBe(true);
}

export async function fiftiesChapter(page: Page, two: boolean): Promise<void> {
  await travel(page, 'fifties', 'fifties', 'maple:arrived');
  expect((await hook<any>(page, 'state')).notes).toContain('fifties-rock');

  // the Starlight Lanes: Rollo, bowling shoes, the cup
  await enter(page, 32.7, 11.6, 'lanes');
  await talkTo(page, 'rollo');
  expect(await flag(page, 'met:rollo')).toBe(true);
  await useAt(page, 14.4, 5.6, 'Shoes');
  await playThrough(page); // "Yes, lace them up!"
  expect(await flag(page, 'lanes:shoes')).toBe(true);
  expect((await hook<any>(page, 'state')).players[0].outfit.shoes.id).toBe('saddle-shoes');
  await winTheCup(page);
  expect(await hook<string[]>(page, 'sands')).toContain('fifties');
  expect(await inv(page, 'bowling-pin')).toBe(1);

  // the sock hop at the diner
  await hook(page, 'goTo', 'fifties', 'lanes-out');
  await toMap(page, 'fifties');
  await enter(page, 10, 11.6, 'diner');
  await talkTo(page, 'rosita'); // "Everybody, shoes off — socks on!"
  await danceItOut(page, two);
  expect(await flag(page, 'sockhop:danced')).toBe(true);
  // Poppy was twirling to the music
  await greetBunny(page, 'poppy');

  // home: the second sand, and Tockwood grows
  await hook(page, 'goTo', 'fifties', 'portal');
  await toMap(page, 'fifties');
  await homeWithTheSand(page, [8, 24.2], 'fifties');
  expect(await flag(page, 'bowling:open')).toBe(true);
  expect(await flag(page, 'rosita:arrived')).toBe(true);
  await expect.poll(async () => (await hook<any>(page, 'quests')).finished).toContain('fifties-sand');
}

// ------------------------------------------------------------------ chapter 3: Ancient Egypt
/** Answer whichever riddle is showing (picking it, or typing it on Tricky). */
export async function answerRiddle(page: Page, pool: Riddle[]): Promise<void> {
  await expect(page.getByTestId('puzzle')).toBeVisible();
  await page.waitForTimeout(400);
  const q = (await page.getByTestId('riddle-text').textContent())!;
  const riddle = pool.find((r) => r.q === q)!;
  expect(riddle, q).toBeTruthy();
  if (await page.getByTestId('riddle-input').count()) {
    await page.getByTestId('riddle-input').fill(riddle.answers[0]);
    await page.getByTestId('riddle-input').press('Enter');
  } else {
    const labels = await page.locator('[data-testid^="riddle-choice-"]').allTextContents();
    const right = labels.findIndex((l) => riddle.answers.some((a) => a.toLowerCase() === l.trim().toLowerCase()));
    await press(page, `[data-testid="riddle-choice-${right}"]`);
  }
  await celebrate(page);
}

/** Slide the blocks out of the way with the keys, following the solver's moves. */
export async function solveSlideBoard(page: Page, rows: string[]): Promise<void> {
  const level = parseLevel(rows);
  const moves = solveSlide(level)!;
  for (const m of moves) {
    const b = level.blocks.find((x) => x.id === m.id)!;
    await page.getByTestId(`block-${m.id}`).click(); // pick it up
    const key = b.dir === 'h' ? (m.d > 0 ? 'ArrowRight' : 'ArrowLeft') : m.d > 0 ? 'ArrowDown' : 'ArrowUp';
    for (let i = 0; i < Math.abs(m.d); i++) await page.keyboard.press(key);
    await page.keyboard.press('Escape'); // put it down
    await page.waitForTimeout(120);
  }
  await celebrate(page);
}

async function variantOf(page: Page): Promise<'easy' | 'medium' | 'hard'> {
  const diff = (await page.getByTestId('pz-difficulty').textContent())!.trim();
  return diff === 'Easy' ? 'easy' : diff === 'Medium' ? 'medium' : 'hard';
}

export async function egyptChapter(page: Page, two: boolean): Promise<void> {
  // the master builder has lost his plans
  await talkTo(page, 'neb');
  await playThrough(page);
  expect(await flag(page, 'met:neb')).toBe(true);

  // the Sphinx's riddle gauntlet: three right answers in a row
  await useAt(page, 16.8, 9.8, 'Talk');
  await advanceDialogue(page); // the Sphinx wakes up, chats... "Ready!"
  for (let i = 0; i < 3; i++) {
    await answerRiddle(page, EGYPT_RIDDLES);
    if (i < 2) await advanceDialogue(page); // "CORRECT! Riddle number two..."
  }
  await playThrough(page);
  expect(await flag(page, 'sphinx:passed')).toBe(true);
  expect((await hook<any>(page, 'state')).wardrobe).toContain('nemes');
  await greetBunny(page, 'nibbles'); // napping between the Sphinx's paws

  // the tomb is pitch dark: Glowbroth from Sesi's pot (black cumin, sea salt, a radish)
  await talkTo(page, 'sesi');
  await playThrough(page);
  await useAt(page, 11.2, 17.3, 'Shop');
  for (const id of ['black-cumin', 'sea-salt', 'radish']) await press(page, `[data-testid="stall-buy-${id}"]`);
  await press(page, '[data-testid="stall-done"]');
  await useAt(page, 19.6, 17.5, 'Cook');
  await expect(page.getByTestId('cauldron')).toBeVisible();
  for (const id of ['black-cumin', 'sea-salt', 'radish']) await page.getByTestId(`cd-ing-${id}`).click();
  await press(page, '[data-testid="cd-stir"]');
  for (const k of two ? ['KeyE', 'Slash', 'KeyE', 'Slash', 'KeyE', 'Slash', 'KeyE', 'Slash'] : ['KeyE', 'KeyE', 'KeyE', 'KeyE']) {
    await page.waitForTimeout(420);
    await page.keyboard.press(k);
  }
  await expect(page.getByTestId('cd-result')).toHaveAttribute('data-soup', 'glowbroth');
  await page.waitForTimeout(350);
  await press(page, '[data-testid="cd-drink"]');
  await playThrough(page);
  expect((await hook<any[]>(page, 'effects')).map((e) => e.effect)).toContain('glow');

  // inside the old tomb: the plans, and a cousin lost in the dark
  await enter(page, 8, 7.6, 'tomb');
  await playThrough(page); // "Your glow fills the old tomb!"
  await useAt(page, 7, 5.8, 'Look');
  await playThrough(page);
  expect(await flag(page, 'plans:found')).toBe(true);
  expect(await inv(page, 'pyramid-plans')).toBe(1);
  await greetBunny(page, 'lotus');

  // the plans back to Neb, then the stones on the ramp
  await hook(page, 'goTo', 'egypt', 'tomb-out');
  await toMap(page, 'egypt');
  await talkTo(page, 'neb');
  await playThrough(page);
  expect(await flag(page, 'plans:given')).toBe(true);
  await useAt(page, 31.4, 15.8, 'Ramp');
  await expect(page.getByTestId('puzzle')).toBeVisible();
  await page.waitForTimeout(400);
  await solveSlideBoard(page, RAMP_STONES.variants[await variantOf(page)].rows);
  await playThrough(page, 60_000);
  expect(await flag(page, 'capstone:placed')).toBe(true);
  expect(await hook<string[]>(page, 'sands')).toContain('egypt');

  // the builders' festival
  await useAt(page, 15.6, 20.3, 'Dance!');
  await advanceDialogue(page); // "let the festival BEGIN!"
  await danceItOut(page, two);
  await playThrough(page);
  expect(await flag(page, 'festival:danced')).toBe(true);
  expect(await inv(page, 'egypt-lamp')).toBe(1);
  expect((await hook<any>(page, 'state')).wardrobe).toContain('shendyt');

  // Sandy hides with the builders' baskets until Biscuit sniffs her out — and the cousins found a sand too
  await tp(page, 42.4, 19.8);
  await page.waitForTimeout(1200);
  await pressUntil(page, 'KeyQ', () => hook(page, 'getFlag', 'found:sandy') as Promise<boolean>);
  await page.waitForTimeout(700);
  await greetBunny(page, 'sandy');
  await playThrough(page);
  expect(await hook<string[]>(page, 'sands')).toContain('egypt-cousins');

  // home: both sands into the Great Hourglass, and Ankhi comes to visit
  await homeWithTheSand(page, [5, 23.9], 'egypt');
  expect(await flag(page, 'sand:egypt-cousins:placed')).toBe(true);
  expect(await flag(page, 'ankhi:arrived')).toBe(true);
  await expect.poll(async () => (await hook<any>(page, 'quests')).finished).toContain('egypt-sand');
  await expect.poll(async () => (await hook<any>(page, 'quests')).finished).toContain('egypt-bunnies');
}

// ------------------------------------------------------------------ chapter 4: Renaissance Florence
/** A pattern puzzle: pick the right painted tile, row after row. */
async function solvePattern(page: Page, rounds: { answer: string }[]): Promise<void> {
  for (const r of rounds) {
    const choice = page.locator(`.sq-choice[data-token="${r.answer}"]`);
    await expect(choice).toBeVisible();
    await expect(choice).toBeEnabled();
    await page.waitForTimeout(250);
    await choice.click();
    await page.waitForTimeout(700);
  }
  await celebrate(page);
}

/** A logic grid: tick (✓) every right answer — a ✓ crosses out the rest of its row and column. */
async function solveGrid(page: Page, answer: number[][]): Promise<void> {
  for (let c = 0; c < answer.length; c++)
    for (let s = 0; s < answer[c].length; s++) {
      const cell = page.getByTestId(`grid-${c}-${s}-${answer[c][s]}`);
      await cell.click(); // ✗
      await cell.click(); // ✓
    }
  await celebrate(page);
}

export async function florenceChapter(page: Page, two: boolean): Promise<void> {
  // the Duchess and her court dance that can't begin
  await talkTo(page, 'orsola');
  await playThrough(page);
  expect(await flag(page, 'met:orsola')).toBe(true);

  // Fiorella's studio: mend the fresco's painted border
  await enter(page, 38.5, 14.4, 'studio');
  await talkTo(page, 'fiorella');
  await playThrough(page);
  await useAt(page, 6.5, 4.0, 'Look');
  await expect(page.getByTestId('puzzle')).toBeVisible();
  await page.waitForTimeout(400);
  await solvePattern(page, FIORELLA_FRESCO.variants[await variantOf(page)].rounds);
  await playThrough(page);
  expect(await flag(page, 'fresco:mended')).toBe(true);
  expect((await hook<any>(page, 'state')).wardrobe).toContain('painter-smock');
  // Sketch hides among the canvases until Biscuit sniffs
  await tp(page, 2.8, 6.9);
  await page.waitForTimeout(1200);
  await pressUntil(page, 'KeyQ', () => hook(page, 'getFlag', 'found:sketch') as Promise<boolean>);
  await page.waitForTimeout(700);
  await greetBunny(page, 'sketch');

  // Maestra Lucia's workshop: the lion's gear lock, then its jumbled parts
  await hook(page, 'goTo', 'florence', 'studio-out');
  await toMap(page, 'florence');
  await enter(page, 7.5, 14.4, 'workshop');
  await talkTo(page, 'lucia');
  await playThrough(page);
  await useAt(page, 7, 7.2, 'Look');
  await expect(page.getByTestId('puzzle')).toBeVisible();
  await page.waitForTimeout(400);
  for (const n of await hook<number[]>(page, 'puzzleSecret')) await page.getByTestId(`code-pick-${n}`).click();
  await page.getByTestId('code-check').click();
  await celebrate(page);
  await advanceDialogue(page); // "The panel is open! ...let's put them back!"
  await expect(page.getByTestId('puzzle')).toBeVisible();
  await page.waitForTimeout(400);
  const grid = LUCIA_LION.variants[await variantOf(page)] as { answer: number[][] };
  await solveGrid(page, grid.answer);
  await playThrough(page, 60_000);
  expect(await flag(page, 'lion:awake')).toBe(true);
  expect(await hook<string[]>(page, 'sands')).toContain('florence');

  // Pesto in the herb garden; Twirl stuck up high (Hopscotch Chowder from Beppe's pot)
  await hook(page, 'goTo', 'florence', 'workshop-out');
  await toMap(page, 'florence');
  await greetBunny(page, 'pesto');
  await useAt(page, 43.2, 22.4, 'Look up');
  await playThrough(page); // "Help! ...super-bunny jumps!"
  expect(await flag(page, 'rescued:twirl')).toBeFalsy();
  await useAt(page, 14.6, 21.1, 'Shop');
  for (const id of ['lettuce', 'carrot', 'honey']) await press(page, `[data-testid="stall-buy-${id}"]`);
  await press(page, '[data-testid="stall-done"]');
  await useAt(page, 8.2, 22.9, 'Cook');
  await expect(page.getByTestId('cauldron')).toBeVisible();
  for (const id of ['lettuce', 'carrot', 'honey']) await page.getByTestId(`cd-ing-${id}`).click();
  await press(page, '[data-testid="cd-stir"]');
  for (const k of two ? ['KeyE', 'Slash', 'KeyE', 'Slash', 'KeyE', 'Slash', 'KeyE', 'Slash'] : ['KeyE', 'KeyE', 'KeyE', 'KeyE']) {
    await page.waitForTimeout(420);
    await page.keyboard.press(k);
  }
  await expect(page.getByTestId('cd-result')).toHaveAttribute('data-soup', 'hopscotch-chowder');
  await page.waitForTimeout(350);
  await press(page, '[data-testid="cd-drink"]');
  await playThrough(page);
  await useAt(page, 43.2, 22.4, 'Look up');
  await playThrough(page); // BOING! ...and the cousins' sand
  expect((await hook<any>(page, 'state')).bunnies).toContain('twirl');
  expect(await hook<string[]>(page, 'sands')).toContain('florence-cousins');

  // the Duchess's court dance
  await useAt(page, 29.5, 22.0, 'Dance!');
  await advanceDialogue(page); // "Musicians — play!"
  await danceItOut(page, two);
  await playThrough(page);
  expect(await flag(page, 'court:danced')).toBe(true);
  expect(await inv(page, 'globe')).toBe(1);

  // home with both sands; Maestra Lucia comes to visit Rocco
  await homeWithTheSand(page, [22, 24.5], 'florence');
  expect(await flag(page, 'sand:florence-cousins:placed')).toBe(true);
  expect(await flag(page, 'lucia:arrived')).toBe(true);
  await expect.poll(async () => (await hook<any>(page, 'quests')).finished).toContain('florence-sand');
  await expect.poll(async () => (await hook<any>(page, 'quests')).finished).toContain('florence-bunnies');
}
