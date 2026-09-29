// Capture review screenshots: `node scripts/shots.mjs M3` -> review/M3/*.png
// Starts its own Vite dev server, drives the game through window.__game hooks,
// and shoots each scenario at desktop (1280x720) and phone (667x375 landscape) sizes.
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const milestone = process.argv[2] ?? 'M0';
const only = process.argv[3];
const outDir = `review/${milestone}`;
mkdirSync(outDir, { recursive: true });

const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
  phone: { viewport: { width: 667, height: 375 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const g = (page, name, ...args) =>
  page.evaluate(
    async ([n, a]) => {
      const api = window.__game;
      if (!api?.[n]) throw new Error('missing hook ' + n);
      return await api[n](...a);
    },
    [name, args],
  );
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.ready?.() === true, null, { timeout: 60000 });
  await page.waitForSelector('[data-screen="title"]');
  await wait(900);
}

/** Scenario list — grows with each milestone. Each returns after the page shows what to capture. */
async function play(page, players = 1, at, opts = {}) {
  await boot(page);
  await g(page, 'newGame', 1);
  if (!opts.opening) await g(page, 'skipOpening');
  if (opts.map) {
    await page.evaluate((m) => { const d = window.__game.state(); }, opts.map);
  }
  await g(page, 'startWorld');
  await page.waitForFunction(() => window.__game.scenes().includes('world'));
  await wait(400);
  if (at) await g(page, 'teleport', at[0], at[1], 0);
  if (players === 2) {
    await g(page, 'joinP2');
    if (at) await g(page, 'teleport', at[0] + 1.2, at[1] + 0.3, 1);
  }
  await wait(900);
}

/** Scenario list — grows with each milestone. Each returns after the page shows what to capture. */
const SCENARIOS = [
  { name: 'gallery', run: async (page) => { await boot(page); await g(page, 'gallery'); await wait(300); } },
  { name: 'title', run: async (page) => boot(page) },
  {
    name: 'slots',
    run: async (page) => {
      await boot(page);
      await page.click('[data-testid="title-new"]');
      await page.waitForSelector('[data-screen="slots"]');
      await wait(400);
    },
  },
  { name: 'arrival-dock', players: [1, 2], run: async (page, players) => play(page, players) },
  { name: 'plaza', players: [1, 2], run: async (page, players) => play(page, players, [29.5, 26.5]) },
  { name: 'meadow', players: [1], run: async (page, players) => play(page, players, [13, 27.5]) },
  { name: 'sign-prompt', players: [1], run: async (page, players) => play(page, players, [29.2, 27]) },
  { name: 'clocktower', players: [1], run: async (page, players) => play(page, players, [30.5, 18.2]) },
  {
    name: 'tether',
    players: [2],
    run: async (page) => {
      await play(page, 2, [30.5, 27]);
      await g(page, 'hold', 0, -1, 0);
      await g(page, 'hold', 1, 1, 0);
      await wait(2500);
      await g(page, 'release', 0);
      await g(page, 'release', 1);
      await wait(300);
    },
  },
  {
    name: 'dialogue',
    players: [1],
    run: async (page) => {
      await play(page, 1, [29.2, 27]);
      await page.keyboard.press('KeyE');
      await wait(1600);
    },
  },
  {
    name: 'choice',
    players: [2],
    run: async (page) => {
      await play(page, 2, [30.5, 23]);
      page.evaluate(() => window.__game.ask('pip', 'Oh my whiskers! Will {players} help me fix the Great Hourglass?', ['Of course we will!', 'What happened?'])).catch(() => {});
      await wait(2200);
    },
  },
  {
    name: 'settings',
    players: [1],
    run: async (page) => {
      await play(page, 1, [30.5, 23]);
      await g(page, 'openSettings');
      await wait(500);
    },
  },
  {
    name: 'reminder',
    players: [1, 2],
    run: async (page, players) => {
      await play(page, players, [30.5, 23]);
      await g(page, 'fastForward', 45 * 60000);
      await wait(1400);
    },
  },
  {
    name: 'reminder-firm',
    players: [1],
    run: async (page) => {
      await play(page, 1, [30.5, 23]);
      for (let i = 0; i < 2; i++) {
        await g(page, 'triggerReminder');
        await wait(500);
        await page.click('[data-testid="reminder-snooze"]');
        await wait(400);
      }
      await g(page, 'triggerReminder');
      await wait(1400);
    },
  },
  {
    name: 'questlog',
    players: [1],
    run: async (page) => {
      await play(page, 1, [30.5, 23]);
      await wait(600);
      await page.click('[data-testid="hud-objective"]');
      await wait(500);
    },
  },
  {
    name: 'names',
    run: async (page) => {
      await boot(page);
      await page.click('[data-testid="title-new"]');
      await page.waitForSelector('[data-screen="slots"]');
      await wait(400);
      await page.click('[data-testid="slot-1"]');
      await page.waitForSelector('[data-screen="names"]');
      await wait(400);
    },
  },
  {
    name: 'intro',
    run: async (page) => {
      await boot(page);
      await page.click('[data-testid="title-new"]');
      await wait(400);
      await page.click('[data-testid="slot-1"]');
      await wait(400);
      await page.click('[data-testid="names-ok"]');
      await page.waitForSelector('[data-screen="intro"]');
      await wait(700);
    },
  },
  {
    name: 'intro3',
    run: async (page) => {
      await boot(page);
      await page.click('[data-testid="title-new"]');
      await wait(400);
      await page.click('[data-testid="slot-1"]');
      await wait(400);
      await page.click('[data-testid="names-ok"]');
      await page.waitForSelector('[data-screen="intro"]');
      for (let i = 0; i < 2; i++) { await wait(400); await page.click('[data-testid="story-next"]'); }
      await wait(700);
    },
  },
  { name: 'arrival', players: [1], run: async (page) => { await play(page, 1, null, { opening: true }); await wait(4500); } },
  { name: 'meadow-bunnies', players: [1, 2], run: async (page, players) => { await play(page, players, [11, 26.5]); await wait(1500); } },
  { name: 'night', players: [1], run: async (page) => { await play(page, 1, [30.5, 24]); await g(page, 'setTime', 22); await wait(1200); } },
  { name: 'dusk', players: [1], run: async (page) => { await play(page, 1, [14, 29]); await g(page, 'setTime', 19.2); await wait(1200); } },
  { name: 'clocktower-in', players: [1, 2], run: async (page, players) => { await play(page, players); await g(page, 'goTo', 'clocktower', 'in'); await wait(1800); } },
  { name: 'burrow-in', players: [1], run: async (page) => { await play(page, 1); await g(page, 'goTo', 'burrow', 'in'); await wait(1800); } },
  { name: 'cottage-in', players: [1], run: async (page) => { await play(page, 1); await g(page, 'goTo', 'cottage', 'in'); await wait(1800); } },
  { name: 'museum-in', players: [1], run: async (page) => { await play(page, 1); await g(page, 'goTo', 'museum', 'in'); await wait(1800); } },
  { name: 'tailor-in', players: [1], run: async (page) => { await play(page, 1); await g(page, 'goTo', 'tailor', 'in'); await wait(1800); } },
  { name: 'map', players: [1], run: async (page) => { await play(page, 1, [30.5, 26]); await g(page, 'openMap'); await wait(700); } },
  { name: 'dock-finnegan', players: [1], run: async (page) => { await play(page, 1, [30.8, 40.5]); await wait(900); } },
  { name: 'dig', players: [1], run: async (page) => { await play(page, 1, [31.2, 26.6]); await wait(600); await page.keyboard.press('KeyE'); await wait(2600); } },
  {
    name: 'pause',
    players: [1, 2],
    run: async (page, players) => {
      await play(page, players, [30.5, 23.5]);
      await g(page, 'openPause');
      await wait(500);
    },
  },
];

const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const addr = server.httpServer.address();
const baseURL = `http://127.0.0.1:${addr.port}`;
const browser = await chromium.launch();
let count = 0;
try {
  for (const sc of SCENARIOS) {
    if (only && sc.name !== only) continue;
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      for (const players of sc.players ?? [1]) {
        const ctx = await browser.newContext({ ...vp, baseURL });
        const page = await ctx.newPage();
        page.on('pageerror', (e) => console.error(`[${sc.name}/${vpName}] pageerror:`, e.message));
        try {
          await sc.run(page, players);
          const file = `${outDir}/${sc.name}${sc.players ? `-${players}p` : ''}-${vpName}.png`;
          await page.screenshot({ path: file });
          console.log('shot', file);
          count++;
        } catch (err) {
          console.error(`[${sc.name}/${vpName}/${players}p] failed:`, err.message);
        }
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(`${count} screenshots in ${outDir}`);
