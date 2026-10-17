// Button dock layout model: a 12 x 6 grid of customizable buttons that lives
// outside the header and court, so buttons can never cover them.

export const DOCK_COLS = 12
export const DOCK_ROWS = 6
export const MIN_W = 2
export const MAX_W = DOCK_COLS
export const MIN_H = 1
export const MAX_H = 3

export const DOCK_BUTTON_IDS = [
  'newSet',
  'setLog',
  'stats',
  'undo',
  'swapSides',
  'teams',
  'settings',
  'home',
  'editLayout',
] as const
export type DockButtonId = (typeof DOCK_BUTTON_IDS)[number]

export const DOCK_BUTTON_LABELS: Record<DockButtonId, string> = {
  newSet: 'New Set',
  setLog: 'Set Log',
  stats: 'Stats',
  undo: 'Undo',
  swapSides: 'Swap Sides',
  teams: 'Teams',
  settings: 'Settings',
  home: 'Home',
  editLayout: 'Edit Layout',
}

export interface DockButton {
  id: DockButtonId
  col: number
  row: number
  w: number
  h: number
  visible: boolean
}

export type DockScale = 'sm' | 'md' | 'lg'
export const SCALE_ROW_PX: Record<DockScale, number> = { sm: 44, md: 52, lg: 60 }
export const SCALE_LABELS: Record<DockScale, string> = { sm: 'Small', md: 'Medium', lg: 'Large' }

export interface LayoutConfig {
  scale: DockScale
  buttons: DockButton[]
}

export function defaultLayout(): LayoutConfig {
  return {
    scale: 'md',
    buttons: [
      { id: 'newSet', col: 0, row: 0, w: 3, h: 1, visible: true },
      { id: 'setLog', col: 3, row: 0, w: 3, h: 1, visible: true },
      { id: 'stats', col: 6, row: 0, w: 3, h: 1, visible: true },
      { id: 'undo', col: 9, row: 0, w: 3, h: 1, visible: true },
      { id: 'swapSides', col: 0, row: 1, w: 3, h: 1, visible: true },
      { id: 'teams', col: 3, row: 1, w: 3, h: 1, visible: true },
      { id: 'settings', col: 6, row: 1, w: 2, h: 1, visible: true },
      { id: 'home', col: 8, row: 1, w: 2, h: 1, visible: true },
      { id: 'editLayout', col: 10, row: 1, w: 2, h: 1, visible: true },
    ],
  }
}

export interface Rect {
  col: number
  row: number
  w: number
  h: number
}

export function collides(a: Rect, b: Rect): boolean {
  return a.col < b.col + b.w && b.col < a.col + a.w && a.row < b.row + b.h && b.row < a.row + a.h
}

export function inBounds(r: Rect): boolean {
  return (
    Number.isInteger(r.col) &&
    Number.isInteger(r.row) &&
    Number.isInteger(r.w) &&
    Number.isInteger(r.h) &&
    r.col >= 0 &&
    r.row >= 0 &&
    r.w >= MIN_W &&
    r.w <= MAX_W &&
    r.h >= MIN_H &&
    r.h <= MAX_H &&
    r.col + r.w <= DOCK_COLS &&
    r.row + r.h <= DOCK_ROWS
  )
}

/** Visible buttons (other than `candidate.id`) that overlap `candidate`. */
export function findCollisions(buttons: DockButton[], candidate: Rect & { id: DockButtonId }): DockButton[] {
  return buttons.filter((b) => b.visible && b.id !== candidate.id && collides(b, candidate))
}

export function canPlace(buttons: DockButton[], candidate: Rect & { id: DockButtonId }): boolean {
  return inBounds(candidate) && findCollisions(buttons, candidate).length === 0
}

/**
 * First free slot for a button of the requested size, scanning rows top-to-bottom then
 * columns left-to-right, shrinking the width (down to MIN_W) when nothing fits. Null if the
 * grid is full.
 */
export function autoPlace(buttons: DockButton[], button: Omit<DockButton, 'col' | 'row'>): DockButton | null {
  const h = clamp(button.h, MIN_H, MAX_H)
  for (let w = clamp(button.w, MIN_W, MAX_W); w >= MIN_W; w--) {
    for (let row = 0; row + h <= DOCK_ROWS; row++) {
      for (let col = 0; col + w <= DOCK_COLS; col++) {
        const candidate = { id: button.id, col, row, w, h }
        if (canPlace(buttons, candidate)) return { ...candidate, visible: button.visible }
      }
    }
  }
  return null
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/** Number of grid rows actually used by visible buttons (at least 1). */
export function usedRows(layout: LayoutConfig): number {
  return Math.max(1, ...layout.buttons.filter((b) => b.visible).map((b) => b.row + b.h))
}

export function rowHeightPx(layout: LayoutConfig): number {
  return SCALE_ROW_PX[layout.scale]
}

/**
 * Coerce anything (old versions, hand-edited JSON, undefined) into a valid layout: unknown
 * buttons dropped, missing buttons added, overlapping / out-of-bounds buttons re-placed.
 */
export function validateLayout(raw: unknown): LayoutConfig {
  const fallback = defaultLayout()
  const scale: DockScale = isScale((raw as { scale?: unknown } | undefined)?.scale)
    ? ((raw as { scale: DockScale }).scale)
    : fallback.scale
  const rawButtons = Array.isArray((raw as { buttons?: unknown } | undefined)?.buttons)
    ? ((raw as { buttons: unknown[] }).buttons)
    : []
  const placed: DockButton[] = []
  const pending: Omit<DockButton, 'col' | 'row'>[] = []
  const seen = new Set<DockButtonId>()

  for (const item of rawButtons) {
    if (!item || typeof item !== 'object') continue
    const b = item as Partial<DockButton>
    if (!isButtonId(b.id) || seen.has(b.id)) continue
    seen.add(b.id)
    const candidate: DockButton = {
      id: b.id,
      col: num(b.col, 0),
      row: num(b.row, 0),
      w: clamp(num(b.w, 3), MIN_W, MAX_W),
      h: clamp(num(b.h, 1), MIN_H, MAX_H),
      visible: b.visible !== false,
    }
    if (!candidate.visible) {
      placed.push(candidate)
    } else if (canPlace(placed, candidate)) {
      placed.push(candidate)
    } else {
      pending.push(candidate)
    }
  }
  for (const def of fallback.buttons) {
    if (!seen.has(def.id)) pending.push({ id: def.id, w: def.w, h: def.h, visible: def.visible })
  }
  for (const p of pending) {
    const spot = autoPlace(placed, p) ?? autoPlace(placed, { ...p, visible: false })
    if (spot) placed.push(spot)
    else placed.push({ id: p.id, col: 0, row: 0, w: MIN_W, h: MIN_H, visible: false })
  }
  // keep a stable order for rendering/editing
  placed.sort((a, b) => DOCK_BUTTON_IDS.indexOf(a.id) - DOCK_BUTTON_IDS.indexOf(b.id))
  return { scale, buttons: placed }
}

function num(v: unknown, d: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : d
}

export function isScale(v: unknown): v is DockScale {
  return v === 'sm' || v === 'md' || v === 'lg'
}

export function isButtonId(v: unknown): v is DockButtonId {
  return typeof v === 'string' && (DOCK_BUTTON_IDS as readonly string[]).includes(v)
}

/** Returns the updated layout, or null when the move is not allowed. */
export function moveButton(layout: LayoutConfig, id: DockButtonId, col: number, row: number): LayoutConfig | null {
  const b = layout.buttons.find((x) => x.id === id)
  if (!b) return null
  const candidate = { ...b, col, row }
  if (!canPlace(layout.buttons, candidate)) return null
  return { ...layout, buttons: layout.buttons.map((x) => (x.id === id ? candidate : x)) }
}

/** Returns the updated layout, or null when the resize is not allowed. */
export function resizeButton(layout: LayoutConfig, id: DockButtonId, w: number, h: number): LayoutConfig | null {
  const b = layout.buttons.find((x) => x.id === id)
  if (!b) return null
  const candidate = { ...b, w, h }
  if (!canPlace(layout.buttons, candidate)) return null
  return { ...layout, buttons: layout.buttons.map((x) => (x.id === id ? candidate : x)) }
}

/** Show/hide a button; a re-shown button that now overlaps is auto-placed elsewhere. */
export function setButtonVisible(layout: LayoutConfig, id: DockButtonId, visible: boolean): LayoutConfig {
  const b = layout.buttons.find((x) => x.id === id)
  if (!b || b.visible === visible) return layout
  if (!visible) return { ...layout, buttons: layout.buttons.map((x) => (x.id === id ? { ...x, visible: false } : x)) }
  const others = layout.buttons.filter((x) => x.id !== id)
  const shown = { ...b, visible: true }
  const placed = canPlace(others, shown) ? shown : autoPlace(others, shown)
  if (!placed) return layout
  return { ...layout, buttons: layout.buttons.map((x) => (x.id === id ? placed : x)) }
}

export function setScale(layout: LayoutConfig, scale: DockScale): LayoutConfig {
  return { ...layout, scale }
}
