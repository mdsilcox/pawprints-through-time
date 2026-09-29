# M6 Re-review 2 — a5c3ed5

**Verdict:** REVISE

Almost everything from the last verdict is fixed, and the chapter is in good shape:
- Cookie's galley pot now offers the hornpipe dance-off, and the flaky dance-off test is fixed.
- The first rough look at the Shoals is "Just looking": Pip explains why, and leaving costs nothing.
- The Time Sand is a real glowing orb now: about 70 px on a phone, where it used to be a 10 px speck.
- Pip keeps off Player 2, and Marigold's gumbo line is right.

One small blocker is left. On a phone, the chart you actually sail (with gumbo, in calm seas) still runs about 12 px off the bottom. The new test can't see this, because it measures a rough chart that players never get in normal play.

## Previous blockers

1. **Phone Shoals chart: partly fixed.**
   - **Rough seas, opened by the debug hook: fixed.** At 667×375 the whole board fits at all three levels (board 92–294 px, nothing clipped).
   - **Calm seas: not fixed.** This is the chart you sail after drinking the gumbo, and every Puzzle Journal replay.
     - A "🍲 Calm seas…" note appears under Start over. It makes the side column taller than the board and pushes the board down.
     - The board ends at y 311, but the scroll area ends at 299, so 12 px are hidden, including the board's bottom edge.
     - **Easy** (where new players start): the bottom third of the Treasure Island buoy is hidden.
     - **Medium:** the Sunny Marigold starts on the bottom row. Her sail shows, but most of her red hull is hidden.
     - **The note itself** stops at "Calm seas: the whirlpools". The hidden rest, "sail right over them", is the whole point of the gumbo.
     - I measured this through the real wheel after drinking the gumbo, and through the debug opener, at every level.
     - **Other sizes:** at 740×360 (below the spec's minimum, but a very common Android size) 19 px are hidden, and on Medium only the tip of the sail shows. At 844×390 it is 4 px; 896×414 fits.
   - **The first rough look** (the preview at the wheel): Pip's explanation takes 3 lines, so the board is cut by 10 px there too. The buoy (259–292) runs past the scroll edge at 284.
   - **Why the test misses it:**
     - `puzzles.spec.ts:138` opens `marigold-chart` through the debug hook with no gumbo. So do the new `review/M8/pz-shoals-*` screenshots.
     - In normal play, the rough chart only ever appears as the preview, with the long bubble. Replays and the real sail are calm.
     - So the test checks a state no player sees, and passes while every version a player does see is clipped.
   - **I could still sail it:** tapping the pad, I solved calm Medium in 5 moves on the phone. After the first move the ship is fully in view.

2. **`npm test` red because of the hornpipe test: fixed for M6.**
   - **The test:** it now uses `talkTo`, which waits for `npc:cookie` focus. It passed on both viewports in my full run.
   - **In play:** walking east toward the galley, the prompt is "Cook" (the pot) every time. On the phone in 2P it was the pot in 30 of 30 samples.
   - **The pot now hands over to Cookie:** she asks "Here to cook — or here for our HORNPIPE dance-off?" and offers Dance-off! / Just cook / Not now.
     - **Desktop, 1P:** Dance-off! opened the dance-off. I won it, got the confetti party, and afterwards the pot went straight to cooking.
     - **Phone, 2P:** tapping A on the pot gave the same question, and Dance-off! opened the setup.
   - **The whole suite is still red at this commit, but not because of M6:**
     - **Full run:** unit 170/170. e2e: 195 passed, 1 failed, and 7 skipped (the skips are all phone-only or desktop-only tests); exit 1.
     - **The failure:** M8's 1950s chapter test (desktop) failed at its very last step. Rollo wanders about a tile around 47.5/23.4, right in the Tockwood Lanes doorway, so the prompt was "Talk", not "Enter".
     - It passed 2/2 when run alone. It's the same kind of flake as the old Cookie one, and in play Rollo blocks his own door. The M8 review owns it.

## Blockers

1. **On a phone, the calm-seas Shoals chart still runs off the bottom, and the test only checks the rough chart.** The measurements are above.
   - **Fix:**
     - On short screens (`max-height: 460px`), hide `.sa-calm`. Let Pip say the calm-seas line as her first bubble, or show a small "🍲 Calm seas" chip in the header.
     - Shorten Pip's preview line on phones to two lines.
     - Make the phone test drink the gumbo (`drink('pirates-gumbo')`) and check calm and rough seas.
     - Also have the test open the preview through the wheel.

## Top improvements

1. **Clean up the treasure moment, the chapter's payoff.**
   - **Pip covers the sand.** Her new "above" spot parks her right on the chest, in 1P and in 2P. The Time Sand rises out of the chest through her body, then drops back through her to you. I tracked the orb frame by frame, with tweens slowed ×4, and it overlaps her the whole way.
   - **Five toasts land at once when the scene ends:** Time Sand, "From the chest…", History Note, Map Scrap and "✔ Find the treasure!".
     - On a 375 px phone they fill y 54–287, covering both players, the chest and Biscuit.
     - The party ends the same way: the furniture hint, 2 friendship toasts and the Captain's Coat.
   - **Fix:**
     - During cutscenes, keep Pip at the side.
     - Show the note and scrap toasts one at a time, after the sand has flown.

2. **Winning the dance-off from the pot skips Cookie's gumbo secret.**
   - The pot is now how most players reach Cookie, because it takes the prompt from the deck side.
   - After a pot win, `clues` stays empty. The objective still switches to "Brew Pirate's Gumbo in the ship's galley", and its marker points back at the pot, which shows no gumbo clue.
   - You only get the recipe by talking to Cookie herself, or when Marigold at the wheel sends you to her.
   - **Fix:** after a pot win, play the same "Here's the secret…" lines as the chat. This is a few lines of code.

3. **Let phone players see the Great Hourglass fill.**
   - On a phone the glowing sockets are still above the top of the screen.
   - On both viewports the "Look" bubble covers the new sand in the bulb. On desktop the quest toast also covers the sockets for its first 2 s.
   - It's the chapter's last image. **Fix:** a short camera pan up during "One home, seven to go!", and hide the prompt while the ceremony plays.

**Smaller notes:**
- **Pip's "above" spot also lands on whatever you walk up to.** Biscuit trails behind you, so she floats over Pepper's head when you talk to her, and behind the "Map table" prompt. Skip that spot while the player has a focus target.
- **Coco is hidden at the party.** She is still brought to 38.2/23.9. In 1P, Pip covers her. In 2P, Player 2 arrives on her spot (38.3/23.9).
- **The ship covers Pip's break card.** If the playtime reminder appears during the Shoals, the ship is drawn on top of the card's "Break time?" title. `.sa-boat` has `z-index: 2`, and `.screen` doesn't start a new stacking context.
- **The wind chip covers the ship.** On Easy and Tricky the ship starts under the "💨 wind: up" chip, so its sail pokes out of the label. Put the chip above the board.
- **The arrival edge case is still open.** `here()` in `hooks.ts` doesn't check `world.transitioning`. It is unlikely to happen.

## Fun score

8/10 on desktop, 7 on a phone. The chapter now has a clear shape:
- The torn map.
- A hornpipe gate you can reach from Cookie or her pot.
- A rough-chart preview that shows why you need the gumbo.
- A calm route that still needs the wind and a current.
- The riddle door, the gear lock and a real party.

Biggest thing holding it back: the payoff moment. The first Time Sand finally glows, but it rises through Pip and then disappears under five toasts. On phones, the chart you sail is still a little cut off.

## Required features tally

Working 12 · partial 2 · missing 0. Bowling and home decorating arrived with M8 and are under the M8 review; I only smoke-tested them.

1. **Adventure story** — partial. The opening plus the pirate and 1950s chapters; no ending yet (M10).
2. **Village life** — working. Neighbours and collecting, and decorating is now in: I opened the planner in the cottage.
3. **Time travel** — partial. Two of the four eras are playable.
4. **Outfits** — working. The crew gate, sailor's prices and era reactions.
5. **Bowling** — working at this commit. My first keyboard ball knocked down 7 pins.
6. **Corgi** — working.
7. **Dancing** — working. The hornpipe dance-off gates the Shoals.
8. **Riddles, logic, strategy** — working, apart from the phone clip above. The Shoals, riddle door, gear lock and torn-map jigsaw.
9. **Playtime reminder** — working. I fast-forwarded it on the phone in 2P on deck:
   - Gentle card, then "Five more minutes" (2 left).
   - Again over the Shoals chart, which kept its move.
   - Then the firm card and "Take a break", which autosaved.
   - The goodbye screen, then Continue back to the cove.
10. **Map and pirates** — working.
11. **Fairy** — working.
12. **1 or 2 players** — working.
13. **Bunnies** — working.
14. **Magic soup** — working. The gumbo is still the key to the Shoals.

## Verified

- **Tests:** `npm test` as above. All pirate tests, the dance-off test, the phone Shoals test and the start-to-finish journey passed on both viewports.
- **Phone, 667×375, the Shoals through the real wheel:**
  - The preview: "Just looking", Pip's hint repeats her explanation, and after Leave the skill stayed 0.40 → 0.40 with no record.
  - Marigold's "You know Cookie's recipe" line.
  - The calm chart at every level. Finnegan's regatta fits.
  - A touch sail of calm Medium.
  - Also measured at 740×360, 812×375, 844×390 and 896×414.
- **Desktop 1P:** the pot route to the dance-off, then the pot and the wheel afterwards.
- **Phone 2P:** the pot question by touch.
- **Treasure to hourglass** (phone 2P, desktop 1P): the gear lock, the Time Sand orb (it grows from 11 to 70 px on the phone), the chest toasts, the party with Pip clear of Player 2, the portal home and the Great Hourglass.
- **Pip's placement** when walking up to Marigold, the map table and Pepper from below.
- **No console errors** in any session.
