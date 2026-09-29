# M4 Review — bbfed4aead8cb09f586488d595485012a663e943 (M4 landed in 61e464e)

**Verdict:** REVISE

The wardrobe itself is lovely and solid:
- **Catalogue:** 54 player items and 9 for Biscuit, every one drawn front, side and back, with named colour variants.
- **Looks:** 6 skin tones, 8 hair colours and 6 hairstyles, all of which sit nicely under every hat.
- **Preview:** a bouncy preview you can turn round, plus a "Surprise me" dice.
- **Instant updates:** changes reach the world sprites and the dialogue portraits immediately, for Player 1, Player 2 and Biscuit.
- **Controls:** it works by mouse, touch, keyboard and gamepad (pad 2 included).
- **Saves and Pip:** outfits survive a reload, and Pip's reminder interrupts it safely.

The one blocker is Bramble's shop: after at most five purchases there is no way left to earn Tockens.

## Blockers

- **Bramble's shop dead-ends, and the game's advice for earning Tockens describes a feature that doesn't exist.**
  - **The advice:** when you can't afford something, the toast says *"Not enough Tockens yet — Biscuit can dig up treasures to sell to Dr. Quill!"* (`src/ui/wardrobe.ts:249`).
  - **Nothing buys anything:**
    - Every item in `src/data/items.ts` carries a `value` ("Tockens given when sold/donated", line 17), but nothing ever reads it.
    - Dr. Quill takes one fossil, once (`src/story/tockwoodNpcs.ts:69-80`).
    - The Backpack has no sell option.
  - **The numbers:** every Tocken in the game adds up to **85**:

    | Source | Tockens | Where |
    |---|---|---|
    | Start | 20 | `state.ts:130` |
    | Explore quest | +10 | `sideQuests.ts:19` |
    | Quill's first fossil | +25 | `tockwoodNpcs.ts:77` |
    | Rocco's gears | +30 | `tockwoodNpcs.ts:214` |

    The shop's 15 items cost **405**. At most 5 can ever be bought: the five cheapest (15 + 15 + 15 + 20 + 20) spend every last Tocken. The other 10 are unreachable in normal play.
  - **Verified in play (desktop):**
    1. Walked through the tailor's door, met Bramble, and chose "Browse your clothes".
    2. Bought the Bow Tie: 20 → 5 Tockens.
    3. Tried on the Sporty Cap and pressed Buy: got the toast above.
    4. Took 3 conches, 2 ammonites, a golden acorn and 4 sand dollars to Dr. Quill:
       - Visit 2: he took one ammonite and paid 25 Tockens.
       - Visit 3: small talk only.
       - None of the other finds can be sold anywhere.
  - **Fix:**
    - Let finds be sold for their `value`. For example, add a "Sell finds" choice at Dr. Quill or the museum counter that keeps the first of each kind for the museum. Daily digs → Tockens → clothes then becomes the cozy loop the hint already promises.
    - Add an e2e test that earns Tockens through play (not `setTockens`) and spends them at Bramble's.

## Top improvements

1. **Fit the wardrobe to a 375-px-tall phone, and stop the Look tab being clipped everywhere.**
   - **Cause:** the right-hand column is a scroll box inside a scroll box.
     - `.wd-grid` is capped at `max-height: 14rem`, or 32vh ≈ 120 px on the phone.
     - That box sits inside `.wd-body`, which also scrolls (`src/styles/wardrobe.css:49-56, 171-183`).
   - **At 667×375:**
     - The Look tab shows the skin tones and a clipped row of hair colours. All six hairstyles stay hidden until you swipe inside that 120-px box.
     - After you pick a top, its name and description sit below the fold ("Soft as a bunny" is cut in half).
     - The ↺ 🎲 ↻ buttons are clipped at the bottom, and they are only 39×33 px.
   - **On desktop:** at 1280×720, and even at 1920×1080 with room to spare, the "Ponytail" button is sliced in half by the same 14rem cap.
   - **Fix:**
     - Drop the grid cap and let a single region scroll.
     - Put the item name and description under the preview.
     - Lay the Look rows out so all three fit at 375 px.
2. **Keep keyboard and gamepad focus on what you just picked.**
   - **Cause:**
     - Every pick rebuilds the tabs, grid and swatches (`render()`, `src/ui/wardrobe.ts:280-287`), so the focused button is destroyed and focus falls to `<body>`.
     - The next arrow or d-pad press then jumps to the "Player 1" tab at the top-left (`src/ui/ui.ts:191-192`).
   - **Effect:** after every pick there is no focus ring, and you have to walk back down to the grid. Trying the beanie and then the sun hat takes 12 key presses today, against 7 if focus stayed put; I counted real presses. Keyboard purchases work but hit the same reset.
   - **Fix:**
     - Remember the focused `data-testid` before `render()` and re-focus it afterwards. Do the same for tab switches.
     - Make "the wardrobe works with the keyboard alone" navigate with arrow keys instead of `.focus()`, and assert that focus stays on the picked item.
3. **Put dressing up in the player's path.**
   - **Today:**
     - Looks are hidden behind Pause → Wardrobe → ✨.
     - Nothing in the world notices clothes: `eraPieces()` has no callers.
   - **Suggestions:**
     - Offer skin, hair colour and hairstyle on the "Who's adventuring today?" screen, so kids start as themselves.
     - Have Bramble compliment a new purchase.
     - Have Biscuit do his happy bark-jump when he gets a new hat or bandana.
   - **Why:** it's cheap charm, and it lays the groundwork for spec 5.2's "era characters react to period-appropriate clothes".

**Smaller notes:**
- **Texture memory:** every new outfit combination builds a new 1536×154 sprite sheet, and none are ever freed. 60 🎲 rolls added 60 textures (about 57 MB of pixels). Remove the old key when a player's look changes.
- **Player 2's tab:** the Pause tile always opens the wardrobe on Player 1's tab, even when Player 2 (pad 2) opened it.
- **Thumbnails and colours:**
  - The Explorer Backpack thumbnail is a front view, so it looks like an empty mannequin.
  - The "Classic" tricorn nearly vanishes against dark hair.
- **Toasts over menus:** toasts already on screen when a menu opens drop to the bottom and sit over the panel for about 2 s. See `pause-2p-phone.png`, and the quest toast over the Wardrobe panel's bottom edge in `wardrobe-1p-*.png`.
- **Old saves:** saves made before M4 keep the old 8-item starter wardrobe, without the skirt, glasses, sun hat or Biscuit's party bow.
- **Test coverage:**
  - The unit test for drawable kinds checks tops, bottoms and shoes only against a hard-coded list. I confirmed by rendering that all 54 items draw correctly in all three facings.
  - The bunny-rescue clothing rewards (`src/data/bunnies.ts:44-45`) are data only; nothing grants them yet. Due at M6.

## Fun score

6/10. Dress-up is the most kid-magnetic thing in the game so far, and it's charming.

Biggest thing holding it back: the shop, the only thing Tockens buy, runs dry after at most five purchases. Beyond the wardrobe and the village errands there's still nothing to do until soup, puzzles and the pirate era arrive.

## Required features tally

Working 2 · partial 7 · missing 5.

1. **Adventure story** — partial. The opening chapter is in; the middle and ending come later.
2. **Village life** — partial.
   - In: neighbours, friendship, digging, one museum donation, interiors, day/night.
   - Missing: decorating.
   - The shop economy is the blocker above.
3. **Time travel** — missing. The portal says "the voyage opens in the next chapter".
4. **Outfits** — partial.
   - Done: the wardrobe itself (slots, colours, looks, Player 1, Player 2 and Biscuit, instant world updates), with 10 + 2 starter items.
   - Still to come:
     - Era items earned in play.
     - Era reactions and dress-the-part puzzles.
     - Outfits shown in the dance and bowling mini-games (M6–M8).
   - The shop blocker above also applies.
5. **Bowling** — missing.
6. **Corgi** — partial.
   - Biscuit follows, sniffs, digs and leads the opening, and now has his own wardrobe.
   - His puzzle and dance roles come later.
7. **Dancing** — missing.
8. **Riddles, logic and strategy** — missing.
9. **Playtime reminder** — working. Re-verified on this commit, on the phone in 2P:
   - Nothing at 44.5 minutes, and Pip at 45 with an autosave.
   - Two snoozes, then the firm card.
   - The late-night nudge at 22:00.
   - Pip over the open wardrobe owns the input:
     - "Five more minutes" returns to a working wardrobe.
     - "Take a break" leads to the goodbye, then the title. Continue keeps the new outfit.
10. **Map and pirates** — partial. The Tockwood map is in; there are no pirates or world map.
11. **Fairy** — partial. Pip gives the story and the reminders; hints and portals come later.
12. **1 or 2 players** — working for everything built so far. Both players and Biscuit were dressed through the tabs on desktop and phone, and pad 2 drives the wardrobe.
13. **Bunnies** — partial. There are no rescues yet, and the rescue rewards are data only.
14. **Magic soup** — missing.

## Verified

- **Tests:**
  - `npm test`: 84/84 unit tests. e2e: 89 passed and 2 expected conditional skips; exit 0.
  - `wardrobe.spec.ts` repeated 3× on desktop and phone: 30/30.
  - My first run was invalidated by Windows worker-spawn failures (0xC0000142) while other reviews loaded the machine.
- **Normal-play paths:**
  - Tailor door → Bramble's first meeting → "Browse your clothes" or "Dress up Biscuit".
  - The magic mirror.
  - The cottage wardrobe, reached on the phone with the joystick and the A button.
  - The Pause tile.
  - Each opens the right mode, and buying works for players and for Biscuit.
- **Keyboard and gamepad:**
  - I mapped the whole arrow-key focus graph, and every control is reachable.
  - E or A picks an item; Q, Esc or B goes back to Pause.
  - A keyboard-only purchase works.
- **Saves:** the outfit and Biscuit's bow were in the stored slot about 2 s after closing, and were restored after a reload.
- **Art:**
  - Contact sheets of all 54 items × 3 facings, 6 hairstyles × 14 hats and all 9 Biscuit items: all distinct and on-model.
  - Touch controls hide while the wardrobe is open.
  - No console errors in any session.
- **Tone, originality and docs:**
  - Item notes are accurate and kid-friendly: shendyt, wesekh collar, papyrus sandals, pop-bead pearls, pieces of eight.
  - Bramble the badger tailor and Tockens are original.
  - The three M4 entries in DECISIONS drop no requirement: the shared family wardrobe, essentials can't be removed, and era outfits aren't for sale.
  - PROGRESS undercounts: it says 49 player items, and there are 54.
