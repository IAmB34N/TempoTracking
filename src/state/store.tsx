import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { newId } from '../lib/ids'
import { defaultLayout, type LayoutConfig } from '../lib/layout'
import { defaultSettings, normalizeSettings, type Settings } from '../lib/settings'
import { loadState, prefersDark, saveState, type PersistedState } from '../lib/storage'
import { normalizeRoster, type Game, type GameTeam, type Play, type Roster, type Team } from '../lib/types'

export interface AppState {
  games: Game[]
  teams: Team[]
  settings: Settings
}

export interface NewGameTeamInput {
  name: string
  roster: Roster
  /** Existing saved team to link to (its name/roster get updated); otherwise matched by name. */
  teamId?: string
}

type Action =
  | { type: 'createGame'; game: Game; teams: Team[] }
  | { type: 'addPlay'; gameId: string; play: Play }
  | { type: 'undoPlay'; gameId: string }
  | { type: 'deletePlay'; gameId: string; playId: string }
  | { type: 'newSet'; gameId: string }
  | { type: 'setCurrentSet'; gameId: string; setNumber: number }
  | { type: 'swapSides'; gameId: string }
  | { type: 'deleteGame'; gameId: string }
  | { type: 'upsertTeam'; team: Team }
  | { type: 'setPrimaryTeam'; teamId: string | null }
  | { type: 'deleteTeam'; teamId: string }
  | { type: 'updateSettings'; patch: Partial<Settings> }
  | { type: 'updateSteps'; patch: Partial<Settings['steps']> }
  | { type: 'setLayout'; layout: LayoutConfig }
  | { type: 'importState'; state: PersistedState }
  | { type: 'clearAll' }

function touchGame(games: Game[], gameId: string, fn: (g: Game) => Game): Game[] {
  return games.map((g) => (g.id === gameId ? { ...fn(g), updatedAt: Date.now() } : g))
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'createGame': {
      const ids = new Set(action.teams.map((t) => t.id))
      const teams = [...state.teams.filter((t) => !ids.has(t.id)), ...action.teams]
      return { ...state, games: [action.game, ...state.games], teams }
    }
    case 'addPlay':
      return { ...state, games: touchGame(state.games, action.gameId, (g) => ({ ...g, plays: [...g.plays, action.play] })) }
    case 'undoPlay':
      return { ...state, games: touchGame(state.games, action.gameId, (g) => ({ ...g, plays: g.plays.slice(0, -1) })) }
    case 'deletePlay':
      return {
        ...state,
        games: touchGame(state.games, action.gameId, (g) => ({ ...g, plays: g.plays.filter((p) => p.id !== action.playId) })),
      }
    case 'newSet':
      return { ...state, games: touchGame(state.games, action.gameId, (g) => ({ ...g, currentSet: g.currentSet + 1 })) }
    case 'setCurrentSet':
      return {
        ...state,
        games: touchGame(state.games, action.gameId, (g) => ({ ...g, currentSet: Math.max(1, Math.round(action.setNumber)) })),
      }
    case 'swapSides':
      return { ...state, games: touchGame(state.games, action.gameId, (g) => ({ ...g, swapSides: !g.swapSides })) }
    case 'deleteGame':
      return { ...state, games: state.games.filter((g) => g.id !== action.gameId) }
    case 'upsertTeam': {
      const exists = state.teams.some((t) => t.id === action.team.id)
      return {
        ...state,
        teams: exists ? state.teams.map((t) => (t.id === action.team.id ? action.team : t)) : [...state.teams, action.team],
      }
    }
    case 'setPrimaryTeam':
      return { ...state, teams: state.teams.map((t) => ({ ...t, isPrimary: t.id === action.teamId })) }
    case 'deleteTeam':
      return { ...state, teams: state.teams.filter((t) => t.id !== action.teamId) }
    case 'updateSettings':
      return { ...state, settings: normalizeSettings({ ...state.settings, ...action.patch }, state.settings.darkMode) }
    case 'updateSteps':
      return { ...state, settings: { ...state.settings, steps: { ...state.settings.steps, ...action.patch } } }
    case 'setLayout':
      return { ...state, settings: { ...state.settings, layout: action.layout } }
    case 'importState':
      return { games: action.state.games, teams: action.state.teams, settings: action.state.settings }
    case 'clearAll':
      return { games: [], teams: [], settings: { ...defaultSettings(state.settings.darkMode), layout: defaultLayout() } }
  }
}

export function initialState(): AppState {
  const loaded = loadState()
  if (loaded) return { games: loaded.games, teams: loaded.teams, settings: loaded.settings }
  return { games: [], teams: [], settings: defaultSettings(prefersDark()) }
}

export interface StoreApi {
  state: AppState
  dispatch: (action: Action) => void
  /** Creates (or updates) the two team records and the game; returns the new game id. */
  createGame: (a: NewGameTeamInput, b: NewGameTeamInput) => string
  addPlay: (gameId: string, play: Omit<Play, 'id' | 'gameId' | 'createdAt'>) => Play
  undoPlay: (gameId: string) => void
  deletePlay: (gameId: string, playId: string) => void
  newSet: (gameId: string) => void
  setCurrentSet: (gameId: string, setNumber: number) => void
  swapSides: (gameId: string) => void
  deleteGame: (gameId: string) => void
  upsertTeam: (team: Team) => void
  setPrimaryTeam: (teamId: string | null) => void
  deleteTeam: (teamId: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  updateSteps: (patch: Partial<Settings['steps']>) => void
  setLayout: (layout: LayoutConfig) => void
  importState: (state: PersistedState) => void
  clearAll: () => void
  getGame: (id: string | undefined) => Game | undefined
  getTeam: (id: string | undefined) => Team | undefined
  /** Most recently updated game, if any. */
  latestGame: Game | undefined
}

const StoreContext = createContext<StoreApi | null>(null)

export function StoreProvider({ children, initial }: { children: ReactNode; initial?: AppState }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initial ?? initialState())

  // Persist (debounced) on every change.
  const timer = useRef<number | null>(null)
  const latest = useRef(state)
  latest.current = state
  useEffect(() => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      timer.current = null
      saveState({ version: 1, ...latest.current })
    }, 150)
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current)
        timer.current = null
        saveState({ version: 1, ...latest.current })
      }
    }
  }, [state])

  // Apply the theme.
  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.darkMode ? 'dark' : 'light'
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', state.settings.darkMode ? '#0f1012' : '#ff6a00')
  }, [state.settings.darkMode])

  const createGame = useCallback(
    (a: NewGameTeamInput, b: NewGameTeamInput): string => {
      const now = Date.now()
      const teams: Team[] = []
      const current = latest.current.teams
      const resolve = (input: NewGameTeamInput): GameTeam => {
        const name = input.name.trim()
        const roster = normalizeRoster(input.roster)
        const existing =
          (input.teamId && current.find((t) => t.id === input.teamId)) ||
          current.find((t) => t.name.toLowerCase() === name.toLowerCase()) ||
          teams.find((t) => t.name.toLowerCase() === name.toLowerCase())
        const team: Team = existing
          ? { ...existing, name, roster, updatedAt: now }
          : { id: newId('t_'), name, roster, isPrimary: false, createdAt: now, updatedAt: now }
        if (!teams.some((t) => t.id === team.id)) teams.push(team)
        return { teamId: team.id, name: team.name, roster: team.roster }
      }
      const ta = resolve(a)
      const tb = resolve(b)
      const game: Game = { id: newId('g_'), createdAt: now, updatedAt: now, teams: [ta, tb], currentSet: 1, swapSides: false, plays: [] }
      dispatch({ type: 'createGame', game, teams })
      return game.id
    },
    [],
  )

  const addPlay = useCallback((gameId: string, play: Omit<Play, 'id' | 'gameId' | 'createdAt'>): Play => {
    const full: Play = { ...play, id: newId('p_'), gameId, createdAt: Date.now() }
    dispatch({ type: 'addPlay', gameId, play: full })
    return full
  }, [])

  const api = useMemo<StoreApi>(() => {
    const games = state.games
    return {
      state,
      dispatch,
      createGame,
      addPlay,
      undoPlay: (gameId) => dispatch({ type: 'undoPlay', gameId }),
      deletePlay: (gameId, playId) => dispatch({ type: 'deletePlay', gameId, playId }),
      newSet: (gameId) => dispatch({ type: 'newSet', gameId }),
      setCurrentSet: (gameId, setNumber) => dispatch({ type: 'setCurrentSet', gameId, setNumber }),
      swapSides: (gameId) => dispatch({ type: 'swapSides', gameId }),
      deleteGame: (gameId) => dispatch({ type: 'deleteGame', gameId }),
      upsertTeam: (team) => dispatch({ type: 'upsertTeam', team }),
      setPrimaryTeam: (teamId) => dispatch({ type: 'setPrimaryTeam', teamId }),
      deleteTeam: (teamId) => dispatch({ type: 'deleteTeam', teamId }),
      updateSettings: (patch) => dispatch({ type: 'updateSettings', patch }),
      updateSteps: (patch) => dispatch({ type: 'updateSteps', patch }),
      setLayout: (layout) => dispatch({ type: 'setLayout', layout }),
      importState: (s) => dispatch({ type: 'importState', state: s }),
      clearAll: () => dispatch({ type: 'clearAll' }),
      getGame: (id) => (id ? games.find((g) => g.id === id) : undefined),
      getTeam: (id) => (id ? state.teams.find((t) => t.id === id) : undefined),
      latestGame: games.length ? [...games].sort((a, b) => b.updatedAt - a.updatedAt)[0] : undefined,
    }
  }, [state, createGame, addPlay])

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
