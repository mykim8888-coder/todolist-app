import type { FC, ReactNode } from 'react'

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary'
  children: ReactNode
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-gray-100 text-gray-600',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-600',
  primary: 'bg-violet-50 text-violet-700',
}

export const Badge: FC<BadgeProps> = ({ variant = 'default', children }) => (
  <span
    className={`inline-flex items-center h-[22px] px-2 rounded-full text-xs font-medium tracking-wide ${variantClasses[variant]}`}
  >
    {children}
  </span>
)
