import { useId, useMemo, useState, type FormEvent } from 'react'
import { IconPlay, IconSwap } from '../components/Icons'
import { RosterEditor } from '../components/RosterEditor'
import { Button, TopBar, useToast } from '../components/ui'
import { navigate, routes } from '../lib/router'
import { emptyRoster, rosterSize, type Roster, type Team, type TeamIndex } from '../lib/types'
import { useStore, type NewGameTeamInput } from '../state/store'
import './NewGame.css'

export interface TeamForm {
  name: string
  roster: Roster
}

const SIDE = ['a', 'b'] as const
const SIDE_LABEL = ['Team A', 'Team B'] as const

export function findTeamByName(teams: readonly Team[], name: string): Team | undefined {
  const key = name.trim().toLowerCase()
  if (!key) return undefined
  return teams.find((t) => t.name.trim().toLowerCase() === key)
}

export function sameRoster(a: Roster, b: Roster): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Why the form can't be started yet, or null when it can. */
export function startBlocker(forms: readonly [TeamForm, TeamForm]): string | null {
  const [a, b] = forms.map((f) => f.name.trim())
  if (!a || !b) return 'Enter both team names to start.'
  if (a!.toLowerCase() === b!.toLowerCase()) return 'Team names must be different.'
  return null
}

function initialForms(teams: readonly Team[]): [TeamForm, TeamForm] {
  const primary = teams.find((t) => t.isPrimary)
  return [primary ? { name: primary.name, roster: primary.roster } : { name: '', roster: emptyRoster() }, { name: '', roster: emptyRoster() }]
}

export default function NewGame() {
  const { state, createGame } = useStore()
  const toast = useToast()
  const listId = useId()
  const [forms, setForms] = useState<[TeamForm, TeamForm]>(() => initialForms(state.teams))

  const savedTeams = useMemo(() => [...state.teams].sort((x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base' })), [state.teams])

  const update = (index: TeamIndex, patch: Partial<TeamForm>) =>
    setForms((prev) => {
      const next: [TeamForm, TeamForm] = [prev[0], prev[1]]
      next[index] = { ...prev[index], ...patch }
      return next
    })

  const onNameChange = (index: TeamIndex, name: string) => {
    const match = findTeamByName(state.teams, name)
    // A matching saved team fills an empty roster automatically; a non-empty one needs confirmation.
    if (match && rosterSize(forms[index].roster) === 0) update(index, { name, roster: match.roster })
    else update(index, { name })
  }

  const loadSaved = (index: TeamIndex, team: Team) => {
    update(index, { name: team.name, roster: team.roster })
    toast.show(`Loaded the ${team.name} roster.`)
  }

  const swap = () => setForms(([a, b]) => [b, a])

  const blocker = startBlocker(forms)

  const start = (e?: FormEvent) => {
    e?.preventDefault()
    if (blocker) return
    const toInput = (f: TeamForm): NewGameTeamInput => ({ name: f.name.trim(), roster: f.roster, teamId: findTeamByName(state.teams, f.name)?.id })
    const id = createGame(toInput(forms[0]), toInput(forms[1]))
    navigate(routes.game(id))
  }

  return (
    <div className="page">
      <TopBar
        title="New Game"
        back="/"
        right={
          <Button variant="ghost" size="sm" icon={<IconSwap size={18} />} onClick={swap} aria-label="Swap Team A and Team B">
            Swap A ⇄ B
          </Button>
        }
      />
      <form className="page-content newgame" onSubmit={start} noValidate>
        <datalist id={listId}>
          {savedTeams.map((t) => (
            <option key={t.id} value={t.name} />
          ))}
        </datalist>

        <div className="newgame-teams">
          {([0, 1] as const).map((index) => {
            const form = forms[index]
            const side = SIDE[index]
            const match = findTeamByName(state.teams, form.name)
            const canLoad = !!match && !sameRoster(match.roster, form.roster)
            const empty = rosterSize(form.roster) === 0
            const nameId = `team-name-${side}`
            const savedId = `team-saved-${side}`
            return (
              <fieldset key={side} className={`card card-${side} newgame-card`}>
                <legend className="visually-hidden">{SIDE_LABEL[index]}</legend>
                <div className="card-title">
                  <span className={`badge badge-${side}`}>{SIDE_LABEL[index]}</span>
                  {form.name.trim() && <span className={`newgame-card-name text-${side}`}>{form.name.trim()}</span>}
                </div>

                <div className="field">
                  <label className="label" htmlFor={nameId}>
                    Team name
                  </label>
                  <input
                    id={nameId}
                    className="input"
                    data-testid={`team-name-${index}`}
                    list={listId}
                    value={form.name}
                    placeholder={index === 0 ? 'e.g. Hawks' : 'e.g. Tigers'}
                    autoComplete="off"
                    autoCapitalize="words"
                    maxLength={40}
                    enterKeyHint="next"
                    onChange={(e) => onNameChange(index, e.target.value)}
                  />
                  {canLoad && match && (
                    <div className="newgame-load">
                      <span className="small muted">Saved team found.</span>
                      <Button variant="outline" size="sm" onClick={() => loadSaved(index, match)} data-testid={`load-roster-${index}`}>
                        Load saved roster
                      </Button>
                    </div>
                  )}
                </div>

                {savedTeams.length > 0 && (
                  <div className="field">
                    <label className="label" htmlFor={savedId}>
                      Use saved team…
                    </label>
                    <select
                      id={savedId}
                      className="input select"
                      data-testid={`team-saved-${index}`}
                      value=""
                      onChange={(e) => {
                        const team = state.teams.find((t) => t.id === e.target.value)
                        if (team) loadSaved(index, team)
                      }}
                    >
                      <option value="">Choose a saved team…</option>
                      {savedTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.isPrimary ? ' (primary)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="newgame-roster">
                  <h3 className="section-title">Jersey numbers</h3>
                  <RosterEditor roster={form.roster} onChange={(roster) => update(index, { roster })} team={side} idPrefix={side} />
                  {empty && (
                    <p className="small muted newgame-warning" role="note">
                      No numbers yet — number steps will be skipped for this team.
                    </p>
                  )}
                </div>
              </fieldset>
            )
          })}
        </div>

        <div className="newgame-start">
          <Button type="submit" variant="primary" size="xl" block icon={<IconPlay size={24} />} data-testid="start-game" disabled={!!blocker} aria-describedby="newgame-hint">
            Start Game
          </Button>
          <p id="newgame-hint" className="small muted center newgame-hint" aria-live="polite">
            {blocker ?? `${forms[0].name.trim()} vs ${forms[1].name.trim()} — tap Start to open the court.`}
          </p>
        </div>
      </form>
    </div>
  )
}
