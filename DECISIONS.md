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
- Any menu open = world paused for input; UI presses are debounced for ~0.3 s after a screen opens/closes (anti double-tap), except dialogue skip which is always instant.
