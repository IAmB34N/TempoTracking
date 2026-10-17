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
  /** 0..1, null when there are no sets. */
  settingPct: number | null
  /** (kills − errors) ÷ sets, null when there are no sets. */
  efficiency: number | null
}

export interface Summary extends Line {
  byResult: Record<HitResult, number>
  byHeight: Record<SetHeight, Line>
  bySetter: Record<string, Line>
  byHitter: Record<string, Line>
  bySetNumber: Record<number, Line>
}

export function emptyLine(): Line {
  return { sets: 0, kills: 0, errors: 0, settingPct: null, efficiency: null }
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
  for (const p of plays) {
    if (isKill(p)) kills++
    if (isError(p)) errors++
  }
  return {
    sets,
    kills,
    errors,
    settingPct: sets ? kills / sets : null,
    efficiency: sets ? (kills - errors) / sets : null,
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

export function summarize(plays: readonly Play[]): Summary {
  const byResult = Object.fromEntries(HIT_RESULTS.map((r) => [r, 0])) as Record<HitResult, number>
  for (const p of plays) if (p.result) byResult[p.result]++
  const byHeightRaw = groupBy(plays, (p) => p.height ?? null)
  const byHeight = Object.fromEntries(SET_HEIGHTS.map((h) => [h, byHeightRaw[h] ?? emptyLine()])) as Record<SetHeight, Line>
  return {
    ...lineOf(plays),
    byResult,
    byHeight,
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
      deltaPts = (summary.settingPct - prev.summary.settingPct) * 100
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

export function formatPct(value: number | null, digits = 1): string {
  return value === null ? '—' : `${(value * 100).toFixed(digits)}%`
}

export function formatSigned(value: number | null, digits = 1, suffix = ''): string {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toFixed(digits)}${suffix}`
}
