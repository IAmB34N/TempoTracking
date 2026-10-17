// Tiny hash router: "#/game/abc/log" -> path "/game/abc/log".
import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react'

export function currentPath(): string {
  const hash = typeof window === 'undefined' ? '' : window.location.hash
  const path = hash.startsWith('#') ? hash.slice(1) : hash
  return path.startsWith('/') ? path : '/' + path
}

export function navigate(path: string, opts: { replace?: boolean } = {}): void {
  const target = '#' + (path.startsWith('/') ? path : '/' + path)
  if (opts.replace) {
    const url = window.location.pathname + window.location.search + target
    window.history.replaceState(null, '', url)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = target
  }
}

export function goBack(fallback = '/'): void {
  if (window.history.length > 1) window.history.back()
  else navigate(fallback)
}

export function usePath(): string {
  const [path, setPath] = useState(currentPath)
  useEffect(() => {
    const onChange = () => setPath(currentPath())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return path
}

export type Params = Record<string, string>

/** Match "/game/:id/log" against "/game/abc/log" -> { id: 'abc' }, or null. */
export function matchRoute(pattern: string, path: string): Params | null {
  const p = pattern.split('/').filter(Boolean)
  const s = path.split('?')[0]!.split('/').filter(Boolean)
  if (p.length !== s.length) return null
  const params: Params = {}
  for (let i = 0; i < p.length; i++) {
    const seg = p[i]!
    const val = s[i]!
    if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(val)
    else if (seg !== val) return null
  }
  return params
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
  children: ReactNode
}

export function Link({ to, children, onClick, ...rest }: LinkProps) {
  const href = '#' + (to.startsWith('/') ? to : '/' + to)
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
  }
  return (
    <a href={href} onClick={handle} {...rest}>
      {children}
    </a>
  )
}

export const routes = {
  home: () => '/',
  newGame: () => '/new',
  games: () => '/games',
  game: (id: string) => `/game/${encodeURIComponent(id)}`,
  log: (id: string) => `/game/${encodeURIComponent(id)}/log`,
  play: (id: string, playId: string) => `/game/${encodeURIComponent(id)}/log/${encodeURIComponent(playId)}`,
  stats: (id: string) => `/game/${encodeURIComponent(id)}/stats`,
  teams: () => '/teams',
  team: (id: string) => `/teams/${encodeURIComponent(id)}`,
  settings: () => '/settings',
  layout: () => '/layout',
}
