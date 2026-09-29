# M6 Re-review — d311889

**Verdict:** REVISE

Both earlier blockers are properly fixed, and the chapter is much better than at 21f88d9:
- The Shoals now have real wind, currents and whirlpools.
- The crew party feels like a party, the Great Hourglass fills up, and the cave is a cave.
- Pip no longer sits on Biscuit.

Two new problems stop a PASS, and both are cheap to fix:
- This commit hides part of the Shoals chart on a phone.
- `npm test` is not reliably green.

## Previous blockers

1. **Lost arrival: fixed.**
   - **Desktop:** one extra E press, 0 to 1100 ms after Pip's last travel line, always gets the arrival (8/8). Steady mashing at 350, 500 and 700 ms also gets it (6/6); before the fix both failed almost every time.
   - **Phone, 2P:** tapping the A-button spot every 500 ms reaches the arrival with no "portal home?" question. The new spawn (9.2/19.3) has no prompt.
   - **The queue works:** I pressed E on the portal ring before the 420 ms arrival timer. The arrival waited under Pip's question (it did not start underneath), then played after "Not yet".
   - The new e2e test passes on both viewports, and would fail on the old code.
2. **Shoals replay: fixed.**
   - With no gumbo, Pause → Puzzle Journal → Swirling Shoals → Tricky opens with calm seas.
   - I sailed it by keyboard in 6 moves; it solved, and the Journal came back.
   - The new test passes on both viewports.

## Blockers

1. **On a phone, the Shoals chart now hides its bottom row: the island on Easy, the ship itself on Medium.**
   - **Cause:** on short screens Pip's first bubble shows the puzzle rules. The new rules text is 5 lines long, so the puzzle body shrinks.
   - **Measurements** (667×375): the scroll area ends at y 254, but the board ends at y 294 (311 in calm seas).
   - **What is hidden at the start:**
     - **Easy** (where adaptive difficulty starts): the Treasure Island goal.
     - **Medium:** the Sunny Marigold herself.
     - **All levels:** "Start over" is half cut off.
   - **The builder's own screenshots show it:** `review/M6/pz-chart-1p-phone.png` and `pz-chart-rough-1p-phone.png` show no ship and only a sliver of row 5.
   - **Scrolling doesn't really help:** only a swipe *beside* the board scrolls it; a swipe on the board sails (I lost a move that way).
   - Finnegan's Medium boat is also half hidden.
   - **Fix:**
     - Keep Pip's first line short on phones, or cap the bubble at 2 lines with "How to play" for the rest.
     - Or size the cells so all 6 rows fit, and scroll the ship into view.
     - Add a phone test that the boat and goal are visible.
2. **`npm test` is red: the hornpipe dance-off test fails about half the time.**
   - **My full run:** 2 failed, 169 passed, 4 skipped; exit 1.
   - **Isolated reruns** (1 worker, repeat 2):
     - The opening-story failure passed 2/2, so it was load.
     - `dance.spec.ts:138` failed again on 1 of 2 runs with `Expected "Talk", Received "Cook"`.
   - **Why:** Cookie wanders ±0.3 tiles about 1 tile from her galley pot (use range 1.3). When she steps left, the test's single teleport spot below her is nearer the pot.
   - **It happens in play too:**
     - Left of Cookie, which is the way you come from, the prompt was "Cook" in 40 of 40 samples.
     - I pressed E on "Talk" and got the pot instead, because she moved in between.
     - The pot never mentions the dance-off, and the dance-off gates the chapter.
   - **Fix:** make the galley pot hand over to Cookie's dance-off until `crew:respect` is set. Make the test re-teleport while polling, as `talkTo` does.

## Top improvements

1. **The Time Sand still can't be seen.**
   - **The orb:** `raiseTimeSand` (WorldScene) only draws its glowing orb if no `fx-sand` texture exists. `fx-sand` is the M0 title-screen grain (`art/textures.ts:52`, a 12×12 gold dot), so the "sand rising out of the chest" is a ~10 px speck.
     - I checked the live object: texture 12×12, scale 1.17, zoom 0.65.
     - On the light cave wall it is practically invisible (see my frames at 150–1700 ms).
   - **The toasts:** after the chest, 6 still stack over both players on the phone: Time Sand, "+40 Tockens", "From the chest: … and 40 Tockens" (said twice), History Note, Map Scrap, and the step tick.
   - **The player** stands in front of the open chest.
   - **PROGRESS.md claims both are fixed.**
   - **Fix:**
     - Use a unique texture key.
     - Make `giveTockens` quiet here.
     - Hold the note and scrap toasts until the sand has flown.
     - Step the players beside the chest.
2. **Make the rough-chart preview explain itself.**
   - The forced, unsolvable first look counts as a failed puzzle: adaptive skill dropped 0.50 → 0.45 when I pressed Leave.
   - The first two hints ("Where will this one send you?", "Plan two moves ahead") suggest the chart can be solved, and the third just resets the board.
   - **Fix:**
     - Don't record the preview.
     - Have Pip say "the whirlpools won't let anyone through — we need Cookie's gumbo".
     - Offer a "We need gumbo!" button.
3. **Fix 2P staging.**
   - Pip picks her side by Biscuit only, so in 2P she hovers over Player 2. In the party (`party-2p-phone.png`) Player 2 is hidden behind her.
   - Coco is brought to 38.2/23.9, right beside the from-isle spawn, so Pip covers her in 1P too.

**Smaller notes:**
- **Arrival edge case:** if the arrival is waiting and the player picks "Yes, home we go!", the cove arrival plays in the clocktower. `here()` in `hooks.ts` doesn't check `world.transitioning`. This is unlikely now that the spawn is clear of the ring.
- **Marigold's gumbo line:** after leaving the rough chart she says "Ask Cookie… she knows the recipe", although Cookie has just told you. The check is "brewed", not "heard".
- **Hourglass:**
  - The "Look" prompt covers the new sand in the bulb.
  - On phones the glowing sockets are above the screen; a short camera pan up would show them.
- **Test gap:** no test checks that the phone Shoals board shows the ship and the goal.

## Fun score

8/10 on desktop, less on a phone. The Shoals are now a real strategy puzzle:
- You see the whirlpools spin you back and learn why you need the gumbo.
- The calm route still needs the wind and a current (Medium: right, up, right, down, right).
- The hornpipe gate, the confetti party and the filling Hourglass give the chapter a proper shape.

Biggest thing holding it back: on the phone the ship or the island is hidden at the start of the Shoals, and the first Time Sand is still never seen.

## Required features tally

Working 10 · partial 3 · missing 1.

1. **Adventure story** — partial. The opening plus a complete pirate chapter; no ending yet.
2. **Village life** — partial. Home decorating is still missing.
3. **Time travel** — partial. One era of four.
4. **Outfits** — working. Dress-the-part, era reactions, Biscuit's pirate hat.
5. **Bowling** — missing.
6. **Corgi** — working. Sniffing, digging and rescues.
7. **Dancing** — working. The hornpipe dance-off is in the chapter ("Just dance" also wins the crew's respect). The dance itself is under M7 review.
8. **Riddles, logic, strategy** — working. The Shoals now have wind, currents and whirlpools.
9. **Playtime reminder** — working. Fast-forwarded on the phone in 2P on deck: the card appeared, "Five more minutes" snoozed.
10. **Map and pirates** — working. Blocker 1 from the first review is fixed.
11. **Fairy** — working.
12. **1 or 2 players** — working. The whole chapter played as a pair on the phone: crew gate, two-spoon gumbo, Tricky jigsaw and chart by touch, party.
13. **Bunnies** — working.
14. **Magic soup** — working. The gumbo now calms whirlpools and is still the key to the Shoals.

## Verified

- **Unit tests:** 139/139.
- **e2e tests:** all pirate tests pass on both viewports, including the two new ones.
- **Desktop, keyboard:**
  1. Arrival
  2. Crew gate
  3. Four map pieces
  4. Jigsaw
  5. The wheel refuses to sail before the dance
  6. Dance-off (Just dance → won)
  7. Cookie's clue
  8. Rough chart (whirlpool spin and Pip's line)
  9. Gumbo
  10. Calm Medium chart in 5 of 8 moves
  11. Riddle with a hint
  12. Gear lock
  13. Treasure
  14. Row back to the party
  15. Portal home
  16. The Hourglass shows 1 glowing socket and sand in the bottom bulb
- **No console errors.**
- **The new History Notes are accurate:** the Golden Age is about the 1650s–1730s, and the sailor's hornpipe includes steps that copy sailors' jobs.
