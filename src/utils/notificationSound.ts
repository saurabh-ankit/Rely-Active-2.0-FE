/**
 * The notification sound shared with the mobile apps (public/sounds/rely_alert.mp3).
 *
 * Browsers ignore custom sounds on system notifications, so the page plays it itself: for a
 * push received in the foreground, and when the service worker shows a notification while a
 * tab is open in the background (it posts PLAY_NOTIFICATION_SOUND to the open tabs).
 */
export const PLAY_NOTIFICATION_SOUND = 'RELY_PLAY_NOTIFICATION_SOUND'

const SOUND_URL = '/sounds/rely_alert.mp3'
/** Several tabs (or a burst of pushes) shouldn't stack the same chime. */
const MIN_GAP_MS = 1500

let audio: HTMLAudioElement | null = null
let lastPlayedAt = 0

export function playNotificationSound(): void {
  if (typeof window === 'undefined') return
  const now = Date.now()
  if (now - lastPlayedAt < MIN_GAP_MS) return
  lastPlayedAt = now

  try {
    audio ??= new Audio(SOUND_URL)
    audio.currentTime = 0
    // Blocked until the user has interacted with the page (browser autoplay policy)
    void audio.play().catch(() => undefined)
  } catch {
    // No audio support
  }
}
