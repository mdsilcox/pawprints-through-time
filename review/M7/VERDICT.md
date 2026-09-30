# M7 Review — bdb6f55 (re-review 2)

**Verdict:** PASS

The blocker from re-review 1 is fixed.
- A story payoff now lands in the save before its celebration starts.
- I played it with Pip's real "Take a break" at the worst moments: desktop and phone, 1P and 2P, a win and a loss.

Dancing is better too:
- On a phone, one player uses both thumbs.
- Presses are judged at the moment they happen.
- The dance-off ends with confetti and one tidy reward card.

What's left is small, and none of it strands a Time Sand:
- In 2P on a phone, two of each player's lanes are still narrow.
- Five Tockwood puzzle thank-yous can still drop their prize.
- After the finale, the dance list overflows a phone screen.
- A split-second race in the new "Stop dancing".

## Previous blockers

1. **A break during a story payoff kept the "done" and lost the prize (for the chest and the Cup, a Time Sand). Fixed.**
   - **What changed:**
     - `payout()` (`hooks.ts:192`) sets a payoff's flags and all its rewards in one synchronous step, before the first celebration line. Its card appears afterwards.
     - A won dance-off or Cup final pays out through `settle`, before its results card. The winning card has no "Dance again"/"Play again".
     - `dance()` and `bowl()` return `null` if play ended while they were open.
     - `talk`, `ask` and `cutscene` throw once play has ended.
     - `returnToTitle` ends play before its last save, then cancels the pending autosave. The autosaver only writes while playing.
     - Save repair runs on every load (`state.ts:198`).
   - **How I checked:** each time I used Pip's real reminder → "Take a break" → "Bye for now" → Continue. I skipped her 60 s calm-moment wait by moving `Date.now` forward.
     - **Cookie's dance-off, desktop.** I started it by talking to Cookie on deck.
       - *Break over the win card.* The save already had `crew:respect`, the hornpipe History Note, +15 Tockens and Cookie's friendship before the break.
         - The title was clean: no dialogue, no letterbox bars, world and dance scenes shut down.
         - The slot had all of it.
         - After Continue, the objective was "Brew Pirate's Gumbo" and Cookie told her gumbo secret.
       - *Break during "SQUEAK! What footwork!".* Same result.
       - *Break over a lost card.* No stray "Squeak! Good try!" on the title. After Continue, Cookie asks "Ready for another hornpipe?".
     - **Phone, 2P, by taps:** a break during the celebration gave the same result. Both players' sticks and A/B buttons came back.
     - **Treasure chest, phone:** break during "The lid swings open…". The slot has the first Time Sand, 5 doubloons, the spyglass and the note.
     - **The cousins' sand** (PROGRESS.md says this stretch of `pirateChapter.ts` was never re-audited):
       - `cousinsSand` still adds the sand after its cutscene (`pirateChapter.ts:124→128`).
       - A break during "Wait! Before I go —" saves all three cousins and no sand.
       - Save repair adds `pirate-cousins` on load; I saw it return after Continue. Nothing is stranded; the "Time Sand 5 of 8" moment is just skipped.
     - **Cup, sock hop, Great Hourglass:** the new `payoffs.spec.ts` tests break at exactly those moments, and they pass on both viewports.
     - **Lost cousins:** from the map code, every lost cousin re-spawns from saved flags when its map loads (Bosun, Dot and Poppy use `when` conditions), so a break mid-rescue can't lose one.
   - **Leftover of the same kind, low stakes:** the Tockwood brain-builders (Improvement 2).

## Blockers

None.

## Top improvements

1. **In 2P on a phone, give each player four equal tap zones.**
   - **What's wrong:** a tap anywhere in your half now counts for your nearest lane, which is good, but the lanes are still 41 px wide. So each player's taps are split unevenly:
     - ↓ and ↑: 41 px each.
     - The edge lane: 55 px.
     - The lane nearest the centre: 196 px.
   - Two kids sharing a phone, the likely way this family plays, still have to hit the ↓/↑ strips.
   - **Fix:** split each half into four ~83 px zones, and draw the lanes wider to match. The 1P split layout already manages 64 px lanes.
2. **Hand out the Tockwood brain-builder rewards before the thank-you lines.** It's cheap, and it's the last of the old blocker's bug class.
   - **The problem:** `offerPuzzle` has already recorded the solve when `onFirstSolve` runs, and each `onFirstSolve` talks first and rewards after:
     - Grandma: `brainBuilders.ts:98–106`.
     - Juniper: `125–131`.
     - Dr. Quill: `150–153`.
     - Rocco: `170–174`.
     - Finnegan: `191–196`.
   - **Verified with Rocco's gear lock:** Pip's break during "CLICK! My tools!" → Continue.
     - No tomato seeds, no Tick-Tock Tomato clue, no friendship.
     - The journal says solved.
     - The lockbox now only says "I changed the code again!" and a replay gives nothing.
   - **What's at stake:** Grandma's and Finnegan's thank-yous would lose soup clues (Whisker Bisque, Two-Spoon Tea, Sparkle Stew). Recipes can still be found by experimenting, so nothing is soft-locked.
   - **How often:** a reminder that falls due in the last minute of solving one of these puzzles lands on the thank-you.
   - **Fix:** call `payout()` at the top of each `onFirstSolve`, and its `show()` after the lines.
3. **Make the plaza floor's dance list fit a phone.**
   - **The problem:** after the finale, "Which dance shall we do?" (`dancing.ts:37`) has seven choices: six dances plus "Not now".
     - At 667×375 they stack upward from the dialogue box.
     - "The Tockwood Jig" sits at y −60…−19: off-screen, and it can't be tapped.
     - "The Sailor's Hornpipe" is cut off, drawn over 👥 and ⏸.
     - `.dlg-choices` (`menus.css:141`) has no max-height and doesn't scroll.
     - With Egypt and Florence both done (six choices), the Jig is already half off.
     - Rosita still leads the Jig on some days, so it isn't gone entirely.
   - **Fix:** give the list a max-height and let it scroll, use two columns on short screens, or put the dance picker on the setup card.

**Smaller notes:**
- **A "Stop dancing" race freezes the world.**
  - **What goes wrong:** press ⏸ then "Stop dancing" in the ~0.9 s between the last arrow and the results card.
    - `finish()` has already set `finished`, so `teardown()` skips `abort()`.
    - The delayed `done(outcome)` dies with the scene, so `dance()` never returns.
  - **Result:** the world stays paused, the HUD stays in dance mode, nobody can walk, and the floor won't open again. The only way out is ⏸ → Save & quit → Continue.
  - I reproduced it on desktop. It needs a fast double action, so it's rare.
  - Bowling's "Leave the game" has the same shape, with a 700 ms window (`BowlScene.ts:514`).
  - **Fix:** keep the pending outcome and deliver it in `teardown()`.
- **The timing test is weak:** the new assertion (≥ 7 of 10 Perfect/Great) presses within about 12 ms of each note, so it would also pass with the old next-frame judging. A keydown sent a known ~40 ms before the next game frame would pin the new timestamp judging.
- **PROGRESS.md overstates the fix:** it says "every story payoff now hands out its rewards and its 'done' flag together". The brain-builders don't, and the cousins' sand relies on repair.
- **DECISIONS.md contradicts itself:** line 74 (one sand per era; the finale calls the last four home) against line 117 (two sands per era).
- **Phone overlaps:** the reward card covers the end of the objective pill for a few seconds. In the split layout, "Perfect!" pops over the dancer's face.
- **Fixed since last time, all checked:**
  - Phone 1P lanes split under both thumbs, 64 px wide.
  - Phone setup card leads with touch wording.
  - P2's score tag sits under the lanes, clear of ⏸.
  - Each dance has its own 30-combo cheer.
  - An Easy loss suggests the timing tip or "Just dance", not "try Easy".
  - Scores are readable at 1920×1080.
  - Old stage textures are freed on resize.
  - A real furled sail.
  - The storyteller no longer mentions an absent Biscuit.
  - Pirate History Notes trimmed to five.

## Fun score

8/10. Up from 7:
- On a phone, one dancer now plays with both thumbs on lanes about 64 px wide.
- A tap anywhere counts for the nearest lane.
- Presses are judged when they happen, against the music as heard.
- The dance-off ends in confetti and one clear card: History Note, 15 Tockens, Cookie's friendship.

Biggest thing holding it back: two kids sharing a phone still aim at 41 px ↓ and ↑ lanes (Improvement 1).

## Required features tally

At bdb6f55, which includes M8–M10: working 14 · partial 0 · missing 0. I didn't replay Egypt, Florence or the finale by hand; their own reviews judge them in depth.

1. **Adventure story:** working. The finale (the Hourglass whole → party → Bunny Hop → soup → ending storybook → credits → free play) passes its e2e playthrough. Every payoff I broke kept its prize.
2. **Village life:** working.
3. **Time travel:** working. Four eras; the Egypt and Florence chapter playthroughs pass.
4. **Outfits:** working. An outfit changed mid-dance shows on the floor at once (its test passes).
5. **Bowling:** working.
6. **Corgi:** working. Biscuit dances in every dance.
7. **Dancing:** working. Six styles, three levels plus "Just dance", 1P and 2P, desktop and phone.
8. **Riddles, logic, strategy:** working. See Improvement 2 for the thank-you rewards.
9. **Playtime reminder:** working.
   - On the phone mid-song: 45 min fast-forwarded → Pip freezes the song (pos 2.72 → 2.72) → "Five more minutes" twice → the firm card → "Keep playing". Each time the song carried on, and it ended on the results card and back in the world.
   - Pip's break at the worst moments behaves (above). The e2e reminder tests pass.
10. **Map and pirates:** working.
11. **Fairy:** working.
12. **1 or 2 players:** working. On the phone in 2P, a tap in either half counts only for that player (checked 4 ways).
13. **Bunnies:** working. Cousins dance along; the Bunny Hop is in the finale.
14. **Magic soup:** working. Tick-Tock Tomato shows on the dance setup card.

## Verified

- **Tests:** `npm test` with the project's 2 workers took 2.9 h.
  - It ran alongside the M4, M5 and M8 reviewers' suites and the main checkout's, with the CPU at 100% throughout. A walking test that takes ~6 s in the builder's runs took over a minute.
  - Unit: 193/193.
  - e2e: 212 passed, 8 skipped (all viewport-only; no `.only` or `fixme`), 7 failed.
  - All 7 are load flakes; each passes when re-run on its own:
    - `payoffs.spec.ts:91` (desktop): `pressUntil` pressed E again while Cookie's question was still opening. That answered "Let's dance!" and started the song without the autopilot.
    - `movement.spec.ts:32`, `pirates.spec.ts:82`, `wardrobe.spec.ts:149` (desktop) and `tockwood.spec.ts:6` (phone): walking distance, prompt and dialogue timeouts.
    - `pirates.spec.ts:71`, the full pirate chapter, on both viewports:
      - It passed alone on the phone in 8.0 min, right at its 8-minute limit.
      - On desktop, the first solo try ran out of time while the chapter was still finishing in the page. The second passed in 5.8 min.
      - It takes 3.4–3.9 min in the builder's quieter runs.
      - Both journey tests, which run the same `pirateChapter` flow under a 30-minute limit, passed in my run.
      - **Suggestion:** give it a longer limit, and make `solveJigsaw` wait for each swap. In the full run it clicked back to back and lost one swap.
- **The new tests:** the payoff tests break at the right moments and would fail on the old bug. The phone split-lane test checks each thumb's lanes with taps.
- **Big screen:** at 1920×1080 the score tags and "Cookie: 871" are now readable.
- **Colour-blind and Tick-Tock:** the colour-blind palette carries over to the split phone lanes, and with Tick-Tock Tomato in effect the setup card says so.
- **Tone and originality:**
  - The combo cheers ("Real gone, daddy-o!", "Bravissimo!", "Hop-tastic!") are original.
  - The Bunny Hop, twist, stroll and hand jive are real dances.
  - The hornpipe note is accurate.
  - Nothing is scary or borrowed.
