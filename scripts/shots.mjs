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
const SCENARIOS = [
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
  {
    name: 'world',
    players: [1, 2],
    run: async (page, players) => {
      await boot(page);
      await g(page, 'newGame', 1);
      await g(page, 'startWorld').catch(() => page.click('[data-testid="title-new"]'));
      if (players === 2) await g(page, 'joinP2').catch(() => undefined);
      await wait(1200);
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
