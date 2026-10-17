import { useMemo, useState, type KeyboardEvent } from 'react'
import { IconStar, IconTrash } from '../components/Icons'
import { RosterEditor } from '../components/RosterEditor'
import { Button, TopBar, useConfirm, useToast } from '../components/ui'
import { POSITION_PLURALS } from '../lib/labels'
import { Link, navigate, routes } from '../lib/router'
import { formatPct, formatSigned, summarize, teamAllPlays, teamGameSeries, type GameSeriesPoint } from '../lib/stats'
import { POSITIONS, normalizeRoster, rosterSize, type Roster, type Team } from '../lib/types'
import { useStore } from '../state/store'
import './Teams.css'

function deltaClass(value: number | null): string {
  if (value === null || Math.abs(value) < 0.05) return 'delta-flat'
  return value > 0 ? 'delta-up' : 'delta-down'
}

function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Bar height as a share (0..1) of the chart, scaled so the best game fills it. */
function barShare(pct: number | null, maxPct: number): number {
  if (pct === null || maxPct <= 0) return 0
  return Math.max(0, Math.min(1, pct / maxPct))
}

export default function TeamDetail({ teamId }: { teamId: string }) {
  const { getTeam } = useStore()
  const team = getTeam(teamId)

  if (!team) {
    return (
      <div className="page">
        <TopBar title="Team" back={routes.teams()} />
        <div className="page-content">
          <div className="empty">Team not found. It may have been deleted.</div>
          <Button variant="primary" size="lg" onClick={() => navigate(routes.teams())}>
            All Teams
          </Button>
        </div>
      </div>
    )
  }

  return <TeamView key={team.id} team={team} />
}

function TeamView({ team }: { team: Team }) {
  const { state, upsertTeam, setPrimaryTeam, deleteTeam } = useStore()
  const toast = useToast()
  const confirm = useConfirm()

  const series = useMemo(() => teamGameSeries(state.games, team.id), [state.games, team.id])
  const overall = useMemo(() => summarize(teamAllPlays(state.games, team.id)), [state.games, team.id])
  const newestFirst = useMemo(() => [...series].reverse(), [series])
  const maxPct = useMemo(() => series.reduce((m, p) => Math.max(m, p.summary.settingPct ?? 0), 0), [series])

  const togglePrimary = () => {
    if (team.isPrimary) {
      setPrimaryTeam(null)
      toast.show(`${team.name} is no longer the primary team.`)
    } else {
      setPrimaryTeam(team.id)
      toast.show(`${team.name} is now the primary team.`, { tone: 'success' })
    }
  }

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${team.name}?`,
      message: 'Past games keep their own copy of the roster.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    deleteTeam(team.id)
    toast.show(`Deleted ${team.name}.`, { tone: 'danger' })
    navigate(routes.teams())
  }

  const starButton = (
    <button
      type="button"
      className={['team-icon-btn', team.isPrimary ? 'is-primary' : ''].join(' ')}
      data-testid="team-primary-toggle"
      aria-pressed={team.isPrimary}
      aria-label={team.isPrimary ? `Unset ${team.name} as primary team` : `Set ${team.name} as primary team`}
      title={team.isPrimary ? 'Primary team' : 'Set as primary'}
      onClick={togglePrimary}
    >
      <IconStar size={22} filled={team.isPrimary} />
    </button>
  )

  return (
    <div className="page team-detail">
      <TopBar title={team.name} back={routes.teams()} right={starButton} subtitle={team.isPrimary ? 'Primary team' : undefined} />
      <div className="page-content">
        <section className="card card-a" aria-labelledby="team-overall-title">
          <div className="card-title">
            <h2 id="team-overall-title" className="section-title">
              Overall
            </h2>
            {team.isPrimary && <span className="badge badge-primary">Primary</span>}
          </div>
          <div className="stat-tiles">
            <Tile label="Games" value={String(series.length)} />
            <Tile label="Sets" value={String(overall.sets)} />
            <Tile label="Kills" value={String(overall.kills)} />
            <Tile label="Setting %" value={formatPct(overall.settingPct)} primary title="Kills ÷ sets" />
            <Tile label="Efficiency" value={formatPct(overall.efficiency)} title="(Kills − errors) ÷ sets" />
          </div>
        </section>

        <section className="card team-games" aria-labelledby="team-games-title">
          <div className="card-title">
            <h2 id="team-games-title" className="section-title">
              Game by game
            </h2>
            <span className="muted small">Newest first</span>
          </div>
          {series.length === 0 ? (
            <div className="empty">No games yet for {team.name}.</div>
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col" className="team-col-opponent">
                        Opponent
                      </th>
                      <th scope="col">Sets</th>
                      <th scope="col">Kills</th>
                      <th scope="col">Setting %</th>
                      <th scope="col">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newestFirst.map((point, i) => (
                      <GameRow key={point.gameId} point={point} isFirstGame={i === newestFirst.length - 1} />
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted small team-footnote">Change compares each game's Setting % with the game before it, in percentage points (relative change in brackets).</p>
            </>
          )}
        </section>

        {series.length > 0 && (
          <section className="card" aria-labelledby="team-trend-title">
            <div className="card-title">
              <h2 id="team-trend-title" className="section-title">
                Trend
              </h2>
              <span className="muted small">Setting % per game</span>
            </div>
            <div className="team-trend" role="img" aria-label={`Setting percentage trend across ${series.length} games`}>
              {series.map((point, i) => {
                const pct = point.summary.settingPct
                return (
                  <div key={point.gameId} className="team-trend-col">
                    <span className="team-trend-value">{formatPct(pct, 0)}</span>
                    <div className="team-trend-track">
                      <div
                        className={['team-trend-bar', pct === null ? 'is-empty' : '', i === series.length - 1 ? 'is-latest' : ''].filter(Boolean).join(' ')}
                        style={{ height: `${barShare(pct, maxPct) * 100}%` }}
                      />
                    </div>
                    <span className="team-trend-label">{shortDate(point.date)}</span>
                    <span className="team-trend-opponent">vs {point.opponent}</span>
                  </div>
                )
              })}
            </div>
            <table className="visually-hidden">
              <caption>Setting percentage by game, oldest first</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Opponent</th>
                  <th scope="col">Setting %</th>
                </tr>
              </thead>
              <tbody>
                {series.map((point) => (
                  <tr key={point.gameId}>
                    <td>{point.dateLabel}</td>
                    <td>{point.opponent}</td>
                    <td>{formatPct(point.summary.settingPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <RosterCard team={team} teams={state.teams} onSave={(next) => upsertTeam(next)} />

        <div className="team-actions">
          <Button variant={team.isPrimary ? 'outline' : 'primary'} size="lg" aria-pressed={team.isPrimary} icon={<IconStar size={20} filled={team.isPrimary} />} onClick={togglePrimary}>
            {team.isPrimary ? 'Primary team' : 'Set as primary'}
          </Button>
          <Button variant="danger" size="lg" icon={<IconTrash size={20} />} onClick={() => void remove()}>
            Delete team
          </Button>
        </div>
      </div>
    </div>
  )
}

function Tile({ label, value, primary, title }: { label: string; value: string; primary?: boolean; title?: string }) {
  return (
    <div className={['stat-tile', primary ? 'stat-tile-primary' : ''].filter(Boolean).join(' ')} title={title}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function GameRow({ point, isFirstGame }: { point: GameSeriesPoint; isFirstGame: boolean }) {
  const href = routes.stats(point.gameId)
  const open = () => navigate(href)
  const onKey = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open()
    }
  }
  return (
    <tr className="team-game-row" data-testid="team-game-row" onClick={open} onKeyDown={onKey}>
      <td className="team-game-when">
        <Link to={href} className="team-game-link" aria-label={`Stats for the game vs ${point.opponent} on ${point.dateLabel}`} onClick={(e) => e.stopPropagation()}>
          <span className="team-game-date-full">{point.dateLabel}</span>
          <span className="team-game-date-short" aria-hidden="true">
            {shortDate(point.date)}
          </span>
        </Link>
        <span className="team-game-opp" aria-hidden="true">
          vs {point.opponent}
        </span>
      </td>
      <td className="team-col-opponent">{point.opponent}</td>
      <td>{point.summary.sets}</td>
      <td>{point.summary.kills}</td>
      <td className="text-a">
        <strong>{formatPct(point.summary.settingPct)}</strong>
      </td>
      <td>
        {point.deltaPts === null ? (
          <span className="team-delta delta-flat">
            <span>—</span>
            {isFirstGame && <span className="team-delta-hint">first game</span>}
          </span>
        ) : (
          <span className={['team-delta', deltaClass(point.deltaPts)].join(' ')}>
            <span>{formatSigned(point.deltaPts, 1, ' pts')}</span>
            <span className="team-delta-rel">{point.deltaRelPct === null ? '—' : `(${formatSigned(point.deltaRelPct, 1, '%')})`}</span>
          </span>
        )}
      </td>
    </tr>
  )
}

function RosterCard({ team, teams, onSave }: { team: Team; teams: readonly Team[]; onSave: (team: Team) => void }) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(team.name)
  const [roster, setRoster] = useState<Roster>(team.roster)
  const players = rosterSize(team.roster)

  const startEdit = () => {
    setName(team.name)
    setRoster(team.roster)
    setEditing(true)
  }
  const cancel = () => setEditing(false)

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.show('Enter a team name.', { tone: 'danger' })
      return
    }
    const clash = teams.some((t) => t.id !== team.id && t.name.trim().toLowerCase() === trimmed.toLowerCase())
    if (clash) {
      toast.show(`A team named "${trimmed}" already exists.`, { tone: 'danger' })
      return
    }
    onSave({ ...team, name: trimmed, roster: normalizeRoster(roster), updatedAt: Date.now() })
    toast.show('Team saved.', { tone: 'success' })
    setEditing(false)
  }

  return (
    <section className="card" aria-labelledby="team-roster-title">
      <div className="card-title">
        <h2 id="team-roster-title" className="section-title">
          Roster
        </h2>
        {editing ? (
          <span className="muted small">Editing</span>
        ) : (
          <Button variant="outline" size="sm" onClick={startEdit} aria-expanded={false} aria-controls="team-roster-editor">
            Edit
          </Button>
        )}
      </div>
      {editing ? (
        <form
          id="team-roster-editor"
          className="team-editor"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <div className="field">
            <label className="label" htmlFor="edit-team-name">
              Team name
            </label>
            <input id="edit-team-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" maxLength={40} required />
          </div>
          <RosterEditor roster={roster} onChange={setRoster} team="a" idPrefix="edit" />
          <div className="team-editor-actions">
            <Button type="submit" variant="primary" size="lg">
              Save
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="team-roster">
          {POSITIONS.map((pos) => (
            <div key={pos} className="team-roster-row">
              <span className="label">{POSITION_PLURALS[pos]}</span>
              <div className="team-roster-chips" role="list" aria-label={`${POSITION_PLURALS[pos]} numbers`}>
                {team.roster[pos].length === 0 ? (
                  <span className="team-roster-none">—</span>
                ) : (
                  team.roster[pos].map((n) => (
                    <span key={n} className="chip chip-a" role="listitem">
                      #{n}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
          <p className="muted small">
            {players === 1 ? '1 player' : `${players} players`} · Games already logged keep the roster they started with.
          </p>
        </div>
      )}
    </section>
  )
}
