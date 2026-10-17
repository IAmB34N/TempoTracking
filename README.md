# Tempo ⚡

**Tracking the tempo of every set.**

Tempo is a volleyball **setting tracker**. Tap the court where the ball was set from, tap where it was hit from, say who set it, how high the set was, who hit it and what happened — Tempo logs every set and turns it into per-team **Setting %** (sets that ended in a kill), per-setter / per-hitter / per-height breakdowns, and game-over-game trends for your teams.

It is an installable progressive web app: it runs on phones, tablets and laptops, works offline, and keeps all data on the device.

## Features

- **Home** — New Game, Resume Game, Previous Games, Teams, Settings.
- **New Game** — two teams; enter jersey numbers for liberos, setters, middles, outsides and right sides (saved teams pre-fill, the primary team is pre-filled for Team A).
- **Tracking** — full court with both teams; tap set-from → tap hit-from → who set (Libero / Setter / Other → position → number) → set height (Minus, Zero, Fast, Tempo, Slow, Bump Set) → who hit (position → number) → result (Kill, Not a Kill, Tip, Roll, Out, Net, Blocked, Other). Then it's straight back to the court for the next set. "New Set" moves the match to Set 2, 3, …; Undo removes the last entry; Swap Sides flips the court.
- **Set Log** — every set in the game, grouped by match set; open one to see the set-from and hit-from points drawn on the court.
- **Stats** — per-team Setting %, kills, errors, efficiency; breakdowns by set height, setter, hitter and result; filter by match set.
- **Teams** — every team you've tracked, overall numbers, a game-by-game table with percent changes between games, a trend chart, roster editing and a **primary team**.
- **Settings** — turn any tracking step off (set location, hit location, who set, set height, who hit, result), dark mode, hide the set number, resize the buttons, **customise the button layout** (drag and resize — buttons can never overlap each other, the court or the logo), export / import / clear data.

Colours: gray & white backgrounds, **orange** highlights, **black** secondary, **pink** tertiary. Team A is always orange, Team B pink.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm test           # Vitest unit tests (flow engine, stats, layout model, storage)
npm run build      # production build in dist/
npm run e2e        # Playwright end-to-end tests (builds must exist: run `npm run build` first)
npm run icons      # regenerate PNG icons from public/favicon.svg
```

The build is relocatable (`base: './'`), so `dist/` can be dropped on any static host (GitHub Pages, Netlify, an S3 bucket) or wrapped in a Capacitor shell for the app stores.

## Data

Everything is stored in `localStorage` under `tempo.v1` as `{ version, games, teams, settings }`. Use **Settings → Export JSON** to back it up and **Import JSON** to restore or move it to another device.

See [`docs/SPEC.md`](docs/SPEC.md) for the full design spec.
