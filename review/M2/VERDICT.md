# M2 Review — e273ba8169ad7c332d44627a8788984252d80267

**Verdict:** REVISE

This commit also contains M3. I judged M2's systems (dialogue, quests/flags, saves, pause, settings, playtime reminder) and everything before them; M3 content is only noted where it touches those systems.

On their own the M2 systems are good:
- The dialogue box is warm and readable on a 375-px-tall phone, with portraits, voice blips, tap-to-skip, and choices either player can answer.
- Pip's reminder is charming: she flutters in over a starry backdrop and says a gentle goodbye with break ideas.
- The session timer is well designed and well unit-tested.

But following Pip's advice at the wrong moment freezes the game, and `npm test` is red every night after 9 PM.

## Blockers

### 1. Taking Pip's break while any dialogue is open breaks dialogue for the rest of the session. An evening new game freezes on the dock.

- **Where:**
  - `returnToTitle()` (`src/flow.ts:36-45`) runs `ui.closeAll()` + `resetStory()`, but never resets the `DialogueBox` singleton (`src/ui/dialogue.ts`).
  - The popped dialogue screen has no `onClose`, so `dialogue.screen` stays set.
  - The interrupted `talk()` never reaches its `finally`, so neither `close()` nor `depth--` runs.
  - Every later `open()` returns early (`dialogue.ts:65`). New lines are typed into a detached element and their promise never resolves.
  - `run()` in `src/story/hooks.ts:43-53` then keeps `busy = true` forever, and a `cutscene` screen keeps blocking movement.
  - `reminder.check()` (`src/ui/reminder.ts:59-70`) shows the card every second regardless of what is on screen, so the natural timer hits this exactly like the debug fast-forward does.
- **Repro A** (desktop, late-night nudge switched off so only the 45-minute reminder is involved):
  1. Read the plaza sign.
  2. While it is open, Pip's 45-minute reminder arrives (`triggerReminder`).
  3. Choose **Take a break** → **Bye for now!** → **Continue**.
  - Result:
    - Reading the sign again shows nothing, though the line is logged in `dialogueLines`.
    - Talking to Rocco shows nothing, and after that every sign, NPC and door is dead because `storyBusy()` is stuck.
    - Walking still works.
    - Starting a **new game in slot 2** without reloading doesn't help: the arrival cutscene runs invisibly, the UI stack is stuck at `['cutscene']`, and the player can't move (0.00 tiles).
- **Repro B** (the default path for any family starting after 9 PM — i.e. tonight):
  1. New Game → names → storybook.
  2. Within about 0.5 s of the world appearing, the late-night card lands on top of the ferry-arrival narration.
  3. A keyboard player mashing **E**: E picks "Say goodnight" (autofocused) → E returns to the title → E presses Continue.
  - Result: the arrival replays with an invisible dialogue, the UI stays `['cutscene']`, and the player can't move 10 s later (screenshot shows only letterbox bars on the dock).
  - The phone behaves the same when tapping "Say goodnight" → Continue.
  - Only a page reload recovers. For an installed PWA, that means force-closing the app.
- **Input goes to the hidden dialogue too:**
  - If Pip's card is pushed first and a story line arrives afterwards (a cutscene resuming after a `wait()`), the dialogue becomes `ui.top` (`src/ui/ui.ts:86-99`) even though it is drawn *under* Pip's full-screen card.
  - E, Enter and pad A then advance invisible story lines. In my test, two presses skipped "Line two/three" and closed the box; the next E chose "Take a break" without the player ever choosing it.
  - I saw both orderings during the evening arrival.
- **Fix:**
  - On `returnToTitle` / `switchToWorld`, fully reset dialogue: pop it, null the screen, set `depth = 0`, and settle pending line and choice promises.
  - Cancel running story scripts, e.g. with a session token checked after each `await`, or make `wait`/`talk` reject once the session ends.
  - While Pip's card is visible it must own input — or don't show it while a dialogue, cutscene or storybook is open (see improvement 1).
  - Add e2e tests for both repros: after the break, Continue, then the sign dialogue is visible and the arrival completes.

### 2. `npm test` fails whenever it runs between 9 PM and 5 AM.

- **What I saw:**
  - My run started at 20:59 CDT. Unit: 73/73 pass. E2E: **28 passed, 33 failed, 2 skipped, exit 1**.
  - All 33 failure snapshots show the "It's getting late" card. The late-night nudge covers the world about 1 s into every test.
- **Control run:** I ran the unchanged e2e suite with only the browser timezone forced to daytime (my own scratch config, `timezoneId: 'Asia/Tokyo'`). Result: 60 passed, 2 skipped, 1 failed (an M3 flake, see notes).
- **Why it blocks:** this is an overnight build, so every pre-commit run until 5 AM will be red. `scripts/shots.mjs` will also capture the nudge in review screenshots.
- **Fix:**
  - Make the device clock injectable from tests. `reminder.clock` already exists (`src/ui/reminder.ts:37`); expose a hook for it, or set `lateNightNudge: false` in `bootToTitle`/`startGame` and in `shots.mjs`.
  - Make the late-night test force 9:30 PM explicitly. Alternatively, pin `timezoneId`/`page.clock` in `playwright.config.ts`.

### 3. Two M2 tests can't fail.

- **Manual save** (`tests/e2e/core.spec.ts:111-120`):
  - `expect(before).toBeGreaterThanOrEqual(0)` is always true, and `slots[0].exists` was already true from `newGame`. Only the toast is really checked, so a Save button that wrote nothing would still pass.
  - (Save does work: I checked by hand that a `give('shell', 5)` wasn't in IndexedDB before Save and was after.)
  - Fix: assert that `saves` increased and that a just-changed value is in the stored slot.
- **Pause-menu timer test** (`tests/unit/sessionTimer.test.ts:56-60`, "keeps counting while the in-game pause menu is open"):
  - It never touches pause; it is the 45-minute test again. The spec requires testing the timer "across pause".
  - Fix: add an e2e check — open Pause → Settings, let time pass, and assert Pip appears on top and hands control back to Settings. I checked that this works by hand.

## Top improvements

1. **Let Pip wait for a calm moment.**
   - Queue the 45-minute reminder and the late-night nudge until no dialogue, cutscene or storybook is running (cap the wait at about 60 s).
   - Ignore input on her card for about 1 s, so a child mashing E through dialogue can't pick "Take a break" or "Say goodnight" without reading it.
   - Why: in the evening the card lands on top of the opening arrival, so the first story beat a family sees is Pip telling them to stop. Once blocker 1 is fixed this is small, and it makes the reminder feel like part of the story instead of an interruption.
2. **Make quest feedback trustworthy.**
   - Step toasts are computed from counts (`src/story/quests.ts:108`), so out-of-order progress announces the wrong step. Going beach → meadow → plaza:
     - The beach and meadow gave no toast.
     - The plaza toasted "Dip your toes on the south beach".
     - Reading the sign toasted "Find the bunny meadow in the west".
   - The +10 Tockens reward is silent.
   - On phones, toasts cover open menus: "Player 2 joined!" plus a step toast sit over the Pause panel's heading and the Settings tile.
   - Fix: track finished step ids, toast the reward, and keep toasts clear of open panels.
3. **Tidy the title and new-game flow.**
   - **Stale title after deleting saves:** after deleting the save that Continue points to (or all saves), Continue and Load Game stay on the title and Continue silently does nothing (`src/ui/titleMenu.ts:19`, `src/ui/slots.ts:66`). Rebuild the title after a delete.
   - **Keyboard trap on the names screen:** after typing a name, arrows only jump back into the first text box, Enter blurs to nothing, and Esc cancels the whole New Game (`src/input/input.ts:106`, `src/ui/newGame.ts:38`). Make Enter/↓ go to the next field or "Let's go!", and make Esc just leave the field.
   - **Controls guide on phone:** the Back button is below the fold; make its footer sticky like Settings' "Done".

**Smaller notes:**
- **Settings that don't do anything yet:**
  - "Reduce motion" is read by nothing.
  - The colourblind option has nothing to recolour until M5/M7.
  - Wire both when those systems land, or hide Reduce motion until then.
- **Pip's portrait:** on every screen size she sits on a visibly square pale glow, which looks pasted on. A round, feathered glow would fix it.
- **Taps during dialogue:** the dialogue layer swallows taps across the whole screen, but only the box advances. Kids expect tap-anywhere.
- **Slot cards:** they show only Player 1's name. Showing both names (and the name on Continue) helps siblings tell saves apart.
- **M3 flake** (for the M3 review): `tockwood.spec.ts:110` checks the in-game minutes after sleeping with `toBe(390)`; it got 390.08 when the clock ticked one frame.
- **Real background test:** the e2e "pauses in background" test uses the `simulateBackground` hook, not a real `visibilitychange`. I checked the real event by hand:
  - 4 minutes hidden didn't count.
  - 12 minutes hidden while Pip was showing started a fresh session and closed her card.

## Fun score

4/10. Biggest thing holding it back: M2's centrepiece, the break reminder, can freeze the game the moment a family follows its advice mid-conversation. Beyond that, M2 alone is plumbing — signs and one explore quest. The dialogue and Pip's card are lovely.

## Required features tally

Working 1 · partial 7 · missing 6. Items built in M3 are marked (M3); they are in this build but judged in the M3 review.

1. Adventure story — partial. M2 delivers dialogue, choices and quests derived from save flags (HUD objective, Adventure Log, rewards). The opening chapter is M3.
2. Village life — partial. The M1 hub is here; neighbours and digging are M3; no decorating yet.
3. Time travel — missing.
4. Outfits — missing.
5. Bowling — missing (only the pin sound effects).
6. Corgi — partial (M3).
7. Dancing — missing (only the dance-hit sound effects).
8. Riddles, logic and strategy — missing (a puzzle-difficulty setting exists).
9. Playtime reminder — partial. Broken by blockers 1 and 2. What works:
   - One timer shared by both players, 45 minutes by default, 15/30/45/60/90 in Settings, and it can't be switched off.
   - Two snoozes, then a firm reminder that can still be dismissed.
   - Autosave when Pip appears, and a gentle goodbye back to the title.
   - Backgrounding pauses the count, and 10+ minutes away starts a fresh session.
   - Late-night nudge and fast-forward hooks.
10. Map and pirates — partial. A local map exists (M3); no world map or pirates.
11. Fairy — partial. Pip voices the reminder and has a portrait; her story role is M3.
12. 1 or 2 players — working for all M2 systems:
    - P2 joins and leaves from Pause, answers choices with ↓↓ + `/`, and snoozes Pip with → + `/`.
    - The goodbye names both players ("See you soon, Maisie and Theo!").
    - Phone 2P thumb zones are intact, and the M1 controls regression tests pass.
13. Bunnies — partial (M3).
14. Magic soup — missing.

## Verified

- **Build and tests:** `tsc` is clean; e2e results as reported above.
- **Saves:**
  - Manual Save writes the current state.
  - Periodic autosave fires after about 60 s.
  - Continue restores position.
  - Deleting a slot asks for confirmation.
- **Reminder on the natural timer path** (not the debug hook), driven with Playwright's clock:
  - Fires at 15 minutes.
  - 4 minutes hidden doesn't count.
  - After Take a break, coming back in 2 minutes keeps the session (next reminder at 50 min); coming back after 11 minutes starts fresh (45 min).
  - Pip appears over Pause → Settings and hands control back.
- **Phone layouts:** reminder, firm and goodbye screens fit at 667×375 and 568×320. Tapping the HUD objective opens the Adventure Log in 1P and 2P.
- **Tone, originality and docs:** tone is gentle and names are original. No DECISIONS entry quietly drops a spec requirement; counting time while paused and the firm 5-minute repeat are recorded, reasonable choices.
