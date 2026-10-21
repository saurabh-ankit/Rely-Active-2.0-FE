import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserAuthData } from '@/lib/types'

export const TOKEN_KEY = 'rely_auth_token'

export interface UserState {
  token: string | null
  user: UserAuthData | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  setAuth: (token: string, user: UserAuthData) => void
  setUser: (user: UserAuthData | null) => void
  setToken: (token: string | null) => void
  setIsLoading: (isLoading: boolean) => void
  logout: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (token, user) => {
        set({ token, user, isAuthenticated: true, isLoading: false })
      },

      setUser: (user) => {
        set({ user, isAuthenticated: Boolean(user) })
      },

      setToken: (token) => {
        set({ token, isAuthenticated: Boolean(token) })
      },

      setIsLoading: (isLoading) => set({ isLoading }),

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false, isLoading: false })
      },
    }),
    {
      name: 'rely-active-user-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
