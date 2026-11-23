import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/hooks/react-query/billing'
import {
  getDashboardAnalyticsAPI,
  getDashboardSettingsAPI,
  getDashboardStatsAPI,
  updateDashboardSettingsAPI,
  type GetDashboardStatsParams,
} from '@/lib/services/dashboardService'
import type {
  AnalyticsTabKey,
  DashboardAnalytics,
  DashboardSettings,
  DashboardStats,
  DashboardTabKey,
} from '@/lib/types/dashboard'

export const DASHBOARD_KEYS = {
  all: ['dashboard'] as const,
  stats: (locationId?: string | null, params?: GetDashboardStatsParams) =>
    ['dashboard', 'stats', locationId, params] as const,
  analytics: (tab: AnalyticsTabKey, locationId?: string | null) => ['dashboard', 'analytics', tab, locationId] as const,
  // One setting per company, so it doesn't depend on the selected property.
  settings: ['dashboard-settings'] as const,
}

export const useDashboardStatsQuery = (
  locationId?: string | null,
  params?: GetDashboardStatsParams,
  enabled = true,
) => {
  return useQuery<DashboardStats>({
    queryKey: DASHBOARD_KEYS.stats(locationId, params),
    queryFn: () => getDashboardStatsAPI(locationId, params),
    enabled,
    staleTime: 30_000,
    // Keep the dashboard live while it is open.
    refetchInterval: 60_000,
    placeholderData: (previous) => previous,
  })
}

/** One extra dashboard tab; only fetched while that tab is open. */
export const useDashboardAnalyticsQuery = <T extends AnalyticsTabKey>(
  tab: T,
  locationId?: string | null,
  enabled = true,
) => {
  return useQuery<DashboardAnalytics<T>>({
    queryKey: DASHBOARD_KEYS.analytics(tab, locationId),
    queryFn: () => getDashboardAnalyticsAPI(tab, locationId),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export const useDashboardSettingsQuery = (locationId?: string | null) => {
  return useQuery<DashboardSettings>({
    queryKey: DASHBOARD_KEYS.settings,
    queryFn: () => getDashboardSettingsAPI(locationId),
    staleTime: 5 * 60_000,
  })
}

export const useUpdateDashboardSettings = (locationId?: string | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (visibleTabs: DashboardTabKey[]) => updateDashboardSettingsAPI(visibleTabs, locationId),
    onSuccess: (data) => {
      queryClient.setQueryData(DASHBOARD_KEYS.settings, data)
      toast.success('Dashboard tabs updated for all properties')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not update the dashboard tabs')),
  })
}
