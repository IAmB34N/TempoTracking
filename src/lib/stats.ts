// Pure statistics over plays. "Setting %" = kills ÷ sets (share of sets that ended in a kill).
import { formatDate, hitterLabel, setterLabel } from './labels'
import {
  ERROR_RESULTS,
  HIT_RESULTS,
  SET_HEIGHTS,
  type Game,
  type HitResult,
  type Play,
  type SetHeight,
  type TeamIndex,
} from './types'

export interface Line {
  sets: number
  kills: number
  errors: number
  /** Sets logged without a hit result (e.g. the "Hit result" step was off); they are not scored. */
  noResult: number
  /** kills ÷ scored sets (0..1), null when no set has a result. */
  settingPct: number | null
  /** (kills − errors) ÷ scored sets, null when no set has a result. */
  efficiency: number | null
}

export interface Summary extends Line {
  byResult: Record<HitResult, number>
  byHeight: Record<SetHeight, Line>
  /** Sets logged without a set height, so the height table still sums to `sets`. */
  noHeight: Line
  bySetter: Record<string, Line>
  byHitter: Record<string, Line>
  bySetNumber: Record<number, Line>
}

export function emptyLine(): Line {
  return { sets: 0, kills: 0, errors: 0, noResult: 0, settingPct: null, efficiency: null }
}

export function isKill(play: Play): boolean {
  return play.result === 'kill'
}

export function isError(play: Play): boolean {
  return play.result !== undefined && ERROR_RESULTS.includes(play.result)
}

export function lineOf(plays: readonly Play[]): Line {
  const sets = plays.length
  let kills = 0
  let errors = 0
  let noResult = 0
  for (const p of plays) {
    if (p.result === undefined) noResult++
    if (isKill(p)) kills++
    if (isError(p)) errors++
  }
  // Only sets with a recorded result can be scored; the rest are reported separately.
  const scored = sets - noResult
  return {
    sets,
    kills,
    errors,
    noResult,
    settingPct: scored ? kills / scored : null,
    efficiency: scored ? (kills - errors) / scored : null,
  }
}

export function setterKey(play: Play): string {
  return play.setter ? setterLabel(play.setter) : 'Unknown'
}

export function hitterKey(play: Play): string {
  return play.hitter ? hitterLabel(play.hitter) : 'Unknown'
}

function groupBy<K extends string | number>(plays: readonly Play[], key: (p: Play) => K | null): Record<K, Line> {
  const groups = new Map<K, Play[]>()
  for (const p of plays) {
    const k = key(p)
    if (k === null) continue
    const list = groups.get(k)
    if (list) list.push(p)
    else groups.set(k, [p])
  }
  const out = {} as Record<K, Line>
  for (const [k, list] of groups) out[k] = lineOf(list)
  return out
}

const NO_HEIGHT = 'none'

export function summarize(plays: readonly Play[]): Summary {
  const byResult = Object.fromEntries(HIT_RESULTS.map((r) => [r, 0])) as Record<HitResult, number>
  for (const p of plays) if (p.result && p.result in byResult) byResult[p.result]++
  const byHeightRaw = groupBy(plays, (p) => p.height ?? NO_HEIGHT)
  const byHeight = Object.fromEntries(SET_HEIGHTS.map((h) => [h, byHeightRaw[h] ?? emptyLine()])) as Record<SetHeight, Line>
  return {
    ...lineOf(plays),
    byResult,
    byHeight,
    noHeight: byHeightRaw[NO_HEIGHT] ?? emptyLine(),
    bySetter: groupBy(plays, setterKey),
    byHitter: groupBy(plays, hitterKey),
    bySetNumber: groupBy(plays, (p) => p.setNumber),
  }
}

export function teamPlays(game: Game, teamIndex: TeamIndex, setNumber?: number): Play[] {
  return game.plays.filter((p) => p.teamIndex === teamIndex && (setNumber === undefined || p.setNumber === setNumber))
}

export function setNumbersIn(game: Game): number[] {
  const nums = new Set<number>(game.plays.map((p) => p.setNumber))
  nums.add(game.currentSet)
  return [...nums].sort((a, b) => a - b)
}

export interface GameSeriesPoint {
  gameId: string
  date: number
  dateLabel: string
  opponent: string
  teamIndex: TeamIndex
  summary: Summary
  /** Change in Setting % vs the previous game, in percentage points (null for the first game or when either side has no sets). */
  deltaPts: number | null
  /** Relative change vs the previous game in percent (null when previous is null or 0). */
  deltaRelPct: number | null
}

/** Games a team appeared in, oldest first, with game-over-game changes. */
export function teamGameSeries(games: readonly Game[], teamId: string): GameSeriesPoint[] {
  const points: GameSeriesPoint[] = []
  const sorted = [...games].sort((a, b) => a.createdAt - b.createdAt)
  for (const g of sorted) {
    const idx = g.teams.findIndex((t) => t.teamId === teamId)
    if (idx !== 0 && idx !== 1) continue
    const teamIndex = idx as TeamIndex
    const summary = summarize(teamPlays(g, teamIndex))
    const prev = points[points.length - 1]
    let deltaPts: number | null = null
    let deltaRelPct: number | null = null
    if (prev && prev.summary.settingPct !== null && summary.settingPct !== null) {
      // Points are the difference of the two values as displayed (0.1%), so the delta reconciles with them.
      deltaPts = roundPct(summary.settingPct) - roundPct(prev.summary.settingPct)
      deltaRelPct = prev.summary.settingPct > 0 ? ((summary.settingPct - prev.summary.settingPct) / prev.summary.settingPct) * 100 : null
    }
    points.push({
      gameId: g.id,
      date: g.createdAt,
      dateLabel: formatDate(g.createdAt),
      opponent: g.teams[1 - teamIndex]!.name,
      teamIndex,
      summary,
      deltaPts,
      deltaRelPct,
    })
  }
  return points
}

/** All plays of a team across every game it appeared in. */
export function teamAllPlays(games: readonly Game[], teamId: string): Play[] {
  const out: Play[] = []
  for (const g of games) {
    const idx = g.teams.findIndex((t) => t.teamId === teamId)
    if (idx === 0 || idx === 1) out.push(...teamPlays(g, idx as TeamIndex))
  }
  return out
}

/** A 0..1 ratio as a percentage rounded to the precision formatPct displays (0.1), e.g. 0.3077 → 30.8. */
export function roundPct(value: number, digits = 1): number {
  const f = 10 ** digits
  return Math.round(value * 100 * f) / f
}

/**
 * Percentage shares (one decimal) of each count that add up to exactly 100.0, using largest-remainder
 * rounding so a column of shares reconciles. All zeros when the counts sum to 0.
 */
export function sharesSummingTo100(counts: readonly number[]): number[] {
  const total = counts.reduce((sum, c) => sum + c, 0)
  if (total <= 0) return counts.map(() => 0)
  const raw = counts.map((c) => (c / total) * 1000)
  const tenths = raw.map(Math.floor)
  let left = 1000 - tenths.reduce((sum, t) => sum + t, 0)
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((x, y) => y.frac - x.frac || x.i - y.i)
  for (const { i } of order) {
    if (left <= 0) break
    tenths[i]! += 1
    left--
  }
  return tenths.map((t) => t / 10)
}

/** Unicode minus (U+2212) so negatives read the same in every stat; never a signed zero. */
export function formatPct(value: number | null, digits = 1): string {
  if (value === null) return '—'
  const s = (Math.abs(value) * 100).toFixed(digits)
  const neg = value < 0 && Number(s) !== 0
  return `${neg ? '−' : ''}${s}%`
}

export function formatSigned(value: number | null, digits = 1, suffix = ''): string {
  if (value === null) return '—'
  // Round first so the sign agrees with the printed digits (no "+0.0" / "−0.0").
  const r = Number(value.toFixed(digits))
  const sign = r > 0 ? '+' : r < 0 ? '−' : ''
  return `${sign}${Math.abs(r).toFixed(digits)}${suffix}`
}
