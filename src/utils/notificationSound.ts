/**
 * The web app's notification sound (public/sounds/rely_web_alert.mp3).
 *
 * Browsers ignore custom sounds on system notifications, so the page plays it itself: for a
 * push received in the foreground, and when the service worker shows a notification while a
 * tab is open in the background (it posts PLAY_NOTIFICATION_SOUND to the open tabs).
 */
export const PLAY_NOTIFICATION_SOUND = 'RELY_PLAY_NOTIFICATION_SOUND'

const SOUND_URL = '/sounds/rely_web_alert.mp3'
const SOUND_ENABLED_KEY = 'rely_active_notification_sound'
const SOUND_ALLOWED_KEY = 'rely_active_notification_sound_allowed'
/** Several tabs (or a burst of pushes) shouldn't stack the same chime. */
const MIN_GAP_MS = 1500
/** A push counts as covering new notifications for this long (the bell checks every 30 s). */
const PUSH_COVERS_MS = 35_000

let audio: HTMLAudioElement | null = null
let lastPlayedAt = 0
let lastPushAt = 0

/** A push reached this tab; the bell's fallback alert doesn't need to repeat it. */
export function markPushReceived(): void {
  lastPushAt = Date.now()
}

export function wasPushReceivedRecently(): boolean {
  return Date.now() - lastPushAt < PUSH_COVERS_MS
}

/** On unless the user turned it off in the notification bell (per browser). */
export function isNotificationSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_ENABLED_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'on' : 'off')
  } catch {
    // Stays on for this page only
  }
}

/** Whether the user said yes to sound in this browser (the toast after login, or Enable). */
export function isNotificationSoundAllowed(): boolean {
  try {
    return window.localStorage.getItem(SOUND_ALLOWED_KEY) === 'yes'
  } catch {
    return false
  }
}

export function markNotificationSoundAllowed(): void {
  try {
    window.localStorage.setItem(SOUND_ALLOWED_KEY, 'yes')
  } catch {
    // Asks again after the next login
  }
}

/**
 * Browsers only allow sound after the user has interacted with the page, so the first click or
 * key press prepares the audio silently; later notifications can then play straight away.
 * Returns a cleanup for the listeners.
 */
export function unlockNotificationAudioOnFirstInteraction(): () => void {
  if (typeof window === 'undefined') return () => undefined

  const unlock = () => {
    cleanup()
    try {
      const sound = (audio ??= new Audio(SOUND_URL))
      sound.muted = true
      void sound
        .play()
        .then(() => {
          sound.pause()
          sound.currentTime = 0
        })
        .catch(() => undefined)
        .finally(() => {
          sound.muted = false
        })
    } catch {
      // No audio support
    }
  }
  const cleanup = () => {
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }

  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
  return cleanup
}

/** `force` plays even with the sound turned off or just played (the test after enabling). */
export function playNotificationSound({ force = false }: { force?: boolean } = {}): void {
  if (typeof window === 'undefined') return
  if (!force && !isNotificationSoundEnabled()) return
  const now = Date.now()
  if (!force && now - lastPlayedAt < MIN_GAP_MS) return
  lastPlayedAt = now

  try {
    audio ??= new Audio(SOUND_URL)
    audio.muted = false
    audio.currentTime = 0
    // Blocked until the user has interacted with the page (browser autoplay policy)
    void audio.play().catch(() => undefined)
  } catch {
    // No audio support
  }
}
