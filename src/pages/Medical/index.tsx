import React, { useMemo } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { Activity, Boxes, CalendarDays, HeartHandshake, HeartPulse, Package, Shield, Stethoscope } from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import { useAuth } from '@/hooks/useAuth'
import { TasksTab } from '@/pages/GlobalSettings/components/TasksTab'
import { PackagesTab } from '@/pages/GlobalSettings/components/PackagesTab'
import { SubscriptionsTab } from '@/pages/GlobalSettings/components/SubscriptionsTab'
import { AssignedTasksTab } from '@/pages/Medical/components/AssignedTasksTab'
import { AppointmentsCalendar } from '@/pages/Medical/components/appointments/AppointmentsCalendar'
import { PageHeader } from '@/components/common/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ResponsiveTabs, type TabItem } from '@/components/common/ResponsiveTabs'

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
      content: <TasksTab isPropertyMode={true} forcedPropertyId={selectedLocationId} />,
    },
    {
      value: 'packages',
      label: 'Care Packages',
      shortLabel: 'Packages',
      icon: Boxes,
      content: <PackagesTab isPropertyMode={true} forcedPropertyId={selectedLocationId} />,
    },
    {
      value: 'subscriptions',
      label: 'Package Subscriptions',
      shortLabel: 'Subscriptions',
      icon: Package,
      content: <SubscriptionsTab isPropertyMode={true} forcedPropertyId={selectedLocationId} />,
    },
    {
      value: 'assigned',
      label: 'Clinical Care Tasks',
      shortLabel: 'Clinical',
      icon: Activity,
      content: <AssignedTasksTab forcedPropertyId={selectedLocationId} />,
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
        <div className="rounded-2xl bg-card text-card-foreground/70 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] border border-gray-100/80">
          <TabsList className="inline-flex w-max min-w-full h-auto gap-2 justify-start bg-transparent p-0">
            <TabsTrigger
              value="care"
              className="flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-white dark:text-gray-300 dark:hover:text-white dark:hover:bg-slate-800 [&[data-active]]:!bg-[#005390] [&[data-active]]:!text-white [&[data-active]:hover]:!bg-[#005390] [&[data-active]:hover]:!text-white data-active:shadow-md focus-visible:!ring-0 transition-all cursor-pointer"
            >
              <HeartPulse className="size-4 shrink-0" />
              Care
            </TabsTrigger>
            <TabsTrigger
              value="appointments"
              className="flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-white dark:text-gray-300 dark:hover:text-white dark:hover:bg-slate-800 [&[data-active]]:!bg-[#005390] [&[data-active]]:!text-white [&[data-active]:hover]:!bg-[#005390] [&[data-active]:hover]:!text-white data-active:shadow-md focus-visible:!ring-0 transition-all cursor-pointer"
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
          <AppointmentsCalendar />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default MedicalPage
