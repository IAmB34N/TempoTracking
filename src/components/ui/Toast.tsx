import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

export interface ToastOptions {
  /** ms; defaults to 2200 */
  duration?: number
  tone?: 'default' | 'success' | 'danger'
  /** Optional action button (e.g. Undo). */
  action?: { label: string; onClick: () => void }
}

interface ToastItem extends ToastOptions {
  id: number
  message: string
}

interface ToastApi {
  show: (message: string, opts?: ToastOptions) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), [])
  const show = useCallback(
    (message: string, opts: ToastOptions = {}) => {
      const id = ++counter.current
      setItems((list) => [...list.slice(-2), { id, message, ...opts }])
      window.setTimeout(() => dismiss(id), opts.duration ?? 2200)
    },
    [dismiss],
  )
  const api = useMemo(() => ({ show, dismiss }), [show, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
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
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
