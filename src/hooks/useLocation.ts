import { useCallback, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getUserLocationPermissionsAPI } from '@/lib/services/rbacService'
import { getUserAccessiblePropertiesAPI } from '@/lib/services/userService'
import { ACTIVE_PROP_ID_KEY, type PropertyLocationItem, useLocationStore } from '@/lib/stores/locationStore'
import { notifySuccess } from '@/utils/toast'

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

    const loadLocations = async () => {
      inFlightLocationsUserId = user.id
      try {
        setIsLoadingLocations(true)
        const locations = await getUserAccessiblePropertiesAPI()
        setAccessibleLocations(locations)
        fetchedLocationsUserId = user.id

        const savedLocId = localStorage.getItem(ACTIVE_PROP_ID_KEY)
        const savedLoc = locations.find((l) => l.id === savedLocId)

        if (savedLoc) {
          setSelectedLocation(savedLoc.id, savedLoc.property_name)
        } else if (locations.length > 0) {
          setSelectedLocation(locations[0].id, locations[0].property_name)
        }
      } catch (err: unknown) {
        console.warn('Error loading accessible properties:', err)
      } finally {
        inFlightLocationsUserId = null
        setIsLoadingLocations(false)
      }
    }

    loadLocations()
  }, [
    isAuthenticated,
    user,
    setAccessibleLocations,
    setLocationPermissions,
    setIsLoadingLocations,
    setIsLoadingPermissions,
    setSelectedLocation,
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

      return locationPermissions.some((p) => p.resourceKey === resourceKey && p.permission === permission)
    },
    [user, locationPermissions],
  )

  const resetLocationState = useCallback(() => {
    clearLocationFetchCache()
    storeResetLocationState()
  }, [storeResetLocationState])

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
