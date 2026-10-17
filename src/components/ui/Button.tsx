import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  icon?: ReactNode
  children?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

export function Button({ variant = 'primary', size = 'md', block = false, icon, className, children, type = 'button', ref, ...rest }: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={['btn', `btn-${variant}`, `btn-${size}`, block ? 'btn-block' : '', className ?? ''].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {children !== undefined && <span className="btn-label">{children}</span>}
    </button>
  )
}
