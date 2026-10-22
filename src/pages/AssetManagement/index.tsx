import { lazy, Suspense, useState } from 'react'
import {
  AlertCircle,
  Box,
  CheckCircle,
  ClipboardList,
  Package,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Users,
  Wrench,
} from 'lucide-react'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { ResponsiveTabs } from '@/components/common/ResponsiveTabs'
import PageLoader from '@/components/shared/PageLoader'
import { Badge } from '@/components/ui/badge'
import { useGetAssetStats } from '@/hooks/react-query/assetManagement'
import StatCard from './components/StatCard'
import StatsGrid from './components/StatsGrid'
import { PageHeader } from '@/components/common/PageHeader'
import { useResourceAccess } from '@/hooks/useResourceAccess'
import { RESOURCE } from '@/lib/permissions/resourceKeys'

// Dynamic imports for better code splitting
const AssetCategories = lazy(() => import('./components/AssetCategories'))
const AssetVendors = lazy(() => import('./components/AssetVendors'))
const AssetItems = lazy(() => import('./components/AssetItems'))
const AssetList = lazy(() => import('./components/AssetList'))
const AssetAssignments = lazy(() => import('./components/AssetAssignments'))
const AssetMaintenance = lazy(() => import('./components/AssetMaintenance'))
const AssetCompliance = lazy(() => import('./components/AssetCompliance'))

const AssetManagementPage = () => {
  const [chosenTab, setActiveTab] = useState('overview')
  // Each tab is an Asset sub-module; users only see the tabs they can view.
  const tabAccess: Record<string, boolean> = {
    overview: useResourceAccess(RESOURCE.ASSET_ASSETS).canView,
    categories: useResourceAccess(RESOURCE.ASSET_CATEGORIES).canView,
    vendors: useResourceAccess(RESOURCE.ASSET_VENDORS).canView,
    items: useResourceAccess(RESOURCE.ASSET_ITEMS).canView,
    assignments: useResourceAccess(RESOURCE.ASSET_ASSIGNMENTS).canView,
    maintenance: useResourceAccess(RESOURCE.ASSET_MAINTENANCE).canView,
    compliance: useResourceAccess(RESOURCE.ASSET_COMPLIANCE).canView,
  }
  const firstAllowed = Object.keys(tabAccess).find((t) => tabAccess[t])
  const activeTab = tabAccess[chosenTab] ? chosenTab : (firstAllowed ?? chosenTab)

  const { data: statsData, isLoading: statsLoading } = useGetAssetStats()
  const stats = statsData?.data || {
    totalAssets: 0,
    availableAssets: 0,
    assignedAssets: 0,
    maintenanceAssets: 0,
    retiredAssets: 0,
    disposedAssets: 0,
    totalValue: 0,
    underWarranty: 0,
    recentAdditions: 0,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Box}
        title="Asset Management"
        description="Track and manage your assets, assignments, and maintenance."
        actions={
          <>
            {stats.maintenanceAssets > 0 && (
              <Badge className="bg-orange-100 text-orange-800 border-orange-200 px-3 py-1">
                <Wrench className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{stats.maintenanceAssets} In Maintenance</span>
                <span className="sm:hidden">{stats.maintenanceAssets}</span>
              </Badge>
            )}
          </>
        }
      />

      {/* Stats Overview */}
      <StatsGrid>
        <StatCard
          title="Total Assets"
          value={statsLoading ? '...' : stats.totalAssets.toString()}
          description="All registered assets"
          icon={Box}
          color="blue"
          isLoading={statsLoading}
        />
        <StatCard
          title="Available"
          value={statsLoading ? '...' : stats.availableAssets.toString()}
          description="Ready for assignment"
          icon={Package}
          color="green"
          isLoading={statsLoading}
        />
        <StatCard
          title="Assigned"
          value={statsLoading ? '...' : stats.assignedAssets.toString()}
          description="Currently in use"
          icon={Users}
          color="purple"
          isLoading={statsLoading}
        />
        <StatCard
          title="In Maintenance"
          value={statsLoading ? '...' : stats.maintenanceAssets.toString()}
          description="Under repair/service"
          icon={Wrench}
          color="orange"
          isLoading={statsLoading}
        />
        <StatCard
          title="Retired Assets"
          value={statsLoading ? '...' : stats.retiredAssets.toString()}
          description="No longer in use"
          icon={AlertCircle}
          color="red"
          isLoading={statsLoading}
        />
        <StatCard
          title="Under Warranty"
          value={statsLoading ? '...' : stats.underWarranty.toString()}
          description="Active warranties"
          icon={Shield}
          color="pink"
          isLoading={statsLoading}
        />
        <StatCard
          title="Recent Additions"
          value={statsLoading ? '...' : stats.recentAdditions.toString()}
          description="Added this month"
          icon={Sparkles}
          color="yellow"
          isLoading={statsLoading}
        />
        <StatCard
          title="Disposed"
          value={statsLoading ? '...' : (stats.disposedAssets ?? 0).toString()}
          description="Permanently disposed"
          icon={Trash2}
          color="cyan"
          isLoading={statsLoading}
        />
      </StatsGrid>

      {/* Main Content Tabs */}
      <PermissionGuard permission="assets:view">
        <ResponsiveTabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
          tabs={[
            {
              value: 'overview',
              label: 'Assets',
              shortLabel: 'Assets',
              icon: Box,
              content: (
                <Suspense fallback={<PageLoader />}>
                  <AssetList enabled={activeTab === 'overview'} />
                </Suspense>
              ),
            },
            {
              value: 'categories',
              label: 'Categories',
              shortLabel: 'Categories',
              icon: Settings,
              content: (
                <Suspense fallback={<PageLoader />}>
                  <AssetCategories enabled={activeTab === 'categories'} />
                </Suspense>
              ),
            },
            {
              value: 'vendors',
              label: 'Vendors',
              shortLabel: 'Vendors',
              icon: Users,
              content: (
                <Suspense fallback={<PageLoader />}>
                  <AssetVendors enabled={activeTab === 'vendors'} />
                </Suspense>
              ),
            },
            {
              value: 'items',
              label: 'Items',
              shortLabel: 'Items',
              icon: Package,
              content: (
                <Suspense fallback={<PageLoader />}>
                  <AssetItems enabled={activeTab === 'items'} />
                </Suspense>
              ),
            },
            {
              value: 'assignments',
              label: 'Assignments',
              shortLabel: 'Assign',
              icon: ClipboardList,
              content: (
                <Suspense fallback={<PageLoader />}>
                  <AssetAssignments enabled={activeTab === 'assignments'} />
                </Suspense>
              ),
            },
            {
              value: 'maintenance',
              label: 'Maintenance',
              shortLabel: 'Maintain',
              icon: Wrench,
              content: (
                <Suspense fallback={<PageLoader />}>
                  <AssetMaintenance />
                </Suspense>
              ),
            },
            {
              value: 'compliance',
              label: 'Compliance',
              shortLabel: 'Comply',
              icon: CheckCircle,
              content: (
                <Suspense fallback={<PageLoader />}>
                  <AssetCompliance />
                </Suspense>
              ),
            },
          ].filter((tab) => tabAccess[tab.value])}
        />
        {!firstAllowed && (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
            <p className="text-sm font-semibold text-gray-600">
              You don&apos;t have access to any Asset sections here.
            </p>
            <p className="mt-1 text-xs text-gray-400">Ask a super admin to grant access in Module Permissions.</p>
          </div>
        )}
      </PermissionGuard>
    </div>
  )
}

export default AssetManagementPage
