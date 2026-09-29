# M1 Review — a1b871ccabe7a00e28d57dbb643f288aeb3f68fb

**Verdict:** REVISE

M1 is close. Tockwood Isle already looks like a finished cozy game, walking feels good, touch controls work well, and the tether never traps anyone in a wall. But two controls bugs break normal play in common family setups. Both are small fixes.

## Blockers

- **Once a gamepad has been used, menus skip every other button.**
  - **Where:** `src/input/input.ts` lines 221–222.
    - The per-pad loop emits `nav` from the shared `p.dir`.
    - That field already holds this frame's keyboard direction (set by `applyKeys`, line 167) or an earlier pad's direction.
    - In 1-player mode every pad writes into player 1's slot (line 184), so the same direction is emitted again.
    - Chrome only lists a pad after one of its buttons has been pressed. So this starts as soon as a controller has been touched in the session, and it's an everyday situation.
  - **What I saw** (emulated pads, desktop):

    | Setup | Action | Result |
    |---|---|---|
    | Keyboard, one idle pad connected | One `S` or `↓` in the pause menu | Resume → **Save & quit to title**, skipping Player 2: Join. With no pad connected: Resume → Player 2: Join. |
    | Two pads, 1 player | Pad 1 d-pad `↓` in pause | Resume → Save & quit. In my gamepad playthrough, `↓` then `A` quit me to the title. |
    | Two pads, title screen with a save | Pad 1 `↓ ↓ ↑ ↑` (d-pad or stick) | Continue → Load Game → Load Game → Continue → Continue. **New Game can't be reached.** |
    | Two pads, slot picker | Pad 1 `↓` from slot 1 | Lands on slot 3; slot 2 can't be reached. |

    Pad 2 steps correctly because it's processed last, so behaviour also depends on pad order.
  - **Why it blocks:**
    - M1 is the controls milestone, and spec 5.8 names "two gamepads".
    - With both controllers on, pad 1 can't reach New Game (once a save exists), slot 2, or "Player 2: Join".
    - One stray tap in pause lands on "Save & quit".
    - The tests can't catch it: the d-pad unit test connects one pad, and the keyboard-menu e2e test connects none.
  - **Fix:**
    - In the pad loop, emit `nav` only for the direction *that pad* produced this frame. Use a local variable, never the merged `p.dir`.
    - Add unit tests: a key press with an idle pad connected gives exactly one `nav`; two pads in 1P with one d-pad press gives exactly one `nav`.
    - Add a variant of the e2e "menus work with the keyboard alone" test that runs with an emulated idle pad connected.

- **After clicking the 👥 HUD button, every Enter press toggles Player 2 out and back in.**
  - **Where:**
    - `src/ui/hud.ts` lines 24–35: the HUD button keeps DOM focus after a mouse click.
    - `src/input/input.ts` line 49: outside menus, `Enter` isn't in `PREVENT`, so the browser "clicks" the focused button.
  - **What I saw** (desktop):
    1. Click 👥 → "Player 2 joined!".
    2. Player 2 stands at the plaza sign and presses Enter, which the README lists as P2's action key ("/ (or Enter)").
    3. The toast says "Player 2 is taking a rest.", `twoPlayer` becomes false, and the sign isn't read.
    4. Further Enter presses toggle again: true → false → true → false. NumpadEnter does the same.
    5. In 1P mode, where Enter is P1's action, the same trap re-adds Player 2.
  - **Why it blocks:** the README sends desktop players to exactly this button, and "why did my sister vanish?" is an evening-ender.
  - **Fix:**
    - Don't let HUD buttons keep focus: `blur()` after activation, or `tabindex="-1"` plus `preventDefault` on `pointerdown`.
    - And/or `preventDefault` Enter/NumpadEnter outside menus.
    - Add an e2e test: click 👥, press Enter by the sign; there should still be 2 players and the sign toast should show.

## Top improvements

1. **Phone 2P: keep players out from under the controls, and move the two A buttons apart.**
   - At the tether limit on a 667×375 phone:
     - **Vertical pull:** P2's feet ended at y=342 of 375 CSS px, wedged between the two A buttons, with the blue A covering their side.
     - **Diagonal pull:** P1's head sat under the "Tockwood Isle" chip, and P2 sat under their joystick base.
   - **Fix:** when touch controls are shown, add the HUD band (~3.6rem) to `marginTop` and the button band (~5rem) to `marginBottom` in `WorldScene.frameOpts()`, converted to world units at the current zoom. The tether will then stop players before they reach the controls.
   - **Also:** the two A buttons are only ~29 CSS px apart at the centre line, so two kids' inner thumbs will collide. Move each A/B pair about 10% of the screen width outward.
2. **Fix two art glitches a parent will see on the first walk north.**
   - **The oak's crown is sliced flat.** The old oak is the Bubbling Burrow, one of the island's key landmarks. `src/art/props.ts:774` draws its canopy centred at y=140 with r=190 on a 480 px canvas, so about 50 px of crown is drawn above the canvas and cut off. Enlarge the canvas or shift the drawing down.
   - **Trees stand in the sea.** 17 of the 75 trees and palms (the NW and NE corners of the north woods) and the rock at (14, 38.5) have their bases on water cells. The woods spots in `src/world/maps/tockwood.ts` lines 115–148 never check terrain; skip any spot whose base cell isn't grass or sand.
3. **Don't let players get lost, and give each player their own prompt.**
   - A player can walk fully behind the clocktower or a tree canopy and vanish, marker included. Draw a soft silhouette when occluded, or fade the occluding prop.
   - In 2P only one world prompt is drawn. With P1 at the sign and P2 at the clocktower door, only "E Read" appears. P2's `/` still works, but they get no cue. Draw one bubble per player.

**Smaller notes (unranked):**
- `P` opens pause but doesn't close it.
- On small phones, the "Player 2 joined!" toast covers the pause panel's "Paused" heading.
- The B "Sniff" button does nothing yet. Until Biscuit arrives in M3, a gentle toast would stop it feeling broken.
- **Timing flakiness under load.** In a `--repeat-each=2` run done while my own browsers were loading the machine, 3 of 46 tests narrowly missed their distance thresholds (0.93 and 0.99 vs >1; 1.17 vs >1.2). Frame dt is clamped at 50 ms, so a busy CPU plays in slow motion. DECISIONS plans concurrent `npm test` runs in two checkouts, so assert with `expect.poll` on position (or a larger hold time) instead of distance after a fixed wait. Clean re-run: CLEAN_RESULT.

## Fun score

3/10. Biggest thing holding it back: there's nothing to do or meet yet. The island is charming and pleasant to walk: walk bob, squash-and-stretch, a smooth camera, and a sparkly tether ribbon. But it's an empty, silent stage, which is expected at M1.

## Required features tally

Working 0 · partial 2 · missing 12.

1. Adventure story — missing
2. Village life — partial. The whole hub is walkable: cottage and garden plots, tailor, museum, Tockwood Lanes (placeholder), plaza, beach, dock, the old oak, and the meadow with warren mounds. There are no neighbours, decorating or collecting yet.
3. Time travel — missing
4. Outfits — missing. Groundwork is in: a paper-doll rig with clothing layers, P1 and P2 already dressed differently, and a clothing catalogue in data. There's no wardrobe yet.
5. Bowling — missing. The alley shows "Coming soon!".
6. Corgi — missing
7. Dancing — missing
8. Riddles, logic and strategy — missing
9. Playtime reminder — missing, due in M2. Settings still default to 45 min and can't be disabled. There's no session timer or fast-forward hook yet, so I couldn't trigger it.
10. Map and pirates — missing
11. Fairy — missing
12. 1 or 2 players — partial.
    - Working: drop-in/out via the pause menu, 👥, or pad 2's Start; split keyboard; two pads; phone thumb zones; shared camera with soft tether; a distinct-looking P2.
    - Still broken: the two blockers above.
13. Bunnies — missing (warren mounds only)
14. Magic soup — missing (Bubbling Burrow exterior only)

## Verified

- **Tests**
  - `npm test` passed: 43 unit + 22 e2e, with 1 conditional skip (the touch test in the desktop project; it runs in the phone project).
  - The tests exercise real behaviour: movement deltas, collision, tether, two-thumb CDP touch, emulated pads. The gap is menus with more than one input device.
- **M0 follow-ups**
  - All five double-tap cases are fixed on phone and desktop: no duplicate screens, no accidental new game, saves intact.
  - Menus now take keys and pads, with a clear gold focus ring (apart from blocker 1).
  - The `pwa.spec` no-op is gone.
  - `shots.mjs` now fails loudly on a missing hook.
- **Keyboard**
  - Title → slot → world → doors ("E Enter" prompt, then an "…opens soon!" toast) → sign.
  - Diagonal movement is normalised: 3.85 vs 3.76 tiles/s.
- **Gamepad**
  - Stick, d-pad, A/B and Start all work.
  - Pad 2's Start drops P2 in during play. On the title it shows a friendly "Player 2 can join once the adventure starts!" toast.
  - Both pads move their players at once, and the prompt glyph switches to "A".
- **Touch**
  - Analog floating stick.
  - A turns gold and reads "Read".
  - Holding the stick and pressing A at once works.
  - In 1P the right side ignores drags.
  - Two thumbs drive two players at once.
  - HUD pause and 👥 work.
- **Tether stress test:** 60 s of random 2P movement on phone and desktop (~7,100 frames). Nobody ever overlapped a wall, and both players stayed on screen when pulled apart horizontally, vertically and diagonally.
- **Collision:** the shoreline stop matches the drawn sand edge.
- **Save & quit → Continue** restores position, and a page reload forgets P2, as DECISIONS says.
- **Screen sizes:** layouts hold at 1920×1080, 1280×720, a 1024×768 tablet, and 667×375 and 568×320 phones. Portrait shows "Turn your phone sideways to play!".
- **Console:** no errors in any session.
- **Tone, originality and docs:** nothing scary. The names are original (Tockwood Isle, Bramble's Stitch & Style, The Bubbling Burrow, Tockwood Lanes), and the art is procedural. No DECISIONS entry quietly drops a spec requirement.
