import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { NOTIFICATION_QUERY_KEYS } from '@/hooks/react-query/notifications'
import { useUserStore } from '@/lib/stores/userStore'
import { ensureWebPushRegistration, onForegroundPushMessage } from '@/lib/services/webPushService'
import { notifySuccess } from '@/utils/toast'
import {
  markPushReceived,
  PLAY_NOTIFICATION_SOUND,
  playNotificationSound,
  unlockNotificationAudioOnFirstInteraction,
} from '@/utils/notificationSound'

function readMessage(payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) {
  const title = payload.notification?.title || payload.data?.title || 'Notification'
  const body = payload.notification?.body || payload.data?.message || 'You have a new update.'
  return { title, body }
}

const REGISTRATION_REFRESH_MS = 15 * 60 * 1000

export function usePushNotifications(): void {
  const queryClient = useQueryClient()
  const token = useUserStore((state) => state.token)
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated || !token) return
    void ensureWebPushRegistration(token).catch(() => null)
  }, [isAuthenticated, token])

  // Tabs stay open for days: keep the registration fresh, so a token the backend lost or Firebase
  // rejected recovers without a refresh
  useEffect(() => {
    if (!isAuthenticated || !token) return
    let lastRefreshAt = Date.now()
    const refresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastRefreshAt < REGISTRATION_REFRESH_MS) return
      lastRefreshAt = Date.now()
      void ensureWebPushRegistration(token).catch(() => null)
    }
    const timer = window.setInterval(refresh, REGISTRATION_REFRESH_MS)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [isAuthenticated, token])

  useEffect(() => unlockNotificationAudioOnFirstInteraction(), [])

  useEffect(() => {
    const unsubscribe = onForegroundPushMessage((payload) => {
      if (!useUserStore.getState().isAuthenticated) {
        return
      }

      const message = readMessage({
        notification: payload.notification,
        data: payload.data,
      })

      markPushReceived()
      playNotificationSound()
      notifySuccess(message.title, message.body)
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.unreadCount })
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.listRoot })
    })

    return unsubscribe
  }, [queryClient])

  // The service worker showed a notification while this tab was in the background
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const onWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== PLAY_NOTIFICATION_SOUND) return
      if (!useUserStore.getState().isAuthenticated) return
      markPushReceived()
      playNotificationSound()
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.unreadCount })
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.listRoot })
    }
    navigator.serviceWorker.addEventListener('message', onWorkerMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onWorkerMessage)
  }, [queryClient])
}
