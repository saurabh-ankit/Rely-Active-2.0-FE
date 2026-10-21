import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PushStoreState {
  deviceId: string | null
  registeredFcmToken: string | null
  setDeviceId: (deviceId: string) => void
  setRegisteredFcmToken: (token: string | null) => void
  clearPushState: () => void
}

export const usePushStore = create<PushStoreState>()(
  persist(
    (set) => ({
      deviceId: null,
      registeredFcmToken: null,
      setDeviceId: (deviceId) => set({ deviceId }),
      setRegisteredFcmToken: (registeredFcmToken) => set({ registeredFcmToken }),
      clearPushState: () => set({ registeredFcmToken: null }),
    }),
    {
      name: 'rely-active-push-storage',
    },
  ),
)

export default usePushStore
