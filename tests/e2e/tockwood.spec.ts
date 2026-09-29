import { test, expect, type Page } from '@playwright/test';
import { bootToTitle, hook, playThrough, press, startGame, watchErrors } from './helpers';

async function advanceDialogue(page: Page, max = 30): Promise<void> {
  for (let i = 0; i < max; i++) {
    if (!(await hook<boolean>(page, 'dialogueOpen'))) {
      await page.waitForTimeout(500);
      if (!(await hook<boolean>(page, 'dialogueOpen'))) return;
    }
    if (await page.getByTestId('choice-0').isVisible().catch(() => false)) {
      await press(page, '[data-testid="choice-0"]');
      continue;
    }
    await page.waitForTimeout(160);
    await page.keyboard.press('KeyE');
  }
}

async function talkTo(page: Page, npc: string): Promise<void> {
  const list = await hook<{ id: string; x: number; y: number }[]>(page, 'npcs');
  const n = list.find((x) => x.id === npc)!;
  expect(n).toBeTruthy();
  await hook(page, 'teleport', n.x, n.y + 0.9, 0);
  await expect.poll(() => hook(page, 'prompt'), { timeout: 8000 }).toBe('Talk');
  await page.keyboard.press('KeyE');
  await expect.poll(() => hook<boolean>(page, 'dialogueOpen')).toBe(true);
  await advanceDialogue(page);
}

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
    await page.waitForTimeout(700); // let the island settle, like a real player would
    await page.keyboard.press('KeyE');
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
    expect((await hook<any>(page, 'time')).minutes).toBe(6 * 60 + 30);
  });

  test('wild bunnies scatter when you rush at them, then hop back home', async ({ page }) => {
    await startGame(page, [11, 25]);
    await page.waitForTimeout(800);
    const wild = (await hook<any[]>(page, 'bunnies')).filter((b) => b.mode === 'wild');
    expect(wild.length).toBeGreaterThanOrEqual(4);
    const target = wild[0];
    await hook(page, 'teleport', target.x - 2.2, target.y, 0);
    await hook(page, 'hold', 0, 1, 0);
    await page.waitForTimeout(700);
    await hook(page, 'release', 0);
    const moved = async () => {
      const now = (await hook<any[]>(page, 'bunnies')).filter((b) => b.mode === 'wild');
      return Math.max(...now.map((b, i) => Math.hypot(b.x - wild[i].x, b.y - wild[i].y)));
    };
    await expect.poll(moved, { timeout: 4000 }).toBeGreaterThan(0.5);
    // they always come back to the meadow
    await hook(page, 'teleport', 30.5, 24, 0);
    await expect
      .poll(async () => (await hook<any[]>(page, 'bunnies')).filter((b) => b.mode === 'wild').every((b) => b.x > 4.5 && b.x < 17.5 && b.y > 21.5 && b.y < 28.5), { timeout: 20000 })
      .toBe(true);
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
