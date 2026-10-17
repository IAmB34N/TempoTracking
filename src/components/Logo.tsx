import { useId } from 'react'
import { APP_MOTTO, APP_NAME } from '../lib/labels'

/*
 * Tempo logo system (keep in sync with scripts/make-brand.mjs, which writes the SVG/PNG files).
 * The wordmark is a custom "lightning" lettering: angular letters with bolt-angle cuts, and the
 * T's stem IS a lightning bolt. That bolt-T is the mark:
 *   <LogoPrimary>   the wordmark with a gradient-orange bolt-T (headers, hero, documents)
 *   <LogoSecondary> stacked: big bolt-T mark above a one-colour wordmark (square placements)
 *   <Submark>       the bolt-T in a black circle/rounded square (top bars, avatars, watermarks)
 *   favicon         solid-orange bolt-T on a black rounded square (public/favicon.svg)
 */

/** Cap height 100; the bolt tip of the T reaches y = 110. */
export const WORDMARK_HEIGHT = 112
export const WORDMARK_WIDTH = 478
export const SKEW = -8

/** The bolt-T glyph: a crossbar whose stem zigzags into a lightning bolt. Box 84 × 110. */
export const BOLT_T_PATH = 'M0 0H84V22H58L46 58H58L26 110L32 58H22L34 22H0Z'

export const LETTERS: Array<{ x: number; d: string; bolt?: boolean }> = [
  { x: 0, d: BOLT_T_PATH, bolt: true },
  // E — arms end in bolt-angle points
  { x: 96, d: 'M0 0H70L62 22H24V38H60L52 62H24V78H70L62 100H0Z' },
  // M — deep V apex
  { x: 178, d: 'M0 0H26L53 50L80 0H106V100H82V38L62 74H44L24 38V100H0Z' },
  // P — chamfered bowl
  { x: 296, d: 'M0 0H60L72 12V46L60 58H24V100H0ZM24 22H46L50 26V32L46 36H24Z' },
  // O — angular octagon
  { x: 380, d: 'M18 0H62L80 18V82L62 100H18L0 82V18ZM30 24L24 30V70L30 76H50L56 70V30L50 24Z' },
]

export function BoltGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stopColor="#ffb061" />
      <stop offset="0.5" stopColor="#ff6a00" />
      <stop offset="1" stopColor="#ff3d8a" />
    </linearGradient>
  )
}

function useGradientId(prefix: string) {
  return `${prefix}-${useId().replace(/:/g, '')}`
}

/** The bare bolt-T mark with the orange→pink gradient. `height` in px. */
export function BoltT({ height = 40, className, title, mono = false }: { height?: number; className?: string; title?: string; mono?: boolean }) {
  const gid = useGradientId('boltT')
  const w = (height * 90) / 110
  return (
    <svg className={['logo-bolt', className].filter(Boolean).join(' ')} width={w} height={height} viewBox="0 0 90 110" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <BoltGradient id={gid} />
      </defs>
      <g transform={`translate(16 0) skewX(${SKEW})`}>
        <path d={BOLT_T_PATH} fill={mono ? 'currentColor' : `url(#${gid})`} />
        {!mono && <path d={BOLT_T_PATH} fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" strokeLinejoin="round" />}
      </g>
    </svg>
  )
}

/** Backwards-compatible alias. */
export const Bolt = BoltT

/** The TEMPO lightning wordmark. Letters use currentColor; the bolt-T is gradient unless `mono`. */
export function Wordmark({ height = 24, mono = false, className }: { height?: number; mono?: boolean; className?: string }) {
  const gid = useGradientId('wordmark')
  return (
    <svg className={['logo-wordmark', className].filter(Boolean).join(' ')} width={(height * WORDMARK_WIDTH) / WORDMARK_HEIGHT} height={height} viewBox={`0 0 ${WORDMARK_WIDTH} ${WORDMARK_HEIGHT}`} role="img" aria-label={APP_NAME}>
      <defs>
        <BoltGradient id={gid} />
      </defs>
      <g transform={`translate(16 0) skewX(${SKEW})`} fill="currentColor" fillRule="evenodd">
        {LETTERS.map((l) => (
          <path key={l.x} d={l.d} transform={`translate(${l.x} 0)`} fill={l.bolt && !mono ? `url(#${gid})` : undefined} />
        ))}
      </g>
    </svg>
  )
}

/** Submark: the bolt-T in a black circle (or rounded square) with an orange ring and pink sparks. */
export function Submark({ size = 40, className, shape = 'circle' }: { size?: number; className?: string; shape?: 'circle' | 'square' }) {
  const gid = useGradientId('submark')
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
      <g transform="translate(29 18) scale(0.56) skewX(-8)">
        <path d={BOLT_T_PATH} fill={`url(#${gid})`} />
        <path d={BOLT_T_PATH} fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2.5" strokeLinejoin="round" />
      </g>
      <g stroke="#ff3d8a" strokeWidth="3.5" strokeLinecap="round">
        <line x1="22" y1="60" x2="27" y2="65" />
        <line x1="76" y1="66" x2="71" y2="71" />
      </g>
    </svg>
  )
}

/** Backwards-compatible name used by the top bar: the square submark. */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return <Submark size={size} className={className} shape="square" />
}

/** Primary logo: the lightning wordmark (gradient bolt-T), optional motto. `width` in px. */
export function LogoPrimary({ width = 260, motto = false, className }: { width?: number; motto?: boolean; className?: string }) {
  return (
    <div className={['logo logo-primary', className].filter(Boolean).join(' ')} style={{ width }}>
      <Wordmark height={(width * WORDMARK_HEIGHT) / WORDMARK_WIDTH} />
      {motto && <p className="logo-motto">{APP_MOTTO}</p>}
    </div>
  )
}

/** Secondary logo: the bolt-T mark stacked above a one-colour wordmark. `width` in px. */
export function LogoSecondary({ width = 200, motto = false, className }: { width?: number; motto?: boolean; className?: string }) {
  const wordHeight = (width * WORDMARK_HEIGHT) / WORDMARK_WIDTH
  return (
    <div className={['logo logo-secondary', className].filter(Boolean).join(' ')} style={{ width }}>
      <BoltT height={wordHeight * 1.9} title={`${APP_NAME} mark`} />
      <Wordmark height={wordHeight} mono />
      {motto && <p className="logo-motto">{APP_MOTTO}</p>}
    </div>
  )
}

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

/** Convenience wrapper used by pages. */
export function Logo({ size = 'md', motto = false, variant = 'primary', className }: { size?: LogoSize; motto?: boolean; variant?: 'primary' | 'secondary'; className?: string }) {
  const cls = [`logo-${size}`, className].filter(Boolean).join(' ')
  if (variant === 'secondary') return <LogoSecondary width={{ sm: 90, md: 140, lg: 200, xl: 260 }[size]} motto={motto} className={cls} />
  return <LogoPrimary width={{ sm: 96, md: 150, lg: 240, xl: 320 }[size]} motto={motto} className={cls} />
}
