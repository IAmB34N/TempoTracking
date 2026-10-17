import { describe, expect, it } from 'vitest'
import { formatPct, formatSigned, lineOf, roundPct, sharesSummingTo100, summarize, teamAllPlays, teamGameSeries } from './stats'
import { emptyRoster, type Game, type Play } from './types'

let n = 0
function play(partial: Partial<Play>): Play {
  n++
  return { id: 'p' + n, gameId: 'g', teamIndex: 0, setNumber: 1, createdAt: n, ...partial }
}

function game(id: string, createdAt: number, teamIds: [string, string], plays: Play[]): Game {
  return {
    id,
    createdAt,
    updatedAt: createdAt,
    teams: [
      { teamId: teamIds[0], name: teamIds[0].toUpperCase(), roster: emptyRoster() },
      { teamId: teamIds[1], name: teamIds[1].toUpperCase(), roster: emptyRoster() },
    ],
    currentSet: 1,
    swapSides: false,
    plays: plays.map((p) => ({ ...p, gameId: id })),
  }
}

describe('stats', () => {
  it('computes setting percentage, errors and efficiency', () => {
    const line = lineOf([
      play({ result: 'kill' }),
      play({ result: 'kill' }),
      play({ result: 'out' }),
      play({ result: 'notkill' }),
    ])
    expect(line).toEqual({ sets: 4, kills: 2, errors: 1, noResult: 0, settingPct: 0.5, efficiency: 0.25 })
    expect(lineOf([])).toEqual({ sets: 0, kills: 0, errors: 0, noResult: 0, settingPct: null, efficiency: null })
  })

  it('reports sets without a result or height separately so every table sums to the total', () => {
    const s = summarize([play({}), play({ result: 'kill' }), play({ height: 'tempo' })])
    expect(s.sets).toBe(3)
    expect(s.noResult).toBe(2)
    // only the scored set counts towards Setting %
    expect(s.settingPct).toBe(1)
    expect(s.efficiency).toBe(1)
    expect(Object.values(s.byResult).reduce((a, b) => a + b, 0) + s.noResult).toBe(s.sets)
    expect(Object.values(s.byHeight).reduce((a, l) => a + l.sets, 0) + s.noHeight.sets).toBe(s.sets)
    expect(s.noHeight.sets).toBe(2)
    expect(s.noHeight.kills).toBe(1)
    // nothing scored at all → no Setting % rather than 0 %
    const none = summarize([play({}), play({ height: 'fast' })])
    expect(none.settingPct).toBeNull()
    expect(none.efficiency).toBeNull()
    expect(none.noResult).toBe(2)
    expect(none.byHeight.fast.settingPct).toBeNull()
  })

  it('ignores result values outside the known set', () => {
    const s = summarize([play({ result: 'nope' as Play['result'] })])
    expect(Object.values(s.byResult).every((n) => Number.isFinite(n))).toBe(true)
    expect((s.byResult as Record<string, number>)['nope']).toBeUndefined()
  })

  it('breaks down by height, setter, hitter, result and set number', () => {
    const s = summarize([
      play({ height: 'tempo', setter: { kind: 'setter', number: '7' }, hitter: { position: 'outside', number: '1' }, result: 'kill' }),
      play({ height: 'tempo', setter: { kind: 'setter', number: '7' }, hitter: { position: 'middle' }, result: 'blocked', setNumber: 2 }),
      play({ height: 'bump', setter: { kind: 'other' }, hitter: { position: 'other' }, result: 'tip' }),
      play({}),
    ])
    expect(s.sets).toBe(4)
    expect(s.byHeight.tempo.sets).toBe(2)
    expect(s.byHeight.tempo.kills).toBe(1)
    expect(s.byHeight.minus.sets).toBe(0)
    expect(s.bySetter['Setter #7']?.sets).toBe(2)
    expect(s.bySetter['Other']?.sets).toBe(1)
    expect(s.bySetter['Unknown']?.sets).toBe(1)
    expect(s.byHitter['Outside #1']?.kills).toBe(1)
    expect(s.byHitter['Middle']?.errors).toBe(1)
    expect(s.byResult.kill).toBe(1)
    expect(s.byResult.blocked).toBe(1)
    expect(s.bySetNumber[1]?.sets).toBe(3)
    expect(s.bySetNumber[2]?.sets).toBe(1)
  })

  it('builds a chronological per-game series with deltas for a team', () => {
    const g1 = game('g1', 100, ['a', 'b'], [play({ result: 'kill' }), play({ result: 'out' })]) // 50%
    const g2 = game('g2', 200, ['c', 'a'], [play({ teamIndex: 1, result: 'kill' }), play({ teamIndex: 1, result: 'kill' }), play({ teamIndex: 1, result: 'tip' }), play({ teamIndex: 1, result: 'net' })]) // 50%
    const g3 = game('g3', 300, ['a', 'c'], [play({ result: 'kill' }), play({ result: 'kill' }), play({ result: 'kill' }), play({ result: 'roll' })]) // 75%
    const g4 = game('g4', 400, ['a', 'b'], []) // no sets
    const series = teamGameSeries([g3, g1, g4, g2], 'a')
    expect(series.map((p) => p.gameId)).toEqual(['g1', 'g2', 'g3', 'g4'])
    expect(series.map((p) => p.opponent)).toEqual(['B', 'C', 'C', 'B'])
    expect(series[0]!.deltaPts).toBeNull()
    expect(series[1]!.deltaPts).toBeCloseTo(0)
    expect(series[1]!.deltaRelPct).toBeCloseTo(0)
    expect(series[2]!.deltaPts).toBeCloseTo(25)
    expect(series[2]!.deltaRelPct).toBeCloseTo(50)
    expect(series[3]!.summary.settingPct).toBeNull()
    expect(series[3]!.deltaPts).toBeNull()
    expect(teamAllPlays([g1, g2, g3, g4], 'a')).toHaveLength(10)
  })

  it('formats percentages and signed deltas', () => {
    expect(formatPct(0.4567)).toBe('45.7%')
    expect(formatPct(null)).toBe('—')
    // negatives use the Unicode minus like formatSigned, and tiny negatives never print "−0.0%"
    expect(formatPct(-0.125)).toBe('−12.5%')
    expect(formatPct(-0.0001)).toBe('0.0%')
    expect(formatSigned(12.34, 1, ' pts')).toBe('+12.3 pts')
    expect(formatSigned(-3, 0, '%')).toBe('−3%')
    expect(formatSigned(0)).toBe('0.0')
    // the sign follows the rounded value, so it always agrees with the printed digits
    expect(formatSigned(-0.04, 1, ' pts')).toBe('0.0 pts')
    expect(formatSigned(0.04, 1, '%')).toBe('0.0%')
    expect(formatSigned(-0.05, 1)).toBe('−0.1')
  })

  it('computes game-over-game points from the displayed (rounded) percentages', () => {
    // 4/13 = 30.77% → 3/14 = 21.43%: displayed 30.8% → 21.4% must read −9.4 pts, not −9.3
    const g1 = game('g1', 100, ['a', 'b'], [...Array.from({ length: 4 }, () => play({ result: 'kill' })), ...Array.from({ length: 9 }, () => play({ result: 'tip' }))])
    const g2 = game('g2', 200, ['a', 'b'], [...Array.from({ length: 3 }, () => play({ result: 'kill' })), ...Array.from({ length: 11 }, () => play({ result: 'tip' }))])
    const series = teamGameSeries([g1, g2], 'a')
    expect(series[1]!.deltaPts).toBeCloseTo(-9.4)
    expect(formatSigned(series[1]!.deltaPts, 1, ' pts')).toBe('−9.4 pts')
    expect(roundPct(4 / 13)).toBe(30.8)
    expect(roundPct(3 / 14)).toBe(21.4)
  })

  it('rounds shares so they add up to exactly 100', () => {
    // 16 sets: plain rounding would give 18.8+6.3+6.3+6.3+0.0+12.5+18.8+31.3 = 100.3; ties on .5 go to the earlier rows
    const shares = sharesSummingTo100([3, 1, 1, 1, 0, 2, 3, 5])
    expect(shares.reduce((s, v) => s + v, 0)).toBeCloseTo(100, 6)
    expect(shares).toEqual([18.8, 6.3, 6.3, 6.2, 0, 12.5, 18.7, 31.2])
    expect(sharesSummingTo100([1, 1, 1]).reduce((s, v) => s + v, 0)).toBeCloseTo(100, 6)
    expect(sharesSummingTo100([2, 1]).reduce((s, v) => s + v, 0)).toBeCloseTo(100, 6)
    expect(sharesSummingTo100([0, 0])).toEqual([0, 0])
    expect(sharesSummingTo100([])).toEqual([])
    expect(sharesSummingTo100([7])).toEqual([100])
  })
})
