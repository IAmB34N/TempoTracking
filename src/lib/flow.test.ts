import { describe, expect, it } from 'vitest'
import { applyAnswer, firstStep, nextStep, numbersForStep, type Draft, type Rosters } from './flow'
import { defaultSettings } from './settings'
import { emptyRoster, type Roster } from './types'

const rosterA: Roster = { libero: ['3'], setter: ['7', '9'], middle: ['12'], outside: ['1', '2'], rightside: [] }
const rosterB: Roster = emptyRoster()
const rosters: Rosters = [rosterA, rosterB]

function walk(draftAnswers: (draft: Draft, step: string) => Draft, settings = defaultSettings()) {
  const steps: string[] = []
  let draft: Draft = {}
  let step = nextStep(null, draft, settings, rosters)
  while (step) {
    steps.push(step)
    draft = draftAnswers(draft, step)
    step = nextStep(step, draft, settings, rosters)
  }
  return { steps, draft }
}

describe('flow', () => {
  it('starts with the court when set location is enabled, otherwise the team', () => {
    expect(firstStep(defaultSettings(), rosters)).toBe('setFrom')
    const s = defaultSettings()
    s.steps.setLocation = false
    expect(firstStep(s, rosters)).toBe('team')
  })

  it('walks the full path for a setter with numbers and an outside hitter', () => {
    const { steps } = walk((d, step) => {
      switch (step) {
        case 'setFrom':
          return applyAnswer(d, { step, point: { x: 0.3, y: 0.5 }, teamIndex: 0 })
        case 'hitFrom':
          return applyAnswer(d, { step, point: { x: 0.4, y: 0.1 } })
        case 'setterKind':
          return applyAnswer(d, { step, kind: 'setter' })
        case 'setterNumber':
          return applyAnswer(d, { step, number: '7' })
        case 'height':
          return applyAnswer(d, { step, height: 'tempo' })
        case 'hitterPosition':
          return applyAnswer(d, { step, position: 'outside' })
        case 'hitterNumber':
          return applyAnswer(d, { step, number: '2' })
        case 'result':
          return applyAnswer(d, { step, result: 'kill' })
        default:
          throw new Error('unexpected ' + step)
      }
    })
    expect(steps).toEqual(['setFrom', 'hitFrom', 'setterKind', 'setterNumber', 'height', 'hitterPosition', 'hitterNumber', 'result'])
  })

  it('asks for a position when the setter is "other" and skips numbers when the roster is empty', () => {
    const { steps, draft } = walk((d, step) => {
      switch (step) {
        case 'setFrom':
          return applyAnswer(d, { step, point: { x: 0.3, y: 0.5 }, teamIndex: 0 })
        case 'hitFrom':
          return applyAnswer(d, { step, point: { x: 0.4, y: 0.1 } })
        case 'setterKind':
          return applyAnswer(d, { step, kind: 'other' })
        case 'setterPosition':
          return applyAnswer(d, { step, position: 'rightside' }) // team A has no right sides
        case 'height':
          return applyAnswer(d, { step, height: 'bump' })
        case 'hitterPosition':
          return applyAnswer(d, { step, position: 'other' })
        case 'result':
          return applyAnswer(d, { step, result: 'out' })
        default:
          throw new Error('unexpected ' + step)
      }
    })
    expect(steps).toEqual(['setFrom', 'hitFrom', 'setterKind', 'setterPosition', 'height', 'hitterPosition', 'result'])
    expect(draft.setter).toEqual({ kind: 'other', position: 'rightside' })
    expect(draft.hitter).toEqual({ position: 'other' })
  })

  it('offers "other" position setters that position\'s roster', () => {
    const draft = applyAnswer(applyAnswer({ teamIndex: 0 }, { step: 'setterKind', kind: 'other' }), {
      step: 'setterPosition',
      position: 'outside',
    })
    expect(nextStep('setterPosition', draft, defaultSettings(), rosters)).toBe('setterNumber')
    expect(numbersForStep('setterNumber', draft, rosters)).toEqual(['1', '2'])
  })

  it('skips every disabled step and always ends', () => {
    const s = defaultSettings()
    s.steps = { setLocation: false, hitLocation: false, whoSet: false, setHeight: false, whoHit: false, hitResult: false }
    const { steps } = walk((d, step) => {
      if (step === 'team') return applyAnswer(d, { step, teamIndex: 1 })
      throw new Error('unexpected ' + step)
    }, s)
    expect(steps).toEqual(['team'])
  })

  it('skips number steps for the team with an empty roster', () => {
    const s = defaultSettings()
    const draft = applyAnswer({ teamIndex: 1 }, { step: 'setterKind', kind: 'libero' })
    expect(nextStep('setterKind', draft, s, rosters)).toBe('height')
  })

  it('"No number" removes a previously chosen number', () => {
    let d: Draft = applyAnswer({ teamIndex: 0 }, { step: 'setterKind', kind: 'libero' })
    d = applyAnswer(d, { step: 'setterNumber', number: '3' })
    expect(d.setter?.number).toBe('3')
    d = applyAnswer(d, { step: 'setterNumber', number: null })
    expect(d.setter).toEqual({ kind: 'libero' })
  })
})
