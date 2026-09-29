import { test, expect, type Page } from '@playwright/test';
import { bootToTitle, hook, press, pressUntil, startGame, watchErrors } from './helpers';

/** The planner's working state: what's placed, what's carried, where the cursor is, what's in storage. */
interface PlannerState {
  items: { uid: string; id: string; x: number; y: number; rot: number }[];
  held: { id: string; x: number; y: number; rot: number } | null;
  cursor: { x: number; y: number };
  stored: { id: string; n: number }[];
}
const st = (page: Page) => hook<PlannerState>(page, 'plannerState');
const placedAt = async (page: Page, id: string) => (await st(page)).items.filter((i) => i.id === id);

async function intoCottage(page: Page): Promise<void> {
  await hook(page, 'goTo', 'cottage', 'in');
  await expect.poll(() => hook<string>(page, 'mapId')).toBe('cottage');
}

/** The centre of a room cell on the planner's picture of the cottage (11 × 9 cells). */
async function cellPoint(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const b = (await page.locator('.pl-canvas').boundingBox())!;
  return { x: b.x + ((x + 0.5) * b.width) / 11, y: b.y + ((y + 0.5) * b.height) / 9 };
}

test.describe('home decorating', () => {
  test('decorate the cottage with the keys: move, turn, put away, bring out a treasure — and it stays that way', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    await hook(page, 'give', 'pirate-chest', 1);
    await intoCottage(page);
    // the planner waits just inside the door
    await expect.poll(() => hook(page, 'prompt')).toBe('Decorate');
    await pressUntil(page, 'KeyE', async () => (await page.getByTestId('planner').count()) > 0);
    await expect(page.getByTestId('planner-room')).toBeFocused();
    await page.waitForTimeout(350);

    // the table: step onto it, pick it up, carry it down a row, put it down
    expect((await st(page)).cursor).toEqual({ x: 5, y: 6 });
    await page.keyboard.press('KeyW');
    await page.keyboard.press('KeyE');
    await expect.poll(async () => (await st(page)).held?.id).toBe('table');
    await page.keyboard.press('KeyS');
    await page.keyboard.press('KeyE');
    await expect.poll(async () => (await st(page)).held).toBeNull();
    expect((await placedAt(page, 'table'))[0]).toMatchObject({ x: 4, y: 6, rot: 0 });

    // turning the table now would wall off the corner behind it: not allowed
    await page.keyboard.press('KeyR');
    await expect(page.getByTestId('planner-status')).toContainText('No room to turn');
    expect((await placedAt(page, 'table'))[0].rot).toBe(0);
    // the chair beside it turns round to face the wall
    await page.keyboard.press('KeyD');
    await page.keyboard.press('KeyW');
    await expect.poll(async () => (await st(page)).cursor).toEqual({ x: 6, y: 5 });
    const before = (await placedAt(page, 'chair')).find((c) => c.x === 6)!.rot;
    await page.keyboard.press('KeyR');
    await expect.poll(async () => (await placedAt(page, 'chair')).find((c) => c.x === 6)!.rot).toBe((before + 1) % 4);

    // the plant goes into storage
    for (const k of ['KeyD', 'KeyD', 'KeyD', 'KeyS', 'KeyS']) await page.keyboard.press(k);
    await expect.poll(async () => (await st(page)).cursor).toEqual({ x: 9, y: 7 });
    await page.keyboard.press('Delete');
    await expect.poll(async () => (await st(page)).stored.map((s) => s.id)).toContain('plant');

    // the pirate chest comes out of storage...
    await press(page, '[data-testid="planner-take-pirate-chest"]');
    await expect.poll(async () => (await st(page)).held?.id).toBe('pirate-chest');
    await expect(page.getByTestId('planner-room')).toBeFocused();
    // ...and can't block the doorway
    const held = (await st(page)).held!;
    for (let i = held.x; i > 5; i--) await page.keyboard.press('KeyA');
    for (let j = held.y; j < 7; j++) await page.keyboard.press('KeyS');
    await expect.poll(async () => (await st(page)).held).toMatchObject({ x: 5, y: 7 });
    await page.keyboard.press('KeyE');
    await expect(page.getByTestId('planner-status')).toContainText('doorway');
    expect((await st(page)).held?.id).toBe('pirate-chest');
    await page.keyboard.press('KeyD');
    await page.keyboard.press('KeyD');
    await page.keyboard.press('KeyE');
    await expect.poll(async () => (await st(page)).held).toBeNull();
    expect((await placedAt(page, 'pirate-chest'))[0]).toMatchObject({ x: 7, y: 7 });

    await press(page, '[data-testid="planner-done"]');
    await expect(page.getByTestId('planner')).toHaveCount(0);
    // the room is rebuilt around the new layout: the chest and the moved table are solid, the plant's corner is free
    await expect.poll(() => hook<boolean>(page, 'solidAt', 7, 7)).toBe(true);
    expect(await hook<boolean>(page, 'solidAt', 5, 6)).toBe(true);
    expect(await hook<boolean>(page, 'solidAt', 9, 7)).toBe(false);
    const home = await hook<PlannerState['items']>(page, 'home');
    expect(home.find((i) => i.id === 'table')).toMatchObject({ x: 4, y: 6, rot: 0 });
    expect(home.find((i) => i.id === 'chair' && i.x === 6)?.rot).toBe((before + 1) % 4);
    expect(home.some((i) => i.id === 'plant')).toBe(false);

    // still like that after saving and coming back
    await hook(page, 'save');
    await page.reload();
    await bootToTitle(page);
    await press(page, '[data-testid="title-continue"]');
    await expect.poll(() => hook<string>(page, 'mapId')).toBe('cottage');
    expect((await hook<PlannerState['items']>(page, 'home')).find((i) => i.id === 'pirate-chest')).toMatchObject({ x: 7, y: 7 });
    await expect.poll(() => hook<boolean>(page, 'solidAt', 7, 7)).toBe(true);
    expect(errors).toEqual([]);
  });

  test('on a touchscreen: drag furniture about, or tap to lift it and tap where it goes', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'touch play is checked on the phone');
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    await hook(page, 'give', 'sofa', 1);
    await intoCottage(page);
    await hook(page, 'openPlanner');
    await expect(page.getByTestId('planner')).toBeVisible();
    await page.waitForTimeout(400);

    // drag the right-hand chair two cells to the right and one down
    const from = await cellPoint(page, 6, 5);
    const to = await cellPoint(page, 8, 6);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
    await expect.poll(async () => (await placedAt(page, 'chair')).map((c) => `${c.x},${c.y}`).sort()).toEqual(['3,5', '8,6']);

    // tap the lamp to lift it, then tap where it should go
    const lamp = await cellPoint(page, 1, 7);
    await page.touchscreen.tap(lamp.x, lamp.y);
    await expect.poll(async () => (await st(page)).held?.id).toBe('lampfloor');
    const spot = await cellPoint(page, 2, 6);
    await page.touchscreen.tap(spot.x, spot.y);
    await expect.poll(async () => (await st(page)).held).toBeNull();
    expect((await placedAt(page, 'lampfloor'))[0]).toMatchObject({ x: 2, y: 6 });

    // the bed can be lifted but never put away; tapping it again sets it back down
    const bed = await cellPoint(page, 1, 3);
    await page.touchscreen.tap(bed.x, bed.y);
    await expect.poll(async () => (await st(page)).held?.id).toBe('bed');
    await expect(page.getByTestId('planner-away')).toBeDisabled();
    await page.touchscreen.tap(bed.x, bed.y);
    await expect.poll(async () => (await st(page)).held).toBeNull();
    expect((await placedAt(page, 'bed'))[0]).toMatchObject({ x: 1, y: 2 });

    // the new sofa: out of storage, a tap on a crowded spot says no, a tap on a clear one says yes
    await press(page, '[data-testid="planner-take-sofa"]');
    await expect.poll(async () => (await st(page)).held?.id).toBe('sofa');
    const crowded = await cellPoint(page, 7, 6); // the chair is at (8,6)
    await page.touchscreen.tap(crowded.x, crowded.y);
    await expect(page.getByTestId('planner-status')).toContainText(/already there/i);
    const clear = await cellPoint(page, 7, 4);
    await page.touchscreen.tap(clear.x, clear.y);
    await expect.poll(async () => (await st(page)).held).toBeNull();
    expect((await placedAt(page, 'sofa'))[0]).toMatchObject({ x: 7, y: 4, rot: 0 });

    // the Turn button works by touch too: lift a chair, turn it, set it down
    const chair = await cellPoint(page, 8, 6);
    await page.touchscreen.tap(chair.x, chair.y);
    await expect.poll(async () => (await st(page)).held?.id).toBe('chair');
    const r0 = (await st(page)).held!.rot;
    await press(page, '[data-testid="planner-turn"]');
    await expect.poll(async () => (await st(page)).held?.rot).toBe((r0 + 1) % 4);
    await page.touchscreen.tap(chair.x, chair.y);
    await expect.poll(async () => (await st(page)).held).toBeNull();
    expect((await placedAt(page, 'chair')).find((c) => c.x === 8)!.rot).toBe((r0 + 1) % 4);
    await press(page, '[data-testid="planner-done"]');
    await expect(page.getByTestId('planner')).toHaveCount(0);
    await expect.poll(() => hook<boolean>(page, 'solidAt', 7, 4)).toBe(true);
    expect(errors).toEqual([]);
  });

  test('Rocco builds furniture: buy an armchair at his stall and find it waiting in storage', async ({ page }) => {
    await startGame(page, [35.5, 20]);
    await hook(page, 'setTockens', 100);
    // Rocco pootles about in front of his stall — step up to the counter
    await expect
      .poll(
        async () => {
          await hook(page, 'teleport', 35.5, 18.45, 0);
          await page.waitForTimeout(150);
          return hook(page, 'prompt');
        },
        { timeout: 15000 },
      )
      .toBe('Shop');
    await pressUntil(page, 'KeyE', async () => (await page.getByTestId('stall-tockens').count()) > 0);
    await press(page, '[data-testid="stall-buy-armchair"]');
    await expect.poll(async () => (await hook<Record<string, number>>(page, 'inventory')).armchair).toBe(1);
    await expect(page.getByTestId('stall-tockens')).toContainText('60');
    await press(page, '[data-testid="stall-done"]');
    await intoCottage(page);
    await hook(page, 'openPlanner');
    await expect(page.getByTestId('planner-take-armchair')).toBeVisible();
  });
});
