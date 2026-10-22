import { IndianRupee, LayoutDashboard, Package, RefreshCw, Users } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardStatsQuery } from '@/hooks/react-query/dashboard'
import { useLocation } from '@/hooks/useLocation'
import { cn } from '@/lib/utils'
import { BillingTab } from './components/BillingTab'
import { InventoryTab } from './components/InventoryTab'
import { OccupancyTab } from './components/OccupancyTab'
import { OverviewTab } from './components/OverviewTab'

type Tab = 'dashboard' | 'occupancy' | 'billing' | 'inventory'

const TABS: { value: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { value: 'occupancy', label: 'Occupancy', icon: Users },
  { value: 'billing', label: 'Billing', icon: IndianRupee },
  { value: 'inventory', label: 'Inventory', icon: Package },
]

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-[20px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Skeleton className="h-80 rounded-[24px] xl:col-span-2" />
        <Skeleton className="h-80 rounded-[24px]" />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-72 rounded-[24px]" />
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { selectedLocationId } = useLocation()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [criticalPage, setCriticalPage] = useState(1)
  const [prevLocationId, setPrevLocationId] = useState(selectedLocationId)

  // Back to the first page of critical residents when the property changes.
  if (prevLocationId !== selectedLocationId) {
    setPrevLocationId(selectedLocationId)
    setCriticalPage(1)
  }

  const {
    data: stats,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useDashboardStatsQuery(selectedLocationId, { page: criticalPage, limit: 6 })

  const updatedAt = stats?.generatedAt
    ? new Date(stats.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="space-y-5">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="Live property overview: residents, tickets, visitors, occupancy, billing and inventory."
      />

      {isError && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <span>Failed to load dashboard statistics.</span>
          <button type="button" onClick={() => refetch()} className="ml-2 font-bold underline hover:text-rose-900">
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="no-scrollbar flex w-full overflow-x-auto gap-2 rounded-[20px] border border-white/60 bg-[#dce0e4] p-1.5 shadow-inner md:flex-1">
          {TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveTab(value)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold whitespace-nowrap transition-all',
                activeTab === value ? 'bg-[#005390] text-white shadow-md' : 'text-[#5c6370] hover:text-slate-900',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-600 shadow-xs hover:text-[#005390] disabled:opacity-60"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          {updatedAt ? `Updated ${updatedAt}` : 'Refresh'}
        </button>
      </div>

      {isLoading || !stats ? (
        isError ? null : (
          <LoadingState />
        )
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <OverviewTab data={stats.overview} criticalPage={criticalPage} onCriticalPage={setCriticalPage} />
          )}
          {activeTab === 'occupancy' && <OccupancyTab data={stats.occupancy} />}
          {activeTab === 'billing' && <BillingTab data={stats.billing} />}
          {activeTab === 'inventory' && <InventoryTab data={stats.inventory} />}
        </>
      )}
    </div>
  )
}
