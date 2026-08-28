import React, { createContext, useContext, useEffect, useState } from 'react'
import { rbacApi, type UserLocationPermissionItem } from '@/api/rbac'
import { useAuth } from '@/context/AuthContext'
import { notifyError, notifySuccess } from '@/utils/toast'

export interface PropertyLocationItem {
  id: string
  property_name: string
}

interface LocationContextType {
  selectedLocationId: string | null
  selectedLocationName: string | null
  accessibleLocations: PropertyLocationItem[]
  locationPermissions: UserLocationPermissionItem[]
  showLocationModal: boolean
  setShowLocationModal: (show: boolean) => void
  selectLocation: (location: PropertyLocationItem) => void
  isLoadingLocations: boolean
  isLoadingPermissions: boolean
  hasResourcePermission: (resourceKey: string, permission: 'view' | 'create' | 'update' | 'delete') => boolean
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

const ACTIVE_PROP_ID_KEY = 'rely_active_property_id'
const ACTIVE_PROP_NAME_KEY = 'rely_active_property_name'

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth()
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_PROP_ID_KEY),
  )
  const [selectedLocationName, setSelectedLocationName] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_PROP_NAME_KEY),
  )
  const [accessibleLocations, setAccessibleLocations] = useState<PropertyLocationItem[]>([])
  const [locationPermissions, setLocationPermissions] = useState<UserLocationPermissionItem[]>([])
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false)
  const [isLoadingLocations, setIsLoadingLocations] = useState<boolean>(true)
  const [isLoadingPermissions, setIsLoadingPermissions] = useState<boolean>(false)

  // 1. On sign-in, fetch accessible properties and prompt location selection popup
  useEffect(() => {
    let isMounted = true

    const loadLocations = async () => {
      if (!isAuthenticated || !user) {
        if (isMounted) {
          setAccessibleLocations([])
          setLocationPermissions([])
          setIsLoadingLocations(false)
        }
        return
      }

      try {
        const locations = await rbacApi.getUserAccessibleProperties()
        if (!isMounted) return
        setAccessibleLocations(locations)

        const savedLocId = localStorage.getItem(ACTIVE_PROP_ID_KEY)
        const savedLoc = locations.find((l) => l.id === savedLocId)

        if (savedLoc) {
          setSelectedLocationId(savedLoc.id)
          setSelectedLocationName(savedLoc.property_name)
        }

        // Open location popup after sign in for property selection
        if (locations.length > 0) {
          setShowLocationModal(true)
        }
      } catch (err: unknown) {
        console.warn('Error loading accessible properties for location context:', err)
      } finally {
        if (isMounted) setIsLoadingLocations(false)
      }
    }

    loadLocations()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated, user])

  // 2. Fire location permissions API whenever selectedLocationId changes or is set
  useEffect(() => {
    let isMounted = true

    const loadLocationPermissions = async () => {
      if (!user || !selectedLocationId) return
      setIsLoadingPermissions(true)
      try {
        const perms = await rbacApi.getUserLocationPermissions(user.id, selectedLocationId)
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
  }, [user, selectedLocationId])

  const selectLocation = (location: PropertyLocationItem) => {
    setSelectedLocationId(location.id)
    setSelectedLocationName(location.property_name)
    localStorage.setItem(ACTIVE_PROP_ID_KEY, location.id)
    localStorage.setItem(ACTIVE_PROP_NAME_KEY, location.property_name)
    setShowLocationModal(false)
    notifySuccess(`Active property switched to ${location.property_name}`)
  }

  const hasResourcePermission = (resourceKey: string, permission: 'view' | 'create' | 'update' | 'delete'): boolean => {
    if (user?.isSuperAdmin) return true
    return locationPermissions.some((p) => p.resourceKey === resourceKey && p.permission === permission)
  }

  return (
    <LocationContext.Provider
      value={{
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
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocationContext() {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider')
  }
  return context
}
