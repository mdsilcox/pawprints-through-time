import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Relative base so the built game works from any static host path (GitHub Pages, Netlify, a USB stick...).
export default defineConfig({
  base: './',
  server: { host: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 3000,
    assetsInlineLimit: 0,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // registered manually in src/core/pwa.ts (production only)
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Pawprints Through Time',
        short_name: 'Pawprints',
        description: 'A cozy time-travel adventure with a corgi, a fairy, bunnies and magic soup. For 1 or 2 players.',
        theme_color: '#f29e4c',
        background_color: '#fff4e0',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
