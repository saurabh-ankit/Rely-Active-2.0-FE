import { useQuery } from '@tanstack/react-query'
import { getDashboardStatsAPI, type GetDashboardStatsParams } from '@/lib/services/dashboardService'
import type { DashboardStats } from '@/lib/types/dashboard'

export const DASHBOARD_KEYS = {
  all: ['dashboard'] as const,
  stats: (locationId?: string | null, params?: GetDashboardStatsParams) =>
    ['dashboard', 'stats', locationId, params] as const,
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
  })
}
