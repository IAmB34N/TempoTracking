import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ButtonDock } from '../components/ButtonDock'
import { Court, leftTeam, useAutoOrientation, type CourtMarker } from '../components/Court'
import { breadcrumbFor } from '../components/flow/breadcrumb'
import { FlowPanel } from '../components/flow/FlowPanel'
import { IconBack, IconChart, IconClose, IconGear, IconHome, IconLayout, IconList, IconPlus, IconSwap, IconUndo, IconUsers } from '../components/Icons'
import { Logo } from '../components/Logo'
import { Button, TopBar, useConfirm, useToast, type ButtonVariant } from '../components/ui'
import { applyAnswer, firstStep, isCourtStep, nextStep, numbersForStep, STEP_TITLES, type Draft, type Rosters, type StepAnswer, type StepId } from '../lib/flow'
import { playSummary } from '../lib/labels'
import { DOCK_BUTTON_LABELS, usedRows, type DockButton, type DockButtonId, type LayoutConfig } from '../lib/layout'
import { navigate, routes } from '../lib/router'
import type { Game, Play, TeamIndex } from '../lib/types'
import { useStore } from '../state/store'
import './Track.css'

export default function Track({ gameId }: { gameId: string }) {
  const store = useStore()
  const game = store.getGame(gameId)
  if (!game) {
    return (
      <div className="page">
        <TopBar title="Track" back={routes.home()} />
        <div className="page-content">
          <div className="empty stack" role="status">
            <strong>Game not found</strong>
            <span className="small">It may have been deleted, or the link is out of date.</span>
            <div>
              <Button variant="primary" icon={<IconHome size={18} />} onClick={() => navigate(routes.home())}>
                Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return <TrackView game={game} />
}

interface FlowEntry {
  step: StepId
  draft: Draft
}

const DOCK_ICONS: Record<DockButtonId, ReactNode> = {
  newSet: <IconPlus size={20} />,
  setLog: <IconList size={20} />,
  stats: <IconChart size={20} />,
  undo: <IconUndo size={20} />,
  swapSides: <IconSwap size={20} />,
  teams: <IconUsers size={20} />,
  settings: <IconGear size={20} />,
  home: <IconHome size={20} />,
  editLayout: <IconLayout size={20} />,
}

const DOCK_VARIANTS: Record<DockButtonId, ButtonVariant> = {
  newSet: 'primary',
  setLog: 'secondary',
  stats: 'secondary',
  undo: 'outline',
  swapSides: 'outline',
  teams: 'outline',
  settings: 'outline',
  home: 'outline',
  editLayout: 'ghost',
}

function TrackView({ game }: { game: Game }) {
  const store = useStore()
  const toast = useToast()
  const confirm = useConfirm()
  const settings = store.state.settings
  const gameId = game.id
  const teamNames = useMemo<readonly [string, string]>(() => [game.teams[0].name, game.teams[1].name], [game.teams])
  const rosters = useMemo<Rosters>(() => [game.teams[0].roster, game.teams[1].roster], [game.teams])
  const stepsKey = JSON.stringify(settings.steps)
  const rostersKey = JSON.stringify(rosters)

  // ----- flow state: a history stack so Back is a pop -----
  const makeStart = useCallback((): FlowEntry[] => [{ step: firstStep(settings, rosters), draft: {} }], [settings, rosters])
  const [history, setHistory] = useState<FlowEntry[]>(makeStart)
  const current = history[history.length - 1]!
  const inProgress = history.length > 1
  const reset = useCallback(() => setHistory(makeStart()), [makeStart])

  // Settings or rosters changing mid-draft would invalidate the answers so far: start over.
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    reset()
  }, [stepsKey, rostersKey])

  const commit = useCallback(
    (draft: Draft) => {
      if (draft.teamIndex === undefined) return
      const fields: Omit<Play, 'id' | 'gameId' | 'createdAt'> = { teamIndex: draft.teamIndex, setNumber: game.currentSet }
      if (draft.setFrom) fields.setFrom = draft.setFrom
      if (draft.hitFrom) fields.hitFrom = draft.hitFrom
      if (draft.setter) fields.setter = draft.setter
      if (draft.height) fields.height = draft.height
      if (draft.hitter) fields.hitter = draft.hitter
      if (draft.result) fields.result = draft.result
      const play = store.addPlay(gameId, fields)
      toast.show('Logged · ' + playSummary(play), { tone: 'success', duration: 3500, action: { label: 'Undo', onClick: () => store.undoPlay(gameId) } })
      reset()
    },
    [store, gameId, game.currentSet, toast, reset],
  )

  const answer = useCallback(
    (a: StepAnswer) => {
      const draft = applyAnswer(current.draft, a)
      const next = nextStep(current.step, draft, settings, rosters)
      if (next === null) {
        commit(draft)
        return
      }
      setHistory((h) => [...h, { step: next, draft }])
    },
    [current, settings, rosters, commit],
  )

  const back = useCallback(() => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h)), [])
  const cancel = useCallback(() => {
    if (inProgress) reset()
  }, [inProgress, reset])

  // Escape discards an in-progress draft.
  useEffect(() => {
    if (!inProgress) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        cancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inProgress, cancel])

  // ----- court -----
  const courtRef = useRef<HTMLDivElement>(null)
  const orientation = useAutoOrientation(courtRef, 'auto')
  const courtStep = isCourtStep(current.step)
  const inlineStart = !courtStep && !inProgress
  const panelOpen = !courtStep && inProgress
  const markers = useMemo<CourtMarker[]>(() => {
    const d = current.draft
    if (current.step !== 'hitFrom' || d.teamIndex === undefined || !d.setFrom) return []
    return [{ point: d.setFrom, teamIndex: d.teamIndex, kind: 'set', label: 'Set' }]
  }, [current])

  const onCourtSelect = useCallback(
    (point: { x: number; y: number }, teamIndex: TeamIndex) => {
      if (current.step === 'setFrom') answer({ step: 'setFrom', point, teamIndex })
      else if (current.step === 'hitFrom') answer({ step: 'hitFrom', point })
    },
    [current.step, answer],
  )

  // ----- dock -----
  const plays = game.plays
  const dockLayout = useMemo<LayoutConfig>(
    () => (settings.showSetNumber ? settings.layout : { ...settings.layout, buttons: settings.layout.buttons.filter((b) => b.id !== 'newSet') }),
    [settings.layout, settings.showSetNumber],
  )
  const dockRows = usedRows(dockLayout)

  // Tell the (global) toast region how tall the dock is so toasts sit above it in portrait.
  const dockRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = dockRef.current
    const root = document.documentElement
    if (!el) return
    const update = () => root.style.setProperty('--track-toast-offset', `${Math.round(el.getBoundingClientRect().height) + 20}px`)
    update()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(el)
    return () => {
      ro?.disconnect()
      root.style.removeProperty('--track-toast-offset')
    }
  }, [])

  const onNewSet = async () => {
    const n = game.currentSet + 1
    const ok = await confirm({ title: `Start Set ${n}?`, message: `New sets will be logged under Set ${n}.`, confirmLabel: `Start Set ${n}` })
    if (!ok) return
    store.newSet(gameId)
    reset()
    toast.show(`Set ${n} started`, { tone: 'success' })
  }
  const onUndo = async () => {
    const last = plays[plays.length - 1]
    if (!last) return
    const ok = await confirm({ title: 'Remove the last set?', message: playSummary(last), confirmLabel: 'Remove', danger: true })
    if (!ok) return
    store.undoPlay(gameId)
    toast.show('Last set removed', { tone: 'danger' })
  }
  const onSwap = () => {
    store.swapSides(gameId)
    toast.show('Sides swapped')
  }

  const dockActions: Record<DockButtonId, { onClick: () => void; disabled?: boolean }> = {
    newSet: { onClick: () => void onNewSet() },
    setLog: { onClick: () => navigate(routes.log(gameId)) },
    stats: { onClick: () => navigate(routes.stats(gameId)) },
    undo: { onClick: () => void onUndo(), disabled: plays.length === 0 },
    swapSides: { onClick: onSwap },
    teams: { onClick: () => navigate(routes.teams()) },
    settings: { onClick: () => navigate(routes.settings()) },
    home: { onClick: () => navigate(routes.home()) },
    editLayout: { onClick: () => navigate(routes.layout()) },
  }

  const renderDockButton = (b: DockButton) => {
    const label = DOCK_BUTTON_LABELS[b.id]
    const action = dockActions[b.id]
    return (
      <Button variant={DOCK_VARIANTS[b.id]} icon={DOCK_ICONS[b.id]} data-testid={`dock-${b.id}`} aria-label={label} title={label} disabled={action.disabled} onClick={action.onClick}>
        {label}
      </Button>
    )
  }

  // ----- header -----
  const left = leftTeam(game.swapSides)
  const right = (1 - left) as TeamIndex
  const sideWord = (side: 'left' | 'right') => (orientation === 'horizontal' ? (side === 'left' ? 'Left' : 'Right') : side === 'left' ? 'Top' : 'Bottom')
  const setCount = plays.length
  const hint = !inProgress && current.step === 'setFrom' && setCount === 0 ? 'No sets logged yet — tap the court to start' : STEP_TITLES[current.step]

  return (
    <div className="track" data-testid="track-page">
      <header className="track-header">
        <div className="track-header-row">
          <Button variant="ghost" className="track-iconbtn" icon={<IconBack size={24} />} aria-label="Back to home" title="Home" onClick={() => navigate(routes.home())} />
          <Logo size="sm" className="track-logo" />
          <div className="track-header-spacer" />
          {settings.showSetNumber && (
            <div className="track-set" data-testid="set-label" aria-live="polite">
              Set {game.currentSet}
            </div>
          )}
          <div className="track-count small muted mono" data-testid="set-count" aria-label={`${setCount} sets logged`}>
            {setCount} {setCount === 1 ? 'set' : 'sets'}
          </div>
        </div>
        <div className="track-sides" role="group" aria-label="Which team is on which side">
          <SideTag team={left} name={teamNames[left]} side={sideWord('left')} />
          <span className="track-sides-net" aria-hidden />
          <SideTag team={right} name={teamNames[right]} side={sideWord('right')} />
        </div>
      </header>

      <div className="track-body">
        <div className="track-main">
          <div className="track-hint" data-testid="track-hint" hidden={inlineStart}>
            {inProgress && courtStep && (
              <Button variant="outline" size="sm" className="track-hint-btn" icon={<IconBack size={18} />} aria-label="Back to the previous question" onClick={back}>
                Back
              </Button>
            )}
            <p className={['track-hint-text', inProgress ? 'track-hint-active' : ''].filter(Boolean).join(' ')} aria-live="polite">
              {hint}
            </p>
            {inProgress && courtStep && (
              <Button variant="ghost" size="sm" className="track-hint-btn" icon={<IconClose size={18} />} aria-label="Cancel and discard this set" onClick={cancel}>
                Cancel
              </Button>
            )}
          </div>
          <div ref={courtRef} className="track-court" data-testid="track-court">
            <div className="track-court-inner" aria-hidden={inlineStart || undefined}>
              <Court
                teamNames={teamNames}
                swapSides={game.swapSides}
                interactive={courtStep}
                lockTeam={current.step === 'hitFrom' ? current.draft.teamIndex : undefined}
                highlightTeam={current.step === 'hitFrom' ? current.draft.teamIndex : undefined}
                markers={markers}
                onSelect={onCourtSelect}
                ariaLabel={courtStep ? `${STEP_TITLES[current.step]}. ${teamNames[left]} on the ${sideWord('left').toLowerCase()}, ${teamNames[right]} on the ${sideWord('right').toLowerCase()}.` : undefined}
              />
            </div>
            {inlineStart && (
              <FlowPanel
                inline
                step={current.step}
                draft={current.draft}
                teamNames={teamNames}
                numbers={numbersForStep(current.step, current.draft, rosters)}
                breadcrumb={[]}
                canBack={false}
                onAnswer={answer}
                onBack={back}
                onCancel={cancel}
              />
            )}
          </div>
        </div>
        <div ref={dockRef} className="track-dock" data-testid="track-dock">
          <ButtonDock layout={dockLayout} rows={dockRows} renderButton={renderDockButton} className="track-dock-grid" />
        </div>
      </div>

      {panelOpen && (
        <FlowPanel
          step={current.step}
          draft={current.draft}
          teamNames={teamNames}
          numbers={numbersForStep(current.step, current.draft, rosters)}
          breadcrumb={breadcrumbFor(current.draft, { setNumber: game.currentSet, showSetNumber: settings.showSetNumber })}
          canBack={history.length > 1}
          onAnswer={answer}
          onBack={back}
          onCancel={cancel}
        />
      )}
    </div>
  )
}

function SideTag({ team, name, side }: { team: TeamIndex; name: string; side: string }) {
  return (
    <span className={['track-side', team === 0 ? 'track-side-a' : 'track-side-b'].join(' ')} data-testid={`side-${team === 0 ? 'a' : 'b'}`}>
      <span className="track-side-dot" aria-hidden />
      <span className="track-side-name">{name}</span>
      <span className="track-side-pos">{side}</span>
    </span>
  )
}
