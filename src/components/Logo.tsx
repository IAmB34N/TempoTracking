import { APP_MOTTO, APP_NAME } from '../lib/labels'

/** The Tempo mark: an orange lightning bolt on a black rounded square with pink sparks. */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={['logo-mark', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`${APP_NAME} logo`}
    >
      <defs>
        <linearGradient id="tempo-bolt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb061" />
          <stop offset="0.55" stopColor="#ff6a00" />
          <stop offset="1" stopColor="#ff3d8a" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" className="logo-bg" />
      <path d="M38 5 L13 36 H29 L23 59 L52 25 H35 L42 5 Z" fill="url(#tempo-bolt)" className="logo-bolt" />
      <path d="M38 5 L13 36 H29 L23 59 L52 25 H35 L42 5 Z" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" strokeLinejoin="round" />
      <g className="logo-sparks" stroke="#ff3d8a" strokeWidth="2.5" strokeLinecap="round">
        <line x1="8" y1="14" x2="12" y2="18" />
        <line x1="52" y1="48" x2="56" y2="52" />
        <line x1="54" y1="12" x2="50" y2="16" />
      </g>
    </svg>
  )
}

export function Logo({ size = 'md', motto = false, className }: { size?: 'sm' | 'md' | 'lg' | 'xl'; motto?: boolean; className?: string }) {
  const px = { sm: 28, md: 40, lg: 72, xl: 108 }[size]
  return (
    <div className={['logo', `logo-${size}`, className].filter(Boolean).join(' ')}>
      <div className="logo-row">
        <LogoMark size={px} />
        <span className="logo-word">{APP_NAME}</span>
      </div>
      {motto && <p className="logo-motto">{APP_MOTTO}</p>}
    </div>
  )
}
