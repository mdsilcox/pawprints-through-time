# M2 Review — bbfed4aead8cb09f586488d595485012a663e943 (re-review 1)

**Verdict:** PASS

All three blockers are fixed. I checked them in play at 22:30–23:00 CDT, when the real late-night nudge is active, on desktop and phone, in 1P and 2P.

Following Pip's advice can no longer break the story. She now waits for the end of a scene, and her card owns the controls. `npm test` is no longer tied to the time of day.

The build also contains M3 and M4. I judged M2's systems and everything before them.

## Previous blockers

### 1. Taking a break mid-dialogue froze the game — FIXED

- **Evening new game, desktop, keyboard only, mashing E from the title:**
  - Pip waited for the whole ferry arrival. Her card appeared at 9.0 s, after `met:biscuit` was set.
  - Continued mashing went through her card: Say goodnight → Bye → title.
  - After Continue:
    - The player walked 3.6 tiles.
    - The plaza sign opened a visible dialogue.
    - There were no console errors.
- **Evening new game, phone, tapping at a relaxed reading pace:**
  - Pip appeared at 19 s, after the arrival.
  - Say goodnight led to a title reading "Continue · Bean & Sky · Day 1".
  - After Continue the player walked normally.
- **Card forced inside the arrival's nested `conversation()`** (the "corgi in a red bandana" lines): Say goodnight → Continue replays the arrival to the end. The box closes, `met:biscuit` is set, the player walks, and there are no errors. This path depends on the reset of the conversation depth.
- **Card forced over an NPC choice** (Bramble's three-way question), on desktop and phone:
  - E or a tap went to the card, not the hidden choice.
  - After Say goodnight → Continue, Bramble asked again, the conversation finished, and there were no console errors.
- **Plaza sign left open for more than 60 s:**
  - At the cap, the card appeared over the sign.
  - After Take a break → Continue, the sign and Rocco both talk.
- **Other exits:** the HUD pause button can't be clicked during dialogue or cutscenes. Pip's card is therefore the only way to leave mid-scene, and that path is now covered.

### 2. `npm test` failed after 9 PM — FIXED

- **Full run:** started 22:31 CDT with `PW_WORKERS=2`. Unit tests: 84/84. E2E: 88 passed, 2 skipped, 1 failed.
- **The one failure isn't clock-related.** It was the M1 soft-tether test on desktop, while the M1 critic was running on the same machine. The failure screenshot shows P2 half off the right edge at the tether limit. It passed 6/6 on re-run.
- **New tests are stable:** the eight new "M2 review" tests passed 32/32 (`--repeat-each=2`, desktop and phone).

### 3. Tests that couldn't fail — FIXED, with one caveat

- **Now meaningful:**
  - The session-timer unit test (snoozes survive a short trip to the background).
  - The Pause → Settings e2e test, driven by the real 1 s check.
  - The real `visibilitychange` test.
  - The arrival replay test (`core.spec.ts:331`). It checks that E reaches the card and not the hidden line, and that the replayed arrival is visible and finishes.
  - The test forces the card during a plain `talk()`. The nested-`conversation()` case, which needs the depth reset, is untested; I checked it by hand (above). Worth adding as a test.
- **Caveat — the manual-save test (`core.spec.ts:126`):**
  - Its save-count and stored-slot checks can be met by the 1.5 s debounced autosave. That autosave starts from `setFlag` and from opening Pause, which sets `opened:pause`.
  - Control run with the same steps but no Save press: `saves` went 0→1 after about 1.1 s, with `justChanged='banana'` and 5 shells stored.
  - Only the "Saved!" label depends on the button. Save itself works; I checked it against IndexedDB.
  - This is no longer a blocker; tighten it as described in the notes.

## Blockers

- None.

## Top improvements

1. **Give Pip's grace period a fairer start, and slow the mash-through.**
   - **When the 60 s cap starts:** `busyMoment()` (`src/ui/reminder.ts:71-80`) starts counting the cap at the first busy second, whether or not a reminder is due.
     - A conversation that began 50 s before break time gets only 10 s of grace.
     - The 3 s "settling" period counts as busy, so in the evening the cap runs from the first second of play. A family reading the arrival slowly can still get the card mid-scene.
     - Start the cap when the reminder falls due, and give the late-night nudge a longer cap.
   - **Mashing:** a child still mashing E after a scene ends goes Pip → goodbye → title in about 2.5 s (in my run: card at 9.0 s, goodbye at 10.9 s, title at 11.6 s). Also lock "Bye for now!" for about 1 s, or require a fresh key press after the card appears.
2. **Silence the "cancelled story" errors.** Three `talk()` calls run outside `run()`:
   - the sign (`src/scenes/WorldScene.ts:308-311`)
   - the warren bunnies (`:453`)
   - the Lanes door (`:639`)

   These reject unhandled when play ends mid-line. I got `pageerror: story cancelled` when the capped card appeared over an open sign and I chose Take a break. Nothing breaks, but any test that watches for errors will go red. Route them through `run()` or `background()`, or catch `isCancelled`.
3. **Keep toasts off menus on phones.** Toasts that were already showing when a menu opens stay over it. In `review/M2/pause-2p-phone.png`, "Player 2 joined!" and the plaza step cover the Player 2 / Save & quit row for about 2 s. Hide the toast layer while a menu is open and re-show those toasts when it closes.

**Notes:**
- **Missing unit test:** the fix notes mention an out-of-order unit test in `tests/unit/quests.test.ts`. It isn't there: there are 4 tests, all completing steps in order. The fix does work in play:
  - Going beach → meadow → plaza → sign toasts each correct step.
  - The completion toast says "+10 Tockens".
  - Please add the test.
- **Tightening the manual-save test:** read the slot right when "Saved!" appears (well under 1.5 s after opening Pause). Alternatively, cancel the pending autosave through a hook before pressing Save.
- **Test-only code in production:** `window.__testDeviceHour` is read by production code (`src/ui/reminder.ts:91`). It's harmless, but it belongs behind `debugEnabled()`.
- **For the M1 reviewer:** the soft-tether test flaked once under parallel load; details above.

## Fun score

6/10. Biggest thing holding it back: the systems are solid and Tockwood is charming, but there's still nowhere to go. There are no eras, puzzles, soups or mini-games yet (M5+).

## Required features tally

Working 2 · partial 7 · missing 5. M3 and M4 content is judged in their own reviews.

1. Adventure story — partial. Dialogue, choices and flag-driven quests work, and so does the opening chapter. There are no eras and no ending yet.
2. Village life — partial. The hub, neighbours and dig-up collecting are in; home decorating isn't yet.
3. Time travel — missing (the portal opens in M6).
4. Outfits — partial (M4 wardrobe: both players and Biscuit).
5. Bowling — missing.
6. Corgi — partial (Biscuit is a companion who digs and sniffs).
7. Dancing — missing.
8. Riddles, logic and strategy — missing.
9. Playtime reminder — **working**:
   - One shared timer, 45 minutes by default, 15/30/45/60/90 in Settings, and it can't be switched off.
   - It counts in Pause and pauses in the background; 10+ minutes away starts a fresh session.
   - Two snoozes, then a firm reminder that can still be dismissed.
   - Autosave when Pip appears, and a gentle goodbye back to the title.
   - Late-night nudge.
   - It waits for calm moments and never breaks a scene.
10. Map and pirates — partial (a local map; no world map or pirates yet).
11. Fairy — partial (Pip guides the story and gives the reminders).
12. 1 or 2 players — **working** for everything built so far:
    - P2 joins from Pause with the keyboard, answers choices with ↓↓ + `/`, and snoozes Pip with → + `/`.
    - The goodbye names both players ("See you soon, Maisie and Theo!").
    - On the phone, P2 joins from Pause and Pip can be snoozed with a tap.
13. Bunnies — partial (M3).
14. Magic soup — missing.

## Verified in this re-review

- **Natural timer path (Playwright clock):**
  - 4 minutes in the background didn't count.
  - The reminder fired after about 15 minutes of visible play.
  - 12 minutes in the background while it showed closed the card and started a fresh session.
  - Manual Save writes to IndexedDB, and the periodic autosave runs every 60 s.
- **Title and saves:**
  - After deleting the save Continue points to, the title rebuilds and Continue moves to the remaining slot.
  - With every save deleted, only New Game and Settings remain, with New Game focused.
  - Double-clicking or double-tapping Load Game at 30–200 ms never stacks screens.
- **Names screen, keyboard only:** ↑ ← ↑ reaches name 1. Typing "Sadie Wade" (W, A, S and D included) stays in the box. Enter moves to name 2, then to "Let's go!", and both names are saved.
- **Phones:**
  - The title fits at 375 px tall.
  - The controls guide's Back button stays on screen.
  - Pip's glow is round.
  - Tap-to-skip and advance work.
- **Tone, originality and docs:**
  - Tone is gentle.
  - The new DECISIONS entries (calm-moment deferral capped at 60 s, the card owning input, story sessions, toast queueing) don't drop any spec requirement.
  - Renaming the museum curator to a hedgehog time historian helps originality.
- **Cleanup:** every server and test process I started is stopped.
