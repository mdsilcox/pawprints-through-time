# Progress log

## M4 — Wardrobe ✅ (awaiting critic)
- Wardrobe screen (pause menu tile, the cottage wardrobe, Bramble's magic mirror): tabs for Player 1, Player 2 and Biscuit; Hat / Top / Bottoms / Shoes / Extras (+ Biscuit's Hat / Neck); item thumbnails drawn on a mannequin; colour-variant swatches; a Look tab (6 skin tones, 8 hair colours, 6 hairstyles); a live, rotatable preview (front/side/back) with a squishy bounce; "Surprise me!" dice.
- 49 player clothing items (30+ required) incl. era pieces (tricorn, deckhand bandana, sailor shirt, captain's coat, parrot, linen tunic & shendyt, nemes, broad collar, poodle skirt, cat-eye glasses, letter jacket, bowling shirt, saddle shoes, roller skates, Renaissance cap, doublet, breeches, painter's smock...) and 9 Biscuit items (bandana, tiny pirate hat, party bow, bunny-ear hat...).
- Starting wardrobe: 10 player pieces + Biscuit's bandana and party bow; both players always keep a top, bottoms and shoes.
- Bramble's shop: talk to Bramble ("Browse your clothes" / "Dress up Biscuit") or use the mirror: try things on in the preview, buy with Tockens, a friendly "not enough Tockens" hint.
- Changes show instantly on the world sprites (players and Biscuit), and portraits update; the same outfit data feeds the dance and bowling mini-games later.
- Tests: catalogue integrity (30+ items, all kinds drawable, era pieces, shop prices), wardrobe rules (owned-only equip, colour clamping, essentials stay on, buying, looks, surprise); browser tests for dressing P1/P2/Biscuit, the shop (try on, buy, can't afford), mirror and cottage wardrobe, keyboard-only use.
- Robustness: input "menu mode" is now read live from the UI (a key pressed as a menu opens/closes is always routed correctly); tests pin the device hour (the real late-night nudge can't interrupt them) and poll instead of fixed waits.

## M3 — Tockwood comes alive ✅ (awaiting critic)
- Opening story: a 4-page illustrated storybook (the island, Pip and the Great Hourglass, the gentle storm scattering the sands, backwards clocks and the ferry) → ferry arrival cutscene → Biscuit bounds up the dock, barks, and trots ahead to the clocktower (waiting when you fall behind) → Pip's scene at the cracked Great Hourglass with a choice → Biscuit becomes your companion.
- Main quest "A Crack in Time": follow Biscuit, meet Pip, visit Clover, say hello to 3 neighbours, dig with Biscuit, tell Pip you're ready (the portal opens in M6).
- Characters: animal-folk heads & tails for the shared paper-doll body (rabbit, owl, badger, frog, goat, raccoon, flamingo, bear, cat, dog, fox, mouse, hedgehog, parrot); all hats/accessories drawn (bunny ears poke through hats); Biscuit the corgi with 18 frames (walks in 3 directions, dig, sniff, bark-jump, sit, sleep, happy, dance) and his own outfit layers; Pip as a fluttering sprite; little bunnies with period outfits.
- Neighbours (5 + Clover + Grandma Hopkins): Dr. Quill (museum), Bramble (tailor), Finnegan (dock), Juniper (garden stall), Rocco (clock stall) — each with a first meeting, rotating daily lines (night lines, friendship-heart lines), once-a-day friendship from chatting, daily gifts (kelp, honey), Juniper's seed gift, Dr. Quill's first-fossil donation, and Rocco's "Missing Gears" favour quest.
- Clover's story (her 12 Hopkins cousins lost in time), Grandma Hopkins by the warren; the warren shows rescued bunnies (hop, nap, wave, talk); 5 wild meadow bunnies scatter from Biscuit or a running player and always hop back.
- Interiors with painted rooms: the Clocktower (Great Hourglass with 8 empty sockets, portal ring), your Cottage (bed to sleep until morning), The Bubbling Burrow (bubbling cauldron), Bramble's shop, the Museum; doors and doorway exits, both players move together, autosave on map change.
- Day/night on an in-game clock (1 game minute per real second): warm dusk/dawn tint, blue night, glowing street lamps, fireflies in the meadow/woods/plaza, night music, HUD clock; sleeping skips to 6:30 AM.
- Digging: daily dig spots per zone (beach shells, woods fossils & Glowcap mushrooms, meadow trinkets, village clock gears), some hidden until Biscuit sniffs (B / Q / . ), a guaranteed first dig by the plaza; Biscuit runs over and digs with dirt particles and an item pop-up.
- Screens: local Map (terrain, landmarks, both players, Biscuit, goal star, revealed dig spots; "you are inside X" for interiors), Backpack (tabs, icons, descriptions, Tockens), Bunny Tracker (12 cousins by era with hints, rewards progress).
- Item catalogue with ~55 procedurally drawn icons (shells, fossils, trinkets, ingredients from every era, artifacts).
- M1 review fixes: per-pad menu navigation (no double steps with pads connected), HUD buttons never keep focus (Enter no longer toggles P2), Enter/Space never click focused buttons during play, P toggles pause, phone 2P camera margins keep players clear of the HUD and buttons, 2P buttons spread apart, oak crown no longer clipped, no trees in the sea, one action bubble per player, buildings/trees fade when someone walks behind them.

## M2 — Core systems ✅ (awaiting critic)
- Dialogue: portrait + name tag + type-on text with per-character voice blips; tap/action skips, then advances; choices (keyboard, pad, touch, either player); `{p1}/{p2}/{players}` name tokens; signs use it.
- Quests & flags: quests are derived from save flags (always consistent with the save); HUD objective pill (tap → Adventure Log); step/quest-complete toasts + fanfare + autosave; rewards run once. First side quest: "Explore Tockwood Isle" (plaza, signpost, beach, meadow → 10 Tockens).
- Saves: 3 IndexedDB slots with names ("Who's adventuring today?" on New Game, dice for random names), Continue/Load/delete (with confirm), manual save in the pause menu, autosave every minute, on quest progress, when Pip's reminder appears, and whenever the app is backgrounded/closed.
- Pause menu: tile grid (systems register their tiles as they land — Adventure Log and Settings now) + Resume / Player 2 join-leave / Save / Save & quit. The world freezes while any menu is open.
- Settings (from the title or the pause menu): master/music/effects volume + mute, text speed, playtime reminder (15/30/45/60/90, default 45, cannot be switched off), late-night nudge, colourblind-friendly colours, reduce motion, puzzle difficulty, touch controls auto/on/off, controls guide. Persisted in localStorage; sliders/toggles work with keyboard, gamepad and touch.
- Playtime reminder: pure `SessionTimer` (unit-tested: 45-min default, snooze ×2 then firm-but-skippable, backgrounding pauses the count, a ≥10-minute background or break starts a fresh session, a quick return after "Take a break" keeps the session, interval changes, late-night detection). Pip flutters in over a starry backdrop, the game autosaves, "Take a break" shows a gentle goodbye with break ideas and returns to the title.
- Audio engine: Web Audio synth instruments (bell, marimba, pluck, piano, flute, fiddle, accordion, organ, bass, pad, brass...) + drums, lookahead sequencer with a note-string DSL, original songs for the title, Tockwood day/night, interiors, clocktower and the Burrow; SFX incl. UI blips, footsteps per surface (grass/sand/wood/stone), corgi bark, sparkles, portal whoosh, bowling pins, dance hits.
- Fixed along the way: skipping type-on could stall a line; a key that closed a menu leaked into gameplay (re-opening the sign); on phones the touch layer covered the HUD objective.

## M1 — Movement and controls ✅ (critic: REVISE → both blockers fixed in the M3 commit; re-review requested)
- Tockwood Isle (60×46 cells): island, beach, dock, plaza with fountain, clocktower, cottage + garden plots, tailor, museum, bowling alley (closed), the old oak (Bubbling Burrow), meadow + warren mounds, north woods. Already in the house art style (not just graybox).
- Terrain: dual-grid autotiling (16 variants per layer: foam, sand, grass, path, plaza) with extruded tilesets (no seams), dock planks, scattered decor (tufts, flowers, shells) via a Blitter; props depth-sorted by their base.
- Paper-doll characters (one rig, 16 poses incl. walk cycles, dance and bowling poses) with clothing layers; P1 and P2 look different.
- Movement with tile collision (axis-separated sliding, sub-stepping, corner assist into doorways); walk bob + squash & stretch.
- Controls: keyboard (P1 WASD+E/Q, P2 arrows+/ and .; both sets drive P1 in 1-player), gamepads (pad 1 = P1, pad 2 = P2, Start on pad 2 drops P2 in, d-pad menu nav with repeat), touch (floating joystick + A/B; 2P = two thumb zones), keyboard/gamepad menu navigation.
- Drop-in/out Player 2 from the pause menu or the 👥 HUD button; shared camera frames both players and zooms out; soft tether (slows then stops players from separating off-screen) with a sparkly ribbon hint.
- Contextual action prompts ("E Read", touch A-button relabels to the action).
- Tests: terrain/collision/camera-tether/input unit tests; Playwright: WASD/arrows movement, 2P join/leave via pause menu, tether keeps both on screen, water/building collision, gamepad emulation (move + Start-to-join), touch joystick with two simultaneous thumbs on phone, keyboard-only menus.

## M0 — Scaffold ✅ (critic: REVISE → fixed flaky PWA test; re-review requested)
- Repo + private GitHub remote, `SPEC.md` saved verbatim, `.claude/agents/critic.md` from Appendix A.
- Vite 8 + TypeScript + Phaser 3.90 boot → title → play loop; DOM overlay UI layer with a screen stack and spatial focus navigation.
- HiDPI-aware scaling (device-pixel backing store, DPR ≤ 2) that fills any viewport; portrait-phone "turn sideways" hint.
- PWA via `vite-plugin-pwa`: manifest (landscape, fullscreen), generated icons (`npm run icons`), Workbox precache of the whole game; verified offline by Playwright against a production build.
- Save system skeleton: IndexedDB key/value wrapper, 3 save slots, "continue" slot memory, save migration (fills new fields into old saves), debounced + periodic autosaver.
- Settings model (localStorage) with the playtime reminder defaulting to 45 minutes and only offering 15/30/45/60/90.
- Test harness: Vitest unit tests (saves incl. fake IndexedDB, migration, autosave, settings); Playwright smoke tests at desktop 1280×720 and phone 667×375 landscape (touch), plus an offline-PWA test.
- `window.__game` debug hooks (dev builds or `?debug`): ready, scenes, state, newGame/load/save/slots, flags, settings, startWorld, toTitle.
- `node scripts/shots.mjs <milestone>` captures review screenshots.

## Next
- M5: puzzle framework (riddles, logic grids, sliding blocks, patterns, code-breaking, navigation), adaptive difficulty, Pip's hints, puzzle journal; magic soup (garden, ingredients, cauldron, recipes, effects).

## Known issues
- (none yet)
