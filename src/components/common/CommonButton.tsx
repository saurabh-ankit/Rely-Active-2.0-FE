import React from 'react'

export interface CommonButtonProps {
  label?: string
  children?: React.ReactNode
  variant?: 'success' | 'cancel' | 'primary' | 'danger' | 'outline'
  type?: 'button' | 'submit' | 'reset'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  isLoading?: boolean
  icon?: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const CommonButton: React.FC<CommonButtonProps> = ({
  label,
  children,
  variant = 'primary',
  type = 'button',
  onClick,
  disabled = false,
  isLoading = false,
  icon,
  className = '',
  size = 'md',
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  }

  const variantStyles = {
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:bg-emerald-800',
    cancel:
      'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm active:bg-gray-100',
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:bg-indigo-800',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 active:bg-rose-800',
    outline: 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      <span>{label || children}</span>
    </button>
  )
}

export default CommonButton
