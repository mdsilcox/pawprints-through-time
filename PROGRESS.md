# Progress log

## M2 — Core systems ✅ (awaiting critic)
- Dialogue: portrait + name tag + type-on text with per-character voice blips; tap/action skips, then advances; choices (keyboard, pad, touch, either player); `{p1}/{p2}/{players}` name tokens; signs use it.
- Quests & flags: quests are derived from save flags (always consistent with the save); HUD objective pill (tap → Adventure Log); step/quest-complete toasts + fanfare + autosave; rewards run once. First side quest: "Explore Tockwood Isle" (plaza, signpost, beach, meadow → 10 Tockens).
- Saves: 3 IndexedDB slots with names ("Who's adventuring today?" on New Game, dice for random names), Continue/Load/delete (with confirm), manual save in the pause menu, autosave every minute, on quest progress, when Pip's reminder appears, and whenever the app is backgrounded/closed.
- Pause menu: tile grid (systems register their tiles as they land — Adventure Log and Settings now) + Resume / Player 2 join-leave / Save / Save & quit. The world freezes while any menu is open.
- Settings (from the title or the pause menu): master/music/effects volume + mute, text speed, playtime reminder (15/30/45/60/90, default 45, cannot be switched off), late-night nudge, colourblind-friendly colours, reduce motion, puzzle difficulty, touch controls auto/on/off, controls guide. Persisted in localStorage; sliders/toggles work with keyboard, gamepad and touch.
- Playtime reminder: pure `SessionTimer` (unit-tested: 45-min default, snooze ×2 then firm-but-skippable, backgrounding pauses the count, a ≥10-minute background or break starts a fresh session, a quick return after "Take a break" keeps the session, interval changes, late-night detection). Pip flutters in over a starry backdrop, the game autosaves, "Take a break" shows a gentle goodbye with break ideas and returns to the title.
- Audio engine: Web Audio synth instruments (bell, marimba, pluck, piano, flute, fiddle, accordion, organ, bass, pad, brass...) + drums, lookahead sequencer with a note-string DSL, original songs for the title, Tockwood day/night, interiors, clocktower and the Burrow; SFX incl. UI blips, footsteps per surface (grass/sand/wood/stone), corgi bark, sparkles, portal whoosh, bowling pins, dance hits.
- Fixed along the way: skipping type-on could stall a line; a key that closed a menu leaked into gameplay (re-opening the sign); on phones the touch layer covered the HUD objective.

## M1 — Movement and controls ✅ (critic review in progress)
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
