import { Award, ClipboardCheck, GraduationCap } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { ResponsiveTabs } from '@/components/common/ResponsiveTabs'
import PageLoader from '@/components/shared/PageLoader'

const Certifications = lazy(() => import('./Compliance/Certifications'))
const Inspections = lazy(() => import('./Compliance/Inspections'))
const Training = lazy(() => import('./Compliance/Training'))

const AssetCompliance = () => {
  const [activeTab, setActiveTab] = useState('certifications')

  return (
    <div className="space-y-6">
      <ResponsiveTabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
        tabs={[
          {
            value: 'certifications',
            label: 'Certifications',
            shortLabel: 'Certs',
            icon: Award,
            content: (
              <Suspense fallback={<PageLoader />}>
                <Certifications />
              </Suspense>
            ),
          },
          {
            value: 'inspections',
            label: 'Inspections',
            shortLabel: 'Inspections',
            icon: ClipboardCheck,
            content: (
              <Suspense fallback={<PageLoader />}>
                <Inspections />
              </Suspense>
            ),
          },
          {
            value: 'training',
            label: 'Training',
            shortLabel: 'Training',
            icon: GraduationCap,
            content: (
              <Suspense fallback={<PageLoader />}>
                <Training />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  )
}

export default AssetCompliance
