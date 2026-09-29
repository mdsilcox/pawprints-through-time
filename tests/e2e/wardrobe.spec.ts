import { test, expect } from '@playwright/test';
import { hook, press, pressUntil, startGame, talkTo, watchErrors } from './helpers';

test.describe('wardrobe & tailor', () => {
  test('dress player 1 from the pause menu: the change shows on the character in the world', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page, [30.5, 24]);
    const before = (await hook<any>(page, 'textures')).players[0];
    await page.keyboard.press('Escape');
    await press(page, '[data-testid="pause-wardrobe"]');
    await expect(page.locator('.wardrobe-panel')).toBeVisible();
    await press(page, '[data-testid="wd-item-sunhat"]');
    await press(page, '[data-testid="wd-color-1"]');
    const st = await hook<any>(page, 'state');
    expect(st.players[0].outfit.hat).toEqual({ id: 'sunhat', color: 1 });
    // the world sprite was rebuilt for the new outfit
    await expect.poll(async () => (await hook<any>(page, 'textures')).players[0]).not.toBe(before);
    expect((await hook<any>(page, 'textures')).players[0]).toContain('sunhat:1');
    // bottoms and extras
    await press(page, '[data-testid="wd-slot-bottom"]');
    await press(page, '[data-testid="wd-item-skirt"]');
    await press(page, '[data-testid="wd-slot-acc"]');
    await press(page, '[data-testid="wd-item-round-glasses"]');
    const st2 = await hook<any>(page, 'state');
    expect(st2.players[0].outfit.bottom.id).toBe('skirt');
    expect(st2.players[0].outfit.acc.id).toBe('round-glasses');
    await press(page, '[data-testid="wardrobe-done"]');
    expect(errors).toEqual([]);
  });

  test('player 2 and Biscuit have their own outfits and looks', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await hook(page, 'joinP2');
    await hook(page, 'openWardrobe', 1);
    await expect(page.locator('.wardrobe-panel')).toBeVisible();
    await press(page, '[data-testid="wd-slot-top"]');
    await press(page, '[data-testid="wd-item-tee-striped"]');
    await press(page, '[data-testid="wd-slot-look"]');
    await press(page, '[data-testid="wd-skin-5"]');
    await press(page, '[data-testid="wd-hair-6"]');
    await press(page, '[data-testid="wd-style-2"]');
    const st = await hook<any>(page, 'state');
    expect(st.players[1].outfit.top.id).toBe('tee-striped');
    expect(st.players[1].look).toEqual({ skin: 5, hair: 6, hairStyle: 2 });
    expect(st.players[0].look).not.toEqual(st.players[1].look);
    await expect.poll(async () => (await hook<any>(page, 'textures')).players[1]).toContain('5.6.2');
    // Biscuit
    await press(page, '[data-testid="wd-who-biscuit"]');
    await press(page, '[data-testid="wd-item-party-bow"]');
    await press(page, '[data-testid="wd-slot-neck"]');
    await press(page, '[data-testid="wd-color-2"]');
    const st2 = await hook<any>(page, 'state');
    expect(st2.biscuit.outfit.hat.id).toBe('party-bow');
    expect(st2.biscuit.outfit.neck).toEqual({ id: 'biscuit-bandana', color: 2 });
    await expect.poll(async () => (await hook<any>(page, 'textures')).biscuit).toContain('bow');
  });

  test("Bramble's shop: try on, buy with Tockens, and a polite no when you can't afford it", async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await hook(page, 'setTockens', 100);
    await hook(page, 'openWardrobe', 0, true);
    await press(page, '[data-testid="wd-slot-top"]');
    await press(page, '[data-testid="wd-item-cardigan"]');
    // trying on does not equip or charge
    expect((await hook<any>(page, 'state')).players[0].outfit.top.id).not.toBe('cardigan');
    await expect(page.getByTestId('wd-buy')).toContainText('35');
    await press(page, '[data-testid="wd-buy"]');
    const st = await hook<any>(page, 'state');
    expect(st.tockens).toBe(65);
    expect(st.wardrobe).toContain('cardigan');
    expect(st.players[0].outfit.top.id).toBe('cardigan');
    // too expensive
    await hook(page, 'setTockens', 5);
    await press(page, '[data-testid="wd-item-raincoat"]');
    await press(page, '[data-testid="wd-buy"]');
    await expect(page.locator('.toast').last()).toContainText('Not enough Tockens');
    expect((await hook<any>(page, 'state')).wardrobe).not.toContain('raincoat');
  });

  test('the magic mirror at the tailor and the cottage wardrobe open the wardrobe in play', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await hook(page, 'goTo', 'tailor', 'in');
    await expect.poll(() => hook<string>(page, 'mapId')).toBe('tailor');
    await hook(page, 'teleport', 3.4, 4.1, 0);
    await expect.poll(() => hook(page, 'prompt')).toBe('Wardrobe');
    await page.keyboard.press('KeyE');
    await expect(page.locator('.wardrobe-panel.shop')).toBeVisible();
    await press(page, '[data-testid="wardrobe-done"]');
    await hook(page, 'goTo', 'cottage', 'in');
    await expect.poll(() => hook<string>(page, 'mapId')).toBe('cottage');
    await hook(page, 'teleport', 8.5, 4.9, 0);
    await expect.poll(() => hook(page, 'prompt')).toBe('Wardrobe');
    await page.keyboard.press('KeyE');
    await expect(page.locator('.wardrobe-panel:not(.shop)')).toBeVisible();
  });

  test('the wardrobe works with the keyboard alone, and focus stays on what you picked', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await hook(page, 'openWardrobe', 0);
    await expect(page.locator('.wardrobe-panel')).toBeVisible();
    await page.waitForTimeout(350);
    const focused = () => page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? '');
    // walk the focus to the beanie with arrow keys only, like a player would
    const target = 'wd-item-beanie';
    for (let i = 0; i < 24 && (await focused()) !== target; i++) {
      const dir = await page.evaluate((t) => {
        const a = document.activeElement as HTMLElement | null;
        const b = document.querySelector(`[data-testid="${t}"]`) as HTMLElement;
        if (!a || a === document.body) return 'ArrowDown';
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const dx = rb.left + rb.width / 2 - (ra.left + ra.width / 2);
        const dy = rb.top + rb.height / 2 - (ra.top + ra.height / 2);
        const vertical = Math.abs(dy) > Math.min(ra.height, rb.height) / 2;
        const horizontal = Math.abs(dx) > Math.min(ra.width, rb.width) / 2;
        if (horizontal && (!vertical || Math.abs(dx) > Math.abs(dy))) return dx > 0 ? 'ArrowRight' : 'ArrowLeft';
        return dy > 0 ? 'ArrowDown' : 'ArrowUp';
      }, target);
      await page.keyboard.press(dir);
      await page.waitForTimeout(60);
    }
    const picked = await focused();
    expect(picked).toBe(target);
    await page.keyboard.press('KeyE');
    await expect.poll(async () => (await hook<any>(page, 'state')).players[0].outfit.hat?.id).toBe(picked.replace('wd-item-', ''));
    // the screen rebuilt, but the focus is still on the hat we just put on
    expect(await focused()).toBe(picked);
    await page.keyboard.press('ArrowRight');
    expect(await focused()).not.toBe(picked);
    expect((await focused()).startsWith('wd-')).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('.wardrobe-panel')).toHaveCount(0);
  });

  test('a real Tocken loop: dig up finds, sell them to Dr. Quill, buy clothes at Bramble’s', async ({ page }) => {
    test.setTimeout(150_000);
    const errors = watchErrors(page);
    await startGame(page, [32.5, 28.2]);
    expect((await hook<any>(page, 'state')).tockens).toBe(20);
    // dig every sparkly mound Biscuit can reach today
    let dug = 0;
    for (let round = 0; round < 8; round++) {
      const spots = (await hook<any[]>(page, 'digSpots')).filter((s) => s.revealed);
      if (!spots.length) break;
      const s = spots[0];
      await hook(page, 'teleport', s.cx + 0.5, s.cy + 1.3, 0);
      await expect.poll(() => hook(page, 'prompt'), { timeout: 8000 }).toBe('Dig');
      await pressUntil(page, 'KeyE', async () => !(await hook<any[]>(page, 'digSpots')).some((x) => x.id === s.id));
      await page.waitForTimeout(1200); // Biscuit finishes digging and hands it over
      dug++;
    }
    expect(dug).toBeGreaterThanOrEqual(3);
    // Dr. Quill's trading table
    await hook(page, 'goTo', 'museum', 'in');
    await expect.poll(() => hook<string>(page, 'mapId')).toBe('museum');
    const beforeSelling = (await hook<any>(page, 'state')).tockens;
    for (let i = 0; i < 3 && !(await page.locator('.sell-panel').count()); i++) await talkTo(page, 'quill');
    await expect(page.locator('.sell-panel')).toBeVisible();
    for (let i = 0; i < 25; i++) {
      const btn = page.locator('[data-testid^="sell-all-"], [data-testid^="sell-one-"]').first();
      if (!(await btn.count())) break;
      const id = await btn.getAttribute('data-testid');
      await press(page, `[data-testid="${id}"]`);
    }
    const afterSelling = (await hook<any>(page, 'state')).tockens;
    expect(afterSelling).toBeGreaterThan(beforeSelling);
    expect((await hook<any>(page, 'state')).museum.length).toBeGreaterThan(0);
    await press(page, '[data-testid="sell-done"]');
    // spend it at Bramble's on something the starting 20 Tockens could never buy
    const options: [string, string, number][] = [
      ['top', 'raincoat', 45],
      ['hat', 'flower-crown', 40],
      ['top', 'cardigan', 35],
      ['hat', 'bucket-hat', 30],
      ['hat', 'cap', 25],
    ];
    const pick = options.find(([, , p]) => p <= afterSelling);
    expect(pick, `earned ${afterSelling} Tockens`).toBeTruthy();
    await hook(page, 'goTo', 'tailor', 'in');
    await expect.poll(() => hook<string>(page, 'mapId')).toBe('tailor');
    for (let i = 0; i < 3 && !(await page.locator('.wardrobe-panel.shop').count()); i++) await talkTo(page, 'bramble');
    await expect(page.locator('.wardrobe-panel.shop')).toBeVisible();
    await press(page, `[data-testid="wd-slot-${pick![0]}"]`);
    await press(page, `[data-testid="wd-item-${pick![1]}"]`);
    await press(page, '[data-testid="wd-buy"]');
    const st = await hook<any>(page, 'state');
    expect(st.wardrobe).toContain(pick![1]);
    expect(st.tockens).toBe(afterSelling - pick![2]);
    expect(errors).toEqual([]);
  });
});
