import React from 'react'
import { THEME_COLORS } from '@/constants/theme'

export interface CommonButtonProps {
  label?: string
  children?: React.ReactNode
  variant?: 'light' | 'dark' | 'primary' | 'outline' | 'outlineDark' | 'success' | 'cancel' | 'danger'
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
  variant = 'light',
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
    light: THEME_COLORS.button.light.className,
    dark: THEME_COLORS.button.dark.className,
    primary: THEME_COLORS.button.light.className,
    outline: THEME_COLORS.button.light.outlineClassName,
    outlineDark: THEME_COLORS.button.dark.outlineClassName,
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:bg-emerald-800',
    cancel:
      'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm active:bg-gray-100',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 active:bg-rose-800',
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
