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

// Dynamic imports for better code splitting
const AssetCategories = lazy(() => import('./components/AssetCategories'))
const AssetVendors = lazy(() => import('./components/AssetVendors'))
const AssetItems = lazy(() => import('./components/AssetItems'))
const AssetList = lazy(() => import('./components/AssetList'))
const AssetAssignments = lazy(() => import('./components/AssetAssignments'))
const AssetMaintenance = lazy(() => import('./components/AssetMaintenance'))
const AssetCompliance = lazy(() => import('./components/AssetCompliance'))

const AssetManagementPage = () => {
  const [activeTab, setActiveTab] = useState('overview')

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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Asset Management</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Track and manage your assets, assignments, and maintenance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stats.maintenanceAssets > 0 && (
            <Badge className="bg-orange-100 text-orange-800 border-orange-200 px-3 py-1">
              <Wrench className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{stats.maintenanceAssets} In Maintenance</span>
              <span className="sm:hidden">{stats.maintenanceAssets}</span>
            </Badge>
          )}
        </div>
      </div>

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
          ]}
        />
      </PermissionGuard>
    </div>
  )
}

export default AssetManagementPage
