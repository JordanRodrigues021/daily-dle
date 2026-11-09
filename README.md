# The Daily Dle

One scoreboard for the crew's 46 daily puzzles. Play each game, log the result (or just paste the share text), and the site works out the points, the leaderboard and the day's champion.

## How scoring works

- **Every game is worth up to 10 points.** Each type of result (guesses, mistakes, time, score) maps onto the same 10-point scale, so every game counts the same.
- **Most points wins the day.** When the date flips, whoever's on top takes the day's crown. A skipped game scores 0.
- **Ties go to game wins**, meaning the best score on a game among the crew. Still tied? Co-champions.
- **The season is decided by crowns**, with total points as the tiebreak.

The **Rules** tab shows the exact formula for each game. You can change the scoring, link, or category of any game there, or switch games on and off. Changes sync to everyone and rescore past days too.

## Logging a result (the fast way)

1. Tap **Play** on a card (or **Up next**). The game opens in a new tab.
2. Finish the game and hit its **Share** button.
3. Come back to the Daily Dle tab. The score sheet pops up for that game. Paste, check, **Save**.

You can also paste a share text anywhere on the page (Ctrl/⌘+V) and it works out which game it was. Games without share text get tap-to-pick buttons.

## Put it on GitHub Pages

1. Create a new GitHub repo (e.g. `daily-dle`) and upload every file in this folder.
2. In the repo: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save**.
3. A minute later it's live at `https://<your-username>.github.io/daily-dle/`.

## Turn on shared scores (once, about 3 minutes)

GitHub Pages can only serve files and can't store anything. A free Firebase database holds the shared scoreboard:

1. Go to <https://console.firebase.google.com> → **Create a project** (Analytics not needed).
2. **Build → Realtime Database → Create database**. Pick a region, then start in **test mode**.
3. Open the **Rules** tab, replace everything with the snippet below and click **Publish**. Test mode locks itself after 30 days; this snippet doesn't.
   ```json
   { "rules": { "rooms": { "$room": { ".read": true, ".write": true } } } }
   ```
4. Copy the database URL shown at the top of the Data tab, e.g. `https://daily-dle-1234-default-rtdb.firebaseio.com`.
5. Paste it into `config.js` (`db: '...'`) and push. Everyone who opens the site is now on the shared board, live.
   *No time to edit files?* Paste it in the site's **Club** tab instead and send the crew the invite link it gives you.

Anyone who has the site's link can write to this database. That's fine for a friend group, but don't put anything private in it.

## The 16 links marked "link?"

These games are small sites I couldn't confirm a URL for, so for now they open a web search: Brandle, Contextle, Unwordle, Magnitudle, Categories, Feetle, JeffGoldblumle, Noillirk, Dsmdle, Farflung, Horsle, Verityle, Minecraftdle, Play Fine Print, Pissle, Larple.
Open **Rules → tap the game → paste the real link**. It saves for everyone. Or fix them permanently in `games.js`.

**Poople** is switched off because poople.app is currently a for-sale domain. Switch it back on in Rules if it returns.

## Files

| File | What it is |
|---|---|
| `index.html` | The page |
| `styles.css` | All the looks |
| `app.js` | Scoring, sync, parsing share texts, every view |
| `games.js` | The game list: links, categories, scoring defaults |
| `config.js` | Your Firebase URL and room name |
