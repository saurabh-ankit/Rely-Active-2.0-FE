import React from 'react'
import { Building2, Check, MapPin } from 'lucide-react'
import { useLocationContext, type PropertyLocationItem } from '@/context/LocationContext'
import { CommonModal } from './CommonModal'

export const LocationSelectionModal: React.FC = () => {
  const { showLocationModal, setShowLocationModal, accessibleLocations, selectedLocationId, selectLocation } =
    useLocationContext()

  if (accessibleLocations.length === 0) return null

  return (
    <CommonModal
      isOpen={showLocationModal}
      onClose={() => {
        // Force selection if no location is active yet
        if (selectedLocationId) setShowLocationModal(false)
      }}
      title="Select Operating Property Location"
      maxWidth="md"
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Please select the property location you want to operate for this session. Your access permissions and data
          will be scoped to this location.
        </p>

        <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-1">
          {accessibleLocations.map((loc: PropertyLocationItem) => {
            const isSelected = loc.id === selectedLocationId
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => selectLocation(loc)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-[#005390] text-white border-[#005390] shadow-md shadow-[#005390]/20'
                    : 'bg-white border-gray-200 hover:border-[#005390]/40 hover:bg-[#005390]/10 text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#005390]/10 text-[#005390]'
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{loc.property_name}</h4>
                    <span
                      className={`text-[10px] flex items-center gap-1 ${
                        isSelected ? 'text-blue-100' : 'text-gray-400'
                      }`}
                    >
                      <MapPin className="w-3 h-3" />
                      Facility Property
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-white text-[#005390] flex items-center justify-center">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </CommonModal>
  )
}
