import { defineConfig, devices } from '@playwright/test';
import { createHash } from 'node:crypto';

// Each checkout (e.g. a separate review worktree) gets its own ports so parallel runs never collide.
function portForCwd(): number {
  const h = createHash('md5').update(process.cwd()).digest();
  return 5200 + (h.readUInt16BE(0) % 700) * 2;
}
const PORT = Number(process.env.PW_PORT) || portForCwd();
const PREVIEW_PORT = PORT + 1;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : 2,
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /pwa\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      // A small phone (375x667) held in landscape.
      name: 'phone',
      testIgnore: /pwa\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 667, height: 375 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      // Production build served by `vite preview`: service worker + offline play.
      name: 'pwa',
      testMatch: /pwa\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 600 }, baseURL: `http://localhost:${PREVIEW_PORT}` },
    },
  ],
  webServer: [
    {
      command: `npx vite --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: true,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    // the production build for the offline (PWA) test — PW_NO_PREVIEW=1 skips it for quick targeted runs
    ...(process.env.PW_NO_PREVIEW
      ? []
      : [
          {
            command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port ${PREVIEW_PORT} --strictPort`,
            url: `http://localhost:${PREVIEW_PORT}`,
            reuseExistingServer: false,
            timeout: 240_000,
            stdout: 'ignore' as const,
            stderr: 'pipe' as const,
          },
        ]),
  ],
});
