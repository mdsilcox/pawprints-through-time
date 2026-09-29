# M6 Review — 21f88d9 (code at cc0d5b2)

**Verdict:** REVISE

The pirate chapter is complete, and every step can be reached by walking and talking. I played it on desktop by keyboard (1P), and on a 667×375 phone as a pair using touch. The writing is warm and funny, and each of the four map pieces is found a different way. Dressing the part works in 1P and 2P, including the Wardrobe route. Every puzzle works by keyboard, mouse and touch, and the tests are real.

Two bugs block a PASS:
- A likely input pattern loses the chapter's opening and its quests.
- One Puzzle Journal replay is impossible.

Both are small fixes.

## Blockers

1. **Pressing the action button once more after Pip's travel lines loses the pirate arrival scene and all three pirate quests.**
   - **Why it happens:**
     - The `portal` spawn (`src/world/maps/pirate.ts:115`, 7.5/19.3) is inside the "Portal home" ring's range (ring at 7.5/17.9, range 1.3). The prompt reads "Portal home" the moment you land.
     - `triggerEnter` runs 420 ms after the map is created (`WorldScene.ts:197`).
     - `run()` in `src/story/hooks.ts:45-47` silently drops a handler if another story script is busy.
     - So an extra press starts the portal-home script, and `onEnterMap('cove')` is discarded.
   - **Desktop timing:** I pressed E once, 0/150/300/450/600/750/900 ms after dismissing Pip's "Next stop: The Golden Age of Piracy!". Every one of those lost the arrival; only 1100 ms was safe.
   - **Steady mashing:** steady E presses at 350, 500 and 700 ms cadence lost it in 6 of 6 runs. In 2 of those runs the player ended up back in the clocktower.
   - **Phone (2P):** the same happens with steady 500 ms taps on the dialogue box. The box (y 259–364) covers P1's A button (197–260 × 300–363), so the next tap lands on "A: Portal home".
   - **What the player sees:** "Shall I open the portal home to Tockwood?" with **"Yes, home we go!"** focused. One more press sends them home.
   - **What is lost:**
     - The arrival scene and the first History Note are skipped.
     - `cove:arrived` is never set, so "The Lost Map of the Sunny Marigold", "Cousins Lost at Sea" and "X Marks the Spot" never start. There is no HUD objective and no quest stars on the Map; the HUD keeps showing a Tockwood objective.
     - The arrival scene then plays on the *next* entry into Sandy Cove. On the main path (no visit to the hold) that is rowing back from Treasure Island with the treasure. "We made it!… I can feel the Time Sand somewhere nearby…" plays **instead of the crew party**.
     - So `pirate:party` and `marigold:friend` stay unset: no Captain's Coat, and Marigold doesn't visit Tockwood until the family returns to the cove again. I verified this.
   - **Fix:**
     - Spawn about 2 tiles clear of the ring, or shrink its range.
     - Queue enter scripts instead of dropping them when busy, or block world interactions until they have run.
     - Add an e2e test that presses E once about 500 ms after the travel lines.
     - The current test only passes because `playThrough` never presses while no dialogue is open.

2. **Replaying "Through the Swirling Shoals" from the Puzzle Journal is impossible.**
   - **Why it happens:** `src/puzzles/ui/screen.ts:113` passes `calm: hasEffect('calm')` for journal replays too. All three variants are unsolvable in rough seas: the unit test asserts this, and `solve(chart, false)` returns `null` for easy, medium and hard.
   - **Repro:** Pause → Puzzle Journal → Swirling Shoals → Easy, with no gumbo active.
     - The intro still says "With calm seas from the gumbo…".
     - The board shows "wind: up" and live currents.
     - Pip's third hint can only say "Let's start fresh from the dock!", then "No hints left".
   - **Result:** a child replaying a favourite is stuck forever. Spec §5.5 requires the Journal to "let players replay favorites".
   - **Fix:** run replays of `needsCalm` charts with calm seas, and add a test.

## Top improvements

1. **Make the first Time Sand a moment.**
   - **At the chest:**
     - The chest opens behind the player.
     - The sand exists only in narration.
     - "Time Sand 1 of 8!" arrives in a pile of 4–5 other toasts: History Note, Map Scrap, "Gold Doubloon ×5", "+40 Tockens", and the step tick. On the phone they cover both players and the chest completely.
   - **At home:** the Great Hourglass always draws 8 empty sockets and the crack (`art/furniture.ts` `greathourglass`). "Swirls into the first socket with a bright TING!" changes nothing on screen.
   - **Fix:**
     - An item-get pose showing the glowing sand, with Biscuit's bark-jump and a fanfare.
     - Queue toasts one at a time, above the players.
     - Light one socket per `sands.length`.
2. **Stage the chapter's big places.**
   - **The treasure cave** is the plain interior template: flat floor, brick wall, two torches and a potted houseplant (`pirate.ts:242`, `fur('cave-rock','plant',…)`). Make it a cave, with rock walls, gold piles and pools of torchlight.
   - **The Sunny Marigold's deck** is a square 12×5 plank rectangle with the hull drawn separately below it. Give it a bow, a stern and rails.
   - **The "party"** is dialogue only. Saltwhistle speaks from his camp, far off-screen. Gather the crew on deck with bunting; this is also the natural stage for M7's hornpipe.
   - **Pip covers Biscuit.** She hovers on top of him during most digs and sniffs in my screenshots (the X, the map-piece sniff, the cave, the aboard shots). Offset her above or behind the player.
3. **Keep wind and currents in the Swirling Shoals.**
   - **The problem:**
     - With the gumbo, `sail(…, calm=true)` ignores currents and wind, and Marigold won't sail without it.
     - So the chapter's only chart is a slide-until-you-hit-a-rock puzzle, with faded current arrows that do nothing.
     - Spec §4 names "wind and currents" as this challenge; DECISIONS ("only solvable with calm seas") quietly drops that.
   - **Fix:**
     - Let the gumbo calm only the *swirls*, for example a whirlpool tile that spins you back to the dock, while currents still turn the ship.
     - Let players try the Shoals before drinking it, so the soup visibly changes the puzzle.

**Smaller notes:**
- **2P crew gate:** with only P1 dressed, Pepper tells a player wearing the bandana "No crew clothes, no boarding!". Say instead that one of them still looks like a landlubber.
- **Jigsaw text:** the intro says "Four soggy pieces", but the Medium and Tricky boards have 6 and 9.
- **Riddle hints:** riddle `pr-eight`'s *first* hint ("a number between seven and nine") is the answer. Move it last.
- **Phone sailing chart:** every Shoals chart has 6 rows, and the bottom row of rocks is half hidden (board bottom 294 px, scroll area 284 px). The calm-seas note is clipped, and the arrow buttons are only 36×39 px.
- **Text that doesn't match the art:**
  - The camp scrap mentions tents; there are none.
  - Pip says the X is "by that rocky hill", but the door sits on a paved patio.
  - The Stone door's map icon is a moai 🗿.
- **Cousins:**
  - Skipper fades in on an empty floor; he could pop out of a barrel.
  - Shelly is tiny and sits under the player when "Talk" appears.
  - Bosun's "cart" shows a carrot and a pumpkin rather than Bosun.
  - Clover has no homecoming beat for her first cousins; it's one random daily line.
- **Map of Time:** it is a list of cards. Make it feel like a map with glowing destinations (§5.6).
- **Test gaps:** nothing covers the arrival race, replaying calm-only charts, or (in e2e) the wheel refusing to sail without gumbo.

## Fun score

7/10. The chapter's loop is a real adventure: talk, trade, find, sniff, jigsaw, cook, sail, riddle, lock, three bunny rescues and X-marks side digs. The characters (Marigold, Pepper, Cookie, grumpy-kind Saltwhistle) are charming.

Biggest thing holding it back: the payoffs are text-only. You never see the Time Sand, the Hourglass looks the same afterwards, and the celebrations are stacks of toasts over the players, in a bare room with a houseplant.

## Required features tally

Working 9 · partial 3 · missing 2.

1. **Adventure story** — partial. The opening plus one complete chapter; no ending yet.
2. **Village life** — partial.
   - There are neighbours, collecting, the garden and Marigold's visit.
   - Home decorating is missing, and the museum cases stay visually empty.
3. **Time travel** — partial. One era is playable; the Map of Time shows three locked or "Coming soon".
4. **Outfits** — working.
   - Era clothes, with reactions from Coco (sailor's prices), Saltwhistle, Marigold and Bramble.
   - The dress-the-part gangplank works in 1P and 2P.
   - Biscuit's Tiny Pirate Hat.
   - Outfits in the mini-games still need checking in M7/M8.
5. **Bowling** — missing.
6. **Corgi** — working. Biscuit sniffs out the buried map piece and Skipper, and digs the X's. His dance role comes in M7.
7. **Dancing** — missing. The hornpipe is M7.
8. **Riddles, logic, strategy** — working: jigsaw, chart, riddle door (typed answers accepted), gear lock and barrel jam at every difficulty. See blocker 2 for the Journal.
9. **Playtime reminder** — working. I fast-forwarded in Sandy Cove: the gentle card appeared, "Take a break" led to the goodbye, and Continue returned me to the cove.
10. **Map and pirates** — working apart from blocker 1: the Map of Time, local era maps with quest stars and X marks, map scraps, and the pirate chapter.
11. **Fairy** — working. Pip opens the portal, follows you in eras, gives hints and History Notes, and gives the break reminder.
12. **1 or 2 players** — working. I played the whole chapter as a pair on the phone:
    - both players dressed as crew;
    - two Stir buttons;
    - "Player 1 and Player 2" in dialogue;
    - P2 talks with `/`.
13. **Bunnies** — working. The three cousins are found by sniff, sliding puzzle and exploration, then move into the warren; the headbands come at three rescues.
14. **Magic soup** — working. Pirate's Gumbo is brewed in the galley (two spoons in 2P) and is required for the Shoals.

## Verified

- **Tests:** `npm test` (PW_WORKERS=2) exited 0 in 41 min.
  - Unit: 122/122.
  - e2e: 159 passed and 4 skipped (the same viewport-specific skips as before).
  - All five pirate tests pass on desktop and phone.
  - There is no `.only` or `fixme`, and no assertion was loosened.
  - The unit tests prove each chart impassable in rough seas and solvable in calm, and every slide level solvable.
- **Desktop, walking with the keyboard** (in order):
  1. Map of Time (keyboard focus lands on Travel)
  2. Washing line
  3. Gangplank
  4. Marigold
  5. Saltwhistle
  6. Coco (1/2 Tockens)
  7. Pepper (coconut → map piece, Parrot Pal, and a map scrap)
  8. The bottle
  9. The X (eye patch and doubloons)
  10. Biscuit sniffs and digs the last piece
  11. Jigsaw, solved by keyboard
  12. The wheel refuses to sail before the gumbo
  13. Gumbo (1 star, 228 s of calm)
  14. Medium chart in 7 moves
  15. Riddle door, using a hint
  16. Gear lock (its star feedback checked against the secret)
  17. Treasure
  18. Shelly
  19. Sea chest from the north X
  20. The hold: sniff out Skipper
  21. Barrel Jam, Medium, 11 moves
  22. Bosun
  23. The camp X
  24. The party
  25. Portal home and the Hourglass
  - Result: all three quests complete, Marigold is on Tockwood's dock, and the three cousins are in the warren.
- **Phone, 2P, by touch:**
  - Tricky jigsaw by taps, with ✓ badges.
  - Tricky chart with the on-screen arrows, 8 of 9 moves.
  - "a Telescope!" accepted by the typed riddle.
  - Easy Barrel Jam by touch-drag.
  - Two-spoon stirring.
  - Bramble's remark about the bandana.
  - The isle map.
- **Console:** no errors.
- **Tone, originality, history:** no borrowed names, and the tone is gentle. The history facts check out:
  - the Golden Age dates;
  - pirate articles and voting for captains;
  - pieces of eight = 8 reales;
  - hardtack;
  - pirates rarely buried treasure;
  - doubloons were gold.
