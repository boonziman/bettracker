# Slate

A live bet desk for every sport. The slate, your book, and Gamecast-style watch
pages — moneyline, spread, totals, team totals, period bets, and player props —
scored against real ESPN data.

**Live site (send this):** [boonziman.github.io/bettracker](https://boonziman.github.io/bettracker/)

No Vercel. Tickets stay on the device (this browser).

## What you can do

- Scan today’s slate across UFC and every other card ESPN carries — NFL, CFB, CFL, UFL, NBA, WNBA, G League, MLB, NHL, college hoops/baseball/softball/hockey, PFL, Bellator, ATP, WTA, PGA, LPGA, LIV, DP World, F1, NASCAR, IndyCar, the big soccer leagues and cups, rugby, AFL, and more
- Tap Fight / Tennis / Golf · Motor to jump a family
- Tap a line (ML / over / under) to drop it on the slip — fighters and field winners included
- Build parlays and player props (Ks, points, yards, etc.)
- Watch a game: score, baseball diamond + count, down & distance, fight card, golf/racing leaderboard
- Live tickers on prop and total legs (`8 / 8.5`)
- Auto status: covering / sweating / hit / miss
- Check legs off by hand
- Ledger: record, staked, net

## Hosting (GitHub Pages only)

This is a static app. ESPN is called from the browser. The live site is already
published from this repo.

If you change the app later and want GitHub to rebuild it automatically:

1. Repo → **Settings → Pages**
2. Set **Source** to **GitHub Actions**
3. Open **Actions** → **Deploy to GitHub Pages** → **Run workflow**

Until you flip that switch, the checked-in `index.html` + `assets/` are what Pages serves.

## Local

```bash
npm install
npm run dev
```

To rebuild the GitHub Pages files:

```bash
npm run build:pages
```

Then copy `.output/public/index.html`, `404.html`, `.nojekyll`, and `assets/` to the repo root and push.

## Privacy

Bets are yours. Tickets stay in this browser.
