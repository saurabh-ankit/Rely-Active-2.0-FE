import { useEffect, useState } from 'react'
import { FullScreenLoader } from '@/components/ui/FullScreenLoader'

interface PageLoaderProps {
  isVisible?: boolean
  message?: string
  delay?: number
}

/**
 * PageLoader component - loader component with optional delay matching rely-assist style
 */
const PageLoader = ({ isVisible = true, message = 'Loading...', delay = 0 }: PageLoaderProps) => {
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

  return <FullScreenLoader isVisible={true} message={message} />
}

export default PageLoader
