import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserLocationPermissionItem } from '@/lib/types'

export interface PropertyLocationItem {
  id: string
  property_name: string
}

export const ACTIVE_PROP_ID_KEY = 'rely_active_property_id'
export const ACTIVE_PROP_NAME_KEY = 'rely_active_property_name'

export interface LocationState {
  selectedLocationId: string | null
  selectedLocationName: string | null
  accessibleLocations: PropertyLocationItem[]
  locationPermissions: UserLocationPermissionItem[]
  showLocationModal: boolean
  isLoadingLocations: boolean
  isLoadingPermissions: boolean

  // Actions
  setSelectedLocation: (id: string | null, name: string | null) => void
  setAccessibleLocations: (locations: PropertyLocationItem[]) => void
  setLocationPermissions: (permissions: UserLocationPermissionItem[]) => void
  setShowLocationModal: (show: boolean) => void
  setIsLoadingLocations: (isLoading: boolean) => void
  setIsLoadingPermissions: (isLoading: boolean) => void
  resetLocationState: () => void
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      selectedLocationId: null,
      selectedLocationName: null,
      accessibleLocations: [],
      locationPermissions: [],
      showLocationModal: false,
      isLoadingLocations: false,
      isLoadingPermissions: false,

      setSelectedLocation: (id, name) => {
        const currentId = get().selectedLocationId
        const currentName = get().selectedLocationName
        if (currentId === id && currentName === name) return
        set({ selectedLocationId: id, selectedLocationName: name })
      },

      setAccessibleLocations: (accessibleLocations) => {
        const current = get().accessibleLocations
        if (JSON.stringify(current) === JSON.stringify(accessibleLocations)) return
        set({ accessibleLocations })
      },

      setLocationPermissions: (locationPermissions) => {
        const current = get().locationPermissions
        if (JSON.stringify(current) === JSON.stringify(locationPermissions)) return
        set({ locationPermissions })
      },

      setShowLocationModal: (showLocationModal) => {
        if (get().showLocationModal === showLocationModal) return
        set({ showLocationModal })
      },

      setIsLoadingLocations: (isLoadingLocations) => {
        if (get().isLoadingLocations === isLoadingLocations) return
        set({ isLoadingLocations })
      },

      setIsLoadingPermissions: (isLoadingPermissions) => {
        if (get().isLoadingPermissions === isLoadingPermissions) return
        set({ isLoadingPermissions })
      },

      resetLocationState: () => {
        set({
          selectedLocationId: null,
          selectedLocationName: null,
          accessibleLocations: [],
          locationPermissions: [],
          showLocationModal: false,
          isLoadingLocations: false,
          isLoadingPermissions: false,
        })
      },
    }),
    {
      name: 'rely-active-location-storage',
      partialize: (state) => ({
        selectedLocationId: state.selectedLocationId,
        selectedLocationName: state.selectedLocationName,
      }),
    },
  ),
)
