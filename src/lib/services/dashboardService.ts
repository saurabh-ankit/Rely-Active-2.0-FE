import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  AnalyticsTabKey,
  DashboardAnalytics,
  DashboardSettings,
  DashboardStats,
  DashboardTabKey,
} from '@/lib/types/dashboard'

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

export const getDashboardAnalyticsAPI = async <T extends AnalyticsTabKey>(
  tab: T,
  locationId?: string | null,
): Promise<DashboardAnalytics<T>> => {
  const response = await api.get(API_ENDPOINTS.dashboard.getAnalytics(tab, locationId))
  return response.data?.data || response.data
}

export const getDashboardSettingsAPI = async (locationId?: string | null): Promise<DashboardSettings> => {
  const response = await api.get(API_ENDPOINTS.dashboard.settings(locationId))
  return response.data?.data || response.data
}

export const updateDashboardSettingsAPI = async (
  visibleTabs: DashboardTabKey[],
  locationId?: string | null,
): Promise<DashboardSettings> => {
  const response = await api.put(API_ENDPOINTS.dashboard.settings(locationId), { visibleTabs })
  return response.data?.data || response.data
}
