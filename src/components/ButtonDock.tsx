import type { CSSProperties, ReactNode } from 'react'
import { DOCK_COLS, DOCK_ROWS, rowHeightPx, usedRows, type DockButton, type LayoutConfig } from '../lib/layout'

export interface ButtonDockProps {
  layout: LayoutConfig
  /** Render the content of one visible button (usually a <Button>). */
  renderButton: (button: DockButton) => ReactNode
  /** Rows to render; defaults to the rows actually used (editor passes DOCK_ROWS). */
  rows?: number
  /** Draw the grid cells (editor). */
  showGrid?: boolean
  /** Also render hidden buttons (editor, dimmed). */
  includeHidden?: boolean
  className?: string
  style?: CSSProperties
  /** Extra absolutely-positioned overlay (editor ghosts). */
  children?: ReactNode
  cellProps?: (button: DockButton) => Record<string, unknown>
}

export function dockGridStyle(layout: LayoutConfig, rows: number): CSSProperties {
  return {
    gridTemplateColumns: `repeat(${DOCK_COLS}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, ${rowHeightPx(layout)}px)`,
  }
}

export function ButtonDock({ layout, renderButton, rows, showGrid = false, includeHidden = false, className, style, children, cellProps }: ButtonDockProps) {
  const r = rows ?? usedRows(layout)
  const buttons = layout.buttons.filter((b) => includeHidden || b.visible)
  return (
    <div className={['dock', showGrid ? 'dock-grid-visible' : '', className ?? ''].filter(Boolean).join(' ')} style={{ ...dockGridStyle(layout, r), ...style }} data-rows={r}>
      {showGrid &&
        Array.from({ length: DOCK_ROWS * DOCK_COLS }, (_, i) => (
          <div key={'cell' + i} className="dock-cell-bg" style={{ gridColumn: (i % DOCK_COLS) + 1, gridRow: Math.floor(i / DOCK_COLS) + 1 }} aria-hidden />
        ))}
      {buttons.map((b) => (
        <div
          key={b.id}
          className={['dock-cell', b.visible ? '' : 'dock-cell-hidden'].join(' ')}
          style={{ gridColumn: `${b.col + 1} / span ${b.w}`, gridRow: `${b.row + 1} / span ${b.h}` }}
          data-button={b.id}
          {...(cellProps?.(b) ?? {})}
        >
          {renderButton(b)}
        </div>
      ))}
      {children}
    </div>
  )
}
