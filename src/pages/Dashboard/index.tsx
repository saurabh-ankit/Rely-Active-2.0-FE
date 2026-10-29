import { IndianRupee, LayoutDashboard, Package, RefreshCw, Users } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-auto flex shrink-0 items-center justify-center gap-2 rounded-full border border-slate-300/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-600 shadow-2xs hover:text-[#005390] hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            {updatedAt ? `Updated ${updatedAt}` : 'Refresh'}
          </Button>
        }
      />

      {isError && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <span>Failed to load dashboard statistics.</span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => refetch()}
            className="h-auto p-0 ml-2 font-bold underline hover:bg-transparent hover:text-rose-900 text-rose-700"
          >
            Retry
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as Tab)} className="w-full gap-0">
        <div className="w-full rounded-full bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/70 dark:border-slate-700/80 p-1 shadow-2xs">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto gap-1 items-center bg-transparent p-0">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex h-8 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-black/5 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 [&[data-active]]:!bg-[#005390] [&[data-active]]:!text-white [&[data-active]:hover]:!bg-[#005390] [&[data-active]:hover]:!text-white data-active:shadow-xs focus-visible:!ring-0 transition-all cursor-pointer"
              >
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

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
