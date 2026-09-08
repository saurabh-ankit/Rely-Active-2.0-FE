import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Activity,
  Boxes,
  Briefcase,
  Building2,
  CalendarClock,
  HeartHandshake,
  Shield,
  Stethoscope,
  Utensils,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import { useAuth } from '@/hooks/useAuth'
import { TasksTab } from '@/pages/GlobalSettings/components/TasksTab'
import { PackagesTab } from '@/pages/GlobalSettings/components/PackagesTab'

interface SettingCardItem {
  id: string
  name: string
  description: string
  link?: string
  icon: LucideIcon
}

const careAndServicesSettings: SettingCardItem[] = [
  {
    id: 'tasks',
    name: 'Care Tasks',
    description:
      'Configure and manage Care Tasks with pricing options and specifications for this property and global templates.',
    link: '/admin/settings/tasks',
    icon: HeartHandshake,
  },
  {
    id: 'packages',
    name: 'Packages',
    description:
      'Configure and manage Care Packages with bundled complimentary tasks and duration for this property and global templates.',
    link: '/admin/settings/packages',
    icon: Boxes,
  },
  {
    id: 'care-features',
    name: 'Care & Room Features',
    description: 'Manage specialized care features, assistance levels, and room amenities.',
    link: '/care-features',
    icon: HeartHandshake,
  },
]

const clinicalSettings: SettingCardItem[] = [
  {
    id: 'vitals',
    name: 'Vital Settings',
    description: 'Configure vital signs thresholds, tracking frequency, and alert parameters.',
    link: '/vitals',
    icon: Activity,
  },
  {
    id: 'lab-report',
    name: 'Lab Report Settings',
    description: 'Manage diagnostic tests, lab report categories, and normal ranges.',
    link: '/lab-report',
    icon: Stethoscope,
  },
]

const operationsSettings: SettingCardItem[] = [
  {
    id: 'fnb-settings',
    name: 'Meal Slots & Dining',
    description: 'Manage meal delivery timings and property dining packages.',
    link: '/admin/fnb-history',
    icon: Utensils,
  },
  {
    id: 'roster-settings',
    name: 'Roster Settings',
    description: 'Configure property staff shift timings, rotation patterns, and off-duty rules.',
    link: '/roster-settings',
    icon: CalendarClock,
  },
]

interface SettingsPageProps {
  initialView?: 'main' | 'tasks' | 'packages'
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ initialView = 'main' }) => {
  const navigate = useNavigate()
  const { selectedLocationName, selectedLocationId } = useLocationContext()
  const { isSuperAdmin } = useAuth()

  const handleCardClick = (item: SettingCardItem) => {
    if (item.link) {
      navigate(item.link)
    }
  }

  // ── Sub-view: Tasks Tab ───────────────────────────────────────────────────
  if (initialView === 'tasks') {
    return (
      <div className="space-y-6 pb-10">
        <button
          type="button"
          onClick={() => navigate('/admin/settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Settings
        </button>
        <TasksTab isPropertyMode={true} forcedPropertyId={selectedLocationId} />
      </div>
    )
  }

  // ── Sub-view: Packages Tab ────────────────────────────────────────────────
  if (initialView === 'packages') {
    return (
      <div className="space-y-6 pb-10">
        <button
          type="button"
          onClick={() => navigate('/admin/settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Settings
        </button>
        <PackagesTab isPropertyMode={true} forcedPropertyId={selectedLocationId} />
      </div>
    )
  }

  // ── Main Hub View: Sections and Cards (Matching Global Settings style) ─────
  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Settings</h1>
            {selectedLocationName && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                {selectedLocationName}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Configure property-level operations, Care Tasks, ADL activities, and templates for{' '}
            <strong className="text-gray-700">{selectedLocationName || 'your active property'}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 bg-white/70 border border-gray-200 shadow-2xs backdrop-blur-sm">
            <Shield className="w-3.5 h-3.5 text-[#005390]" />
            {isSuperAdmin ? 'Super Admin' : 'Property Admin'}
          </span>
        </div>
      </div>

      {/* Services Section */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <Briefcase className="h-5 w-5 text-[#005390]" />
          Services & Care
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {careAndServicesSettings.map((item) => {
            const Icon = item.icon
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => handleCardClick(item)}
                className="group w-full text-left cursor-pointer rounded-3xl border border-white/40 bg-white/70 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white hover:shadow-xl"
              >
                <div className="flex items-center space-x-3.5 mb-3">
                  <div className="rounded-2xl bg-[#005390]/10 p-3 text-[#005390] transition-colors group-hover:bg-[#005390] group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-[#005390] transition-colors">
                    {item.name}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Clinical & Health Section */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <Stethoscope className="h-5 w-5 text-[#005390]" />
          Clinical & Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clinicalSettings.map((item) => {
            const Icon = item.icon
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => handleCardClick(item)}
                className="group w-full text-left cursor-pointer rounded-3xl border border-white/40 bg-white/70 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white hover:shadow-xl"
              >
                <div className="flex items-center space-x-3.5 mb-3">
                  <div className="rounded-2xl bg-[#005390]/10 p-3 text-[#005390] transition-colors group-hover:bg-[#005390] group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-[#005390] transition-colors">
                    {item.name}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Operations & Dining Section */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <Utensils className="h-5 w-5 text-[#005390]" />
          Dining & Operations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {operationsSettings.map((item) => {
            const Icon = item.icon
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => handleCardClick(item)}
                className="group w-full text-left cursor-pointer rounded-3xl border border-white/40 bg-white/70 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white hover:shadow-xl"
              >
                <div className="flex items-center space-x-3.5 mb-3">
                  <div className="rounded-2xl bg-[#005390]/10 p-3 text-[#005390] transition-colors group-hover:bg-[#005390] group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-[#005390] transition-colors">
                    {item.name}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default SettingsPage
