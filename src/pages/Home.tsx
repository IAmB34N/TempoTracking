import { useMemo } from 'react'
import { IconGear, IconList, IconPlay, IconPlus, IconStar, IconUsers } from '../components/Icons'
import { Logo } from '../components/Logo'
import { Button } from '../components/ui'
import { APP_NAME } from '../lib/labels'
import { Link, navigate, routes } from '../lib/router'
import type { Game } from '../lib/types'
import { useStore } from '../state/store'
import './Home.css'

/** Shown in the footer; keep in sync with package.json. */
export const APP_VERSION = __APP_VERSION__

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

/** "Hawks vs Tigers · Set 2 · 18 sets" — the set number is omitted when hidden in settings. */
export function describeGame(game: Game, showSetNumber: boolean): string {
  const parts = [`${game.teams[0].name} vs ${game.teams[1].name}`]
  if (showSetNumber) parts.push(`Set ${game.currentSet}`)
  parts.push(plural(game.plays.length, 'set'))
  return parts.join(' · ')
}

export default function Home() {
  const { state, latestGame } = useStore()
  const primary = useMemo(() => state.teams.find((t) => t.isPrimary), [state.teams])
  const gameCount = state.games.length
  const showSetNumber = state.settings.showSetNumber

  return (
    <main className="page home">
      <div className="home-content">
        <section className="home-hero" aria-labelledby="home-title">
          <h1 id="home-title" className="visually-hidden">
            TEMPO
          </h1>
          <Logo size="xl" motto />
        </section>

        <nav className="home-actions" aria-label="Main">
          <Button variant="primary" size="xl" block icon={<IconPlus size={26} />} className="home-btn" data-testid="home-new" onClick={() => navigate(routes.newGame())}>
            <span className="home-btn-title">New Game</span>
            <span className="home-btn-sub">Set up two teams and start tracking</span>
          </Button>

          <Button
            variant="secondary"
            size="xl"
            block
            icon={<IconPlay size={26} />}
            className="home-btn"
            data-testid="home-resume"
            disabled={!latestGame}
            aria-describedby="home-resume-sub"
            onClick={() => latestGame && navigate(routes.game(latestGame.id))}
          >
            <span className="home-btn-title">Resume Game</span>
            <span id="home-resume-sub" className="home-btn-sub">
              {latestGame ? describeGame(latestGame, showSetNumber) : 'No game in progress yet'}
            </span>
          </Button>

          <Button variant="outline" size="xl" block icon={<IconList size={26} />} className="home-btn" data-testid="home-games" onClick={() => navigate(routes.games())}>
            <span className="home-btn-title">Previous Games</span>
            <span className="home-btn-sub">{gameCount ? plural(gameCount, 'game') + ' saved' : 'Nothing saved yet'}</span>
          </Button>

          <div className="home-row">
            <Button variant="outline" size="lg" icon={<IconUsers size={22} />} data-testid="home-teams" onClick={() => navigate(routes.teams())}>
              Teams
            </Button>
            <Button variant="outline" size="lg" icon={<IconGear size={22} />} data-testid="home-settings" onClick={() => navigate(routes.settings())}>
              Settings
            </Button>
          </div>
        </nav>

        {primary && (
          <div className="home-primary">
            <Link to={routes.team(primary.id)} className="chip chip-a home-primary-chip" data-testid="home-primary">
              <IconStar size={16} filled />
              <span>
                Primary team: <strong>{primary.name}</strong>
              </span>
            </Link>
          </div>
        )}

        <footer className="home-footer small muted">
          {APP_NAME} v{APP_VERSION}
        </footer>
      </div>
    </main>
  )
}
