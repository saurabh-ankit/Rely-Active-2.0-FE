import type React from 'react'
import { useLocation } from '@/hooks/useLocation'

interface RosterPermissionProps {
  action: 'view' | 'create' | 'update' | 'delete'
  fallback?: React.ReactNode
  children: React.ReactNode
}

export const RosterPermission: React.FC<RosterPermissionProps> = ({ action, fallback = null, children }) => {
  const { hasResourcePermission } = useLocation()

  if (!hasResourcePermission('ROSTER', action)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export default RosterPermission
