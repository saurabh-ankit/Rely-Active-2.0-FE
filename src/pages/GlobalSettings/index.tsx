import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, ShieldCheck, UserCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AdminUserManagement } from './components/AdminUserManagement'

interface SettingItem {
  id: string
  name: string
  description: string
  link?: string
  icon: LucideIcon
  color: 'blue' | 'emerald' | 'indigo' | 'amber'
  view?: 'users'
}

const systemSettings: SettingItem[] = [
  {
    id: 'company',
    name: 'Company Profile',
    description: 'Manage core company profile, tax GST info, bank & accountant signatures',
    link: '/company',
    icon: Building2,
    color: 'emerald',
  },
  {
    id: 'property',
    name: 'Properties & Locations',
    description: 'Manage facility locations, property units, and location tokens',
    link: '/property',
    icon: Building2,
    color: 'emerald',
  },
]

const accessSettings: SettingItem[] = [
  {
    id: 'user-management',
    name: 'User Management',
    description:
      'Create platform users, staff members, assign roles, property location scopes, and manage module permissions.',
    icon: UserCheck,
    color: 'blue',
    view: 'users',
  },
]

export default function GlobalSettingsPage() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState<'main' | 'users'>('main')

  const handleCardClick = (item: SettingItem) => {
    if (item.link) {
      navigate(item.link)
    } else if (item.view) {
      setActiveView(item.view)
    }
  }

  if (activeView === 'users') {
    return (
      <div className="space-y-6 pb-10">
        <button
          onClick={() => setActiveView('main')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </button>
        <AdminUserManagement />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Global Settings</h1>
        <p className="text-sm text-gray-500">
          Manage core organization profile, property locations, user roles, and RBAC module authorization.
        </p>
      </div>

      {/* Access Control & Permission Management */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          Access Control & Permissions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accessSettings.map((item) => {
            const Icon = item.icon
            return (
              <button
                type="button"
                key={item.id}
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

      {/* System Settings Grid */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <Building2 className="h-5 w-5 text-emerald-600" />
          Organization & Locations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systemSettings.map((item) => {
            const Icon = item.icon
            return (
              <button
                type="button"
                key={item.id}
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
    </div>
  )
}
