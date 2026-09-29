# M3 Review — 26f7b25 (re-review 1; first review at bbfed4a)

**Verdict:** PASS

All three blockers from the first review are fixed. I verified each one by playing, not just by reading the new tests, and each fix now has a test that would fail if it regressed. The top three improvements from the first review all landed too.

Tockwood is a warm, readable place to start the adventure:
- Pip glows softly in her tower;
- treasure spots are little sparkling mounds;
- Biscuit waits for you at the clocktower door;
- the map works on a phone.

`npm test` is green, and I found no regressions in the reminder, 2P, or the phone layouts.

## Previous blockers

1. **The wild-bunny test couldn't fail — FIXED.**
   - **Code:** `BunnyActor` counts `flees` only in the flee branch (`src/world/actors.ts`), and the `bunnies` hook exposes each bunny's home area.
   - **Test** (`tests/e2e/tockwood.spec.ts`, "scatter only when someone rushes"):
     - It asserts **0 flees after 3.5 s with nobody near**, which is exactly what idle hopping would have failed under the old test.
     - It then asserts more flees after a rush, and a return home measured against each bunny's own area.
   - **By hand:**
     - 8 s idle: 0 flees, even though the bunnies hopped up to 3 tiles.
     - Standing 3.5 tiles away for 6 s: 0 new flees.
     - Walking through the meadow with the keyboard: 16 flees across all 5 bunnies.
   - **Small gap:** the test records the standing-still count but never asserts it, although PROGRESS says it's tested. See the notes below.
2. **Biscuit vanished between the ferry and Pip — FIXED.**
   - **The first review's repro** (22:00 device clock, new game, Pip's late-night nudge mid-"Follow Biscuit", "Say goodnight" → Continue):
     - Biscuit now sits at the clocktower door (30.5, 17.9) and barks when you come near.
     - The same after a plain page reload.
   - **Uninterrupted opening, keyboard only:** Biscuit follows you into the clocktower and is present during and after Pip's whole scene.
   - **New test:** "Biscuit waits by the clocktower after a break…". It would have failed at bbfed4a, where `biscuit()` was `null`.
3. **The local map was unreadable on a phone — FIXED.**
   - Labels, icons, the goal star and markers are now HTML on top of the terrain canvas.
   - **Measured at 667×375:**
     - labels 10.5 px (were 5.7);
     - icons 14 px;
     - player markers 20 px (were about 9);
     - the map itself 395×303 px (the island used to fill only about 230×150).
   - **Close** is fully visible outdoors and indoors, and still is at 568×320.
   - Tapping outside the panel closes it. Desktop labels are 15 px.
   - **New test:** "the map is readable on every screen…" runs on both viewports and would fail on the old canvas-drawn labels.

**Top improvements from the first review — all done:**
- **Pip:** her sprite now has a round glow and whole wings (checked at 2× zoom).
- **Dig spots:**
  - Visible spots are a gold sparkle over a dirt mound, readable on sand and grass.
  - Hidden spots puff dust every 4–5 s (confirmed by sampling frames).
  - Pip's sniffing tip now names Q, the full stop, and B.
- **Phone panels:** Backpack (even after tapping an item), Bunny Tracker and Map all show Close as soon as they open, and a tap outside closes them.
- **Museum display case:** it now acknowledges donations ("2 treasures on show… Found by …").

## Blockers
- None.

## Top improvements

1. **Let players *see* Biscuit and themselves in Pip's scene.**
   - The party stops at the door, which is under the dialogue box on both desktop and phone. So Biscuit's new presence is invisible while Pip says "Good boy, Biscuit!".
   - Walk everyone two steps onto the rug when the scene starts, and have Biscuit bark-jump on his "Woof!".
2. **Polish the map markers.**
   - The goal star covers the "Burrow" label at every size, so it reads "Bu★ow".
   - In 2P, Player 2's marker completely hides Player 1's when they stand together.
   - Nudge the star above the label and fan out overlapping player and Biscuit markers.
3. **Give the rescued bunnies their own voice.**
   - Warren bunnies still speak through the narrator (`Nibbles: "…"`) with no portrait.
   - `renderBunnyPortrait` already exists, and the grandbunnies are the payoff for a whole story thread.

**Notes:**
- **Bunny test gap:** add `expect(calm).toBe(0)` after re-settling Biscuit, so the test backs PROGRESS's "none when someone stands still" claim.
- **Trading-table toasts:** on a phone they overlap the bottom edge of Dr. Quill's panel.
- **Still to come:** `BUNNY_REWARDS` still isn't applied, and players still can't give gifts to neighbours (§5.1). Both are due with M5/M6.

## Fun score

7/10. The opening is now smooth and charming from ferry to portal. Dr. Quill's new trading table turns daily digging into Tockens for Bramble's shop, and the museum fills along the way.

Biggest thing holding it back: once the opening errands are done, the only thing left is the daily dig-and-sell loop. The portal still says "opens in the next chapter", and there's no soup, puzzles or mini-games yet.

## Required features tally

Working 2 · partial 7 · missing 5, judged at 26f7b25.

1. **Adventure story — partial.** The opening chapter is complete and robust to breaks and reloads. The middle and ending are still to come.
2. **Village life — partial.**
   - Present:
     - five neighbours plus Clover and Grandma Hopkins;
     - daily-chat friendship with hearts;
     - Rocco's favour;
     - Quill's donation and trading table;
     - digging;
     - interiors;
     - day/night.
   - Missing: home decorating and gifts from players to neighbours.
3. **Time travel — missing.**
4. **Outfits — partial.** M4's own review judges the wardrobe.
5. **Bowling — missing.**
6. **Corgi — partial.** Biscuit leads, follows, digs, sniffs and now stays with you through the whole opening. His puzzle and dance roles come later.
7. **Dancing — missing.**
8. **Riddles, logic and strategy — missing.** The M5 puzzle logic is in the build but not reachable in play.
9. **Playtime reminder — working.** Re-verified at this commit on desktop 1P and phone 2P:
   - Pip waits until Clover's conversation ends, appears at 45 minutes and autosaves.
   - Two snoozes, then the firm card with "Keep playing".
   - The goodbye names both players, then the title. Continue works and dialogue still works.
   - The late-night nudge fires at 22:00.
10. **Map and pirates — partial.** The local map now works on every screen. No world map or pirates yet.
11. **Fairy — partial.** Pip leads the opening and gives the reminders; hints and portals come later.
12. **1 or 2 players — working.**
    - P2 talks, digs, sniffs and opens doors on the split keyboard and on the phone thumb zones.
    - With the reworked camera, at the phone's tether extremes both players stay on screen: heads stay below the HUD pills and feet above the button band.
13. **Bunnies — partial.** Clover, Grandma, wild bunnies, the warren and the tracker are all in place. Rescues come in M6.
14. **Magic soup — missing.** The soup logic is in the build but not wired into play.

## Verified

- **Tests:**
  - `PW_WORKERS=2 npm test`: unit 114/114; e2e 101 passed, with the same 2 viewport-conditional skips; exit 0; 13.6 min alongside the M4 re-review.
  - No new `skip`, `only` or `fixme`.
- **Phone 2P framing** under the reworked camera, measured at the tether extremes:
  - Vertical: heads at y=73 below the 67-px HUD band, feet at y=294 above the buttons at 300.
  - Horizontal: both players on screen at x=35 and x=632.
- **Trading table** (reached by talking to Dr. Quill on the phone):
  - Selling pays Tockens, and the first spiral shell goes to the museum with a finder's fee.
  - Done is always visible.
  - Clock gears are held back until Rocco's favour is done.
- **P key:** P opens and closes pause.
- **Console:** no console errors in any session.
- **Tone and originality:** no concerns in the new text.
- **Docs:** PROGRESS and DECISIONS describe these changes accurately, and none of them drops a spec requirement.
