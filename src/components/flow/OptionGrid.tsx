import { Button, type ButtonVariant } from '../ui'

export interface Option<V extends string> {
  value: V
  label: string
  variant?: ButtonVariant
}

export interface OptionGridProps<V extends string> {
  options: readonly Option<V>[]
  onPick: (value: V) => void
  /** Compact jersey-number tiles instead of wide labelled buttons. */
  numbers?: boolean
  /** Prefix for data-testid: "flow-option-<value>". */
  testPrefix?: string
  ariaLabel: string
  autoFocusFirst?: boolean
}

/** A grid of large tap targets (≥ 64 px) for one flow question. */
export function OptionGrid<V extends string>({ options, onPick, numbers = false, testPrefix = 'flow-option', ariaLabel, autoFocusFirst = false }: OptionGridProps<V>) {
  return (
    <div className={['options', numbers ? 'options-numbers' : ''].filter(Boolean).join(' ')} role="group" aria-label={ariaLabel}>
      {options.map((o, i) => (
        <Button
          key={o.value}
          variant={o.variant ?? 'outline'}
          size="lg"
          data-testid={`${testPrefix}-${o.value}`}
          data-autofocus={autoFocusFirst && i === 0 ? 'true' : undefined}
          onClick={() => onPick(o.value)}
          aria-label={numbers ? `Number ${o.label}` : undefined}
        >
          {numbers ? `#${o.label}` : o.label}
        </Button>
      ))}
    </div>
  )
}
