import { describe, expect, it } from 'vitest'
import { COURT_MARGIN, COURT_WIDTH, fromSvg, nameFontSize, physicalToTeam, teamToPhysical, toSvg, viewBoxSize } from './Court'

describe('Court geometry', () => {
  it('draws the vertical court as the horizontal one rotated 90° clockwise', () => {
    const { h } = viewBoxSize('horizontal')
    for (const [u, v] of [
      [0, 0],
      [0.25, 0.1],
      [0.9, 0.95],
      [-0.05, 0.5],
    ] as const) {
      const hz = toSvg(u, v, 'horizontal')
      const vt = toSvg(u, v, 'vertical')
      // (x, y) → (H − y, x)
      expect(vt.x).toBeCloseTo(h - hz.y)
      expect(vt.y).toBeCloseTo(hz.x)
    }
    // the viewer-left sideline (small x) of the vertical court is the v = 1 sideline
    const left = fromSvg(COURT_MARGIN * 100, 500, 'vertical')
    expect(left.v).toBeCloseTo(1)
    const right = fromSvg((COURT_MARGIN + COURT_WIDTH) * 100, 500, 'vertical')
    expect(right.v).toBeCloseTo(0)
  })

  it('fromSvg inverts toSvg in both orientations', () => {
    for (const o of ['horizontal', 'vertical'] as const) {
      const p = toSvg(0.3, 0.8, o)
      const back = fromSvg(p.x, p.y, o)
      expect(back.u).toBeCloseTo(0.3)
      expect(back.v).toBeCloseTo(0.8)
    }
  })

  it('round-trips team-relative points through the physical frame', () => {
    const p = { x: 0.2, y: 0.7 }
    for (const swap of [false, true]) {
      const { u, v } = teamToPhysical(p, 1, swap)
      const back = physicalToTeam(u, v, 1, swap)
      expect(back.x).toBeCloseTo(p.x)
      expect(back.y).toBeCloseTo(p.y)
    }
  })

  it('shrinks the team-name font so long names stay inside their half', () => {
    expect(nameFontSize('Hawks', 'horizontal')).toBe(110)
    expect(nameFontSize('Hawks', 'vertical')).toBe(90)
    const long = nameFontSize('Northwestern Wildcats', 'vertical')
    expect(long).toBeLessThan(90)
    // estimated width never exceeds the half minus padding (780 units)
    expect('Northwestern Wildcats'.length * long * 0.75).toBeLessThanOrEqual(780 + 1e-6)
    expect(nameFontSize('A'.repeat(40), 'horizontal')).toBe(36)
  })
})
