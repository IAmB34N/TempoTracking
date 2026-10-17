// Core domain types for Tempo.
// Terminology: a "Play" is one logged setting action (the UI calls it a "Set");
// "setNumber" is the match period (Set 1, Set 2, ...); a "Game" is one tracked match.

export const POSITIONS = ['libero', 'setter', 'middle', 'outside', 'rightside'] as const
export type Position = (typeof POSITIONS)[number]

/** Jersey numbers (as strings, in entry order) per position. */
export type Roster = Record<Position, string[]>

export interface Team {
  id: string
  name: string
  roster: Roster
  isPrimary: boolean
  createdAt: number
  updatedAt: number
}

/** Snapshot of a team as it was when the game was created. */
export interface GameTeam {
  teamId: string
  name: string
  roster: Roster
}

export type TeamIndex = 0 | 1

export interface Game {
  id: string
  createdAt: number
  updatedAt: number
  teams: [GameTeam, GameTeam]
  /** Current match period (1-based). */
  currentSet: number
  /** When true Team B occupies the "left/top" half of the court. */
  swapSides: boolean
  plays: Play[]
}

/**
 * A point on the court in the TEAM-RELATIVE frame of the play's team:
 * x runs from that team's own endline (0) to the opponent's endline (1),
 * y runs across the width (0..1). Values slightly outside 0..1 mean out of bounds.
 */
export interface CourtPoint {
  x: number
  y: number
}

export const SETTER_KINDS = ['libero', 'setter', 'other'] as const
export type SetterKind = (typeof SETTER_KINDS)[number]

export const ATTACK_POSITIONS = ['outside', 'middle', 'rightside', 'other'] as const
export type AttackPosition = (typeof ATTACK_POSITIONS)[number]

export const SET_HEIGHTS = ['minus', 'zero', 'fast', 'tempo', 'slow', 'bump'] as const
export type SetHeight = (typeof SET_HEIGHTS)[number]

export const HIT_RESULTS = ['kill', 'notkill', 'tip', 'roll', 'out', 'net', 'blocked', 'other'] as const
export type HitResult = (typeof HIT_RESULTS)[number]

/** Results counted as attack errors. */
export const ERROR_RESULTS: readonly HitResult[] = ['out', 'net', 'blocked']

export interface SetterChoice {
  kind: SetterKind
  /** Only when kind === 'other'. */
  position?: AttackPosition
  number?: string
}

export interface HitterChoice {
  position: AttackPosition
  number?: string
}

export interface Play {
  id: string
  gameId: string
  teamIndex: TeamIndex
  setNumber: number
  createdAt: number
  setFrom?: CourtPoint
  hitFrom?: CourtPoint
  setter?: SetterChoice
  height?: SetHeight
  hitter?: HitterChoice
  result?: HitResult
}

export function emptyRoster(): Roster {
  return { libero: [], setter: [], middle: [], outside: [], rightside: [] }
}

export function isPosition(value: unknown): value is Position {
  return typeof value === 'string' && (POSITIONS as readonly string[]).includes(value)
}

/** Roster numbers for a setter kind / attack position ('other' has no roster). */
export function rosterFor(roster: Roster, who: SetterKind | AttackPosition): string[] {
  return who === 'other' ? [] : roster[who]
}

/** Which roster position a setter choice draws its numbers from, if any. */
export function setterRosterPosition(setter: SetterChoice | undefined): Position | null {
  if (!setter) return null
  if (setter.kind === 'libero' || setter.kind === 'setter') return setter.kind
  if (setter.position && setter.position !== 'other') return setter.position
  return null
}

export function normalizeRoster(raw: unknown): Roster {
  const roster = emptyRoster()
  if (!raw || typeof raw !== 'object') return roster
  for (const pos of POSITIONS) {
    const list = (raw as Record<string, unknown>)[pos]
    if (Array.isArray(list)) {
      roster[pos] = Array.from(
        new Set(list.filter((n): n is string | number => typeof n === 'string' || typeof n === 'number').map((n) => String(n).trim()).filter(Boolean)),
      )
    }
  }
  return roster
}

export function rosterSize(roster: Roster): number {
  return POSITIONS.reduce((n, p) => n + roster[p].length, 0)
}
