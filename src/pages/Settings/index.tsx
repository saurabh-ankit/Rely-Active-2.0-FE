import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, Shield, Stethoscope } from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import { useAuth } from '@/hooks/useAuth'

interface SettingsPageProps {
  initialView?: 'main' | 'tasks' | 'packages' | 'subscriptions'
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ initialView = 'main' }) => {
  const navigate = useNavigate()
  const { selectedLocationName } = useLocationContext()
  const { isSuperAdmin } = useAuth()

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
            Configure property-level operations and templates for{' '}
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

      {/* Re-directed Modules Notice Card */}
      <div className="rounded-3xl border border-white/50 bg-white/80 p-6 shadow-md backdrop-blur-xl space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-50 text-[#005390] shrink-0 shadow-xs">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div className="space-y-1 flex-1">
            <h2 className="text-lg font-bold text-gray-900">Medical & Clinical Care Management</h2>
            <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">
              Care Tasks, Care Packages, and Resident Subscriptions have been moved from Settings to the dedicated{' '}
              <strong className="text-gray-800 font-semibold">Medical</strong> module in the sidebar.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/admin/medical')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#005390] hover:bg-[#004170] shadow-md shadow-[#005390]/20 transition-all cursor-pointer"
              >
                Go to Medical Module
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
