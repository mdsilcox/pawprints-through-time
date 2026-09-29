// Capture review screenshots: `node scripts/shots.mjs M3` -> review/M3/*.png
// (optional 2nd argument: comma-separated scenario names, e.g. `node scripts/shots.mjs M2 title,reminder`)
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
  await page.addInitScript(() => {
    window.__testDeviceHour = 12;
  });
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
    name: 'title-continue',
    run: async (page) => {
      await boot(page);
      await g(page, 'newGame', 1);
      await g(page, 'toTitle');
      await page.waitForSelector('[data-testid="title-continue"]');
      await wait(900);
    },
  },
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
      await page.waitForSelector('[data-testid="reminder"]'); // Pip waits for a calm moment
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
        await page.waitForSelector('[data-testid="reminder-snooze"]');
        await wait(1700); // Pip's card ignores presses for its first 1.5 s
        await page.click('[data-testid="reminder-snooze"]');
        await page.waitForSelector('[data-testid="reminder"]', { state: 'detached' });
        await wait(400);
      }
      await g(page, 'triggerReminder');
      await page.waitForSelector('.reminder-screen.firm');
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
  // ---------------------------------------------------------------- M5: brain-builders & magic soup
  { name: 'pz-riddle', players: [1], run: async (page) => { await play(page, 1, [35.2, 27.5]); await g(page, 'openPuzzle', 'riddle-stone', 'medium'); await wait(900); } },
  { name: 'pz-riddle-typed', players: [1], run: async (page) => { await play(page, 1, [35.2, 27.5]); await g(page, 'openPuzzle', 'riddle-stone', 'hard'); await wait(900); } },
  {
    name: 'pz-grid',
    players: [1],
    run: async (page) => {
      await play(page, 1, [12, 31.5]);
      await g(page, 'openPuzzle', 'grandma-scarves', 'medium');
      await wait(500);
      for (const id of ['grid-0-1-0', 'grid-0-1-0', 'grid-1-0-0']) await page.click(`[data-testid="${id}"]`);
      await wait(700);
    },
  },
  { name: 'pz-slide', players: [1], run: async (page) => { await play(page, 1, [25, 13.2]); await g(page, 'openPuzzle', 'juniper-crates', 'medium'); await wait(900); } },
  { name: 'pz-sequence', players: [1], run: async (page) => { await play(page, 1); await g(page, 'goTo', 'museum', 'in'); await wait(1500); await g(page, 'openPuzzle', 'quill-patterns', 'hard'); await wait(900); } },
  {
    name: 'pz-code',
    players: [1],
    run: async (page) => {
      await play(page, 1, [37.7, 18.4]);
      await g(page, 'openPuzzle', 'rocco-lock', 'medium');
      await wait(700);
      for (const n of [0, 1, 2, 3]) await page.click(`[data-testid="code-pick-${n}"]`);
      await page.click('[data-testid="code-check"]');
      await wait(300);
      for (const n of [1, 0, 4, 2]) await page.click(`[data-testid="code-pick-${n}"]`);
      await page.click('[data-testid="code-check"]');
      await wait(700);
    },
  },
  { name: 'pz-sail', players: [1], run: async (page) => { await play(page, 1, [33.6, 39.4]); await g(page, 'openPuzzle', 'finnegan-boat', 'hard'); await wait(900); } },
  {
    name: 'pz-solved',
    players: [1],
    run: async (page) => {
      await play(page, 1, [35.2, 27.5]);
      await g(page, 'openPuzzle', 'riddle-stone', 'easy');
      await wait(600);
      const right = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="riddle-choice-"]')].findIndex((b) => /clocktower/i.test(b.textContent ?? '')));
      await page.click(`[data-testid="riddle-choice-${right}"]`);
      await wait(1600);
    },
  },
  {
    name: 'cauldron',
    players: [1, 2],
    run: async (page, players) => {
      await play(page, players);
      for (const [id, n] of [['glowcap', 2], ['kelp', 3], ['carrot', 4], ['honey', 2], ['clover-leaf', 3], ['sardine', 2], ['pumpkin', 1], ['radish', 2]]) await g(page, 'give', id, n);
      await g(page, 'goTo', 'burrow', 'in');
      await wait(1500);
      await g(page, 'openCauldron');
      await wait(500);
      for (const id of ['glowcap', 'kelp', 'carrot']) await page.click(`[data-testid="cd-ing-${id}"]`);
      await wait(500);
    },
  },
  {
    name: 'cauldron-stir',
    players: [2],
    run: async (page, players) => {
      await play(page, players);
      for (const [id, n] of [['honey', 1], ['clover-leaf', 1], ['kelp', 1]]) await g(page, 'give', id, n);
      await g(page, 'goTo', 'burrow', 'in');
      await wait(1500);
      await g(page, 'openCauldron');
      await wait(400);
      for (const id of ['honey', 'clover-leaf', 'kelp']) await page.click(`[data-testid="cd-ing-${id}"]`);
      await page.click('[data-testid="cd-stir"]');
      await wait(1500);
      await page.keyboard.press('KeyE');
      await wait(700);
    },
  },
  {
    name: 'cauldron-result',
    players: [1],
    run: async (page) => {
      await play(page, 1);
      for (const [id, n] of [['glowcap', 1], ['kelp', 1], ['carrot', 1]]) await g(page, 'give', id, n);
      await g(page, 'goTo', 'burrow', 'in');
      await wait(1500);
      await g(page, 'openCauldron');
      await wait(400);
      for (const id of ['glowcap', 'kelp', 'carrot']) await page.click(`[data-testid="cd-ing-${id}"]`);
      await page.click('[data-testid="cd-stir"]');
      for (let i = 0; i < 4; i++) {
        await wait(700);
        await page.keyboard.press('KeyE');
      }
      await wait(1400);
    },
  },
  {
    name: 'recipe-book',
    players: [1],
    run: async (page) => {
      await play(page, 1);
      for (const id of ['glowbroth', 'hopscotch-chowder', 'whisker-bisque', 'pirates-gumbo']) await g(page, 'learnClue', id);
      await g(page, 'discoverSoup', 'glowbroth', 'carrot+glowcap+kelp');
      await g(page, 'discoverSoup', 'hiccup-soup', 'dates+milk+onion');
      await wait(3500);
      await g(page, 'openRecipeBook');
      await wait(700);
    },
  },
  {
    name: 'journal',
    players: [1],
    run: async (page) => {
      await play(page, 1);
      await g(page, 'solvePuzzle', 'juniper-crates', 0);
      await g(page, 'solvePuzzle', 'rocco-lock', 1);
      await g(page, 'setFlag', 'puzzle:seen:finnegan-boat', true);
      await wait(3500);
      await g(page, 'openJournal');
      await wait(700);
    },
  },
  {
    name: 'garden',
    players: [1],
    run: async (page) => {
      await play(page, 1, [9.1, 16.2]);
      await g(page, 'gardenSet', 0, 'carrot', -1);
      await g(page, 'gardenSet', 1, 'pumpkin', 60);
      await g(page, 'gardenSet', 2, 'tomato', 250);
      await g(page, 'gardenSet', 3, 'radish', 400);
      await wait(1200);
    },
  },
  {
    name: 'grotto-dark',
    players: [1],
    run: async (page) => {
      await play(page, 1);
      await g(page, 'goTo', 'grotto', 'in');
      await wait(2500);
      for (let i = 0; i < 2; i++) {
        await page.keyboard.press('KeyE');
        await wait(400);
      }
      await wait(700);
    },
  },
  {
    name: 'grotto-glow',
    players: [1, 2],
    run: async (page, players) => {
      await play(page, players);
      await g(page, 'drink', 'glowbroth', 3);
      await g(page, 'goTo', 'grotto', 'in');
      await wait(2500);
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('KeyE');
        await wait(400);
      }
      await wait(600);
    },
  },
  {
    name: 'effects',
    players: [2],
    run: async (page, players) => {
      await play(page, players, [30.5, 23]);
      for (const s of ['sunbeam-squash', 'sparkle-stew', 'together-tea']) await g(page, 'drink', s, 2);
      await wait(1800);
    },
  },
  { name: 'lookout', players: [1], run: async (page) => { await play(page, 1, [42.5, 8.6]); await g(page, 'drink', 'hopscotch-chowder', 2); await wait(1200); } },
  // ---------------------------------------------------------------- M6: the Golden Age of Piracy
  {
    name: 'worldmap',
    players: [1],
    run: async (page) => {
      await play(page, 1);
      await g(page, 'setFlag', 'portal:ready', true);
      await g(page, 'goTo', 'clocktower', 'in');
      await wait(1500);
      await g(page, 'openWorldMap');
      await wait(700);
    },
  },
  {
    name: 'cove-arrival',
    players: [1, 2],
    run: async (page, players) => {
      await play(page, players);
      await g(page, 'setFlag', 'pip:companion', true);
      await g(page, 'goTo', 'cove', 'portal');
      await wait(2600);
    },
  },
  {
    name: 'cove-ship',
    players: [1, 2],
    run: async (page, players) => {
      await play(page, players);
      for (const f of ['pip:companion', 'cove:arrived', 'met:marigold', 'map:search']) await g(page, 'setFlag', f, true);
      await g(page, 'goTo', 'cove', 'from-isle');
      await wait(2200);
    },
  },
  {
    name: 'cove-market',
    players: [1],
    run: async (page) => {
      await play(page, 1);
      for (const f of ['pip:companion', 'cove:arrived']) await g(page, 'setFlag', f, true);
      await g(page, 'goTo', 'cove', 'portal');
      await wait(1800);
      await g(page, 'teleport', 16.5, 11, 0);
      await wait(900);
    },
  },
  {
    name: 'hold',
    players: [1],
    run: async (page) => {
      await play(page, 1);
      for (const f of ['pip:companion', 'cove:arrived', 'found:skipper']) await g(page, 'setFlag', f, true);
      await g(page, 'goTo', 'hold', 'in');
      await wait(2000);
    },
  },
  {
    name: 'isle',
    players: [1, 2],
    run: async (page, players) => {
      await play(page, players);
      for (const f of ['pip:companion', 'cove:arrived', 'isle:landed']) await g(page, 'setFlag', f, true);
      await g(page, 'goTo', 'isle', 'landing');
      await wait(2000);
      await g(page, 'teleport', 21, 10.5, 0);
      if (players === 2) await g(page, 'teleport', 22.5, 10.8, 1);
      await wait(1200);
    },
  },
  {
    name: 'cave',
    players: [1],
    run: async (page) => {
      await play(page, 1);
      for (const f of ['pip:companion', 'cove:arrived', 'isle:landed', 'isle:door']) await g(page, 'setFlag', f, true);
      await g(page, 'goTo', 'cave', 'in');
      await wait(2000);
    },
  },
  {
    name: 'pz-jigsaw',
    players: [1],
    run: async (page) => {
      await play(page, 1);
      await g(page, 'openPuzzle', 'marigold-map', 'medium');
      await wait(600);
      await page.click('[data-testid="jig-0"]');
      await wait(400);
    },
  },
  {
    name: 'pz-chart',
    players: [1],
    run: async (page) => {
      await play(page, 1);
      await g(page, 'drink', 'pirates-gumbo', 2);
      await g(page, 'openPuzzle', 'marigold-chart', 'medium');
      await wait(900);
    },
  },
  {
    name: 'pz-barrels',
    players: [1],
    run: async (page) => {
      await play(page, 1);
      await g(page, 'openPuzzle', 'bosun-barrels', 'easy');
      await wait(900);
    },
  },
  {
    name: 'notes',
    players: [1],
    run: async (page) => {
      await play(page, 1);
      for (const n of ['pirate-golden-age', 'pirate-articles', 'pirate-eight']) await page.evaluate((id) => window.__game.state() && window.__game.learnNoteDebug?.(id), n);
      await g(page, 'openNotes');
      await wait(700);
    },
  },
  {
    name: 'sell',
    players: [1],
    run: async (page) => {
      await play(page, 1);
      for (const [id, n] of [['scallop', 3], ['fossil-ammonite', 2], ['old-key', 1], ['golden-acorn', 1], ['sea-glass', 4]]) await g(page, 'give', id, n);
      await g(page, 'goTo', 'museum', 'in');
      await wait(1500);
      await g(page, 'openSell');
      await wait(600);
    },
  },
  { name: 'dock-finnegan', players: [1], run: async (page) => { await play(page, 1, [30.8, 40.5]); await wait(900); } },
  { name: 'dig', players: [1], run: async (page) => { await play(page, 1, [31.2, 26.6]); await wait(600); await page.keyboard.press('KeyE'); await wait(2600); } },
  { name: 'wardrobe', players: [1], run: async (page) => { await play(page, 1, [30.5, 24]); await g(page, 'openWardrobe', 0); await wait(700); } },
  { name: 'wardrobe-look', players: [1], run: async (page) => { await play(page, 1, [30.5, 24]); await g(page, 'openWardrobe', 1); await wait(300); await page.click('[data-testid="wd-slot-look"]'); await wait(500); } },
  { name: 'wardrobe-biscuit', players: [1], run: async (page) => { await play(page, 1, [30.5, 24]); await g(page, 'openWardrobe', 'biscuit'); await wait(700); } },
  { name: 'shop', players: [1], run: async (page) => { await play(page, 1, [30.5, 24]); await g(page, 'openWardrobe', 0, true); await wait(400); await page.click('[data-testid="wd-slot-top"]'); await wait(300); await page.click('[data-testid="wd-item-cardigan"]'); await wait(600); } },
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
    if (only && !only.split(',').includes(sc.name)) continue;
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
