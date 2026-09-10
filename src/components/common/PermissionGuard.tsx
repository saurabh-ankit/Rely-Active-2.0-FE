import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useLocationContext } from '@/hooks/useLocation'

export interface PermissionGuardProps {
  resourceKey?: string
  action?: 'view' | 'create' | 'update' | 'delete'
  permission?: string
  permissions?: string[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

function parsePermissionString(
  perm: string,
): { resourceKey: string; action: 'view' | 'create' | 'update' | 'delete' } | null {
  const parts = perm.split(':')
  if (parts.length !== 2) return null
  const rawRes = parts[0].trim().toUpperCase()
  const rawAct = parts[1].trim().toLowerCase()
  if (!['view', 'create', 'update', 'delete'].includes(rawAct)) return null

  let resourceKey = rawRes
  if (resourceKey === 'ASSETS') resourceKey = 'ASSET'
  if (resourceKey === 'TICKET') resourceKey = 'TICKETS'
  if (resourceKey === 'RESIDENTS') resourceKey = 'RESIDENT'
  if (resourceKey === 'EMPLOYEES') resourceKey = 'EMPLOYEE'

  return { resourceKey, action: rawAct as 'view' | 'create' | 'update' | 'delete' }
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  resourceKey,
  action = 'view',
  permission,
  permissions,
  fallback = null,
  children,
}) => {
  const { hasPermission, isSuperAdmin } = useAuth()
  const { hasResourcePermission } = useLocationContext()

  if (isSuperAdmin) {
    return <>{children}</>
  }

  let isAllowed = true

  if (resourceKey) {
    isAllowed = hasResourcePermission(resourceKey, action)
  } else if (permission) {
    const parsed = parsePermissionString(permission)
    if (parsed) {
      isAllowed = hasResourcePermission(parsed.resourceKey, parsed.action)
    } else {
      isAllowed = hasPermission(permission)
    }
  } else if (permissions && permissions.length > 0) {
    isAllowed = permissions.some((p) => {
      const parsed = parsePermissionString(p)
      if (parsed) {
        return hasResourcePermission(parsed.resourceKey, parsed.action)
      }
      return hasPermission(p)
    })
  }

  if (!isAllowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export default PermissionGuard
