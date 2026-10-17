import { describe, expect, it } from 'vitest'
import { emptyRoster, type Roster, type Team } from '../lib/types'
import { planNewGame, reducer, type AppState } from './store'
import { defaultSettings } from '../lib/settings'

const hawksRoster: Roster = { libero: ['3'], setter: ['7', '9'], middle: ['12', '15'], outside: ['1', '2', '10'], rightside: ['8'] }
const tigersRoster: Roster = { libero: ['5'], setter: ['4'], middle: ['11', '14'], outside: ['6', '13'], rightside: [] }

function team(id: string, name: string, roster: Roster, isPrimary = false): Team {
  return { id, name, roster, isPrimary, createdAt: 1, updatedAt: 1 }
}
const saved = [team('t_hawks', 'Hawks', hawksRoster, true), team('t_tigers', 'Tigers', tigersRoster)]

describe('planNewGame', () => {
  it('keeps a saved team\'s roster when the form roster was not edited for it', () => {
    // Form pre-filled with the primary (Hawks) roster, then the name replaced by another saved team.
    const { game, teams } = planNewGame(saved, { name: 'Tigers', roster: hawksRoster, teamId: 't_tigers', updateSavedRoster: false }, { name: 'Comets', roster: emptyRoster() }, 5)
    // the saved Tigers roster is untouched; the game snapshots what was in the form
    expect(teams.find((t) => t.id === 't_tigers')).toMatchObject({ roster: tigersRoster, updatedAt: 1 })
    expect(game.teams[0]).toMatchObject({ teamId: 't_tigers', name: 'Tigers', roster: hawksRoster })
    expect(game.teams[1].teamId).toMatch(/^t_/)
    expect(teams.find((t) => t.name === 'Comets')?.roster).toEqual(emptyRoster())
  })

  it('updates the saved roster when the coach edited it', () => {
    const edited: Roster = { ...tigersRoster, setter: ['4', '21'] }
    const { teams } = planNewGame(saved, { name: 'Tigers', roster: edited, teamId: 't_tigers', updateSavedRoster: true }, { name: 'Comets', roster: emptyRoster() }, 5)
    expect(teams.find((t) => t.id === 't_tigers')).toMatchObject({ roster: edited, updatedAt: 5 })
  })

  it('by default replaces a saved roster with a non-empty form roster but never wipes it with an empty one', () => {
    const edited: Roster = { ...tigersRoster, libero: [] }
    const a = planNewGame(saved, { name: 'tigers', roster: edited }, { name: 'Comets', roster: emptyRoster() }, 5)
    expect(a.teams.find((t) => t.id === 't_tigers')).toMatchObject({ name: 'tigers', roster: edited })
    const b = planNewGame(saved, { name: 'Tigers', roster: emptyRoster() }, { name: 'Comets', roster: emptyRoster() }, 5)
    expect(b.teams.find((t) => t.id === 't_tigers')).toMatchObject({ roster: tigersRoster, updatedAt: 1 })
    expect(b.game.teams[0].roster).toEqual(emptyRoster())
  })

  it('reducer upserts the planned teams without duplicating existing ones', () => {
    const state: AppState = { games: [], teams: saved, settings: defaultSettings() }
    const plan = planNewGame(saved, { name: 'Hawks', roster: hawksRoster }, { name: 'Tigers', roster: { ...tigersRoster, rightside: ['9'] } }, 5)
    const next = reducer(state, { type: 'createGame', ...plan })
    expect(next.games).toHaveLength(1)
    expect(next.teams.map((t) => t.id).sort()).toEqual(['t_hawks', 't_tigers'])
    expect(next.teams.find((t) => t.id === 't_tigers')?.roster.rightside).toEqual(['9'])
    expect(next.teams.find((t) => t.id === 't_hawks')?.isPrimary).toBe(true)
  })
})
