import { useEffect, useState } from 'react'
import { BellOff, BellRing, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useUserStore } from '@/lib/stores/userStore'
import { getWebPushPermission, requestWebPushPermission } from '@/lib/services/webPushService'
import {
  isNotificationSoundAllowed,
  isNotificationSoundEnabled,
  markNotificationSoundAllowed,
  playNotificationSound,
} from '@/utils/notificationSound'

const SNOOZE_KEY = 'rely_active_notification_prompt_snoozed_until'
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000
const SOUND_TOAST_ID = 'notification-sound-permission'
/** "Not now" on the sound toast lasts for this login (remembered per tab). */
const SOUND_LATER_KEY = 'rely_active_notification_sound_later'

function isSnoozed(): boolean {
  try {
    return Number(window.localStorage.getItem(SNOOZE_KEY) || 0) > Date.now()
  } catch {
    return false
  }
}

function snooze(): void {
  try {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS))
  } catch {
    // Asks again on the next visit
  }
}

function soundToastDeclined(token: string): boolean {
  try {
    return window.sessionStorage.getItem(SOUND_LATER_KEY) === token.slice(-12)
  } catch {
    return false
  }
}

function declineSoundToast(token: string): void {
  try {
    window.sessionStorage.setItem(SOUND_LATER_KEY, token.slice(-12))
  } catch {
    // Asks again on the next page load
  }
}

/**
 * Explains notifications before the browser's own prompt: a browser asks only once, and after
 * "Block" a site can't ask again, so the user decides here first. Shown after login as a corner
 * card (never over the property picker); if notifications are blocked, says how to allow them.
 */
export function NotificationPermissionPrompt() {
  const token = useUserStore((state) => state.token)
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  const [permission, setPermission] = useState(getWebPushPermission)
  const [hidden, setHidden] = useState(isSnoozed)
  const [enabling, setEnabling] = useState(false)

  // After login, with notifications already allowed: ask for the sound (the card covers both otherwise)
  useEffect(() => {
    if (!isAuthenticated || !token || permission !== 'granted') return
    if (isNotificationSoundAllowed() || !isNotificationSoundEnabled() || soundToastDeclined(token)) return

    toast('Allow notification sound?', {
      id: SOUND_TOAST_ID,
      description: 'Play a sound when a new ticket or resident alert arrives.',
      duration: Infinity,
      position: 'top-right',
      className: 'bg-white border-blue-200 text-blue-950 font-semibold shadow-xl rounded-2xl',
      action: {
        label: 'Allow',
        onClick: () => {
          markNotificationSoundAllowed()
          playNotificationSound({ force: true })
        },
      },
      cancel: { label: 'Not now', onClick: () => declineSoundToast(token) },
    })
    return () => {
      toast.dismiss(SOUND_TOAST_ID)
    }
  }, [isAuthenticated, token, permission])

  if (!isAuthenticated || !token || hidden) return null
  if (permission !== 'default' && permission !== 'denied') return null

  const later = () => {
    snooze()
    setHidden(true)
  }

  const enable = async () => {
    setEnabling(true)
    // This click also allows sound, so the test bell can play
    const result = await requestWebPushPermission(token).catch(() => 'default' as const)
    setEnabling(false)
    if (result === 'granted') {
      markNotificationSoundAllowed()
      playNotificationSound({ force: true })
    }
    setPermission(result)
  }

  const blocked = permission === 'denied'

  return (
    <div
      role="dialog"
      aria-label={blocked ? 'Notifications are blocked' : 'Turn on notifications'}
      className="fixed right-4 bottom-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl"
    >
      <button
        type="button"
        onClick={later}
        aria-label="Close"
        className="absolute top-3 right-3 cursor-pointer text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex gap-3 pr-5">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            blocked ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-[#005390]'
          }`}
        >
          {blocked ? <BellOff className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-gray-900">
            {blocked ? 'Notifications are blocked' : 'Turn on notifications and sound'}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            {blocked
              ? 'To get ticket and resident alerts, click the icon next to the website address, allow Notifications, then refresh this page.'
              : 'Get ticket and resident alerts with a sound, even when this tab is in the background.'}
          </p>
        </div>
      </div>

      {!blocked && (
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={later} disabled={enabling}>
            Not now
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={() => void enable()} disabled={enabling}>
            {enabling ? 'Waiting for browser...' : 'Enable'}
          </Button>
        </div>
      )}
    </div>
  )
}
