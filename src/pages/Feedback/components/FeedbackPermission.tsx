import type React from 'react'
import { useLocation } from '@/hooks/useLocation'

interface FeedbackPermissionProps {
  action: 'view' | 'create' | 'update' | 'delete'
  fallback?: React.ReactNode
  children: React.ReactNode
}

export const FeedbackPermission: React.FC<FeedbackPermissionProps> = ({ action, fallback = null, children }) => {
  const { hasResourcePermission } = useLocation()

  if (!hasResourcePermission('SETTINGS', action)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export default FeedbackPermission
