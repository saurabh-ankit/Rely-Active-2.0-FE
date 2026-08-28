import React from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { CommonButton } from './CommonButton'

export interface CommonFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'success' | 'error' | 'info'
  title: string
  message: string
  buttonText?: string
  autoCloseMs?: number
}

export const CommonFeedbackModal: React.FC<CommonFeedbackModalProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  buttonText = 'Continue',
  autoCloseMs,
}) => {
  React.useEffect(() => {
    if (isOpen && autoCloseMs) {
      const timer = setTimeout(() => {
        onClose()
      }, autoCloseMs)
      return () => clearTimeout(timer)
    }
  }, [isOpen, autoCloseMs, onClose])

  if (!isOpen) return null

  const isSuccess = type === 'success'
  const isError = type === 'error'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md transition-all duration-300 animate-in fade-in">
      <div className="relative w-full max-w-sm overflow-hidden bg-white/95 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 shadow-2xl text-center space-y-4 transform transition-all duration-300 animate-in zoom-in-95">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Icon Header */}
        <div className="flex justify-center pt-2">
          {isSuccess && (
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-lg shadow-emerald-100 animate-bounce">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>
          )}
          {isError && (
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 text-rose-600 border border-rose-200 shadow-lg shadow-rose-100 animate-pulse">
              <AlertCircle className="w-10 h-10 stroke-[2.5]" />
            </div>
          )}
          {!isSuccess && !isError && (
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 border border-blue-200 shadow-lg shadow-blue-100">
              <AlertCircle className="w-10 h-10 stroke-[2.5]" />
            </div>
          )}
        </div>

        {/* Title & Message */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-extrabold text-gray-900">{title}</h3>
          <p className="text-xs font-medium text-gray-600 leading-relaxed">{message}</p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <CommonButton
            variant={isError ? 'cancel' : 'primary'}
            onClick={onClose}
            className="w-full justify-center rounded-2xl py-2.5 font-bold shadow-md"
          >
            {buttonText}
          </CommonButton>
        </div>
      </div>
    </div>
  )
}
