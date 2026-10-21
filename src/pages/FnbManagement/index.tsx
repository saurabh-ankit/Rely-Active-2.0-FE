import { useState } from 'react'
import { Utensils, Calendar, Users, Clock, ShoppingBag, ClipboardCheck, Lock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import { useResourceAccess } from '@/hooks/useResourceAccess'
import { RESOURCE, type ResourceKey } from '@/lib/permissions/resourceKeys'
import { FnbMenuPlannerScreen } from '../Property/components/FnbMenuPlannerScreen'
import { FnbPropertySettingsScreen } from '../Property/components/FnbPropertySettingsScreen'
import { FnbDishesMasterTab } from '../GlobalSettings/components/FnbDishesMasterTab'
import { FnbResidentOrdersTab } from '../Property/components/FnbResidentOrdersTab'
import { FnbAttendanceTab } from '../Property/components/FnbAttendanceTab'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/PageHeader'

type FnbTab = 'planner' | 'packages' | 'dishes' | 'meal-slots' | 'resident-orders' | 'attendance'

/** Each tab is a sub-module of Food; users only see the tabs they can view. */
const TABS: Array<{ value: FnbTab; label: string; icon: LucideIcon; iconClass?: string; resource: ResourceKey }> = [
  { value: 'planner', label: 'Menu Planner & Slots', icon: Calendar, resource: RESOURCE.FNB_MENU_PLANNER },
  {
    value: 'attendance',
    label: 'Food Attendance',
    icon: ClipboardCheck,
    iconClass: 'text-emerald-600',
    resource: RESOURCE.FNB_ATTENDANCE,
  },
  { value: 'packages', label: 'Property Packages & Pricing', icon: Users, resource: RESOURCE.FNB_PACKAGES },
  { value: 'dishes', label: 'Dish Catalogue', icon: Utensils, resource: RESOURCE.FNB_DISHES },
  { value: 'meal-slots', label: 'Meal Slots & Timings', icon: Clock, resource: RESOURCE.FNB_MEAL_SLOTS },
  { value: 'resident-orders', label: 'Resident Orders', icon: ShoppingBag, resource: RESOURCE.FNB_ORDERS },
]

export default function FnbManagementPage() {
  const { selectedLocationId } = useLocationContext()
  const access: Record<FnbTab, boolean> = {
    planner: useResourceAccess(RESOURCE.FNB_MENU_PLANNER).canView,
    attendance: useResourceAccess(RESOURCE.FNB_ATTENDANCE).canView,
    packages: useResourceAccess(RESOURCE.FNB_PACKAGES).canView,
    dishes: useResourceAccess(RESOURCE.FNB_DISHES).canView,
    'meal-slots': useResourceAccess(RESOURCE.FNB_MEAL_SLOTS).canView,
    'resident-orders': useResourceAccess(RESOURCE.FNB_ORDERS).canView,
  }
  const visibleTabs = TABS.filter((t) => access[t.value])
  const [chosenTab, setActiveTab] = useState<FnbTab | null>(null)
  // The chosen tab, or the first one the user may see (permissions can change with the property).
  const activeTab = chosenTab && access[chosenTab] ? chosenTab : (visibleTabs[0]?.value ?? null)

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        icon={Utensils}
        title="Food & Beverage (F&B) Management"
        description="Manage food packages, dish catalogues, flexible daily menus, meal slots & timings, resident meal orders, and dine-in attendance."
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 space-x-6 text-sm font-semibold text-gray-500 overflow-x-auto">
        {visibleTabs.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            variant="ghost"
            onClick={() => setActiveTab(tab.value)}
            className={`h-auto p-0 pb-3 border-b-2 rounded-none flex items-center gap-2 transition-colors cursor-pointer shrink-0 hover:bg-transparent ${
              activeTab === tab.value
                ? 'border-[#005390] text-[#005390]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${tab.iconClass ?? ''}`} /> {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Contents */}
      {!activeTab ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-100">
          <Lock className="mx-auto mb-2 h-6 w-6 text-gray-300" />
          <p className="text-sm font-semibold text-gray-600">You don&apos;t have access to any Food sections here.</p>
          <p className="mt-1 text-xs text-gray-400">Ask a super admin to grant access in Module Permissions.</p>
        </div>
      ) : !selectedLocationId ? (
        <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
          Please select a location from the top header to view location-wise F&B management.
        </div>
      ) : (
        <>
          {activeTab === 'planner' && <FnbMenuPlannerScreen locId={selectedLocationId} />}
          {activeTab === 'attendance' && <FnbAttendanceTab locId={selectedLocationId} />}
          {activeTab === 'packages' && (
            <FnbPropertySettingsScreen locId={selectedLocationId} initialViewMode="unit" hideSubHeader={false} />
          )}
          {activeTab === 'dishes' && <FnbDishesMasterTab locId={selectedLocationId} isLocationMode={true} />}
          {activeTab === 'meal-slots' && (
            <FnbPropertySettingsScreen locId={selectedLocationId} initialViewMode="meal-slots" hideSubHeader={true} />
          )}
          {activeTab === 'resident-orders' && <FnbResidentOrdersTab locId={selectedLocationId} />}
        </>
      )}
    </div>
  )
}
