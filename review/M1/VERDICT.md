# M1 Review — e273ba8169ad7c332d44627a8788984252d80267 (re-review 1)

**Verdict:** REVISE

Both previous blockers are fixed, and each now has a regression test that would have caught it. All three top improvements landed too. Movement and controls are now PASS quality on keyboard, gamepad and touch, in 1P and 2P.

One blocker remains, and it's in the test suite, not the game. `npm test` fails every night from 9 PM to 5 AM, because Pip's late-night nudge (M2) interrupts every e2e game. On an overnight build, that means every run for the rest of the night. The fix is a few lines in the test helpers.

Separately, I found a family-facing input bug in the M2/M3 code. It's in its own section below so the M2 and M3 reviews don't miss it.

## Previous blockers

1. **Menus skipped every other button once a gamepad was connected — FIXED.**
   - **Code:**
     - `src/input/input.ts` lines 215–229: each pad emits `nav` only for its own `padDir`, not the merged player direction.
     - Keys pressed in a menu no longer leak into gameplay presses.
   - **Tests:**
     - Two new unit tests: an idle pad plus a key press, and two pads with one d-pad press. I traced both against the old loop: each would have produced `['down','down']` and failed.
     - A new e2e test runs with an idle pad connected.
   - **By hand** (emulated pads): with 0, 1 or 2 pads connected, every key, d-pad and stick press moves exactly one step:
     - Pause menu.
     - Title: Continue → New Game → Load Game → Settings, and back.
     - Slot picker: 1 → 2 → 3 → 2.

2. **Clicking 👥 left Enter toggling Player 2 — FIXED.**
   - **Code:**
     - HUD buttons are `tabindex=-1`, block focus on `pointerdown`, and `blur()` after a click.
     - Enter and NumpadEnter are prevented outside menus.
   - **Test:** a new e2e test clicks 👥, has P2 press Enter at the sign, and expects the dialogue to open with 2 players still there.
   - **By hand:**
     - After clicking 👥, focus stays on the page.
     - Enter, Enter, NumpadEnter and Space all leave P2 joined.
     - P2's Enter at the sign opens its dialogue.
     - The same holds after clicking pause → Resume, and after clicking the new objective pill.

## Blockers

- **`npm test` fails every night (21:00–04:59) because Pip's late-night nudge interrupts every e2e game.**
  - **Cause:**
    - `isLateNight()` (`src/core/sessionTimer.ts:177`) is true from 21:00 to 04:59 by the device clock, and the nudge opens within about a second of play starting.
    - `bootToTitle` and `startGame` in `tests/e2e/helpers.ts` never pin the clock or turn the nudge off. Only the dedicated late-night test touches it, via `triggerLateNight`.
    - The commit was made at 20:57, so a pre-commit run would have finished before the window opened.
  - **What I saw** (this commit, machine clock 21:00–21:40):
    - **`npm test`:**
      - Unit tests passed, 73 of 73.
      - The first two e2e tests failed. The WASD test moved 0 tiles because the nudge blocks the world. In the sign test, the test's `E` press hit the autofocused "Say goodnight" and ended on the goodbye screen.
      - After 5 minutes only 2 of 63 tests had finished, with the rest waiting out timeouts, so I stopped the run.
    - **`movement.spec.ts` (desktop), under the project's own config:**
      - 7 of 8 failed, 1 passed, 1 skipped. The failures include both new regression tests for this review.
      - All 7 failure snapshots show "It's getting late" or "See you soon".
    - **The same full suite with one change** (a daytime `timezoneId`, via a scratch copy of the config): 61 passed, 2 conditional skips, 0 failed.
  - **Also flaky under load (same fix pass):** two M1 tests still check distance after a fixed wait. Both failed while other reviews' suites had the CPU at 100%, which DECISIONS plans for:
    - The WASD test's W leg moved 0.68 tiles against a limit of > 0.8 (`movement.spec.ts:28–31`).
    - The tether test got 7.35 tiles apart against > 8 (`movement.spec.ts:60–80`).
    - Each failed on one viewport and passed on the other.
    - `walkUntil` (`helpers.ts:72`) was added for exactly this case but is never called.
    - The M0 review made a flaky test a blocker, and these are the same kind.
  - **Fix:**
    - Pin the reminder's device clock to midday in `bootToTitle`, for example with a `setDeviceClock(hour)` debug hook that sets `reminder.clock`. A fixed `timezoneId` alone isn't enough, because it's still night in any timezone for part of the day.
    - Have the late-night test pin 22:00 and wait for the nudge to appear on its own, so the real trigger is covered instead of `triggerLateNight`.
    - Switch the two movement tests to `walkUntil` or `expect.poll` on position.
    - Re-run `npm test` after 9 PM.

## Outside M1's scope: fix before M2/M3 can pass

- **Pip's popups sit on top of the screen but not on top of the input, which can end a session nobody chose to end.**
  - **Cause:** the reminder and the nudge draw on `ui.topLayer`, but `ui.top` is simply the last screen pushed onto the stack.
  - **Desktop, new game at night:**
    1. The nudge opens first.
    2. The arrival cutscene's dialogue is then pushed above it in the stack.
    3. Every `E` advances the hidden story underneath the nudge.
    4. When the cutscene ends, the next `E` activates the focused "Say goodnight".

    I reached "See you soon, Theo!" 12 seconds into a first game, having never seen the opening story.
  - **Phone:** taps on the story do nothing; it stays frozen under the nudge until a button is tapped.
  - **Any time:** pressing `E` through a dialogue at a normal pace when the 45-minute reminder opens, the first press after the 300 ms lock accepts "Take a break". I reproduced this with `triggerReminder`.
  - **Fix:**
    - Make top-layer screens the input top.
    - Hold reminders until the current cutscene or dialogue ends.
    - Ignore confirm presses for about a second after Pip appears, or give her buttons no default focus.

## Top improvements

1. **Keep action bubbles inside the view.** P2's "/ Enter" bubble at the clocktower door is clipped by the top of the screen when the players are far apart. Clamp bubbles to the camera's `worldView`.
2. **Stop toasts covering open menus.** "Player 2 joined!" and quest toasts cover two pause-menu tiles on the phone (`review/M3/pause-2p-phone.png`). Hold toasts while a blocking screen is open, or draw them below screens.
3. **Keep players out of the idle joystick ring on the phone.** At diagonal tether extremes, a player can stand inside their faint idle joystick ring. For example, P2 at x=614 of 667 with feet at y=279 is inside the ring at 526–634 × 225–333 px. Add a side margin when touch controls are shown, or fade the ring when someone is under it.

**Minor:** a double-tap on "Keep it" slower than about 220 ms still reaches slot 2's card and opens the names screen for a new game there. I measured 235–370 ms between clicks. Faster taps are swallowed, the names screen has Back, and slot 1 stayed intact in every run. A 400 ms lock after a dialog closes would cover normal double-tap speeds.

## Fun score

5/10. What's working:
- Movement is responsive, at a steady 3.6 tiles/s.
- Biscuit trots along beside you.
- Trees and buildings fade when you walk behind them.
- 2P on one phone is now comfortable.
- The village has neighbours, bunnies and day/night.

Biggest thing holding it back: nothing to do yet beyond the first village errands. The eras and mini-games are still to come.

## Required features tally

Working 2 · partial 6 · missing 6. This is judged at this commit. I judged the M2/M3 items from their passing tests, the screenshots and spot checks; their own reviews will go deeper.

1. Adventure story — partial. There's the opening storybook, the ferry arrival, Pip's request and the "A Crack in Time" quest. There's no middle or ending yet.
2. Village life — partial. There are 5 neighbours plus Clover and Grandma Hopkins, with daily lines and friendship, digging finds, museum donations, interiors, and day/night. There's no home decorating yet.
3. Time travel — missing. The clocktower has a portal ring; it opens in M6.
4. Outfits — missing. The paper-doll layers and the clothing catalogue exist; the wardrobe is M4.
5. Bowling — missing.
6. Corgi — partial. Biscuit follows you, sniffs, digs and leads the opening. His puzzle and dance roles come later.
7. Dancing — missing.
8. Riddles, logic and strategy — missing (M5).
9. Playtime reminder — working. Verified via `fastForward` in 1P and 2P on desktop and phone:
   - Nothing at 44.5 minutes.
   - Pip appears at 45 minutes with an in-character line, and the game autosaves.
   - Two snoozes, then the firm version with no snooze button.
   - "Take a break" leads to a named goodbye, then the title.
   - The late-night nudge appears and can be dismissed for the session.

   Caveat: the input bug above.
10. Map and pirates — partial. The local Tockwood map works; there are no pirates or world map yet.
11. Fairy — partial. Pip opens the story and gives the reminders; hints and portals come later.
12. 1 or 2 players — working for everything built so far (see below).
13. Bunnies — partial. There are Clover, Grandma Hopkins, wild meadow bunnies that scatter and hop back, the warren and the bunny tracker. There are no rescues yet.
14. Magic soup — missing. The Burrow's cauldron is scenery until M5.

## Verified (M1 scope)

- **Tests:**
  - Unit tests: 73 of 73 pass.
  - e2e with a daytime clock at normal load: 61 passed, 2 conditional skips (the touch test on desktop, the mouse-and-keyboard test on phone).
- **Keyboard:**
  - Steady 3.6 tiles/s.
  - In 2P the split keys move each player independently.
  - The dock edge and the clocktower walls stop you.
  - `P` now opens and closes pause.
- **Gamepads:**
  - Both pads move their players at the same time.
  - Pad 2's Start drops P2 in, and pauses once P2 is in; B closes the pause menu.
  - Leaving from the pause menu, then rejoining with Start, works.
- **Touch:**
  - The floating stick walks the player.
  - A reads "Read" and opens the sign's dialogue, and taps advance it.
  - B sends Biscuit sniffing.
  - The controls hide during dialogue and come back after.
  - Two thumbs drive two players.
  - The 2P A buttons are now 147 CSS px apart, up from about 29.
- **Phone 2P framing:** at the vertical tether limit, heads stop at y=88 (the objective pill ends at 67) and feet stop at y=279 (the A buttons start at 300).
- **Doors in 2P:**
  - The tailor shows an "Enter" prompt.
  - Both players arrive together, with P2 placed beside P1.
  - Both stay on screen when pulled apart in the small room.
- **Art fixes:**
  - No trees or rocks on water: 0 of 58 trees and palms, down from 17 of 75.
  - The oak's crown is fully round.
  - Buildings and trees fade when a player or Biscuit walks behind them.
  - Each player gets their own action bubble.
- **M0 double-tap cases:**
  - A double-tap on New Game opens one slot picker.
  - A double-tap on a used slot opens one confirm dialog.
  - The smoke test for these passes, and saves stayed intact.
- **Console:** no errors in any session.
- **Tone and originality:**
  - The tone is warm throughout, and there are no franchise names in the source.
  - One note for the M3 review: an owl museum curator who takes fossil donations closely echoes a famous life-sim character. A different species would keep Dr. Quill clearly original.
- **Docs:** PROGRESS and DECISIONS are honest, and no decision quietly drops a spec requirement.
