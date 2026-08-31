import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLocationContext } from '@/hooks/useLocation'

export interface ProtectedRouteProps {
  permission?: string
  permissions?: string[]
  resourceKey?: string
  action?: 'view' | 'create' | 'update' | 'delete'
  requireSuperAdmin?: boolean
  children: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  permission,
  permissions,
  resourceKey,
  action = 'view',
  requireSuperAdmin = false,
  children,
}) => {
  const { isAuthenticated, isLoading, hasPermission, hasAnyPermission, isSuperAdmin } = useAuth()
  const { hasResourcePermission, isLoadingPermissions } = useLocationContext()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-blue-600 font-semibold text-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>Verifying authentication...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (isSuperAdmin) {
    return <>{children}</>
  }

  if (requireSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-2xl font-bold mb-4">
          🚫
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Access Denied: Super Admin Only</h2>
        <p className="text-sm text-gray-500 max-w-md">
          Global Settings and system configuration can only be accessed by Super Admin users.
        </p>
      </div>
    )
  }

  if (isLoadingPermissions) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-blue-600 font-semibold text-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>Verifying location permissions...</span>
        </div>
      </div>
    )
  }

  let isAllowed = true
  if (resourceKey) {
    isAllowed = hasResourcePermission(resourceKey, action)
  } else if (permission) {
    isAllowed = hasPermission(permission)
  } else if (permissions && permissions.length > 0) {
    isAllowed = hasAnyPermission(permissions)
  }

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-2xl font-bold mb-4">
          🚫
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Access Denied</h2>
        <p className="text-sm text-gray-500 max-w-md">
          You do not have the required permissions (
          {resourceKey ? `${resourceKey} (${action})` : permission || permissions?.join(', ')}) to view this page.
          Please contact your administrator.
        </p>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
