import { FullScreenLoader } from '@/components/ui/FullScreenLoader'

/**
 * SuspenseLoader component - specifically designed for React Suspense fallback
 * Used for lazy loading components and route transitions
 */
const SuspenseLoader = () => {
  return <FullScreenLoader isVisible={true} message="Loading workspace..." />
}

export default SuspenseLoader
