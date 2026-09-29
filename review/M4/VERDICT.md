# M4 Review — 26f7b25c8c5d039bf8edf4b37f4677db55419f6e (re-review 1)

**Verdict:** PASS

The blocker is truly fixed. Dig → sell to Dr. Quill → buy at Bramble's now works in normal play, and it can't run dry. Top improvement 2 (focus) and the texture leak are fixed too. Improvement 1 (layout) is done on desktop and for the phone's Look tab. On the phone, item names and some colour swatches are still off-screen; that is the first improvement below.

## Previous blocker

**Bramble's shop dead-ended — FIXED.**
- **Normal play, desktop, new game, 20 Tockens:**
  1. Dug all 11 of day 1's spots with real prompts (Biscuit's sniff for the hidden ones).
  2. Walked through the museum door. After the first-meeting talk, Dr. Quill asked "Have you brought any finds for my trading table?"
  3. At the Trading Table: the first Scallop went to the museum for +10 (value + 5), with a clear toast. Sell 1 and Sell all paid the listed values.
  4. Ended at 55 Tockens, walked to Bramble's, and bought the 45-Tocken raincoat: 55 → 10.
- **Income:** about 55–60 Tockens per in-game day once Rocco's gears can be sold (10 spots a day), so the 405-Tocken shop takes roughly a week of play. That's a nice cozy goal.
- **Edge cases, all fine:**
  - Rocco's gears stay off the table until his favour is done, then appear.
  - The old first-fossil gift (+25) and the table don't double-pay.
  - The exhibit case reports what's on show.
  - The table works:
    - by touch on the phone;
    - with Player 2's arrow keys and `/`;
    - with a gamepad.
  - Pip's break arriving while the table is open (his script is still waiting on it):
    - She waits the 60-second cap, then appears over the table.
    - Break → title → Continue works.
    - Quill's table and Bramble both work again afterwards.
- **The new e2e test is meaningful:**
  - Day 1's revealed spots contain no fossil, so its Tocken gain and museum entry can only come from the table.
  - The purchase costs more than 20, so it needs earned Tockens.
  - A broken table would fail it.

## Blockers
- None.

## Top improvements

1. **Phone: show the item's name and the colour swatches without scrolling.** Measured at 667×375 with the new layout:
   - **Name and description:** they moved into the left column under the ↺ 🎲 ↻ row, which puts them 0% on screen in every state:
     - hats;
     - tops;
     - Look;
     - the shop;
     - Biscuit's tab.

     On the phone this is worse than before: "Comfy Hoodie" used to peek out.
   - **Swatches in the shop:** once a tab has a second row (Tops has 6 items, Hats 7), the swatches drop below the fold (0% visible) right when a kid is trying something on.
   - **Turn buttons:** 38×36 px, still clipped by 3 px.
   - **Fix:**
     - On ≤460 px-tall screens, overlay the name as a small pill at the bottom of the preview (the description can go in its `title`), or put it in the empty footer space left of Done.
     - `scrollIntoView({ block: 'nearest' })` the swatch row after a pick.
     - Correct PROGRESS, which says the name and description "sit under the preview"; on the phone they're off-screen.
   - **Desktop is fine:** everything is visible at 1280×720, and all six hairstyles now fit on the phone.
2. **Show donated finds in the museum cases.**
   - The case now says "The display cases are filling up! 2 treasures on show…", but all eight cases and pedestals stay visibly empty.
   - Drawing the donated item's icon (already in `iconUrl`) in the next free case would make the trading table's museum bonus feel real.
   - It's a small taste of spec 3's "the museum fills" before the M10 museum pass.
3. **Put dressing up in the player's path** (carried over; the team logged it as future polish).
   - Offer a look picker on the names screen.
   - Have Bramble compliment a purchase.
   - Have Biscuit do his happy bark-jump for a new hat.
   - Open Player 2's tab when pad 2 opened the pause menu.

**Smaller notes:**
- **Texture race:** `src/world/player.ts:56-60` removes the old sprite sheet a frame later without checking that it hasn't become current again. Two outfit changes in one frame that return to the previous look (X → Y → X) leave the player drawn with `__MISSING`; I reproduced it through the debug hook. Changes 20 ms apart are fine, so hand taps shouldn't hit it. Fix: skip the removal when any player's `textureKey === old`.
- **Trading table focus:** when the last of an item sells, its row disappears and focus drops to nothing (`src/ui/sellScreen.ts:90`). Move focus to the next row's button.
- **Stale screenshot:** `review/M4/wardrobe-biscuit-1p-phone.png` (23:53) predates the commit (23:58). It shows a squashed preview and wrapped turn buttons that don't happen at this code.
- **PROGRESS:** it still says 49 player items; there are 54.

## Fun score

7/10. There is now a real cozy loop: dig with Biscuit, sell to Dr. Quill, dress up at Bramble's.

Biggest thing holding it back: beyond that loop and the village errands there's nothing to do yet (soup, puzzles and the pirate era are ahead). On phones, the wardrobe still hides item names and some colour choices.

## Required features tally

Working 2 · partial 7 · missing 5.

1. **Adventure story** — partial. The opening chapter only.
2. **Village life** — partial.
   - In: neighbours, digging, a working economy (dig → trade → shop), museum donations, interiors, day/night.
   - Missing: decorating.
3. **Time travel** — missing.
4. **Outfits** — partial.
   - The M4 wardrobe and shop are complete and fed by play.
   - Still to come: era items and reactions, dress-the-part puzzles, outfits in the dance and bowling mini-games (M6–M8).
5. **Bowling** — missing.
6. **Corgi** — partial. Biscuit digs, sniffs and dresses up; his puzzle and dance roles come later.
7. **Dancing** — missing.
8. **Riddles, logic and strategy** — missing in play. M5's pure logic and unit tests exist but aren't wired in.
9. **Playtime reminder** — working. Re-verified on the phone in 2P:
   - Nothing at 44.5 minutes, and Pip at 45 with an autosave.
   - Two snoozes, then the firm card, and "Keep playing" works.
   - The late-night nudge at 22:00.
   - Safe over the trading table (above).
10. **Map and pirates** — partial. No pirates or world map yet.
11. **Fairy** — partial.
12. **1 or 2 players** — working for everything built so far:
    - 2P dressing of both players and Biscuit shows on both sprites on the phone after the texture change.
    - Player 2 can trade at Quill's table.
13. **Bunnies** — partial. No rescues yet.
14. **Magic soup** — missing in play (logic only).

## Verified

- **Tests:**
  - `npm test` (PW_WORKERS=2): unit 114/114. e2e: 101 passed and 2 expected conditional skips; exit 0.
  - `wardrobe.spec.ts` ×2 on desktop and phone: 24/24.
- **Keyboard and gamepad focus:**
  - Trying the beanie and then the sun hat now takes 7 key presses, down from 12. Focus stays on the item, swatch, tab or dice you pressed.
  - Gamepad A keeps focus too.
  - The keyboard e2e test now walks with arrow keys and asserts that focus stays.
- **Texture leak:** 60 🎲 rolls leave the texture count flat (99 total, 2 player sheets, down from +60). Identical 2P outfits keep the other player's sheet.
- **Console:** no errors in any session.
- **Docs:** the new DECISIONS lines (economy, gears) drop no requirement.
