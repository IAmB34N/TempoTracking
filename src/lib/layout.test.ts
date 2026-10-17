import { describe, expect, it } from 'vitest'
import {
  DOCK_BUTTON_IDS,
  DOCK_COLS,
  DOCK_ROWS,
  autoPlace,
  canPlace,
  collides,
  compactAround,
  defaultLayout,
  moveButton,
  resizeButton,
  setButtonVisible,
  usedRows,
  validateLayout,
  type DockButton,
} from './layout'

function overlapsAny(buttons: DockButton[]): boolean {
  const vis = buttons.filter((b) => b.visible)
  for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) if (collides(vis[i]!, vis[j]!)) return true
  return false
}

describe('layout', () => {
  it('default layout is valid, complete and overlap-free', () => {
    const l = defaultLayout()
    expect(l.buttons.map((b) => b.id).sort()).toEqual([...DOCK_BUTTON_IDS].sort())
    expect(overlapsAny(l.buttons)).toBe(false)
    expect(l.buttons.every((b) => canPlace(l.buttons, b))).toBe(true)
    expect(usedRows(l)).toBe(2)
  })

  it('rejects moves that overlap or leave the grid', () => {
    const l = defaultLayout()
    expect(moveButton(l, 'newSet', 3, 0)).toBeNull() // onto setLog
    expect(moveButton(l, 'newSet', DOCK_COLS - 1, 0)).toBeNull() // off the right edge
    expect(moveButton(l, 'newSet', 0, DOCK_ROWS)).toBeNull() // off the bottom
    const moved = moveButton(l, 'newSet', 0, 4)
    expect(moved?.buttons.find((b) => b.id === 'newSet')).toMatchObject({ col: 0, row: 4 })
    expect(overlapsAny(moved!.buttons)).toBe(false)
  })

  it('rejects resizes that overlap and clamps sizes', () => {
    const l = defaultLayout()
    expect(resizeButton(l, 'newSet', 4, 1)).toBeNull() // grows into setLog
    expect(resizeButton(l, 'newSet', 1, 1)).toBeNull() // below MIN_W
    expect(resizeButton(l, 'newSet', 3, 4)).toBeNull() // above MAX_H
    const bigger = resizeButton(moveButton(l, 'newSet', 0, 3)!, 'newSet', 12, 3)
    expect(bigger?.buttons.find((b) => b.id === 'newSet')).toMatchObject({ col: 0, row: 3, w: 12, h: 3 })
  })

  it('hidden buttons do not block placement and get re-placed when shown', () => {
    let l = defaultLayout()
    l = setButtonVisible(l, 'setLog', false)
    expect(moveButton(l, 'newSet', 3, 0)).not.toBeNull()
    l = moveButton(l, 'newSet', 3, 0)!
    l = setButtonVisible(l, 'setLog', true)
    const setLog = l.buttons.find((b) => b.id === 'setLog')!
    expect(setLog.visible).toBe(true)
    expect(overlapsAny(l.buttons)).toBe(false)
  })

  it('autoPlace finds the first free slot and shrinks when needed', () => {
    const l = defaultLayout()
    const spot = autoPlace(l.buttons, { id: 'home', w: 12, h: 1, visible: true })
    expect(spot).toMatchObject({ row: 2, col: 0, w: 12 })
    // fill every row with 12-wide buttons except the last, then ask for a 12-wide 2-tall button
    const full: DockButton[] = DOCK_BUTTON_IDS.slice(0, 5).map((id, i) => ({ id, col: 0, row: i, w: 12, h: 1, visible: true }))
    expect(autoPlace(full, { id: 'home', w: 12, h: 2, visible: true })).toBeNull()
    expect(autoPlace(full, { id: 'home', w: 12, h: 1, visible: true })).toMatchObject({ row: 5 })
  })

  it('validateLayout repairs garbage and keeps every button', () => {
    const repaired = validateLayout({
      scale: 'huge',
      buttons: [
        { id: 'newSet', col: 0, row: 0, w: 6, h: 1 },
        { id: 'setLog', col: 2, row: 0, w: 6, h: 1 }, // overlaps newSet
        { id: 'stats', col: 40, row: -2, w: 99, h: 0 }, // nonsense
        { id: 'bogus', col: 0, row: 0, w: 2, h: 1 },
        'nope',
      ],
    })
    expect(repaired.scale).toBe('md')
    expect(repaired.buttons.map((b) => b.id).sort()).toEqual([...DOCK_BUTTON_IDS].sort())
    expect(overlapsAny(repaired.buttons)).toBe(false)
    expect(repaired.buttons.every((b) => !b.visible || canPlace(repaired.buttons, b))).toBe(true)
    expect(validateLayout(undefined)).toEqual(defaultLayout())
  })

  it('validateLayout re-places hidden buttons that are out of the grid or over a visible one', () => {
    const repaired = validateLayout({
      scale: 'md',
      buttons: [
        { id: 'home', col: 40, row: -3, w: 3, h: 1, visible: false },
        { id: 'setLog', col: 0, row: 0, w: 3, h: 1, visible: false }, // under newSet, listed first
        { id: 'newSet', col: 0, row: 0, w: 3, h: 1, visible: true },
        { id: 'stats', col: 6, row: 5, w: 2, h: 1, visible: false }, // fine where it is
      ],
    })
    const home = repaired.buttons.find((b) => b.id === 'home')!
    expect(home.visible).toBe(false)
    expect(canPlace(repaired.buttons, home)).toBe(true)
    expect(repaired.buttons.find((b) => b.id === 'newSet')).toMatchObject({ col: 0, row: 0, visible: true })
    expect(canPlace(repaired.buttons, repaired.buttons.find((b) => b.id === 'setLog')!)).toBe(true)
    expect(repaired.buttons.find((b) => b.id === 'stats')).toMatchObject({ col: 6, row: 5, visible: false })
    expect(repaired.buttons.every((b) => canPlace(repaired.buttons, b))).toBe(true)
  })

  it('compactAround removes a button and slides its row-mates left into the gap', () => {
    const l = defaultLayout()
    const compact = compactAround(l, 'newSet')
    expect(compact.buttons.find((b) => b.id === 'newSet')).toBeUndefined()
    expect(compact.buttons.find((b) => b.id === 'setLog')).toMatchObject({ col: 0, row: 0 })
    expect(compact.buttons.find((b) => b.id === 'stats')).toMatchObject({ col: 3, row: 0 })
    expect(compact.buttons.find((b) => b.id === 'undo')).toMatchObject({ col: 6, row: 0 })
    // other rows are untouched and the persisted layout is not mutated
    expect(compact.buttons.find((b) => b.id === 'swapSides')).toMatchObject({ col: 0, row: 1 })
    expect(overlapsAny(compact.buttons)).toBe(false)
    expect(l.buttons.find((b) => b.id === 'setLog')).toMatchObject({ col: 3 })
    // a hidden or missing button leaves everyone where they are
    const hidden = setButtonVisible(l, 'newSet', false)
    expect(compactAround(hidden, 'newSet').buttons.find((b) => b.id === 'setLog')).toMatchObject({ col: 3 })
  })
})
