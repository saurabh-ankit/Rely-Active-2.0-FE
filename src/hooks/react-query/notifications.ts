import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  archiveNotificationAPI,
  getUnreadNotificationCountAPI,
  listNotificationsAPI,
  markAllNotificationsReadAPI,
  markNotificationReadAPI,
} from '@/lib/services/notificationService'
import type { NotificationListQueryParams } from '@/lib/types/notification'

export const NOTIFICATION_QUERY_KEYS = {
  listRoot: ['notifications', 'list'] as const,
  list: (params?: NotificationListQueryParams) => ['notifications', 'list', params] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
}

export const useNotificationsQuery = (enabled: boolean, params?: NotificationListQueryParams) => {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.list(params),
    queryFn: () => listNotificationsAPI(params),
    enabled,
    refetchInterval: enabled ? 30_000 : false,
  })
}

export const useUnreadNotificationCountQuery = () => {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.unreadCount,
    queryFn: getUnreadNotificationCountAPI,
    refetchInterval: 30_000,
  })
}

const useNotificationMutationInvalidation = () => {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.listRoot })
    queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.unreadCount })
  }
}

export const useMarkNotificationReadMutation = () => {
  const invalidate = useNotificationMutationInvalidation()
  return useMutation({
    mutationFn: (id: string) => markNotificationReadAPI(id),
    onSuccess: invalidate,
  })
}

export const useMarkAllNotificationsReadMutation = () => {
  const invalidate = useNotificationMutationInvalidation()
  return useMutation({
    mutationFn: (module?: string) => markAllNotificationsReadAPI(module),
    onSuccess: invalidate,
  })
}

export const useArchiveNotificationMutation = () => {
  const invalidate = useNotificationMutationInvalidation()
  return useMutation({
    mutationFn: (id: string) => archiveNotificationAPI(id),
    onSuccess: invalidate,
  })
}
