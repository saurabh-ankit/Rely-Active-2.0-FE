import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AuthState = {
  token: string | null
  signIn: (token: string) => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>()(
  persist((set) => ({ token: null, signIn: (token) => set({ token }), signOut: () => set({ token: null }) }), {
    name: 'rely-active-auth',
    version: 1,
  }),
)
