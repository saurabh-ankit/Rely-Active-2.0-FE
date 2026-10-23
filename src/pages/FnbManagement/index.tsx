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
import { ResponsiveTabs, type TabItem } from '@/components/common/ResponsiveTabs'
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

  const tabContentMap: Record<FnbTab, React.ReactNode> = {
    planner: selectedLocationId ? <FnbMenuPlannerScreen locId={selectedLocationId} /> : null,
    attendance: selectedLocationId ? <FnbAttendanceTab locId={selectedLocationId} /> : null,
    packages: selectedLocationId ? (
      <FnbPropertySettingsScreen locId={selectedLocationId} initialViewMode="unit" hideSubHeader={false} />
    ) : null,
    dishes: selectedLocationId ? <FnbDishesMasterTab locId={selectedLocationId} isLocationMode={true} /> : null,
    'meal-slots': selectedLocationId ? (
      <FnbPropertySettingsScreen locId={selectedLocationId} initialViewMode="meal-slots" hideSubHeader={true} />
    ) : null,
    'resident-orders': selectedLocationId ? <FnbResidentOrdersTab locId={selectedLocationId} /> : null,
  }

  const tabs: TabItem[] = visibleTabs.map((tab) => ({
    value: tab.value,
    label: tab.label,
    shortLabel: tab.label.split(' ')[0],
    icon: tab.icon,
    content: tabContentMap[tab.value],
  }))

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        icon={Utensils}
        title="Food & Beverage (F&B) Management"
        description="Manage food packages, dish catalogues, flexible daily menus, meal slots & timings, resident meal orders, and dine-in attendance."
      />

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
        <ResponsiveTabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as FnbTab)}
          tabs={tabs}
          className="w-full"
        />
      )}
    </div>
  )
}
