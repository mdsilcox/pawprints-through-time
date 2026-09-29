import { test, expect, type Page } from '@playwright/test';
import { advanceDialogue, bootToTitle, hook, playThrough, press, pressUntil, startGame, talkTo, watchErrors } from './helpers';


test.describe('the opening story', () => {
  test('storybook -> ferry arrival -> Biscuit leads the way -> Pip asks for help', async ({ page }) => {
    const errors = watchErrors(page);
    await bootToTitle(page);
    await press(page, '[data-testid="title-new"]');
    await press(page, '[data-testid="slot-1"]');
    await press(page, '[data-testid="names-ok"]');
    // four illustrated pages
    await expect(page.locator('[data-screen="intro"]')).toBeVisible();
    const texts: string[] = [];
    for (let i = 0; i < 4; i++) {
      texts.push((await page.getByTestId('story-text').textContent()) ?? '');
      await press(page, '[data-testid="story-next"]');
    }
    expect(texts[0]).toContain('Tockwood Isle');
    expect(texts[2]).toContain('CRACK');
    await expect.poll(() => hook<string[]>(page, 'scenes')).toContain('world');
    // arrival: narration, then Biscuit bounds up and barks
    await expect.poll(() => hook<boolean>(page, 'dialogueOpen'), { timeout: 10000 }).toBe(true);
    await playThrough(page);
    const lines = (await hook<{ who: string; text: string }[]>(page, 'dialogueLines')).map((l) => l.who);
    expect(lines).toContain('biscuit');
    expect(await hook(page, 'getFlag', 'met:biscuit')).toBe(true);
    await expect(page.getByTestId('hud-objective')).toContainText('Follow Biscuit');
    expect(await hook(page, 'biscuit')).not.toBeNull();
    // walk in through the clocktower door
    await hook(page, 'teleport', 30.5, 16.7, 0);
    await expect.poll(() => hook(page, 'prompt')).toBe('Enter');
    await page.keyboard.press('KeyE');
    await expect.poll(() => hook<string>(page, 'mapId')).toBe('clocktower');
    // Pip's scene plays by itself
    await expect.poll(() => hook<boolean>(page, 'dialogueOpen'), { timeout: 10000 }).toBe(true);
    await playThrough(page);
    expect(await hook(page, 'getFlag', 'met:pip')).toBe(true);
    expect(await hook(page, 'getFlag', 'biscuit:companion')).toBe(true);
    const whoSpoke = new Set((await hook<{ who: string }[]>(page, 'dialogueLines')).map((l) => l.who));
    expect(whoSpoke.has('pip')).toBe(true);
    await expect(page.getByTestId('hud-objective')).toContainText('Clover');
    expect(errors).toEqual([]);
  });
});

test.describe('village life', () => {
  test('neighbours can be befriended; Clover tells her story; the quest moves on', async ({ page }) => {
    await startGame(page, [30.5, 22]);
    for (const n of ['rocco', 'juniper', 'finnegan']) {
      await talkTo(page, n);
      expect(await hook(page, 'getFlag', `met:${n}`)).toBe(true);
    }
    const st = await hook<any>(page, 'state');
    expect(st.friendship.rocco).toBeGreaterThan(0);
    expect(st.inventory['seed-carrot']).toBe(3); // Juniper's welcome gift
    // Clover lives under the old oak
    await hook(page, 'goTo', 'burrow', 'in');
    await expect.poll(() => hook<string>(page, 'mapId')).toBe('burrow');
    await page.waitForTimeout(400);
    await talkTo(page, 'clover');
    expect(await hook(page, 'getFlag', 'met:clover')).toBe(true);
    const lines = (await hook<{ who: string; text: string }[]>(page, 'dialogueLines')).filter((l) => l.who === 'clover').map((l) => l.text).join(' ');
    expect(lines).toContain('Hopkins');
    await expect(page.getByTestId('hud-objective')).toContainText('Dig up treasure');
  });

  test('Biscuit digs up treasure at sparkly spots and sniffs out hidden ones', async ({ page }) => {
    await startGame(page, [32.5, 28.2]);
    await expect.poll(() => hook(page, 'prompt'), { timeout: 8000 }).toBe('Dig');
    await pressUntil(page, 'KeyE', async () => (await hook<string | null>(page, 'prompt')) !== 'Dig');
    await expect.poll(async () => (await hook<any>(page, 'inventory'))['clock-gear'] ?? 0, { timeout: 10000 }).toBe(1);
    expect(await hook(page, 'getFlag', 'dug:first')).toBe(true);
    // a hidden spot becomes visible after a sniff nearby
    const spots = await hook<any[]>(page, 'digSpots');
    const hidden = spots.find((s) => !s.revealed);
    expect(hidden, 'there should be a hidden spot today').toBeTruthy();
    await hook(page, 'teleport', hidden.cx + 0.5, hidden.cy + 1.8, 0);
    await page.waitForTimeout(1500); // let Biscuit catch up
    await page.keyboard.press('KeyQ');
    await expect.poll(async () => (await hook<any[]>(page, 'digSpots')).find((s) => s.id === hidden.id)?.revealed, { timeout: 5000 }).toBe(true);
  });

  test('day turns to night with lamplight, and sleeping in your bed starts a new morning', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await hook(page, 'setTime', 22);
    await expect.poll(async () => (await hook<any>(page, 'time')).night).toBe(true);
    await expect(page.getByTestId('hud-clock')).toContainText('PM');
    await hook(page, 'goTo', 'cottage', 'in');
    await expect.poll(() => hook<string>(page, 'mapId')).toBe('cottage');
    await hook(page, 'teleport', 2.2, 5.6, 0);
    await expect.poll(() => hook(page, 'prompt')).toBe('Sleep');
    await page.keyboard.press('KeyE');
    await expect(page.getByTestId('choice-0')).toBeVisible();
    await press(page, '[data-testid="choice-0"]');
    await expect.poll(async () => (await hook<any>(page, 'time')).day, { timeout: 8000 }).toBe(2);
    const woke = (await hook<any>(page, 'time')).minutes;
    expect(woke).toBeGreaterThanOrEqual(6 * 60 + 30);
    expect(woke).toBeLessThan(6 * 60 + 32);
  });

  test('wild bunnies scatter only when someone rushes at them, then hop back home', async ({ page }) => {
    await startGame(page, [30.5, 24]); // far from the meadow
    const wildNow = async () => (await hook<any[]>(page, 'bunnies')).filter((b) => b.mode === 'wild');
    const flees = async () => (await wildNow()).reduce((n, b) => n + b.flees, 0);
    expect((await wildNow()).length).toBeGreaterThanOrEqual(4);
    // nobody nearby: they hop about, but nobody runs away
    await page.waitForTimeout(3500);
    expect(await flees()).toBe(0);
    // walk calmly up to them and stand still: still no fleeing
    const target = (await wildNow())[0];
    await hook(page, 'teleport', target.x - 3.5, target.y, 0);
    await page.waitForTimeout(1500);
    const calm = await flees();
    // now rush right at them
    await hook(page, 'hold', 0, 1, 0);
    await expect.poll(flees, { timeout: 6000 }).toBeGreaterThan(calm);
    await hook(page, 'release', 0);
    // they always come back to their meadow
    await hook(page, 'teleport', 30.5, 24, 0);
    await expect
      .poll(async () => (await wildNow()).every((b) => Math.abs(b.x - b.home.x) <= b.home.w / 2 + 0.6 && Math.abs(b.y - b.home.y) <= b.home.h / 2 + 0.6), { timeout: 25000 })
      .toBe(true);
  });

  test('Biscuit waits by the clocktower after a break during "Follow Biscuit", and joins Pip’s scene', async ({ page }) => {
    const errors = watchErrors(page);
    await bootToTitle(page);
    await hook(page, 'newGame', 1);
    await hook(page, 'startWorld');
    await expect.poll(() => hook<boolean>(page, 'dialogueOpen'), { timeout: 10000 }).toBe(true);
    await playThrough(page, 60_000);
    expect(await hook(page, 'getFlag', 'met:biscuit')).toBe(true);
    await expect(page.getByTestId('hud-objective')).toContainText('Follow Biscuit');
    // stop playing here and come back later
    await hook(page, 'toTitle');
    await press(page, '[data-testid="title-continue"]');
    await expect.poll(() => hook<string[]>(page, 'scenes')).toContain('world');
    await page.waitForTimeout(600);
    const b = await hook<any>(page, 'biscuit');
    expect(b, 'Biscuit is still on the island').not.toBeNull();
    expect(Math.abs(b.x - 30.5)).toBeLessThan(1.5);
    expect(Math.abs(b.y - 17.9)).toBeLessThan(1.5);
    // in through the door: he comes too, and he's there for Pip's big scene
    await hook(page, 'teleport', 30.5, 16.7, 0);
    await expect.poll(() => hook(page, 'prompt')).toBe('Enter');
    await pressUntil(page, 'KeyE', async () => (await hook<string>(page, 'mapId')) === 'clocktower');
    await expect.poll(() => hook<boolean>(page, 'dialogueOpen'), { timeout: 10000 }).toBe(true);
    expect(await hook(page, 'biscuit')).not.toBeNull();
    await playThrough(page, 60_000);
    expect(await hook(page, 'getFlag', 'biscuit:companion')).toBe(true);
    expect(await hook(page, 'biscuit')).not.toBeNull();
    expect(errors).toEqual([]);
  });

  test('the map is readable on every screen, and Close is always in reach', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await hook(page, 'openMap');
    const vp = page.viewportSize()!;
    const inView = async (sel: string) => {
      const box = await page.locator(sel).first().boundingBox();
      return !!box && box.y >= 0 && box.y + box.height <= vp.height + 0.5 && box.x >= 0 && box.x + box.width <= vp.width + 0.5;
    };
    const label = page.locator('.map-mark.poi .poi-label').first();
    await expect(label).toBeVisible();
    expect(await label.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(9.5);
    const me = await page.locator('.map-mark.who.p1').boundingBox();
    expect(me!.width).toBeGreaterThanOrEqual(18);
    expect(await inView('[data-testid="map-close"]')).toBe(true);
    expect(await inView('[data-testid="map-view"]')).toBe(true);
    // tapping outside the panel closes it
    const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
    await page.waitForTimeout(350);
    if (touch) await page.touchscreen.tap(4, vp.height / 2);
    else await page.mouse.click(4, vp.height / 2);
    await expect(page.locator('[data-screen="map"]')).toHaveCount(0);
    // indoors: the island with "you are inside", Close still in reach
    await hook(page, 'goTo', 'museum', 'in');
    await expect.poll(() => hook<string>(page, 'mapId')).toBe('museum');
    await hook(page, 'openMap');
    await expect(page.locator('.map-note')).toContainText('inside');
    expect(await inView('[data-testid="map-close"]')).toBe(true);
    await press(page, '[data-testid="map-close"]');
    await expect(page.locator('[data-screen="map"]')).toHaveCount(0);
  });

  test('backpack and bunny tracker keep Close in reach, even after picking an item', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    for (const id of ['scallop', 'fossil-ammonite', 'carrot', 'kelp', 'old-key', 'glowcap', 'honey', 'marble', 'button']) await hook(page, 'give', id, 2);
    const vp = page.viewportSize()!;
    const inView = async (sel: string) => {
      const box = await page.locator(sel).first().boundingBox();
      return !!box && box.y + box.height <= vp.height + 0.5;
    };
    await hook(page, 'openBackpack');
    await press(page, '.bp-item');
    expect(await inView('[data-testid="backpack-close"]')).toBe(true);
    await press(page, '[data-testid="backpack-close"]');
    await expect(page.locator('[data-screen="backpack"]')).toHaveCount(0);
    await hook(page, 'openBunnies');
    await expect(page.locator('.tracker-panel')).toBeVisible();
    expect(await inView('[data-testid="bunnies-close"]')).toBe(true);
    await press(page, '[data-testid="bunnies-close"]');
    await expect(page.locator('[data-screen="bunnies"]')).toHaveCount(0);
  });

  test('map, backpack and bunny tracker open from the pause menu', async ({ page }) => {
    await startGame(page, [30.5, 24]);
    await hook(page, 'give', 'shell-spiral', 2);
    await hook(page, 'rescueBunny', 'skipper');
    await page.keyboard.press('Escape');
    await press(page, '[data-testid="pause-map"]');
    await expect(page.locator('.map-canvas')).toBeVisible();
    await expect(page.locator('.map-goal')).toBeVisible();
    await press(page, '[data-testid="map-close"]');
    await press(page, '[data-testid="pause-backpack"]');
    await expect(page.getByTestId('bp-shell-spiral')).toContainText('×2');
    await expect(page.getByTestId('bp-tockens')).toContainText('Tockens');
    await press(page, '[data-testid="backpack-close"]');
    await press(page, '[data-testid="pause-bunnies"]');
    await expect(page.locator('.tracker-panel h2')).toContainText('1/12');
    await expect(page.getByTestId('bt-skipper')).toContainText('Skipper');
    await expect(page.getByTestId('bt-shelly')).toContainText('???');
  });

  test('rescued bunnies live in the warren; both players move between rooms together', async ({ page }) => {
    await startGame(page, [12, 29]);
    await hook(page, 'rescueBunny', 'skipper');
    await hook(page, 'rescueBunny', 'nibbles');
    await hook(page, 'goTo', 'tockwood', 'plaza'); // rebuild the island so the warren refreshes
    await expect.poll(async () => (await hook<any[]>(page, 'bunnies')).filter((b) => b.mode === 'warren').length).toBeGreaterThanOrEqual(3); // Grandma + 2
    await hook(page, 'joinP2');
    await hook(page, 'goTo', 'museum', 'in');
    await expect.poll(() => hook<string>(page, 'mapId')).toBe('museum');
    await expect.poll(async () => (await hook<any[]>(page, 'players')).length).toBe(2);
    expect((await hook<any[]>(page, 'npcs')).map((n) => n.id)).toContain('quill');
    // walk out of the door at the bottom
    await hook(page, 'hold', 0, 0, 1);
    await expect.poll(() => hook<string>(page, 'mapId'), { timeout: 8000 }).toBe('tockwood');
    await hook(page, 'release', 0);
    const p = (await hook<any[]>(page, 'players'))[0];
    expect(Math.abs(p.x - 42.5)).toBeLessThan(2);
  });
});
