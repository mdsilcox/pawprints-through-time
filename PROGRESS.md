# Progress log

## M0 — Scaffold ✅ (awaiting critic)
- Repo + private GitHub remote, `SPEC.md` saved verbatim, `.claude/agents/critic.md` from Appendix A.
- Vite 8 + TypeScript + Phaser 3.90 boot → title → play loop; DOM overlay UI layer with a screen stack and spatial focus navigation.
- HiDPI-aware scaling (device-pixel backing store, DPR ≤ 2) that fills any viewport; portrait-phone "turn sideways" hint.
- PWA via `vite-plugin-pwa`: manifest (landscape, fullscreen), generated icons (`npm run icons`), Workbox precache of the whole game; verified offline by Playwright against a production build.
- Save system skeleton: IndexedDB key/value wrapper, 3 save slots, "continue" slot memory, save migration (fills new fields into old saves), debounced + periodic autosaver.
- Settings model (localStorage) with the playtime reminder defaulting to 45 minutes and only offering 15/30/45/60/90.
- Test harness: Vitest unit tests (saves incl. fake IndexedDB, migration, autosave, settings); Playwright smoke tests at desktop 1280×720 and phone 667×375 landscape (touch), plus an offline-PWA test.
- `window.__game` debug hooks (dev builds or `?debug`): ready, scenes, state, newGame/load/save/slots, flags, settings, startWorld, toTitle.
- `node scripts/shots.mjs <milestone>` captures review screenshots.

## Next
- M1: Tockwood graybox map, player movement, keyboard/gamepad/touch controls, drop-in Player 2, shared camera with soft tether.

## Known issues
- (none yet)
