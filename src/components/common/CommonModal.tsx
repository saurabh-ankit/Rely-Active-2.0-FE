import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export interface CommonModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl'
  className?: string
  footer?: React.ReactNode
  icon?: React.ReactNode
}

export const CommonModal: React.FC<CommonModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '2xl',
  className = '',
  footer,
  icon,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-xl max-h-[90vh] flex flex-col ${className}`}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              {icon && <div className="flex p-2 rounded-xl bg-indigo-50 text-indigo-600">{icon}</div>}
              <div>
                {title && <h2 className="text-xl font-bold text-gray-900">{title}</h2>}
                {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content Body with HIDDEN SCROLLBAR */}
        <div className="flex-1 overflow-y-auto p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="pt-4 border-t border-gray-100 shrink-0 flex items-center justify-end gap-3">{footer}</div>
        )}
      </div>
    </div>
  )
}

export default CommonModal
