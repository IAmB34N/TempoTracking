# Tempo — Design Spec

Tempo is a volleyball **setting tracker**: it logs where each ball was set from, where it was hit from, who set it, how high the set was, who hit it and the outcome, then reports per-team setting percentage. Motto: **"Tracking the tempo of every set."**

## Stack
- Vite + React 19 + TypeScript (strict), installable PWA (manifest + minimal service worker).
- No router library: custom hash router in `src/lib/router.tsx` (`useRoute`, `navigate`, `Link`). Routes are listed below.
- No state library: `src/state/store.tsx` React context + reducer; persisted to `localStorage` (`src/lib/storage.ts`, key `tempo.v1`).
- Styling: plain CSS with design tokens in `src/styles/tokens.css`; component styles in `src/styles/app.css`. No CSS framework.
- Tests: Vitest for `src/lib/**` (`*.test.ts` next to the module). Playwright E2E in `e2e/` using the installed Chromium.

## Terminology (important — "set" is overloaded)
- **Play** (code) = one logged setting action. In the UI we call it a **Set** ("Set Log", "All Sets", "sets" in stats) because that is what the user calls it.
- **Set number** (code `setNumber`) = the period of the match (Set 1, Set 2, …). UI label at the top of the tracking page: "Set 1". Button "New Set" increments it.
- **Game** = one tracked match between two teams (the user calls it a "page": "create new page / resume previous page / view previous pages").

## Color scheme (tokens.css)
Palette: gray, black, orange, white, pink. White + gray are backgrounds, **orange is the main highlight**, **black is secondary**, **pink is tertiary**.

Light theme (default): `--bg:#eef0f3` (gray) · `--surface:#ffffff` (white) · `--surface-2:#f6f7f9` · `--text:#121212` (black) · `--muted:#6b7280` · `--border:#d6d9de` · `--primary:#ff6a00` (orange) · `--primary-ink:#ffffff` · `--secondary:#121212` (black) · `--secondary-ink:#ffffff` · `--tertiary:#ff3d8a` (pink) · `--tertiary-ink:#ffffff` · `--court:#f4a261`-ish sand with white lines (court fill uses `--court-fill:#ffd7b5`, `--court-line:#ffffff`, `--court-out:#e3e6ea`).

Dark theme (`html[data-theme="dark"]`): `--bg:#0f1012` · `--surface:#1a1b1e` · `--surface-2:#232428` · `--text:#f5f5f5` · `--muted:#a1a1aa` · `--border:#34363b` · `--primary:#ff7a1a` · `--secondary:#e9e9ea` (black flips to light gray so it stays the "contrast" color) · `--secondary-ink:#121212` · `--tertiary:#ff5c9d` · court fill `#5a3a22`, lines `#f5f5f5`, out `#2a2b2f`.

Usage rules: primary actions = orange buttons; secondary actions = black buttons (light text); tertiary accents = pink (hit markers, Team B color, badges, "New Set" accent). Team A color = orange, Team B color = pink everywhere (court half labels, markers, stats headers).

## Data model (`src/lib/types.ts`)
```ts
type Position = 'libero' | 'setter' | 'middle' | 'outside' | 'rightside'
type Roster = Record<Position, string[]>            // jersey numbers as strings, in entry order
interface Team { id; name; roster: Roster; isPrimary: boolean; createdAt; updatedAt }
interface GameTeam { teamId: string; name: string; roster: Roster }   // snapshot taken when the game is created
interface Game { id; createdAt; updatedAt; teams: [GameTeam, GameTeam]; currentSet: number; swapSides: boolean; plays: Play[] }
interface CourtPoint { x: number; y: number }       // normalized 0..1 in the canonical court frame (see Court)
type SetterKind = 'libero' | 'setter' | 'other'
type AttackPosition = 'outside' | 'middle' | 'rightside' | 'other'
type SetHeight = 'minus' | 'zero' | 'fast' | 'tempo' | 'slow' | 'bump'
type HitResult = 'kill' | 'notkill' | 'tip' | 'roll' | 'out' | 'net' | 'blocked' | 'other'
interface Play {
  id; gameId; teamIndex: 0 | 1; setNumber: number; createdAt: number
  setFrom?: CourtPoint; hitFrom?: CourtPoint
  setter?: { kind: SetterKind; position?: AttackPosition; number?: string }
  height?: SetHeight
  hitter?: { position: AttackPosition; number?: string }
  result?: HitResult
}
```
Labels live in `src/lib/labels.ts` (`POSITION_LABELS`, `HEIGHT_LABELS`, `RESULT_LABELS`, …) — always render through them.

## Settings (`src/lib/settings.ts`)
```ts
interface StepSettings { setLocation; hitLocation; whoSet; setHeight; whoHit; hitResult }   // all boolean, default true
interface Settings {
  steps: StepSettings
  darkMode: boolean            // toggle; initial default = system preference at first launch
  showSetNumber: boolean       // false hides the "Set N" label AND the "New Set" button
  layout: LayoutConfig         // see Layout
}
```

## Tracking flow (`src/lib/flow.ts`, pure)
Steps in order: `team` → `setFrom` → `hitFrom` → `setterKind` → `setterPosition` → `setterNumber` → `height` → `hitterPosition` → `hitterNumber` → `result` → commit.
- `team` appears only when `steps.setLocation` is off (otherwise the team is inferred from which half of the court was tapped).
- `setFrom`: tap the court (full court, both halves labelled with team names). Half tapped ⇒ `teamIndex` (respecting `game.swapSides`).
- `hitFrom`: a second court screen, tap where the ball was hit from.
- `setterKind`: Libero / Setter / Other.
  - Libero or Setter ⇒ `setterNumber` listing that position's roster numbers (skip the step if the roster for that position is empty).
  - Other ⇒ `setterPosition`: Outside / Middle / Right Side / Other. Outside/Middle/Right Side ⇒ `setterNumber` from that position's roster (skip if empty). Other ⇒ no number.
- `height`: Minus / Zero / Fast / Tempo / Slow / Bump Set.
- `hitterPosition`: Outside / Middle / Right Side / Other. Not Other ⇒ `hitterNumber` from that roster (skip if empty).
- `result`: Kill / Not a Kill / Tip / Roll / Out / Net / Blocked / Other — always asked (unless disabled in settings).
- Any step disabled in settings is skipped. After `result` the play is committed and the flow returns to the first enabled step (normally `setFrom`).
- Every step screen has **Back** (previous answered step) and **Cancel** (discard draft). Number lists also offer "No number" so a missing jersey never blocks logging.
API: `firstStep(settings)`, `nextStep(draft, settings, roster)`, `prevStep(...)` or a history stack kept by the UI, `isComplete(draft)`.

## Court (`src/components/Court.tsx`)
SVG, full court 18 m × 9 m (2:1), center line + net, 3 m attack lines on both sides. Canonical frame: `x` runs along the length 0..1 (Team A endline at 0, Team B endline at 1 when `swapSides` is false), `y` across the width 0..1. Renders **horizontal** (A left, B right) when the container is wider than tall, **vertical** (A top, B bottom) otherwise; the stored point is always canonical. Props: `onSelect(point, teamIndex)`, `markers` (`{point, kind:'set'|'hit', label?}`; set markers orange, hit markers pink, an arrow from set→hit when both present), `teamNames`, `swapSides`, `interactive`, `highlightTeam`. Large tap targets; `aria-label` on the svg; a visible hint "Tap where the ball was set from".

## Layout customization (`src/lib/layout.ts`, `src/components/ButtonDock.tsx`, `src/pages/LayoutEditor.tsx`)
The tracking page = fixed **header** (logo + "Set N" + team side labels; reserved, never covered) + **court** (reserved) + a **button dock**. The dock is a 12-column × 6-row grid placed *below* the court in portrait and *right of* the court in landscape. Every dock button has `{ id, col, row, w, h, visible }` in grid units (`w` 2..12, `h` 1..3); a global `scale: 'sm' | 'md' | 'lg'` sets the row height (44/52/60 px). Buttons: `newSet`, `setLog`, `stats`, `undo`, `swapSides`, `teams`, `settings`, `home`, `editLayout`. Rules: buttons can't overlap each other (`collides(a,b)`), can't leave the grid (`inBounds`), and because the dock excludes the header and court they can never cover them. `validateLayout()` repairs anything invalid by auto-placing into the first free slot (`autoPlace`). Only rows actually used by visible buttons take vertical space in portrait so the court gets the rest. The editor renders the dock with drag-to-move and a corner resize handle (pointer events), snapping to grid cells, showing a red ghost + refusing to drop when a move/resize would collide or leave the grid; also per-button visibility toggles, the scale picker and "Reset layout".

## Pages / routes
- `#/` **Home**: big logo + motto; buttons **New Game** (create new page), **Resume Game** (most recent game; disabled when none, shows team names), **Previous Games**, plus **Teams** and **Settings**.
- `#/new` **New Game**: two team cards (A orange, B pink). Team name input with a datalist of saved teams — picking one pre-fills the roster. Per position (Liberos, Setters, Middles, Outsides, Right Sides) a number entry: type a number, press Enter/Add → chip; chips removable; duplicates rejected. **Start** creates/updates `Team` records (match by case-insensitive name) and the `Game`, then navigates to `#/game/:id`.
- `#/games` **Previous Games**: list newest first (date, "A vs B", sets logged, current set); tap → tracking page; also View Log / Stats / Delete (confirm).
- `#/game/:id` **Track**: header shows "Set N" (when enabled) and team sides; court; dock buttons. Tapping the court starts the flow; subsequent steps render as a full-screen panel (`src/components/flow/*`) with big option buttons (min 56 px tall). After logging, a brief toast "Logged: #12 Outside · Tempo · Kill" and back to the court. **New Set** increments `currentSet` (confirm dialog). **Undo** removes the last play (confirm). **Swap sides** flips the halves.
- `#/game/:id/log` **Set Log**: all plays grouped by set number (newest first); each row: time, team chip, setter, height, hitter, result. Tap → detail: court with set-from (orange) & hit-from (pink) markers and arrow, all fields, Delete.
- `#/game/:id/stats` **Stats**: side-by-side cards per team: Sets, Kills, **Setting %** (= kills ÷ sets; tooltip explains), Errors (out+net+blocked), Efficiency ((kills−errors) ÷ sets); then tables: by set height, by setter, by hitter position, by result; filter by set number (All / 1 / 2 …).
- `#/teams` **Teams**: saved teams (primary first, star icon), games played, overall Setting %; Set primary; Delete (confirm; games keep their snapshots).
- `#/teams/:id` **Team detail**: roster, overall totals, per-game table (date, opponent, sets, kills, Setting %, **Δ vs previous game** shown as percentage points and relative %), simple trend bar chart (CSS, no library). "Set as primary".
- `#/settings` **Settings**: Tracking steps toggles (Set location, Hit location, Who set, Set height, Who hit, Hit result); Appearance (Dark mode toggle); Sets (Show set number + New Set button); Buttons (scale, Customize layout → `#/layout`, Reset layout); Data (Export JSON, Import JSON, Clear all data — confirm).
- `#/layout` **Layout editor** as described above.

Every non-home page has a compact top bar with a back button and the small logo mark.

## Stats (`src/lib/stats.ts`, pure, unit-tested)
`summarize(plays)` → `{ sets, kills, errors, settingPct, efficiency, byResult, byHeight, bySetter, byHitter }` (`settingPct` null when sets = 0). `teamGameSeries(games, teamId)` → per-game summaries in chronological order with `deltaPts` and `deltaRelPct` vs the previous game (null for the first / when previous is null or 0). Setter key: `"Setter #7"`, `"Libero #3"`, `"Outside #12"`, `"Other"`; hitter key similar.

## Storage
`loadState()` / `saveState(state)` with schema `{ version: 1, games, teams, settings }`; corrupt data → start fresh (never crash). Save on every reducer change (debounced 150 ms). Export/Import JSON via Blob download / file input.

## Accessibility & ergonomics
Tap targets ≥ 44 px, buttons ≥ 56 px in the flow; focus rings; `aria-live` toast; respects `prefers-reduced-motion`; works at 360 × 640 (phone portrait), tablets, desktop. Never horizontal page scroll.
