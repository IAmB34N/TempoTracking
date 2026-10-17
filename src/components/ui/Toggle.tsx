import type { ReactNode } from 'react'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
  id?: string
}

export function Toggle({ checked, onChange, label, description, disabled, id }: ToggleProps) {
  const toggle = () => {
    if (!disabled) onChange(!checked)
  }
  return (
    // The whole row is the tap target: the text toggles the switch too (the switch itself
    // stops propagation so a tap on it does not fire twice).
    <div className={['toggle-row', disabled ? 'is-disabled' : ''].join(' ')} onClick={toggle}>
      <div className="toggle-text">
        <div className="toggle-label" id={id ? `${id}-label` : undefined}>
          {label}
        </div>
        {description && <div className="toggle-desc">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-labelledby={id ? `${id}-label` : undefined}
        aria-label={id ? undefined : typeof label === 'string' ? label : undefined}
        className={['toggle', checked ? 'is-on' : ''].join(' ')}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          toggle()
        }}
      >
        <span className="toggle-knob" />
      </button>
    </div>
  )
}
