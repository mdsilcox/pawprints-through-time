# M8 Review — a5c3ed5

**Verdict:** REVISE

This is a strong milestone:
- **Bowling is the best mini-game so far.** It uses a real lane simulation. You step, aim and time the power, then steer the spin as the ball rolls. Scoring is proper ten-pin, with a crisp scorecard, bumpers, and five trick shots. Biscuit jumps on strikes, and whoever is waiting cheers.
- **The 1950s chapter is complete.** It has Maple Street, the Starlight Lanes, the Rock-a-Roll Diner, the sock hop, three cousins, the second Time Sand, and Tockwood Lanes and Rosita back home.
- **Home decorating is charming** and works with keys, a mouse and a real finger.
- **The checkpoint playthrough passes in all four combinations** (1P and 2P, desktop and phone).

Three bugs stop a PASS. Two of them can take away something a child has just earned, and the third drops a spec item. All three are cheap to fix.

## Blockers

1. **A won Cup is thrown away if the kids press "Play again" and do worse.** The hornpipe dance-off has the same bug.
   - **Why:** `bowl()` loops on "again" and returns only the last game's outcome (`src/bowling/openBowling.ts`). The Cup (`src/story/fiftiesChapter.ts:161-166`) checks only that last outcome.
   - **Repro (desktop, played):**
     1. Choose Bowl!, then "Let's bowl!", and win (196 to 105; "Hooray! You beat Duke! What a game!").
     2. Press **Play again** on the results card. It sits right beside Done.
     3. Lose the rematch (0 to 87), then press Done.
   - **What you see:** Duke says "Good game! That was close." `cup:won` is unset and `sands` is still `["pirate"]`. The Time Sand they just won is gone, and they have to beat Duke all over again.
   - **The dance-off (same bug):** `dance()` also returns the last outcome.
     - I won Cookie's dance-off (17,043 to 5,113, "You out-danced Cookie!").
     - Then I pressed Dance again and danced nothing.
     - Result: Cookie says "Good try!" and `crew:respect` is unset.
   - **Fix:**
     - Settle the story as soon as a finished game or dance is won. Alternatively, leave "again" off the results card for story challenges, or return the best outcome.
     - Add a test for "win, then play again and lose".

2. **If Player 2 leaves in the middle of a bowling game, their turns can't be played.**
   - **Why:** `BowlScene` reads `input.p[bowler.player]`. After P2 drops out, `input.update()` blanks P2's input every frame, and every gamepad drives P1. P2's bowler can no longer be controlled by keyboard or pad.
   - **Repro (desktop, played):**
     1. Start a 2P game, and let P2 bowl a ball.
     2. Press Esc, choose "Player 2: Leave", then Resume.
   - **What you see:** On "Player 2, Frame 1 · ball 2", pressing E, /, Enter or Space does nothing, and the game waits forever. The lane still says "←/→ … /: that's the spot".
   - **The only ways out:**
     - A mouse swipe on the canvas, which is never mentioned.
     - Re-joining P2.
     - Save & quit, which loses the game. In the Cup this also means no sand.
   - **Spec 5.8:** "Player 2 can join or leave at any time from the pause menu."
   - **Fix:** When a player leaves mid-game, drop their remaining turns, or let the remaining controls bowl them. Add a test.

3. **8 of the 10 1950s outfit pieces can never be obtained, including the spec's own example, the poodle skirt.**
   - **Why:** `src/data/clothes.ts` defines these with `era: 'fifties', source: 'era'`: poodle skirt, letter jacket, bowling shirt, cuffed jeans, cat-eye glasses, pearls, headscarf and soda-jerk cap.
   - **Nothing grants them.** Of the ten 1950s pieces, only saddle shoes (the shoe counter) and roller skates (Mabel) are ever granted. I searched every non-art source file.
   - **The wardrobe lists only owned items,** so the family never even sees them.
   - **Spec 5.2:** "30+ items … many earned in eras (a tricorn hat, a linen shendyt, **a poodle skirt**, a Renaissance cap)."
   - **By comparison,** the pirate chapter hands out eight pieces; the finished 1950s chapter hands out shoes. PROGRESS (M4) counts these pieces among the "54 clothing items".
   - **Fix:** Award them along the chapter. For example:
     - Rollo gives the bowling shirt with the Cup.
     - Rosita gives the poodle skirt and cat-eye glasses at the sock hop.
     - Mabel gives the headscarf, pearls and the soda-jerk cap.
     - Duke gives the letter jacket, as a good sport.
   - Also, the cap's text says "Rocket Diner"; the diner is the Rock-a-Roll Diner.

## Top improvements

1. **Make the Cup winnable for every child, and make losing kind.** The whole chapter hangs on beating Duke in one ten-frame game, and there is no fallback. (The dance-off has "Just dance".)
   - **Simulated results** (40 games per strategy with the game's own lane and scoring code):

     | Strategy | Average score | Result against Duke |
     |---|---|---|
     | Duke himself (with bumpers) | about 103 | — |
     | A child who presses E three times from the default middle spot | about 69 | never wins |
     | A wobbly aimer | about 79 | wins about 10% |
     | Rollo's tip ("stand a little to the right and roll into the 'pocket'") | about 165 | always wins |

   - **In real play:** my keyboard game (step a little right, varied power) lost 102 to 117.
   - **The problem:** you only hear Rollo's tip if you go back and talk to him. After a loss, Duke just says "Rematch?". The card says "so close!" even for 0 to 87.
   - **Fix:**
     - Put the pocket tip on the loss card and/or add a glowing pocket arrow on the lane.
     - Ease Duke a notch after each loss.
     - Only say "so close" when it was.
2. **Give the second Time Sand a real moment.**
   - The sand rising out of the cup is only narrated. `raiseTimeSand` is used for the pirate chest but not here, and the trophy case still shows the sand during the scene.
   - The win then stacks about six overlapping toasts and pop-ups: Time Sand 2 of 8, Starlight Pin, the Starlight Cup card, +40 Tockens, two friendship hearts, and the furniture hint.
   - This is the same complaint as the M6 chest.
   - **Fix:** raise the orb from the trophy case, add `world.celebrate()` confetti, then show one summary line.
3. **Make touch bowling fair.**
   - **No aim preview:** the keyboard gets a dashed aim line; a finger gets no preview.
   - **The aim is twitchy:** the throw angle is 0.09 × the swipe's angle. A thumb swipe 20° off vertical lands about 23 in off line, past the lane edge. At 10° off, the ball arrives about 11 in off, in the 3–6 pins. Kids' swipes are rarely that straight.
   - **Power is measured from touch-down,** so a finger that rests before flicking throws a slow ball.
   - **Fix:**
     - Draw the aim line while the finger moves.
     - Halve the angle sensitivity.
     - Take power from the last ~120 ms of the swipe.
     - Lead the setup card with the touch instructions on phones. It currently opens with "Step with ← →, press E …".

**Smaller notes:**
- **Scoring edge case:** a gutter ball followed by all ten pins shouts **"STRIKE!"** and counts as a strike on the results card.
  - I saw this in play: the sheet shows "- /" and the lane shouts STRIKE!
  - **Why:** `pinsStanding([0])` returns 10, so `before === 10`.
  - In the tenth frame the sheet marks it "X": `scorecard([..18×0, 0, 10, 5])` gives `["-","X","5"]`.
  - Totals are right.
- **The scorecard sits above every menu** (HUD z-index), undimmed:
  - On the phone it covers the top of the pause menu.
  - In 2P against a rival, the 3-row card hides the results card's "Hooray! / You beat Duke!".
  - Hide it, or drop it below, while a menu is open.
- **Leaving a game:** the only way out of a bowling game is Save & quit to the title. "Practice game first" commits the family to ten frames (4.5 min solo against Duke, longer in 2P). Add "Leave the lane" to the pause menu while bowling.
- **P2 joining mid-game:** P1's hint keeps saying "← →", but the arrows now move P2.
- **Outfit changes:** changes made mid-game (pause, then Wardrobe) reach the bowler only in the next game.
- **Decorating and Pip's break:** if Pip's break or Save & quit closes the planner, the arrangement is dropped. The planner's `onClose` doesn't keep `items`, and it also leaves its resize listener behind. Save the layout on close, as the cauldron does for a finished pot.
- **Big screens:** lane text is fixed at 15/20 px, which is tiny at 1920×1080. This is the same as the dance floor.
- **1950s places:**
  - Both alleys (the Starlight Lanes and Tockwood Lanes) have a flat, empty purple band for a back wall. They read as unfinished next to the diner. A neon star, a scoreboard and some pennants would help.
  - The "roller-rink diner" has no rink.
  - Rollo stands in front of Tockwood Lanes' door, so the door prompt is often "Talk".
- **1950s tomatoes (spec 5.10):** they aren't found in the 1950s; tomatoes only come from the cottage garden.
  - Maple Street's only ingredient is the milk truck's bottle: one a day, and Mabel's errand takes it.
  - Sweet Corn (origin 1950s) can't be obtained.
- **Originality nits:** "Strike It Lucky" is the title of a UK TV game show, and "Spin City" is a US sitcom. Rename them to be safe.
- **Test gaps:**
  - The touch test swipes with mouse pointers and never checks swipe power. Real finger touches (CDP) do step and throw correctly.
  - Nothing covers "again" after a story win, P2 leaving mid-game, or the gutter-then-spare mark.

## Fun score

7/10. On desktop the bowling is genuinely fun: pins scatter, you steer the hook, and Biscuit bounces. Decorating the cottage with the jukebox and the Cup is a lovely payoff. The sock hop is the prettiest dance floor yet.

Biggest thing holding it back: the 1950s chapter is thin and gated.
- It has no puzzle.
- Its dress-up rewards are shoes only.
- The sand moment is narrated, not shown.
- Its single gate, beating Duke over ten frames, can wall off a young child. On a phone the swipe-aiming makes this worse.

## Required features tally

Working 12 · partial 2 · missing 0.

1. **Adventure story** — partial. Opening, pirate chapter and 1950s chapter play start to finish; the ending is M10.
2. **Village life** — working. New neighbours Rollo and Rosita, collecting, and home decorating (place, move, turn, store, keepsakes from both eras, Rocco's furniture).
3. **Time travel** — partial. Two of four eras.
4. **Outfits** — working. Wardrobe for both players and Biscuit, and bowling shoes as dress-the-part. But see blocker 3.
5. **Bowling** — working. Keyboard, pad and touch; real scoring; 2P turns; Duke and Rollo; trick shots. But see blockers 1 and 2.
6. **Corgi** — working. Biscuit cheers strikes and spares, and dances at the sock hop.
7. **Dancing** — working. The sock hop, with Rosita leading dances in Tockwood. The dance-off has blocker 1.
8. **Riddles, logic, strategy** — working. There is nothing new in the 1950s.
9. **Playtime reminder** — working, including during bowling (details below).
10. **Map and pirates** — working. Maple Street has a local map with a goal star; the Map of Time shows the 1950s.
11. **Fairy** — working.
12. **1 or 2 players** — working. The full journey passes 2P on desktop and phone. But see blocker 2.
13. **Bunnies** — working. Dot (milk errand), Zippy (catch him on skates) and Poppy (after the sock hop).
14. **Magic soup** — working. Sunbeam Squash also catches Zippy.

## Verified

- **Tests:** `npm test` (2 workers, on a machine running two other reviews) exited 1.
  - Unit: 170/170.
  - e2e: 194 passed, 7 skipped (viewport-specific) and 2 failed, all in 1.8 h. The two failures were desktop `dance.spec.ts:52` (4/10 hits, all "Good") and desktop `smoke.spec.ts:70` (the same-frame tap got through).
  - Both passed on the phone project in the same run.
  - Re-run alone (1 worker, twice each), they passed 4/4. So these are load-sensitive timing tests, not regressions. Still worth hardening:
    - The dance test's presses are judged at the next frame's song position (M7's timing note).
    - The double-tap test assumes one frame is shorter than the 0.3 s debounce.
  - All M8 tests pass: bowling ×5, fifties ×2, journey, decorating ×3.
  - There is no `.only`, and the skips are the old viewport-specific ones.
  - The M8 tests are real: a keyboard throw, a ten-frame card checked against the scorer, the 2P and rival turn order, trick-shot unlocks, the chapter and cousins through the real prompts, and decorating persisting through a reload.
- **The checkpoint, all four combinations:**
  - The builder's journey covers solo desktop and pair phone. Both passed in my run (21.7 min and 11.6 min).
  - I ran the same shared flows (`tests/e2e/flows.ts`) the other way round from a scratch config. Pair desktop passed in 16.0 min; solo phone passed in 18.5 min.
- **Desktop keyboard, played for real:**
  1. Portal and the Map of Time to Maple Street; Pip's arrival.
  2. The "street shoes" gate, then the shoe counter.
  3. A full Cup at normal speed by keyboard: 4.5 min, lost 102 to 117.
  4. The Cup again, on the autopilot but through the real Bowl! prompt: won 158 to 114 and 169 to 93. Then the win cutscene.
  5. Milk truck, Mabel, pantry: Dot rescued.
  6. Mabel's skates (×1.45 speed): Zippy caught.
  7. The sock hop: Poppy rescued.
  8. Jukebox record; portal home; Great Hourglass.
  9. Tockwood Lanes: Rollo, "Just us", "Hello, Head Pin" cleared by keys.
  10. Rosita on the plaza.
  11. The planner shows the Starlight Cup and jukebox in storage.
- **2P keys:** P2's keys do nothing on P1's turn and vice versa. Steering spin works by keys and by pad. Pad 2 drops in with Start, and both pads bowl their own turns.
- **Phone with real finger touches (CDP):**
  - A sideways drag steps the bowler (standX 0 to 5.4).
  - Swipes throw, and curved swipes spin (±1).
  - Once the game knows it's a touch device, the lane reads "Drag to step left or right · swipe up to bowl…".
- **Playtime reminder during bowling (phone):**
  - Pip waits up to 60 s, then appears.
  - "Five more minutes" resumes the game.
  - "Take a break", both over the results card and mid-game, leaves a clean title: only the `title` scene, no scorecard, HUD hidden.
  - Continue returns a walkable world with 4 touch buttons.
- **Decorating:**
  - Opens with the touch A button ("Decorate") by the door.
  - Finger-drag moves a chair; the tray tap works; the "already there" and doorway rules hold.
  - The Decorate tile appears in the pause menu only at home.
- **Scoring:** running totals checked by hand on four full cards. The 14-character name limit keeps a 3-row card on a 667 px phone.
- **Tone and originality:** the History Notes are accurate (rock and roll, pinsetters and pinboys, railway-car diners, 45s, sock hops). Duke is a good sport. The tone is gentle throughout.
