import { useMemo } from 'react'
import { IconChart, IconList, IconPlay, IconPlus, IconTrash } from '../components/Icons'
import { Button, TopBar, useConfirm, useToast } from '../components/ui'
import { formatDate } from '../lib/labels'
import { navigate, routes } from '../lib/router'
import type { Game } from '../lib/types'
import { useStore } from '../state/store'
import { plural } from './Home'
import './Games.css'

/** Newest activity first. */
export function sortGames(games: readonly Game[]): Game[] {
  return [...games].sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt)
}

export default function Games() {
  const { state, deleteGame } = useStore()
  const confirm = useConfirm()
  const toast = useToast()
  const games = useMemo(() => sortGames(state.games), [state.games])
  const showSetNumber = state.settings.showSetNumber

  const remove = async (game: Game) => {
    const title = `${game.teams[0].name} vs ${game.teams[1].name}`
    const ok = await confirm({
      title: `Delete this game and its ${plural(game.plays.length, 'set')}?`,
      message: `${title} · ${formatDate(game.createdAt)}. This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    deleteGame(game.id)
    toast.show(`Deleted ${title}.`, { tone: 'danger' })
  }

  return (
    <div className="page">
      <TopBar
        title="Previous Games"
        back="/"
        right={
          <Button variant="primary" size="sm" icon={<IconPlus size={20} />} onClick={() => navigate(routes.newGame())} aria-label="New game" title="New game" data-testid="games-new" />
        }
      />
      <div className="page-content">
        {games.length === 0 ? (
          <div className="empty stack">
            <p>No games yet. Start one and it will show up here.</p>
            <div>
              <Button variant="primary" size="lg" icon={<IconPlus size={22} />} onClick={() => navigate(routes.newGame())}>
                New Game
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="games-summary">
              <h2 className="section-title">{plural(games.length, 'game')}</h2>
              <span className="small muted">Tap a game to resume</span>
            </div>
            <ul className="list games-list">
              {games.map((game, i) => {
                const [a, b] = game.teams
                const sub = [formatDate(game.createdAt), plural(game.plays.length, 'set')]
                if (showSetNumber) sub.push(`Set ${game.currentSet}`)
                return (
                  <li key={game.id} className="list-item games-row">
                    <button type="button" className="games-row-main" data-testid="game-item" onClick={() => navigate(routes.game(game.id))} aria-label={`Resume ${a.name} vs ${b.name}`}>
                      <span className="games-row-play" aria-hidden="true">
                        <IconPlay size={18} />
                      </span>
                      <span className="list-item-main">
                        <span className="list-item-title games-row-title">
                          <span className="text-a">{a.name}</span>
                          <span className="games-row-vs muted">vs</span>
                          <span className="text-b">{b.name}</span>
                          {i === 0 && <span className="badge badge-primary">Latest</span>}
                        </span>
                        <span className="list-item-sub mono">{sub.join(' · ')}</span>
                      </span>
                    </button>
                    <div className="games-row-actions">
                      <Button variant="outline" size="sm" icon={<IconList size={16} />} onClick={() => navigate(routes.log(game.id))} aria-label={`Set log for ${a.name} vs ${b.name}`}>
                        Log
                      </Button>
                      <Button variant="outline" size="sm" icon={<IconChart size={16} />} onClick={() => navigate(routes.stats(game.id))} aria-label={`Stats for ${a.name} vs ${b.name}`}>
                        Stats
                      </Button>
                      <Button variant="outline" size="sm" className="games-delete" icon={<IconTrash size={16} />} data-testid="game-delete" onClick={() => remove(game)} aria-label={`Delete ${a.name} vs ${b.name}`}>
                        Delete
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
