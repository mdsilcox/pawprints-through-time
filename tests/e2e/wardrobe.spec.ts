import { test, expect } from '@playwright/test';
import { hook, press, startGame, watchErrors } from './helpers';

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

  test('the wardrobe works with the keyboard alone', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await hook(page, 'openWardrobe', 0);
    await expect(page.locator('.wardrobe-panel')).toBeVisible();
    await page.waitForTimeout(350);
    await page.getByTestId('wd-item-beanie').focus();
    await page.keyboard.press('KeyE');
    await expect.poll(async () => (await hook<any>(page, 'state')).players[0].outfit.hat?.id).toBe('beanie');
    await page.keyboard.press('Escape');
    await expect(page.locator('.wardrobe-panel')).toHaveCount(0);
  });
});
