import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'

import { cn } from '@/lib/utils'

import { Textarea } from '@/components/ui/textarea'

export interface InputProps extends React.ComponentProps<'input'> {
  label?: string
  error?: string
  required?: boolean
  icon?: React.ReactNode
  rows?: number
}

function Input({ className, type = 'text', label, error, required, icon, id, rows = 3, ...props }: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '_') : undefined)

  const isTextarea = type === 'textarea'

  const hasAsteriskInLabel = Boolean(label && label.includes('*'))
  const isRequired = required || hasAsteriskInLabel
  const cleanLabel = label ? label.replace(/\s*\*/g, '').trim() : undefined

  if (!cleanLabel && !error && !icon) {
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
        type={type}
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
            type={type}
            data-slot="input"
            className={cn(
              'h-9 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3.5 py-1 text-xs text-gray-900 focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20 font-medium shadow-2xs',
              icon && 'pl-10',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              className,
            )}
            {...props}
          />
        )}
      </div>
      {error && <p className="mt-1 text-xs font-semibold text-red-500">{error}</p>}
    </div>
  )
}

export { Input }
