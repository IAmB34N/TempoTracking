import type { AttackPosition, HitResult, Play, Position, SetHeight, SetterKind } from './types'

export const APP_NAME = 'Tempo'
export const APP_MOTTO = 'Tracking the tempo of every set.'

export const POSITION_LABELS: Record<Position, string> = {
  libero: 'Libero',
  setter: 'Setter',
  middle: 'Middle',
  outside: 'Outside',
  rightside: 'Right Side',
}

/** Plural labels used on roster entry forms. */
export const POSITION_PLURALS: Record<Position, string> = {
  libero: 'Liberos',
  setter: 'Setters',
  middle: 'Middles',
  outside: 'Outsides',
  rightside: 'Right Sides',
}

export const SETTER_KIND_LABELS: Record<SetterKind, string> = {
  libero: 'Libero',
  setter: 'Setter',
  other: 'Other',
}

export const ATTACK_POSITION_LABELS: Record<AttackPosition, string> = {
  outside: 'Outside',
  middle: 'Middle',
  rightside: 'Right Side',
  other: 'Other',
}

export const HEIGHT_LABELS: Record<SetHeight, string> = {
  minus: 'Minus',
  zero: 'Zero',
  fast: 'Fast',
  tempo: 'Tempo',
  slow: 'Slow',
  bump: 'Bump Set',
}

export const RESULT_LABELS: Record<HitResult, string> = {
  kill: 'Kill',
  notkill: 'Not a Kill',
  tip: 'Tip',
  roll: 'Roll',
  out: 'Out',
  net: 'Net',
  blocked: 'Blocked',
  other: 'Other',
}

export function setterLabel(setter: Play['setter']): string {
  if (!setter) return '—'
  const who =
    setter.kind === 'other'
      ? setter.position
        ? ATTACK_POSITION_LABELS[setter.position]
        : 'Other'
      : SETTER_KIND_LABELS[setter.kind]
  return setter.number ? `${who} #${setter.number}` : who
}

export function hitterLabel(hitter: Play['hitter']): string {
  if (!hitter) return '—'
  const who = ATTACK_POSITION_LABELS[hitter.position]
  return hitter.number ? `${who} #${hitter.number}` : who
}

export function heightLabel(height: Play['height']): string {
  return height ? HEIGHT_LABELS[height] : '—'
}

export function resultLabel(result: Play['result']): string {
  return result ? RESULT_LABELS[result] : '—'
}

/** One-line description used in toasts and compact lists. */
export function playSummary(play: Play): string {
  const parts: string[] = []
  if (play.setter) parts.push(`Set by ${setterLabel(play.setter)}`)
  if (play.height) parts.push(HEIGHT_LABELS[play.height])
  if (play.hitter) parts.push(hitterLabel(play.hitter))
  if (play.result) parts.push(RESULT_LABELS[play.result])
  return parts.length ? parts.join(' · ') : 'Set logged'
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatDateTime(ts: number): string {
  return `${formatDate(ts)} ${formatTime(ts)}`
}
