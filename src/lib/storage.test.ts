import { describe, expect, it } from 'vitest'
import { playSummary } from './labels'
import { summarize } from './stats'
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

  it('drops unknown setter/hitter/height/result values instead of keeping them verbatim', () => {
    const s = parseState(
      JSON.stringify({
        teams: [],
        games: [
          {
            id: 'g',
            teams: [{ name: 'A' }, { name: 'B' }],
            plays: [
              { id: 'p1', height: 'xyz', result: 'nope', setter: { kind: 'bogus', number: 7 }, hitter: { position: 'zzz' } },
              { id: 'p2', height: 'tempo', result: 'kill', setter: { kind: 'other', position: 'outside', number: 7 }, hitter: { position: 'middle', number: ' 15 ' } },
              { id: 'p3', setter: { kind: 'setter', position: 'outside' }, hitter: 'nope' },
            ],
          },
        ],
      }),
    )
    const [p1, p2, p3] = s.games[0]!.plays
    expect(p1).toEqual({ id: 'p1', gameId: 'g', teamIndex: 0, setNumber: 1, createdAt: 0 })
    expect(p2).toMatchObject({ height: 'tempo', result: 'kill', setter: { kind: 'other', position: 'outside', number: '7' }, hitter: { position: 'middle', number: '15' } })
    // position only applies to "other" setters
    expect(p3!.setter).toEqual({ kind: 'setter' })
    expect(p3!.hitter).toBeUndefined()
    expect(summarize(s.games[0]!.plays).byResult.kill).toBe(1)
    expect(playSummary(p1!)).toBe('Set logged')
  })

  it('rejects a game whose two sides share a teamId', () => {
    const s = parseState(
      JSON.stringify({
        teams: [],
        games: [
          { id: 'same', teams: [{ teamId: 'a', name: 'A' }, { teamId: 'a', name: 'A' }], plays: [] },
          { id: 'same-name', teams: [{ name: 'Hawks ' }, { name: ' hawks' }], plays: [] },
          { id: 'ok', teams: [{ name: 'Hawks' }, { name: 'Tigers' }], plays: [] },
        ],
      }),
    )
    expect(s.games.map((g) => g.id)).toEqual(['ok'])
    expect(s.games[0]!.teams.map((t) => t.teamId)).toEqual(['hawks', 'tigers'])
  })

  it('rejects files that are not Tempo exports', () => {
    expect(() => parseState('{"hello":1}')).toThrow()
    expect(() => parseState('[]')).toThrow()
    expect(() => parseState('not json')).toThrow()
  })
})
