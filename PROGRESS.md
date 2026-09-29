# Progress log

## M1 — Movement and controls ✅ (awaiting critic)
- Tockwood Isle (60×46 cells): island, beach, dock, plaza with fountain, clocktower, cottage + garden plots, tailor, museum, bowling alley (closed), the old oak (Bubbling Burrow), meadow + warren mounds, north woods. Already in the house art style (not just graybox).
- Terrain: dual-grid autotiling (16 variants per layer: foam, sand, grass, path, plaza) with extruded tilesets (no seams), dock planks, scattered decor (tufts, flowers, shells) via a Blitter; props depth-sorted by their base.
- Paper-doll characters (one rig, 16 poses incl. walk cycles, dance and bowling poses) with clothing layers; P1 and P2 look different.
- Movement with tile collision (axis-separated sliding, sub-stepping, corner assist into doorways); walk bob + squash & stretch.
- Controls: keyboard (P1 WASD+E/Q, P2 arrows+/ and .; both sets drive P1 in 1-player), gamepads (pad 1 = P1, pad 2 = P2, Start on pad 2 drops P2 in, d-pad menu nav with repeat), touch (floating joystick + A/B; 2P = two thumb zones), keyboard/gamepad menu navigation.
- Drop-in/out Player 2 from the pause menu or the 👥 HUD button; shared camera frames both players and zooms out; soft tether (slows then stops players from separating off-screen) with a sparkly ribbon hint.
- Contextual action prompts ("E Read", touch A-button relabels to the action).
- Tests: terrain/collision/camera-tether/input unit tests; Playwright: WASD/arrows movement, 2P join/leave via pause menu, tether keeps both on screen, water/building collision, gamepad emulation (move + Start-to-join), touch joystick with two simultaneous thumbs on phone, keyboard-only menus.

## M0 — Scaffold ✅ (critic: REVISE → fixed flaky PWA test; re-review requested)
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
- M2: dialogue system, quest/flag system, autosave + save slots UI, full pause menu, settings, playtime reminder.

## Known issues
- (none yet)
