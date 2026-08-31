import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Home, ShieldCheck, UserCheck, Utensils } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AdminUserManagement } from './components/AdminUserManagement'
import { ResidentListScreen } from '../Resident/components/ResidentListScreen'
import { OnboardResidentScreen } from '../Resident/components/OnboardResidentScreen'
import { ResidentDetailsScreen } from '../Resident/components/ResidentDetailsScreen'
import { FnbGlobalPackagesTab } from './components/FnbGlobalPackagesTab'
import { FnbDishesMasterTab } from './components/FnbDishesMasterTab'

interface SettingItem {
  id: string
  name: string
  description: string
  link?: string
  icon: LucideIcon
}

const systemSettings: SettingItem[] = [
  {
    id: 'company',
    name: 'Company Profile',
    description: 'Manage core company profile, tax GST info, bank & accountant signatures',
    link: '/company',
    icon: Building2,
  },
  {
    id: 'property',
    name: 'Properties & Locations',
    description: 'Manage facility locations, property units, and location tokens',
    link: '/property',
    icon: Building2,
  },
]

const accessSettings: SettingItem[] = [
  {
    id: 'user-management',
    name: 'Employee Directory',
    description: 'Manage employee profiles, assigned properties, and module access permissions.',
    icon: UserCheck,
    link: '/global-settings/users',
  },
  {
    id: 'resident-directory',
    name: 'Residents Directory',
    description: 'View and manage resident profiles, flat occupancy, and credentials across all properties.',
    icon: Home,
    link: '/global-settings/residents',
  },
]

const fnbSettings: SettingItem[] = [
  {
    id: 'fnb-packages',
    name: 'Food Package Templates',
    description: 'Create and configure global food package templates with meal slot inclusions.',
    icon: Utensils,
    link: '/global-settings/fnb-packages',
  },
  {
    id: 'fnb-dishes',
    name: 'Master Dish Catalogue',
    description: 'Manage global food dishes, categories, dietary tags, and base prices.',
    icon: Utensils,
    link: '/global-settings/fnb-dishes',
  },
]

interface GlobalSettingsPageProps {
  initialView?:
    | 'main'
    | 'users'
    | 'create-user'
    | 'edit-user'
    | 'permissions'
    | 'residents'
    | 'edit-resident'
    | 'view-resident'
    | 'fnb-packages'
    | 'fnb-dishes'
}

export default function GlobalSettingsPage({ initialView = 'main' }: GlobalSettingsPageProps) {
  const navigate = useNavigate()
  const activeView = initialView

  const handleCardClick = (item: SettingItem) => {
    if (item.link) {
      navigate(item.link)
    }
  }

  if (activeView === 'create-user') {
    return <AdminUserManagement initialMode="create" />
  }

  if (activeView === 'edit-user') {
    return <AdminUserManagement initialMode="edit" />
  }

  if (activeView === 'permissions') {
    return <AdminUserManagement initialMode="permissions" />
  }

  if (activeView === 'edit-resident') {
    return <OnboardResidentScreen isEditMode={true} isGlobalMode={true} />
  }

  if (activeView === 'view-resident') {
    return <ResidentDetailsScreen isGlobalMode={true} />
  }

  if (activeView === 'fnb-packages') {
    return (
      <div className="space-y-6 pb-10">
        <button
          type="button"
          onClick={() => navigate('/global-settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </button>
        <FnbGlobalPackagesTab />
      </div>
    )
  }

  if (activeView === 'fnb-dishes') {
    return (
      <div className="space-y-6 pb-10">
        <button
          type="button"
          onClick={() => navigate('/global-settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </button>
        <FnbDishesMasterTab />
      </div>
    )
  }

  if (activeView === 'residents') {
    return (
      <div className="space-y-6 pb-10">
        <button
          type="button"
          onClick={() => navigate('/global-settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </button>
        <ResidentListScreen isGlobalMode={true} />
      </div>
    )
  }

  if (activeView === 'users') {
    return (
      <div className="space-y-6 pb-10">
        <button
          type="button"
          onClick={() => navigate('/global-settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </button>
        <AdminUserManagement initialMode="list" />
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
          <ShieldCheck className="h-5 w-5 text-[#005390]" />
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

      {/* Food & Beverages Section */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <Utensils className="h-5 w-5 text-[#005390]" />
          Food & Beverages
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fnbSettings.map((item) => {
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

      {/* System Settings Grid */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <Building2 className="h-5 w-5 text-[#005390]" />
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
