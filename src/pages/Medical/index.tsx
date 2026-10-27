import React, { lazy, Suspense, useMemo } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { Activity, Boxes, CalendarDays, HeartHandshake, HeartPulse, Package, Shield, Stethoscope } from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import { useAuth } from '@/hooks/useAuth'
import PageLoader from '@/components/shared/PageLoader'
import { PageHeader } from '@/components/common/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ResponsiveTabs, type TabItem } from '@/components/common/ResponsiveTabs'

const TasksTab = lazy(() => import('@/pages/GlobalSettings/components/TasksTab').then((m) => ({ default: m.TasksTab })))
const PackagesTab = lazy(() =>
  import('@/pages/GlobalSettings/components/PackagesTab').then((m) => ({ default: m.PackagesTab })),
)
const SubscriptionsTab = lazy(() =>
  import('@/pages/GlobalSettings/components/SubscriptionsTab').then((m) => ({ default: m.SubscriptionsTab })),
)
const AssignedTasksTab = lazy(() =>
  import('@/pages/Medical/components/AssignedTasksTab').then((m) => ({ default: m.AssignedTasksTab })),
)
const AppointmentsCalendar = lazy(() =>
  import('@/pages/Medical/components/appointments/AppointmentsCalendar').then((m) => ({
    default: m.AppointmentsCalendar,
  })),
)

export type MedicalSection = 'care' | 'appointments'
export type MedicalTab = 'tasks' | 'packages' | 'subscriptions' | 'assigned'

interface MedicalPageProps {
  initialTab?: MedicalTab
}

export const MedicalPage: React.FC<MedicalPageProps> = ({ initialTab }) => {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { selectedLocationId } = useLocationContext()
  const { isSuperAdmin } = useAuth()

  const activeSection = useMemo((): MedicalSection => {
    const sectionParam = searchParams.get('section')?.toLowerCase()
    if (sectionParam === 'appointments' || sectionParam === 'appointment') return 'appointments'
    return 'care'
  }, [searchParams])

  const activeTab = useMemo((): MedicalTab => {
    if (initialTab) return initialTab

    const path = location.pathname.toLowerCase()
    if (path.includes('/tasks')) return 'tasks'
    if (path.includes('/packages')) return 'packages'
    if (path.includes('/subscriptions')) return 'subscriptions'
    if (path.includes('/assigned')) return 'assigned'

    const tabParam = searchParams.get('tab')?.toLowerCase()
    if (tabParam === 'packages' || tabParam === 'package') return 'packages'
    if (tabParam === 'subscriptions' || tabParam === 'subscription') return 'subscriptions'
    if (tabParam === 'assigned') return 'assigned'
    return 'tasks'
  }, [initialTab, location.pathname, searchParams])

  const handleSectionChange = (section: MedicalSection) => {
    if (section === 'appointments') {
      setSearchParams({ section: 'appointments' })
      return
    }
    setSearchParams({ section: 'care', tab: activeTab })
  }

  const handleTabChange = (tab: MedicalTab) => {
    setSearchParams({ section: 'care', tab })
  }

  const careTabs: TabItem[] = [
    {
      value: 'tasks',
      label: 'Care Tasks',
      shortLabel: 'Tasks',
      icon: HeartHandshake,
      content: (
        <Suspense fallback={<PageLoader />}>
          <TasksTab isPropertyMode={true} forcedPropertyId={selectedLocationId} />
        </Suspense>
      ),
    },
    {
      value: 'packages',
      label: 'Care Packages',
      shortLabel: 'Packages',
      icon: Boxes,
      content: (
        <Suspense fallback={<PageLoader />}>
          <PackagesTab isPropertyMode={true} forcedPropertyId={selectedLocationId} />
        </Suspense>
      ),
    },
    {
      value: 'subscriptions',
      label: 'Package Subscriptions',
      shortLabel: 'Subscriptions',
      icon: Package,
      content: (
        <Suspense fallback={<PageLoader />}>
          <SubscriptionsTab isPropertyMode={true} forcedPropertyId={selectedLocationId} />
        </Suspense>
      ),
    },
    {
      value: 'assigned',
      label: 'Clinical Care Tasks',
      shortLabel: 'Clinical',
      icon: Activity,
      content: (
        <Suspense fallback={<PageLoader />}>
          <AssignedTasksTab forcedPropertyId={selectedLocationId} />
        </Suspense>
      ),
    },
  ]

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        icon={Stethoscope}
        title="Medical & Clinical Care"
        description={
          activeSection === 'appointments'
            ? 'View visiting doctor shifts and manage resident appointment bookings.'
            : 'Configure and manage Care Tasks, Care Packages, and Resident Subscriptions.'
        }
        actions={
          <>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 bg-white/70 border border-gray-200 shadow-2xs backdrop-blur-sm">
              <Shield className="w-3.5 h-3.5 text-[#005390]" />
              {isSuperAdmin ? 'Super Admin' : 'Property Admin'}
            </span>
          </>
        }
      />

      {/* Top-level: Care | Appointments */}
      <Tabs
        value={activeSection}
        onValueChange={(val) => handleSectionChange(val as MedicalSection)}
        className="w-full gap-4"
      >
        <div className="rounded-full bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/70 dark:border-slate-700/80 p-1 shadow-2xs w-full">
          <TabsList className="grid grid-cols-2 w-full items-center gap-1 bg-transparent p-0">
            <TabsTrigger
              value="care"
              className="flex h-8 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-black/5 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 [&[data-active]]:!bg-[#005390] [&[data-active]]:!text-white [&[data-active]:hover]:!bg-[#005390] [&[data-active]:hover]:!text-white data-active:shadow-xs focus-visible:!ring-0 transition-all cursor-pointer"
            >
              <HeartPulse className="size-4 shrink-0" />
              Care
            </TabsTrigger>
            <TabsTrigger
              value="appointments"
              className="flex h-8 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-black/5 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 [&[data-active]]:!bg-[#005390] [&[data-active]]:!text-white [&[data-active]:hover]:!bg-[#005390] [&[data-active]:hover]:!text-white data-active:shadow-xs focus-visible:!ring-0 transition-all cursor-pointer"
            >
              <CalendarDays className="size-4 shrink-0" />
              Appointments
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="care" className="pt-2">
          <ResponsiveTabs
            value={activeTab}
            onValueChange={(tab) => handleTabChange(tab as MedicalTab)}
            tabs={careTabs}
            className="w-full"
          />
        </TabsContent>

        <TabsContent value="appointments" className="pt-2">
          <Suspense fallback={<PageLoader />}>
            <AppointmentsCalendar />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default MedicalPage
