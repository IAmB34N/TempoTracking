import { useMemo, type ReactNode } from 'react'
import { Court, describePoint, type CourtMarker } from '../components/Court'
import { Button, TopBar, useConfirm, useToast } from '../components/ui'
import { formatDateTime, heightLabel, hitterLabel, resultLabel, setterLabel } from '../lib/labels'
import { navigate, routes } from '../lib/router'
import type { Game, Play } from '../lib/types'
import { useStore } from '../state/store'
import './Stats.css'

export default function PlayDetail({ gameId, playId }: { gameId: string; playId: string }) {
  const { getGame } = useStore()
  const game = getGame(gameId)

  if (!game) {
    return (
      <div className="page">
        <TopBar title="Set" back={routes.home()} />
        <div className="page-content">
          <div className="empty">Game not found.</div>
          <Button variant="primary" size="lg" onClick={() => navigate(routes.home())}>
            Home
          </Button>
        </div>
      </div>
    )
  }

  const play = game.plays.find((p) => p.id === playId)
  if (!play) {
    return (
      <div className="page">
        <TopBar title="Set" back={routes.log(game.id)} subtitle={`${game.teams[0].name} vs ${game.teams[1].name}`} />
        <div className="page-content">
          <div className="empty">Set not found. It may have been deleted.</div>
          <Button variant="primary" size="lg" onClick={() => navigate(routes.log(game.id))}>
            Back to Set Log
          </Button>
        </div>
      </div>
    )
  }

  return <PlayView game={game} play={play} />
}

function PlayView({ game, play }: { game: Game; play: Play }) {
  const { deletePlay } = useStore()
  const confirm = useConfirm()
  const toast = useToast()

  // Chronological order for Prev / Next.
  const ordered = useMemo(() => [...game.plays].sort((x, y) => x.createdAt - y.createdAt || x.id.localeCompare(y.id)), [game.plays])
  const index = ordered.findIndex((p) => p.id === play.id)
  const prev = index > 0 ? ordered[index - 1] : undefined
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : undefined

  const teamName = game.teams[play.teamIndex].name
  const teamNames = [game.teams[0].name, game.teams[1].name] as const

  const markers: CourtMarker[] = []
  if (play.setFrom) markers.push({ point: play.setFrom, teamIndex: play.teamIndex, kind: 'set', label: 'Set' })
  if (play.hitFrom) markers.push({ point: play.hitFrom, teamIndex: play.teamIndex, kind: 'hit', label: 'Hit' })

  const courtLabel = [
    `Court for ${teamName}.`,
    play.setFrom ? `Set from ${describePoint(play.setFrom)}.` : 'Set location not recorded.',
    play.hitFrom ? `Hit from ${describePoint(play.hitFrom)}.` : 'Hit location not recorded.',
  ].join(' ')

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Delete this set?',
      message: `This removes the set by ${teamName} from the log. This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    deletePlay(game.id, play.id)
    toast.show('Set deleted', { tone: 'danger' })
    navigate(routes.log(game.id))
  }

  return (
    <div className="page">
      <TopBar title="Set" back={routes.log(game.id)} subtitle={`Set ${play.setNumber} · ${teamName}`} />
      <div className="page-content">
        <div className="play-court">
          <Court teamNames={teamNames} swapSides={game.swapSides} markers={markers} arrow ariaLabel={courtLabel} />
        </div>
        <div className="play-legend" aria-hidden="true">
          <span className="play-legend-set">Set from</span>
          <span className="play-legend-hit">Hit from</span>
        </div>

        <dl className="play-dl" data-testid="play-details">
          <Row label="Team">
            <span className={play.teamIndex === 0 ? 'text-a' : 'text-b'}>{teamName}</span>
          </Row>
          <Row label="Set number">Set {play.setNumber}</Row>
          <Row label="Time">{formatDateTime(play.createdAt)}</Row>
          <Row label="Set from" empty={!play.setFrom}>
            {play.setFrom ? capitalize(describePoint(play.setFrom)) : 'Not recorded'}
          </Row>
          <Row label="Hit from" empty={!play.hitFrom}>
            {play.hitFrom ? capitalize(describePoint(play.hitFrom)) : 'Not recorded'}
          </Row>
          <Row label="Set by" empty={!play.setter}>
            {play.setter ? setterLabel(play.setter) : 'Not recorded'}
          </Row>
          <Row label="Height" empty={!play.height}>
            {play.height ? heightLabel(play.height) : 'Not recorded'}
          </Row>
          <Row label="Hit by" empty={!play.hitter}>
            {play.hitter ? hitterLabel(play.hitter) : 'Not recorded'}
          </Row>
          <Row label="Result" empty={!play.result}>
            {play.result ? resultLabel(play.result) : 'Not recorded'}
          </Row>
        </dl>

        <nav className="play-nav" aria-label="Browse sets">
          <Button
            variant="outline"
            disabled={!prev}
            data-testid="play-prev"
            onClick={() => prev && navigate(routes.play(game.id, prev.id), { replace: true })}
          >
            ← Previous
          </Button>
          <span className="play-nav-pos">
            {index + 1} of {ordered.length}
          </span>
          <Button
            variant="outline"
            disabled={!next}
            data-testid="play-next"
            onClick={() => next && navigate(routes.play(game.id, next.id), { replace: true })}
          >
            Next →
          </Button>
        </nav>

        <Button variant="danger" size="lg" block data-testid="play-delete" onClick={onDelete}>
          Delete set
        </Button>
      </div>
    </div>
  )
}

function Row({ label, empty, children }: { label: string; empty?: boolean; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className={empty ? 'is-empty' : undefined}>{children}</dd>
    </>
  )
}

function capitalize(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s
}
