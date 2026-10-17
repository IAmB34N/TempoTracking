import { describe, expect, it } from 'vitest'
import { parseState, serialize } from './storage'

describe('storage', () => {
  it('round-trips a state and drops malformed records', () => {
    const text = JSON.stringify({
      version: 1,
      teams: [
        { id: 't1', name: ' Hawks ', roster: { setter: ['7', 7, '7', ''], bogus: ['1'] }, isPrimary: true },
        { id: 't2', name: 'Tigers', isPrimary: true },
        { name: 'no id' },
      ],
      games: [
        {
          id: 'g1',
          teams: [{ teamId: 't1', name: 'Hawks' }, { teamId: 't2', name: 'Tigers' }],
          currentSet: 2.4,
          plays: [{ id: 'p1', teamIndex: 1, setNumber: 2, setFrom: { x: 0.2, y: 0.5 }, result: 'kill' }, { nope: true }],
        },
        { id: 'broken', teams: [{ name: 'only one' }] },
      ],
      settings: { darkMode: true, steps: { whoSet: false }, layout: { scale: 'lg' } },
    })
    const s = parseState(text)
    expect(s.teams.map((t) => t.name)).toEqual(['Hawks', 'Tigers'])
    expect(s.teams[0]!.roster.setter).toEqual(['7'])
    expect(s.teams.filter((t) => t.isPrimary)).toHaveLength(1)
    expect(s.games).toHaveLength(1)
    expect(s.games[0]!.currentSet).toBe(2)
    expect(s.games[0]!.plays).toHaveLength(1)
    expect(s.games[0]!.plays[0]!.teamIndex).toBe(1)
    expect(s.settings.darkMode).toBe(true)
    expect(s.settings.steps.whoSet).toBe(false)
    expect(s.settings.steps.hitResult).toBe(true)
    expect(s.settings.layout.scale).toBe('lg')
    const again = parseState(serialize(s))
    expect(again).toEqual(s)
  })

  it('rejects files that are not Tempo exports', () => {
    expect(() => parseState('{"hello":1}')).toThrow()
    expect(() => parseState('[]')).toThrow()
    expect(() => parseState('not json')).toThrow()
  })
})
