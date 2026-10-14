export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED'
export type NotificationActionType = 'OPEN_ENTITY' | 'OPEN_URL' | 'NONE'
export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL'
export type NotificationAppSurface = 'WEB_APP' | 'MOBILE_L1' | 'MOBILE_L3'
export type NotificationDevicePlatform = 'WEB' | 'ANDROID' | 'IOS'

export interface NotificationEventItem {
  id: string
  module: string
  eventCode: string
  entityType: string
  entityId: string
  entityLabel: string | null
  title: string
  message: string
  severity: NotificationSeverity
  actionType: NotificationActionType
  actionValue: string | null
  payload: Record<string, unknown> | null
  occurredAt: string
  actorName: string | null
}

export interface NotificationItem {
  id: string
  status: NotificationStatus
  readAt: string | null
  archivedAt: string | null
  deliveredAt: string
  createdAt?: string
  event: NotificationEventItem | null
}

export interface NotificationListPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface NotificationListPayload {
  notifications: NotificationItem[]
  pagination: NotificationListPagination
}

export interface NotificationListQueryParams {
  page?: number
  limit?: number
  status?: NotificationStatus | 'ALL'
  module?: string
}

export interface RegisterNotificationDevicePayload {
  fcmToken: string
  appSurface: NotificationAppSurface
  platform?: NotificationDevicePlatform
  deviceId?: string
  appVersion?: string
}

export interface UnregisterNotificationDevicePayload {
  fcmToken: string
  reason?: string
}
