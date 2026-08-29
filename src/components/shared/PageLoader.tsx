import { useEffect, useState } from 'react'
import { FullScreenLoader } from '@/components/ui/FullScreenLoader'

interface PageLoaderProps {
  isVisible?: boolean
  message?: string
  delay?: number
}

/**
 * PageLoader component - loader component with delay matching rely-assist style
 */
const PageLoader = ({ isVisible = true, message = 'Loading...', delay = 0 }: PageLoaderProps) => {
  const [showLoader, setShowLoader] = useState(false)

  useEffect(() => {
    if (!isVisible) {
      const timer = setTimeout(() => setShowLoader(false), 0)
      return () => clearTimeout(timer)
    }

    const timer = setTimeout(() => setShowLoader(true), 0)

    if (delay > 0) {
      const delayTimer = setTimeout(() => {
        setShowLoader(false)
      }, delay)

      return () => {
        clearTimeout(timer)
        clearTimeout(delayTimer)
      }
    }

    return () => clearTimeout(timer)
  }, [isVisible, delay])

  if (!showLoader) return null

  return <FullScreenLoader isVisible={true} message={message} />
}

export default PageLoader
