Repository: https://github.com/mdsilcox/pawprints-through-time

# 🐾 Pawprints Through Time

A cozy time-travel adventure for 1 or 2 players that runs in the browser on computers and phones.
Help Pip the time fairy mend the Great Hourglass with Biscuit the corgi, brew magic soups with Clover the bunny chef,
and hop through history — pirates, pyramids, a 1950s bowling alley and Renaissance Florence.

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

_(Filled in as controls land — see the in-game Settings → Controls page.)_

## Playtime reminder

Pip gently suggests a break after 45 minutes of play by default. Change it in **Pause → Settings → Playtime reminder** (15, 30, 45, 60 or 90 minutes).

## Project docs

- `SPEC.md` — the build spec.
- `PROGRESS.md` — what's done, what's next, known issues.
- `DECISIONS.md` — design and tech decisions (including the art style and palette).
- `review/M<n>/` — milestone screenshots and the independent critic's verdicts.
