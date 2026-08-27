import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { authApi, type LoginPayload, type UserAuthData } from '@/api/auth'

interface AuthContextType {
  user: UserAuthData | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isSuperAdmin: boolean
  roles: string[]
  permissions: string[]
  login: (payload: LoginPayload) => Promise<UserAuthData>
  logout: () => void
  hasPermission: (permissionCode: string) => boolean
  hasAnyPermission: (permissionCodes: string[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'rely_auth_token'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<UserAuthData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  useEffect(() => {
    let isMounted = true
    if (token) {
      authApi
        .getMe(token)
        .then((userData) => {
          if (isMounted) setUser(userData)
        })
        .catch(() => {
          if (isMounted) {
            localStorage.removeItem(TOKEN_KEY)
            setToken(null)
            setUser(null)
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false)
        })
    }
    return () => {
      isMounted = false
    }
  }, [token])

  const login = async (payload: LoginPayload): Promise<UserAuthData> => {
    setIsLoading(true)
    try {
      const res = await authApi.login(payload)
      localStorage.setItem(TOKEN_KEY, res.token)
      setToken(res.token)
      setUser(res.user)
      return res.user
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  const isSuperAdmin = user?.isSuperAdmin ?? false
  const roles = user?.roles ?? []
  const permissions = React.useMemo(() => user?.permissions ?? [], [user?.permissions])

  const hasPermission = useCallback(
    (permissionCode: string): boolean => {
      if (!user) return false
      if (isSuperAdmin) return true
      return permissions.includes(permissionCode)
    },
    [user, isSuperAdmin, permissions],
  )

  const hasAnyPermission = useCallback(
    (permissionCodes: string[]): boolean => {
      if (!user) return false
      if (isSuperAdmin) return true
      return permissionCodes.some((code) => permissions.includes(code))
    },
    [user, isSuperAdmin, permissions],
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        isSuperAdmin,
        roles,
        permissions,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
