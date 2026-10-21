import { useUserStore } from '@/lib/stores/userStore'
import { useLocationStore } from '@/lib/stores/locationStore'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useTicketStore } from '@/lib/stores/ticketStore'
import { usePushStore } from '@/lib/stores/pushStore'

export interface ClearSessionOptions {
  redirectToLogin?: boolean
}

/**
 * Industry-standard centralized session & storage cleanup utility.
 * Clears all Zustand stores (user, location, auth, tickets, push) and purges residual storage.
 */
export const clearAppSession = (options: ClearSessionOptions = {}) => {
  const { redirectToLogin = true } = options

  // 1. Reset all Zustand stores to their initial state
  try {
    useUserStore.getState().logout()
  } catch (err) {
    console.warn('Error clearing userStore:', err)
  }

  try {
    useLocationStore.getState().resetLocationState()
  } catch (err) {
    console.warn('Error clearing locationStore:', err)
  }

  try {
    useAuthStore.getState().signOut()
  } catch (err) {
    console.warn('Error clearing authStore:', err)
  }

  try {
    useTicketStore.getState().clearViewedTickets()
  } catch (err) {
    console.warn('Error clearing ticketStore:', err)
  }

  try {
    usePushStore.getState().clearPushState()
  } catch (err) {
    console.warn('Error clearing pushStore:', err)
  }

  // 2. Clear all application localStorage keys
  try {
    const keysToRemove = [
      'rely_auth_token',
      'rely_active_property_id',
      'rely_active_property_name',
      'rely-active-user-storage',
      'rely-active-location-storage',
      'rely-active-auth',
      'rely-active-tickets-storage',
      'rely-active-push-storage',
      'rely_active_web_push_token',
      'rely_active_web_push_device_id',
    ]

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key)
    })
  } catch (err) {
    console.warn('Error clearing localStorage keys:', err)
  }

  // 3. Redirect to login if requested and not already on the login page
  if (redirectToLogin && typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

export default clearAppSession
