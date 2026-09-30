# M10 Review — bdb6f55

**Verdict:** REVISE

The story can now be finished, and the finish is sweet.
- **I played the whole game in one run.** I went from the title screen through the opening and all four eras, rescuing every one of the twelve cousins. Then came the Great Hourglass, the party, the Bunny Hop, the soup, the ending storybook and the credits. It took 24.9 min on desktop solo, with the mini-games on autopilot. The save then says "🏆 Story complete".
- **The Bunny Hop is the most charming screen in the game.** Six friends from the eras watch, six Hopkins cousins in their period outfits hop along, Biscuit bounces, and the callouts shout "Kick, kick!".
- **A break anywhere in the finale is safe.**

Three M10 items fall short:
- The museum can't take anything brought home from history.
- Its display cases show a marble for every find.
- The title screen still has no Biscuit.

## Blockers

1. **Nothing brought home from the eras can go in the Museum of Time.**
   - **Why:**
     - Dr. Quill's trading table only takes shells, fossils and trinkets: `SELLABLE_KINDS = new Set(['shell', 'fossil', 'trinket'])` (`src/ui/sellScreen.ts:13`). `sellItem()` refuses anything else.
     - All 12 era museum pieces are `kind: 'artifact'` (`src/data/items.ts:73-86`).
     - The only other way into the museum is Dr. Quill's first fossil (`src/story/tockwoodNpcs.ts:83`).
   - **So 12 of the catalogue's 21 cards can never fill,** and the Museum of Time can only ever show Tockwood shells and fossils. Three of those twelve can't even be found: nothing in the game hands out or digs up the Ship's Half-Hour Glass, the Soda-Fountain Glass or the Flying-Machine Model.
   - **Played (desktop):**
     1. I carried nine era treasures into the museum: the doubloon, spyglass, scarab, papyrus, blue hippo, vinyl record, Starlight Pin, paintbrush and pigment jar.
     2. I chose "Let's trade!" with Dr. Quill. His table listed only a scallop shell.
     3. Pause → History Notes showed "In the Museum of Time — 2 of 21" (the fern fossil and the shell), followed by twelve era "?" cards.
     4. The nine treasures just sit in the Backpack's Treasures tab, and there is nothing to do with them.
   - **The builder's own screenshot shows the bug.** `review/M10/museum-catalogue-*.png` reads "0 of 21". In `scripts/shots.mjs:1069-1080` the script tries to sell six artifacts; their buttons don't exist, and `if (await btn.count())` skips them silently.
   - **Spec:**
     - §4: History Notes "fill the Tockwood Museum alongside artifacts brought home".
     - §3: "the museum fills".
     - M10: "Museum".
     - The History Notes don't appear in the museum building either. `src/data/notes.ts:3` mentions a "notice board" that the room doesn't have.
   - **No test** covers the catalogue or donating an era treasure.
   - **Fix:**
     - Let the table take `artifact`s: donate the first of each, and let the family sell or keep spares.
     - Give the three missing pieces a source, e.g. the cargo hold, Mabel's counter and Lucia's workshop.
     - Hang the History Notes on a board in the museum.
     - Add a unit test like the wardrobe's "every era piece is handed out somewhere", and an e2e test: an era treasure → Dr. Quill → the catalogue card fills → a case shows it.

2. **The museum's display cases show the same blue marble for every find.**
   - **Why:** `src/scenes/WorldScene.ts:337` passes the item id (e.g. `'shell-conch'`) to `iconCanvas()`. That function expects the icon key (`'conch'`), so it falls back to `DRAW.marble` (`src/art/icons.ts:824`). `iconUrl()` maps id → icon; `iconCanvas()` doesn't.
   - **Played (phone):**
     - I donated nine Tockwood finds: four shells, four fossils and the golden acorn.
     - All eight cases and pedestals show an identical glass marble, which is itself one of the Tockwood trinkets.
   - **The cases are wrong in two more ways:**
     - They stay empty straight after trading. They are only built when the room loads, so the finds appear once you leave and come back in.
     - They show the first eight finds, not "the latest finds" as PROGRESS says.
   - **Fix:**
     - Use `iconCanvas(ITEM_BY_ID.get(item)?.icon ?? item, 64)`.
     - Rebuild the exhibits when the trading table closes.
     - Show the newest eight.

3. **The title screen still has no Biscuit.**
   - **Spec §6:** "A title screen with the clocktower, drifting sand particles, and Biscuit wagging."
     - M10's list includes the title screen.
     - The M0 review already listed "Biscuit wagging on the title" as still to come.
   - **What's there:** `src/scenes/TitleScene.ts` draws the sky, sea, clouds, hill, clocktower and sand. `src/ui/titleMenu.ts` adds the logo and buttons.
   - **Checked:** at 1280×720 and 667×375, 0.6 s and 3.6 s after the title appears, and again after finishing the story. There is no Biscuit.
   - **Fix:** Biscuit's sit and happy frames already exist (`src/art/corgi.ts`). Sit him on the hill by the clocktower with a wagging-tail tween; a bark when he's tapped would be a bonus.

## Top improvements

1. **Stage the finale as the party the words describe.**
   - **On a phone, the welcome shows almost nobody.**
     - The camera stays on the players at the clocktower door.
     - During "The plaza is FULL…" and Marigold's "Three cheers…", the frame holds the giant pot and the top of one cap. Marigold isn't visible while she speaks.
     - On desktop, about six guests are in view.
   - **The soup scene is just as empty.** "Everyone takes a turn stirring the giant pot" plays to a pot with nobody at it.
   - **Clover and the cousins aren't at the party.** Clover (whose soup it is) and Grandma Hopkins speak but aren't on the plaza, and all twelve cousins stay in the meadow warren.
   - **The Bunny Hop shows only half the crowd.**
     - It has 6 of the 14 friends (`src/story/finale.ts:72`) and 6 of the 12 cousins (`src/scenes/DanceScene.ts:352`).
     - Its card says "the whole of history and every Hopkins cousin", and the ending says "all twelve".
     - Spec §3: "every friend from every era, including all the rescued bunnies, comes to Tockwood for one big dance".
   - **Nobody wears a party hat.** "A party hat to go with it!" only adds the hat to the wardrobe.
   - **The ending storybook's friends are generic.** Its page 2 shows five plain bean figures standing in the sea, not the characters the family met in their era clothes.
   - **Fix:**
     - Frame or pan across the crowd for the welcome and the soup. The camera already frames the hourglass's sockets with `world.frameAlso()`.
     - Bring Clover, Grandma and the cousins to the pot.
     - Put the party hats on both players (and Biscuit's party bow) when the soup is served.
     - Give the Bunny Hop a second row so every cousin dances.

2. **Tidy the last ten seconds. This one is cheap.**
   - **Three messages land at once.** After "Back to Tockwood", they overlap: the "For the party" card sits on top of the "Every era is still open…" toast, which sits on top of the gold "The Great Hourglass — complete!" banner. On a phone they cover the top third of the screen. Show one card instead.
   - **The ending's last page, "The End", has a "Begin! ✦" button.** `src/ui/storybook.ts:38` gives every book's last page that label.
   - **A banner hides the hourglass at its big moment.** On a phone, the "✓ Bring all eight Time Sands home…" step banner covers the top of the Great Hourglass during "…the whole Great Hourglass begins to GLOW". That's the moment its crack disappears.

3. **Let the family stir the celebration soup.**
   - The "giant pot of Clover's celebration soup" is four lines of dialogue.
   - The cauldron's stir-to-the-beat already exists, and so does two-spoon stirring for 2P.
   - A short shared stir at the giant pot, with the crowd watching and confetti on the last beat, would give the ending a second thing to *do*.

**Smaller notes:**
- **The Map of Time focuses the first era, even when its sand is already home ("Visit again").**
  - An eager second press of E sends the family back to the pirates instead of to the era that's calling. Focus the calling era.
  - The same thing breaks `travel()` in the tests under load. `pressUntil` presses E again when the map is slow to open, and that press confirms the focused era. See Verified.
- **The last toast says "your friends visit Tockwood often!",** but after the party nine of the fourteen guests never appear in Tockwood again: Cookie, Pepper, Duke, Mabel, Neb, Sesi, Fiorella, Orsola and Beppe (`src/world/maps/tockwood.ts:141`).
- **DECISIONS.md line 74 is stale.** It still describes the old plan: one sand per era, with the dance calling the last four home. Line 117 replaced it, so delete line 74.
- **Most of the review screenshots were staged with debug hooks in states the game can't reach.**
  - The Bunny Hop shots have no bunnies and three watchers; in real play all twelve cousins are home by then, and six friends and six cousins appear.
  - The party shots show "Visit Clover" as the objective.
  - The real finale looks better than its screenshots.

## Fun score

7/10. Biggest thing holding it back: the rewards for collecting and finishing don't land.
- The museum can't show a single thing you brought home from history.
- Most of the finale happens in dialogue boxes, rather than in a party you can see and take part in. On a phone, those boxes play over an almost empty plaza.

The Bunny Hop itself is a lovely final dance.

## Required features tally

Working 14 · partial 0 · missing 0.

1. **Adventure story — working.** Title → opening → four eras → the Great Hourglass → party → Bunny Hop → soup → ending → credits, played in one run. Afterwards every era stays open to visit.
2. **Village life — working.** Neighbours, digging, the garden, decorating (every era's keepsake goes in the cottage), and the warren. The museum can't take era treasures: blockers 1–2.
3. **Time travel — working.** Four eras, all open after the ending ("Visit again").
4. **Outfits — working.** The Cup now also hands out the bowling shirt and letter jacket; the party hat is new.
5. **Bowling — working.** It ran on autopilot in my full run; the suite's bowling tests pass.
6. **Corgi — working.** Biscuit is in every dance, including the Bunny Hop, and he's in the finale's lines.
7. **Dancing — working.** The Bunny Hop works with split lanes for one player on a phone, and side by side in 2P on desktop and phone.
8. **Brain-builders — working.** My full run solves every era's puzzles through their real screens.
9. **Playtime reminder — working.** See Verified.
10. **Map and pirates — working.**
11. **Fairy — working.**
12. **1 or 2 players — working.** The finale works as a pair on desktop and on the phone.
13. **Bunnies — working.** All twelve cousins can be rescued, and six of them dance the Bunny Hop.
14. **Magic soup — working.** Glowbroth, Hopscotch Chowder and Pirate's Gumbo are all brewed and used in the full run.

## Verified

- **Tests.** `npm test` (2 workers) ran for 3.2 h while four other Playwright runs shared the machine (CPU at 98–100% throughout).
  - Unit: 193/193.
  - e2e: 214 passed, 8 skipped (all viewport-only; there is no `.only` or `fixme`), 5 failed.
  - The PWA offline check passed.
  - All of M10's own tests passed on both sizes: the finale, the hourglass-break test, and the audio unit test.
  - The five failures are load or timing failures in older tests:
    - **desktop `journey.spec.ts` and `pirates.spec.ts:71`** fail inside `travel()` the same way. Pip says "Back we go!" or "Everybody hold hands!" when the test expects the Map of Time to stay open. `pressUntil` pressed E a second time because the map took more than 2.5 s to open, and that press confirmed the focused era. I reproduced it by hand: a second E on the Map of Time picks the pirates (see the smaller notes).
    - **desktop `pirates.spec.ts:82`** ran out of its 240 s with "Winding the clocks…" still up.
    - **phone `core.spec.ts:344`**: its "too soon" key press arrived 3.5–6.8 s after Pip's card appeared. I measured this in the page twice. That is well past the card's 1.5 s lock, so the press rightly picked "Say goodnight". It's a wall-clock test; the timing should be taken inside the page.
    - **phone `fifties.spec.ts:6`**: `talkTo('rollo')` focused the lane (`use:lane-play`) instead of Rollo while the map was still loading.
  - **Re-run one at a time, all five pass.**
    - While the other suites were still running, `pirates.spec.ts:71`, `pirates.spec.ts:82` and `core.spec.ts:344` each failed once more, in the same ways.
    - Once the load eased:
      - `journey.spec.ts` passed in 8.1 min (desktop).
      - `pirates.spec.ts:71` passed in 3.9 min and `pirates.spec.ts:82` in 49.6 s (desktop).
      - `fifties.spec.ts:6` passed in 3.3 min and `core.spec.ts:344` in 16.9 s (phone).
    - One earlier `pirates.spec.ts:71` attempt was killed by the builder's process clean-up, so it isn't counted.
  - **Other runs of the same flows passed.** My own full-game run uses the same `tests/e2e/flows.ts`, including the whole pirate chapter, its three cousins and the 1950s chapter, and it passed. The suite's phone journey, played as a pair, passed too.
  - **Two tests are worth hardening.** `travel()` should wait for the Map of Time rather than press E again. `core.spec.ts:344` should time its "too soon" press inside the page.
- **The whole game in one run** (my own Playwright script built on `tests/e2e/flows.ts`, desktop solo):
  1. The title → names → storybook → ferry → Pip → Clover → three neighbours → the first dig.
  2. The pirate chapter, then Skipper, Bosun and Shelly → their sand home.
  3. The 1950s chapter, then Dot and Zippy → their sand home.
  4. Egypt, then Florence, with both sands each → the eighth sand mends the hourglass.
  5. The plaza → the Bunny Hop → the soup → the four ending pages → the credits → free play.

  It took 24.9 min, with no console errors and every era quest finished. The save shows "🏆 Story complete · Tockwood Isle · ⌛ 8 sands · 🐰 12", and the title's clocktower becomes the mended one.
- **The finale in the other three combinations.** I set up the finale state with the hooks, then played it through the real prompts:
  - desktop 2P;
  - phone 1P, with the split lanes (← ↓ on the left, ↑ → on the right);
  - phone 2P, with the hourglass placed by the A button and the dialogue moved on by taps.

  Each time:
  - 14 guests were on the plaza.
  - The Bunny Hop had six friends and six cousins.
  - The party hat was added and `finale:done` was set.

  Afterwards, checked separately:
  - The dance floor offers the Bunny Hop, including after using the ending's Skip button.
  - Every era shows "Visit again" on the Map of Time.
- **Breaks in the finale (desktop):**
  - Pip's reminder in the middle of the Bunny Hop freezes the song (64.18 s → 64.18 s over 2 s), and "Five more minutes" resumes it.
  - Over the ending storybook, Pip waited her 60 s for a calm moment and then asked.
  - "Take a break" → the goodbye → a clean title (only the title scene, no leftover dialogue). The save kept `finale:danced` and the party hat.
  - Continue → the giant pot's "Soup!" → the soup and the ending came back → credits → `finale:done`.
- **The playtime reminder** passes all its suite tests on both sizes: 45 minutes, two snoozes, the firm card, the goodbye, the chosen interval, pausing in the background, and the late-night nudge.
- **The museum:** see blockers 1–2.
- **Audio:**
  - After unlocking audio with a click, `audioState()` showed a song for every place I visited:
    - The title and Tockwood by day, the burrow, and the museum's interior tune.
    - The pirate tune in the Cove, the hold, the isle and the cave.
    - The 1950s tunes: fifties outside, bowling in both alleys, sockhop in the diner.
    - Egypt's tune, including the tomb, and Florence's, including the workshop and studio.
  - Footsteps and the sniff sound play, and Settings' mute and music volume apply.
  - I can't judge how it sounds.
- **Decorating (phone):**
  - "Decorate" appears on the A button just inside the door.
  - I took the pirate chest, ship's wheel, jukebox and globe out of storage and placed them, and the room rebuilt around them.
  - The Egyptian lamp, Golden Carrot Lamp, Trick Shot Trophy and Starlight Cup stayed waiting in storage.
- **Performance:** measured with `fps()` at 667×375 (2×, headless Chromium) once the machine was quiet. This mostly confirms PROGRESS.
  - 58–59 fps in Tockwood, including the party with 17 guests and two players, while walking.
  - 56–58 in Sandy Cove and 60 in Giza.
  - 53–56 in Florence.
  - Maple Street held 56–57, with one dip to 47.
  - One earlier pass read 39–40 in Giza while other runs were starting up.
  - Texture memory grows as PROGRESS says and is never released: 5.6 MP in Tockwood → 9.9 MP at the party in 2P → 17 MP after visiting every era. Letting an era's textures go on leaving it, as PROGRESS suggests, is worth doing before real phones.
- **Build:** `npx tsc --noEmit` is clean.
- **Screens:**
  - The pause menu at the end has every tile the spec lists.
  - The finished slot's text fits on a 667 px phone.
- **Tone and originality:**
  - The finale lines are warm and silly (Duke: "Three-time champion of parties too… now it's four").
  - The History Notes are accurate, for example: the dome finished in 1436, Leonardo's walking lion, pinsetters and pinboys, 45s, pirate articles, and hardtack.
  - The names are original.
