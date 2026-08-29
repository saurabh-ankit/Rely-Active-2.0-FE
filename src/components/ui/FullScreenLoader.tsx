import * as React from 'react'

export interface FullScreenLoaderProps {
  /** Whether the loader is visible */
  isVisible?: boolean
  message?: string
}

const FullScreenLoader = React.forwardRef<HTMLDivElement, FullScreenLoaderProps>(
  ({ isVisible = true, message = 'Loading...' }, ref) => {
    if (!isVisible) return null

    return (
      <div ref={ref} className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/90 backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Rely Active Logo/Brand */}
          <div className="relative">
            {/* Main spinning ring */}
            <div className="w-20 h-20 rounded-full border-4 border-gray-200 border-t-[#005390] animate-spin" />

            {/* Inner pulsing circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-[#005390] animate-pulse" />
            </div>
          </div>

          {/* Rely Active Text */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-[#005390] animate-pulse tracking-widest">
              R E L Y &nbsp; A C T I V E
            </h2>
            <p className="text-sm text-gray-600 font-medium">{message}</p>
          </div>

          {/* Animated dots */}
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-[#005390] animate-bounce"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1s',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  },
)

FullScreenLoader.displayName = 'FullScreenLoader'

export { FullScreenLoader }
