import React, { useMemo } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import {
  Activity,
  Boxes,
  Building2,
  CalendarDays,
  HeartHandshake,
  HeartPulse,
  Package,
  Shield,
  Stethoscope,
} from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import { useAuth } from '@/hooks/useAuth'
import { TasksTab } from '@/pages/GlobalSettings/components/TasksTab'
import { PackagesTab } from '@/pages/GlobalSettings/components/PackagesTab'
import { SubscriptionsTab } from '@/pages/GlobalSettings/components/SubscriptionsTab'
import { AssignedTasksTab } from '@/pages/Medical/components/AssignedTasksTab'
import { AppointmentsCalendar } from '@/pages/Medical/components/appointments/AppointmentsCalendar'
import { cn } from '@/lib/utils'

export type MedicalSection = 'care' | 'appointments'
export type MedicalTab = 'tasks' | 'packages' | 'subscriptions' | 'assigned'

interface MedicalPageProps {
  initialTab?: MedicalTab
}

export const MedicalPage: React.FC<MedicalPageProps> = ({ initialTab }) => {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { selectedLocationName, selectedLocationId } = useLocationContext()
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

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 p-6 rounded-3xl border border-gray-100 shadow-sm backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-[#005390] shadow-xs">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Medical & Clinical Care</h1>
                {selectedLocationName && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    {selectedLocationName}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {activeSection === 'appointments' ? (
                  <>
                    View visiting doctor shifts and manage resident appointment bookings for{' '}
                    <strong className="text-gray-700">{selectedLocationName || 'your active property'}</strong>.
                  </>
                ) : (
                  <>
                    Configure and manage Care Tasks, Care Packages, and Resident Subscriptions for{' '}
                    <strong className="text-gray-700">{selectedLocationName || 'your active property'}</strong>.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 bg-white/70 border border-gray-200 shadow-2xs backdrop-blur-sm">
            <Shield className="w-3.5 h-3.5 text-[#005390]" />
            {isSuperAdmin ? 'Super Admin' : 'Property Admin'}
          </span>
        </div>
      </div>

      {/* Top-level: Care | Appointments */}
      <div className="flex items-center gap-2 border-b border-gray-200/80 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleSectionChange('care')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-xs shrink-0',
            activeSection === 'care'
              ? 'bg-[#005390] text-white shadow-md shadow-[#005390]/20'
              : 'bg-white/80 text-gray-600 hover:bg-white hover:text-gray-900 border border-gray-200',
          )}
        >
          <HeartPulse className="w-4 h-4" />
          Care
        </button>

        <button
          type="button"
          onClick={() => handleSectionChange('appointments')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-xs shrink-0',
            activeSection === 'appointments'
              ? 'bg-[#005390] text-white shadow-md shadow-[#005390]/20'
              : 'bg-white/80 text-gray-600 hover:bg-white hover:text-gray-900 border border-gray-200',
          )}
        >
          <CalendarDays className="w-4 h-4" />
          Appointments
        </button>
      </div>

      {activeSection === 'care' && (
        <>
          {/* Care subtabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => handleTabChange('tasks')}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-xs shrink-0',
                activeTab === 'tasks'
                  ? 'bg-[#005390] text-white shadow-md shadow-[#005390]/20'
                  : 'bg-white/80 text-gray-600 hover:bg-white hover:text-gray-900 border border-gray-200',
              )}
            >
              <HeartHandshake className="w-4 h-4" />
              Care Tasks
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('packages')}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-xs shrink-0',
                activeTab === 'packages'
                  ? 'bg-[#005390] text-white shadow-md shadow-[#005390]/20'
                  : 'bg-white/80 text-gray-600 hover:bg-white hover:text-gray-900 border border-gray-200',
              )}
            >
              <Boxes className="w-4 h-4" />
              Care Packages
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('subscriptions')}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-xs shrink-0',
                activeTab === 'subscriptions'
                  ? 'bg-[#005390] text-white shadow-md shadow-[#005390]/20'
                  : 'bg-white/80 text-gray-600 hover:bg-white hover:text-gray-900 border border-gray-200',
              )}
            >
              <Package className="w-4 h-4" />
              Package Subscriptions
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('assigned')}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-xs shrink-0',
                activeTab === 'assigned'
                  ? 'bg-[#005390] text-white shadow-md shadow-[#005390]/20'
                  : 'bg-white/80 text-gray-600 hover:bg-white hover:text-gray-900 border border-gray-200',
              )}
            >
              <Activity className="w-4 h-4" />
              Clinical Care Tasks
            </button>
          </div>

          <div className="pt-2">
            {activeTab === 'tasks' && <TasksTab isPropertyMode={true} forcedPropertyId={selectedLocationId} />}

            {activeTab === 'packages' && <PackagesTab isPropertyMode={true} forcedPropertyId={selectedLocationId} />}

            {activeTab === 'subscriptions' && (
              <SubscriptionsTab isPropertyMode={true} forcedPropertyId={selectedLocationId} />
            )}

            {activeTab === 'assigned' && <AssignedTasksTab forcedPropertyId={selectedLocationId} />}
          </div>
        </>
      )}

      {activeSection === 'appointments' && (
        <div className="pt-2">
          <AppointmentsCalendar />
        </div>
      )}
    </div>
  )
}

export default MedicalPage
