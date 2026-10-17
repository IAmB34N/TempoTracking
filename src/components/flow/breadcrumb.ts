// Pure helpers for the flow panel: the answers-so-far line and the option lists per step.
import { heightLabel, hitterLabel, setterLabel } from '../../lib/labels'
import type { Draft } from '../../lib/flow'

export interface BreadcrumbOptions {
  /** Current match period; shown first when `showSetNumber` is on. */
  setNumber?: number
  showSetNumber?: boolean
}

/** The answers given so far, in flow order, e.g. ["Set 2", "Setter #7", "Tempo"]. */
export function breadcrumbFor(draft: Draft, opts: BreadcrumbOptions = {}): string[] {
  const parts: string[] = []
  if (opts.showSetNumber && opts.setNumber !== undefined) parts.push(`Set ${opts.setNumber}`)
  if (draft.setFrom) parts.push('Set location')
  if (draft.hitFrom) parts.push('Hit location')
  if (draft.setter) parts.push(setterLabel(draft.setter))
  if (draft.height) parts.push(heightLabel(draft.height))
  if (draft.hitter) parts.push(hitterLabel(draft.hitter))
  return parts
}

export function joinBreadcrumb(parts: readonly string[]): string {
  return parts.join(' · ')
}
