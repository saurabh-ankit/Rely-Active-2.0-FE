import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  CalendarRange,
  ClipboardList,
  Clock,
  Coins,
  FileText,
  FlaskConical,
  HandHeart,
  Home,
  Mail,
  MessageSquare,
  Package,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface SettingItem {
  name: string
  description: string
  link: string
  icon: LucideIcon
}

const medicalSettings: SettingItem[] = [
  {
    name: 'ADL / Personal Care Tasks',
    description: 'Manage master ADL templates, create and configure ADL for resident assignments',
    link: '/personal-care-tasks',
    icon: ClipboardList,
  },
  {
    name: 'Vital Settings',
    description: 'Configure vital thresholds and monitoring parameters across care facilities',
    link: '/vitals',
    icon: Settings,
  },
  {
    name: 'Lab Report Settings',
    description: 'Manage lab report templates, test codes, and clinical parameters',
    link: '/lab-report',
    icon: FlaskConical,
  },
]

const operationSettings: SettingItem[] = [
  {
    name: 'Care Tasks',
    description: 'Manage system-wide care tasks and care package features',
    link: '/care-features',
    icon: Package,
  },
  {
    name: 'Room Features',
    description: 'Configure room amenities, unit types, and facility features',
    link: '/room-features',
    icon: Home,
  },
  {
    name: 'Employees Directory',
    description: 'Manage global employee directory and staff shift policies',
    link: '/admin/employees',
    icon: HandHeart,
  },
  {
    name: 'Global Residents',
    description: 'Search and manage discharged and active residents across locations',
    link: '/admin/residents',
    icon: Users,
  },
  {
    name: 'Inventory Master',
    description: 'Manage global stock levels, item categories, and supplier items',
    link: '/admin/inventory/home',
    icon: Package,
  },
  {
    name: 'Feedback Forms',
    description: 'Manage feedback templates, rating triggers, and survey questions',
    link: '/feedback',
    icon: ClipboardList,
  },
  {
    name: 'Resident Document Templates',
    description: 'Manage document templates required for resident onboarding',
    link: '/document-templates',
    icon: FileText,
  },
  {
    name: 'Resident Consent Templates',
    description: 'Manage consent form templates, waivers, and legal documents',
    link: '/consent-templates',
    icon: ShieldCheck,
  },
  {
    name: 'Resident Daily Routine Templates',
    description: 'Configure daily routine field requirements and task schedules',
    link: '/daily-routines',
    icon: Clock,
  },
  {
    name: 'WhatsApp Manager',
    description: 'Manage automated notifications and WhatsApp messaging logs',
    link: '/whatsapp',
    icon: MessageSquare,
  },
  {
    name: 'Roster Settings',
    description: 'Configure shift access control buffers, pre-shift and post-shift entry windows',
    link: '/roster-settings',
    icon: CalendarRange,
  },
]

const systemSettings: SettingItem[] = [
  {
    name: 'Company Profile',
    description: 'Manage core company profile, tax GST info, bank & accountant signatures',
    link: '/company',
    icon: Building2,
  },
  {
    name: 'Properties & Locations',
    description: 'Manage facility locations, property units, and location tokens',
    link: '/locations',
    icon: Building2,
  },
  {
    name: 'Device Permissions',
    description: 'Manage and control mobile device access, approvals, and sync tokens',
    link: '/device-permissions',
    icon: Smartphone,
  },
  {
    name: 'Email Configuration',
    description: 'Configure system SMTP email credentials, templates, and logger',
    link: '/email-config',
    icon: Mail,
  },
  {
    name: 'Token & License Management',
    description: 'Monitor document processing usage, quota, and organization limits',
    link: '/tokens',
    icon: Coins,
  },
]

export default function GlobalSettingsPage() {
  const navigate = useNavigate()
  const [selectedSetting, setSelectedSetting] = useState<SettingItem | null>(null)

  const handleCardClick = (item: SettingItem) => {
    if (
      item.link === '/company' ||
      item.link === '/admin/employees' ||
      item.link === '/admin/residents' ||
      item.link === '/admin/inventory/home'
    ) {
      navigate(item.link)
    } else {
      setSelectedSetting(item)
    }
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Global Settings</h1>
        <p className="text-sm text-gray-500">
          Manage global application settings, medical parameters, operation templates, and system configuration.
        </p>
      </div>

      {/* Section 1: Medical Settings */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <Settings className="h-5 w-5 text-indigo-600" />
          Medical Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medicalSettings.map((item) => {
            const Icon = item.icon
            return (
              <button
                type="button"
                key={item.name}
                onClick={() => handleCardClick(item)}
                className="group w-full text-left cursor-pointer rounded-3xl border border-white/40 bg-white/70 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white hover:shadow-xl"
              >
                <div className="flex items-center space-x-3.5 mb-3">
                  <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {item.name}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Section 2: Operation Settings */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <ClipboardList className="h-5 w-5 text-indigo-600" />
          Operation Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {operationSettings.map((item) => {
            const Icon = item.icon
            return (
              <button
                type="button"
                key={item.name}
                onClick={() => handleCardClick(item)}
                className="group w-full text-left cursor-pointer rounded-3xl border border-white/40 bg-white/70 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white hover:shadow-xl"
              >
                <div className="flex items-center space-x-3.5 mb-3">
                  <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {item.name}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Section 3: System Settings */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <Building2 className="h-5 w-5 text-indigo-600" />
          System Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemSettings.map((item) => {
            const Icon = item.icon
            return (
              <button
                type="button"
                key={item.name}
                onClick={() => handleCardClick(item)}
                className="group w-full text-left cursor-pointer rounded-3xl border border-white/40 bg-white/70 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white hover:shadow-xl"
              >
                <div className="flex items-center space-x-3.5 mb-3">
                  <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                    {item.name}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Setting Details Modal */}
      {selectedSetting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/30 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <selectedSetting.icon className="h-6 w-6 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-900">{selectedSetting.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSetting(null)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4 text-xs text-gray-600">
              <p className="text-sm">{selectedSetting.description}</p>
              <div className="rounded-2xl bg-indigo-50/70 p-4">
                <p className="font-semibold text-indigo-900">Configuration Active</p>
                <p className="mt-1 text-gray-600">
                  Global parameters for {selectedSetting.name} are active across all community locations.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSetting(null)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
