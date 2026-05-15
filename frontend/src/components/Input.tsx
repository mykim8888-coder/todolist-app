import { forwardRef, type InputHTMLAttributes } from 'react'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label?: string
  error?: string | undefined
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, error, className = '', ...props }, ref) => {
    const errorId = `${id}-error`
    const hasError = Boolean(error)

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-[13px] font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className={`input-field ${hasError ? 'input-error' : ''} ${className}`.trim()}
          {...props}
        />
        {hasError && (
          <p id={errorId} className="flex items-center gap-1 text-xs text-red-500 mt-1">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
