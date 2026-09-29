# M5 Review — 21f88d9 (re-review 1; code at cc0d5b2; first review at f648896)

**Verdict:** PASS

Both blockers are truly fixed, and I checked each by playing, not only by reading the new tests. All three top improvements and every smaller note from the first review landed as well.

- **Phone:** the puzzles now open with their rules in Pip's bubble. Crate Jam shows every vegetable, and the cauldron puts the recipe clues right at the pot.
- **Regressions:** I found none in M5's puzzles, soup, 2P or the playtime reminder.
- **Test suite:** one run was red. It was an old (M3) wild-bunny test failing once under heavy machine load. It passed 16 times out of 16 when I re-ran it, and it isn't related to these changes (see "Verified").

## Previous blockers

1. **Museum cases were Hopscotch ledges — FIXED.**
   - **Code:** `case 'exhibit'` sits with `plot` again (`WorldScene.ts`).
   - **By hand:** I walked in through the museum door.
     - All 8 cases and pedestals prompt "Look".
     - E shows the display-case text ("An empty display case, polished and waiting…").
   - **With Hopscotch Chowder:** all four cases I tried still say "Look", and **0** acorns are given.
   - **Mosaic:** its prompt now covers the tiles and the strip in front of them (x 2.4–4.4, y ≥ 8.35).
   - **The real ledge still works:** the lookout rock outside hops and gives its acorn.
   - **New e2e test:** it would fail against the old code (prompt "Hop up!", acorns granted).
2. **Colour-only cue and a no-op colourblind setting — FIXED.**
   - **For everyone:** a wrong ✓ has a dashed outline and a "?" badge. Its label says "yes, but check this one", and Pip says "Check the ticks with a question mark!". The right ✓ has no badge.
   - **With the setting on:** I turned it on through the real Settings screen.
     - ✓ becomes Okabe–Ito blue `rgb(0,114,178)`, ✗ becomes vermillion `rgb(213,94,0)`, and a wrong tick is black on yellow.
     - The key crate and exit arrow turn blue, a finished row's dot turns blue, and the gold star turns orange.
   - **New e2e test:** it checks the badge, Pip's wording and the computed colour.

## Previous improvements, re-checked

- **Rules on phones:**
  - On 667×375 all five non-riddle puzzles open with `howTo` as Pip's first line.
  - "❔ How to play" brings the rules back after a hint. On the Gear Lock the ★ gold / ☆ silver explanation returns.
  - On desktop the paragraph shows and the button is hidden.
- **Crate Jam:**
  - Phone cells went from 32 px to 36 px (board 216 px), and the counter and Start over sit beside the board.
  - Every crate shows its vegetable, on the Tricky board too: icons are 22–31 px on the phone and 38–53 px on desktop.
  - Touch-drag still solves the board.
- **Cauldron:**
  - The heard clues show under the ingredients, with a "Clues (n)" button.
  - Hovering, focusing or tapping an ingredient shows "Sardine — A shiny little fish from Finnegan's net."
  - No names are cut off, and the ×N badges moved to the corner.
- **Stir loop:** I took Pip's break mid-stir with the cauldron opened from the world, so a story script was waiting.
  - **0** bubble sounds played on the title (3 per 4 s before the fix).
  - The saved slot keeps all three ingredients, and no recipe or pot is counted.
  - A finished pot is bottled when Pip's break closes it.
  - After Continue there is no bubbling.
- **Smaller notes:**
  - With too few moves left, Pip's third sailing hint restarts from the dock and makes the first move's arrow glow. Following it solves the chart.
  - The glow halo sits behind the characters, so they keep their colours in the grotto and at night.
  - HUD pills show an icon plus a name (icon only on phones).
  - The bell riddle offers "Rooster" instead of "Clock", and the Recipe Book says "1 pot brewed".
  - The lookout rock and the grotto are in clear view and on the Tockwood map.

## Blockers
- None.

## Top improvements

1. **Make Glowbroth read at night.**
   - Moving the halo behind the sprites fixed the colour wash, but it now sits under the night tint.
   - **Measured:** the ground around the players brightens by only +23% (ring luminance 91 → 112), against +111% at f648896. A child who drinks "you glow like a lantern" at dusk will hardly see it.
   - The grotto is fine, because its darkness is a layer with holes.
   - **Fix:** do the same outdoors: a soft light hole in the night overlay around glowing players, or a second glow above the overlay at their feet.
2. **Keep the cauldron's note in view with a big basket.**
   - With every ingredient (19 kinds after all the eras) the grid is 4 rows on a 667×375 phone. The panel scrolls (459 px of content in 345 px of panel), and the clue and ingredient note sit below the fold.
   - "Clues (n)" doesn't scroll to it.
   - **Fix:** put the note beside the pot on short screens, or `scrollIntoView` it when it changes.
   - It's fine in Tockwood-only play (1–2 rows).
3. **Make "How to play" reachable without touch.**
   - The new header button has no `data-nav`, so keyboard and gamepad focus skips it on short screens.
   - Add it, or map it to Pip's portrait.

**Notes:**
- **Flaky M3 test.** The wild-bunny test (`tockwood.spec.ts:102`) teleports the player to `bunny.x − 3.5`, which lands on the shoreline (x 5.9–6.7, once inside a water cell in my runs). Its 6 s "rush" poll failed once under heavy load. Teleporting to a fixed spot inside the meadow and giving the poll more time would keep the M8 checkpoint run from going red for no reason.
- **Map marker overlap** (carried over from M3): the player marker still sits on top of POI labels when standing on them ("Gar①"). Only cosmetic.

## Fun score

8/10. Tockwood's brain-builders and the soup loop are now as pleasant on a phone as on a computer. Every puzzle explains itself, every crate has its vegetable, and the recipe riddles are right beside the pot.

Biggest thing holding it back: in Tockwood the soup payoffs are still mostly one-offs (one grotto chest, one lookout acorn), and Glowbroth hardly shows outdoors at night. The pirate chapter in this commit starts giving soups real jobs (Pirate's Gumbo); the M6 review judges that.

## Required features tally

This commit also contains the M6 pirate chapter, which another critic is reviewing. Items it touches are marked partial and left to that review.

1. **Adventure story** — partial. The opening is done; the pirate chapter is judged in the M6 review.
2. **Village life** — partial.
   - In: neighbours, puzzles, garden, gifts with favourites, and the economy.
   - The museum cases are fixed. Home decorating is still to come.
3. **Time travel** — partial. The Map of Time and the pirate era are present at this commit (judged in M6).
4. **Outfits** — partial. The wardrobe and shop are done; dress-the-part and reactions arrive with M6.
5. **Bowling** — missing.
6. **Corgi** — partial. Biscuit digs and sniffs, and "talks" with Whisker Bisque. His dance role comes later.
7. **Dancing** — missing.
8. **Riddles, logic and strategy** — working.
   - Six kinds at three difficulties, all reachable through neighbours.
   - Adaptive difficulty, 3 escalating hints, and the Journal with replay.
   - Shape cues plus a working colourblind palette.
   - Rules on phones.
9. **Playtime reminder** — working.
   - e2e covers 45 min, the snoozes, the firm card, the break and late night on both viewports.
   - Over a neighbour's puzzle, Pip waits out the 60 s calm cap and then appears. "Five more minutes" returns to the puzzle, and a break mid-stir is now lossless.
10. **Map and pirates** — partial. The local map now shows the Grotto and Lookout; pirates are judged in M6.
11. **Fairy** — partial. Pip gives hints and reads the rules; portals are judged in M6.
12. **1 or 2 players** — working.
    - P2 opens the Riddle Stone with `/`, answers with the arrows, and slides crates (`/`, arrows, `.`).
    - The cauldron waits for both spoons on the keyboard and on the phone's two Stir buttons, and Two-Spoon Tea gives ×1.35 side by side.
13. **Bunnies** — partial. Clover's arc, Grandma's grid, and bunny chatter; rescues are judged in M6.
14. **Magic soup** — working.
    - Garden, clover, stall, gifts and digging.
    - 8 magic and 4 silly soups, with clue-driven discovery, the Recipe Book, and clues at the pot.
    - Effects with HUD icons, gifts, and the two-player recipe.
    - Pirate's Gumbo gets its job in M6.

## Verified

- **Tests:** `npm test` with `PW_WORKERS=2` at 21f88d9.
  - Unit: 122/122.
  - e2e: 158 passed, 4 skipped, **1 failed**, exit 1, 41 min. The run overlapped the M6 critic's suite and my own browser session.
- **The failure** was `[desktop] wild bunnies scatter only when someone rushes at them`: no flee within 6 s.
  - Re-run alone, `--repeat-each=6`: 6/6 pass.
  - My own 10-run repro of its steps: 10/10 bunnies flee as they should.
  - `src/world/actors.ts` is unchanged since f648896, so it's an intermittent test, not an M5 regression.
- **Skips:** all four are viewport-conditional — the two known ones, crate-drag (desktop-only), and the new rules test (phone-only).
- **New tests:** they would fail on the old code, and no assertions were loosened. The mid-stir test reads the saved slot.
- **Regression pass, desktop and phone:**
  - All six Tockwood puzzles reached by walking up and pressing E:
    - Riddle Stone, plus a typed answer "the clock-towers".
    - Rocco's lock, solved from the stars alone.
    - Finnegan's boat, by button and by swipe.
    - Grandma's grid, including keyboard-only.
    - The mosaic, including the clock round.
    - Crate Jam, by mouse and by touch drag.
  - Soup loop in normal play: Juniper's seeds, planting and watering, clover, Clover's lesson, Glowbroth ★★★ from timed stirs, the lit grotto chest.
  - All 18 puzzle panels fit 667×375 with Leave in view.
- **Console:** no console errors in any session.
- **Tone and docs:** nothing unkind in the new lines. The new DECISIONS entries (lossless half-stirred pots; shape cue plus Okabe–Ito palette) drop no spec requirement.
