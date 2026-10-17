import { useState, type KeyboardEvent } from 'react'
import { POSITION_PLURALS } from '../lib/labels'
import { POSITIONS, type Position, type Roster } from '../lib/types'
import { IconClose, IconPlus } from './Icons'

export interface RosterEditorProps {
  roster: Roster
  onChange: (roster: Roster) => void
  /** Colors the chips for Team A (orange) or Team B (pink). */
  team?: 'a' | 'b'
  idPrefix: string
  disabled?: boolean
}

/** Split "1, 5 12" into ["1","5","12"]; keeps alphanumerics like "00" or "1A". */
export function parseNumbers(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 4)
}

export function addNumbers(roster: Roster, position: Position, text: string): Roster {
  const existing = new Set(roster[position])
  const additions = parseNumbers(text).filter((n) => {
    if (existing.has(n)) return false
    existing.add(n)
    return true
  })
  if (!additions.length) return roster
  return { ...roster, [position]: [...roster[position], ...additions] }
}

export function removeNumber(roster: Roster, position: Position, number: string): Roster {
  return { ...roster, [position]: roster[position].filter((n) => n !== number) }
}

export function RosterEditor({ roster, onChange, team = 'a', idPrefix, disabled }: RosterEditorProps) {
  return (
    <div className="roster-editor">
      {POSITIONS.map((pos) => (
        <PositionRow key={pos} position={pos} numbers={roster[pos]} team={team} idPrefix={idPrefix} disabled={disabled} onAdd={(text) => onChange(addNumbers(roster, pos, text))} onRemove={(n) => onChange(removeNumber(roster, pos, n))} />
      ))}
    </div>
  )
}

function PositionRow({
  position,
  numbers,
  team,
  idPrefix,
  disabled,
  onAdd,
  onRemove,
}: {
  position: Position
  numbers: string[]
  team: 'a' | 'b'
  idPrefix: string
  disabled?: boolean
  onAdd: (text: string) => void
  onRemove: (n: string) => void
}) {
  const [text, setText] = useState('')
  const inputId = `${idPrefix}-${position}`
  const commit = () => {
    if (!text.trim()) return
    onAdd(text)
    setText('')
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !text && numbers.length) {
      onRemove(numbers[numbers.length - 1]!)
    }
  }
  return (
    <div className="roster-row">
      <label className="label roster-label" htmlFor={inputId}>
        {POSITION_PLURALS[position]}
      </label>
      <div className="roster-chips" role="list" aria-label={`${POSITION_PLURALS[position]} numbers`}>
        {numbers.map((n) => (
          <span key={n} className={['chip', `chip-${team}`].join(' ')} role="listitem">
            #{n}
            {!disabled && (
              <button type="button" className="chip-remove" aria-label={`Remove number ${n} from ${POSITION_PLURALS[position]}`} onClick={() => onRemove(n)}>
                <IconClose size={14} />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <span className="roster-add">
            <input
              id={inputId}
              className="input input-sm roster-input"
              inputMode="numeric"
              autoComplete="off"
              placeholder="No."
              aria-label={`Add ${POSITION_PLURALS[position]} number`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKey}
              onBlur={commit}
            />
            <button type="button" className="btn btn-outline btn-sm roster-add-btn" onClick={commit} aria-label={`Add ${POSITION_PLURALS[position]} number`}>
              <IconPlus size={18} />
            </button>
          </span>
        )}
      </div>
    </div>
  )
}
