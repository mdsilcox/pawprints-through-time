# M7 Review — d311889

**Verdict:** REVISE

The dance mini-game itself is good:
- Arrows fall on the song's own clock, and there's a count-in ("Ready? 3, 2, 1, Dance!").
- Everyone dances in their real outfits. Biscuit bounces and leaps on combos, the neighbours watch, and rescued cousins hop along.
- It has three levels plus a genuine no-fail "Just dance".
- Two players each get their own lanes and their own scores.
- The hornpipe dance-off sits exactly where the story needs it (map whole → dance with Cookie → her gumbo secret → sail).

I played it by keyboard, touch, gamepad and in 2P, and it all works while you stay on the dance floor. Two problems appear when you leave or arrive at the wrong moment.

## Blockers

1. **Pip's "Take a break" (or "Save & quit") during a dance breaks the title screen. If it happens over the results card, a phone loses all its touch controls.**
   - **Why it happens:**
     - `dance()` pauses the world scene (`src/dance/openDance.ts:176`).
     - `returnToTitle` stops only *running* scenes (`src/flow.ts:46`). Phaser's `getScenes(true)` skips paused ones, so the paused world survives.
     - The results card is pushed with only `onBack` (`openDance.ts:144`). `ui.closeAll()` → `pop()` only calls `onClose` (`src/ui/ui.ts:110-125`), so the card's promise never settles.
     - That means `dance()`'s `finally` (`hud.setDancing(false)`, resume world) never runs.
   - **Over the results card, phone (667×375, touch):**
     - Finish any dance on the plaza floor.
     - While the results card is up, Pip appears (I used `triggerReminder`) → Take a break → Bye for now.
     - The title shows the frozen plaza and the in-game pause button instead of the clocktower title art.
     - After **Continue**, the HUD keeps `class="hud dancing"`. There is no joystick and no A/B buttons (`[data-testid^=touch-]` → none), no location/objective pills and no 👥 button.
     - The players cannot move at all until the page is reloaded.
     - On desktop the same run leaves the pills and 👥 hidden until another dance finishes.
   - **Mid-song:**
     - Pip mid-song → Take a break, or ⏸ → Save & quit.
     - `finally` does run here, and it *resumes* the world behind the title: `scenes()` = `["title","world"]`.
     - The live plaza, the player, Biscuit and the full HUD (time pill, objective pill, 👥, ⏸) all sit over the title logo.
   - **This happens in normal play:**
     - Pip gives up waiting after 60 s.
     - The hornpipe plus count-in lasts about 56 s, and the results card still counts as busy (the story script is awaiting it).
     - So a reminder that falls due as a dance starts lands mid-song or on the results card.
     - The late-night "Say goodnight" nudge takes the same path.
   - **Fix:**
     - Give the setup and results cards an `onClose` that settles their promise.
     - Stop paused scenes in `returnToTitle`.
     - Only resume the world in `finally` while `app.playing`.
     - Add e2e tests for "Save & quit mid-song" and "Pip's break over the results card → Continue shows touch controls on the phone".

2. **Pip talks at the dance floor before the players have met her.**
   - **Repro:**
     1. Start a new game with the opening.
     2. After the ferry, while the objective is "Follow Biscuit to the clocktower" (flags: only `met:biscuit`), step onto the star-marked stage in the plaza.
     3. "Dance!" appears. Press E.
   - **What you see:** Pip's portrait says "Tockwood's dance floor! On warm evenings the whole village dances here." That spoils her introduction at the Great Hourglass a minute later.
   - **The cause:** `src/story/dancing.ts:22` uses `talk('pip', …)` with no `met:pip` check. The Riddle Stone next to it uses the narrator.
   - **Fix:** use the narrator or Biscuit for the first-time lines before `met:pip`, or open the floor after Pip's scene. The Jig is still "there from the start" of real play.

## Top improvements

1. **Make the lanes fit fingers on a phone.**
   - In 1P, all four lanes are 47 px strips squeezed into the left 30% of a 667 px screen.
     - One thumb has to hit four adjacent strips.
     - The right thumb has nothing to do.
     - Taps outside the panel are ignored.
   - In 2P each lane is 41 px.
   - **Fix:**
     - On touch in 1P, split the lanes: ←↓ under the left thumb, ↑→ under the right, dancers in the middle.
     - In 2P, make each player's whole half of the screen their four tap zones.
     - Say so on the setup card: on a phone it currently leads with "W A S D · arrow keys".
2. **Make timing feel right on real devices.**
   - A press is judged at the *next frame's* song position, not when it happened, and audio output latency is ignored.
   - At phone frame rates plus 50–100 ms speaker latency, on-time taps will score Great/Good.
   - **Fix:** judge with `e.timeStamp` mapped to song time, and subtract `audioCtx.outputLatency`.
   - **The e2e timing test is lenient:** "≥8 of 10 hits" counts Good (up to 0.18–0.22 s off), so an offset bug of about 150 ms would still pass. Assert mostly Perfect/Great instead.
3. **Make winning (and losing) the dance-off feel like a moment.**
   - **On a win:** after "You out-danced Cookie!" there are two dialogue lines in the world. Reuse the M6 deck party instead (crew cheering, confetti, dance-cheer poses).
   - **On a loss:**
     - 0 points against 5,113 still says "So close!".
     - On Easy, a child who is consistently a bit early and misses 1 arrow in 5 loses (3,791 vs 5,113).
     - Say "Cookie's quick! Try Easy or Just dance", or lower Easy Cookie a little.

**Smaller notes:**
- **2P phone:** Player 2's score tag is partly under the ⏸ button ("Player 2 · 1,230 ×" is cut off).
- **Large screens:** dance-floor text is fixed at 15/22 px. On 1920×1080 the score tags and "Cookie: 559" are tiny next to the huge lanes. Scale the text with the stage height.
- **Gamepad:** holding the d-pad auto-repeats (the menu repeat, every 115 ms). Holding ← for a whole song hit all 9 left arrows (139 "moves"). Use edge presses only while dancing.
- **History Notes:** the pirate era now has 6 notes; spec §4 says 3–5 per era. Merge one, or log a decision.
- **Wording:** the "Shiver me timbers!" 30-combo callout also plays in the Tockwood Jig.
- **Textures:** every resize adds a new full-screen stage texture that is never freed.
- **Deck art:** the deck's "furled sail" reads as a floating white disc.
- **Test gaps:** nothing covers lane *taps* on the phone, leaving mid-dance (where blocker 1 lives), Tick-Tock in a dance, or colour-blind lanes.
- **Flaky test:** `core.spec.ts:344` ("press too soon") failed once in the full run under load. It passed 4/4 on its own. Its "too soon" press relies on a round trip under 1.5 s.

## Fun score

7/10. The dance floor is the most charming screen so far:
- the sunset deck and the lantern-lit plaza;
- the crew and neighbours watching;
- callouts like "Haul the rope!";
- Biscuit bouncing in his tiny tricorn.

Biggest thing holding it back: on a phone (where the family will likely play) you tap four narrow strips in one corner with one thumb. The dancers only swap between a few poses, and the songs are one 8-bar tune looped 2–3 times.

## Required features tally

Working 10 · partial 3 · missing 1.

1. **Adventure story** — partial. The opening plus a complete pirate chapter, now with the dance-off; no ending yet.
2. **Village life** — partial. Neighbours, collecting, the garden and the new plaza dance floor; no home decorating yet.
3. **Time travel** — partial. One of four eras.
4. **Outfits** — working. They now show on the dance floor: tricorn, coat and parrot; bandana and eye patch; Biscuit's Tiny Pirate Hat.
5. **Bowling** — missing (M8).
6. **Corgi** — working. Biscuit dances in every dance and leaps on combos.
7. **Dancing** — working, but see blocker 1: the hornpipe dance-off and the plaza Jig/Hornpipe, Easy/Medium/Tricky plus Just dance, and 2P side by side.
8. **Riddles, logic, strategy** — working.
9. **Playtime reminder** — working in the world, and mid-dance "Five more minutes" freezes and resumes the song correctly. "Take a break" during a dance is broken (blocker 1).
10. **Map and pirates** — working. The dance step has an objective and a map star at Cookie.
11. **Fairy** — working, but blocker 2 spoils her introduction.
12. **1 or 2 players** — working. Separate lanes and scores; in the dance-off either player can win.
13. **Bunnies** — working. Rescued cousins hop along on the plaza floor.
14. **Magic soup** — working. Tick-Tock Tomato widens the dance timing.

## Verified

- **Tests:** `npm test` (PW_WORKERS=2) took 48 min.
  - Unit: 139/139.
  - e2e: 170 passed, 4 skipped (the same viewport-specific skips as before), 1 failed (the flaky reminder test above, 4/4 green when re-run alone).
  - There is no `.only` or `fixme`.
  - The M7 tests are real: in-page key timing, P2-only scoring, the pause freeze, and the dance-off lost then won.
- **Desktop keyboard:**
  1. Walked onto the floor; the "Dance!" prompt appeared, then Pip's hello.
  2. The setup card works by keyboard: focus starts on Let's dance, arrows move between the level buttons.
  3. Judged hits, the results card, then back to the world with music and walking.
  4. Story flow:
     - The jigsaw → Marigold's new hornpipe lines → the objective and map star.
     - The wheel refuses to sail, and Marigold's line changes.
     - Cookie's dance-off lost on Easy (0 vs 5,113), then won on Medium (35,025 vs 16,812).
     - Then the cheers, +15 Tockens, the hornpipe History Note (accurate), the gumbo clue, and the objective moves to "Brew Pirate's Gumbo".
  5. Played the same flow as a pair on the phone.
- **2P, only Player 2 dancing:** P1 scored 0 and P2 32,441, and the dance-off was won.
- **Phone touch:**
  - Real taps on each lane register for the right player in 1P and 2P.
  - Taps between the panels do nothing.
  - The canvas is the top element at every lane point.
- **Gamepad:** d-pad taps scored 18 Perfect and 6 Great out of 24; pad A closes the results card.
- **Pause and Pip mid-dance:** the pause menu freezes the song (4.75 s → 4.75 s). Pip mid-song freezes it too, and "Five more minutes" resumes to a full combo.
- **Tick-Tock Tomato:** pressing about 0.2 s late on Medium gave 7/16 hits without the soup and 16/16 with it. The card mentions it, and the effect doesn't drain while dancing.
- **Colour-blind:** the lanes switch to the Okabe–Ito palette and the stars turn orange.
- **Plaza after the chapter:** it offers both dances.
- **Other checks, no errors:** rotating the phone mid-dance, P2 joining from the pause menu mid-dance, and opening the Wardrobe mid-dance.
- **Tone and originality:**
  - The songs have original melodies.
  - The characters are original.
  - The tone is gentle; losing gets "Try again whenever you like".
