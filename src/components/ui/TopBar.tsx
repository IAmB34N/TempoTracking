import type { ReactNode } from 'react'
import { goBack, navigate } from '../../lib/router'
import { IconBack } from '../Icons'
import { LogoMark } from '../Logo'

export interface TopBarProps {
  title: ReactNode
  /** Route to go back to; when omitted uses browser history with "/" as fallback. */
  back?: string | false
  right?: ReactNode
  subtitle?: ReactNode
}

export function TopBar({ title, back, right, subtitle }: TopBarProps) {
  const onBack = () => (typeof back === 'string' ? navigate(back) : goBack('/'))
  return (
    <header className="topbar">
      {back !== false && (
        <button type="button" className="topbar-back" onClick={onBack} aria-label="Back">
          <IconBack size={24} />
        </button>
      )}
      <a href="#/" className="topbar-logo" aria-label="Tempo home">
        <LogoMark size={30} />
      </a>
      <div className="topbar-title-wrap">
        <h1 className="topbar-title">{title}</h1>
        {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
      </div>
      <div className="topbar-right">{right}</div>
    </header>
  )
}
