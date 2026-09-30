# M8 Review — bdb6f55 (re-review 1)

**Verdict:** REVISE

All three blockers from the first review are fixed, and I checked each one in play. Most of my improvement notes landed too:
- The Cup has a glowing pocket guide and a tip on the loss card, and it says "so close" only when it was.
- The second Time Sand rises out of the trophy case with confetti and one reward card.
- Touch bowling has a live aim line, a gentler slant, and power taken from the end of the swipe.
- Maple Street has a farm stand.

One new blocker stops a PASS. It is a regression from M10's finale, and it is a small fix.

## Previous blockers (all fixed)

1. **"Play again" could throw away a won Cup or dance-off.** Fixed.
   - **The Cup, played on desktop:** I lost 0–115 with gutter balls, pressed Play again, then won 145–93.
     - The win card has only Done.
     - `cup:won` and the second sand were already set before I pressed it.
     - Then came the ceremony and one reward card.
   - **Cookie's dance-off:** I lost 0 to 5,113, pressed Dance again, and won with 17,043.
     - The win card has no "Dance again".
     - `crew:respect` was set before Done.
     - Then Cookie shared the gumbo recipe.
   - **The sock hop:** it has no "Dance again". "Stop dancing" in the pause menu pays nothing, and the sock hop can then be danced again.
2. **If Player 2 left mid-game, their bowling turns couldn't be played.** Fixed.
   - **Desktop:** I used the real pause menu ("Player 2: Leave", then Resume).
     - E bowls Player 2's turns. The lane says "Bowl for Player 2! ← →: step left or right · E: that's the spot".
     - Six turns in a row went through.
   - **Phone:** after Player 2 leaves, a swipe bowls their turn.
   - **New buttons:** "Leave the game" and "Stop dancing" return to a walkable world. On the phone it has its 4 touch buttons.
3. **Most 1950s outfit pieces could never be obtained.** Fixed. I played the chapter through on desktop (1P) and phone (2P), and all ten pieces arrive:
   - cuffed jeans at the shoe counter
   - Dot's headscarf
   - Mabel's soda-jerk cap for Biscuit
   - the bowling shirt and letter jacket with the Cup
   - the poodle skirt, cat-eye glasses and pearls at the sock hop
   - roller skates from Mabel

   The wardrobe lists them all, and the full outfit looks lovely.

## Blockers

1. **Once the first Time Sand is home, the HUD and the local maps stop showing the chapter's next step.** This is a regression from M10.
   - **What you see:**
     - For the whole 1950s chapter, the HUD objective reads "Bring all eight Time Sands home (one from each era's story, and one from each era's three cousins)".
     - That holds on arrival, before the Cup, after the Cup and after the sock hop.
     - The Maple Street map shows no ★, although its legend still lists "★ Goal".
   - **Before:** at a5c3ed5 the HUD walked through the chapter one step at a time, and a star marked each step on the map:
     1. "Follow the sparkle to the Starlight Lanes"
     2. "Borrow bowling shoes — house rules!"
     3. "Win the Starlight Junior Cup against Duke"
     4. "Celebrate at the sock hop in the Rock-a-Roll Diner"
     5. "Bring the Time Sand home to the Great Hourglass"
   - **Why:**
     - The finale quest (`src/story/finale.ts`) is `main: true` and becomes available as soon as `sand:pirate:placed` is set.
     - It is registered before `fifties-sand`, because `story/dancing.ts` imports `finale.ts` and `main.ts` imports `dancing` before `fiftiesChapter`.
     - `currentObjective()` returns the first unfinished main quest, and `mapScreen` draws a star only for that quest.
     - So the same happens in Egypt and Florence, and no side quest reaches the HUD again until the ending.
   - **Workaround:** the chapter's step is still in the Adventure Log, third in the list. Tapping the objective opens it.
   - **Spec 5.6:** it asks for local maps "with … quest markers".
   - **Verified:** I logged `objective` at each step of full chapter runs (desktop 1P, phone 2P) and screenshotted the Map.
   - **Fix:**
     - While an era's chapter quest is in progress, let it win. For example, make the finale quest available only when no chapter quest is active, or give main quests an explicit order.
     - Add a test: once the pirate sand is home, the Maple Street objective is the chapter's step and the map shows its star.

## Top improvements

1. **Let "Play again" count in the Cup, and ease Duke faster.**
   - **The problem:** Duke's easing and the glowing pocket guide only apply on the next visit (Done, then Bowl! again).
     - A child who presses "Play again" after a loss (the card even asks "want a rematch?") faces the same Duke with no guide.
     - In my run, `cup:losses` stayed unset after a loss followed by Play again.
   - **Simulated results** (40 games each, using the game's own lane code, bumpers on). The percentages are how often each kind of child beats Duke:

     | Losses so far | Duke's average | Presses E three times from the middle | Wobbly aimer | Stands on the glowing spot |
     |---|---|---|---|---|
     | 0 | 104 | 0% | 13% | 84% |
     | 2 | 98 | 3% | 22% | 88% |
     | 4 | 87 | 4% | 32% | 98% |

   - **What this shows:** the guide works well. The easing is too gentle to matter on its own.
   - **Fix:**
     - Count every lost game.
     - Show the guide from the very next game.
     - Let Duke drop to about 70 by the third loss.
2. **Give the 1950s a brain-builder.**
   - The chapter still has no riddle, logic or strategy puzzle. The other eras each have several (feature 8: "woven into the adventure").
   - Some ideas:
     - a jukebox song-order pattern puzzle
     - a diner-order logic grid for Mabel
     - unjamming the pinsetter as a sliding-block puzzle
3. **Phone polish on the lanes.**
   - **The pause menu mid-game is too tall.**
     - Once History Notes exist (true in every real game) and "Leave the game" is added, the menu's content is 395 px tall on a 375 px screen.
     - Save and Save & quit sit below the fold. The panel does scroll, but nothing shows that it does.
   - **The scorecard still sits on top of the pause menu's header,** on both phone and desktop.
   - **The pocket guide's "glowing spot"** is a large translucent yellow ellipse drawn over the bowler and ball. Draw it under them, and smaller.

**Smaller notes:**
- **Lane rooms:** the walkable Starlight Lanes and Tockwood Lanes rooms still have a flat purple back wall. Only the bowling view got the scoreboard, neon star and clock.
- **Pop-ups:**
  - Cousin rescues still pile up toasts. Catching Zippy stacked four: "hopping home… (2 of 12)", "New recipe clue", "Clover teaches you Hopscotch Chowder!" and "✓ Catch the speedy cousin on wheels".
  - A "Pip found these in her pocket" toast landed on top of the hourglass ceremony.
- **Touch aim:** a thumb swipe 20° off vertical still lands about 11 in off line at the head pin (it was 23 in). A swipe 10° off lands about 6 in off.
- **Text and dialogue nits:**
  - Duke hands out "Alley Cats letter jackets", but the jacket's description says "A big letter T for Tockwood".
  - Rosita on the plaza picks the dance by the day (on day 1 it's the Jig), so a family can't ask her for the sock hop.
- **Spec 4.3's "roller-rink diner":** it has skaters (Mabel's skates, Zippy) but still no rink. The code comments were reworded instead. This isn't blocking, but a little skating floor would honour the spec.
- **Test gaps:**
  - The touch test still swipes with mouse pointers and checks only spin. I checked power and aim with timed pointer events, and a real finger (CDP) swipe still throws.
  - The "every era piece is earned" unit test only checks that each id appears somewhere in `src/story`.

## Fun score

8/10. The 1950s now feels like a reward chapter:
- a proper dress-up haul
- a real Time Sand moment
- a Cup a child can learn to win
- bowling that works under a thumb

Biggest thing holding it back: once the first sand is home, the game stops telling a family where to go next. A close second is that the chapter still has no brain-builder of its own.

## Required features tally

Working 13 · partial 1 · missing 0.

1. **Adventure story** — working. The ending now exists; the finale test passes on both viewports. It is judged in detail under M10.
2. **Village life** — working. Decorating survives a break, and Rollo no longer blocks the Tockwood Lanes door.
3. **Time travel** — working. There are four eras (Egypt and Florence are judged under M9).
4. **Outfits** — working. The 1950s pieces are earned, and a change made mid-game shows on the lane and the dance floor at once.
5. **Bowling** — working. It plays with keyboard, pad and touch. A won Cup is safe, and Player 2 can leave mid-game.
6. **Corgi** — working.
7. **Dancing** — working. A won dance-off is safe, and "Stop dancing" is in the pause menu.
8. **Riddles, logic, strategy** — working. There is still nothing new in the 1950s.
9. **Playtime reminder** — working (details below).
10. **Map and pirates** — partial. The Map of Time and the local maps work, but after the first sand no era map shows a quest marker (blocker 1).
11. **Fairy** — working.
12. **1 or 2 players** — working. The checkpoint journey passes in all four combinations.
13. **Bunnies** — working.
14. **Magic soup** — working. Maple Street's farm stand sells tomatoes and sweet corn.

## Verified

- **Tests:** `npm test` ran on a machine that was also running four other suites (the M4, M5 and M7 reviews and the builder's performance spec), at 100% CPU and about 5 fps on the lane.
  - Unit: 193/193.
  - End-to-end: 211 passed, 8 skipped (viewport-only), 8 failed, in 3.2 h.
  - **The failures:**
    - desktop: `core.spec.ts:344`, egypt, fifties ×2, journey, pirates
    - phone: journey (30-minute timeout), pirates (8-minute timeout)
  - **Re-run alone, 1 worker, against my own dev server:**
    - desktop: egypt, both fifties tests, journey (12.2 min) and pirates all passed
    - phone: journey passed (8.0 min) and pirates passed (3.6 min)
    - `core.spec.ts:344` failed once more under load, then passed 2 out of 2
  - **`core.spec.ts:344` is load-sensitive, not a regression.**
    - An in-page trace shows a press 0.23 s after Pip's card appears is ignored, as designed.
    - Under load, one keydown handler ran 6 s late, after the 1.5 s lock had already expired.
    - Checking the lock against the key event's own `timeStamp` would make it robust.
  - **The suite is honest:** there is no `.only`, and the skips are the old viewport-only ones.
  - **The new M8 tests would catch the bugs:**
    - the Cup and dance-off win cards have no "again"
    - a break over each win card keeps the prize
    - Player 2 leaving hands their turns to Player 1
    - a gutter ball then all ten is a spare
- **The checkpoint, all four combinations:**
  - solo desktop: the re-run above
  - pair phone: the re-run above
  - pair desktop: the same shared flows from my scratch config, passed in 24.4 min
  - solo phone: the same shared flows from my scratch config, passed in 25.1 min
- **Played, through the real prompts:** the mini-games ran on autopilot.
  - **The whole 1950s chapter, on desktop 1P and phone 2P:**
    - the Cup and the sock hop
    - rescuing Dot, Zippy and Poppy
    - the jukebox record, the trip home and the hourglass
    - Tockwood Lanes with Rollo, including a trick shot
    - Rosita dancing on the plaza
  - The Cup lost then won; Cookie's dance-off lost then won.
  - Player 2 leaving mid-game on desktop and on the phone; "Leave the game" and "Stop dancing".
  - A mid-game outfit change (pause, then Wardrobe) shows on the bowler at once.
  - A gutter ball followed by all ten is shouted "SPARE!" and marked "- /".
  - A table moved in the planner stays moved after Pip's break.
  - Resizing mid-game (1280×720 to 1920×1080 and back) keeps playing, and the lane text grows.
- **Touch bowling on the phone** (timed pointer events):
  - The setup card leads with the touch instructions, and the aim line follows the finger.
  - Swipes 10° and 20° off vertical aim 0.45° and 0.9°.
  - Resting 400 ms, then flicking, throws hard (312). A slow 900 ms push throws gently (170).
  - Curved swipes spin ±1, and a real CDP finger swipe throws.
- **Playtime reminder:**
  - It defaults to 45 minutes.
  - "Five more minutes" works twice, then comes the firmer "Time for a real break", which still offers "Keep playing".
  - It autosaves every time, and the goodbye names both players.
  - The late-night nudge works.
  - **During bowling on the phone:**
    - Pip appears within about 60 s.
    - "Five more minutes" goes straight back to the game.
    - "Take a break", over the results card or mid-game, leaves a clean title.
    - Continue then gives a walkable world with its touch buttons.
- **Tone and originality:** the new lines are gentle, and the 1950s History Notes are unchanged and accurate. The renames ("Platter Palace Records", "Ten-Pin Triumph") avoid the TV-show names.
