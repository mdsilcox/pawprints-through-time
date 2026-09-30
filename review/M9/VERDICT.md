# M9 Review — bdb6f55

**Verdict:** REVISE

Ancient Egypt and Renaissance Florence are complete, charming chapters. I played both through the real prompts: solo on a 1280×720 desktop with the keyboard, and as a pair on a 667×375 phone with real finger taps and drags.

- **Egypt:**
  - Neb has lost the plans, and the Sphinx asks three riddles in a row.
  - The old tomb is pitch dark until you drink Glowbroth, brewed right there in Sesi's pot. When it lights up, it's the best single moment in the game so far.
  - The stones on the ramp, the capstone's Time Sand, and the builders' festival.
  - Three cousins, each found a different way: after the Sphinx, by Biscuit's sniff, and in the dark.
- **Florence:**
  - The Duchess's court dance waits on two marvels. You mend the fresco border, crack the lion's gear lock and put its parts back.
  - The lion roars and its sand rises in view.
  - Twirl, stuck up a column, needs Hopscotch Chowder from Beppe's garden pot. Then comes the court dance.
- **Throughout:**
  - Both soups are real keys, brewable on the spot.
  - The new puzzle levels are proven in unit tests (solvers for the ramp and the lion's grid).
  - Both dances have lovely stages.
  - Ankhi and Lucia come to visit Tockwood afterwards.
  - Pip's break in the middle of the payoffs I tried (the capstone, the festival, the lion) keeps the prize.

One bug stops a PASS. Once the first Time Sand is home, the game stops telling the family where to go next.

## Blockers

1. **After the pirate chapter, the HUD objective and the local map's quest marker point at the finale, never at the chapter you are playing.**
   - **Spec:** 5.6 asks for local maps for each era "with the player's position, points of interest, and quest markers".
   - **Regression:** in M8, Maple Street's steps and goal star worked.
   - **Why:**
     - `currentObjective()` (`src/story/quests.ts`) returns the first main quest, in registration order, that is available and unfinished.
     - M10's `finale` quest is main and becomes available at `sand:pirate:placed` (`src/story/finale.ts`).
     - It is registered before `crack-in-time` and the 1950s, Egypt and Florence chapter quests. The debug `quests()` list shows `…pirate-scraps, finale, crack-in-time, … egypt-sand`.
     - So from the moment the first sand is in the hourglass, the finale's first step is the objective for the rest of the game.
   - **Repro (desktop):** I used a save with the opening's and the pirate chapter's flags set, rather than replaying 20 minutes.
     1. Finish the opening and the pirate chapter, including the sand in the hourglass.
     2. Take the portal to Giza.
   - **What you see:**
     - The HUD reads "⏳ Bring all eight Time Sands home (one from each era's story, and one from each era's three cousins)". It never shows "Find the master builder by the pyramid", "Answer the Sphinx's three riddles" or "Find the lost plans in the dark old tomb (bring a glow!)".
     - Pause → Map shows no ★ anywhere in Giza, because the finale's step points at the clocktower.
     - Florence shows the same objective and no ★. Maple Street shows the same objective.
     - Every `where:` marker in the Egypt and Florence quests is dead code in real play.
     - On a phone, the stale objective fills two lines of the HUD for the rest of the game.
     - Only the Adventure Log still shows the real step, e.g. "The Pyramid Plans ➜ Find the master builder by the pyramid".
   - **Why the tests and screenshots didn't catch it:**
     - No test checks the objective or the ★.
     - The review screenshots are taken from debug saves whose opening is unfinished. That is why their HUD says "Visit Clover at The Bubbling Burrow" in Giza, in the tomb and in Florence.
   - **Fix:**
     - Let the chapter you're in win. For example, prefer the main quest whose `chapter` matches the current map's region, and fall back to `finale` elsewhere. Or register `finale` last.
     - Add a test that checks the objective and the map ★ in Giza after a real pirate chapter.

## Top improvements

1. **Let the family see the capstone go up.** It is Egypt's climax, and it happens off-screen.
   - **What happens now** (captured frame by frame on desktop and phone):
     - The camera stays on the ramp.
     - While Neb says "The capstone is at the top! Our pyramid is FINISHED!", the golden capstone is still visibly sitting on its sled at the bottom. Then it simply vanishes.
     - The new golden tip is drawn only at the apex, which is above the view.
     - `raiseTimeSand` starts above the view too (y 7.3 tiles; the view's top edge is at about 9.5).
   - **Fix:**
     - Pan the camera up to the apex, as the Great Hourglass ceremony already does.
     - Tween the sled up the ramp.
     - Swap to the finished pyramid while it is on screen.
     - Raise the sand from the tip, then pan back.
   - The lion's sand, rising out of its chest in view, shows how good this can look.

2. **Point the Map of Time at the era that's calling.**
   - **The focus lands on the wrong era:**
     - When the map opens, focus lands on the first row, the pirates' "Visit again" (`wm-go-pirate`).
     - An eager second press of E or A at the portal sends the family back to 1715 ("Back we go! Hold on tight...").
     - I reproduced it on desktop. It is also how the builder's own Florence phone test failed in my full run.
   - **On a phone, the new era is hidden:**
     - With three sands home, Florence's row starts below the fold.
     - Its Travel! button (y 322–363) sits under the sticky "Stay home" bar (y 316–367). A finger has to discover that the list scrolls; one drag does bring it up, and the tap then works.
   - **Fix:** scroll the first calling era into view and focus its Travel! button.

3. **Don't let the Sphinx push young players into Tricky.**
   - **Why:** a wrong riddle pick costs nothing ("Ooh, close! Try again"), so a child who guesses through the gauntlet banks three clean solves, at +0.1 skill each.
   - **My fresh game:**
     1. Riddle 1 on Easy: a wrong pick, then the right one.
     2. Riddle 2 on Medium: I left.
     3. Second try: three right answers.
     4. The next puzzle, the ramp, opened on Tricky (13 moves).
   - **Fix:** count a wrong pick like a hint, or score the three riddles as one puzzle for adaptive difficulty.

**Smaller notes**

- **Florence has no food in Pip's History Notes.** Spec 5.10 says: "Real historical foods for each era are shown in Pip's notes."
  - Egypt has the builders' bread, the pirates have hardtack, and the 1950s have the diner.
  - Florence's "bean-eaters" fact appears only in Beppe's chat and the beans' description.
- **Three museum pieces can never be found.** The Flying-Machine Model (Florence), the Ship's Half-Hour Glass and the Soda-Fountain Glass have no dig zone, gift or stall. Their "?" cards stay forever, and the catalogue can't reach 20 of 20.
- **The court dance's card promises** "and the mechanical lion dances too!", but there's no lion on the floor. Putting it in the audience would be an easy, charming fix.
- **History nits** (in dialogue, not in Pip's notes):
  - Florence around 1500 was a republic, and its first duke came in 1532. "Duchess of this palazzo" is a stretch; "Lady Orsola" would be safe.
  - The Sphinx was carved around 2550 BCE, so in 2500 BCE it's odd for it to say it has "been stone for a very, very long time".
- **DECISIONS.md:**
  - Line 74 still describes the old plan (one sand per era, with the finale calling the last four home). This contradicts line 117.
  - The Sphinx decision says "a wrong answer just ends that try", but in play you simply pick again.
  - M9 went in as one commit instead of one per era, as the spec asks. This is logged honestly.

## Fun score

7/10. The lit tomb, the Sphinx who loves riddles, and the brass lion's roar are delightful. Both chapters use soups, Biscuit's nose and the family's clothes, not just puzzles.

Biggest thing holding it back: the chapters' guidance and their biggest payoff don't reach the screen.
- The HUD and the map point at the finale instead of the next step.
- Egypt's capstone, the whole point of the chapter, rises out of view.

## Required features tally

Working 13 · partial 1 · missing 0.

1. **Adventure story:** working.
   - All four chapters play through.
   - The finale test passes; M10 is reviewed separately.
2. **Village life:** working.
   - Ankhi joins the museum and Lucia visits Rocco.
   - The Egyptian lamp and the Renaissance globe are new cottage furniture.
3. **Time travel:** working.
   - All four eras are on the Map of Time.
   - Florence opens after Egypt and the 1950s.
4. **Outfits:** working.
   - Egypt adds the nemes, linen tunic, shendyt, reed sandals and broad collar, plus a gold collar for Biscuit.
   - Florence adds the painter's smock, guild chain, doublet, breeches, Renaissance cap and velvet slippers, plus a lace collar for Biscuit.
   - A unit test checks that every era piece can be earned.
5. **Bowling:** working (the suite passes).
6. **Corgi:** working.
   - Biscuit sniffs out Sandy and Sketch.
   - He dances at the festival and the court dance.
7. **Dancing:** working.
   - The festival and court dances work in 1P and 2P, on desktop and phone.
   - Both join Tockwood's dance floor afterwards.
8. **Riddles, logic, strategy:** working.
   - The Sphinx's riddles: pick from 3 or 5, or type the answer.
   - The ramp (sliding blocks), the fresco (patterns with motifs), the gear lock (code-breaking) and the lion's parts (a logic grid).
9. **Playtime reminder:** working, including in Giza on the phone in 2P (details below).
10. **Map and pirates:** partial.
    - The Map of Time and the era maps (POIs, players) work.
    - The era maps never show a quest marker in real play (blocker 1).
11. **Fairy:** working.
12. **1 or 2 players:** working. Player 2 has their own buttons for talking and stirring, and dances side by side.
13. **Bunnies:** working.
    - Six new cousins, found by exploration, Biscuit's nose, glow and a super-jump.
    - Each era's three cousins bring a Time Sand.
14. **Magic soup:** working.
    - Glowbroth lights the tomb and Hopscotch Chowder reaches Twirl.
    - Both can be brewed on the spot.

## Verified

**Tests**
- **Result:** `npm test` ran unit 193/193. E2E: 215 passed, 8 skipped (the old viewport-specific skips) and 4 failed, in 3.1 h with 2 workers on a machine shared with other reviews and my own play scripts.
- **The four failures:** each passed when re-run alone with 1 worker.
  - `core.spec.ts:344`, desktop and phone (22.6 s each): the "too soon" key press landed after the reminder card's 1.5 s lock had run out.
  - `pirates.spec.ts:71`, desktop: 4.7 min alone, against its 8-min timeout under load.
  - `florence.spec.ts`, phone: 3.2 min alone. Under load it failed at the Map of Time's double press (improvement 2).
- **The M9 tests are real:**
  - Both chapters run end to end through the real prompts and screens: solo on desktop, a pair on the phone.
  - They check flags, sands, keepsakes, outfits and finished quests.
  - Unit tests prove:
    - the riddles are unambiguous;
    - each ramp board is solvable in exactly its stated moves;
    - each fresco answer continues its pattern;
    - each lion grid has one solution.
  - There is no `.only`.
- **Gaps:** nothing checks the objective or the ★ (blocker 1), and nothing covers a break during the M9 payoffs. I checked the payoffs by hand (below).

**Egypt, desktop, solo**
- I went to the tomb and the Sphinx before meeting Neb.
- At the Sphinx:
  - a wrong pick ("Ooh, close! Try again");
  - leaving on riddle 2;
  - a fresh set of three riddles on the second try.
- The dark tomb without soup:
  - The stand says "You bump into a stone stand in the dark".
  - Lotus is only a voice in the dark.
  - Pip gives the Glowbroth clue.
- I brewed at Sesi's stall and pot. With the glow, the tomb lit up, and I got the hieroglyphs note, the plans and Lotus.
- Nibbles was between the Sphinx's paws. I took the plans to Neb.
- The ramp, solved by mouse drags in 13 moves (Tricky's best).
- The capstone scene and the festival.
- Sandy, found with Biscuit's sniff, then the cousins' sand.
- Home: two sockets filled, and Ankhi was in the museum.

**Egypt, phone, two players, real touches**
- Player 2 started the Sphinx conversation with their own A button.
- Both players stirred with their own buttons to make Glowbroth.
- The Medium ramp, solved by finger drags in 11 moves (its best).
- The festival, danced side by side.

**Florence, desktop, solo**
- The dance floor turns you away until the marvels work.
- The fresco: a wrong tile first, then the rest.
- The gear lock: cracked by reading the stars, in 5 guesses on Medium.
- The lion grid, with two parts swapped:
  - both ticks got the "?" badge;
  - Pip said "one clue isn't happy yet".
- The lion's sand rises in view.
- Twirl refused me without soup, then I reached him after Beppe's chowder, and the cousins' sand followed.
- The court dance, then home with both sands, and Lucia arrived.

**Other checks**
- **Phone layouts at Tricky:** all five M9 puzzles fit 667×375. I finished the Tricky lion grid with finger taps.
- **Reachability:**
  - A walk-grid search from each portal reaches every M9 person, pot, stall, door, dance floor and cousin.
  - I walked out of the workshop, studio and tomb with the keys.
- **Breaks:**
  - I took Pip's break in the middle of the capstone scene, over the festival's results card, and in the middle of the lion scene. Each one kept its prize.
  - Nothing turned up over the title, and the ramp was no longer offered after Continue.
- **Playtime reminder, Giza, phone, 2P:**
  - I fast-forwarded the timer during the Sphinx's riddles.
  - Pip waited for a calm moment, then appeared after the gauntlet, inside her 60 s.
  - I chose "Five more minutes (2 left)". Five minutes later she returned ("Those five minutes flew by like a sparrow!", 1 left).
- **History Notes:** five per era, all accurate.
  - Egypt: paid builders who ate bread, onions, lentils and radishes; the Sphinx carved from the bedrock; hieroglyphs; papyrus.
  - Florence: Brunelleschi's 1436 dome; fresco; Leonardo's walking lion; the florin.
- **Tone and originality:**
  - The dark tomb is cozy, not scary: Pip, soft glows and a squeaky cousin.
  - The names and art are original.
