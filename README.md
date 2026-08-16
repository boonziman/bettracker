# Slate

A live bet desk for every sport. The slate, your book, and Gamecast-style watch
pages — moneyline, spread, totals, team totals, period bets, and player props —
scored against real ESPN data.

**Live site (GitHub Pages):** after you connect this repo to Vercel (below),
that URL is the one to send in iMessage. The old single-file page has been
replaced.

## What you can do

- Scan today’s slate across NFL, CFB, NBA, WNBA, MLB, NHL, EPL, La Liga, Serie A, Bundesliga, Ligue 1, MLS, UCL, NWSL, UFC, PGA, F1
- Tap a line (ML / over / under) to drop it on the slip
- Build parlays and player props (Ks, points, yards, etc.)
- Watch a game: score, baseball diamond + count, down & distance, play-by-play
- Live tickers on prop and total legs (`8 / 8.5`)
- Auto status: covering / sweating / hit / miss
- Check legs off by hand
- Ledger: record, staked, net
- Optional sign-in (Google / X) to sync the book across devices

Tickets live on the device immediately. Sign in only if you want them in the cloud.

## Stack

TanStack Start + React + Tailwind — not Hugo or Astro. This is a live desk
(polling, slips, Gamecast), not a content site. ESPN is pulled through a
same-origin proxy every 4–5s on live games (20s when idle) so the browser never
hits CORS or rate-limit walls. One-second refresh would get the unofficial ESPN
API blocked; 4–5s still feels live.

## Deploy (Vercel — recommended)

The live proxy needs a server, so GitHub Pages alone cannot host this rebuild.
Vercel is free and is what this repo is set up for.

1. Open [vercel.com](https://vercel.com) and sign in with **GitHub**.
2. **Add New… → Project**.
3. Import **boonziman/bettracker**.
4. Leave the defaults (Vite / the repo’s build command). Click **Deploy**.
5. When it finishes, copy the `*.vercel.app` URL — that is the new iMessage link.
6. Optional: Project → **Settings → Git** is already connected; every push to
   `main` redeploys.

To point the old Pages URL at Vercel later: Vercel → Project → Settings →
Domains, then in GitHub → repo → Settings → Pages you can disable the static
site.

## Local

```bash
npm install
npm run dev
```

## Privacy

Bets are yours. Guest tickets stay in this browser. Signed-in tickets are stored
only in this app’s database, scoped to your account.
