import { describe, expect, it } from 'vitest'
import { breadcrumbFor, joinBreadcrumb } from './breadcrumb'

describe('breadcrumbFor', () => {
  it('is empty for an empty draft', () => {
    expect(breadcrumbFor({})).toEqual([])
    expect(joinBreadcrumb(breadcrumbFor({}))).toBe('')
  })

  it('lists answers in flow order', () => {
    const parts = breadcrumbFor(
      { teamIndex: 0, setFrom: { x: 0.2, y: 0.5 }, hitFrom: { x: 0.4, y: 0.1 }, setter: { kind: 'setter', number: '7' }, height: 'tempo', hitter: { position: 'outside', number: '12' } },
      { setNumber: 2, showSetNumber: true },
    )
    expect(parts).toEqual(['Set 2', 'Set location', 'Hit location', 'Setter #7', 'Tempo', 'Outside #12'])
    expect(joinBreadcrumb(parts)).toBe('Set 2 · Set location · Hit location · Setter #7 · Tempo · Outside #12')
  })

  it('omits the set number when hidden and labels an "other" setter by position', () => {
    expect(breadcrumbFor({ setter: { kind: 'other', position: 'middle' } }, { setNumber: 1, showSetNumber: false })).toEqual(['Middle'])
    expect(breadcrumbFor({ setter: { kind: 'other' } })).toEqual(['Other'])
  })
})
