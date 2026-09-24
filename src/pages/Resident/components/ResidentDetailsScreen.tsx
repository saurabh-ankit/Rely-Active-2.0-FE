import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, HeartPulse, RefreshCw, User } from 'lucide-react'
import type { ResidentItem } from '@/lib/types'
import { residentService } from '@/lib/services/residentService'
import { ResidentFnbPackageModal } from './ResidentFnbPackageModal'
import { useLocationContext } from '@/hooks/useLocation'
import { AssignCareTaskDialog } from '@/components/common/AssignCareTaskDialog'
import { AssignCareTeamDialog } from '@/components/common/AssignCareTeamDialog'
import { getFileUrl } from '@/lib/utils'
import { fnbService } from '@/lib/services/fnbService'
import { ResidentPersonalDetailsTab, type FnbSubscriptionItem } from './ResidentPersonalDetailsTab'
import { ResidentMedicalTab } from './ResidentMedicalTab'

export interface ResidentDetailsScreenProps {
  isGlobalMode?: boolean
}

type ResidentDetailTab = 'personal' | 'medical'

export const ResidentDetailsScreen: React.FC<ResidentDetailsScreenProps> = ({ isGlobalMode = false }) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { hasResourcePermission } = useLocationContext()
  const canUpdateResident = hasResourcePermission('RESIDENT', 'update')

  const [resident, setResident] = useState<ResidentItem | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isFnbModalOpen, setIsFnbModalOpen] = useState<boolean>(false)
  const [isCareTaskModalOpen, setIsCareTaskModalOpen] = useState<boolean>(false)
  const [isCareTeamModalOpen, setIsCareTeamModalOpen] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<ResidentDetailTab>('personal')

  const [fnbSubscriptions, setFnbSubscriptions] = useState<FnbSubscriptionItem[]>([])
  const [globalMealSlots, setGlobalMealSlots] = useState<Array<{ id: string; name: string; code?: string }>>([])

  const getSlotDisplayName = (slot: string): string => {
    if (!slot) return ''
    const slotLower = slot.toLowerCase()
    if (slotLower === 'breakfast') return 'Break Fast'
    if (slotLower === 'lunch') return 'Lunch'
    if (slotLower === 'snacks') return 'Evening Snacks'
    if (slotLower === 'dinner') return 'Dinner'

    const matchedGlobalSlot = globalMealSlots.find(
      (ms) =>
        ms.id === slot ||
        (ms.code && ms.code.toLowerCase() === slotLower) ||
        (ms.name && ms.name.toLowerCase() === slotLower),
    )
    if (matchedGlobalSlot) return matchedGlobalSlot.name

    return slot
  }

  const isGlobal = isGlobalMode || window.location.pathname.includes('/global-settings')
  const backUrl = isGlobal ? '/global-settings/residents' : '/admin/residents'
  const editUrl = isGlobal ? `/global-settings/residents/edit/${id}` : `/admin/residents/edit/${id}`

  const fetchFnbSubscriptions = async (resId: string) => {
    if (!resId) return
    try {
      const [subs, slots] = await Promise.all([
        fnbService.getResidentPackage(resId),
        fnbService.getGlobalMealSlots().catch(() => []),
      ])
      if (Array.isArray(slots) && slots.length > 0) {
        setGlobalMealSlots(slots)
      }
      if (Array.isArray(subs)) {
        setFnbSubscriptions(subs as unknown as FnbSubscriptionItem[])
      } else {
        setFnbSubscriptions([])
      }
    } catch (e) {
      console.error('Failed to fetch F&B subscriptions for resident details:', e)
      setFnbSubscriptions([])
    }
  }

  useEffect(() => {
    let active = true

    const loadResidentDetails = async () => {
      if (!id) return
      setIsLoading(true)
      setError(null)
      try {
        const data = await residentService.getResidentById(id)
        if (active) {
          setResident(data)
          if (data?.id) {
            void fetchFnbSubscriptions(data.id)
          }
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Failed to load resident profile'
          setError(msg)
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadResidentDetails()

    return () => {
      active = false
    }
  }, [id])

  if (isLoading) {
    return (
      <div className="w-full space-y-6 pb-12">
        <button
          type="button"
          onClick={() => navigate(backUrl)}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />{' '}
          {isGlobal ? 'Back to Global Resident Directory' : 'Back to Resident Directory'}
        </button>
        <div className="rounded-3xl border border-white/60 bg-white/80 p-12 text-center text-sm text-gray-400 shadow-xl backdrop-blur-xl">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#005390]" />
          Loading resident profile & family details...
        </div>
      </div>
    )
  }

  if (error || !resident) {
    return (
      <div className="w-full space-y-6 pb-12">
        <button
          type="button"
          onClick={() => navigate(backUrl)}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />{' '}
          {isGlobal ? 'Back to Global Resident Directory' : 'Back to Resident Directory'}
        </button>
        <div className="rounded-3xl bg-rose-50 border border-rose-200 p-8 text-center text-xs text-rose-700 font-bold shadow-xs">
          {error || 'Resident profile not found.'}
        </div>
      </div>
    )
  }

  const fullName = `${resident.firstName} ${resident.lastName || ''}`.trim()
  const familyMembers = resident.familyMembers || []

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Back Navigation */}
      <button
        type="button"
        onClick={() => navigate(backUrl)}
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />{' '}
        {isGlobal ? 'Back to Global Resident Directory' : 'Back to Resident Directory'}
      </button>

      {/* Shared Hero Profile Card */}
      <div className="rounded-3xl border border-white/70 bg-white/90 p-6 md:p-8 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#005390] to-sky-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0 border-2 border-white overflow-hidden">
            {resident.photoUrl ? (
              <img src={getFileUrl(resident.photoUrl)} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              resident.firstName[0]?.toUpperCase()
            )}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">{fullName}</h1>
              {resident.username && (
                <span className="text-xs font-mono font-bold text-[#005390] bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                  ({resident.username})
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  resident.residentType === 'OWNER'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                }`}
              >
                {resident.residentType === 'OWNER' ? 'Property Owner' : 'Tenant Occupant'}
              </span>

              {resident.isResiding ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Physically Residing
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                  Off-site Landlord
                </span>
              )}

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                {resident.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 space-x-6 text-sm font-semibold text-gray-500 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'personal' ? 'border-[#005390] text-[#005390]' : 'border-transparent hover:text-gray-800'
          }`}
        >
          <User className="w-4 h-4" /> Personal Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('medical')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'medical' ? 'border-[#005390] text-[#005390]' : 'border-transparent hover:text-gray-800'
          }`}
        >
          <HeartPulse className="w-4 h-4 text-rose-500" /> Medical
        </button>
      </div>

      {activeTab === 'personal' && (
        <ResidentPersonalDetailsTab
          resident={resident}
          fnbSubscriptions={fnbSubscriptions}
          getSlotDisplayName={getSlotDisplayName}
          canUpdateResident={canUpdateResident}
          onAssignFoodPackage={() => setIsFnbModalOpen(true)}
          onEditProfile={() => navigate(editUrl)}
        />
      )}

      {activeTab === 'medical' && (
        <ResidentMedicalTab
          resident={resident}
          canUpdateResident={canUpdateResident}
          onAssignCareTeam={() => setIsCareTeamModalOpen(true)}
          onAssignCareTask={() => setIsCareTaskModalOpen(true)}
        />
      )}

      {/* F&B Package Modal */}
      {resident && (
        <ResidentFnbPackageModal
          isOpen={isFnbModalOpen}
          onClose={() => {
            setIsFnbModalOpen(false)
            if (resident.id) {
              void fetchFnbSubscriptions(resident.id)
            }
          }}
          residentId={resident.id}
          locId={resident.locId || (resident as unknown as Record<string, string>).loc_id || ''}
          isResiding={resident.isResiding}
          residentName={fullName}
          familyMembers={familyMembers}
        />
      )}

      {/* Assign Care Task Modal */}
      {resident && (
        <AssignCareTaskDialog
          open={isCareTaskModalOpen}
          onOpenChange={setIsCareTaskModalOpen}
          initialResidentId={resident.id}
          initialPropertyId={resident.locId || (resident as unknown as Record<string, string>).loc_id || null}
        />
      )}

      {/* Assign Care Team Modal */}
      {resident && (
        <AssignCareTeamDialog
          open={isCareTeamModalOpen}
          onOpenChange={setIsCareTeamModalOpen}
          residentId={resident.id}
          residentName={fullName}
          propertyId={resident.locId || (resident as unknown as Record<string, string>).loc_id || null}
        />
      )}
    </div>
  )
}

export default ResidentDetailsScreen
