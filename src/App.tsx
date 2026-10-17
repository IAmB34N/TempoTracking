import { useEffect } from 'react'
import { matchRoute, usePath } from './lib/router'
import Games from './pages/Games'
import Home from './pages/Home'
import LayoutEditor from './pages/LayoutEditor'
import NewGame from './pages/NewGame'
import NotFound from './pages/NotFound'
import PlayDetail from './pages/PlayDetail'
import SetLog from './pages/SetLog'
import Settings from './pages/Settings'
import Stats from './pages/Stats'
import TeamDetail from './pages/TeamDetail'
import Teams from './pages/Teams'
import Track from './pages/Track'

export default function App() {
  const path = usePath()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [path])
  return <Route path={path} />
}

function Route({ path }: { path: string }) {
  let m: Record<string, string> | null
  if (path === '/' || path === '') return <Home />
  if (path === '/new') return <NewGame />
  if (path === '/games') return <Games />
  if (path === '/teams') return <Teams />
  if (path === '/settings') return <Settings />
  if (path === '/layout') return <LayoutEditor />
  if ((m = matchRoute('/game/:id', path))) return <Track key={m.id} gameId={m.id!} />
  if ((m = matchRoute('/game/:id/log', path))) return <SetLog gameId={m.id!} />
  if ((m = matchRoute('/game/:id/log/:playId', path))) return <PlayDetail gameId={m.id!} playId={m.playId!} />
  if ((m = matchRoute('/game/:id/stats', path))) return <Stats gameId={m.id!} />
  if ((m = matchRoute('/teams/:id', path))) return <TeamDetail teamId={m.id!} />
  return <NotFound />
}
