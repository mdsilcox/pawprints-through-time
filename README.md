Repository: https://github.com/mdsilcox/pawprints-through-time

# 🐾 Pawprints Through Time

A cozy time-travel adventure for 1 or 2 players that runs in the browser on computers and phones.
Help Pip the time fairy mend the Great Hourglass with Biscuit the corgi, brew magic soups with Clover the bunny chef,
and hop through history — pirates, pyramids, a 1950s bowling alley and Renaissance Florence.

## What's in the game

- **The story:** a storm cracks the Great Hourglass and its eight Time Sands scatter through history. Travel through the portal in the clocktower (the Map of Time) to **the Golden Age of Piracy**, **Ancient Egypt**, **1950s America** and **Renaissance Florence** — each era has a Time Sand in its story and another found by its three lost Hopkins bunny cousins. Bring all eight home for the finale party.
- **Tockwood Isle:** neighbours to befriend (chat daily, give them soup), Biscuit the corgi digging up treasure, the Museum of Time (trade Dr. Quill your shells, fossils and treasures from the eras to fill its cases), a cottage garden, day and night, a warren full of rescued bunnies.
- **Decorate your cottage:** press the action button just inside your cottage door (or **Pause → Decorate** at home). Drag furniture about on a touchscreen, or use the arrows + **E** to pick up and put down, **R** to turn, **Delete** to put away. Rocco sells furniture at his stall; every era gives you a keepsake.
- **Wardrobe** (Pause → Wardrobe, or the cottage wardrobe / Bramble's shop) for both players and Biscuit — some people react to what you wear, and a few places need you to dress the part.
- **Bowling** at the Starlight Lanes and later Tockwood Lanes (ten-pin scoring, 2 players plus a rival, trick-shot challenges), **dancing** in every era (Easy / Medium / Tricky or "Just dance"), **brain-builders** (riddles, logic grids, sliding blocks, patterns, code-breaking, sailing charts — replay favourites from the Puzzle Journal), and **magic soup** at the cauldron (discover recipes from Clover's clues).

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL (usually http://localhost:5173).

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the game with hot reload (debug hooks enabled) |
| `npm run build` | Type-check and build the installable offline PWA into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Unit tests (Vitest) + browser playthroughs at desktop and phone sizes (Playwright) |

The first `npm test` may need Playwright's browser: `npx playwright install chromium`.

## Install on a phone (play offline)

The game is a Progressive Web App. Browsers only install PWAs from an HTTPS address, so:

1. `npm run build`, then put the `dist/` folder on any static HTTPS host (for example drag-and-drop it onto Netlify Drop, or publish it with GitHub Pages / Cloudflare Pages).
2. Open that address on the phone once (this downloads the whole game for offline play).
3. **iPhone/iPad (Safari):** Share button → *Add to Home Screen*. **Android (Chrome):** menu ⋮ → *Install app* / *Add to Home screen*.
4. Launch it from the home screen and hold the phone sideways (landscape).

## Controls

| | Player 1 | Player 2 |
| --- | --- | --- |
| Move | **W A S D** | **Arrow keys** |
| Action (talk, enter, dig, confirm) | **E** (or Space) | **/** (or Enter) |
| Biscuit sniff / back | **Q** | **.** |
| Pause | **Esc** or **P** | **Esc** or **P** |

- **1 player:** both key sets control Player 1, so use whichever feels comfy.
- **Menus:** move with WASD/arrows, pick with E / Enter / Space, go back with Q / Esc.
- **Gamepads:** left stick or d-pad to move, **A** action, **B** sniff/back, **Start** pause. The first pad is Player 1, the second is Player 2 — pressing **Start** on a second pad drops Player 2 straight in.
- **Phone / tablet (hold it sideways):** drag anywhere on the left side for the joystick, tap **A** to act and **B** to sniff. With two players, each player gets half of the screen with their own joystick and buttons.
- **Player 2 joins or leaves any time** from the pause menu (or the 👥 button in the top-right corner).

## Playtime reminder

Pip gently suggests a break after 45 minutes of play by default. Change it in **Pause → Settings → Playtime reminder** (15, 30, 45, 60 or 90 minutes) — or from **Settings** on the title screen. The reminder can't be switched off.

- **Take a break** saves the game and says goodbye. **Five more minutes** works twice; after that Pip asks more firmly (you can still keep playing, but she'll check in every 5 minutes).
- Time only counts while the game is on screen. Putting the phone down for 10+ minutes counts as a real break and starts fresh.
- After 9 PM (by the device clock) Pip also gives one gentle "it's getting late" nudge per session (can be turned off in Settings).

## How it was tested, and what to expect

- The whole game can be played from the title screen through all four eras to the finale party, the ending storybook and the credits — alone or as a pair, on a desktop-sized screen and on a phone-sized one. `npm test` plays it that way (unit tests, then browser playthroughs at 1280×720 and an emulated 667×375 phone).
- It has been run in desktop Chromium (headless) only. It hasn't been tried on a physical phone, an iPad or a real gamepad yet (touch and gamepad input are tested with emulated touches and simulated pads), so there may be rough edges there.
- Sound is made in the browser as you play (there are no audio files). Browsers only allow sound after the first tap or key press.
- Saves live in the browser on that device (three slots); there's no cloud save. Clearing the browser's site data clears them.
- Known limits are listed under *Known issues* in `PROGRESS.md` — for example, the Swirling Shoals sailing chart is tight on screens smaller than the 667×375 phone size, and the last independent reviews of milestones 8–10 were skipped at the end.

## Project docs

- `SPEC.md` — the build spec.
- `PROGRESS.md` — what's done, what's next, known issues.
- `DECISIONS.md` — design and tech decisions (including the art style and palette).
- `review/M<n>/` — milestone screenshots and the independent critic's verdicts.
