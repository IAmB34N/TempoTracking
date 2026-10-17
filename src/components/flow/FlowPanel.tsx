import { useEffect, useRef, type ReactNode } from 'react'
import { STEP_TITLES, type Draft, type StepAnswer, type StepId } from '../../lib/flow'
import { ATTACK_POSITION_LABELS, HEIGHT_LABELS, RESULT_LABELS, SETTER_KIND_LABELS } from '../../lib/labels'
import { ATTACK_POSITIONS, HIT_RESULTS, SETTER_KINDS, SET_HEIGHTS, type TeamIndex } from '../../lib/types'
import { IconBack, IconClose } from '../Icons'
import { Button } from '../ui'
import { joinBreadcrumb } from './breadcrumb'
import { OptionGrid } from './OptionGrid'
import './flow.css'

export interface FlowPanelProps {
  step: StepId
  draft: Draft
  teamNames: readonly [string, string]
  /** Jersey numbers to offer on a number step. */
  numbers: readonly string[]
  /** Answers so far (already labelled). */
  breadcrumb: readonly string[]
  canBack: boolean
  onAnswer: (answer: StepAnswer) => void
  onBack: () => void
  onCancel: () => void
  /**
   * Render inside the court area instead of as a full-screen overlay. Used for the very
   * first question (the team pick when set location is off) so the header and dock stay
   * reachable while nothing has been answered yet.
   */
  inline?: boolean
}

/** Full-screen (or inline) question panel for every non-court step of the tracking flow. */
export function FlowPanel({ step, draft, teamNames, numbers, breadcrumb, canBack, onAnswer, onBack, onCancel, inline = false }: FlowPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const titleId = `flow-title-${step}`

  // Move focus into the panel on every step so keyboard and screen-reader users follow along.
  useEffect(() => {
    const root = rootRef.current
    // The inline start state is the page's resting state: never steal focus there.
    if (!root || inline) return
    const first = root.querySelector<HTMLElement>('[data-autofocus="true"]') ?? root.querySelector<HTMLElement>('.options .btn')
    first?.focus({ preventScroll: true })
  }, [step, inline])

  const team = draft.teamIndex
  const crumbs = joinBreadcrumb(breadcrumb)

  return (
    <div
      ref={rootRef}
      className={['flow-panel', inline ? 'flow-panel-inline' : ''].filter(Boolean).join(' ')}
      role={inline ? 'region' : 'dialog'}
      aria-modal={inline ? undefined : true}
      aria-labelledby={titleId}
      data-testid="flow-panel"
      data-step={step}
    >
      <div className="flow-top">
        {!inline ? (
          <Button variant="outline" size="md" icon={<IconBack size={20} />} onClick={onBack} disabled={!canBack} aria-label="Back to the previous question" className="flow-nav" data-testid="flow-back">
            Back
          </Button>
        ) : (
          <span className="flow-nav-spacer" aria-hidden />
        )}
        <h2 id={titleId} className="flow-title">
          {STEP_TITLES[step]}
        </h2>
        {!inline ? (
          <Button variant="ghost" size="md" icon={<IconClose size={20} />} onClick={onCancel} aria-label="Cancel and discard this set" className="flow-nav" data-testid="flow-cancel">
            Cancel
          </Button>
        ) : (
          <span className="flow-nav-spacer" aria-hidden />
        )}
      </div>

      {(team !== undefined || crumbs) && (
        <div className="flow-meta">
          {team !== undefined && (
            <span className={['chip', team === 0 ? 'chip-a' : 'chip-b'].join(' ')} data-testid="flow-team-chip">
              <span className="flow-team-dot" aria-hidden />
              {teamNames[team]}
            </span>
          )}
          {crumbs && (
            <span className="flow-crumbs" aria-label="Answers so far">
              {crumbs}
            </span>
          )}
        </div>
      )}

      <div className="flow-body">{renderOptions(step, teamNames, numbers, onAnswer)}</div>
    </div>
  )
}

function renderOptions(step: StepId, teamNames: readonly [string, string], numbers: readonly string[], onAnswer: (a: StepAnswer) => void): ReactNode {
  switch (step) {
    case 'team':
      return (
        <div className="flow-team-options" role="group" aria-label="Team">
          {teamNames.map((name, i) => (
            <Button
              key={i}
              variant={i === 0 ? 'primary' : 'tertiary'}
              size="xl"
              block
              data-testid={`flow-option-team-${i}`}
              data-autofocus={i === 0 ? 'true' : undefined}
              onClick={() => onAnswer({ step: 'team', teamIndex: i as TeamIndex })}
              className="flow-team-btn"
            >
              <span className="flow-team-letter" aria-hidden>
                {i === 0 ? 'A' : 'B'}
              </span>
              <span className="flow-team-name">{name}</span>
            </Button>
          ))}
        </div>
      )
    case 'setterKind':
      return <OptionGrid ariaLabel="Who set the ball" autoFocusFirst options={SETTER_KINDS.map((k) => ({ value: k, label: SETTER_KIND_LABELS[k] }))} onPick={(kind) => onAnswer({ step: 'setterKind', kind })} />
    case 'setterPosition':
      return (
        <OptionGrid
          ariaLabel="Setter position"
          autoFocusFirst
          options={ATTACK_POSITIONS.map((p) => ({ value: p, label: ATTACK_POSITION_LABELS[p] }))}
          onPick={(position) => onAnswer({ step: 'setterPosition', position })}
        />
      )
    case 'hitterPosition':
      return (
        <OptionGrid
          ariaLabel="Hitter position"
          autoFocusFirst
          options={ATTACK_POSITIONS.map((p) => ({ value: p, label: ATTACK_POSITION_LABELS[p] }))}
          onPick={(position) => onAnswer({ step: 'hitterPosition', position })}
        />
      )
    case 'setterNumber':
    case 'hitterNumber':
      return (
        <>
          <OptionGrid ariaLabel="Jersey number" autoFocusFirst numbers options={numbers.map((n) => ({ value: n, label: n }))} onPick={(number) => onAnswer({ step, number })} />
          <Button variant="outline" size="lg" block className="flow-none" data-testid="flow-option-none" onClick={() => onAnswer({ step, number: null })}>
            No number
          </Button>
        </>
      )
    case 'height':
      return <OptionGrid ariaLabel="Set height" autoFocusFirst options={SET_HEIGHTS.map((h) => ({ value: h, label: HEIGHT_LABELS[h] }))} onPick={(height) => onAnswer({ step: 'height', height })} />
    case 'result':
      return <OptionGrid ariaLabel="Result" autoFocusFirst options={HIT_RESULTS.map((r) => ({ value: r, label: RESULT_LABELS[r] }))} onPick={(result) => onAnswer({ step: 'result', result })} />
    case 'setFrom':
    case 'hitFrom':
      // Court steps are rendered on the court itself, never in the panel.
      return null
  }
}
