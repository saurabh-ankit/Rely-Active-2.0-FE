import { useState } from 'react'
import { Utensils, Calendar, Users } from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import { FnbMenuPlannerScreen } from '../Property/components/FnbMenuPlannerScreen'
import { FnbPropertySettingsScreen } from '../Property/components/FnbPropertySettingsScreen'
import { FnbDishesMasterTab } from '../GlobalSettings/components/FnbDishesMasterTab'

export default function FnbManagementPage() {
  const { selectedLocationId } = useLocationContext()
  const [activeTab, setActiveTab] = useState<'planner' | 'packages' | 'dishes' | 'orders'>('planner')

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#005390]">
              <Utensils className="w-6 h-6" />
            </div>
            Food & Beverage (F&B) Management
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage food packages, dish catalogues, flexible daily menus, and resident meal orders.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 space-x-6 text-sm font-semibold text-gray-500">
        <button
          type="button"
          onClick={() => setActiveTab('planner')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'planner' ? 'border-[#005390] text-[#005390]' : 'border-transparent hover:text-gray-800'
          }`}
        >
          <Calendar className="w-4 h-4" /> Menu Planner & Slots
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('packages')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'packages' ? 'border-[#005390] text-[#005390]' : 'border-transparent hover:text-gray-800'
          }`}
        >
          <Users className="w-4 h-4" /> Property Packages & Pricing
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dishes')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'dishes' ? 'border-[#005390] text-[#005390]' : 'border-transparent hover:text-gray-800'
          }`}
        >
          <Utensils className="w-4 h-4" /> Dish Catalogue
        </button>
      </div>

      {/* Tab Contents */}
      {!selectedLocationId ? (
        <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
          Please select a location from the top header to view location-wise F&B management.
        </div>
      ) : (
        <>
          {activeTab === 'planner' && <FnbMenuPlannerScreen locId={selectedLocationId} />}
          {activeTab === 'packages' && <FnbPropertySettingsScreen locId={selectedLocationId} />}
          {activeTab === 'dishes' && <FnbDishesMasterTab locId={selectedLocationId} isLocationMode={true} />}
        </>
      )}
    </div>
  )
}
