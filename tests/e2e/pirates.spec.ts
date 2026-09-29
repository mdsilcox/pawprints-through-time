import { test, expect, type Page } from '@playwright/test';
import { advanceDialogue, hook, playThrough, press, pressUntil, startGame, talkTo, watchErrors } from './helpers';
import { parseLevel, solve as solveSlide } from '../../src/puzzles/logic/sliding';
import { BOSUN_BARRELS } from '../../src/puzzles/content/pirates';
import { pirateChapter } from './flows';

const ARROW: Record<string, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const inv = async (page: Page, id: string) => (await hook<Record<string, number>>(page, 'inventory'))[id] ?? 0;
const flag = (page: Page, k: string) => hook(page, 'getFlag', k);

/** Hop player 1 (and player 2 right behind, in a two-player game) to a spot. */
async function tp(page: Page, x: number, y: number) {
  await hook(page, 'teleport', x, y, 0);
  if (await hook<boolean>(page, 'twoPlayer')) await hook(page, 'teleport', x - 0.9, y + 0.3, 1);
}

async function useAt(page: Page, x: number, y: number, label: string) {
  await tp(page, x, y);
  await expect.poll(() => hook(page, 'prompt'), { timeout: 8000 }).toBe(label);
  await pressUntil(page, 'KeyE', async () => (await hook<boolean>(page, 'dialogueOpen')) || (await page.getByTestId('puzzle').count()) > 0 || (await hook<string[]>(page, 'ui')).length > 0);
}

async function celebrate(page: Page) {
  await expect(page.getByTestId('pz-solved')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(750);
  await press(page, '[data-testid="pz-done"]');
  await expect(page.getByTestId('puzzle')).toHaveCount(0);
}

/** Press through a conversation, answering every question with choice `n`. */
async function answerAll(page: Page, n: number) {
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

async function toMap(page: Page, id: string) {
  await expect.poll(() => hook<string>(page, 'mapId'), { timeout: 15000 }).toBe(id);
  await page.waitForTimeout(900);
}

/** Solve the torn-map jigsaw by reading which piece sits where. */
async function solveJigsaw(page: Page) {
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

test.describe('the Golden Age of Piracy', () => {
  test('a full chapter: portal → the four map pieces → the torn map → Pirate’s Gumbo → the Shoals → the stone door → the treasure → home', async ({ page }, info) => {
    test.setTimeout(480_000);
    const two = info.project.name === 'phone'; // the desktop plays it solo, the phone as a pair
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    if (two) await hook(page, 'joinP2');
    await hook(page, 'setFlag', 'portal:ready', true);
    await pirateChapter(page, two);
    expect(errors).toEqual([]);
  });

  test('three lost cousins come home: a sniff in the hold, a barrel jam on the pier, a shell collector on the island', async ({ page }) => {
    test.setTimeout(240_000);
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    for (const f of ['pip:companion', 'cove:arrived']) await hook(page, 'setFlag', f, true);
    // Skipper hides in the cargo hold until Biscuit sniffs
    await hook(page, 'goTo', 'hold', 'in');
    await toMap(page, 'hold');
    await hook(page, 'teleport', 8.6, 6.1, 0);
    await page.waitForTimeout(1200);
    await expect.poll(() => hook(page, 'prompt')).not.toBe('Talk');
    await pressUntil(page, 'KeyQ', () => hook(page, 'getFlag', 'found:skipper') as Promise<boolean>);
    await page.waitForTimeout(700);
    await hook(page, 'teleport', 9.4, 6.2, 0);
    await expect.poll(() => hook(page, 'prompt'), { timeout: 8000 }).toBe('Talk');
    await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
    await playThrough(page);
    expect((await hook<any>(page, 'state')).bunnies).toContain('skipper');
    expect((await hook<any>(page, 'state')).wardrobe).toContain('pirate-hat');
    // Bosun behind the barrels on the pier (a sliding puzzle)
    await hook(page, 'goTo', 'cove', 'portal');
    await toMap(page, 'cove');
    await useAt(page, 25.6, 19.3, 'Barrels');
    await playThrough(page);
    await expect(page.getByTestId('puzzle')).toBeVisible();
    await page.waitForTimeout(400);
    const diff = (await page.getByTestId('pz-difficulty').textContent())!.trim();
    const level = parseLevel(BOSUN_BARRELS.variants[diff === 'Easy' ? 'easy' : diff === 'Medium' ? 'medium' : 'hard'].rows);
    for (const m of solveSlide(level)!) {
      const b = level.blocks.find((x) => x.id === m.id)!;
      await page.getByTestId(`block-${m.id}`).click();
      const key = b.dir === 'h' ? (m.d > 0 ? 'ArrowRight' : 'ArrowLeft') : m.d > 0 ? 'ArrowDown' : 'ArrowUp';
      for (let i = 0; i < Math.abs(m.d); i++) await page.keyboard.press(key);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(120);
    }
    await celebrate(page);
    await playThrough(page);
    expect((await hook<any>(page, 'state')).bunnies).toContain('bosun');
    expect(await hook(page, 'getFlag', 'scrap:scrap-cove-camp')).toBe(true); // he was sitting on a map scrap
    // Shelly on Treasure Island's beach
    await hook(page, 'setFlag', 'isle:landed', true);
    await hook(page, 'goTo', 'isle', 'landing');
    await toMap(page, 'isle');
    await hook(page, 'teleport', 26.8, 16.4, 0);
    await expect.poll(() => hook(page, 'prompt'), { timeout: 8000 }).toBe('Talk');
    await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
    await playThrough(page);
    await expect.poll(async () => (await hook<any>(page, 'state')).bunnies).toContain('shelly');
    // three cousins home: the Hopkins family's thank-you headbands
    expect((await hook<any>(page, 'state')).wardrobe).toContain('bunny-ears');
    await expect.poll(async () => (await hook<any>(page, 'quests')).finished).toContain('pirate-bunnies');
    expect(errors).toEqual([]);
  });

  test('crew only: Pepper keeps you off the ship until you dress like deckhands (the Wardrobe works too)', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    for (const f of ['pip:companion', 'cove:arrived']) await hook(page, 'setFlag', f, true);
    await hook(page, 'goTo', 'cove', 'portal');
    await toMap(page, 'cove');
    // walking down the pier: the rope across the gangplank stops you
    await hook(page, 'teleport', 28.5, 22.6, 0);
    await hook(page, 'hold', 0, 1, 0);
    await page.waitForTimeout(1000);
    await hook(page, 'release', 0);
    expect((await hook<{ x: number }[]>(page, 'players'))[0].x).toBeLessThan(29.2);
    // Pepper squawks, Pip has an idea
    await hook(page, 'teleport', 28.5, 22.6, 0);
    await expect.poll(() => hook(page, 'prompt'), { timeout: 8000 }).toBe('Board ship');
    await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
    await answerAll(page, 0);
    expect(await hook(page, 'getFlag', 'crew:aboard')).toBeFalsy();
    // borrow from the washing line, but dress up with the Wardrobe yourself
    await useAt(page, 24.8, 15.0, 'Washing line');
    await answerAll(page, 1);
    expect((await hook<any>(page, 'state')).wardrobe).toEqual(expect.arrayContaining(['deckhand-bandana', 'sailor-shirt']));
    await page.keyboard.press('Escape');
    await press(page, '[data-testid="pause-wardrobe"]');
    await press(page, '[data-testid="wd-item-deckhand-bandana"]');
    await press(page, '[data-testid="wardrobe-done"]');
    await press(page, '[data-testid="pause-resume"]');
    expect((await hook<any>(page, 'state')).players[0].outfit.hat.id).toBe('deckhand-bandana');
    // now Pepper waves you aboard, and the way onto the deck is open
    await useAt(page, 28.5, 22.6, 'Board ship');
    await playThrough(page);
    expect(await hook(page, 'getFlag', 'crew:aboard')).toBe(true);
    await hook(page, 'hold', 0, 1, 0);
    await expect.poll(async () => (await hook<{ x: number }[]>(page, 'players'))[0].x, { timeout: 6000 }).toBeGreaterThan(30.2);
    await hook(page, 'release', 0);
    // proper sailors get sailor's prices at Coco's stall
    await talkTo(page, 'coco');
    await expect(page.getByTestId('stall-buy-coconut')).toContainText('1');
    await press(page, '[data-testid="stall-done"]');
    expect(errors).toEqual([]);
  });

  test('X marks the spot: a map scrap puts an X on your Map, and Biscuit digs up what’s buried there', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    for (const f of ['pip:companion', 'cove:arrived', 'crew:aboard', 'met:marigold', 'map:search', 'map:pepper']) await hook(page, 'setFlag', f, true);
    await hook(page, 'goTo', 'cove', 'portal');
    await toMap(page, 'cove');
    const coins = await inv(page, 'doubloon');
    await talkTo(page, 'pepper'); // "Another pretty map! Take it!"
    expect(await hook(page, 'getFlag', 'scrap:scrap-cove-west')).toBe(true);
    expect(await inv(page, 'scrap-cove-west')).toBe(1);
    // the X shows on the local map...
    await hook(page, 'openMap');
    await expect(page.locator('.map-mark.xmark')).toHaveCount(1);
    await expect(page.locator('.map-legend')).toContainText('Treasure X');
    await press(page, '[data-testid="map-close"]');
    await expect(page.getByTestId('map-view')).toHaveCount(0);
    // ...and in the world: dig there
    const x = (await hook<any[]>(page, 'digSpots')).find((s) => s.x)!;
    expect(x.revealed).toBe(true);
    await hook(page, 'teleport', x.cx + 0.5, x.cy + 1.3, 0);
    await page.waitForTimeout(900);
    await expect.poll(() => hook(page, 'prompt'), { timeout: 8000 }).toBe('Dig');
    await pressUntil(page, 'KeyE', () => hook(page, 'getFlag', 'dug:scrap-cove-west') as Promise<boolean>);
    await expect.poll(() => inv(page, 'doubloon'), { timeout: 8000 }).toBe(coins + 2);
    expect((await hook<any>(page, 'state')).wardrobe).toContain('eyepatch');
    expect((await hook<any[]>(page, 'digSpots')).some((s) => s.x)).toBe(false);
  });

  test('rough seas: the first look at the Shoals is just a look — Pip explains why, and leaving costs nothing', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    for (const f of ['pip:companion', 'cove:arrived', 'crew:aboard', 'met:marigold', 'map:search', 'map:whole', 'met:cookie', 'crew:respect']) await hook(page, 'setFlag', f, true);
    await hook(page, 'goTo', 'cove', 'from-isle');
    await expect.poll(() => hook<string>(page, 'mapId')).toBe('cove');
    await page.waitForTimeout(900);
    const skill = (await hook<any>(page, 'puzzles')).skill;
    await hook(page, 'teleport', 40.9, 24.3, 0);
    await expect.poll(() => hook(page, 'prompt'), { timeout: 8000 }).toBe('Set sail');
    await pressUntil(page, 'KeyE', () => hook<boolean>(page, 'dialogueOpen'));
    await advanceDialogue(page); // "Take a look at the chart, shipmate..."
    await expect(page.getByTestId('puzzle')).toBeVisible();
    await expect(page.getByTestId('pz-preview')).toBeVisible();
    await expect(page.getByTestId('pz-bubble')).toContainText('Gumbo');
    // Pip's "hint" is the honest one: this chart can't be sailed in rough seas
    await press(page, '[data-testid="pz-hint"]');
    await expect(page.getByTestId('pz-bubble')).toContainText('Gumbo');
    await press(page, '[data-testid="pz-leave"]');
    await playThrough(page); // "Nobody sails the Swirling Shoals without a belly full of Pirate's Gumbo!"
    const after = await hook<any>(page, 'puzzles');
    expect(after.skill).toBe(skill);
    expect(after.records['marigold-chart']).toBeUndefined();
  });

  test('an eager extra press after the portal can’t skip the arrival scene', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    await hook(page, 'setFlag', 'portal:ready', true);
    await hook(page, 'goTo', 'clocktower', 'in');
    await toMap(page, 'clocktower');
    await useAt(page, 10.5, 7.6, 'Portal');
    await press(page, '[data-testid="wm-go-pirate"]');
    // mash the action button through Pip's travel lines and on into the cove
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('KeyE');
      await page.waitForTimeout(140);
    }
    await expect.poll(() => hook<string>(page, 'mapId'), { timeout: 15000 }).toBe('cove');
    await expect.poll(() => flag(page, 'cove:arrived'), { timeout: 15000 }).toBe(true);
    await playThrough(page, 60_000);
    expect(await hook<string>(page, 'mapId')).toBe('cove');
    expect((await hook<any>(page, 'state')).notes).toContain('pirate-golden-age');
    expect(errors).toEqual([]);
  });

  test('the Map of Time only opens eras whose Time Sand is calling', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await hook(page, 'openWorldMap');
    await expect(page.getByTestId('world-map')).toBeVisible();
    await expect(page.getByTestId('wm-go-pirate')).toHaveCount(0); // the portal isn't awake yet
    await press(page, '[data-testid="wm-close"]');
    await hook(page, 'setFlag', 'portal:ready', true);
    await hook(page, 'openWorldMap');
    await expect(page.getByTestId('wm-go-pirate')).toBeVisible();
    await expect(page.locator('.wm-stop.locked')).toHaveCount(3);
    await press(page, '[data-testid="wm-close"]');
  });
});
