import React from 'react'
import { Loader2 } from 'lucide-react'

export interface CommonSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  message?: string
  fullScreen?: boolean
  className?: string
}

export const CommonSpinner: React.FC<CommonSpinnerProps> = ({
  size = 'md',
  message,
  fullScreen = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  }

  const spinnerContent = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Outer glowing pulsing ring */}
        <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md animate-pulse" />
        {/* Animated Spinning Icon */}
        <Loader2 className={`${sizeClasses[size]} text-blue-600 animate-spin relative z-10`} />
      </div>
      {message && <p className="text-xs font-semibold text-gray-600 tracking-wide animate-pulse">{message}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-md transition-all duration-300">
        <div className="bg-white/90 border border-white/60 shadow-2xl rounded-3xl p-8 max-w-xs w-full text-center">
          {spinnerContent}
        </div>
      </div>
    )
  }

  return spinnerContent
}

export default CommonSpinner
