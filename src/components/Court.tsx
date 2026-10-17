import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { CourtPoint, TeamIndex } from '../lib/types'

/*
 * Volleyball court (18 m × 9 m) drawn in metres ×100 with a 1.5 m free zone around it.
 * Physical frame: u along the length (0 = left/top endline, 1 = right/bottom endline),
 * v across the width (0..1). The team on the left/top half is Team A unless `swapSides`.
 * Points are exchanged with callers in the TEAM-RELATIVE frame (see CourtPoint), so a
 * stored point keeps its meaning even when the teams switch sides.
 */

export const COURT_LENGTH = 18
export const COURT_WIDTH = 9
export const COURT_MARGIN = 1.5
const S = 100 // units per metre
const L = COURT_LENGTH * S
const W = COURT_WIDTH * S
const M = COURT_MARGIN * S

export interface CourtMarker {
  point: CourtPoint
  teamIndex: TeamIndex
  kind: 'set' | 'hit'
  label?: string
}

export type Orientation = 'horizontal' | 'vertical'

export interface CourtProps {
  teamNames: readonly [string, string]
  swapSides: boolean
  interactive?: boolean
  /** When set, taps anywhere are mapped into this team's frame (hit-location step). */
  lockTeam?: TeamIndex
  onSelect?: (point: CourtPoint, teamIndex: TeamIndex) => void
  markers?: readonly CourtMarker[]
  /** Draw an arrow from the first 'set' marker to the first 'hit' marker. */
  arrow?: boolean
  highlightTeam?: TeamIndex
  orientation?: 'auto' | Orientation
  className?: string
  ariaLabel?: string
}

export function leftTeam(swapSides: boolean): TeamIndex {
  return swapSides ? 1 : 0
}

/** Physical (u, v) → team-relative point for `team`. */
export function physicalToTeam(u: number, v: number, team: TeamIndex, swapSides: boolean): CourtPoint {
  return leftTeam(swapSides) === team ? { x: u, y: v } : { x: 1 - u, y: 1 - v }
}

/** Team-relative point → physical (u, v). */
export function teamToPhysical(p: CourtPoint, team: TeamIndex, swapSides: boolean): { u: number; v: number } {
  return leftTeam(swapSides) === team ? { u: p.x, v: p.y } : { u: 1 - p.x, v: 1 - p.y }
}

/** Team whose half contains the physical point. */
export function teamAt(u: number, swapSides: boolean): TeamIndex {
  const left = leftTeam(swapSides)
  return u < 0.5 ? left : ((1 - left) as TeamIndex)
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

/** SVG viewBox size for an orientation. */
export function viewBoxSize(o: Orientation): { w: number; h: number } {
  return o === 'horizontal' ? { w: L + 2 * M, h: W + 2 * M } : { w: W + 2 * M, h: L + 2 * M }
}

/**
 * Map a physical point to SVG units for the given orientation. The vertical court is the
 * horizontal one rotated 90° clockwise (left endline → top, top sideline → right), so a
 * marker stays on the same physical sideline whichever way the court is drawn.
 */
export function toSvg(u: number, v: number, o: Orientation): { x: number; y: number } {
  const along = M + u * L
  return o === 'horizontal' ? { x: along, y: M + v * W } : { x: M + (1 - v) * W, y: along }
}

/** Inverse of toSvg: SVG units → physical (u, v), unclamped. */
export function fromSvg(x: number, y: number, o: Orientation): { u: number; v: number } {
  return o === 'horizontal' ? { u: (x - M) / L, v: (y - M) / W } : { u: (y - M) / L, v: 1 - (x - M) / W }
}

/** Team-name font size (SVG units) that keeps the label inside its half of the court. */
export function nameFontSize(name: string, o: Orientation): number {
  const base = o === 'horizontal' ? 110 : 90
  const maxLen = (o === 'horizontal' ? L / 2 : W) - 2 * 60
  // ~0.75 em per character for the heavy italic uppercase face with its letter-spacing.
  const fit = maxLen / (Math.max(1, name.length) * 0.75)
  return Math.max(36, Math.min(base, fit))
}

/** Describe a point in plain words for screen readers / summaries. */
export function describePoint(p: CourtPoint): string {
  const depth = p.x < 0 ? 'behind the endline' : p.x < 1 / 6 ? 'deep in the back row' : p.x < 1 / 3 ? 'back row' : p.x < 0.5 ? 'front row' : p.x <= 1 ? "on the opponent's side" : 'out of bounds'
  const side = p.y < 1 / 3 ? 'left' : p.y < 2 / 3 ? 'middle' : 'right'
  return `${depth}, ${side}`
}

export function useAutoOrientation(ref: React.RefObject<HTMLElement | null>, orientation: 'auto' | Orientation): Orientation {
  const [auto, setAuto] = useState<Orientation>('horizontal')
  useEffect(() => {
    if (orientation !== 'auto') return
    const el = ref.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      setAuto(r.height > r.width ? 'vertical' : 'horizontal')
    }
    update()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [ref, orientation])
  return orientation === 'auto' ? auto : orientation
}

export function Court({
  teamNames,
  swapSides,
  interactive = false,
  lockTeam,
  onSelect,
  markers = [],
  arrow = false,
  highlightTeam,
  orientation = 'auto',
  className,
  ariaLabel,
}: CourtProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const o = useAutoOrientation(wrapRef, orientation)

  // Keep keyboard focus across the question panel. When the court stops being interactive it
  // loses its tabindex and the browser drops focus to <body>, sometimes at once (before any
  // effect runs) and sometimes only when the panel focuses its first option. Note either
  // case; once the court is interactive again and nothing else holds focus (the panel has
  // unmounted), focus comes back to the court instead of being lost on <body>.
  const refocus = useRef(false)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onFocusOut = (e: FocusEvent) => {
      if (e.relatedTarget === null && !svg.hasAttribute('tabindex')) refocus.current = true
    }
    svg.addEventListener('focusout', onFocusOut)
    return () => svg.removeEventListener('focusout', onFocusOut)
  }, [])
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    if (!interactive) {
      if (document.activeElement === svg) refocus.current = true
      return
    }
    if (!refocus.current) return
    refocus.current = false
    const active = document.activeElement
    if (!active || active === document.body) svg.focus({ preventScroll: true })
  }, [interactive])
  const { w: vbW, h: vbH } = viewBoxSize(o)
  const left = leftTeam(swapSides)
  const right = (1 - left) as TeamIndex

  const handlePointer = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      if (!interactive || !onSelect) return
      const svg = svgRef.current
      if (!svg) return
      const ctm = svg.getScreenCTM()
      if (!ctm) return
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
      const raw = fromSvg(pt.x, pt.y, o)
      const u = clamp(raw.u, -COURT_MARGIN / COURT_LENGTH, 1 + COURT_MARGIN / COURT_LENGTH)
      const v = clamp(raw.v, -COURT_MARGIN / COURT_WIDTH, 1 + COURT_MARGIN / COURT_WIDTH)
      const team = lockTeam ?? teamAt(u, swapSides)
      onSelect(physicalToTeam(u, v, team, swapSides), team)
    },
    [interactive, onSelect, o, lockTeam, swapSides],
  )

  const nameAt = (side: 'left' | 'right') => teamNames[side === 'left' ? left : right]

  // Keyboard placement: arrow keys move a cursor, Enter/Space places the point.
  const [cursor, setCursor] = useState<{ u: number; v: number } | null>(null)
  const onKeyDown = useCallback(
    (e: KeyboardEvent<SVGSVGElement>) => {
      if (!interactive || !onSelect) return
      const startU = lockTeam === undefined ? 0.25 : leftTeam(swapSides) === lockTeam ? 0.25 : 0.75
      const c = cursor ?? { u: startU, v: 0.5 }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const team = lockTeam ?? teamAt(c.u, swapSides)
        setCursor(c)
        onSelect(physicalToTeam(c.u, c.v, team, swapSides), team)
        return
      }
      const step = e.shiftKey ? 0.02 : 0.06
      let { u, v } = c
      const horizontal = o === 'horizontal'
      // Vertical is rotated clockwise: v = 0 is the viewer's right sideline.
      if (e.key === 'ArrowLeft') horizontal ? (u -= step) : (v += step)
      else if (e.key === 'ArrowRight') horizontal ? (u += step) : (v -= step)
      else if (e.key === 'ArrowUp') horizontal ? (v -= step) : (u -= step)
      else if (e.key === 'ArrowDown') horizontal ? (v += step) : (u += step)
      else return
      e.preventDefault()
      setCursor({
        u: clamp(u, -COURT_MARGIN / COURT_LENGTH, 1 + COURT_MARGIN / COURT_LENGTH),
        v: clamp(v, -COURT_MARGIN / COURT_WIDTH, 1 + COURT_MARGIN / COURT_WIDTH),
      })
    },
    [interactive, onSelect, cursor, lockTeam, swapSides, o],
  )
  const teamClass = (t: TeamIndex) => (t === 0 ? 'court-team-a' : 'court-team-b')
  const nameClass = (t: TeamIndex) => ['court-name', teamClass(t), markers.length ? 'court-name-dim' : ''].filter(Boolean).join(' ')
  const halfHighlighted = (t: TeamIndex) => (highlightTeam ?? lockTeam) === t

  // Half rectangles in SVG units.
  const halfRect = (side: 'left' | 'right') => {
    if (o === 'horizontal') return side === 'left' ? { x: M, y: M, w: L / 2, h: W } : { x: M + L / 2, y: M, w: L / 2, h: W }
    return side === 'left' ? { x: M, y: M, w: W, h: L / 2 } : { x: M, y: M + L / 2, w: W, h: L / 2 }
  }
  const lh = halfRect('left')
  const rh = halfRect('right')

  const attackOffset = 3 * S
  const lineAlong = (d: number) =>
    o === 'horizontal'
      ? { x1: M + d, y1: M, x2: M + d, y2: M + W }
      : { x1: M, y1: M + d, x2: M + W, y2: M + d }

  const setMarker = markers.find((m) => m.kind === 'set')
  const hitMarker = markers.find((m) => m.kind === 'hit')
  const svgOf = (m: CourtMarker) => {
    const { u, v } = teamToPhysical(m.point, m.teamIndex, swapSides)
    return toSvg(u, v, o)
  }

  return (
    <div ref={wrapRef} className={['court-wrap', o === 'vertical' ? 'court-vertical' : 'court-horizontal', className].filter(Boolean).join(' ')}>
      <svg
        ref={svgRef}
        className={['court', interactive ? 'court-interactive' : ''].join(' ')}
        viewBox={`0 0 ${vbW} ${vbH}`}
        role={interactive ? 'button' : 'img'}
        aria-label={ariaLabel ?? `Volleyball court. ${teamNames[left]} on the ${o === 'horizontal' ? 'left' : 'top'}, ${teamNames[right]} on the ${o === 'horizontal' ? 'right' : 'bottom'}.`}
        tabIndex={interactive ? 0 : undefined}
        aria-keyshortcuts={interactive ? 'ArrowUp ArrowDown ArrowLeft ArrowRight Enter' : undefined}
        aria-description={interactive ? 'Tap the court, or use the arrow keys to move the marker and Enter to place it.' : undefined}
        onPointerUp={handlePointer}
        onKeyDown={onKeyDown}
        onBlur={() => setCursor(null)}
        data-orientation={o}
        data-lock={lockTeam !== undefined ? '' : undefined}
      >
        <defs>
          <marker id="court-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className="court-arrowhead" />
          </marker>
        </defs>
        {/* free zone */}
        <rect x={0} y={0} width={vbW} height={vbH} className="court-out" rx={40} />
        {/* halves */}
        <rect {...lh} width={lh.w} height={lh.h} className={['court-half', teamClass(left), halfHighlighted(left) ? 'court-half-active' : ''].join(' ')} />
        <rect {...rh} width={rh.w} height={rh.h} className={['court-half', teamClass(right), halfHighlighted(right) ? 'court-half-active' : ''].join(' ')} />
        {/* lines */}
        <rect x={M} y={M} width={o === 'horizontal' ? L : W} height={o === 'horizontal' ? W : L} className="court-line" fill="none" />
        <line {...lineAlong(L / 2 - attackOffset)} className="court-line court-line-attack" />
        <line {...lineAlong(L / 2 + attackOffset)} className="court-line court-line-attack" />
        <line {...lineAlong(L / 2)} className="court-line court-line-center" />
        {/* net (slightly longer than the court width) */}
        {o === 'horizontal' ? (
          <line x1={M + L / 2} y1={M - 60} x2={M + L / 2} y2={M + W + 60} className="court-net" />
        ) : (
          <line x1={M - 60} y1={M + L / 2} x2={M + W + 60} y2={M + L / 2} className="court-net" />
        )}
        {/* team names */}
        {o === 'horizontal' ? (
          <>
            <text x={M + L / 4} y={M + W / 2} className={nameClass(left)} fontSize={nameFontSize(nameAt('left'), o)} textAnchor="middle" dominantBaseline="middle">
              {nameAt('left')}
            </text>
            <text x={M + (3 * L) / 4} y={M + W / 2} className={nameClass(right)} fontSize={nameFontSize(nameAt('right'), o)} textAnchor="middle" dominantBaseline="middle">
              {nameAt('right')}
            </text>
          </>
        ) : (
          <>
            <text x={M + W / 2} y={M + L / 4} className={nameClass(left)} fontSize={nameFontSize(nameAt('left'), o)} textAnchor="middle" dominantBaseline="middle">
              {nameAt('left')}
            </text>
            <text x={M + W / 2} y={M + (3 * L) / 4} className={nameClass(right)} fontSize={nameFontSize(nameAt('right'), o)} textAnchor="middle" dominantBaseline="middle">
              {nameAt('right')}
            </text>
          </>
        )}
        {/* arrow set -> hit */}
        {arrow && setMarker && hitMarker && (
          <line
            x1={svgOf(setMarker).x}
            y1={svgOf(setMarker).y}
            x2={svgOf(hitMarker).x}
            y2={svgOf(hitMarker).y}
            className="court-arrow"
            markerEnd="url(#court-arrowhead)"
          />
        )}
        {/* keyboard cursor */}
        {cursor && interactive && (() => {
          const { x, y } = toSvg(cursor.u, cursor.v, o)
          return (
            <g className="court-cursor" transform={`translate(${x} ${y})`} aria-hidden>
              <circle r={40} />
              <line x1={-70} y1={0} x2={70} y2={0} />
              <line x1={0} y1={-70} x2={0} y2={70} />
            </g>
          )
        })()}
        {/* markers */}
        {markers.map((m, i) => {
          const { x, y } = svgOf(m)
          return (
            <g key={i} className={['court-marker', m.kind === 'set' ? 'court-marker-set' : 'court-marker-hit'].join(' ')} transform={`translate(${x} ${y})`}>
              <circle r={46} className="court-marker-ring" />
              <circle r={30} className="court-marker-dot" />
              {m.label && (
                <text y={-64} textAnchor="middle" className="court-marker-label">
                  {m.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
