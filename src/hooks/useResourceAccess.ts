import { useEffect, useMemo } from 'react'
import { useResourcesQuery } from '@/hooks/react-query/rbac'
import { useLocationContext } from '@/hooks/useLocation'
import type { ResourceKey } from '@/lib/permissions/resourceKeys'

export interface ResourceAccess {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

/**
 * What the signed-in user can do on a module or sub-module at the selected property,
 * e.g. `useResourceAccess(RESOURCE.FNB_ORDERS).canUpdate`. A sub-module also needs
 * View on its module; super admins and department staff pass as in hasResourcePermission.
 */
export const useResourceAccess = (key: ResourceKey): ResourceAccess => {
  const { hasResourcePermission } = useLocationContext()
  const { data: resources } = useResourcesQuery()

  useEffect(() => {
    if (import.meta.env.DEV && Array.isArray(resources) && resources.length > 0) {
      if (!resources.some((r) => r.key === key)) {
        console.warn(
          `[permissions] "${key}" is not a known resource — check resourceKeys.ts against the backend catalogue.`,
        )
      }
    }
  }, [resources, key])

  return useMemo(
    () => ({
      canView: hasResourcePermission(key, 'view'),
      canCreate: hasResourcePermission(key, 'create'),
      canUpdate: hasResourcePermission(key, 'update'),
      canDelete: hasResourcePermission(key, 'delete'),
    }),
    [hasResourcePermission, key],
  )
}
