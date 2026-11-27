import { useEffect, useState } from 'react'
import { FullScreenLoader } from '@/components/ui/FullScreenLoader'
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton'

interface PageLoaderProps {
  isVisible?: boolean
  message?: string
  delay?: number
  /**
   * 'skeleton' (default): an in-place toolbar + table placeholder, so tabs and pages keep their layout while loading.
   * 'overlay': the full-screen blurred spinner, for loads that block the whole workspace.
   */
  variant?: 'skeleton' | 'overlay'
}

const PageLoader = ({ isVisible = true, message = 'Loading...', delay = 0, variant = 'skeleton' }: PageLoaderProps) => {
  const [showDelayedLoader, setShowDelayedLoader] = useState(false)

  useEffect(() => {
    if (!isVisible || delay <= 0) return

    const timer = setTimeout(() => {
      setShowDelayedLoader(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [isVisible, delay])

  const shouldShow = delay > 0 ? isVisible && showDelayedLoader : isVisible

  if (!shouldShow) return null

  if (variant === 'overlay') return <FullScreenLoader isVisible={true} message={message} />

  return (
    <div className="flex w-full flex-col gap-4 animate-in fade-in duration-300" aria-busy="true">
      <span className="sr-only">{message}</span>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-full max-w-xs rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <TableSkeleton rows={6} columns={5} />
    </div>
  )
}

export default PageLoader
