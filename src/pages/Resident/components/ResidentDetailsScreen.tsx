import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format, isValid, parseISO } from 'date-fns'
import { ArrowLeft, CalendarDays, Edit, HeartPulse, Home, Loader2, Phone, ReceiptText, User, Users } from 'lucide-react'
import type { ResidentItem } from '@/lib/types'
import { residentService } from '@/lib/services/residentService'
import { AssignCareTaskDialog } from '@/components/common/AssignCareTaskDialog'
import { AssignCareTeamDialog } from '@/components/common/AssignCareTeamDialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ResponsiveTabs, type TabItem } from '@/components/common/ResponsiveTabs'
import { HeroFact, NotAdded } from '@/components/common/DetailPanel'
import { cn, getFileUrl } from '@/lib/utils'
import { fnbService } from '@/lib/services/fnbService'
import { useResidentClinicalQuery } from '@/hooks/react-query/resident'
import { ResidentPersonalDetailsTab, type FnbSubscriptionItem } from './ResidentPersonalDetailsTab'
import { ResidentMedicalTab } from './ResidentMedicalTab'
import { ResidentConditionMenu } from './medical/ResidentConditionMenu'
import { useResourceAccess } from '@/hooks/useResourceAccess'
import { RESOURCE } from '@/lib/permissions/resourceKeys'

export interface ResidentDetailsScreenProps {
  isGlobalMode?: boolean
}

type ResidentDetailTab = 'personal' | 'medical'

export const ResidentDetailsScreen: React.FC<ResidentDetailsScreenProps> = ({ isGlobalMode = false }) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  // The two tabs are Resident sections with their own access.
  const profileAccess = useResourceAccess(RESOURCE.RESIDENT_DIRECTORY)
  const medicalAccess = useResourceAccess(RESOURCE.RESIDENT_MEDICAL)
  const canUpdateResident = profileAccess.canUpdate
  const billingAccess = useResourceAccess(RESOURCE.BILLING)
  const clinicalQuery = useResidentClinicalQuery(id)
  const currentCondition = clinicalQuery.data?.currentCondition ?? null

  const [resident, setResident] = useState<ResidentItem | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isCareTaskModalOpen, setIsCareTaskModalOpen] = useState<boolean>(false)
  const [isCareTeamModalOpen, setIsCareTeamModalOpen] = useState<boolean>(false)
  const [chosenTab, setActiveTab] = useState<ResidentDetailTab>('personal')
  const tabAccess: Record<ResidentDetailTab, boolean> = {
    personal: profileAccess.canView,
    medical: medicalAccess.canView,
  }
  const activeTab: ResidentDetailTab | null = tabAccess[chosenTab]
    ? chosenTab
    : tabAccess.personal
      ? 'personal'
      : tabAccess.medical
        ? 'medical'
        : null

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
        <Button
          variant="ghost"
          type="button"
          onClick={() => navigate(backUrl)}
          className="p-0 h-auto inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] hover:bg-transparent transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />{' '}
          {isGlobal ? 'Back to Global Resident Directory' : 'Back to Resident Directory'}
        </Button>
        <Card className="gap-0 rounded-3xl border border-white/60 bg-white/80 p-12 text-center text-sm text-gray-400 shadow-xl backdrop-blur-xl">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          Loading resident profile & family details...
        </Card>
      </div>
    )
  }

  if (error || !resident) {
    return (
      <div className="w-full space-y-6 pb-12">
        <Button
          variant="ghost"
          type="button"
          onClick={() => navigate(backUrl)}
          className="p-0 h-auto inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] hover:bg-transparent transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />{' '}
          {isGlobal ? 'Back to Global Resident Directory' : 'Back to Resident Directory'}
        </Button>
        <Card className="gap-0 rounded-3xl bg-rose-50 border border-rose-200 p-8 text-center text-xs text-rose-700 font-bold shadow-xs">
          {error || 'Resident profile not found.'}
        </Card>
      </div>
    )
  }

  const fullName = `${resident.firstName} ${resident.lastName || ''}`.trim()
  const familyMembers = resident.familyMembers || []
  // Moved into the current flat (differs from the first move-in after a flat change).
  const movedIn = resident.currentFlatMovedIn || resident.moveInDate
  // Billing is per flat: residing residents link to their flat's invoices.
  const showBilling = resident.isResiding && !!resident.unitId && billingAccess.canView

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Back Navigation */}
      <Button
        variant="ghost"
        type="button"
        onClick={() => navigate(backUrl)}
        className="p-0 h-auto inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] hover:bg-transparent transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />{' '}
        {isGlobal ? 'Back to Global Resident Directory' : 'Back to Resident Directory'}
      </Button>

      {/* Summary: who they are, where they live, and the main actions */}
      <Card className="gap-0 rounded-2xl border border-gray-100 bg-white shadow-2xs dark:border-gray-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#005390] to-sky-600 text-xl font-bold text-white shadow-sm">
              {resident.photoUrl ? (
                <img src={getFileUrl(resident.photoUrl)} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                resident.firstName[0]?.toUpperCase()
              )}
            </div>
            <div className="min-w-0 space-y-1.5">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white md:text-2xl">{fullName}</h1>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                    resident.residentType === 'OWNER'
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-purple-200 bg-purple-50 text-purple-700',
                  )}
                >
                  {resident.residentType === 'OWNER' ? 'Owner' : 'Tenant'}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                    resident.isResiding
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700',
                  )}
                >
                  <span
                    className={cn('h-1.5 w-1.5 rounded-full', resident.isResiding ? 'bg-emerald-500' : 'bg-amber-500')}
                  />
                  {resident.isResiding ? 'Residing' : 'Off-site Resident'}
                </span>
                {resident.status && resident.status !== 'ACTIVE' && (
                  <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-gray-600">
                    {resident.status.toLowerCase()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {(canUpdateResident || currentCondition || showBilling) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {clinicalQuery.isSuccess && (
                <ResidentConditionMenu
                  residentId={resident.id}
                  currentCondition={currentCondition}
                  canUpdate={canUpdateResident}
                />
              )}
              {showBilling && (
                <Button
                  variant="secondary"
                  icon={<ReceiptText className="h-4 w-4" />}
                  onClick={() => navigate(`/admin/billing-management/invoice/${resident.unitId}?tab=invoices`)}
                  className="rounded-xl"
                >
                  Go to Billing
                </Button>
              )}
              {canUpdateResident && (
                <Button
                  variant="primary"
                  icon={<Edit className="h-4 w-4" />}
                  onClick={() => navigate(editUrl)}
                  className="rounded-xl"
                >
                  Edit Profile
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-gray-100 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4 md:px-6 dark:border-gray-800">
          <HeroFact
            icon={Home}
            label="Flat"
            value={
              resident.unit?.unit_number ? (
                `Unit ${resident.unit.unit_number}${resident.property?.property_name ? ` · ${resident.property.property_name}` : ''}`
              ) : (
                <NotAdded />
              )
            }
          />
          <HeroFact
            icon={Phone}
            label="Phone"
            value={
              resident.phone ? (
                <a href={`tel:${resident.phone}`} className="hover:text-[#005390]">
                  {resident.phone}
                </a>
              ) : (
                <NotAdded />
              )
            }
          />
          <HeroFact
            icon={CalendarDays}
            label="Moved in"
            value={movedIn && isValid(parseISO(movedIn)) ? format(parseISO(movedIn), 'dd MMM yyyy') : <NotAdded />}
          />
          <HeroFact
            icon={Users}
            label="Family"
            value={
              familyMembers.length > 0 ? (
                `${familyMembers.length} member${familyMembers.length === 1 ? '' : 's'}`
              ) : (
                <span className="font-normal text-gray-400">None added</span>
              )
            }
          />
        </div>
      </Card>

      {/* Tab bar */}
      {(() => {
        const detailTabs: TabItem[] = [
          ...(tabAccess.personal
            ? [
                {
                  value: 'personal',
                  label: 'Profile',
                  shortLabel: 'Profile',
                  icon: User,
                  content: (
                    <ResidentPersonalDetailsTab
                      resident={resident}
                      fnbSubscriptions={fnbSubscriptions}
                      getSlotDisplayName={getSlotDisplayName}
                      canUpdateResident={canUpdateResident}
                      onAssignFoodPackage={() => navigate(editUrl)}
                    />
                  ),
                },
              ]
            : []),
          ...(tabAccess.medical
            ? [
                {
                  value: 'medical',
                  label: 'Medical',
                  shortLabel: 'Medical',
                  icon: HeartPulse,
                  content: (
                    <ResidentMedicalTab
                      resident={resident}
                      canUpdateResident={medicalAccess.canUpdate}
                      onAssignCareTeam={() => setIsCareTeamModalOpen(true)}
                      onAssignCareTask={() => setIsCareTaskModalOpen(true)}
                    />
                  ),
                },
              ]
            : []),
        ]

        return detailTabs.length > 0 ? (
          <ResponsiveTabs
            value={activeTab || undefined}
            onValueChange={(val) => setActiveTab(val as ResidentDetailTab)}
            tabs={detailTabs}
            className="w-full"
          />
        ) : (
          <Card className="gap-0 rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">
            You don&apos;t have access to this resident&apos;s Profile or Medical sections.
          </Card>
        )
      })()}

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
