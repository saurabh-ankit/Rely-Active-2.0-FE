import { useCallback, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getUserLocationPermissionsAPI } from '@/lib/services/rbacService'
import { getUserAccessiblePropertiesAPI } from '@/lib/services/userService'
import { type PropertyLocationItem, useLocationStore } from '@/lib/stores/locationStore'
import { notifySuccess } from '@/utils/toast'
import { getDepartmentManagerType } from '@/utils/departmentManager'
import { SUB_MODULES } from '@/lib/permissions/resourceKeys'

export type { PropertyLocationItem }

let inFlightLocationsUserId: string | null = null
let fetchedLocationsUserId: string | null = null
let inFlightPermissionsKey: string | null = null
let fetchedPermissionsKey: string | null = null

export const clearLocationFetchCache = () => {
  inFlightLocationsUserId = null
  fetchedLocationsUserId = null
  inFlightPermissionsKey = null
  fetchedPermissionsKey = null
}

export const refreshAccessibleLocations = async (selectPropertyId?: string): Promise<PropertyLocationItem[]> => {
  try {
    useLocationStore.getState().setIsLoadingLocations(true)
    const locations = await getUserAccessiblePropertiesAPI()
    useLocationStore.getState().setAccessibleLocations(locations)

    const currentSelectedId = useLocationStore.getState().selectedLocationId
    const targetId = selectPropertyId || currentSelectedId
    const targetLoc = locations.find((l) => l.id === targetId)

    if (targetLoc) {
      useLocationStore.getState().setSelectedLocation(targetLoc.id, targetLoc.property_name)
    } else if (locations.length > 0) {
      useLocationStore.getState().setSelectedLocation(locations[0].id, locations[0].property_name)
    } else {
      useLocationStore.getState().setSelectedLocation(null, null)
    }
    return locations
  } catch (err: unknown) {
    console.warn('Error refreshing accessible properties:', err)
    return []
  } finally {
    inFlightLocationsUserId = null
    useLocationStore.getState().setIsLoadingLocations(false)
  }
}

export const useLocation = () => {
  const { user, isAuthenticated } = useAuth()
  const {
    selectedLocationId,
    selectedLocationName,
    accessibleLocations,
    locationPermissions,
    showLocationModal,
    isLoadingLocations,
    isLoadingPermissions,
    setSelectedLocation,
    setAccessibleLocations,
    setLocationPermissions,
    setShowLocationModal,
    setIsLoadingLocations,
    setIsLoadingPermissions,
    resetLocationState: storeResetLocationState,
  } = useLocationStore()

  // 1. Fetch accessible properties on authentication
  useEffect(() => {
    if (!isAuthenticated || !user) {
      clearLocationFetchCache()
      setAccessibleLocations([])
      setLocationPermissions([])
      setIsLoadingLocations(false)
      setIsLoadingPermissions(false)
      return
    }

    if (fetchedLocationsUserId === user.id || inFlightLocationsUserId === user.id) {
      return
    }

    inFlightLocationsUserId = user.id
    fetchedLocationsUserId = user.id

    refreshAccessibleLocations()
  }, [
    isAuthenticated,
    user,
    setAccessibleLocations,
    setLocationPermissions,
    setIsLoadingLocations,
    setIsLoadingPermissions,
  ])

  // 2. Fetch location permissions whenever selectedLocationId changes
  useEffect(() => {
    if (!user || !selectedLocationId) {
      setIsLoadingPermissions(false)
      return
    }

    const permKey = `${user.id}_${selectedLocationId}`
    if (fetchedPermissionsKey === permKey || inFlightPermissionsKey === permKey) {
      return
    }

    const loadLocationPermissions = async () => {
      inFlightPermissionsKey = permKey
      setIsLoadingPermissions(true)
      try {
        const perms = await getUserLocationPermissionsAPI(user.id, selectedLocationId)
        setLocationPermissions(perms)
        fetchedPermissionsKey = permKey
      } catch (err: unknown) {
        console.warn('Error loading location permissions:', err)
        setLocationPermissions([])
      } finally {
        inFlightPermissionsKey = null
        setIsLoadingPermissions(false)
      }
    }

    loadLocationPermissions()
  }, [user, selectedLocationId, setIsLoadingPermissions, setLocationPermissions])

  const selectLocation = useCallback(
    (location: PropertyLocationItem) => {
      setSelectedLocation(location.id, location.property_name)
      setShowLocationModal(false)
      notifySuccess(`Active property switched to ${location.property_name}`)
    },
    [setSelectedLocation, setShowLocationModal],
  )

  const hasResourcePermission = useCallback(
    (resourceKey: string, permission: 'view' | 'create' | 'update' | 'delete'): boolean => {
      if (
        user?.isSuperAdmin ||
        user?.roles?.includes('SUPER_ADMIN') ||
        user?.email === 'superadmin@rely.com' ||
        user?.username === 'superadmin'
      ) {
        return true
      }

      // Department staff get their department's module and all its sub-modules
      // (mirrored on the backend in services/permission.service.ts).
      const moduleKey = resourceKey.split('.')[0]
      const managerType = getDepartmentManagerType(user)
      if (managerType) {
        if ((managerType === 'RNM' || managerType === 'CON') && moduleKey === 'TICKETS') return true
        if (managerType === 'FNB' && moduleKey === 'FNB') return true
        if (managerType === 'EVENTS' && moduleKey === 'EVENTS') return true
        if (managerType === 'GNS' && moduleKey === 'GNS') return true
        if (managerType === 'HOUSEKEEPING' && (moduleKey === 'ROSTER' || moduleKey === 'EMPLOYEE')) return true
      }

      const has = (key: string, action: string) =>
        locationPermissions.some((p) => p.resourceKey === key && p.permission === action)
      if (!has(resourceKey, permission)) return false
      // Viewing a module that has sections needs View on at least one of them: a module
      // whose sections are all "None" is closed (mirrored in the backend permission service).
      const sections = SUB_MODULES[resourceKey]
      if (permission === 'view' && sections?.length && !sections.some((k) => has(k, 'view'))) return false
      // A sub-module (e.g. FNB.ORDERS) also needs View on its module.
      const at = resourceKey.lastIndexOf('.')
      return at === -1 || has(resourceKey.slice(0, at), 'view')
    },
    [user, locationPermissions],
  )

  const resetLocationState = useCallback(() => {
    clearLocationFetchCache()
    storeResetLocationState()
  }, [storeResetLocationState])

  const refreshLocations = useCallback((selectPropertyId?: string) => {
    return refreshAccessibleLocations(selectPropertyId)
  }, [])

  return {
    selectedLocationId,
    selectedLocationName,
    accessibleLocations,
    locationPermissions,
    showLocationModal,
    setShowLocationModal,
    selectLocation,
    isLoadingLocations,
    isLoadingPermissions,
    hasResourcePermission,
    resetLocationState,
    refreshLocations,
  }
}

// Alias for backwards compatibility
export const useLocationContext = useLocation
