# M0 Review — 9eb36cb2e005cb6e3ddc31b87476142e7eed800b (re-review 1)

**Verdict:** PASS

The earlier blocker, the flaky offline test, is truly fixed, and the other changes in this commit help. The new "ignore taps while a screen opens" code has a tap-through bug. It doesn't delete anything and every flow still completes, so it isn't a blocker for a scaffold, but it's improvement #1 below and I'll re-test it at M1.

## Previous blocker

- **Flaky `tests/e2e/pwa.spec.ts`: FIXED.**
  - The spec now waits for `navigator.serviceWorker.ready`. It then polls for `controller`, reloading the page if it isn't controlled yet.
  - On 9eb36cb it passed **35 of 35** runs across 8 separate invocations: `npm test` twice, `--repeat-each=6` five times, and a 4-worker `--repeat-each=3` run under load. It had failed 5 of 8 before.
  - I also deliberately provoked the old race: I reloaded 40–240 ms into service-worker install, then ran the new test steps. That's 18 of 18 successes. The one run that left the page uncontrolled was recovered by the new reload-in-poll, and offline boot worked every time.

## Blockers

- None.

## Top improvements

1. **Swallow extra taps instead of letting them fall through (a regression from this commit, plus one older case).**
   - **Cause:** `.screen.opening { pointer-events: none }` doesn't ignore taps during a screen's first 280 ms. It passes them through to the screen underneath. On the phone (667×375, touch) I got:

     | What the player does | What happens |
     |---|---|
     | Double-tap New Game (120 or 200 ms apart) | Two slot pickers stack up. One Back tap leaves one on screen, so Back looks broken. |
     | Double-tap a used slot (200 ms apart) | Two "Start over?" dialogs. One "Keep it" tap leaves one on screen. |
     | Double-click New Game (desktop) | Two slot pickers. |
     | Tap "Keep it" 100–180 ms after the dialog appears | The tap goes through to the slot list and **starts a new game in slot 2**. At 400 ms it works correctly. |
     | Double-tap "Keep it" (90 or 150 ms apart, dialog fully open) | The second tap lands on slot 2's card and **starts a new game there**. This happened before this commit too. |

   - **Consequence:** in the last two cases, "Continue" then opens the new empty game, because the last-saved slot is now 2. The real adventure is only reachable through Load Game.
   - **Why it happens:**
     - Taps fall through the opening screen, as above.
     - `ui.pop(id)` removes the *lowest* screen with that id, so when there are duplicates the visible one stays.
     - `pickSlot()` waits on IndexedDB before showing the picker, so a quick second click hits New Game again.
     - Nothing guards the screen a closing dialog reveals.
   - **Fix:**
     - On every UI stack change (push *and* pop), lock input for about 300 ms. Add a capture-phase `pointerdown`/`click` listener on `#ui-root` that calls `preventDefault()` and `stopPropagation()` while locked, and drop the `.opening` rule.
     - Make `pop(id)` remove the topmost match.
     - Ignore New Game, Load and slot presses while a picker or dialog is already open.
     - Add an e2e test covering the three double-tap cases above. Each should leave exactly one screen, and slot 2 should stay empty.
   - **Why it matters later:** nothing is lost today. Once there's real progress (M1+), "I pressed Keep it and it started a new game" is the kind of moment that ends a family's evening. I'll re-test all five cases at M1.
2. **Menus still ignore the keys and gamepads the title promises** (carried over from the last review; unchanged in 9eb36cb).
   - Arrow keys, WASD, E/Q, Escape and gamepads do nothing in menus.
   - Tab focus is invisible: `.btn { outline: none }`, and `.kbd-nav` is never set because `ui.nav/confirm/back` are never called.
   - Wire both players' keys and the gamepad into `ui.nav/confirm/back`, and add a `:focus-visible` ring. This is M1 scope.
3. **Let each adventure have a name** (carried over). Every slot card reads "Player 1 · Day 1", so siblings can't tell whose save is whose. `players[0].name` already exists. Ask for a name on New Game and show it on the slot card and the Continue button. This fits naturally with M2.

## Fun score

2/10. Biggest thing holding it back: there's nothing to play yet, which is expected for a scaffold. The title screen and menus are warm and polished, and the redesigned "Start over?" dialog is clearer.

## Required features tally

Working 0 · partial 0 · missing 14. That's expected at M0; where groundwork exists, it's noted.

1. Adventure story — missing
2. Village life — missing
3. Time travel — missing
4. Outfits — missing. The save format has outfit slots for both players and Biscuit.
5. Bowling — missing
6. Corgi character — missing
7. Dancing — missing
8. Riddles, logic and strategy — missing
9. Playtime reminder — missing. Groundwork: settings only allow 15/30/45/60/90 minutes, default 45, can't be switched off, and are now sanitized on every write. The timer, Pip's message and the fast-forward hook are due in M2.
10. Map and pirates — missing
11. Fairy — missing
12. 1 or 2 players — missing. The save holds two player profiles, but the "2P" screenshots are still copies of 1P (see notes).
13. Bunnies — missing
14. Magic soup — missing

## Notes for the next milestones

- **`pwa.spec.ts` line 26 is still a no-op.** It uses `page.waitForFunction(async () => ...)` again; I checked that `waitForFunction(async () => false)` resolves in 12 ms. It's harmless now because the poll after it does the real work, but its comment claims it waits for "activated". Delete it, and don't use async predicates with `waitForFunction` in the M1+ scripted playthroughs.
- **`scripts/shots.mjs` still ignores a missing `joinP2` hook** (line 55, `.catch(() => undefined)`). Fix this before taking M1 screenshots; 2P shots must show two players.
- **The new autosave wiring works but has no tests.** I verified it by hand:
  - Hiding the page wrote the save to IndexedDB within 300 ms. The 1.5 s debounce alone wouldn't have.
  - `pagehide` also saves.
  - Play with no input saved automatically about 62 s after boot.

  M2 needs automated tests for these, along with the session-timer tests the spec requires.
- **`setSettings` resets an invalid value to the default instead of keeping the previous value.** For example, 30 followed by an invalid value becomes 45. That's harmless for the reminder, but surprising.
- **This fix commit also changed save IDs.** Biscuit's `bandana` became `biscuit-bandana`, and `backpack` was added. That's fine, but keeping fix commits focused keeps re-reviews small. PROGRESS "Known issues" should list the double-tap bug until it's fixed.
- **Still to come:**
  - Debug hooks: teleport and join/leave P2 in M1; timer fast-forward and trigger-events in M2.
  - Biscuit wagging on the title.
  - House-style SVG icons in place of the system emoji.

## Verified in this re-review

- **Tests:** `npm test` passed both times (18 unit + 7 e2e). The 4-worker contention run passed 21 of 21. The PWA spec passed 35 of 35. The provoked-race harness passed 18 of 18.
- **Overwrite dialog:** the green "Keep it" is the default (it has keyboard focus), "Start over" is pale with red text, and the slot list is dimmed behind the dialog. Checked on phone and desktop. Single taps behave correctly: "Keep it" returns to the slot list, and "Start over" starts the game.
- **Autosave and settings:** see the notes above. `setSettings({ reminderMinutes: 0 })` becomes 45, and a volume of 5 is clamped to 1.
- **Full playthrough by hand** at 1280×720 and at 667×375 with touch: new game, back to title, continue, load (empty slots greyed out), overwrite keep and start over, and a page reload keeping the save. Everything works, with no console errors.
