import { useMemo } from 'react'
import { IconBolt, IconPlus, IconStar, IconTrash } from '../components/Icons'
import { Button, TopBar, useConfirm, useToast } from '../components/ui'
import { Link, navigate, routes } from '../lib/router'
import { formatPct, summarize, teamAllPlays, teamGameSeries } from '../lib/stats'
import { rosterSize, type Game, type Team } from '../lib/types'
import { useStore } from '../state/store'
import './Teams.css'

/** Primary team first, then alphabetical (case-insensitive). */
export function sortTeams(teams: readonly Team[]): Team[] {
  return [...teams].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

interface TeamRowData {
  team: Team
  games: number
  sets: number
  settingPct: number | null
  players: number
}

function describeTeams(teams: readonly Team[], games: readonly Game[]): TeamRowData[] {
  return sortTeams(teams).map((team) => {
    const summary = summarize(teamAllPlays(games, team.id))
    return {
      team,
      games: teamGameSeries(games, team.id).length,
      sets: summary.sets,
      settingPct: summary.settingPct,
      players: rosterSize(team.roster),
    }
  })
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  const first = words[0]!.charAt(0)
  const second = words.length > 1 ? words[words.length - 1]!.charAt(0) : (words[0]!.charAt(1) ?? '')
  return (first + second).toUpperCase()
}

export default function Teams() {
  const { state, setPrimaryTeam, deleteTeam } = useStore()
  const toast = useToast()
  const confirm = useConfirm()
  const rows = useMemo(() => describeTeams(state.teams, state.games), [state.teams, state.games])

  const togglePrimary = (team: Team) => {
    if (team.isPrimary) {
      setPrimaryTeam(null)
      toast.show(`${team.name} is no longer the primary team.`)
    } else {
      setPrimaryTeam(team.id)
      toast.show(`${team.name} is now the primary team.`, { tone: 'success' })
    }
  }

  const remove = async (team: Team) => {
    const ok = await confirm({
      title: `Delete ${team.name}?`,
      message: 'Past games keep their own copy of the roster.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    deleteTeam(team.id)
    toast.show(`Deleted ${team.name}.`, { tone: 'danger' })
  }

  return (
    <div className="page">
      <TopBar title="Teams" back={routes.home()} />
      <div className="page-content">
        {rows.length === 0 ? (
          <div className="empty stack">
            <div>
              <strong>No teams yet.</strong>
              <br />
              Teams are saved automatically when you start a game.
            </div>
            <Button variant="primary" size="lg" icon={<IconPlus size={20} />} onClick={() => navigate(routes.newGame())}>
              New Game
            </Button>
          </div>
        ) : (
          <ul className="list team-list" aria-label="Saved teams">
            {rows.map(({ team, games, sets, settingPct, players }) => (
              <li key={team.id} className="list-item team-row" data-testid="team-item">
                <Link to={routes.team(team.id)} className="team-row-main" aria-label={`${team.name}${team.isPrimary ? ', primary team' : ''}: ${plural(games, 'game')}, Setting ${formatPct(settingPct)}`}>
                  <span className={['team-avatar', team.isPrimary ? 'is-primary' : ''].join(' ')} aria-hidden="true">
                    {initials(team.name)}
                  </span>
                  <span className="list-item-main">
                    <span className="team-row-name">
                      <span>{team.name}</span>
                      {team.isPrimary && <span className="badge badge-primary">Primary</span>}
                    </span>
                    <span className="team-row-sub">
                      <span className="team-row-seg">{plural(games, 'game')}</span>
                      <span className="team-row-seg">{plural(sets, 'set')}</span>
                      <span className="team-row-seg">
                        Setting % <strong>{formatPct(settingPct)}</strong>
                      </span>
                      <span className="team-row-seg">{plural(players, 'player')}</span>
                    </span>
                  </span>
                </Link>
                <span className="team-row-actions">
                  <button
                    type="button"
                    className={['team-icon-btn', team.isPrimary ? 'is-primary' : ''].join(' ')}
                    data-testid="team-primary-toggle"
                    aria-pressed={team.isPrimary}
                    aria-label={team.isPrimary ? `Unset ${team.name} as primary team` : `Set ${team.name} as primary team`}
                    title={team.isPrimary ? 'Primary team' : 'Set as primary'}
                    onClick={() => togglePrimary(team)}
                  >
                    <IconStar size={22} filled={team.isPrimary} />
                  </button>
                  <button type="button" className="team-icon-btn is-danger" aria-label={`Delete ${team.name}`} title="Delete team" onClick={() => void remove(team)}>
                    <IconTrash size={20} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="team-explainer muted small">
          <IconBolt size={18} />
          <span>The primary team is pre-filled when you start a new game. Tap the star to choose one.</span>
        </p>
      </div>
    </div>
  )
}
