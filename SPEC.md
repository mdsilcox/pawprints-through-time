PAWPRINTS THROUGH TIME — An Overnight Build Spec
You are building Pawprints Through Time, a cozy time-travel adventure game that runs in the browser on computers and phones. Think of a gentle village life-sim (befriending neighbors, decorating, collecting, dressing up) fused with an adventure story that sends you hopping through history. You have the whole night and no human will be available. The finished game should feel warm, charming, and complete: something a family could sit down and play together tomorrow.
Read this entire file before writing any code.
Originality: the game is inspired by the cozy life-sim genre but must be entirely original. Do not use names, characters, art, music, or UI from any existing game or franchise. All art and audio are created by you.
0. Operating rules (non-negotiable)

1. Create a new repository. Make a new directory `pawprints-through-time`, run `git init`, and do all work there. If this spec was given to you as a message rather than a file, save it verbatim as `SPEC.md` in the repo root first, since you and the critic both rely on it. Then create a private GitHub repository with the same name and push to it: `gh repo create pawprints-through-time --private --source=. --remote=origin --push`. If `gh` isn't installed or authenticated, or the name is taken, try `pawprints-through-time-<date>`, and if GitHub still isn't reachable, log it in `PROGRESS.md` and keep working locally. Never stall on GitHub.
2. Never stop to ask questions. When something is ambiguous, make the best decision, record it in `DECISIONS.md` (one line: decision + reason), and keep going.
3. Commit to git after every milestone and after any significant working change, and push to GitHub after every milestone (and at least hourly), so the work is safe even if the session ends unexpectedly. Never leave the repo broken for long. Never commit secrets or tokens.
4. Keep a running log in `PROGRESS.md`: what you finished, what's next, known issues.
5. Tests stay green. Run the suite before each commit.
6. If stuck on one problem after three genuine attempts, simplify, log it in `DECISIONS.md`, and move on.
7. Every required feature beats more content. All items in section 2 must work before you add extra eras, outfits, or polish beyond the milestone plan.
8. Look at your own work. Capture Playwright screenshots at desktop and phone sizes after every visual milestone and fix the worst problem you see.
9. No milestone is done until the critic passes it (section 8).

1. Tech stack

* TypeScript + Vite + Phaser 3. `npm install && npm run dev` must just work.
* Installable PWA that works offline after first load, so it can be added to a phone's home screen.
* All art is created by you: a consistent cozy style (soft rounded shapes, warm palette, chunky readable silhouettes) drawn as SVG or generated sprite sheets. Pick the style once, document it in `DECISIONS.md` with palette hex values, and follow it everywhere.
* All audio is synthesized with the Web Audio API: gentle background music per era, footsteps, UI blips, bowling pins, dance beats, and a happy corgi bark. A mute toggle and volume slider are required.
* Saves go to IndexedDB with autosave, and support multiple save slots.
* Controls:
   * Computer: keyboard (P1: WASD + E/Q, P2: arrow keys + / and .) and gamepads via the Gamepad API.
   * Phone: on-screen touch controls (virtual joystick + action buttons), landscape orientation.
* Responsive from a small phone (375×667, landscape) up to a large desktop monitor. Text must be readable on a phone.
* Test hooks: expose a `window.__game` debug API in dev builds (teleport, set flags, fast-forward the session timer, trigger events) so Playwright can drive scripted playthroughs.
* Testing: Vitest for game logic, Playwright for smoke tests and scripted playthroughs at desktop and mobile viewports.

2. Required features (every one must ship and be reachable in play)

1. Adventure story with a beginning, middle, and satisfying ending.
2. Cozy home-village life in the spirit of the genre: a hub village with original animal-folk neighbors to befriend, a home to decorate, and things to collect.
3. Time travel through history to several eras.
4. Outfits: a wardrobe where players change clothes, hats, and accessories.
5. Bowling: a playable bowling mini-game.
6. A corgi who is a real character in the story.
7. Dancing: a dance mini-game.
8. Strategic thinking and brain-building: riddles, logic puzzles, and strategy challenges woven into the adventure.
9. A playtime reminder when someone has been playing too long.
10. A map (world/era map) and pirates.
11. A fairy who is a real character in the story.
12. 1 or 2 players locally, on the same computer or the same phone.
13. Bunnies as real characters in the world and story.
14. Magic soup: a cooking system where players brew magic soups with special effects.

3. The story
Premise: The player arrives on Tockwood Isle, a sleepy village built around an old clocktower. Inside lives Pip, a tiny time fairy who tends the Great Hourglass that keeps history flowing. One stormy night the hourglass cracks and its eight Time Sands scatter across history. Without them, the past is getting tangled: pirates are showing up in the wrong century, the pyramid builders have lost their plans, and the village clocks are running backwards.
Biscuit, a brave, excitable corgi with a nose for sand and treasure, is the player's companion on every trip. Biscuit follows the player, sniffs out hidden items (a digging mechanic), helps solve puzzles (some doors can only be reached by a small dog), and joins the dances.
**Clover, a cheerful bunny chef, runs The Bubbling Burrow, Tockwood's soup kitchen, from a cozy burrow under the old oak tree. Her grandmother's enchanted cauldron can brew magic soups from ingredients gathered across history, and her many young cousins, the Hopkins bunnies, have tumbled through the hourglass crack and scattered into the eras. Bringing them home is a thread through the whole adventure.
Pip is the guide: she opens portals from the clocktower, gives hints (limited per puzzle so thinking still matters), explains history in short, friendly bites, and is the one who gently reminds players to take breaks.
Structure: each era is a chapter. Recover the era's Time Sand by helping its people fix the tangle, then return to Tockwood where the village grows: new neighbors move in, shops open, the museum fills. The finale restores the Great Hourglass in a celebration where every friend from every era, including all the rescued bunnies, comes to Tockwood for one big dance and a giant pot of Clover's celebration soup.
Tone: warm, funny, never scary. Pirates are mischievous rather than menacing. No violence; conflicts resolve through cleverness, kindness, and games.
4. Eras (build in this order; each is a self-contained chapter)
1. The Golden Age of Piracy (Caribbean, ~1715). The flagship era. Captain Marigold's crew has lost the map to their own treasure and blames a rival crew. The player pieces together a torn treasure map (a puzzle), navigates a small sailing chart between islands (a strategy challenge: wind and currents, limited moves), cracks a pirate code riddle, and wins the pirates' respect with a hornpipe dance-off. The treasure is the first Time Sand, and Captain Marigold becomes a friend who can visit Tockwood.
2. Ancient Egypt (~2500 BCE, Giza). Builders have lost the pyramid plans. Includes a sphinx riddle gauntlet, a block-sliding logic puzzle for moving stones, and a festival dance.
3. 1950s America. A roller-rink diner and the Starlight Lanes bowling alley. A bowling tournament is how the player earns this era's Time Sand. Sock-hop dance.
4. Renaissance Florence (~1500). An inventor's workshop with mechanical logic puzzles, a painting-pattern puzzle, and a court dance.
Stretch eras (only after M9): Viking-age Scandinavia, Tang dynasty Chang'an, the 1969 Moon landing, and the ice age with woolly mammoths.
Historical facts shown in game must be accurate and kid-friendly. Each era has 3–5 short "Pip's History Notes" the player collects; these fill the Tockwood Museum alongside artifacts brought home.
5. Systems
5.1 Village life (Tockwood Isle)

* A hand-crafted small island: clocktower, player's cottage, museum, tailor shop, bowling alley (unlocked after the 1950s era; bowling is also available in that era), a plaza for dancing, a beach, and a dock.
* Neighbors: 6+ original animal-folk characters with distinct personalities and daily dialogue; friendship grows through chatting, gifts, and small favors.
* Home decorating: place, move, and rotate furniture collected from eras (a pirate chest, an Egyptian lamp, a jukebox, a Renaissance globe).
* Collecting: Biscuit digs up items at sparkling spots; there are shells, fossils, and era trinkets.
* Day/night cycle based on in-game time (not the real clock), with lamps and fireflies at night.

5.2 Wardrobe and outfits

* A wardrobe menu with separate slots: hat, top, bottom, shoes, accessory, plus color variants.
* 30+ items at launch, many earned in eras (a tricorn hat, a linen shendyt, a poodle skirt, a Renaissance cap).
* Outfits matter: some era characters react to period-appropriate clothes, and a few puzzles require dressing the part (e.g. sneaking onto a pirate ship dressed as a deckhand).
* Biscuit has a wardrobe too (a bandana, a tiny pirate hat, a party bow).
* Outfit changes show immediately on the character in the world and in the dance and bowling mini-games.

5.3 Bowling

* Physics-based 10-pin bowling with aim, power, and spin, controlled by swipe on touch or a timing meter on keyboard/gamepad.
* Proper scoring (strikes, spares, 10 frames) with a score sheet.
* 2-player alternating turns, plus 1-player vs. a friendly character.
* A few trick shots unlock as challenges; Biscuit cheers and bounces on strikes.

5.4 Dancing

* A rhythm mini-game: prompts scroll toward a hit zone to the beat of synthesized era music.
* Each era has its own style and moves (hornpipe, Egyptian festival dance, sock hop, court dance).
* Characters, including Biscuit, visibly dance in their current outfits. In 2-player mode both players dance side by side with separate scores.
* Three difficulty levels, and a relaxed "just dance" mode with no fail state.

5.5 Brain-builders: riddles, logic, and strategy

* A puzzle framework supporting riddles (typed or multiple-choice), logic grids, sliding-block puzzles, pattern/sequence puzzles, code-breaking, and turn-limited navigation puzzles.
* Adaptive difficulty: puzzles come in easy/medium/hard variants, and the game gently adjusts based on performance, never punishing.
* Hints from Pip are limited per puzzle and escalate from nudges to near-answers.
* Riddles are original, not copied from books or websites.
* A "Puzzle Journal" in the pause menu tracks solved puzzles and lets players replay favorites.

5.6 Maps

* World map: a portal-map in the clocktower showing eras as glowing destinations, with locked/unlocked states.
* Local maps for Tockwood and each era, with the player's position, points of interest, and quest markers, reachable from the pause menu.
* Treasure maps: pirate-era collectible map fragments that reveal dig spots.

5.7 Playtime reminder

* A session timer, shared across both players, starts when play begins.
* Default reminder at 45 minutes, configurable in settings (15, 30, 45, 60, 90 minutes). It must not be disabled by default.
* When it triggers, Pip flutters in with a friendly, in-character message suggesting a break (e.g. "Even time fairies need a stretch! Let's rest our eyes."), the game autosaves, and players can choose "Take a break" (returns to title with a gentle goodbye) or "Five more minutes" (at most twice, then the reminder recommends stopping more firmly but still lets them continue).
* Also a gentle nudge if it's late at night by the device clock (after 9 PM).
* Timer logic is unit-tested, including across pause, backgrounding, and resuming.

5.8 Local multiplayer

* Drop-in / drop-out: Player 2 can join or leave at any time from the pause menu.
* Shared-screen co-op: both players are on the same screen; the camera frames both, and players can't wander off-screen (a soft tether).
* Computer: split keyboard or two gamepads.
* Phone: landscape, each player gets a thumb zone (left and right halves of the screen) with their own joystick and action button.
* Mini-games adapt: bowling alternates turns, dancing is side by side, and puzzles can be solved together (either player can submit answers).
* Player 2 has their own outfit and appears as a distinct character.

5.9 Bunnies

* Clover (the bunny chef) is a main supporting character with her own story arc and dialogue.
* Lost Hopkins bunnies: each era hides 2–3 lost bunny cousins, dressed in little period outfits (a bunny in a pirate bandana, one in a tiny pharaoh headdress, one in a poodle skirt). Finding them uses exploration, Biscuit's nose, and small puzzles. Rescued bunnies move into a growing bunny warren in Tockwood, where they hop around, nap, and wave at the players.
* Rescuing a set number of bunnies unlocks soup recipes and outfits (e.g. bunny-ear headbands for both players and a bunny-ear hat for Biscuit).
* Wild bunnies hop around Tockwood's meadow and scatter playfully when Biscuit runs by (they always come back).
* Bunnies join the dances, with a special bunny-hop dance in the finale.

5.10 Magic soup

* Ingredients are gathered everywhere: grown in a small garden at the player's cottage, dug up by Biscuit, traded with neighbors, and found in eras (Caribbean coconuts and sea salt, Egyptian dates and lentils, 1950s tomatoes, Florentine basil and beans). Real historical foods for each era are shown in Pip's notes.
* Brewing happens at the cauldron in The Bubbling Burrow: pick 3 ingredients and stir to a rhythm. The combination determines the soup. Discovering recipes is a logic puzzle: Clover gives riddle-style clues ("something from the sea, something that grows in the dark, and something red"), and a recipe book fills in as players experiment. Wrong combinations make harmless silly soups (a soup that makes you hiccup bubbles for ten seconds).
* Magic soups have temporary effects that matter in play:
   * Glowbroth: lights up dark tombs and caves.
   * Hopscotch Chowder: super-bunny jumps to reach high ledges.
   * Whisker Bisque: understand what Biscuit and the animals are saying (hidden hints and funny dialogue).
   * Tick-Tock Tomato: slows time briefly in timing puzzles and gives an easier rhythm window in one dance.
   * Pirate's Gumbo: calm seas for one sailing-chart puzzle.
   * At least 8 soups total, with some needed for story progress and others optional.
* Soup effects show visually (glowing, bouncy, sparkly) with a small timer icon.
* 2-player: both players can drink the same pot, and one special recipe requires both players to stir together.
* Soups can be gifted to neighbors to raise friendship; each neighbor has a favorite.

6. UI and feel

* A title screen with the clocktower, drifting sand particles, and Biscuit wagging.
* Big friendly buttons, readable fonts, and dialogue boxes with character portraits and a type-on effect (tap to skip).
* Juicy feedback everywhere: squash-and-stretch, sparkles, little bounces, satisfying sounds.
* Settings: volume, text speed, playtime reminder interval, controls reference, and a colorblind-friendly option for rhythm and puzzle colors.
* Pause menu: map, wardrobe, puzzle journal, recipe book, bunny tracker, museum notes, settings, save/quit.

7. Milestones (complete in order)
M0 — Scaffold. New repo; create the critic subagent file exactly as given in Appendix A; Vite + TS + Phaser, PWA setup, save system skeleton, test harness, Playwright at desktop and phone viewports, `window.__game` hooks. Commit.
M1 — Movement and controls. Tockwood graybox, player movement, keyboard/gamepad/touch controls, drop-in Player 2, shared camera with tether. Commit.
M2 — Core systems. Dialogue system, quest/flag system, autosave and save slots, pause menu, settings, playtime reminder fully working and tested. Commit.
M3 — Tockwood comes alive. Art pass on the village, Pip, Biscuit, and Clover as characters with the opening story, 3+ neighbors, wild meadow bunnies, the bunny warren, day/night, Biscuit's digging, local map. Commit.
M4 — Wardrobe. Full outfit system for both players and Biscuit, starting items, tailor shop. Commit.
M5 — Puzzle framework and magic soup. All puzzle types, adaptive difficulty, Pip's hints, puzzle journal; ingredient gathering, the cottage garden, the cauldron, recipe discovery, and soup effects. Commit.
M6 — Pirate era (vertical slice). Complete chapter: treasure map pieces, sailing strategy chart, pirate riddles, world map in the clocktower, lost pirate-era bunnies to rescue, Pirate's Gumbo needed for the sailing puzzle, first Time Sand, return to Tockwood. Commit.
M7 — Dancing. Rhythm mini-game with the pirate hornpipe integrated into M6's story, plus 2-player mode. Commit.
M8 — 1950s era and bowling. Bowling mini-game with full scoring and 2-player turns, the Starlight Lanes chapter, sock hop dance, bowling alley unlock in Tockwood. Commit.
Checkpoint: at this point all 14 required features must work. Run a full scripted playthrough (1P and 2P, desktop and phone viewports) and fix anything broken before continuing.
M9 — Egypt and Florence eras. Commit after each.
M10 — Finale and polish. Museum, home decorating, the ending celebration dance, audio pass, performance pass on a phone-sized viewport, title screen. Commit.
Stretch (only after M10): more eras, more outfits, more neighbors, photo mode with poses, seasonal events.
8. Milestone review by the critic subagent
A subagent named `critic` is defined in `.claude/agents/critic.md`, which you create during M0 by copying Appendix A verbatim (everything between the `~~~~` fences). It has a fresh context and judges the result, not your intentions.
If the `critic` subagent isn't available (Claude Code may only load agent files at session start), don't restart or wait. Instead, spawn a general-purpose subagent with the Task tool and give it the full contents of `.claude/agents/critic.md` (minus the frontmatter) as its instructions, followed by the milestone number, commit hash, and screenshot paths. Tell it explicitly that it must not edit any files except its own `VERDICT.md`. Note which method you used in `DECISIONS.md`.
At the end of every milestone:

1. Commit, capture fresh screenshots (desktop and phone viewports, 1P and 2P where relevant) into `review/M<n>/`, and run the full test suite.
2. Invoke the `critic` subagent with the milestone number, commit hash, and screenshot paths. Don't summarize or argue for your work.
3. The critic writes `review/M<n>/VERDICT.md` with PASS or REVISE, blockers, up to three ranked improvements, and a fun score (1–10) with the biggest thing holding it back.
4. On REVISE, fix every blocker and request a re-review. At most two re-reviews per milestone; after that, log remaining blockers in `PROGRESS.md` under "Known issues" and move on.
5. You may disagree with a finding only if it contradicts this spec; record it in `DECISIONS.md`.

9. Definition of done

* All work is pushed to the private GitHub repo, and the README's first line links to it.
* `npm install && npm run dev` launches the game; `npm run build` produces an installable PWA.
* All 14 required features work and are reachable in normal play, in 1P and 2P, on desktop and phone viewports.
* The game can be played from the opening scene through at least the pirate and 1950s chapters, and ideally to the ending.
* `npm test` passes, including the scripted playthroughs.
* `README.md` explains how to run it, how to install it on a phone, the controls for 1P and 2P, and how to change the playtime reminder.
* `PROGRESS.md`, `DECISIONS.md`, and a `review/M<n>/VERDICT.md` for each completed milestone are present and honest.

Begin with M0 now.
Appendix A — `.claude/agents/critic.md`
Create this file in the repo during M0 with exactly this content:

```markdown
---
name: critic
description: Independent reviewer for Pawprints Through Time milestones. Invoke at the end of every milestone with the milestone number, commit hash, and screenshot paths. Returns a PASS/REVISE verdict.
tools: Read, Grep, Glob, Bash
---

You are a demanding but fair playtester and reviewer for Pawprints Through Time, a cozy time-travel adventure game being built autonomously overnight. You did not write this code and you owe it nothing. Your job is to make sure the family who plays this tomorrow gets a game that works, feels delightful, and actually includes everything they asked for.

## How to review

1. Read `SPEC.md` in full, then focus on the milestone you were asked to review and everything before it.
2. Never edit source files, tests, or the spec. You only read, run, and report.
3. Run `npm test` yourself. Don't trust any claim that tests pass.
4. Read the tests for this milestone. Would they fail if the feature were broken? Skipped tests, loosened assertions, or tests that only check that a function exists are blockers.
5. Use the `window.__game` hooks and Playwright to actually play the milestone's content at both desktop and phone (375×667 landscape) viewports, in 1-player and 2-player mode where relevant.
6. Look at every screenshot. Judge as a player would: is text readable on the phone? Do touch controls overlap important UI? Does it feel warm and charming, or like a prototype?
7. Check that features are reachable through normal play, not just present in code or only reachable via debug hooks.
8. Read `PROGRESS.md` and `DECISIONS.md` and flag any decision that quietly drops a spec requirement.

## Always check, every milestone

- **The playtime reminder** still triggers correctly (fast-forward the timer via the debug hooks) and hasn't been broken by later work.
- **2-player mode** still works for everything built so far.
- **Required features list (spec section 2):** keep a running tally in your verdict of which of the 14 are working, partially working, or missing. After M8, any missing item is a blocker.
- **Tone:** nothing scary, violent, or mean-spirited; history notes are accurate.
- **Originality:** no names, characters, or art borrowed from existing games or franchises.

## What to write

Write `review/M<n>/VERDICT.md`:

```
# M<n> Review — <commit hash>

**Verdict:** PASS | REVISE

## Blockers
- (Spec violations or broken/faked functionality. What's wrong, where, how you verified it. Empty if none.)

## Top improvements
1. (Up to three, ranked by impact on how fun the game is per unit of effort. Concrete and actionable.)

## Fun score
X/10. Biggest thing holding it back: ...

## Required features tally
(1–14: working / partial / missing)
```

## Standards

- PASS means a real player would be happy with this milestone, not merely that it technically meets the spec's wording.
- Be specific. "Bowling feels off" is useless. "The ball ignores spin input on touch; swiping curved vs. straight produces identical paths" is useful.
- Don't pad. If it's good, a short PASS is the right answer.
- On a re-review, first verify each previous blocker is truly fixed, then look for regressions.

```
