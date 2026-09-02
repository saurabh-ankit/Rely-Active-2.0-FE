import { useIsFetching } from '@tanstack/react-query'
import PageLoader from '../shared/PageLoader'
import { useLocationStore } from '@/lib/stores/locationStore'
import { useAuth } from '@/hooks/useAuth'

/**
 * GlobalLoadingIndicator component that manages global loading states
 * Uses query key logic to determine when to show page loader matching rely-assist style
 */
export const GlobalLoadingIndicator = () => {
  const { isSuperAdmin } = useAuth()
  const isLoadingLocations = useLocationStore((state) => state.isLoadingLocations)
  const isLoadingPermissions = useLocationStore((state) => state.isLoadingPermissions)

  // Query keys that trigger the full screen page loader
  const pageLevelQueryKeys = ['accessible-properties', 'dashboardOverview']

  const isPageLoading = useIsFetching({
    predicate: (query) => {
      const queryKey = query.queryKey[0] as string
      if (!queryKey || typeof queryKey !== 'string') return false
      if (query.state.data !== undefined) return false
      return pageLevelQueryKeys.some((key) => queryKey.includes(key))
    },
  })

  if (isSuperAdmin) {
    return null
  }

  if (isLoadingLocations || isLoadingPermissions || isPageLoading > 0) {
    return <PageLoader isVisible={true} message="Loading workspace..." delay={0} />
  }

  return null
}
