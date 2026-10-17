import { useId } from 'react'
import { APP_MOTTO, APP_NAME } from '../lib/labels'

/*
 * Tempo logo system (keep in sync with scripts/make-brand.mjs, which writes the SVG/PNG files):
 *   <LogoPrimary>   stacked lockup — bolt above the TEMPO wordmark (hero, splash, square placements)
 *   <LogoSecondary> horizontal lockup — bolt beside the wordmark (headers, documents, wide placements)
 *   <Submark>       badge — bolt in a black circle (top bars, avatars, watermarks)
 *   favicon         simplified bolt on a rounded square (public/favicon.svg, 16–64 px)
 * The bolt is the "orange lightning": a gradient from light orange through orange to a pink tip.
 */

/** Bolt outline in a 60 × 100 box. */
export const BOLT_PATH = 'M42 0 L6 56 H28 L18 100 L60 40 H37 L48 0 Z'

/** Custom geometric italic wordmark "TEMPO": cap height 100, stroke 24, skewed −12°. */
export const WORDMARK_WIDTH = 482
export const WORDMARK_HEIGHT = 100
const LETTERS: Array<{ x: number; d: string }> = [
  // T
  { x: 0, d: 'M0 0H76V24H50V100H26V24H0Z' },
  // E
  { x: 90, d: 'M0 0H70V24H24V38H58V62H24V76H70V100H0Z' },
  // M
  { x: 174, d: 'M0 0H24L53 52L82 0H106V100H82V38L62 74H44L24 38V100H0Z' },
  // P
  { x: 294, d: 'M0 0H72V58H24V100H0ZM24 24V34H48V24Z' },
  // O (chamfered)
  { x: 380, d: 'M14 0H66L80 14V86L66 100H14L0 86V14ZM28 24L24 28V72L28 76H52L56 72V28L52 24Z' },
]

export function BoltGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#ffb061" />
      <stop offset="0.55" stopColor="#ff6a00" />
      <stop offset="1" stopColor="#ff3d8a" />
    </linearGradient>
  )
}

/** Bare gradient bolt. `height` in px; width follows the 3:5 ratio. */
export function Bolt({ height = 40, className, title }: { height?: number; className?: string; title?: string }) {
  const id = useId().replace(/:/g, '')
  const gid = `bolt-${id}`
  return (
    <svg className={['logo-bolt', className].filter(Boolean).join(' ')} width={(height * 60) / 100} height={height} viewBox="0 0 60 100" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <BoltGradient id={gid} />
      </defs>
      <path d={BOLT_PATH} fill={`url(#${gid})`} />
      <path d={BOLT_PATH} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

/** The TEMPO wordmark as vector paths (no font dependency). Uses currentColor. */
export function Wordmark({ height = 24, className }: { height?: number; className?: string }) {
  return (
    <svg className={['logo-wordmark', className].filter(Boolean).join(' ')} width={(height * WORDMARK_WIDTH) / WORDMARK_HEIGHT} height={height} viewBox={`0 0 ${WORDMARK_WIDTH} ${WORDMARK_HEIGHT}`} role="img" aria-label={APP_NAME}>
      <g transform="translate(21 0) skewX(-12)" fill="currentColor" fillRule="evenodd">
        {LETTERS.map((l) => (
          <path key={l.x} d={l.d} transform={`translate(${l.x} 0)`} />
        ))}
      </g>
    </svg>
  )
}

/** Submark: bolt in a black circle with an orange ring and pink sparks. */
export function Submark({ size = 40, className, shape = 'circle' }: { size?: number; className?: string; shape?: 'circle' | 'square' }) {
  const id = useId().replace(/:/g, '')
  const gid = `submark-${id}`
  return (
    <svg className={['logo-mark', className].filter(Boolean).join(' ')} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${APP_NAME} logo`}>
      <defs>
        <BoltGradient id={gid} />
      </defs>
      {shape === 'circle' ? (
        <>
          <circle cx="50" cy="50" r="50" className="logo-bg" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="#ff6a00" strokeWidth="3" strokeOpacity="0.9" />
        </>
      ) : (
        <>
          <rect x="0" y="0" width="100" height="100" rx="26" className="logo-bg" />
          <rect x="6" y="6" width="88" height="88" rx="21" fill="none" stroke="#ff6a00" strokeWidth="3" strokeOpacity="0.9" />
        </>
      )}
      <g transform="translate(32 20) scale(0.6)">
        <path d={BOLT_PATH} fill={`url(#${gid})`} />
        <path d={BOLT_PATH} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2.5" strokeLinejoin="round" />
      </g>
      <g stroke="#ff3d8a" strokeWidth="3.5" strokeLinecap="round">
        <line x1="24" y1="30" x2="29" y2="35" />
        <line x1="74" y1="68" x2="79" y2="73" />
        <line x1="76" y1="28" x2="71" y2="33" />
      </g>
    </svg>
  )
}

/** Backwards-compatible name used by the top bar: the square submark. */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return <Submark size={size} className={className} shape="square" />
}

/** Primary logo: stacked bolt over the wordmark, optional motto. `width` is the wordmark width in px. */
export function LogoPrimary({ width = 260, motto = false, className }: { width?: number; motto?: boolean; className?: string }) {
  const wordHeight = (width * WORDMARK_HEIGHT) / WORDMARK_WIDTH
  const boltHeight = wordHeight * 1.5
  return (
    <div className={['logo logo-primary', className].filter(Boolean).join(' ')} style={{ width }}>
      <Bolt height={boltHeight} title={`${APP_NAME} bolt`} />
      <Wordmark height={wordHeight} />
      {motto && <p className="logo-motto">{APP_MOTTO}</p>}
    </div>
  )
}

/** Secondary logo: bolt beside the wordmark on one line. `height` is the lockup height in px. */
export function LogoSecondary({ height = 32, motto = false, className }: { height?: number; motto?: boolean; className?: string }) {
  return (
    <div className={['logo logo-secondary', className].filter(Boolean).join(' ')}>
      <div className="logo-row" style={{ gap: height * 0.22 }}>
        <Bolt height={height} title={`${APP_NAME} bolt`} />
        <Wordmark height={height * 0.78} />
      </div>
      {motto && <p className="logo-motto">{APP_MOTTO}</p>}
    </div>
  )
}

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

/**
 * Convenience wrapper: small sizes render the secondary (horizontal) lockup, large sizes the
 * primary (stacked) one, unless `variant` is given.
 */
export function Logo({ size = 'md', motto = false, variant, className }: { size?: LogoSize; motto?: boolean; variant?: 'primary' | 'secondary'; className?: string }) {
  const v = variant ?? (size === 'lg' || size === 'xl' ? 'primary' : 'secondary')
  const cls = [`logo-${size}`, className].filter(Boolean).join(' ')
  if (v === 'primary') return <LogoPrimary width={{ sm: 120, md: 180, lg: 240, xl: 300 }[size]} motto={motto} className={cls} />
  return <LogoSecondary height={{ sm: 22, md: 30, lg: 44, xl: 60 }[size]} motto={motto} className={cls} />
}
