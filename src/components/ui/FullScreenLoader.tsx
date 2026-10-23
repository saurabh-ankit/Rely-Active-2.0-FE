import * as React from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScrollLock } from '@/hooks/useScrollLock'

export interface FullScreenLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the loader is visible. Defaults to true. */
  isVisible?: boolean
  /** Loading status message displayed to assistive tech and users */
  message?: React.ReactNode
  /** Whether the loader covers the full viewport or is constrained to its parent container. Defaults to true. */
  fullScreen?: boolean
  /** Whether to render into document.body using a React portal. Defaults to true when fullScreen is true. */
  usePortal?: boolean
  /** Custom portal container element. Defaults to document.body when usePortal is true. */
  container?: HTMLElement | null
  /** Whether to lock document scrolling while the overlay is visible. Defaults to true when fullScreen is true. */
  lockScroll?: boolean
  /** Optional custom icon replacement for the default spinner */
  icon?: React.ReactNode
  /** Additional CSS class names for the spinner icon */
  spinnerClassName?: string
}

const FullScreenLoader = React.forwardRef<HTMLDivElement, FullScreenLoaderProps>(
  (
    {
      isVisible = true,
      message = 'Loading...',
      fullScreen = true,
      className,
      spinnerClassName,
      usePortal,
      container,
      lockScroll,
      icon,
      ...props
    },
    ref,
  ) => {
    // When fullScreen is true, default to locking scroll and using portal to body.
    // When fullScreen is false, default to in-place rendering and no scroll lock.
    const shouldPortal = usePortal ?? fullScreen
    const shouldLockScroll = lockScroll ?? fullScreen

    // Keep hook call unconditional across renders
    useScrollLock(isVisible && shouldLockScroll)

    if (!isVisible) return null

    const overlay = (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-atomic="true"
        data-slot="fullscreen-loader"
        className={cn(
          fullScreen ? 'fixed inset-0 z-50' : 'absolute inset-0 z-20 rounded-2xl',
          'flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm select-none supports-backdrop-filter:backdrop-blur-sm transition-opacity duration-150',
          className,
        )}
        {...props}
      >
        <div className="flex flex-col items-center justify-center gap-3 px-4 text-center">
          {icon ? (
            icon
          ) : (
            <Loader2
              className={cn('size-8 animate-spin text-primary motion-reduce:animate-none', spinnerClassName)}
              aria-hidden="true"
            />
          )}

          {message ? (
            <p className="text-sm font-medium text-muted-foreground motion-reduce:animate-none">{message}</p>
          ) : (
            <span className="sr-only">Loading</span>
          )}
        </div>
      </div>
    )

    if (shouldPortal && typeof document !== 'undefined') {
      return createPortal(overlay, container ?? document.body)
    }

    return overlay
  },
)

FullScreenLoader.displayName = 'FullScreenLoader'

export { FullScreenLoader }
export default FullScreenLoader
