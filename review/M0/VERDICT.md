# M0 Review — 9e1d5564dffadc72e0179ca4186bf8c8eedd3a3d

**Verdict:** REVISE

One small fix away from a PASS. The scaffold is solid and the title screen is already charming. The only blocker is a flaky test that makes `npm test` fail more often than it passes.

## Blockers

- **`npm test` is not reliably green: `tests/e2e/pwa.spec.ts` failed in 5 of 8 runs on this machine.**
  - **Runs:** the full `npm test` failed once and passed once. `npx playwright test --project=pwa --repeat-each=2`, run 3 times, gave 4 failures and 2 passes. Every failure is the same: `TimeoutError` at line 25, waiting for `navigator.serviceWorker.controller`.
  - **The bug is in the test, not the game.** Lines 20–23 pass an `async` predicate to `page.waitForFunction`. The Promise it returns counts as truthy, so the "wait for the service worker to be active" step returns at once.
    - I ran an instrumented copy of the test (scratch script, not committed). The wait returned within about 60 ms of page load, with the SW still `installing`, in 5 of 5 runs.
    - The test then reloads while the SW is still installing. If the reload lands during activation, `clientsClaim()` misses the new page and it stays uncontrolled for good. Reproduced: `active: "activated"` but `controller: null` for 16 s.
  - **The shipped PWA works.** With a real wait, the SW took control and an offline reload booted to the title in 4 of 4 runs.
  - **Fix:** replace lines 20–25 with `await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));` followed by `await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);`. Then run the offline part as it is now, and prove it with `npx playwright test --project=pwa --repeat-each=10`.
  - **Why this blocks:** spec rule 0.5 says "Tests stay green", the definition of done says "`npm test` passes", and the test harness is M0's deliverable. A gate that flips at random will either block every later commit or teach everyone to ignore red.

## Top improvements

1. **Make menus respond to the keys and gamepads the title promises, and show where focus is.**
   - The title says "keyboard, gamepad or touch", but in menus the arrow keys, WASD, E/Q, Escape and gamepads all do nothing. `ui.nav()`, `ui.confirm()` and `ui.back()` in `src/ui/ui.ts` are never called, and `src/app.ts` turns off Phaser keyboard and gamepad input.
   - Tab does move focus, but you can't see it. `.btn { outline: none }` removes the default outline, and the focus ring only draws under `.kbd-nav`, which nothing ever sets. I tabbed to slot 2: no ring, and the computed `outline-style` was `none`.
   - So a kid holding a controller can't press New Game. Wire one keydown handler and a gamepad poll into the existing `ui.nav/confirm/back`:
     - P1: WASD, E, Q
     - P2: arrow keys, `/`, `.`
     - Anyone: Enter, Space, Escape
     - Gamepad: d-pad or stick, A, B
   - Add a `:focus-visible` ring as a fallback. This is M1 scope, but it's the first thing every player touches and the code is already written.
2. **Protect saves from little fingers.**
   - In the "Start over in slot 1?" dialog, the destructive "Start over" is the big green button and "Keep it" is the pale one. Swap them.
   - Dim the slot list behind the dialog. Right now it stays at full brightness and its text peeks out around the dialog.
   - Ignore taps for about 250 ms after a screen opens. On the phone (667×375), a quick double-tap on New Game skips the slot picker and starts a game in whichever empty slot is under the finger. I reproduced this.
   - The overwrite-confirm flow has no test. Add one.
3. **Let each adventure have a name.** Every slot card reads "Player 1 · Day 1", so siblings sharing a tablet can't tell whose save is whose. The save format already has `players[0].name`. Ask for a name (or let kids pick an animal badge) on New Game, and show it on the slot card and the Continue button. It's cheap, very family-friendly, and fits with M2's save-slot work.

## Fun score

2/10. Biggest thing holding it back: there's nothing to play yet. New Game lands on a flat green screen with a "The island is being built!" panel, which is expected for a scaffold. The front door is already lovely. The drawn-in-code clocktower, warm palette, chunky buttons and friendly wording feel like a real cozy game, not a prototype.

## Required features tally

Working 0 · partial 0 · missing 14. All of this is expected at M0; where groundwork exists, it's noted.

1. Adventure story — missing
2. Village life (neighbors, home, collecting) — missing
3. Time travel — missing
4. Outfits — missing. The save format already has hat, top, bottom, shoes and accessory slots for both players, plus Biscuit's slots.
5. Bowling — missing
6. Corgi character — missing
7. Dancing — missing
8. Riddles, logic and strategy — missing
9. Playtime reminder — missing. Groundwork: settings only allow 15/30/45/60/90 minutes, default to 45, can't be switched off, and are unit-tested. There's no session timer, no Pip message and no fast-forward hook yet (due in M2).
10. Map and pirates — missing
11. Fairy — missing
12. 1 or 2 players — missing. The save holds two player profiles, but there's no way to add Player 2. The M0 "2P" screenshots are byte-identical copies of the 1P ones (see notes).
13. Bunnies — missing
14. Magic soup — missing

## Notes for the next milestones

- **Screenshots must not fake 2P.** `scripts/shots.mjs` line 55 swallows hook errors with `g(page, 'joinP2').catch(() => undefined)`, and line 54 quietly falls back if `startWorld` fails. That's why `world-2p-desktop.png` and `world-2p-phone.png` have the same MD5 as the 1P shots. Remove the catches so a missing hook fails the shot. From M1 on, I'll check that 2P shots actually show two players.
- **Autosave isn't periodic yet.** `AutoSaver.tick()` is never called, and nothing saves on `visibilitychange` or `pagehide`. PROGRESS.md's "periodic autosaver" is only the class. Once there's progress to lose, backgrounding the app or closing the tab on a phone will lose it. Wire both in M2.
- **`app.setSettings()` doesn't clean its input.** It skips `sanitizeSettings()`, so `setSettings({ reminderMinutes: 0 })` is accepted until the next reload. Sanitize on every write before the M2 reminder depends on it.
- **Debug hooks the spec asks for are still to come:** teleport and join/leave Player 2 (M1), plus fast-forward the session timer and trigger events (M2).
- **The title still needs Biscuit wagging** (spec section 6), once Biscuit's M3 art exists. The drifting sand is so faint on desktop that it's easy to miss.
- **Small UI icons are system emoji:** the paw prints in the logo and boot splash, the play, sparkle and book icons on the title buttons, the hourglass and bunny on slot cards, and the phone on the rotate hint. They look different on every platform (on Windows the paw is dark purple next to the gold logo), and they aren't house-style art. Swap them for small SVG icons in the palette when convenient.
- **DECISIONS and PROGRESS:** no decision drops a spec requirement. Reviewing M0 in a worktree while M1 goes ahead is fine, as long as this fix is re-reviewed before M1 is called done. PROGRESS says "Known issues: (none yet)"; it should list the PWA flake until it's fixed.

## Verified working

- **Repo and tooling:** `critic.md` matches Appendix A. M0 is pushed (`origin/main` = `9e1d556`), and the README's first line links the repo. `tsc --noEmit` is clean. All 18 unit tests pass, and they test real behaviour: save round-trips, reopening an IndexedDB (fake-indexeddb), migrating old and garbage saves, autosave debounce and settings clamping. They would fail if those broke.
- **Played by hand:** I used real clicks and taps at 1280×720 and 667×375 (touch, 2x pixel density). New Game → pick a slot → world → Back to title → Continue or Load Game all work. Load greys out empty slots. Overwriting asks first, and both "Keep it" and "Start over" do the right thing. Saves survive a page reload. There were no console errors.
- **Layout:** the title fits cleanly at 568×320, 667×375, 1024×768, 1280×720, 1920×1080 and 2560×1440. The smallest text on the phone is 12 px, which is readable. A phone held upright shows "Turn your phone sideways to play!", which clears on rotation, and the game canvas resizes.
- **Production build:** `window.__game` only exists when the URL has `?debug`. The manifest is valid (fullscreen, landscape, 192/512/maskable icons). The service worker caches the whole game, and an offline reload boots to the title.
