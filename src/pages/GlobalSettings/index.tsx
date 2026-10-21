import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Activity,
  Boxes,
  Briefcase,
  Building2,
  CalendarDays,
  FlaskConical,
  HeartHandshake,
  Home,
  Package,
  Receipt,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
  Utensils,
  Settings2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AdminUserManagement } from './components/AdminUserManagement'
import { ResidentListScreen } from '../Resident/components/ResidentListScreen'
import { OnboardResidentScreen } from '../Resident/components/OnboardResidentScreen'
import { ResidentDetailsScreen } from '../Resident/components/ResidentDetailsScreen'
import { EmployeeDetailsScreen } from '../Employees/components/EmployeeDetailsScreen'
import { FnbGlobalPackagesTab } from './components/FnbGlobalPackagesTab'
import { FnbDishesMasterTab } from './components/FnbDishesMasterTab'
import FnbGlobalMealSlotsTab from './components/FnbGlobalMealSlotsTab'
import { GlobalServicesTab } from './components/GlobalServicesTab'
import { SpecializationsTab } from './components/SpecializationsTab'
import { VitalsTab } from './components/VitalsTab'
import { LabTestsTab } from './components/LabTestsTab'
import { TasksTab } from './components/TasksTab'
import { PackagesTab } from './components/PackagesTab'
import { GstTaxSettingsTab } from './components/GstTaxSettingsTab'
import { AmenitiesTab } from './components/AmenitiesTab'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'

interface SettingItem {
  id: string
  name: string
  description: string
  link?: string
  icon: LucideIcon
}

interface SettingGroup {
  id: string
  title: string
  description: string
  icon: LucideIcon
  items: SettingItem[]
}

/** Settings grouped by area. */
const SETTING_GROUPS: SettingGroup[] = [
  {
    id: 'organization',
    title: 'Organization Settings',
    description: 'Your company and the properties it runs.',
    icon: Building2,
    items: [
      {
        id: 'company',
        name: 'Company Profile',
        description: 'Company details, tax and GST info, bank details and accountant signatures.',
        link: '/company',
        icon: Building2,
      },
      {
        id: 'property',
        name: 'Properties & Locations',
        description: 'Properties, their blocks, floors and units, and location tokens.',
        link: '/property',
        icon: Home,
      },
      {
        id: 'amenities',
        name: 'Amenities Catalog',
        description: 'Global amenities used by properties.',
        link: '/global-settings/amenities',
        icon: Sparkles,
      },
    ],
  },
  {
    id: 'access',
    title: 'User & Access Settings',
    description: 'Who can sign in, where, and what they can do.',
    icon: ShieldCheck,
    items: [
      {
        id: 'user-management',
        name: 'Employee Directory & Permissions',
        description: 'Employee profiles, assigned properties, and module access permissions.',
        icon: UserCheck,
        link: '/global-settings/users',
      },
      {
        id: 'resident-directory',
        name: 'Resident Directory',
        description: 'Resident profiles, flat occupancy, and app credentials across all properties.',
        icon: Home,
        link: '/global-settings/residents',
      },
    ],
  },
  {
    id: 'medical',
    title: 'Medical Settings',
    description: 'Doctors, clinical records and care offered to residents.',
    icon: Stethoscope,
    items: [
      {
        id: 'specializations',
        name: 'Doctor Specializations',
        description: 'Specializations used when assigning doctors to residents and booking appointment slots.',
        icon: Stethoscope,
        link: '/global-settings/specializations',
      },
      {
        id: 'vitals',
        name: 'Vitals',
        description: 'Vitals with units, icons and normal ranges for resident monitoring.',
        icon: Activity,
        link: '/global-settings/vitals',
      },
      {
        id: 'lab-tests',
        name: 'Lab Tests',
        description: 'Lab test types with icons and special instructions.',
        icon: FlaskConical,
        link: '/global-settings/lab-tests',
      },
      {
        id: 'tasks',
        name: 'Care Tasks',
        description: 'Care tasks with pricing options and specifications.',
        icon: HeartHandshake,
        link: '/global-settings/tasks',
      },
      {
        id: 'packages',
        name: 'Care Packages',
        description: 'Care packages with bundled complimentary tasks, pricing and duration.',
        icon: Boxes,
        link: '/global-settings/packages',
      },
    ],
  },
  {
    id: 'fnb',
    title: 'Food & Beverage Settings',
    description: 'Meal timings, food packages and dishes shared by all properties.',
    icon: Utensils,
    items: [
      {
        id: 'fnb-meal-slots',
        name: 'Meal Slots & Timings',
        description: 'Regular and special meal slots (timings, prices) and the properties they apply to.',
        icon: Utensils,
        link: '/global-settings/fnb-meal-slots',
      },
      {
        id: 'fnb-packages',
        name: 'Food Packages',
        description: 'Food package templates and the meal slots they include.',
        icon: Boxes,
        link: '/global-settings/fnb-packages',
      },
      {
        id: 'fnb-dishes',
        name: 'Dish Catalogue',
        description: 'Dishes, categories, dietary tags and base prices.',
        icon: Utensils,
        link: '/global-settings/fnb-dishes',
      },
    ],
  },
  {
    id: 'events',
    title: 'Event Settings',
    description: 'Services that can be added to community events.',
    icon: CalendarDays,
    items: [
      {
        id: 'global-services',
        name: 'Event Services',
        description: 'Service templates for events, with base pricing and property assignments.',
        icon: Briefcase,
        link: '/global-settings/global-services',
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory Settings',
    description: 'Inventory master data shared by all properties.',
    icon: Package,
    items: [
      {
        id: 'inventory',
        name: 'Inventory Masters',
        description: 'Inventory categories, vendors, items and which properties use them.',
        link: '/global-settings/inventory',
        icon: Package,
      },
    ],
  },
  {
    id: 'finance',
    title: 'Finance & Tax Settings',
    description: 'Tax rules applied to billing.',
    icon: Receipt,
    items: [
      {
        id: 'gst-tax',
        name: 'GST & Tax',
        description: 'GST slabs, CGST/SGST split, and the company GSTIN.',
        link: '/global-settings/tax',
        icon: Receipt,
      },
    ],
  },
]

const groupsById = (...ids: string[]) =>
  ids.map((id) => SETTING_GROUPS.find((g) => g.id === id)).filter((g): g is SettingGroup => !!g)

/** The page's main headings, each holding one or more groups. */
const SETTING_SECTIONS: Array<{
  id: string
  title: string
  description: string
  icon: LucideIcon
  groups: SettingGroup[]
}> = [
  {
    id: 'access',
    title: 'User & Access Settings',
    description: 'Who can sign in, where, and what they can do.',
    icon: ShieldCheck,
    groups: groupsById('access'),
  },
  {
    id: 'operations',
    title: 'Operations Settings',
    description: 'Services run at the properties: medical care, food, events and inventory.',
    icon: Briefcase,
    groups: groupsById('medical', 'fnb', 'events', 'inventory'),
  },
  {
    id: 'system',
    title: 'System Settings',
    description: 'Company, properties and tax setup used across the whole system.',
    icon: Settings2,
    groups: groupsById('organization', 'finance'),
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
    | 'view-user'
    | 'fnb-meal-slots'
    | 'fnb-packages'
    | 'fnb-dishes'
    | 'global-services'
    | 'specializations'
    | 'vitals'
    | 'lab-tests'
    | 'tasks'
    | 'packages'
    | 'gst-tax'
    | 'amenities'
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

  if (activeView === 'view-user') {
    return <EmployeeDetailsScreen isGlobalMode={true} />
  }

  if (activeView === 'fnb-meal-slots') {
    return (
      <div className="space-y-6 pb-10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/global-settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </Button>
        <FnbGlobalMealSlotsTab />
      </div>
    )
  }

  if (activeView === 'fnb-packages') {
    return (
      <div className="space-y-6 pb-10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/global-settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </Button>
        <FnbGlobalPackagesTab />
      </div>
    )
  }

  if (activeView === 'fnb-dishes') {
    return (
      <div className="space-y-6 pb-10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/global-settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </Button>
        <FnbDishesMasterTab />
      </div>
    )
  }

  if (activeView === 'specializations') {
    return (
      <div className="space-y-6 pb-10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/global-settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </Button>
        <SpecializationsTab />
      </div>
    )
  }

  if (activeView === 'vitals') {
    return (
      <div className="space-y-6 pb-10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/global-settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </Button>
        <VitalsTab />
      </div>
    )
  }

  if (activeView === 'lab-tests') {
    return (
      <div className="space-y-6 pb-10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/global-settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </Button>
        <LabTestsTab />
      </div>
    )
  }

  if (activeView === 'global-services') {
    return (
      <div className="space-y-6 pb-10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/global-settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </Button>
        <GlobalServicesTab />
      </div>
    )
  }

  if (activeView === 'tasks') {
    return (
      <div className="space-y-6 pb-10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/global-settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </Button>
        <TasksTab />
      </div>
    )
  }

  if (activeView === 'packages') {
    return (
      <div className="space-y-6 pb-10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/global-settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </Button>
        <PackagesTab />
      </div>
    )
  }

  if (activeView === 'gst-tax') {
    return (
      <div className="space-y-6 pb-10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/global-settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </Button>
        <GstTaxSettingsTab />
      </div>
    )
  }

  if (activeView === 'amenities') {
    return (
      <div className="space-y-6 pb-10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/global-settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </Button>
        <AmenitiesTab />
      </div>
    )
  }

  if (activeView === 'residents') {
    return (
      <div className="space-y-6 pb-10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/global-settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </Button>
        <ResidentListScreen isGlobalMode={true} />
      </div>
    )
  }

  if (activeView === 'users') {
    return (
      <div className="space-y-6 pb-10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/global-settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Global Settings
        </Button>
        <AdminUserManagement initialMode="list" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        icon={Settings2}
        title="Global Settings"
        description="User access, operations settings (medical, food, events, inventory) and system settings (company, properties, tax) shared by every property."
      />

      {SETTING_SECTIONS.map((section) => {
        const SectionIcon = section.icon
        // A main heading with a single group shows its cards directly, without a sub-heading.
        const showGroupHeadings = section.groups.length > 1
        const settingCount = section.groups.reduce((n, g) => n + g.items.length, 0)
        return (
          <section key={section.id} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            {/* Main heading */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#005390] to-[#0a6bb3] px-6 py-5 text-white">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                  <SectionIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{section.title}</h2>
                  <p className="mt-0.5 text-sm text-white/80">{section.description}</p>
                </div>
              </div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25">
                {settingCount} setting{settingCount === 1 ? '' : 's'}
              </span>
            </div>

            {/* Groups */}
            <div className="space-y-6 bg-slate-50/60 p-6">
              {section.groups.map((group) => {
                const GroupIcon = group.icon
                return (
                  <div key={group.id} className="space-y-3">
                    {showGroupHeadings && (
                      <div className="flex items-center gap-3">
                        <GroupIcon className="h-4 w-4 shrink-0 text-[#005390]" />
                        <h3 className="shrink-0 text-xs font-bold uppercase tracking-wider text-gray-700">
                          {group.title}
                        </h3>
                        <span className="hidden text-xs text-gray-400 sm:inline">— {group.description}</span>
                        <span className="h-px flex-1 bg-gray-200" />
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {group.items.map((item) => {
                        const Icon = item.icon
                        return (
                          <Button
                            type="button"
                            variant="ghost"
                            key={item.id}
                            onClick={() => handleCardClick(item)}
                            className="group w-full h-auto text-left block justify-start cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#005390]/30 hover:shadow-md whitespace-normal"
                          >
                            <div className="flex items-center space-x-3.5 mb-2.5">
                              <div className="rounded-xl bg-[#005390]/10 p-2.5 text-[#005390] transition-colors group-hover:bg-[#005390] group-hover:text-white">
                                <Icon className="h-5 w-5" />
                              </div>
                              <h4 className="text-[15px] font-semibold text-gray-900 group-hover:text-[#005390] transition-colors">
                                {item.name}
                              </h4>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
