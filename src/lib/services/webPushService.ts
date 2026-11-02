import { deleteToken, getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging'
import { getApp, getApps, initializeApp } from 'firebase/app'
import { registerNotificationDeviceAPI, unregisterNotificationDeviceAPI } from '@/lib/services/notificationService'
import { usePushStore } from '@/lib/stores/pushStore'

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
  const existing = usePushStore.getState().deviceId
  if (existing) {
    return existing
  }

  const generated =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `web-${Math.random().toString(36).slice(2)}-${Date.now()}`

  usePushStore.getState().setDeviceId(generated)
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

/** The browser's notification permission, or 'unsupported' where web push can't work here. */
export function getWebPushPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined') return 'unsupported'
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported'
  if (!getVapidKey() || !getFirebaseWebConfig()) return 'unsupported'
  return window.Notification.permission
}

/**
 * Shows the browser's permission prompt, then registers this browser for push. Call it straight
 * from a click: browsers hide or block prompts that don't follow one.
 */
export async function requestWebPushPermission(authToken?: string): Promise<NotificationPermission> {
  const permission = await window.Notification.requestPermission()
  if (permission === 'granted') {
    await ensureWebPushRegistration(authToken).catch(() => null)
  }
  return permission
}

const registerToken = async (fcmToken: string, authToken?: string) =>
  registerNotificationDeviceAPI(
    {
      fcmToken,
      appSurface: 'WEB_APP',
      platform: 'WEB',
      deviceId: getOrCreateDeviceId(),
      appVersion: getEnvString(import.meta.env.VITE_APP_VERSION) || getEnvString(import.meta.env.VITE_APP_ENV) || 'web',
    },
    authToken,
  )

async function registerThisBrowser(authToken?: string): Promise<string | null> {
  const vapidKey = getVapidKey()
  if (!vapidKey) return null

  const client = await getMessagingClient()
  if (!client) return null

  if (window.Notification.permission !== 'granted') {
    return null
  }

  const registration = await navigator.serviceWorker.register(buildServiceWorkerUrl(client.config))
  const tokenOptions = { vapidKey, serviceWorkerRegistration: registration }

  let fcmToken = await getToken(client.messaging, tokenOptions)
  if (!fcmToken) {
    return null
  }

  const registered = await registerToken(fcmToken, authToken)

  // Firebase rejected this token on a send, but the browser would keep reusing it: replace it.
  if (registered.data?.tokenWasRejected) {
    await deleteToken(client.messaging)
    fcmToken = await getToken(client.messaging, tokenOptions)
    if (!fcmToken) {
      return null
    }
    await registerToken(fcmToken, authToken)
  }

  usePushStore.getState().setRegisteredFcmToken(fcmToken)
  return fcmToken
}

let registrationInFlight: Promise<string | null> | null = null

/**
 * Registers this browser for push. Never prompts: NotificationPermissionPrompt asks first. Calls
 * made while one is running share it, because parallel getToken calls can leave the backend
 * holding a token the browser has already replaced.
 */
export function ensureWebPushRegistration(authToken?: string): Promise<string | null> {
  registrationInFlight ??= registerThisBrowser(authToken).finally(() => {
    registrationInFlight = null
  })
  return registrationInFlight
}

/**
 * Stops push to this browser for the user logging out. The Firebase token is kept: the next login
 * reuses it, and deleting it here could leave the backend holding a dead one.
 */
export async function unregisterWebPushToken(authToken?: string): Promise<void> {
  const storedToken = usePushStore.getState().registeredFcmToken

  if (storedToken) {
    await unregisterNotificationDeviceAPI(
      {
        fcmToken: storedToken,
        reason: 'WEB_LOGOUT',
      },
      authToken,
    )
  }

  usePushStore.getState().setRegisteredFcmToken(null)
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
