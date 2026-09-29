# Decisions

One line each: decision — reason.

## Process
- Repo lives in `pawprints-through-time/` inside the session folder; GitHub remote is private `mdsilcox/pawprints-through-time` — spec rule 0.1.
- Critic reviews use the fallback method: a general-purpose subagent given the body of `.claude/agents/critic.md` — the agent file is created mid-session inside a sub-folder, so Claude Code cannot load it as a named agent type.
- Critic reviews run against a separate git worktree (`../pawprints-review`) checked out at the milestone commit, in the background, while work continues on the next milestone — keeps the reviewed code frozen and avoids idle waiting; verdicts are still acted on before a milestone is called done.
- Re-reviews reuse the same critic subagent (continued with its earlier context) so it can check its own previous blockers; each milestone review gets its own frozen worktree (`../pawprints-review-M<n>`).
- Playwright picks its dev-server port from a hash of the checkout path — the review worktree and the main checkout can run `npm test` at the same time without port clashes.

## Tech
- Phaser 3.90.0 (last 3.x), Vite 8, TypeScript 6.0 (not the Go-based TS 7), Vitest 5, Playwright 1.63 — spec requires Phaser 3; pinned exact versions for reproducible installs.
- All menus, dialogue, HUD and puzzles are DOM/CSS overlays on top of the Phaser canvas — crisp text at any DPI, responsive layouts, native text input for typed riddles, and easy Playwright driving.
- Phaser runs in `Scale.NONE` with the backing store at device pixels (DPR capped at 2) shown via `zoom = 1/dpr` — crisp art on retina screens without melting phone GPUs.
- Relative Vite `base: './'` — the built PWA works from any static host path (GitHub Pages, Netlify, a sub-folder).
- `npm test` = Vitest + Playwright (desktop 1280x720, phone 667x375 landscape with touch, plus a production-build PWA/offline check) — spec: tests include scripted playthroughs and must stay green.
- Font: Fredoka (SIL Open Font License) bundled via `@fontsource/fredoka` so it works offline — a font is a typographic tool, not game art; everything visual in the game is still drawn by us.
- Settings (volume, text speed, reminder interval...) live in localStorage; game saves live in IndexedDB (3 slots + remembered last slot) — settings are per-device, saves are per-adventure.

## Art style (chosen once, used everywhere)
- Procedural Canvas-2D art generated at boot ("generated sprite sheets"): soft rounded shapes, chunky 4px warm-brown outlines, top-left light with one soft highlight, dot eyes with a white shine, rosy cheeks.
- Palette: ink `#4a3b35`, cream `#fff4e0`, paper `#fff8ec`, grass `#8fcf6f`/`#6fae55`/`#b5e08a`, leaf `#5fa85a`, sand `#f3dca2`/`#dfc084`, water `#6cc4d8`/`#4fa6c4`, foam `#e8fbff`, path `#e9c89a`, stone `#cfc2b0`, wood `#b57a4e`/`#8a5a3a`, wall `#fbe7c6`, roofs `#e0715b` `#5fb3a8` `#9b86c9` `#6f9fd8`, gold `#f7c65a`, orange `#f29e4c`, pink `#f4a3b4`, red `#e46a6a`, blue `#6fb3e0`, navy `#3f5a8a`, purple `#a58bd6`, mint `#9fe0c0`, green `#7cc47f`, night `#2d2a5a`, lamp `#ffd98a`, firefly `#f6ff9a`.
- Colorblind option swaps rhythm/puzzle colors to the Okabe–Ito set and every color cue also has a distinct shape/icon.

## Gameplay
- The pirate chapter's four map pieces each use a different verb (talk, trade, find, sniff+dig) — the vertical slice exercises every core system, not just one.
- The Swirling Shoals chart is authored so that it is only solvable with calm seas (a unit test proves it) and Marigold won't sail without gumbo — the soup is a real key, and there's no failing, just "not yet".
- Torn map = a new seventh puzzle kind (jigsaw: swap, and from Medium also turn pieces) — "put the torn map together" should feel like handling a map, not like an abstract puzzle.
- The stone door's riddle comes from a pool of five pirate riddles picked by day — replays stay fresh; adaptive difficulty decides pick-from-3 / pick-from-5 / type-it.
- One currency across time: Coco takes Tockens ("how strange and shiny!") and a History Note explains pieces of eight — kids juggle one number, history still gets taught.
- Real pirates rarely buried treasure: Pip says so when the chest opens (the time-tangle hid this one) — the adventure keeps its treasure hunt without teaching a myth as fact.
- Map objects' `when` conditions are applied when a map loads; objects picked up mid-visit are removed live (`removeObject`) — keeps map definitions declarative.
- The Map of Time shows all four eras from the start (locked ones as "???"); eras whose chapters aren't built yet say "Coming soon" — the goal is visible, nothing breaks.
- Lost-bunny placement per era: one hidden (needs Biscuit's sniff), one behind a puzzle, one out in the open — varied, and always reachable in the era's own maps.
- The Recipe Book credits whoever told you a clue (Finnegan and Cookie both know the gumbo) — stored per clue.
- The full chapter playthrough runs solo on desktop and as a pair on the phone — covers 1P/2P and both screen sizes without doubling a 2-minute test.
- World unit = texture pixel, one tile = 96 units; camera zoom is derived from the CSS height (≈7 tiles tall on a phone, ≈11.5 on desktop) — characters stay big and readable on a 375px-tall phone.
- Players are human kids (customisable skin/hair later); neighbours are animal-folk built on the same paper-doll body, so every outfit fits everyone.
- In 1-player mode the arrow keys and / . also control Player 1 — kids use whichever keys they find first; they switch to Player 2 when P2 joins.
- Player 2 is not remembered between sessions; they drop in each time (pause menu, 👥 button, or Start on a second gamepad) — avoids an idle second character when one child plays alone.
- Soft tether: separation movement slows from 80% of the on-screen limit and stops at 100%; moving back together is never limited — nobody gets dragged.
- Enter/Space in menus are handled only by our input layer (native button activation suppressed) — prevents double activation.
- Playtime reminder counts while the in-game pause menu is open (the family is still at the screen) but not while the app is backgrounded; a ≥10-minute absence counts as a real break and starts a fresh session — matches "how long have we been looking at this screen".
- After "Take a break", coming back within 10 minutes continues the same session (reminder returns 5 minutes later) — the reminder can't be dodged by quitting and continuing.
- After the firm reminder, "Keep playing" is allowed but Pip returns every 5 minutes — spec: firmer but still lets them continue.
- Late-night nudge shows once per session after 9 PM (device clock), can be turned off in Settings (the 45-minute reminder itself cannot).
- Quests are computed from save flags rather than stored as separate state — no way for quest progress and the world to disagree after loads/migrations.
- Story/dialogue scripts are plain async TypeScript functions (`await talk(...)`, `await ask(...)`) — full control flow, easy to test, no custom script language to debug.
- Eight Time Sands scattered but four required eras: each era chapter restores one sand, and in the finale the restored hourglass "sings" and the celebration dance calls the last four sands home (stretch eras can later add them as bonus adventures) — keeps the spec's premise and a satisfying ending without requiring stretch content.
- In-game clock: 1 game minute per real second (a day is 24 real minutes) and only ticks in Tockwood; eras have fixed lighting — enough day/night variety in a 45-minute session without long dark stretches in puzzle-heavy eras.
- Biscuit follows the midpoint of the players, catches up at a trot, teleports next to them if left far behind or stuck — a companion should never be a chore.
- Five neighbours at the start (Quill, Bramble, Finnegan, Juniper, Rocco); Rosita (dance teacher) and Rollo (lanes keeper) move in later chapters — "new neighbours move in" as the village grows; 6+ neighbours total.
- Twelve Hopkins cousins (3 per era), each with a hint in the Bunny Tracker; rescue milestones unlock soups, headbands and Biscuit's bunny-ear hat.
- Friendship: chatting gives points once per in-game day, gifts/favours give more; 5 hearts max with special lines at some hearts — gentle, no decay.
- Interiors are painted as one backdrop per room with collision from a small grid; furniture and people are depth-sorted sprites on top.
- The family shares one wardrobe: anything owned can be worn by either player (and Biscuit has his own pieces) — no bickering over who owns the tricorn.
- Tops, bottoms and shoes can be swapped but not removed; hats and extras can be "none".
- Shop items are bought with Tockens; era outfits are earned in their eras (not for sale) — outfits double as souvenirs.
- Any menu open = world paused for input; UI presses are debounced for ~0.3 s after a screen opens/closes (anti double-tap), except dialogue skip which is always instant.
- Puzzles are pure logic modules with solvers (BFS for sliding blocks and sailing, brute force for logic grids) — every authored level is proven solvable/unique in unit tests, and Pip's near-answer hints come straight from the solvers.
- Adaptive difficulty starts at Easy (skill 0.4 < 0.45) and moves in small steps: +0.1 for a clean solve, +0.03 with one hint, −0.04 with more, −0.05 for leaving — a young player is never thrown into Tricky, and nothing is ever taken away.
- Out of moves / out of tries never means failure: the tide "turns" and the boat returns to the start, the lock "picks a new code" — kids can always keep trying.
- A keyboard slide counts as one move per pick-up-and-put-down (like a drag), matching the solver's move count shown as "Pip can do it in N".
- Soup recipes are defined by ingredient tags rather than exact ingredients, so the riddle clues are logic puzzles and era ingredients can substitute for home ones; a unit test checks that no 3-ingredient combination fits two recipes.
- Tomatoes can be grown in the cottage garden (seeds from Rocco / Juniper), so Tick-Tock Tomato is brewable before the 1950s chapter; Pirate's Gumbo needs an island ingredient and becomes brewable in the pirate chapter (M6), where the sailing chart needs it.
- The two-player special (Two-Spoon Tea) brewed alone makes a wobbly silly soup with Clover's hint "this pot wanted two spoons" — the recipe is discoverable in 1P without being brewable alone.
- A finished pot is never lost: closing the cauldron after brewing bottles it automatically.
- Soup effects are stored in the save and tick only while no menu is open — pausing to read the recipe book never wastes a soup.
- Dark places (the Glimmer Grotto now, tombs later) use a dark layer with soft holes cut around the players and crystals, instead of adding light on top — lit characters keep their true colours.
- Whisker Bisque translations appear on Biscuit's dialogue lines, on his sniffs (pointing to hidden treasure) and as floating chatter from nearby bunnies — the animals' words are useful, not just decoration.
- Economy: Dr. Quill buys spare finds (shells, fossils, trinkets) at their listed value; the first of every museum-worthy piece is donated to the Museum of Time with a +5 finder's fee — digging every day funds Bramble's shop, and the museum fills up along the way.
- Clock gears can't be sold until Rocco's favour is done — selling must never break a quest.
- Map labels and markers are HTML over a terrain canvas (fixed readable font size), not text drawn into the canvas — a phone scales the canvas down to a third, so drawn text became unreadable.
- Between the ferry and Pip's scene Biscuit is "leading the way": after a reload he waits at the clocktower door and follows the players inside — a story companion must never vanish because play stopped mid-step.
- Camera smoothing is frame-rate independent and hard-clamped so every player stays inside the view even on a slow frame; on touch screens the shared camera may pull back to 60% of the normal zoom (72% on desktop) — phones are short, so two players need the extra vertical room.
- Pip's reminders wait for a calm moment — never during dialogue, cutscenes, storybooks, running story scripts or the first 3 s of play — but never more than 60 s; the 45-minute count keeps running meanwhile — story beats stay intact and the reminder still can't be dodged.
- Pip's card owns all input while visible and ignores presses for its first second — a child mashing the action button can't dismiss (or accept) a break they never saw.
- Leaving play ends a "story session": scripts from the old session are cancelled at their next wait (dialogue line, choice, timer, scripted walk) instead of resuming later — robust against any exit mid-scene without threading tokens through every script.
- News toasts (quest steps, friendship, "Player 2 joined") wait while a menu is open and appear when it closes; direct feedback to a menu action shows immediately (or on the button itself, like the pause menu's "Saved!") — toasts never cover a panel on small phones.
- Menu arrow-key navigation prefers items in the same row (left/right) or column (up/down), falling back to the nearest item — predictable movement in forms and grids.
- Dr. Quill is a hedgehog time historian who runs the "Museum of Time" (not an owl curator lecturing about fossils) — the critic noted the owl-curator-with-fossils combination echoes a famous life-sim character; the spec's museum stays, with its own identity.
- Colourblind setting is stored and applied as a root class now; the colour cues it changes (soup, dance, bowling, puzzles) arrive with those systems in M5/M7/M8. Reduce motion switches off UI animations now and will also calm world effects as they are added.
