import { describe, expect, it } from 'vitest'
import { formatPct, formatSigned, lineOf, summarize, teamAllPlays, teamGameSeries } from './stats'
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
    expect(line).toEqual({ sets: 4, kills: 2, errors: 1, settingPct: 0.5, efficiency: 0.25 })
    expect(lineOf([])).toEqual({ sets: 0, kills: 0, errors: 0, settingPct: null, efficiency: null })
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
    expect(formatSigned(12.34, 1, ' pts')).toBe('+12.3 pts')
    expect(formatSigned(-3, 0, '%')).toBe('−3%')
    expect(formatSigned(0)).toBe('0.0')
  })
})
