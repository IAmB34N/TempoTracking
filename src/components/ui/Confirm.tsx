import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from './Button'

export interface ConfirmOptions {
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  const confirm = useCallback<ConfirmFn>((opts) => new Promise<boolean>((resolve) => setPending({ ...opts, resolve })), [])

  const close = useCallback(
    (ok: boolean) => {
      setPending((p) => {
        p?.resolve(ok)
        return null
      })
    },
    [],
  )

  useEffect(() => {
    if (!pending) return
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending, close])

  const value = useMemo(() => confirm, [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending && (
        <div className="modal-backdrop" onClick={() => close(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="confirm-title" className="modal-title">
              {pending.title}
            </h2>
            {pending.message && <div className="modal-body">{pending.message}</div>}
            <div className="modal-actions">
              <Button variant="outline" onClick={() => close(false)}>
                {pending.cancelLabel ?? 'Cancel'}
              </Button>
              <Button ref={confirmRef} variant={pending.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
                {pending.confirmLabel ?? 'OK'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return ctx
}
