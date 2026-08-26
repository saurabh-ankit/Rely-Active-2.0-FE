import React from 'react'

export interface CommonInputProps {
  label?: string
  placeholder?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  error?: string
  required?: boolean
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea'
  maxLength?: number
  disabled?: boolean
  rows?: number
  name?: string
  id?: string
  className?: string
  icon?: React.ReactNode
}

export const CommonInput: React.FC<CommonInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  required = false,
  type = 'text',
  maxLength,
  disabled = false,
  rows = 3,
  name,
  id,
  className = '',
  icon,
}) => {
  const inputId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '_') : undefined)

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</div>
        )}

        {type === 'textarea' ? (
          <textarea
            id={inputId}
            name={name}
            rows={rows}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm bg-white text-gray-900 focus:outline-none transition-all ${
              icon ? 'pl-10' : ''
            } ${
              error
                ? 'border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
            } ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
          />
        ) : (
          <input
            id={inputId}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm bg-white text-gray-900 focus:outline-none transition-all ${
              icon ? 'pl-10' : ''
            } ${
              error
                ? 'border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
            } ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
          />
        )}
      </div>

      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
    </div>
  )
}

export default CommonInput
