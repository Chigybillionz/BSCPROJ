'use client'

import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, id, type, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const [passwordVisible, setPasswordVisible] = useState(false)
    const isPassword = type === 'password'

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text)]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={isPassword && passwordVisible ? 'text' : type}
            className={cn(
              'w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] shadow-[var(--shadow-sm)] transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-[var(--color-rejected)] focus:ring-[var(--color-rejected)]',
              icon && 'pl-9',
              isPassword && 'pr-10',
              className
            )}
            aria-describedby={error ? `${inputId}-error` : undefined}
            aria-invalid={!!error}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setPasswordVisible(v => !v)}
              aria-label={passwordVisible ? 'Hide password' : 'Show password'}
              aria-pressed={passwordVisible}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
            >
              {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-[var(--color-rejected)]">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
