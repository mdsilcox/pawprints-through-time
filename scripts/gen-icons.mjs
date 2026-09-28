// Renders public/favicon.svg into the PNG icons the PWA manifest needs (uses Playwright's Chromium).
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';

const svg = readFileSync('public/favicon.svg', 'utf8');
mkdirSync('public/icons', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
async function render(size, file, { maskable = false } = {}) {
  await page.setViewportSize({ width: size, height: size });
  const inner = maskable
    ? `<div style="width:${size}px;height:${size}px;background:#f7c65a;display:flex;align-items:center;justify-content:center"><div style="width:${size * 0.8}px;height:${size * 0.8}px">${svg}</div></div>`
    : `<div style="width:${size}px;height:${size}px">${svg}</div>`;
  await page.setContent(`<html><body style="margin:0;background:transparent">${inner}<style>svg{width:100%;height:100%;display:block}</style></body></html>`);
  await page.screenshot({ path: `public/icons/${file}`, omitBackground: !maskable, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote', file);
}
await render(192, 'icon-192.png');
await render(512, 'icon-512.png');
await render(512, 'icon-maskable-512.png', { maskable: true });
await render(180, 'apple-touch-icon.png', { maskable: true });
await browser.close();
