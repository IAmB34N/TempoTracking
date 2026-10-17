import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface ToastOptions {
  /** ms; defaults to 2200 */
  duration?: number
  tone?: 'default' | 'success' | 'danger'
  /** Optional action button (e.g. Undo). */
  action?: { label: string; onClick: () => void }
  /** Replace whatever is showing instead of stacking under it (rapid-fire actions). */
  replace?: boolean
}

interface ToastItem extends ToastOptions {
  id: number
  message: string
}

interface ToastApi {
  show: (message: string, opts?: ToastOptions) => void
  dismiss: (id: number) => void
  /** Remove every toast at once (used on navigation). */
  clear: () => void
  /**
   * Render toasts inside this element (reserved space on a page, e.g. the tracking hint strip)
   * instead of the floating region. Pass null to go back to the floating region.
   */
  setSlot: (el: HTMLElement | null) => void
}

/** At most this many toasts are visible at once. */
const MAX_VISIBLE = 2

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const [slot, setSlotState] = useState<HTMLElement | null>(null)
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), [])
  const clear = useCallback(() => setItems([]), [])
  const show = useCallback(
    (message: string, opts: ToastOptions = {}) => {
      const id = ++counter.current
      const { replace, ...rest } = opts
      setItems((list) => (replace ? [] : list.slice(1 - MAX_VISIBLE)).concat({ id, message, ...rest }))
      window.setTimeout(() => dismiss(id), opts.duration ?? 2200)
    },
    [dismiss],
  )
  const setSlot = useCallback((el: HTMLElement | null) => setSlotState(el), [])
  const api = useMemo(() => ({ show, dismiss, clear, setSlot }), [show, dismiss, clear, setSlot])

  // A toast belongs to the page that raised it: drop them all when the route changes.
  useEffect(() => {
    window.addEventListener('hashchange', clear)
    return () => window.removeEventListener('hashchange', clear)
  }, [clear])

  const region = (
    <div className={['toast-region', slot ? 'toast-region-inline' : ''].filter(Boolean).join(' ')} aria-live="polite" aria-atomic="false">
      {items.map((t) => (
        <div key={t.id} className={['toast', `toast-${t.tone ?? 'default'}`].join(' ')} role="status">
          <span className="toast-message">{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                t.action?.onClick()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {slot ? createPortal(region, slot) : region}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
