import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Boxes, Briefcase, Building2, HeartHandshake, Package, Shield } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import { useAuth } from '@/hooks/useAuth'
import { TasksTab } from '@/pages/GlobalSettings/components/TasksTab'
import { PackagesTab } from '@/pages/GlobalSettings/components/PackagesTab'
import { SubscriptionsTab } from '@/pages/GlobalSettings/components/SubscriptionsTab'
import { cn } from '@/lib/utils'

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
]

interface SettingsPageProps {
  initialView?: 'main' | 'tasks' | 'packages' | 'subscriptions'
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ initialView = 'main' }) => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
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

  // ── Sub-view: Packages & Subscriptions Tab ────────────────────────────────
  if (initialView === 'packages' || initialView === 'subscriptions') {
    const tabParam = searchParams.get('tab')
    const activeTab = tabParam === 'subscriptions' || initialView === 'subscriptions' ? 'subscriptions' : 'packages'

    return (
      <div className="space-y-6 pb-10">
        <button
          type="button"
          onClick={() => navigate('/admin/settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Settings
        </button>

        {/* Tab switchers matching Screenshot 1 & 2 */}
        <div className="flex items-center gap-2 border-b border-gray-200/80 pb-3">
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-xs',
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
            onClick={() => setSearchParams({ tab: 'subscriptions' })}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-xs',
              activeTab === 'subscriptions'
                ? 'bg-[#005390] text-white shadow-md shadow-[#005390]/20'
                : 'bg-white/80 text-gray-600 hover:bg-white hover:text-gray-900 border border-gray-200',
            )}
          >
            <Package className="w-4 h-4" />
            Package Subscriptions
          </button>
        </div>

        {activeTab === 'subscriptions' ? (
          <SubscriptionsTab isPropertyMode={true} forcedPropertyId={selectedLocationId} />
        ) : (
          <PackagesTab isPropertyMode={true} forcedPropertyId={selectedLocationId} />
        )}
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
    </div>
  )
}

export default SettingsPage
