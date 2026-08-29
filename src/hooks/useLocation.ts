import { useCallback, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getUserLocationPermissionsAPI } from '@/lib/services/rbacService'
import { getUserAccessiblePropertiesAPI } from '@/lib/services/userService'
import { ACTIVE_PROP_ID_KEY, type PropertyLocationItem, useLocationStore } from '@/lib/stores/locationStore'
import { notifyError, notifySuccess } from '@/utils/toast'

export type { PropertyLocationItem }

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
    resetLocationState,
  } = useLocationStore()

  // 1. Fetch accessible properties on authentication
  useEffect(() => {
    let isMounted = true

    if (!isAuthenticated || !user) {
      setAccessibleLocations([])
      setLocationPermissions([])
      setIsLoadingLocations(false)
      return
    }

    const loadLocations = async () => {
      try {
        setIsLoadingLocations(true)
        const locations = await getUserAccessiblePropertiesAPI()
        if (!isMounted) return
        setAccessibleLocations(locations)

        const savedLocId = localStorage.getItem(ACTIVE_PROP_ID_KEY)
        const savedLoc = locations.find((l) => l.id === savedLocId)

        if (savedLoc) {
          setSelectedLocation(savedLoc.id, savedLoc.property_name)
        } else if (locations.length > 0) {
          setShowLocationModal(true)
        }
      } catch (err: unknown) {
        console.warn('Error loading accessible properties:', err)
      } finally {
        if (isMounted) setIsLoadingLocations(false)
      }
    }

    loadLocations()

    return () => {
      isMounted = false
    }
  }, [
    isAuthenticated,
    user,
    setAccessibleLocations,
    setLocationPermissions,
    setSelectedLocation,
    setShowLocationModal,
    setIsLoadingLocations,
  ])

  // 2. Fetch location permissions whenever selectedLocationId changes
  useEffect(() => {
    let isMounted = true

    if (!user || !selectedLocationId) return

    const loadLocationPermissions = async () => {
      setIsLoadingPermissions(true)
      try {
        const perms = await getUserLocationPermissionsAPI(user.id, selectedLocationId)
        if (isMounted) setLocationPermissions(perms)
      } catch (err: unknown) {
        console.warn('Error loading location permissions:', err)
        notifyError('Failed to load location permissions.')
        if (isMounted) setLocationPermissions([])
      } finally {
        if (isMounted) setIsLoadingPermissions(false)
      }
    }

    loadLocationPermissions()

    return () => {
      isMounted = false
    }
  }, [user, selectedLocationId, setLocationPermissions, setIsLoadingPermissions])

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
      return locationPermissions.some((p) => p.resourceKey === resourceKey && p.permission === permission)
    },
    [user, locationPermissions],
  )

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
  }
}

// Alias for backwards compatibility
export const useLocationContext = useLocation
