import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { DashboardStats } from '@/lib/types/dashboard'

export interface GetDashboardStatsParams {
  page?: number
  limit?: number
}

export const getDashboardStatsAPI = async (
  locationId?: string | null,
  params?: GetDashboardStatsParams,
): Promise<DashboardStats> => {
  const url = API_ENDPOINTS.dashboard.getStats(locationId)
  const response = await api.get(url, { params })
  return response.data?.data || response.data
}
