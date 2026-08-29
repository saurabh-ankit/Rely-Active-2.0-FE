import React from 'react'
import { useAuth } from '@/hooks/useAuth'

export interface PermissionGuardProps {
  permission?: string
  permissions?: string[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  permissions,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, isSuperAdmin } = useAuth()

  if (isSuperAdmin) {
    return <>{children}</>
  }

  let isAllowed = true

  if (permission) {
    isAllowed = hasPermission(permission)
  } else if (permissions && permissions.length > 0) {
    isAllowed = hasAnyPermission(permissions)
  }

  if (!isAllowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export default PermissionGuard
