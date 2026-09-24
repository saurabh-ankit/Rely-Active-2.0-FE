import type React from 'react'
import { useLocation } from '@/hooks/useLocation'

interface MedicalPermissionProps {
  action: 'view' | 'create' | 'update' | 'delete'
  fallback?: React.ReactNode
  children: React.ReactNode
}

export const MedicalPermission: React.FC<MedicalPermissionProps> = ({ action, fallback = null, children }) => {
  const { hasResourcePermission } = useLocation()

  if (!hasResourcePermission('MEDICAL', action)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export default MedicalPermission
