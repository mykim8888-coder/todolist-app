import type { ButtonHTMLAttributes, FC } from 'react'
import { Spinner } from './Spinner'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold text-gray-500 bg-transparent hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150',
}

const sizeOverrides: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 text-[13px]',
  md: '',
  lg: 'h-12 text-[15px]',
}

export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}) => {
  const isDisabled = loading || disabled

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={[variantClasses[variant], sizeOverrides[size], className].filter(Boolean).join(' ')}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
