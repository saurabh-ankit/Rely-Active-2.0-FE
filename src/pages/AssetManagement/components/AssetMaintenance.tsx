import { Activity, FileText, Settings } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { ResponsiveTabs } from '@/components/common/ResponsiveTabs'
import PageLoader from '@/components/shared/PageLoader'

const ServiceLogs = lazy(() => import('./Maintenance/ServiceLogs'))
const Warranties = lazy(() => import('./Maintenance/Warranties'))
const Calibrations = lazy(() => import('./Maintenance/Calibrations'))

const AssetMaintenance = () => {
  const [activeTab, setActiveTab] = useState('service-logs')

  return (
    <div className="space-y-6">
      <ResponsiveTabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
        tabs={[
          {
            value: 'service-logs',
            label: 'Service Logs',
            shortLabel: 'Service',
            icon: FileText,
            content: (
              <Suspense fallback={<PageLoader />}>
                <ServiceLogs />
              </Suspense>
            ),
          },
          {
            value: 'warranties',
            label: 'Warranties',
            shortLabel: 'Warranty',
            icon: Settings,
            content: (
              <Suspense fallback={<PageLoader />}>
                <Warranties />
              </Suspense>
            ),
          },
          {
            value: 'calibrations',
            label: 'Calibrations',
            shortLabel: 'Calibration',
            icon: Activity,
            content: (
              <Suspense fallback={<PageLoader />}>
                <Calibrations />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  )
}

export default AssetMaintenance
