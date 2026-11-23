import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DASHBOARD_KEYS, useDashboardSettingsQuery, useDashboardStatsQuery } from '@/hooks/react-query/dashboard'
import { useLocation } from '@/hooks/useLocation'
import type { AnalyticsTabKey, DashboardTabKey } from '@/lib/types/dashboard'
import { cn } from '@/lib/utils'
import { AnalyticsTabView } from './components/AnalyticsTabView'
import { BillingTab } from './components/BillingTab'
import { InventoryTab } from './components/InventoryTab'
import { OccupancyTab } from './components/OccupancyTab'
import { CustomizeTabsDialog } from './components/CustomizeTabsDialog'
import { OverviewTab } from './components/OverviewTab'
import { DASHBOARD_TABS } from './tabs'

/** Tabs served by `/dashboard/stats`; every other tab loads its own analytics. */
const STATS_TABS: DashboardTabKey[] = ['dashboard', 'occupancy', 'billing', 'inventory']

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
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<DashboardTabKey>('dashboard')
  const [customizing, setCustomizing] = useState(false)
  const [criticalPage, setCriticalPage] = useState(1)
  const [prevLocationId, setPrevLocationId] = useState(selectedLocationId)

  // Back to the first page of critical residents when the property changes.
  if (prevLocationId !== selectedLocationId) {
    setPrevLocationId(selectedLocationId)
    setCriticalPage(1)
  }

  const { data: settings } = useDashboardSettingsQuery(selectedLocationId)
  // Until the company's choice loads, show every tab rather than flash a shorter list.
  const visibleTabs = DASHBOARD_TABS.filter(
    (t) => t.value === 'dashboard' || !settings || settings.visibleTabs.includes(t.value),
  )
  // A tab hidden by an admin falls back to the overview.
  const currentTab = visibleTabs.some((t) => t.value === activeTab) ? activeTab : 'dashboard'
  const isStatsTab = STATS_TABS.includes(currentTab)

  const {
    data: stats,
    isLoading,
    isError,
    refetch,
  } = useDashboardStatsQuery(selectedLocationId, { page: criticalPage, limit: 6 })
  const isFetching = useIsFetching({ queryKey: DASHBOARD_KEYS.all }) > 0

  const updatedAt = stats?.generatedAt
    ? new Date(stats.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="space-y-5">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description={`Live property overview: ${
          visibleTabs
            .filter((t) => t.value !== 'dashboard')
            .map((t) => t.label.toLowerCase())
            .join(', ')
            .replace(/, ([^,]*)$/, ' and $1') || 'residents, tickets and visitors'
        }.`}
        actions={
          <div className="flex shrink-0 items-center gap-2">
            {settings?.canEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCustomizing(true)}
                className="h-auto flex shrink-0 items-center justify-center gap-2 rounded-full border border-slate-300/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-600 shadow-2xs hover:text-[#005390] hover:bg-gray-50"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Customise tabs
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: DASHBOARD_KEYS.all })}
              disabled={isFetching}
              className="h-auto flex shrink-0 items-center justify-center gap-2 rounded-full border border-slate-300/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-600 shadow-2xs hover:text-[#005390] hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
              {updatedAt ? `Updated ${updatedAt}` : 'Refresh'}
            </Button>
          </div>
        }
      />

      {isError && isStatsTab && (
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

      <Tabs value={currentTab} onValueChange={(val) => setActiveTab(val as DashboardTabKey)} className="w-full gap-0">
        <div className="w-full rounded-[20px] bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/70 dark:border-slate-700/80 p-1 shadow-2xs">
          {/* Up to 12 tabs share the row; on narrow screens they wrap onto a second row instead of scrolling. */}
          <TabsList className="flex w-full h-auto flex-wrap justify-center gap-1 items-center bg-transparent p-0">
            {visibleTabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex h-8 w-auto flex-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-black/5 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 [&[data-active]]:!bg-[#005390] [&[data-active]]:!text-white [&[data-active]:hover]:!bg-[#005390] [&[data-active]:hover]:!text-white data-active:shadow-xs focus-visible:!ring-0 transition-all cursor-pointer"
              >
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {!isStatsTab ? (
        <AnalyticsTabView
          key={currentTab}
          tab={currentTab as AnalyticsTabKey}
          label={visibleTabs.find((t) => t.value === currentTab)?.label ?? ''}
          locationId={selectedLocationId}
        />
      ) : isLoading || !stats ? (
        isError ? null : (
          <LoadingState />
        )
      ) : (
        <>
          {currentTab === 'dashboard' && (
            <OverviewTab data={stats.overview} criticalPage={criticalPage} onCriticalPage={setCriticalPage} />
          )}
          {currentTab === 'occupancy' && <OccupancyTab data={stats.occupancy} />}
          {currentTab === 'billing' && <BillingTab data={stats.billing} />}
          {currentTab === 'inventory' && <InventoryTab data={stats.inventory} />}
        </>
      )}

      {settings?.canEdit && (
        <CustomizeTabsDialog
          open={customizing}
          onOpenChange={setCustomizing}
          settings={settings}
          locationId={selectedLocationId}
        />
      )}
    </div>
  )
}
