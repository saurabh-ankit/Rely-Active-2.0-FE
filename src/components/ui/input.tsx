import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'
import { Eye, EyeOff } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Textarea } from '@/components/ui/textarea'

export interface InputProps extends React.ComponentProps<'input'> {
  label?: string
  error?: string
  helperText?: React.ReactNode
  required?: boolean
  icon?: React.ReactNode
  rows?: number
}

function Input({
  className,
  type = 'text',
  label,
  error,
  helperText,
  required,
  icon,
  id,
  rows = 3,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const isPasswordField = type === 'password'
  const computedType = isPasswordField ? (showPassword ? 'password' : 'text') : type

  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '_') : undefined)

  const isTextarea = type === 'textarea'

  const hasAsteriskInLabel = Boolean(label && label.includes('*'))
  const isRequired = required || hasAsteriskInLabel
  const cleanLabel = label ? label.replace(/\s*\*/g, '').trim() : undefined

  if (!cleanLabel && !error && !icon && !isPasswordField) {
    if (isTextarea) {
      return (
        <Textarea
          id={inputId}
          rows={rows}
          className={cn(
            'w-full rounded-xl border border-gray-200 bg-transparent px-3.5 py-2 text-xs transition-colors outline-none placeholder:text-muted-foreground focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className,
          )}
          {...(props as unknown as React.ComponentProps<'textarea'>)}
        />
      )
    }

    return (
      <InputPrimitive
        id={inputId}
        type={computedType}
        data-slot="input"
        className={cn(
          'h-9 w-full min-w-0 rounded-xl border border-gray-200 bg-transparent px-3.5 py-1 text-xs transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-500/20',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          className,
        )}
        {...props}
      />
    )
  }

  return (
    <div className={cn('w-full', className)}>
      {cleanLabel && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-gray-700 mb-1.5">
          {cleanLabel} {isRequired && <span className="text-red-500 font-bold">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</div>
        )}
        {isTextarea ? (
          <Textarea
            id={inputId}
            rows={rows}
            className={cn(
              'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20 font-medium shadow-2xs',
              icon && 'pl-10',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              className,
            )}
            {...(props as unknown as React.ComponentProps<'textarea'>)}
          />
        ) : (
          <InputPrimitive
            id={inputId}
            type={computedType}
            data-slot="input"
            className={cn(
              'h-9 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3.5 py-1 text-xs text-gray-900 focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20 font-medium shadow-2xs',
              icon && 'pl-10',
              isPasswordField && 'pr-10',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              className,
            )}
            {...props}
          />
        )}
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
            tabIndex={0}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error ? (
        <p className="mt-1 text-xs font-semibold text-red-500">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">{helperText}</p>
      ) : null}
    </div>
  )
}

export { Input }
