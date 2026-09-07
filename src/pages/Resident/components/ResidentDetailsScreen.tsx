import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  HeartPulse,
  Home,
  KeyRound,
  Mail,
  Phone,
  RefreshCw,
  UserCheck,
  Users,
  Utensils,
} from 'lucide-react'
import type { ResidentItem } from '@/lib/types'
import { residentService } from '@/lib/services/residentService'
import { Button } from '@/components/ui/button'
import { ResidentFnbPackageModal } from './ResidentFnbPackageModal'
import { getFileUrl } from '@/lib/utils'

import api from '@/lib/api/axios'

interface FnbSubscriptionItem {
  id: string
  residentId: string
  familyMemberId?: string | null
  propertyPackageId: string
  startDate: string
  endDate?: string | null
  dietaryPreference?: string
  allergiesNotes?: string
  status: string
  propertyPackage?: {
    id: string
    price: number
    globalPackage?: {
      name: string
      code: string
      dietaryType: string
      includedMealSlots: string[]
    }
  }
  familyMember?: {
    id: string
    firstName: string
    lastName?: string
    relation?: string
  }
}

export interface ResidentDetailsScreenProps {
  isGlobalMode?: boolean
}

export const ResidentDetailsScreen: React.FC<ResidentDetailsScreenProps> = ({ isGlobalMode = false }) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [resident, setResident] = useState<ResidentItem | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isFnbModalOpen, setIsFnbModalOpen] = useState<boolean>(false)

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
      const [res, slotsRes] = await Promise.all([
        api.get(`/fnb/resident-package/${resId}`),
        api.get('/fnb/global-meal-slots').catch(() => ({ data: { success: false } })),
      ])
      if (slotsRes.data?.success) {
        setGlobalMealSlots(slotsRes.data.data || [])
      }
      if (res.data?.success && Array.isArray(res.data.data)) {
        setFnbSubscriptions(res.data.data)
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
  const unit = resident.unit
  const floor = unit?.floor
  const floorNum = floor?.floor_number
  const floorLabel =
    floor?.floor_name || (floorNum ? (floorNum === 1 ? 'Ground Floor' : `Floor ${floorNum}`) : 'Main Level')
  const unitNumber = unit?.unit_number ? `Unit ${unit.unit_number}` : 'Unassigned Flat'
  const propertyName = resident.property?.property_name || resident.property?.name || 'Property Location'
  const familyMembers = resident.familyMembers || []

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── Top Back Navigation Button ───────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => navigate(backUrl)}
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />{' '}
        {isGlobal ? 'Back to Global Resident Directory' : 'Back to Resident Directory'}
      </button>

      {/* ── Hero Profile Card ─────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-white/70 bg-white/90 p-6 md:p-8 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar / Photo */}
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
              {/* Type Badge */}
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  resident.residentType === 'OWNER'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                }`}
              >
                {resident.residentType === 'OWNER' ? 'Property Owner' : 'Tenant Occupant'}
              </span>

              {/* Residing Status Badge */}
              {resident.isResiding ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Physically Residing
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                  Off-site Landlord
                </span>
              )}

              {/* Active Status Badge */}
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                {resident.status}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          {resident.isResiding && (
            <Button
              variant="secondary"
              icon={<Utensils className="w-4 h-4" />}
              onClick={() => setIsFnbModalOpen(true)}
              className="rounded-xl"
            >
              Assign Food Package
            </Button>
          )}

          <Button
            variant="primary"
            icon={<Edit className="w-4 h-4" />}
            onClick={() => navigate(editUrl)}
            className="rounded-xl"
          >
            Edit Resident Profile
          </Button>
        </div>
      </div>

      {/* ── Primary Resident Active Food Package Summary Bar (ABOVE) ───────────── */}
      {(() => {
        const primarySub = fnbSubscriptions.find((s) => !s.familyMemberId && (!s.familyMember || !s.familyMember.id))
        const pkg = primarySub?.propertyPackage
        const gPkg = pkg?.globalPackage
        const isNonVeg = gPkg?.dietaryType === 'non_veg' || gPkg?.dietaryType === 'NON_VEG'
        const isEgg = gPkg?.dietaryType === 'egg' || gPkg?.dietaryType === 'EGG'

        return (
          <div className="rounded-3xl border border-[#005390]/20 bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-white p-5 shadow-lg backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-3 rounded-2xl bg-[#005390] text-white shadow-xs shrink-0">
                <Utensils className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase text-gray-400 tracking-wider">
                    Primary Resident Food Package:
                  </span>
                  {primarySub && pkg ? (
                    <span className="text-sm font-extrabold text-gray-900">{gPkg?.name || 'Assigned Package'}</span>
                  ) : (
                    <span className="text-xs font-semibold text-gray-400 italic">No package assigned</span>
                  )}

                  {primarySub && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {primarySub.status || 'Active'}
                    </span>
                  )}
                </div>

                {primarySub && pkg ? (
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize border ${
                        isNonVeg
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : isEgg
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {gPkg?.dietaryType ? gPkg.dietaryType.replace('_', ' ') : 'Vegetarian'}
                    </span>

                    {gPkg?.includedMealSlots && gPkg.includedMealSlots.length > 0 && (
                      <>
                        <span className="text-gray-300">•</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 font-semibold">Meals Included:</span>
                          {gPkg.includedMealSlots.map((slot) => (
                            <span
                              key={slot}
                              className="bg-white text-gray-700 border border-gray-200 px-1.5 py-0.5 rounded text-[10px] font-bold"
                            >
                              {getSlotDisplayName(slot)}
                            </span>
                          ))}
                        </div>
                      </>
                    )}

                    <span className="text-gray-300">•</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      Started: {primarySub.startDate ? primarySub.startDate.split('T')[0] : 'N/A'}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400">
                    Assign a monthly dining plan for {fullName} using the Manage Food Package button above.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              {primarySub && pkg && (
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Monthly Rate</span>
                  <span className="text-sm font-black text-[#005390] bg-white px-3 py-1 rounded-xl border border-blue-200 shadow-2xs inline-block">
                    ₹{Number(pkg.price).toLocaleString('en-IN')}/mo
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Main Details Grid (2 Columns) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Section 1: Property & Flat Mapping ───────────────────────────────── */}
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
            <Home className="w-5 h-5 text-[#005390]" />
            Property & Flat Unit Mapping
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Property Location</span>
              <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-xs">
                <Building2 className="w-3.5 h-3.5 text-[#005390]" />
                {propertyName}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Floor & Unit #</span>
              <span className="font-bold text-gray-900 dark:text-white text-xs">
                {floorLabel} — {unitNumber}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Unit Layout Type</span>
              <span className="font-bold text-gray-900 dark:text-white text-xs">{unit?.unit_type || 'N/A'}</span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Occupancy Status</span>
              <span className="font-bold text-blue-700 dark:text-blue-400 text-xs">
                {unit?.occupancyStatus || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Section 2: Personal Profile Details ──────────────────────────────── */}
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
            <UserCheck className="w-5 h-5 text-[#005390]" />
            Personal Profile Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Gender</span>
              <span className="font-bold text-gray-900 dark:text-white text-xs">{resident.gender || 'N/A'}</span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Date of Birth</span>
              <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-[#005390]" />
                {resident.dob || 'N/A'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Blood Group</span>
              <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 text-xs">
                <HeartPulse className="w-3.5 h-3.5" />
                {resident.bloodGroup || 'N/A'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Move-In Date</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5" />
                {resident.moveInDate || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Section 3: Contact & App Credentials ─────────────────────────────── */}
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-4 md:col-span-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
            <KeyRound className="w-5 h-5 text-[#005390]" />
            Contact & Mobile Credentials
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Mobile Phone</span>
              <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-xs">
                <Phone className="w-3.5 h-3.5 text-[#005390]" />
                {resident.phone || 'N/A'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Email Address</span>
              <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-xs truncate">
                <Mail className="w-3.5 h-3.5 text-[#005390] shrink-0" />
                <span className="truncate">{resident.email || 'N/A'}</span>
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Emergency Contact</span>
              <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 text-xs">
                <Phone className="w-3.5 h-3.5" />
                {resident.emergencyContact || 'N/A'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Mobile Handle</span>
              <span className="font-mono font-bold text-[#005390] text-xs">
                {resident.username ? `(${resident.username})` : 'Not Configured'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Section 4: Family Members Directory Card ─────────────────────────── */}
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-4 md:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#005390]" />
              Registered Family Members
            </h2>
            <span className="text-xs font-bold text-[#005390] bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
              {familyMembers.length} Family Member(s)
            </span>
          </div>

          {familyMembers.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              No family members registered for this resident profile.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {familyMembers.map((fm) => {
                const fmName = `${fm.firstName} ${fm.lastName || ''}`.trim()
                return (
                  <div
                    key={fm.id || fm.firstName}
                    className="p-4 bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl border border-gray-200/80 dark:border-gray-700 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#005390]/10 text-[#005390] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-gray-200">
                          {fm.photoUrl ? (
                            <img src={getFileUrl(fm.photoUrl)} alt={fmName} className="w-full h-full object-cover" />
                          ) : (
                            fm.firstName[0]?.toUpperCase()
                          )}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-gray-900 dark:text-white">{fmName}</h3>
                          <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                            {fm.relation || 'Relative'}
                          </span>
                        </div>
                      </div>

                      {resident.isResiding || fm.isResiding ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Residing
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Off-site
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
                      <div>
                        <span className="text-gray-400 font-semibold block text-[9px] uppercase">Gender</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{fm.gender || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-semibold block text-[9px] uppercase">DOB</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{fm.dob || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-semibold block text-[9px] uppercase">Phone</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{fm.phone || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-semibold block text-[9px] uppercase">Email</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 truncate block">
                          {fm.email || 'N/A'}
                        </span>
                      </div>
                      {fm.bloodGroup && (
                        <div>
                          <span className="text-gray-400 font-semibold block text-[9px] uppercase">Blood Group</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">{fm.bloodGroup}</span>
                        </div>
                      )}
                      {fm.username && (
                        <div>
                          <span className="text-gray-400 font-semibold block text-[9px] uppercase">Mobile Handle</span>
                          <span className="font-mono font-bold text-[#005390]">({fm.username})</span>
                        </div>
                      )}
                    </div>

                    {/* Family Member Food Package Block */}
                    {(() => {
                      const fmSub = fnbSubscriptions.find(
                        (s) => s.familyMemberId === fm.id || s.familyMember?.id === fm.id,
                      )
                      const pkg = fmSub?.propertyPackage
                      const gPkg = pkg?.globalPackage
                      const isNonVeg = gPkg?.dietaryType === 'non_veg' || gPkg?.dietaryType === 'NON_VEG'
                      const isEgg = gPkg?.dietaryType === 'egg' || gPkg?.dietaryType === 'EGG'

                      return (
                        <div className="mt-3 pt-2.5 border-t border-purple-100/80 space-y-1.5 bg-purple-50/40 p-2.5 rounded-xl border border-purple-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Utensils className="w-3.5 h-3.5 text-purple-700" />
                              <span className="text-[10px] font-extrabold uppercase text-purple-900 tracking-wider">
                                Food Package:
                              </span>
                              {fmSub && pkg ? (
                                <span className="text-xs font-bold text-gray-900">
                                  {gPkg?.name || 'Assigned Package'}
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-gray-400 italic">No package assigned</span>
                              )}
                            </div>

                            {fmSub && pkg && (
                              <span className="text-xs font-extrabold text-[#005390] bg-white px-2 py-0.5 rounded border border-blue-200">
                                ₹{Number(pkg.price).toLocaleString('en-IN')}/mo
                              </span>
                            )}
                          </div>

                          {fmSub && pkg && (
                            <div className="flex items-center gap-2 flex-wrap text-[11px]">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold capitalize border ${
                                  isNonVeg
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : isEgg
                                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                }`}
                              >
                                {gPkg?.dietaryType ? gPkg.dietaryType.replace('_', ' ') : 'Vegetarian'}
                              </span>

                              {gPkg?.includedMealSlots && gPkg.includedMealSlots.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-[9px] text-gray-400 font-semibold">Included:</span>
                                  {gPkg.includedMealSlots.map((slot) => (
                                    <span
                                      key={slot}
                                      className="bg-white text-gray-700 border border-gray-200 px-1.5 py-0.2 rounded text-[9px] font-bold"
                                    >
                                      {getSlotDisplayName(slot)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

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
    </div>
  )
}

export default ResidentDetailsScreen
