import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ClipboardList, Megaphone, Settings as SettingsIcon, Shield } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLocation } from '@/hooks/useLocation'
import { PageHeader } from '@/components/common/PageHeader'

interface SettingsCard {
  title: string
  description: string
  icon: LucideIcon
  href: string
  resourceKey: string
}

const SETTINGS_CARDS: SettingsCard[] = [
  {
    title: 'Feedback',
    description: 'Create feedback forms and send them to residents, employees or both.',
    icon: ClipboardList,
    href: '/admin/settings/feedback',
    resourceKey: 'SETTINGS',
  },
  {
    title: 'Advertisements',
    description: 'Upload advertisements shown to residents of this property.',
    icon: Megaphone,
    href: '/admin/settings/advertisements',
    resourceKey: 'SETTINGS',
  },
]

interface SettingsPageProps {
  initialView?: 'main' | 'tasks' | 'packages' | 'subscriptions'
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ initialView = 'main' }) => {
  const navigate = useNavigate()
  const { isSuperAdmin } = useAuth()
  const { hasResourcePermission } = useLocation()
  const visibleCards = SETTINGS_CARDS.filter((card) => hasResourcePermission(card.resourceKey, 'view'))

  // If accessed with legacy sub-views, redirect directly to the new Medical module
  useEffect(() => {
    if (initialView === 'tasks') {
      navigate('/admin/medical?tab=tasks', { replace: true })
    } else if (initialView === 'packages') {
      navigate('/admin/medical?tab=packages', { replace: true })
    } else if (initialView === 'subscriptions') {
      navigate('/admin/medical?tab=subscriptions', { replace: true })
    }
  }, [initialView, navigate])

  if (initialView !== 'main') {
    return null
  }

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        description="Configure property-level operations and templates."
        actions={
          <>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 bg-white/70 border border-gray-200 shadow-2xs backdrop-blur-sm">
              <Shield className="w-3.5 h-3.5 text-[#005390]" />
              {isSuperAdmin ? 'Super Admin' : 'Property Admin'}
            </span>
          </>
        }
      />

      {visibleCards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCards.map(({ title, description, icon: Icon, href }) => (
            <button
              key={title}
              type="button"
              onClick={() => navigate(href)}
              className="group flex items-start gap-4 rounded-3xl border border-white/50 bg-white/80 p-6 text-left shadow-md backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
            >
              <div className="p-3.5 rounded-2xl bg-blue-50 text-[#005390] shrink-0 shadow-xs">
                <Icon className="w-7 h-7" />
              </div>
              <div className="flex-1 space-y-1">
                <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
              <ArrowRight className="w-5 h-5 shrink-0 self-center text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-[#005390]" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SettingsPage
