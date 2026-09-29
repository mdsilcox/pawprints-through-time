# M1 Review — bbfed4aead8cb09f586488d595485012a663e943 (re-review 2)

**Verdict:** PASS

The last blocker, `npm test` going red after 9 PM, is fixed. I confirmed it at the real night-time clock under full machine load. Every earlier M1 blocker is still fixed, the cross-milestone input bug I reported is fixed, and I found no regressions in M1's scope. Walking, drop-in Player 2, keyboard, gamepads, touch, and the shared camera with its soft tether all work on desktop and phone.

## Previous blocker

- **`npm test` failed every night (21:00–04:59): FIXED.**
  - **How:**
    - `bootToTitle` pins the reminder's device hour to 12.
    - `reminder.check()` honours that pin, and the screenshot script does the same.
    - Walking, tether and wall tests now poll until the player has moved, instead of checking after a fixed wait.
    - The late-night nudge has a real-trigger test. It pins 22:00, waits for the nudge to appear on its own after the arrival scene, then checks the player can still walk.
  - **Verified:** I ran `PW_WORKERS=2 npm test` at the real clock, 22:31–22:42 CDT, with the M2 critic's suite running in parallel and the CPU at 97–99%.

    | Suite | Result |
    |---|---|
    | Unit | 84 of 84 passed |
    | End-to-end | 89 passed, 2 skipped, 0 failed |

    - The two skips are the expected conditional ones: the touch test in the desktop project, and the mouse-and-keyboard test in the phone project.
    - Both M1 regression tests passed at night: the idle-gamepad menu test and the 👥-plus-Enter test.

## Earlier blockers, rechecked at this commit

1. **Gamepad menus skipping every other button: still fixed.**
   - This commit changed how arrow-key menu navigation picks the next button, so I re-ran every case.
   - With 0, 1 or 2 pads connected, every key, d-pad and stick press moves exactly one step in the pause menu.
   - With two pads connected, pad 1 reaches every button in order: title (Continue → New Game → Load Game → Settings) and slot picker (1 → 2 → 3).
2. **Clicking 👥 left Enter toggling Player 2: still fixed.**
   - After clicking 👥, focus stays on the page. Enter, NumpadEnter and Space never toggle P2.
   - P2's Enter at the sign opens the sign's dialogue.
   - The same holds after clicking pause → Resume, and after clicking the objective pill.

## Cross-milestone finding: fixed

The problem was that Pip's popups drew on top but didn't receive input first.

- **Code:**
  - `ui.top` now prefers the top layer.
  - Pip waits for a calm moment: no dialogue, cutscene or running story, and not in the first 3 s of play.
  - Her card ignores presses for its first second.
- **Verified at the real 22:43 clock** (not the test hook), starting a new game through the real menus on desktop and phone:
  - I advanced the story one press or tap every 700 ms. The nudge never appeared over the arrival story, and phone taps advanced it normally.
  - The nudge appeared on its own once the scene ended.
  - After "Just a little longer", the player walked 3.3 tiles.
- **Break time mid-dialogue:** when break time arrives in the middle of a sign, Pip waits until the sign closes. `E` presses during her first second are ignored.

## Blockers

- None.

## Top improvements

1. **Give phone 2P more vertical room.**
   - Keeping players clear of the HUD and buttons leaves only **3.76 tiles** of vertical separation on a 667×375 phone, against 15.1 tiles horizontally. The ribbon appears at about 2.9 tiles.
   - So when one child walks up a path, both will feel the tether almost immediately.
   - Suggestions:
     - Let players stand in the bottom band beside the stick rings and between the A/B pairs, reserving only the button footprints.
     - Or allow a slightly lower minimum zoom when touch controls are shown.
   - While in this code:
     - Clamp action bubbles inside the view. P2's "/ Enter" bubble at the clocktower is clipped at the top when the players are far apart.
     - Fade the idle stick ring when a player stands under it.
2. **Make the desktop tether test reach the tether.**
   - `movement.spec.ts:63` now stops pulling once the players are more than 8 tiles apart, then samples for 1.5 s. On desktop that's 10→20 tiles horizontally against the real limit of 26.2, and 3.9→8.7 tiles vertically against 13.3. So the desktop variant would pass with the tether removed.
   - The phone variant does reach its limits (15.06 of 15.09, and 3.76 of 3.76), and the tether maths is unit-tested, so a broken tether would still be caught.
   - Fix: poll until the separation stops growing (or expose `maxSeparation` as a hook), then sample `onScreen`.
3. **Make the P key robust.**
   - `menuMode` is now read live. In the world, P emits "pause", and then the trailing `if (this.menuMode && e.code === 'KeyP')` emits "back" in the same keydown.
   - Only the 300 ms open lock stops P from closing the pause menu it just opened. It works today (open, close, open, close), but it's fragile.
   - Fix: capture `menuMode` once at the start of `onKeyDown`.

**Minor (unranked):**
- A slow double-tap on "Keep it" (about 235–370 ms apart) still reaches slot 2's card and opens the names screen. Nothing is lost: the names screen has Back, and slot 1 stays intact. A 400 ms lock after a dialog closes would cover normal double-tap speeds.
- **For the M2 review:**
  - A toast already on screen when a menu opens still overlaps it for about 2 s. On the phone, "Player 2 joined!" overlaps the pause panel's bottom edge (see `review/M2/pause-2p-phone.png`). Fading visible toasts when a menu opens would finish that fix.
  - A child who keeps pressing `E` after a dialogue ends takes "Take a break" about 1 s after Pip appears. The save is kept, but requiring a release and a fresh press after the card appears would make the choice deliberate.

## Fun score

5/10. What's working:
- Moving around feels good: 3.3–3.7 tiles/s even at 26 fps.
- Biscuit tags along.
- Doors take both players inside together.
- Pip now fits the story instead of interrupting it.

Biggest thing holding it back: nothing to do yet beyond the first village errands. The eras and mini-games are still to come.

## Required features tally

Working 2 · partial 7 · missing 5. This is judged at this commit. Items outside M1 are based on their passing tests and my spot checks; their own reviews will go deeper.

1. Adventure story — partial. There's the opening storybook, the ferry arrival, Pip's request, and the first quest.
2. Village life — partial. There are neighbours with friendship, digging and collecting, interiors, and day/night. There's no home decorating yet.
3. Time travel — missing (M6).
4. Outfits — partial. M4 added a wardrobe for both players and Biscuit, plus Bramble's shop, and all 10 wardrobe end-to-end tests pass. I didn't review it here. Era reactions and dress-the-part puzzles come with the eras.
5. Bowling — missing.
6. Corgi — partial. Biscuit follows, sniffs, digs and leads the opening.
7. Dancing — missing.
8. Riddles, logic and strategy — missing.
9. Playtime reminder — working. Checked with fast-forward in 1P and 2P on desktop and phone:
   - Nothing at 44.5 min.
   - At 45 min, Pip appears with "2 left", then "1 left".
   - Then the firm version with no snooze, which returns 5 minutes after "Keep playing".
   - "Take a break" leads to a named goodbye and back to the title.
   - The late-night nudge works at the real night clock.
10. Map and pirates — partial. The local Tockwood map works; there are no pirates or world map yet.
11. Fairy — partial. Pip opens the story and gives the reminders.
12. 1 or 2 players — working. See Verified below.
13. Bunnies — partial. There are Clover, Grandma Hopkins, wild bunnies, the warren and the bunny tracker; no rescues yet.
14. Magic soup — missing.

## Verified (M1 scope)

- **Keyboard:**
  - A steady 3.3–3.7 tiles/s, even under full CPU load.
  - The split keys move P1 and P2 independently.
  - The dock edge (stops at x=31.6) and the clocktower walls stop you.
  - P opens and closes pause.
- **Gamepads:**
  - Both pads move their players at the same time.
  - Pad 2's Start drops P2 in, and pauses once P2 is in; B closes the pause menu.
  - Leaving from the pause menu, then rejoining with Start, works.
- **Touch (phone):**
  - The stick walks the player.
  - A reads "Read" and opens the sign; taps advance and close the dialogue.
  - B sends Biscuit sniffing.
  - Two thumbs move two players at once.
  - The 2P A buttons are 147 CSS px apart.
- **2P doors:** at the tailor's, both players go in together and stay framed, even when pulled apart inside.
- **Menus:** Player 2 join/leave news waits until the pause menu closes.
- **Console:** no errors in any session.
- **Docs:** PROGRESS and DECISIONS are honest, and no decision quietly drops a spec requirement.
- **Cleanup:** I stopped all my dev servers and test processes, and my ports are free.
