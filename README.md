# Party Bingo

A tablet-friendly bingo caller app for mixed-age parties. Pick a game, print
numbered cards, then run the game from the tablet — it calls items, tracks
what's been called, checks card numbers for a win, and plays your music in
the background.

## Host it on GitHub Pages (recommended)

1. Create a new **public** repository on GitHub (e.g. `party-bingo`).
2. Upload every file in this folder, keeping the same structure:
   ```
   index.html
   css/style.css
   js/app.js
   games/manifest.json
   games/toddler-moments.json
   games/classic-party.json
   games/playlist-bingo.json
   ```
3. In the repo, go to **Settings → Pages**, set "Source" to the `main`
   branch (root folder), and save.
4. GitHub gives you a URL like `https://yourusername.github.io/party-bingo/`.
   Open that on the tablet's browser and bookmark it (or add it to the home
   screen) so it's one tap away on the day.

Because it's a real hosted site (not a file opened directly), the game
files load reliably in any browser — no local server needed on the tablet.

## Playing on the day

1. Open the site → pick a game.
2. Choose grid size (4×4 or 5×5), the winning pattern, calling speed, and
   how many cards to print.
3. Tap **Generate cards**, then **Print cards** — hand one to each guest.
4. Tap **Start game**. The tablet calls items one at a time (manually or on
   an auto-timer, your choice).
5. When someone calls "Bingo!", type their **card number** into the
   "Check a bingo" box — the app confirms it against everything called so
   far.
6. Tap **Choose music files** to pick songs from the tablet; they'll play
   in order and loop if you leave "Loop playlist" checked.

If you refresh or accidentally close the tab mid-game, reopening the site
will offer to **resume** the in-progress game (card numbers and call
history are saved on the tablet).

## Adding a new bingo game later

1. Copy any file in `games/` (e.g. `games/classic-party.json`) as a
   template.
2. Give it a unique `id`, a `title`, an optional `description`, and a list
   of `items` (aim for 25–35 so cards can vary — a 5×5 card needs at least
   24 unique items, a 4×4 needs 16).
3. Save it in the `games/` folder, e.g. `games/my-new-game.json`.
4. Open `games/manifest.json` and add the filename to the list:
   ```json
   {
     "games": [
       "toddler-moments.json",
       "classic-party.json",
       "playlist-bingo.json",
       "my-new-game.json"
     ]
   }
   ```
5. Push the change to GitHub — the new game appears on the home screen
   automatically, no code changes needed.

## Notes

- Card layouts are generated fresh each time you tap "Generate cards," so
  re-generating gives everyone new arrangements.
- The "5×5 with FREE center" option automatically marks the middle square
  as already filled.
- Music files never leave the tablet — they're only read locally for
  playback, nothing is uploaded anywhere.
