# M3 Review — bbfed4aead8cb09f586488d595485012a663e943

**Verdict:** REVISE

Tockwood really has come alive, and most of it is lovely:
- the storybook opening;
- Biscuit bounding up the dock and barking you towards town;
- painted interiors;
- golden dusk, lamplight and fireflies;
- meadow bunnies that scatter and hop back;
- a warren of Hopkins cousins in tiny period outfits;
- neighbours with genuinely funny lines.

The whole opening chapter plays through with only the keyboard on desktop, and with only taps and the joystick on a phone, in 1P and 2P, with no console errors. `npm test` is green.

Three things block it:
- a test that can't fail;
- Biscuit vanishing from his own story beat;
- a local map nobody can read on a phone.

## Blockers

### 1. The wild-bunny test passes even if bunnies never scatter

- **The test:** `tests/e2e/tockwood.spec.ts:102-122` asserts that *any* wild bunny moves more than 0.5 tiles within ~4 s of the rush.
- **Why it can't fail:** idle hops alone go up to 0.9 tiles every 0.5–3.7 s (`src/world/actors.ts:545-556`).
- **Control run:** same setup, but instead of rushing at the bunnies the player is teleported 20 tiles away (Biscuit follows).
  - **6 of 6 trials still satisfied the assertion** (max displacement 0.60–0.90 tiles).
  - The "they come back" half also passes trivially when no bunny ever left.
- **The feature itself works:**
  - I recorded bunny positions every frame while running past with the keyboard. One pass gave 5 flee hops (more than 0.85 tiles in 300 ms), with the player 1.9–2.6 tiles away. The stand-still control gave 1.
  - All five bunnies were back inside the meadow 15 s later.
- **Fix:**
  - Expose each bunny's flee state in the `bunnies` debug hook, or check the hop direction.
  - Assert that the rushed bunny hops *away* from the threat by more than 1 tile within about 0.5 s, while a far-away bunny doesn't.
  - For "come back", assert that it was outside the meadow and later returned.

### 2. Biscuit vanishes from "Follow Biscuit to the clocktower" whenever play is interrupted, and he's missing from Pip's scene

- **Cause:**
  - `spawnCompanions()` (`src/scenes/WorldScene.ts:463-465`) only spawns Biscuit once `biscuit:companion` is set.
  - That flag is set at the *end* of Pip's scene (`src/story/opening.ts:148-149`).
  - Meanwhile the arrival script returns as soon as `met:biscuit` is set (`opening.ts:52`).
- **Repro in normal play:**
  1. Start a new game with the device clock at 22:00.
  2. Pip's late-night nudge lands exactly as Biscuit starts leading, because that's the first calm moment.
  3. Choose "Say goodnight" → "Bye for now!" → Continue.
  - Result: the player is alone on the dock, `__game.biscuit()` is `null`, and the HUD still says "Follow Biscuit to the clocktower".
  - A plain page reload during this step does the same.
  - Any family that starts after 9 PM and takes Pip's advice will hit this.
- **Even without an interruption, Biscuit is missing from Pip's scene:**
  - He waits outside the tower door and is absent for the whole scene.
  - Pip says "And Biscuit brought you! Good boy, Biscuit!", and he "Woof!"s from nowhere.
  - The toast then says "Biscuit is your companion now! He follows you everywhere."
  - He only appears once you walk back out.
- **Fix:**
  - Spawn Biscuit whenever `met:biscuit` is set, and restart the walk to the clocktower while `met:pip` is still false.
  - Bring him into the clocktower for Pip's scene.
  - Add e2e tests: reload mid-follow and Biscuit is there and leading; Biscuit is in the room during Pip's scene.

### 3. The local map is unreadable on a phone

This breaks spec §1 ("Text must be readable on a phone") and §5.6 (points of interest on local maps).

- **Cause:** `.map-canvas` uses `object-fit: contain` with `max-height: calc(100vh - 12rem)` (`src/styles/world.css:178-184`).
- **What I measured at 667×375:**
  - The 780×598 canvas is drawn at 0.326 scale into a 564×195 box.
  - Place labels ("Juniper", "Tailor", "Warren"…) come out at about 5.7 CSS px.
  - Icons are about 10 px and the player dot about 9 px.
  - The island takes up only about 230×150 px of the screen.
  - The goal star covers most of the "Burrow" label.
- **Indoors:** the "You are inside: …" line pushes Close completely below the panel's fold. It's only reachable by swiping the panel up.
- **Desktop is fine:** 0.784 scale, labels about 14 px.
- **Fix:**
  - On small screens, crop the render to the island's bounds and give the map the panel's full height, with the legend beside it or hidden.
  - Draw labels and markers at a fixed on-screen size, e.g. as a DOM overlay.
  - Make Close sticky.

## Top improvements

1. **Un-box Pip in the world.**
   - `renderPipSheet()` (`src/art/fairy.ts:201-204`) draws Pip with the default 70-px glow and about 55-px wings into 80-px-wide frames.
   - In the clocktower she sits inside a pale rectangle with her wings sliced off at its edges, and a neighbouring frame's wing tip pokes in.
   - On the phone this is dead centre of the screen during her introduction.
   - The M2 fix only covered her portrait. Pass a glow radius that fits (about 36 or less) and widen the frames to about 130 px. It's a two-line change for the game's most important character.
2. **Make treasure-hunting readable.**
   - Dig sparkles are small pale-yellow stars (`0xfff3a0`, `WorldScene.ts:515-520`) that almost vanish on sand and light grass.
   - Hidden spots give no hint at all.
   - Pip's only sniffing tip says "sniff with the B button" (`opening.ts:143`), but keyboards have no B action: P1 sniffs with Q, P2 with `.`, and nothing on screen says so.
   - Fixes:
     - Add a dark outline or a little dirt mound under each sparkle.
     - Make the tip device-aware ("press Q" / "tap Sniff").
     - Have Biscuit perk up (a wag or a "?" emote) when a hidden spot is within sniffing range.
3. **Let phone players out of tall panels.**
   - The Bunny Tracker's Close is two full swipes below the fold: 750 px of content in a 345-px panel.
   - The Backpack's Close drops below the fold as soon as you tap an item.
   - Backdrop taps close nothing.
   - Make Close sticky like Settings' Done, and allow a backdrop tap to close.

**Smaller notes:**
- **Museum donation:** Dr. Quill takes your first fossil and says "The very first treasure of the new Museum of Time!" (+25 Tockens). Afterwards the display case still says "An empty display case, polished and waiting…". Showing the fossil in the first case, with the players' names on its card as he promised, would pay that moment off.
- **Warren bunny dialogue:** rescued bunnies talk through the narrator (`Nibbles: "…"`) with no portrait. `renderBunnyPortrait` already exists.
- **Map dot colours:** Player 1's dot (`#f29e4c`) and Biscuit's dot (`#e9a15a`) are nearly the same orange.
- **Not wired yet, fine for M3:**
  - `BUNNY_REWARDS` isn't applied anywhere. Wire it up when rescues land in M6.
  - Players can't give gifts to neighbours yet (§5.1, "chatting, gifts, and small favors").
- **Stale bunny list:** `bunnyInteract` (`WorldScene.ts:460`) isn't cleared in `init()`, so stale entries pile up on every visit to Tockwood. Harmless for now.
- **Test title:** the day/night e2e test is titled "…with lamplight", but nothing in it checks lamps or fireflies.

## Fun score

6/10. The first ten minutes are a pleasure. Biggest thing holding it back: after the opening errands there's nothing left to do with what you find. Digging fills a backpack, but nothing can be cooked, displayed or decorated with yet, and the portal only says "opens in the next chapter".

## Required features tally

Working 2 · partial 7 · missing 5, judged at bbfed4a.

1. **Adventure story — partial.**
   - Present: the storybook, the ferry arrival, Biscuit leading, Pip's choice, Clover's plea, and the "A Crack in Time" quest through to Pip opening the portal.
   - Missing: the middle and the ending. Blocker 2 also affects this item.
2. **Village life — partial.**
   - Present:
     - five neighbours plus Clover and Grandma Hopkins, with distinct voices and rotating daily lines;
     - friendship from daily chats, with heart toasts and heart lines;
     - Quill's fossil donation, Rocco's gear favour, and daily gifts from Juniper and Finnegan;
     - digging for shells, fossils and trinkets;
     - five interiors;
     - day/night.
   - Missing: home decorating and gifts from players to neighbours.
3. **Time travel — missing.** The portal ring exists and opens in M6.
4. **Outfits — partial.** M4's wardrobe is in this build; its own review judges it.
5. **Bowling — missing.**
6. **Corgi — partial.**
   - Present: Biscuit follows, leads the opening, digs, sniffs, barks and has 18 frames.
   - Problems: blocker 2. His puzzle and dance roles come later.
7. **Dancing — missing.**
8. **Riddles, logic and strategy — missing** (M5).
9. **Playtime reminder — working.** Verified at this commit on desktop 1P and phone 2P:
   - With Clover's conversation open, Pip waits and appears as soon as it ends (45.2 min).
   - The game autosaves when she appears.
   - "Five more minutes (2 left)" works twice, then the firm "Time for a real break" with Keep playing.
   - "Take a break" gives a goodbye naming both players, then the title. Continue works and dialogue still opens afterwards.
   - The late-night nudge appears at 22:00. It lands right on blocker 2's step.
10. **Map and pirates — partial.**
    - The local Tockwood map works on desktop, with both players, Biscuit, the goal star, revealed dig spots and "You are inside…".
    - It's unreadable on a phone (blocker 3).
    - No world map or pirates yet.
11. **Fairy — partial.** Pip leads the opening and gives the reminders; hints and portals come later. Her world sprite is boxed (improvement 1).
12. **1 or 2 players — working for everything built so far.**
    - P2 talks, digs, sniffs and opens doors with `/` and `.` on the keyboard.
    - P2 does the same with their own thumb zone and A/B buttons on the phone, and P2's A relabels to "Talk"/"Dig".
    - Both players move between rooms together, and the map shows both.
13. **Bunnies — partial.**
    - Present:
      - Clover's story;
      - Grandma Hopkins;
      - five wild bunnies that scatter and return;
      - the warren, where rescued bunnies hop, nap, wave and talk (tested via the debug hook);
      - the Bunny Tracker with hints.
    - Not reachable yet: rescues and rescue rewards (M6).
14. **Magic soup — missing.** The Burrow's cauldron bubbles but is scenery until M5.

## Verified

- **Tests:**
  - `PW_WORKERS=2 npm test`: unit 84/84; e2e 89 passed, 2 conditional skips (the touch test on desktop, the mouse-and-keyboard test on phone), exit 0, 10.0 min.
  - `tockwood.spec.ts` repeated 3× on desktop and phone while other reviews loaded the machine: 42/42 passed, no flakes.
- **Real opening, desktop, keyboard only:**
  - title → names → 4-page storybook → arrival;
  - Biscuit waits and barks when you fall behind;
  - walk to the clocktower → Pip, trying both choice branches → the Burrow and Clover → Rocco, Juniper and Finnegan → first dig at the tutorial spot → Pip "You're ready!" → portal toast.
- **The same opening on the phone**, using taps and the joystick only.
- **Day/night:**
  - The clock runs at about 1 game minute per real second and freezes while paused.
  - Night music switches on its own at about 7:42 PM, and the clock keeps running indoors.
  - Walking to the bed and choosing "Sleep" wakes you at 6:31 AM on day 2, and the save shows day 2.
- **Four in-game days of village life:** friendship grows once per day with heart toasts; Quill's heart-2 line; the donation (+25) and Rocco's gears (+30) both pay out.
- **Tone and originality:**
  - The tone is gentle throughout: the storm is a cartoon lightning bolt and the neighbours are kind and silly.
  - The facts check out: sundials, early one-hand clocks, hollow hedgehog spines, frogs drinking through their skin, and purple/yellow carrots before orange. So do the item notes (trilobites, 45-rpm records, Tuscan "bean-eaters").
  - No franchise names or characters. "Hopkins" comes from the spec itself.
- **Docs:** PROGRESS and DECISIONS match what's in the build. No decision quietly drops a spec requirement: extra neighbours move in later, and gifts and rescues are future work.
