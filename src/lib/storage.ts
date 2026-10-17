import { normalizeSettings, type Settings } from './settings'
import { normalizeRoster, type Game, type GameTeam, type Play, type Team, type TeamIndex } from './types'

export const STORAGE_KEY = 'tempo.v1'

export interface PersistedState {
  version: 1
  games: Game[]
  teams: Team[]
  settings: Settings
}

export function prefersDark(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

export function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return parseState(raw)
  } catch {
    return null
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(state))
  } catch {
    // Quota / private mode: keep the app usable even if persistence fails.
  }
}

export function serialize(state: PersistedState): string {
  return JSON.stringify({ version: 1, games: state.games, teams: state.teams, settings: state.settings })
}

/** Parse + normalize JSON (from storage or an import). Throws on data that is not a Tempo export. */
export function parseState(text: string): PersistedState {
  const raw: unknown = JSON.parse(text)
  if (!raw || typeof raw !== 'object') throw new Error('Not a Tempo data file')
  const r = raw as { games?: unknown; teams?: unknown; settings?: unknown }
  if (!Array.isArray(r.games) && !Array.isArray(r.teams)) throw new Error('Not a Tempo data file')
  const teams = (Array.isArray(r.teams) ? r.teams : []).map(normalizeTeam).filter((t): t is Team => t !== null)
  const games = (Array.isArray(r.games) ? r.games : []).map(normalizeGame).filter((g): g is Game => g !== null)
  // at most one primary team
  let primarySeen = false
  for (const t of teams) {
    if (t.isPrimary) {
      if (primarySeen) t.isPrimary = false
      primarySeen = true
    }
  }
  return { version: 1, games, teams, settings: normalizeSettings(r.settings, prefersDark()) }
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null
}
function num(v: unknown, d: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : d
}

function normalizeTeam(raw: unknown): Team | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = str(r.id)
  const name = str(r.name)
  if (!id || !name) return null
  const createdAt = num(r.createdAt, Date.now())
  return {
    id,
    name: name.trim(),
    roster: normalizeRoster(r.roster),
    isPrimary: r.isPrimary === true,
    createdAt,
    updatedAt: num(r.updatedAt, createdAt),
  }
}

function normalizeGameTeam(raw: unknown): GameTeam | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = str(r.name)
  if (!name) return null
  return { teamId: str(r.teamId) ?? name.toLowerCase(), name: name.trim(), roster: normalizeRoster(r.roster) }
}

function normalizeGame(raw: unknown): Game | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = str(r.id)
  if (!id || !Array.isArray(r.teams) || r.teams.length !== 2) return null
  const a = normalizeGameTeam(r.teams[0])
  const b = normalizeGameTeam(r.teams[1])
  if (!a || !b) return null
  const createdAt = num(r.createdAt, Date.now())
  const plays = (Array.isArray(r.plays) ? r.plays : [])
    .map((p) => normalizePlay(p, id))
    .filter((p): p is Play => p !== null)
  return {
    id,
    createdAt,
    updatedAt: num(r.updatedAt, createdAt),
    teams: [a, b],
    currentSet: Math.max(1, Math.round(num(r.currentSet, 1))),
    swapSides: r.swapSides === true,
    plays,
  }
}

function normalizePlay(raw: unknown, gameId: string): Play | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = str(r.id)
  if (!id) return null
  const teamIndex: TeamIndex = r.teamIndex === 1 ? 1 : 0
  const play: Play = {
    id,
    gameId,
    teamIndex,
    setNumber: Math.max(1, Math.round(num(r.setNumber, 1))),
    createdAt: num(r.createdAt, 0),
  }
  const pt = (v: unknown) =>
    v && typeof v === 'object' && typeof (v as { x: unknown }).x === 'number' && typeof (v as { y: unknown }).y === 'number'
      ? { x: (v as { x: number }).x, y: (v as { y: number }).y }
      : undefined
  const setFrom = pt(r.setFrom)
  const hitFrom = pt(r.hitFrom)
  if (setFrom) play.setFrom = setFrom
  if (hitFrom) play.hitFrom = hitFrom
  if (r.setter && typeof r.setter === 'object') play.setter = r.setter as Play['setter']
  if (typeof r.height === 'string') play.height = r.height as Play['height']
  if (r.hitter && typeof r.hitter === 'object') play.hitter = r.hitter as Play['hitter']
  if (typeof r.result === 'string') play.result = r.result as Play['result']
  return play
}
