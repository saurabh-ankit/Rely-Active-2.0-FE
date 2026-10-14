import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { NotificationListPayload, NotificationListQueryParams } from '@/lib/types/notification'

type ApiResponse<T> = {
  success: boolean
  message?: string
  data: T
}

export const listNotificationsAPI = async (params?: NotificationListQueryParams) => {
  const response = await api.get<ApiResponse<NotificationListPayload>>(API_ENDPOINTS.notifications.list, { params })
  return response.data
}

export const getUnreadNotificationCountAPI = async () => {
  const response = await api.get<ApiResponse<{ unreadCount: number }>>(API_ENDPOINTS.notifications.unreadCount)
  return response.data
}

export const markNotificationReadAPI = async (id: string) => {
  const response = await api.patch<ApiResponse<null>>(API_ENDPOINTS.notifications.markRead(id))
  return response.data
}

export const markAllNotificationsReadAPI = async (module?: string) => {
  const response = await api.patch<ApiResponse<{ affected: number }>>(API_ENDPOINTS.notifications.markAllRead, {
    ...(module ? { module } : {}),
  })
  return response.data
}

export const archiveNotificationAPI = async (id: string) => {
  const response = await api.patch<ApiResponse<null>>(API_ENDPOINTS.notifications.archive(id))
  return response.data
}
