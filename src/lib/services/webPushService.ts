import { deleteToken, getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging'
import { getApp, getApps, initializeApp } from 'firebase/app'
import { registerNotificationDeviceAPI, unregisterNotificationDeviceAPI } from '@/lib/services/notificationService'

const REGISTERED_FCM_TOKEN_KEY = 'rely_active_web_push_token'
const WEB_PUSH_DEVICE_ID_KEY = 'rely_active_web_push_device_id'

interface FirebaseWebConfig {
  apiKey: string
  projectId: string
  messagingSenderId: string
  appId: string
  authDomain?: string
  storageBucket?: string
  measurementId?: string
}

function getEnvString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getFirebaseWebConfig(): FirebaseWebConfig | null {
  const apiKey = getEnvString(import.meta.env.VITE_FIREBASE_API_KEY)
  const projectId = getEnvString(import.meta.env.VITE_FIREBASE_PROJECT_ID)
  const messagingSenderId = getEnvString(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID)
  const appId = getEnvString(import.meta.env.VITE_FIREBASE_APP_ID)

  if (!apiKey || !projectId || !messagingSenderId || !appId) {
    return null
  }

  return {
    apiKey,
    projectId,
    messagingSenderId,
    appId,
    authDomain: getEnvString(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || undefined,
    storageBucket: getEnvString(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || undefined,
    measurementId: getEnvString(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) || undefined,
  }
}

function getVapidKey(): string {
  return getEnvString(import.meta.env.VITE_FIREBASE_VAPID_KEY)
}

function getOrCreateDeviceId(): string {
  const existing = window.localStorage.getItem(WEB_PUSH_DEVICE_ID_KEY)
  if (existing) {
    return existing
  }

  const generated =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `web-${Math.random().toString(36).slice(2)}-${Date.now()}`

  window.localStorage.setItem(WEB_PUSH_DEVICE_ID_KEY, generated)
  return generated
}

function buildServiceWorkerUrl(config: FirebaseWebConfig): string {
  const url = new URL('/firebase-messaging-sw.js', window.location.origin)
  url.searchParams.set('apiKey', config.apiKey)
  url.searchParams.set('projectId', config.projectId)
  url.searchParams.set('messagingSenderId', config.messagingSenderId)
  url.searchParams.set('appId', config.appId)
  if (config.authDomain) url.searchParams.set('authDomain', config.authDomain)
  if (config.storageBucket) url.searchParams.set('storageBucket', config.storageBucket)
  if (config.measurementId) url.searchParams.set('measurementId', config.measurementId)
  return url.toString()
}

async function getMessagingClient() {
  if (typeof window === 'undefined') return null
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return null

  const supported = await isSupported().catch(() => false)
  if (!supported) return null

  const config = getFirebaseWebConfig()
  if (!config) return null

  if (getApps().length === 0) {
    initializeApp(config)
  } else {
    getApp()
  }

  return {
    messaging: getMessaging(),
    config,
  }
}

export async function ensureWebPushRegistration(authToken?: string): Promise<string | null> {
  const vapidKey = getVapidKey()
  if (!vapidKey) return null

  const client = await getMessagingClient()
  if (!client) return null

  if (window.Notification.permission === 'denied') {
    return null
  }

  if (window.Notification.permission !== 'granted') {
    const permission = await window.Notification.requestPermission()
    if (permission !== 'granted') {
      return null
    }
  }

  const registration = await navigator.serviceWorker.register(buildServiceWorkerUrl(client.config))

  const fcmToken = await getToken(client.messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  })

  if (!fcmToken) {
    return null
  }

  await registerNotificationDeviceAPI(
    {
      fcmToken,
      appSurface: 'WEB_APP',
      platform: 'WEB',
      deviceId: getOrCreateDeviceId(),
      appVersion: getEnvString(import.meta.env.VITE_APP_VERSION) || getEnvString(import.meta.env.VITE_APP_ENV) || 'web',
    },
    authToken,
  )

  window.localStorage.setItem(REGISTERED_FCM_TOKEN_KEY, fcmToken)
  return fcmToken
}

export async function unregisterWebPushToken(authToken?: string): Promise<void> {
  const storedToken = window.localStorage.getItem(REGISTERED_FCM_TOKEN_KEY)

  if (storedToken) {
    await unregisterNotificationDeviceAPI(
      {
        fcmToken: storedToken,
        reason: 'WEB_LOGOUT',
      },
      authToken,
    )
  }

  const client = await getMessagingClient()
  if (client) {
    try {
      await deleteToken(client.messaging)
    } catch {
      // Ignore browser-side token cleanup errors.
    }
  }

  window.localStorage.removeItem(REGISTERED_FCM_TOKEN_KEY)
}

export async function unregisterWebPushTokenSafe(authToken?: string): Promise<void> {
  try {
    await unregisterWebPushToken(authToken)
  } catch {
    // Logout and auth cleanup should continue even if unregister fails.
  }
}

export function onForegroundPushMessage(handler: (payload: MessagePayload) => void): () => void {
  let disposed = false
  let unsubscribe: (() => void) | null = null

  void getMessagingClient().then((client) => {
    if (!client || disposed) return
    unsubscribe = onMessage(client.messaging, handler)
  })

  return () => {
    disposed = true
    if (unsubscribe) {
      unsubscribe()
    }
  }
}
