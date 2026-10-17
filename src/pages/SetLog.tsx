import { useMemo } from 'react'
import { Button, TopBar } from '../components/ui'
import { formatTime, heightLabel, hitterLabel, resultLabel, setterLabel } from '../lib/labels'
import { Link, navigate, routes } from '../lib/router'
import { ERROR_RESULTS, type Game, type Play } from '../lib/types'
import { useStore } from '../state/store'
import './Stats.css'

export default function SetLog({ gameId }: { gameId: string }) {
  const { getGame } = useStore()
  const game = getGame(gameId)

  if (!game) {
    return (
      <div className="page">
        <TopBar title="Set Log" back={routes.home()} />
        <div className="page-content">
          <div className="empty">Game not found.</div>
          <Button variant="primary" size="lg" onClick={() => navigate(routes.home())}>
            Home
          </Button>
        </div>
      </div>
    )
  }

  return <SetLogView game={game} />
}

interface SetGroup {
  setNumber: number
  plays: Play[]
}

/** Plays grouped by set number, newest set first and newest play first within each set. */
function groupBySet(plays: readonly Play[]): SetGroup[] {
  const groups = new Map<number, Play[]>()
  for (const p of plays) {
    const list = groups.get(p.setNumber)
    if (list) list.push(p)
    else groups.set(p.setNumber, [p])
  }
  return [...groups.entries()]
    .sort((x, y) => y[0] - x[0])
    .map(([setNumber, list]) => ({ setNumber, plays: list.sort((x, y) => y.createdAt - x.createdAt) }))
}

function pluralSets(n: number): string {
  return `${n} ${n === 1 ? 'set' : 'sets'}`
}

/** Compact "Setter #7 · Tempo · Outside #12" summary (only the fields that were recorded). */
function logSummary(play: Play): string {
  const parts: string[] = []
  if (play.setter) parts.push(setterLabel(play.setter))
  if (play.height) parts.push(heightLabel(play.height))
  if (play.hitter) parts.push(hitterLabel(play.hitter))
  return parts.length ? parts.join(' · ') : 'Set logged'
}

function resultChipClass(play: Play): string {
  if (!play.result) return ''
  if (play.result === 'kill') return 'chip chip-a log-chip'
  if (ERROR_RESULTS.includes(play.result)) return 'chip chip-b log-chip'
  return 'chip log-chip log-chip-neutral'
}

function SetLogView({ game }: { game: Game }) {
  const groups = useMemo(() => groupBySet(game.plays), [game.plays])
  const total = game.plays.length
  const [a, b] = game.teams

  return (
    <div className="page">
      <TopBar title="Set Log" backFallback={routes.game(game.id)} subtitle={`${a.name} vs ${b.name}`} />
      <div className="page-content">
        <div className="log-head">
          <span className="log-count" data-testid="log-count">
            {pluralSets(total)}
          </span>
          {total > 0 && (
            <span className="muted small">
              {groups.length === 1 ? 'Set' : 'Across'} {groups.length === 1 ? groups[0]!.setNumber : `${groups.length} sets`}
            </span>
          )}
        </div>

        {total === 0 ? (
          <div className="empty">No sets yet — go back and tap the court</div>
        ) : (
          groups.map((g) => (
            <section key={g.setNumber} className="log-group" aria-labelledby={`log-set-${g.setNumber}`}>
              <div className="log-group-title">
                <h2 id={`log-set-${g.setNumber}`} className="section-title">
                  Set {g.setNumber} · {pluralSets(g.plays.length)}
                </h2>
              </div>
              <div className="list">
                {g.plays.map((p) => (
                  <LogRow key={p.id} play={p} game={game} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}

function LogRow({ play, game }: { play: Play; game: Game }) {
  const teamName = game.teams[play.teamIndex].name
  const chipClass = resultChipClass(play)
  return (
    <Link
      to={routes.play(game.id, play.id)}
      className="list-item list-item-button log-item"
      data-testid="log-item"
      aria-label={`${teamName}, ${formatTime(play.createdAt)}, ${logSummary(play)}${play.result ? `, ${resultLabel(play.result)}` : ''}`}
    >
      <span className={['badge', play.teamIndex === 0 ? 'badge-a' : 'badge-b', 'log-badge'].join(' ')} title={teamName}>
        {teamName}
      </span>
      <span className="list-item-main">
        <span className="log-summary">{logSummary(play)}</span>
        <span className="list-item-sub log-sub">
          {formatTime(play.createdAt)}
        </span>
      </span>
      {play.result && <span className={chipClass}>{resultLabel(play.result)}</span>}
    </Link>
  )
}
