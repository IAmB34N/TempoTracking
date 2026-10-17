// Pure step engine for the tracking flow. The UI keeps a history stack of drafts so
// "Back" is just a pop; this module only decides which step comes next.
import type { Settings } from './settings'
import type { AttackPosition, CourtPoint, HitResult, HitterChoice, Roster, SetHeight, SetterChoice, TeamIndex } from './types'
import { setterRosterPosition } from './types'

export const STEP_ORDER = [
  'team',
  'setFrom',
  'hitFrom',
  'setterKind',
  'setterPosition',
  'setterNumber',
  'height',
  'hitterPosition',
  'hitterNumber',
  'result',
] as const
export type StepId = (typeof STEP_ORDER)[number]

export interface Draft {
  teamIndex?: TeamIndex
  setFrom?: CourtPoint
  hitFrom?: CourtPoint
  setter?: SetterChoice
  height?: SetHeight
  hitter?: HitterChoice
  result?: HitResult
}

export type Rosters = readonly [Roster, Roster]

function teamRoster(draft: Draft, rosters: Rosters): Roster | null {
  return draft.teamIndex === undefined ? null : rosters[draft.teamIndex]
}

/** Whether a step should be shown given current settings and the answers so far. */
export function stepEnabled(step: StepId, draft: Draft, settings: Settings, rosters: Rosters): boolean {
  const s = settings.steps
  switch (step) {
    case 'team':
      // The team is inferred from the court half when the set-location step is on.
      return !s.setLocation
    case 'setFrom':
      return s.setLocation
    case 'hitFrom':
      return s.hitLocation
    case 'setterKind':
      return s.whoSet
    case 'setterPosition':
      return s.whoSet && draft.setter?.kind === 'other'
    case 'setterNumber': {
      if (!s.whoSet) return false
      const pos = setterRosterPosition(draft.setter)
      const roster = teamRoster(draft, rosters)
      return pos !== null && roster !== null && roster[pos].length > 0
    }
    case 'height':
      return s.setHeight
    case 'hitterPosition':
      return s.whoHit
    case 'hitterNumber': {
      if (!s.whoHit) return false
      const pos = draft.hitter?.position
      const roster = teamRoster(draft, rosters)
      return pos !== undefined && pos !== 'other' && roster !== null && roster[pos].length > 0
    }
    case 'result':
      return s.hitResult
  }
}

/** The next enabled step after `current` (null = start), or null when the draft is complete. */
export function nextStep(current: StepId | null, draft: Draft, settings: Settings, rosters: Rosters): StepId | null {
  const start = current === null ? 0 : STEP_ORDER.indexOf(current) + 1
  for (let i = start; i < STEP_ORDER.length; i++) {
    const step = STEP_ORDER[i]
    if (stepEnabled(step, draft, settings, rosters)) return step
  }
  return null
}

export function firstStep(settings: Settings, rosters: Rosters): StepId {
  // 'team' is enabled exactly when 'setFrom' is disabled, so there is always a first step.
  return nextStep(null, {}, settings, rosters) ?? 'team'
}

/** Steps that ask the user to tap the court. */
export function isCourtStep(step: StepId): boolean {
  return step === 'setFrom' || step === 'hitFrom'
}

/** Roster numbers to offer on a number step (empty when the step should not be shown). */
export function numbersForStep(step: StepId, draft: Draft, rosters: Rosters): string[] {
  const roster = teamRoster(draft, rosters)
  if (!roster) return []
  if (step === 'setterNumber') {
    const pos = setterRosterPosition(draft.setter)
    return pos ? roster[pos] : []
  }
  if (step === 'hitterNumber') {
    const pos = draft.hitter?.position
    return pos && pos !== 'other' ? roster[pos] : []
  }
  return []
}

export type StepAnswer =
  | { step: 'team'; teamIndex: TeamIndex }
  | { step: 'setFrom'; point: CourtPoint; teamIndex: TeamIndex }
  | { step: 'hitFrom'; point: CourtPoint }
  | { step: 'setterKind'; kind: SetterChoice['kind'] }
  | { step: 'setterPosition'; position: AttackPosition }
  | { step: 'setterNumber'; number: string | null }
  | { step: 'height'; height: SetHeight }
  | { step: 'hitterPosition'; position: AttackPosition }
  | { step: 'hitterNumber'; number: string | null }
  | { step: 'result'; result: HitResult }

/** Apply an answer to a draft (immutable). */
export function applyAnswer(draft: Draft, answer: StepAnswer): Draft {
  switch (answer.step) {
    case 'team':
      return { ...draft, teamIndex: answer.teamIndex }
    case 'setFrom':
      return { ...draft, setFrom: answer.point, teamIndex: answer.teamIndex }
    case 'hitFrom':
      return { ...draft, hitFrom: answer.point }
    case 'setterKind':
      return { ...draft, setter: { kind: answer.kind } }
    case 'setterPosition':
      return { ...draft, setter: { kind: 'other', position: answer.position } }
    case 'setterNumber': {
      const setter = draft.setter ?? { kind: 'other' as const }
      const next: SetterChoice = { ...setter }
      if (answer.number) next.number = answer.number
      else delete next.number
      return { ...draft, setter: next }
    }
    case 'height':
      return { ...draft, height: answer.height }
    case 'hitterPosition':
      return { ...draft, hitter: { position: answer.position } }
    case 'hitterNumber': {
      const hitter = draft.hitter ?? { position: 'other' as const }
      const next: HitterChoice = { ...hitter }
      if (answer.number) next.number = answer.number
      else delete next.number
      return { ...draft, hitter: next }
    }
    case 'result':
      return { ...draft, result: answer.result }
  }
}

export const STEP_TITLES: Record<StepId, string> = {
  team: 'Which team set the ball?',
  setFrom: 'Tap where the ball was set from',
  hitFrom: 'Tap where the ball was hit from',
  setterKind: 'Who set the ball?',
  setterPosition: 'Which position set the ball?',
  setterNumber: 'Which number set the ball?',
  height: 'How high was the set?',
  hitterPosition: 'Who hit the ball?',
  hitterNumber: 'Which number hit the ball?',
  result: 'What was the result?',
}
