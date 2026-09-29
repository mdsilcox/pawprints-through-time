# M5 Review — f648896

**Verdict:** REVISE

M5 is strong work:
- All six puzzle kinds sit with a neighbour and are reachable by walking up and pressing E. I played every one through its real screen at both viewports, both by keyboard and by touch.
- Player 2 can open and solve puzzles with the arrows, `/` and `.`.
- The soup loop works in normal play: Juniper's seeds → garden → clover patch → Clover's cauldron → Glowbroth → the lit Glimmer Grotto chest.
- The tests are meaningful.

Two things block a PASS. Both are small to fix: a museum regression introduced by M5, and a colourblind setting that does nothing for the new puzzle colours.

## Blockers

1. **M5 broke the museum display cases.**
   - **Cause:** in `src/scenes/WorldScene.ts:366-376`, `case 'exhibit':` now falls through into the new `case 'ledge':` branch. Before M5 it shared the `plot` branch and showed "Look".
   - **Result:** all eight cases and pedestals in Dr. Quill's museum now prompt **"Hop up!"**.
     - Pressing E says "It's much too high to climb… (Hmm — Clover's Hopscotch Chowder?)".
     - The donation message ("The display cases are filling up!…", `tockwoodNpcs.ts:340`) can no longer be reached.
   - **Exploit:** after drinking Hopscotch Chowder, every case hands out a Golden Acorn (`hopUp`'s default item). I got 4 acorns from 4 cases, which is 120 Tockens at Quill's table. All 8 cases would give 240.
   - **It hides an M5 puzzle:** the pedestals' interaction radius grew from 0.9 to 1.3 tiles, so it now covers the M5 mosaic. I mapped the prompt around the mosaic: "Mosaic" only appears on a thin strip at the bottom wall (y ≥ 8.6, x ≈ 2.8–4.0). Standing right on top of the tiles shows "Hop up!".
   - **Fix:** move `case 'exhibit':` back with `plot`, so the label is "Look" and it runs `triggerUse`. Add an e2e test that a museum case says "Look".
2. **The colourblind option does nothing for puzzle colours, and the logic grid depends on red vs green.**
   - **Spec:** §6 requires "a colorblind-friendly option for rhythm and **puzzle** colors".
   - **The builder's own promises:** DECISIONS says the puzzle cues would arrive "with those systems in M5" and that "every color cue also has a distinct shape/icon".
   - **What I found:** with Settings → Colourblind **on**, the root gets the `colorblind` class, but:
     - no CSS rule mentions it (0 matches across all stylesheets);
     - `CB_SAFE` (`art/palette.ts:60`) is never imported.
   - **The grid:** in a full-but-wrong grid, a wrong ✓ is the same glyph as a right one. Only the colour differs: red `rgb(187,51,51)` on pink versus green `rgb(47,122,58)` on light green. Both are identical with the option on or off. Pip then says "Check the red ticks!" (`gridView.ts:68`).
   - **Why it matters:** a red–green colourblind child can't find the mistake.
   - **Fix:**
     - Give wrong ticks a shape cue for everyone, such as a dashed outline or a "?" badge.
     - Under `.colorblind`, use the Okabe–Ito colours for ✓ / ✗ / wrong.
     - Word Pip's line by shape, not colour.

## Top improvements

1. **On phones, show each puzzle's rules.**
   - `puzzles.css:874-876` hides `.pz-howto` on every screen ≤460 px tall, so all 18 puzzle/difficulty panels open without their rules on a 667×375 phone.
   - The gear lock is the worst case. Nothing explains what ★ gold and ☆ silver mean, so a phone player has to spend Pip's hints (and lose stars) to learn the rules.
   - The panels have room: all 18 fit with space to spare.
   - Cheapest fix: make `howTo` Pip's opening bubble line instead of "Take your time…".
2. **Make Crate Jam work on phones.**
   - **Crate icons:** `.sl-icon { padding: 18% }` (`puzzles.css:430`) takes its percentage from the crate's *width*, so horizontal crates show a speck and 3-long crates show nothing.
     - On the Tricky board only 4 of 11 crates show their vegetable, yet Pip's hints name them ("the corn crate").
     - Size the image by height instead.
   - **Board size:** on the phone the board is ~196 px square with ~32 px cells (smaller than a child's fingertip), while ~300 px of width sits empty. Put the moves counter and Start over beside the board on short screens and let the cells grow.
   - Touch dragging itself works: I solved the easy board with real touch events.
3. **Let the recipe logic puzzle be solved at the pot.**
   - The cauldron says the clues are in the Recipe Book, so players must leave the cauldron to reread a clue.
   - The ingredient descriptions that make the clues solvable ("grows in the dark", "sways under the waves") are only in the Backpack.
   - The picker also truncates names ("Glowcap Mushro…", "Sardi…") under the ×N badge.
   - Show heard clues in the cauldron, and the ingredient's name and description on focus or tap.

**Smaller notes:**
- **The stir loop never stops.** Taking Pip's break mid-stir leaves the `requestAnimationFrame` loop running (`cauldron.ts:153-167`; the screen has no `onClose`).
  - A bubble sound then plays every 1.3 s on the title screen and on into the next session. I measured 3 bubbles in 4 s on the title, and it persisted after Continue.
  - The pot's three ingredients are also lost.
  - Fix: cancel the loop in an `onClose`.
- **The sailing hint ignores the move budget.** Pip's third hint uses the shortest route from the current square, even when fewer moves are left than that route needs (`sailView.ts:117`).
- **The glow washes out the characters.** The Glowbroth halo is drawn *over* the sprites with ADD blending, so in the grotto and at night Biscuit turns yellow and the hair goes olive. That contradicts DECISIONS ("lit characters keep their true colours").
- **Effect timers are hard to tell apart.** The HUD pills show only a colour and a time; the soup's name is a desktop-only tooltip.
- **Nits:**
  - The bell riddle offers "Clock" as a Medium choice, which is a defensible answer.
  - The Recipe Book says "1 pots brewed".
  - The "E Garden" prompt covers the top-left plot's water-drop cue.
  - The lookout rock is mostly hidden behind a tree.
  - The grotto and lookout aren't on the map.
- **Test gaps:**
  - Crate dragging is desktop-only (`test.skip` on phone), although touch is the main phone input. CDP `Input.dispatchTouchEvent` works; that's how I tested it.
  - No test covers the exhibits (the regression above slipped through) or the colourblind option.

## Fun score

7.5/10. Tockwood finally has a loop worth an afternoon:
- Every neighbour has a well-made puzzle, and its reward (seeds, a recipe riddle) feeds the cauldron.
- Hints escalate into real help (crossing out wrong answers, ticking a cell, a glowing move).
- The Glowbroth → Glimmer Grotto payoff is lovely.

Biggest thing holding it back: on the phone (likely the family's main screen), puzzles open without their rules and Crate Jam is tiny, with most of its labels invisible. After that, soup payoffs are one-offs (one chest, one acorn) until the eras arrive.

## Required features tally

Working 4 · partial 7 · missing 3.

1. **Adventure story** — partial. Opening chapter only; the portal still "opens in the next chapter".
2. **Village life** — partial.
   - New since M4: puzzles for every neighbour, the garden, and soup gifts with favourites.
   - Still missing: home decorating.
   - The museum cases are broken (blocker 1).
3. **Time travel** — missing.
4. **Outfits** — partial. The wardrobe is done; era reactions, dress-the-part puzzles and mini-game outfits come later.
5. **Bowling** — missing.
6. **Corgi** — partial. Biscuit digs, sniffs, and "talks" with Whisker Bisque (sniff directions). His puzzle and dance roles come later.
7. **Dancing** — missing.
8. **Riddles, logic, strategy** — working (Tockwood).
   - All six kinds at three difficulties, reachable through neighbours.
   - Adaptive difficulty (0.4 → 0.5 after a clean solve; hints and leaving ease it), 3 escalating hints, and the Journal with replay at any difficulty.
   - Era puzzles are to come.
9. **Playtime reminder** — working.
   - e2e covers 45 min, two snoozes, the firm card, break and late night on both viewports.
   - Over a neighbour's puzzle, Pip waits out the 60 s calm cap and then appears. "Five more minutes" returns to the puzzle.
   - The break mid-stir works, apart from the leftover bubble loop noted above.
10. **Map and pirates** — partial. No world map or pirates yet.
11. **Fairy** — partial. Pip now gives puzzle hints; portals come later.
12. **1 or 2 players** — working.
    - Player 2 opens the Riddle Stone with `/`, picks answers with the arrows, and slides crates (`/`, arrows, `.`).
    - The cauldron waits for both spoons, and Two-Spoon Tea works on keyboard and on the phone's two Stir buttons.
    - Both players drink the same pot, and the buddy speed is ×1.35.
13. **Bunnies** — partial. Clover's soup arc, Grandma's grid, and bunny chatter with Whisker Bisque; no rescues yet.
14. **Magic soup** — working.
    - Garden, clover patches, Juniper's stall, Finnegan's gifts, and glowcaps from digging.
    - 8 magic and 4 silly soups, with clue-driven discovery and the Recipe Book.
    - Effects: glow, bounce, sparkle, hearts, timers.
    - Gifts with favourites and the two-player recipe.
    - Pirate's Gumbo waits for M6's island ingredient, as decided.

## Verified

- **Tests:** `npm test` with `PW_WORKERS=2`: unit 116/116; e2e 142 passed and 3 skipped (the two known viewport skips plus the new desktop-only crate-drag test); exit 0, 13.1 min.
  - No `.only` or `fixme`.
  - The M5 tests would fail if the features broke: solvers prove every grid, board and chart, and the e2e tests drive each puzzle through its real screen.
- **Riddle Stone:** day 1 riddle, hints, and +5 Tockens. Typed answers like "the clock-towers" are accepted, and the keyboard-only grid works.
- **Neighbour puzzles:**
  - Rocco's lock was solved from the stars alone in 4–5 tries on Easy.
  - Finnegan's boat was sailed with the on-screen arrows and by swipe on the phone.
  - Grandma's grid on Easy, Medium and Tricky.
  - The mosaic, including the clock-face row.
- **Soup:**
  - Timed stirs give "Perfect!" ×4 and ★★★ (173 s of glow); mashing gives ★☆☆.
  - The grotto is dark without Glowbroth and lit with it, and the chest pays out.
  - Effects pause in menus.
- **Console:** no console errors in any session.
- **Tone and originality:** nothing scary or mean, and no borrowed names. The history lines I checked are accurate (trilobites, 45 rpm, Tuscan "bean-eaters", purple carrots, hour-hand-only clocks).
