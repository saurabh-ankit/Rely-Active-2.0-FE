import type React from 'react'
import { useLocation } from '@/hooks/useLocation'

interface EventsPermissionProps {
  action: 'view' | 'create' | 'update' | 'delete'
  fallback?: React.ReactNode
  children: React.ReactNode
}

export const EventsPermission: React.FC<EventsPermissionProps> = ({ action, fallback = null, children }) => {
  const { hasResourcePermission } = useLocation()

  if (!hasResourcePermission('EVENTS', action)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export default EventsPermission
