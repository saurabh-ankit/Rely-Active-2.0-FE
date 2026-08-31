import { useCallback, useEffect, useMemo } from 'react'
import { getMeAPI, loginAPI } from '@/lib/services/authService'
import { TOKEN_KEY, useUserStore } from '@/lib/stores/userStore'
import type { LoginPayload, UserAuthData } from '@/lib/types'

export const useAuth = () => {
  const { token, user, isLoading, setAuth, setUser, setToken, setIsLoading, logout: storeLogout } = useUserStore()

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY)
    if (savedToken && !user) {
      setIsLoading(true)
      getMeAPI(savedToken)
        .then((userData) => {
          setUser(userData)
        })
        .catch(() => {
          storeLogout()
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      if (isLoading) {
        setIsLoading(false)
      }
    }
  }, [user, setUser, isLoading, setIsLoading, storeLogout])

  const login = async (payload: LoginPayload): Promise<UserAuthData> => {
    setIsLoading(true)
    try {
      const res = await loginAPI(payload)
      setAuth(res.token, res.user)
      return res.user
    } finally {
      setIsLoading(false)
    }
  }

  const logout = useCallback(() => {
    storeLogout()
  }, [storeLogout])

  const isSuperAdmin =
    Boolean(user?.isSuperAdmin) ||
    Boolean(user?.roles?.includes('SUPER_ADMIN')) ||
    user?.email === 'superadmin@rely.com' ||
    user?.username === 'superadmin'
  const roles = user?.roles ?? (isSuperAdmin ? ['SUPER_ADMIN'] : [])
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions])

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

  return {
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
    setUser,
    setToken,
  }
}
