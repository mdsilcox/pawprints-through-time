# M7 Review — a5c3ed5 (re-review 1)

**Verdict:** REVISE

Both earlier blockers are fixed. But checking the fix turned up a worse bug in the same area:
- If Pip's "Take a break" (or "Say goodnight") lands during a story payoff, the save keeps the "done" flag but never gets the prize.
- At the treasure chest and the Starlight Cup, the prize is a Time Sand. That save can never finish the adventure.

## Previous blockers

1. **Leaving mid-dance broke the title screen, and a phone lost its controls. Fixed.**
   - **What changed:**
     - `returnToTitle` now also stops paused and sleeping scenes.
     - The setup and results cards settle when something else closes them.
     - `dance()` only resumes the world if the play session is unchanged.
   - **How I checked:** on the phone (667×375, touch) and on desktop, starting each dance from the plaza floor in normal play (A button or E).
   - **Pip over the results card, after her real 60 s wait → Take a break → Bye for now:**
     - The title shows the clocktower art.
     - The world and dance scenes are shut down, not paused, and the HUD is hidden.
     - **Continue** brings back the place and objective pills, 👥, ⏸, the joystick and A/B.
     - A real joystick drag walks about 7 tiles, and the floor opens again.
   - **Mid-song, three ways out, all clean on both screen sizes:**
     - ⏸ → Save & quit.
     - The late-night "Say goodnight".
     - Pip after her wait → Take a break.
   - **"Five more minutes" mid-song** still freezes the song clock (4.54 → 4.54 s), then carries on to the results.
2. **Pip spoke at the dance floor before the players had met her. Fixed.**
   - I started a real new game on the phone: storybook → ferry → "Follow Biscuit to the clocktower". The only story flag at that point is `met:biscuit`.
   - On the star-marked floor, the hello now comes from the storyteller (italic narration, no portrait).
   - Pip's clocktower scene still plays normally afterwards.
   - Nit: the line says "Biscuit wags his whole back end", but Biscuit is away at the dock leading the way.
   - Nit: no test covers this fix.

## Blockers

1. **Pip's "Take a break" during a story payoff can lose the payoff forever. When the payoff is a Time Sand, the adventure is soft-locked.**
   - **The first way it happens:**
     - Payoff scripts set the progress flag, play the celebration lines, and only then hand out the reward.
     - A break during those lines cancels the script at the next line.
     - The break's own save keeps the flag without the reward.
   - **The M7 fix added a second way:**
     - The results card's `onClose` now resolves `'done'` (`openDance.ts:153`; bowling copies it at `openBowling.ts:162, 231`).
     - So after a break over a story mini-game's results card, the old script carries on after play has ended.
     - Its dialogue box and cutscene letterbox bars appear on the title screen. They can't be tapped away, because the title screen takes the taps; they only go on Continue.
     - The autosave 1.5 s later writes the flag to the slot.
   - **How I verified it:** all by play on desktop (nothing here depends on screen size). I stood in for Pip's 60 s wait by moving `Date.now` forward 61 s. Each time: Take a break → Bye for now → Continue.
     - **Treasure chest (M6):**
       - Break during "The lid swings open…".
       - The save has `chest:treasure-chest` true and `sands: []`.
       - The chest now says "The treasure chest is empty now".
       - The first Time Sand can never be had, so the pirate chapter can't end and 1950s America never opens.
     - **Starlight Cup final (M8):**
       - Break over the results card, or over Rollo's "WE HAVE NEW CHAMPIONS!". Over the results card, that line shows on the title.
       - The save has `cup:won` true, `sands: ["pirate"]`, no Starlight Cup and no Tockens.
       - The lane now only offers "A friendly game", so the 1950s sand can never be won. Tockwood Lanes, Rosita and Florence never come.
     - **Cookie's hornpipe dance-off (M7):**
       - Break over the results card, or over "SQUEAK! What footwork!".
       - The save has `crew:respect` true, but no hornpipe History Note (this is its only source) and no +15 Tockens.
       - After a *lost* dance-off, the title shows Cookie's "Squeak! Good try!" box instead.
     - **Sock Hop (M8):**
       - The save has `sockhop:danced` but no jukebox (the era's keepsake), and Rosita never offers it again.
     - **Crew party (read in the code, not played):**
       - The same order appears at `pirateChapter.ts:153` → `167`.
       - A break there would lose the ship's wheel, the Captain's Coat and `marigold:friend`, which is Marigold's Tockwood visit from spec §4.
   - **This happens in normal play:**
     - Pip waits at most 60 s for a calm moment.
     - The whole script counts as busy: the puzzle or mini-game, its results card and the celebration.
     - So a reminder that falls due in the last minute of the chest's gear lock, Cookie's ~56 s hornpipe or the cup final lands on the payoff.
     - "Take a break" is the big green button, and it has the focus.
     - Breaks mid-song are fine. I checked with the dance-off: it aborts as unfinished and can be retried. From the code, mid-game and mid-puzzle breaks should be fine too.
   - **Fix:**
     1. Hand out the reward and set the flag in one step, before the first `await`. The celebration lines can describe what you already got; alternatively, set the flag last. Places to change:
        - `pirateChapter.ts:397→406` (dance-off), `572→583` (chest), `153→167` (party).
        - `fiftiesChapter.ts:167→176` (cup), `282→290` (sock hop).
        - Check for other `setFlag(…)` → `await cutscene/talk` → reward sequences.
     2. `dance()` and `bowl()` should return `null` if `sessionEpoch()` changed while they were open. Every caller already stops on `!o?.finished`.
     3. `talk`, `ask` and `cutscene` should throw `Cancelled` when `!app.playing`, so nothing can open a dialogue on the title screen.
     4. `returnToTitle` should call `app.autosave.cancel()` after its final save.
     5. Add e2e tests: `toTitle` during each payoff (the results card and the celebration lines) → Continue → the reward is in the save, or the payoff can be replayed.
   - **Why the tests missed it:** the new "leaving play mid-song or at the results card" test opens the dance with the debug `openDance`, so no story script is waiting on it.

## Top improvements

1. **Make the lanes fit fingers on a phone. Unchanged since the last review, and still the biggest fun issue.**
   - **What's wrong:**
     - In 1P, the lanes are four 47 px strips in the left 30% of the screen, all under one thumb, and the right thumb has nothing to do.
     - In 2P, each lane is 41 px.
     - On a phone, the setup card still leads with "Arrow keys or W A S D".
   - **Fix:**
     - In 1P, split the lanes: ←↓ under the left thumb, ↑→ under the right.
     - In 2P, make each player's half of the screen their four tap zones.
     - Word the setup card for touch on a phone.
2. **Judge presses by when they happened. Also unchanged.**
   - A press is still judged at the next frame's song position, and speaker latency is ignored. Phone frame times plus 50–100 ms of audio latency will turn on-time taps into Greats and Goods.
   - Judge key and touch presses at `e.timeStamp` mapped to song time, and subtract `audioCtx.outputLatency`.
   - Make the timing test assert mostly Perfect/Great.
3. **Cheap wording and layout fixes:**
   - A big loss on Easy says "try Easy". Offer "Just dance" or Cookie's tip instead.
   - The 30-combo "Shiver me timbers!" also plays in the Tockwood Jig, and now in the 1950s Sock Hop. Give each style its own cheer.
   - On phones, Player 2's score tag still sits under ⏸ (visible in `review/M8/dance-sockhop-2p-phone.png` too).

**Smaller notes:**
- The pirate era still has 6 History Notes. Spec §4 says 3–5, and DECISIONS.md doesn't log it.
- Still open from the last review:
  - Dance-floor text stays a fixed size on big screens.
  - Every resize adds a stage texture that is never freed.
  - The deck's "furled sail" still looks like a floating disc.
- Test gaps: lane taps on the phone, Tick-Tock Tomato in a dance, and colour-blind lanes.

## Fun score

7/10. The dance-off win now gets confetti and a cheering crew, a crushing loss is kind about it, and holding the d-pad no longer machine-guns the arrows.

Biggest thing holding it back: on a phone (where the family will likely play), one thumb taps four narrow strips in one corner.

## Required features tally

At a5c3ed5, which includes M8: working 12 · partial 2 · missing 0.

1. **Adventure story** — partial. The opening, the pirate chapter and the 1950s chapter are in; the ending is not (M10). The blocker can strand either chapter's Time Sand.
2. **Village life** — working. Neighbours, collecting, the garden, the plaza dance floor, and now home decorating (M8).
3. **Time travel** — partial. Two of four eras.
4. **Outfits** — working. They show on the dance floor.
5. **Bowling** — working (M8). I only drove the cup final on autopilot. See the blocker.
6. **Corgi** — working. Biscuit dances in every dance.
7. **Dancing** — working. See the blocker for the dance-off payoff.
8. **Riddles, logic, strategy** — working.
9. **Playtime reminder** — working, but see the blocker. I ran 45 min → two "Five more minutes" → firm → Keep playing → firm again after 5 min → Take a break → the 2P goodbye → title. Mid-song, it freezes and resumes the dance.
10. **Map and pirates** — working.
11. **Fairy** — working. The previous blocker 2 is fixed.
12. **1 or 2 players** — working. In the 2P phone dance, taps on each player's lanes count for that player, and the scores are separate.
13. **Bunnies** — working.
14. **Magic soup** — working.

## Verified

- **Tests:** `npm test` with 2 workers took 1.8 h, with four other Playwright runs on the machine.
  - Unit: 170/170.
  - e2e: 194 passed, 7 skipped (the usual viewport-only skips; no `.only` or `fixme`), 2 failed.
  - Both failures pass when re-run on their own, so they are load flakes:
    - `core.spec.ts:172` (phone) expects instant text within 300 ms of an un-awaited hook call. That's a wall-clock check; do it inside the page.
    - `pirates.spec.ts:82` (phone): Skipper's "Talk" prompt took more than 8 s after the sniff.
  - The new M7 test ("leaving play mid-song or at the results card") passes on both viewports and would fail on the old bug.
- **2P on the phone:**
  - A real tap on each panel registered for the right player.
  - Timed taps scored P1 6/6 Perfect, and P2 5 Perfect + 1 Great.
  - The results card showed both players.
  - Back in the world, both players' sticks and buttons were there.
- **Cookie's dance-off won as a pair on the phone (Medium):**
  - Confetti, and the "✓ Win the crew's respect" step.
  - The hornpipe note and +15 Tockens, then the gumbo clue.
  - The objective moved to "Brew Pirate's Gumbo".
- **Gamepad:** holding the d-pad ← for 14 s counts as one move, where before every left arrow was hit.
- **Tone and originality:**
  - The Sock Hop's moves (twist, stroll, hand jive) are real 1950s dances.
  - The five 1950s notes are accurate: rock and roll, pinsetters and pinboys, railway-car diners, 45 rpm records, sock hops in socks.
  - Nothing is scary or borrowed.
- **Colour-blind and Tick-Tock:** the colour-blind lanes still switch to the Okabe–Ito colours, and with Tick-Tock Tomato in effect the setup card says so.
- **1920×1080:** the score tag and "Cookie: 866" are still tiny, and the Cookie score floats inside the sail disc.
