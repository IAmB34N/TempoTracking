import { useCallback, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { ButtonDock } from '../components/ButtonDock'
import { Court } from '../components/Court'
import { IconChart, IconClose, IconGear, IconHome, IconLayout, IconList, IconPlus, IconSwap, IconUndo, IconUsers } from '../components/Icons'
import { LogoMark, Wordmark } from '../components/Logo'
import { Button, Toggle, TopBar, useConfirm, useToast, type ButtonVariant } from '../components/ui'
import {
  canPlace,
  defaultLayout,
  DOCK_BUTTON_LABELS,
  DOCK_COLS,
  DOCK_ROWS,
  MAX_H,
  MAX_W,
  MIN_H,
  MIN_W,
  moveButton,
  resizeButton,
  rowHeightPx,
  SCALE_LABELS,
  setButtonVisible,
  setScale,
  type DockButton,
  type DockButtonId,
  type DockScale,
  type LayoutConfig,
  type Rect,
} from '../lib/layout'
import { navigate, routes } from '../lib/router'
import { useStore } from '../state/store'
import './LayoutEditor.css'

const SCALES: readonly DockScale[] = ['sm', 'md', 'lg']
const INVALID_MESSAGE = "Buttons can't overlap or leave the grid"
const DRAG_THRESHOLD_PX = 4
const DEFAULT_GAP_PX = 6

const ICONS: Record<DockButtonId, ReactNode> = {
  newSet: <IconPlus size={18} />,
  setLog: <IconList size={18} />,
  stats: <IconChart size={18} />,
  undo: <IconUndo size={18} />,
  swapSides: <IconSwap size={18} />,
  teams: <IconUsers size={18} />,
  settings: <IconGear size={18} />,
  home: <IconHome size={18} />,
  editLayout: <IconLayout size={18} />,
}

/** Same colours as the tracking page so the preview is faithful. */
const VARIANTS: Record<DockButtonId, ButtonVariant> = {
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

const ARROWS: Record<string, { col: number; row: number }> = {
  ArrowLeft: { col: -1, row: 0 },
  ArrowRight: { col: 1, row: 0 },
  ArrowUp: { col: 0, row: -1 },
  ArrowDown: { col: 0, row: 1 },
}

/** Pixel geometry of the dock grid: origin on screen and the pitch (cell + gap) per axis. */
export interface Pitch {
  left: number
  top: number
  col: number
  row: number
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/** Grid cell a pointer (relative to the dock origin) lands in while moving a button, kept inside the grid. */
export function moveTarget(px: number, py: number, pitch: Pitch, grab: { col: number; row: number }, size: { w: number; h: number }): { col: number; row: number } {
  return {
    col: clamp(Math.floor(px / pitch.col) - grab.col, 0, DOCK_COLS - size.w),
    row: clamp(Math.floor(py / pitch.row) - grab.row, 0, DOCK_ROWS - size.h),
  }
}

/** Size a button gets when its bottom-right grip is dragged to the pointer (relative to the dock origin). */
export function resizeTarget(px: number, py: number, pitch: Pitch, origin: Rect): { w: number; h: number } {
  return {
    w: clamp(Math.round((px - origin.col * pitch.col) / pitch.col), MIN_W, Math.min(MAX_W, DOCK_COLS - origin.col)),
    h: clamp(Math.round((py - origin.row * pitch.row) / pitch.row), MIN_H, Math.min(MAX_H, DOCK_ROWS - origin.row)),
  }
}

function sameRect(a: Rect, b: Rect): boolean {
  return a.col === b.col && a.row === b.row && a.w === b.w && a.h === b.h
}

interface Drag {
  mode: 'move' | 'resize'
  id: DockButtonId
  pointerId: number
  startX: number
  startY: number
  origin: DockButton
  grab: { col: number; row: number }
  pitch: Pitch
  target: Rect
  ok: boolean
  dx: number
  dy: number
  moved: boolean
}

function readPitch(dock: HTMLElement, layout: LayoutConfig): Pitch {
  const rect = dock.getBoundingClientRect()
  const cs = getComputedStyle(dock)
  const colGap = parseFloat(cs.columnGap) || DEFAULT_GAP_PX
  const rowGap = parseFloat(cs.rowGap) || colGap
  return { left: rect.left, top: rect.top, col: (rect.width + colGap) / DOCK_COLS, row: rowHeightPx(layout) + rowGap }
}

export default function LayoutEditor() {
  const store = useStore()
  const layout = store.state.settings.layout
  const confirm = useConfirm()
  const toast = useToast()

  const [selected, setSelected] = useState<DockButtonId | null>(null)
  const [drag, setDragState] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const dockWrapRef = useRef<HTMLDivElement>(null)

  const setDrag = useCallback((d: Drag | null) => {
    dragRef.current = d
    setDragState(d)
  }, [])

  // Rejections can come in bursts (held arrow key); show the warning at most every 1.5 s.
  const lastWarning = useRef(0)
  const apply = useCallback(
    (next: LayoutConfig | null, successMessage?: string) => {
      if (!next) {
        const now = Date.now()
        if (now - lastWarning.current > 1500) {
          lastWarning.current = now
          toast.show(INVALID_MESSAGE, { tone: 'danger' })
        }
        return false
      }
      store.setLayout(next)
      if (successMessage) toast.show(successMessage, { tone: 'success' })
      return true
    },
    [store, toast],
  )

  const dockElement = () => dockWrapRef.current?.querySelector<HTMLElement>('.dock') ?? null

  // ----- drag to move -----
  const onCellPointerDown = (b: DockButton) => (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if ((e.target as HTMLElement).closest('.layout-grip')) return
    const dock = dockElement()
    if (!dock) return
    setSelected(b.id)
    const pitch = readPitch(dock, layout)
    const px = e.clientX - pitch.left
    const py = e.clientY - pitch.top
    const grab = {
      col: clamp(Math.floor(px / pitch.col) - b.col, 0, b.w - 1),
      row: clamp(Math.floor(py / pitch.row) - b.row, 0, b.h - 1),
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({
      mode: 'move',
      id: b.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origin: b,
      grab,
      pitch,
      target: { col: b.col, row: b.row, w: b.w, h: b.h },
      ok: true,
      dx: 0,
      dy: 0,
      moved: false,
    })
  }

  // ----- drag the corner grip to resize -----
  const onGripPointerDown = (b: DockButton) => (e: PointerEvent<HTMLSpanElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const dock = dockElement()
    const cell = e.currentTarget.closest<HTMLElement>('.dock-cell')
    if (!dock || !cell) return
    setSelected(b.id)
    cell.setPointerCapture(e.pointerId)
    setDrag({
      mode: 'resize',
      id: b.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origin: b,
      grab: { col: 0, row: 0 },
      pitch: readPitch(dock, layout),
      target: { col: b.col, row: b.row, w: b.w, h: b.h },
      ok: true,
      dx: 0,
      dy: 0,
      moved: false,
    })
  }

  const onCellPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    const px = e.clientX - d.pitch.left
    const py = e.clientY - d.pitch.top
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    const moved = d.moved || Math.hypot(dx, dy) > DRAG_THRESHOLD_PX
    let target: Rect
    if (d.mode === 'move') {
      const { col, row } = moveTarget(px, py, d.pitch, d.grab, d.origin)
      target = { col, row, w: d.origin.w, h: d.origin.h }
    } else {
      const { w, h } = resizeTarget(px, py, d.pitch, d.origin)
      target = { col: d.origin.col, row: d.origin.row, w, h }
    }
    const ok = canPlace(layout.buttons, { id: d.id, ...target })
    setDrag({ ...d, target, ok, dx, dy, moved })
  }

  const finishDrag = (e: PointerEvent<HTMLDivElement>, commit: boolean) => {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    setDrag(null)
    if (!commit || !d.moved || sameRect(d.target, d.origin)) return
    const next =
      d.mode === 'move' ? moveButton(layout, d.id, d.target.col, d.target.row) : resizeButton(layout, d.id, d.target.w, d.target.h)
    apply(next)
  }

  // ----- keyboard nudging -----
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!selected) return
    const delta = ARROWS[e.key]
    if (!delta) return
    const t = e.target as HTMLElement
    if (t.closest('input, select, textarea')) return
    const b = layout.buttons.find((x) => x.id === selected)
    if (!b) return
    e.preventDefault()
    apply(moveButton(layout, b.id, b.col + delta.col, b.row + delta.row))
  }

  const onReset = async () => {
    const ok = await confirm({
      title: 'Reset button layout?',
      message: 'All buttons go back to their default size and position.',
      confirmLabel: 'Reset',
    })
    if (!ok) return
    store.setLayout(defaultLayout())
    toast.show('Layout reset', { tone: 'success' })
  }

  // ----- rendering -----
  const selectedButton = selected ? (layout.buttons.find((b) => b.id === selected) ?? null) : null

  const cellProps = (b: DockButton): Record<string, unknown> => {
    const dragging = drag !== null && drag.id === b.id && drag.moved
    const lifting = dragging && drag.mode === 'move'
    const style: CSSProperties = {
      gridColumn: `${b.col + 1} / span ${b.w}`,
      gridRow: `${b.row + 1} / span ${b.h}`,
      transform: lifting ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined,
    }
    return {
      className: ['dock-cell', 'layout-cell', b.visible ? '' : 'dock-cell-hidden', selected === b.id ? 'is-selected' : '', lifting ? 'is-dragging' : '']
        .filter(Boolean)
        .join(' '),
      style,
      'data-testid': `layout-button-${b.id}`,
      'data-col': b.col,
      'data-row': b.row,
      'data-w': b.w,
      'data-h': b.h,
      onPointerDown: onCellPointerDown(b),
      onPointerMove: onCellPointerMove,
      onPointerUp: (e: PointerEvent<HTMLDivElement>) => finishDrag(e, true),
      onPointerCancel: (e: PointerEvent<HTMLDivElement>) => finishDrag(e, false),
    }
  }

  const renderButton = (b: DockButton) => {
    const label = DOCK_BUTTON_LABELS[b.id]
    return (
      <>
        <Button
          variant={VARIANTS[b.id]}
          icon={ICONS[b.id]}
          aria-label={`${label}${b.visible ? '' : ' (hidden)'}. Column ${b.col + 1}, row ${b.row + 1}, ${b.w} wide, ${b.h} tall.`}
          aria-pressed={selected === b.id}
          title={label}
          data-testid={`layout-btn-${b.id}`}
          onClick={() => setSelected(b.id)}
        >
          {label}
        </Button>
        {!b.visible && (
          <span className="layout-hidden-tag" aria-hidden>
            Hidden
          </span>
        )}
        <span className="layout-grip" aria-hidden data-testid={`layout-grip-${b.id}`} onPointerDown={onGripPointerDown(b)}>
          <svg viewBox="0 0 12 12" width="12" height="12">
            <path d="M11 1v10H1z" fill="currentColor" />
          </svg>
        </span>
      </>
    )
  }

  const ghost = drag && drag.moved && (
    <div
      className={['layout-ghost', drag.ok ? 'ghost-ok' : 'ghost-bad'].join(' ')}
      style={{ gridColumn: `${drag.target.col + 1} / span ${drag.target.w}`, gridRow: `${drag.target.row + 1} / span ${drag.target.h}` }}
      data-testid="layout-ghost"
      data-ok={drag.ok ? 'true' : 'false'}
      aria-hidden
    />
  )

  const canResize = (w: number, h: number) => selectedButton !== null && resizeButton(layout, selectedButton.id, w, h) !== null

  return (
    <div className="page layout-editor" onKeyDown={onKeyDown}>
      <TopBar
        title="Edit Layout"
        back={routes.settings()}
        right={
          <Button variant="primary" size="sm" onClick={() => navigate(routes.settings())} data-testid="layout-done">
            Done
          </Button>
        }
      />
      <div className="page-content page-content-wide layout-content">
        <div className="layout-main">
          <p className="muted small layout-intro">
            Drag a button to move it, drag its corner to resize it, or tap it to adjust it below. Changes save instantly.
          </p>

          <div className="layout-preview" role="img" aria-label="Preview of the tracking page: the header and court are reserved; buttons live in the dock underneath.">
            <div className="layout-reserved layout-reserved-header">
              <LogoMark size={26} />
              <Wordmark height={14} />
              <span className="layout-preview-set">Set 1</span>
              <span className="layout-reserved-tag">Reserved — buttons can&apos;t go here</span>
            </div>
            <div className="layout-reserved layout-reserved-court">
              <Court teamNames={['Team A', 'Team B']} swapSides={false} interactive={false} ariaLabel="Court preview" />
              <span className="layout-reserved-tag">Reserved — buttons can&apos;t go here</span>
            </div>
          </div>

          <div ref={dockWrapRef} className="layout-dock-wrap" data-testid="layout-dock" onContextMenu={(e) => e.preventDefault()}>
            <ButtonDock layout={layout} rows={DOCK_ROWS} showGrid includeHidden className="layout-dock" renderButton={renderButton} cellProps={cellProps}>
              {ghost}
            </ButtonDock>
          </div>
          <p className="muted small layout-note">On phones the buttons sit below the court; on wide screens beside it. Only the rows you use take up space.</p>
        </div>

        <aside className="layout-side">
          {selectedButton ? (
            <section className="card layout-inspector" aria-labelledby="layout-inspector-title" data-testid="layout-inspector">
              <div className="card-title">
                <div>
                  <h2 id="layout-inspector-title">{DOCK_BUTTON_LABELS[selectedButton.id]}</h2>
                  <div className="muted small mono">
                    Column {selectedButton.col + 1}, row {selectedButton.row + 1}
                  </div>
                </div>
                <Button variant="ghost" size="sm" icon={<IconClose size={18} />} aria-label="Deselect button" onClick={() => setSelected(null)} />
              </div>
              <div className="layout-steppers">
                <Stepper
                  label="Width"
                  value={selectedButton.w}
                  unit={selectedButton.w === 1 ? 'column' : 'columns'}
                  canDec={selectedButton.w > MIN_W && canResize(selectedButton.w - 1, selectedButton.h)}
                  canInc={selectedButton.w < MAX_W && canResize(selectedButton.w + 1, selectedButton.h)}
                  onDec={() => apply(resizeButton(layout, selectedButton.id, selectedButton.w - 1, selectedButton.h))}
                  onInc={() => apply(resizeButton(layout, selectedButton.id, selectedButton.w + 1, selectedButton.h))}
                  testId="layout-width"
                />
                <Stepper
                  label="Height"
                  value={selectedButton.h}
                  unit={selectedButton.h === 1 ? 'row' : 'rows'}
                  canDec={selectedButton.h > MIN_H && canResize(selectedButton.w, selectedButton.h - 1)}
                  canInc={selectedButton.h < MAX_H && canResize(selectedButton.w, selectedButton.h + 1)}
                  onDec={() => apply(resizeButton(layout, selectedButton.id, selectedButton.w, selectedButton.h - 1))}
                  onInc={() => apply(resizeButton(layout, selectedButton.id, selectedButton.w, selectedButton.h + 1))}
                  testId="layout-height"
                />
              </div>
              <div data-testid="layout-visible">
                <Toggle
                  id="layout-visible-toggle"
                  checked={selectedButton.visible}
                  onChange={(v) => store.setLayout(setButtonVisible(layout, selectedButton.id, v))}
                  label="Visible"
                  description="Hidden buttons don't appear on the tracking page."
                />
              </div>
              <p className="muted small">Use the arrow keys to nudge the selected button one cell at a time.</p>
            </section>
          ) : (
            <div className="empty layout-empty" data-testid="layout-inspector-empty">
              Tap a button to change its size or hide it.
            </div>
          )}

          <section className="card" aria-labelledby="layout-size-title">
            <div className="card-title">
              <h2 id="layout-size-title">Button size</h2>
            </div>
            <div className="segmented layout-segmented" role="group" aria-labelledby="layout-size-title">
              {SCALES.map((s) => (
                <button key={s} type="button" aria-pressed={layout.scale === s} data-testid={`layout-scale-${s}`} onClick={() => store.setLayout(setScale(layout, s))}>
                  {SCALE_LABELS[s]}
                </button>
              ))}
            </div>
            <p className="muted small layout-size-help">Sets the height of every dock row ({rowHeightPx(layout)} px).</p>
          </section>

          <Button variant="outline" block onClick={() => void onReset()} data-testid="layout-reset">
            Reset layout
          </Button>
        </aside>
      </div>
    </div>
  )
}

function Stepper({
  label,
  value,
  unit,
  canDec,
  canInc,
  onDec,
  onInc,
  testId,
}: {
  label: string
  value: number
  unit: string
  canDec: boolean
  canInc: boolean
  onDec: () => void
  onInc: () => void
  testId: string
}) {
  return (
    <div className="layout-stepper" role="group" aria-label={label}>
      <span className="label">{label}</span>
      <div className="layout-stepper-controls">
        <Button variant="outline" aria-label={`Decrease ${label.toLowerCase()}`} disabled={!canDec} onClick={onDec} data-testid={`${testId}-dec`}>
          −
        </Button>
        <span className="layout-stepper-value mono" aria-live="polite" data-testid={`${testId}-value`}>
          {value} <span className="muted small">{unit}</span>
        </span>
        <Button variant="outline" aria-label={`Increase ${label.toLowerCase()}`} disabled={!canInc} onClick={onInc} data-testid={`${testId}-inc`}>
          +
        </Button>
      </div>
    </div>
  )
}
