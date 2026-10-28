import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format, isValid, parseISO } from 'date-fns'
import { CalendarDays, Home, Pencil, Phone, ReceiptText, Users } from 'lucide-react'
import type { ResidentItem } from '@/lib/types'
import { residentService } from '@/lib/services/residentService'
import { AssignCareTaskDialog } from '@/components/common/AssignCareTaskDialog'
import { AssignCareTeamDialog } from '@/components/common/AssignCareTeamDialog'
import { Card } from '@/components/ui/card'
import PageLoader from '@/components/shared/PageLoader'
import { BackButton } from '@/components/common/BackButton'
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

export const ResidentDetailsScreen: React.FC<ResidentDetailsScreenProps> = ({ isGlobalMode = false }) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
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
  const tabAccess = {
    personal: profileAccess.canView,
    medical: medicalAccess.canView,
  }

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
  const billingUrl = isGlobal ? `/global-settings/residents/billing/${id}` : `/admin/residents/billing/${id}`

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
    return <PageLoader isVisible={true} message="Loading..." />
  }

  if (error || !resident) {
    return (
      <div className="w-full space-y-4 pb-12">
        <BackButton onClick={() => navigate(backUrl)}>
          {isGlobal ? 'Back to Global Resident Directory' : 'Back to Resident Directory'}
        </BackButton>
        <Card className="gap-0 rounded-3xl bg-rose-50 border border-rose-200 p-8 text-center text-xs text-rose-700 font-bold shadow-xs">
          {error || 'Resident profile not found.'}
        </Card>
      </div>
    )
  }

  const fullName = `${resident.firstName} ${resident.lastName || ''}`.trim()
  const familyMembers = resident.familyMembers || []
  // Billing is per flat: residing residents link to their flat's invoices.
  const showBilling = resident.isResiding && !!resident.unitId && billingAccess.canView
  // Care teams are for residents living here, managed by those who can edit medical care.
  const canAssignCareTeam = resident.isResiding && medicalAccess.canUpdate

  // Flat / Room display: e.g. "Unit A-13 · Dhara of Life Senior living"
  const unitDisplay = resident.unit?.unit_number
    ? `Unit ${resident.unit.unit_number}${resident.property?.property_name ? ` · ${resident.property.property_name}` : ''}`
    : 'Not assigned'

  // Moved in / Admission Date display: e.g. "26 Oct 2026"
  let admissionDateDisplay = 'Not recorded'
  const admissionDateRaw =
    resident.currentFlatMovedIn ||
    resident.moveInDate ||
    (resident as unknown as { carePackageStartDate?: string | null })?.carePackageStartDate ||
    resident.createdAt
  if (admissionDateRaw) {
    const admDate = parseISO(admissionDateRaw)
    if (isValid(admDate)) {
      admissionDateDisplay = format(admDate, 'dd MMM yyyy')
    }
  }

  // Primary Diagnosis display: e.g. "Diabetic"
  const primaryDiagnosisDisplay =
    (resident as unknown as { primaryDiagnosis?: string })?.primaryDiagnosis ||
    (resident as unknown as { diagnosis?: string })?.diagnosis ||
    (resident as unknown as { medicalCondition?: string })?.medicalCondition ||
    currentCondition?.note ||
    'Diabetic'

  return (
    <div className="w-full space-y-4 pb-16">
      {/* Top Back Navigation Pill */}
      <div>
        <BackButton onClick={() => navigate(backUrl)}>
          {isGlobal ? 'Back to Global Resident Directory' : 'Back to Resident Directory'}
        </BackButton>
      </div>

      {/* Hero Summary Card: Avatar, Name, Owner/Residing Badges, Header Buttons, and Metadata Details */}
      <Card className="gap-0 rounded-2xl border border-gray-100 bg-white shadow-2xs dark:border-gray-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
          {/* Avatar + Name + Badges */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#005390] to-sky-600 text-xl font-bold text-white shadow-sm">
              {resident.photoUrl ? (
                <img src={getFileUrl(resident.photoUrl)} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                resident.firstName[0]?.toUpperCase()
              )}
            </div>

            <div className="min-w-0 space-y-1.5">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight dark:text-white">{fullName}</h1>
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Owner / Tenant */}
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

                {/* Residing / Off-site */}
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

                {/* Optional Status */}
                {resident.status && resident.status !== 'ACTIVE' && (
                  <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-gray-600">
                    {resident.status.toLowerCase()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Header Action Buttons (all with pill styling and smooth hover) */}
          {(canUpdateResident || currentCondition || showBilling || canAssignCareTeam) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {clinicalQuery.isSuccess && (
                <ResidentConditionMenu
                  residentId={resident.id}
                  currentCondition={currentCondition}
                  canUpdate={canUpdateResident}
                  variant="pill"
                />
              )}

              {canAssignCareTeam && (
                <button
                  type="button"
                  onClick={() => setIsCareTeamModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-800 shadow-2xs hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 hover:shadow-xs transition-all duration-150 cursor-pointer active:scale-[0.98]"
                >
                  <Users className="h-3.5 w-3.5 text-gray-600" />
                  <span>Assign Care Team & View</span>
                </button>
              )}

              {showBilling && (
                <button
                  type="button"
                  onClick={() =>
                    resident.unitId
                      ? navigate(`/admin/billing-management/invoice/${resident.unitId}?tab=invoices`)
                      : navigate(billingUrl)
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-800 shadow-2xs hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 hover:shadow-xs transition-all duration-150 cursor-pointer active:scale-[0.98]"
                >
                  <ReceiptText className="h-3.5 w-3.5 text-gray-600" />
                  <span>Go to Billing</span>
                </button>
              )}

              {canUpdateResident && (
                <button
                  type="button"
                  onClick={() => navigate(editUrl)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-800 shadow-2xs hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 hover:shadow-xs transition-all duration-150 cursor-pointer active:scale-[0.98]"
                >
                  <Pencil className="h-3.5 w-3.5 text-gray-600" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Metadata Details Row (all items from screenshot and previous data) */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-gray-100 px-5 py-3.5 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400 md:px-6">
          {/* Flat */}
          <div className="inline-flex items-center gap-1.5">
            <Home className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span>Flat:</span>
            <span className="font-semibold text-[#005390] dark:text-sky-400">{unitDisplay}</span>
          </div>

          {/* Phone */}
          {resident.phone ? (
            <div className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span>Phone:</span>
              <a
                href={`tel:${resident.phone}`}
                className="font-semibold text-[#005390] hover:underline dark:text-sky-400"
              >
                {resident.phone}
              </a>
            </div>
          ) : null}

          {/* Moved in */}
          <div className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span>Moved in:</span>
            <span className="font-semibold text-[#005390] dark:text-sky-400 inline-flex items-center gap-1">
              {admissionDateDisplay}
            </span>
          </div>

          {/* Family */}
          <div className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span>Family:</span>
            <span className="font-semibold text-[#005390] dark:text-sky-400">
              {familyMembers.length > 0
                ? `${familyMembers.length} member${familyMembers.length === 1 ? '' : 's'}`
                : 'None added'}
            </span>
          </div>

          {/* Primary Diagnosis */}
          <div className="inline-flex items-center gap-1">
            <span>Primary Diagnosis:</span>
            <span className="font-semibold text-[#005390] dark:text-sky-400 capitalize">{primaryDiagnosisDisplay}</span>
          </div>
        </div>
      </Card>

      {/* Resident Sidebar Navigation & Content */}
      {tabAccess.personal || tabAccess.medical ? (
        <ResidentMedicalTab
          resident={resident}
          canUpdateResident={medicalAccess.canUpdate}
          canViewMedical={tabAccess.medical}
          showOverviewTab={tabAccess.personal}
          overviewContent={
            <ResidentPersonalDetailsTab
              resident={resident}
              fnbSubscriptions={fnbSubscriptions}
              getSlotDisplayName={getSlotDisplayName}
              canUpdateResident={canUpdateResident}
              onAssignFoodPackage={() => navigate(editUrl)}
            />
          }
          onAssignCareTask={() => setIsCareTaskModalOpen(true)}
        />
      ) : (
        <Card className="gap-0 rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">
          You don&apos;t have access to this resident&apos;s Profile or Medical sections.
        </Card>
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
