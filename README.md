# Slate

A live bet desk for every sport. The slate, your book, and Gamecast-style watch
pages — moneyline, spread, totals, team totals, period bets, and player props —
scored against real ESPN data.

**Live site:** [boonziman.github.io/bettracker](https://boonziman.github.io/bettracker/)

Tickets stay on the device (this browser). No Vercel, no server.

## What you can do

- Scan today’s slate across NFL, CFB, NBA, WNBA, MLB, NHL, EPL, La Liga, Serie A, Bundesliga, Ligue 1, MLS, UCL, NWSL, UFC, PGA, F1
- Tap a line (ML / over / under) to drop it on the slip
- Build parlays and player props (Ks, points, yards, etc.)
- Watch a game: score, baseball diamond + count, down & distance, play-by-play
- Live tickers on prop and total legs (`8 / 8.5`)
- Auto status: covering / sweating / hit / miss
- Check legs off by hand
- Ledger: record, staked, net

## Hosting (GitHub Pages only)

This is a static app. ESPN is called from the browser (their API allows it).
Every push to `main` rebuilds and publishes the site.

If the live URL still shows this README instead of the desk:

1. Open the repo → **Settings → Pages**
2. Set **Source** to **GitHub Actions**
3. Open the **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**
4. Wait about a minute, then open [the live site](https://boonziman.github.io/bettracker/)

## Local

```bash
npm install
npm run dev
```

To build the exact GitHub Pages output:

```bash
npm run build:pages
```

## Privacy

Bets are yours. Tickets stay in this browser.
