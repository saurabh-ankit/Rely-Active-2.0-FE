import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Utensils, AlertCircle, ShieldAlert, X, User, Info } from 'lucide-react'
import api from '@/lib/api/axios'
import type { ResidentFamilyMember } from '@/lib/types'
import { notifyError, notifySuccess } from '@/utils/toast'
import { useScrollLock } from '@/hooks/useScrollLock'

interface PropertyPackage {
  id: string
  price: number
  globalPackage?: {
    name: string
    code: string
    includedMealSlots: string[]
    dietaryType: string
  }
}

interface ActiveSubscription {
  id: string
  residentId: string
  familyMemberId?: string | null
  propertyPackageId: string
  startDate: string
  allergiesNotes?: string
  propertyPackage?: PropertyPackage
}

interface ResidentFnbPackageModalProps {
  isOpen: boolean
  onClose: () => void
  residentId: string
  locId: string
  isResiding: boolean
  residentName: string
  familyMembers?: ResidentFamilyMember[]
}

export function ResidentFnbPackageModal({
  isOpen,
  onClose,
  residentId,
  locId,
  isResiding,
  residentName,
  familyMembers = [],
}: ResidentFnbPackageModalProps) {
  const [propertyPackages, setPropertyPackages] = useState<PropertyPackage[]>([])
  const [globalMealSlots, setGlobalMealSlots] = useState<Array<{ id: string; name: string; code?: string }>>([])
  const [loading, setLoading] = useState(true)

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

  // Map of personId (or 'PRIMARY') -> selected propertyPackageId and startDate
  const [selectedPackages, setSelectedPackages] = useState<Record<string, string>>({})
  const [startDates, setStartDates] = useState<Record<string, string>>({})
  const [existingSubKeys, setExistingSubKeys] = useState<Set<string>>(new Set())
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useScrollLock(isOpen)

  const handleStartDateChange = (personKey: string, date: string) => {
    setStartDates((prev) => ({
      ...prev,
      [personKey]: date,
    }))
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      let effectiveLocId = locId
      if (!effectiveLocId) {
        try {
          const resDetail = await api.get(`/residents/${residentId}`)
          const rData = resDetail.data?.data
          effectiveLocId = rData?.locId || rData?.loc_id || ''
        } catch (e) {
          console.warn('Could not fetch resident location fallback:', e)
        }
      }

      const [pkgsResult, activeSubsResult, globalSlotsResult] = await Promise.allSettled([
        effectiveLocId ? api.get(`/fnb/properties/${effectiveLocId}/packages`) : Promise.resolve(null),
        api.get(`/fnb/resident-package/${residentId}`),
        api.get('/fnb/global-meal-slots'),
      ])

      if (pkgsResult.status === 'fulfilled' && pkgsResult.value?.data?.success) {
        setPropertyPackages(pkgsResult.value.data.data || [])
      }

      if (globalSlotsResult.status === 'fulfilled' && globalSlotsResult.value?.data?.success) {
        setGlobalMealSlots(globalSlotsResult.value.data.data || [])
      }

      const pkgMap: Record<string, string> = {}
      const dateMap: Record<string, string> = {}
      const existingKeys = new Set<string>()

      if (activeSubsResult.status === 'fulfilled' && activeSubsResult.value?.data?.success) {
        const subs: ActiveSubscription[] = activeSubsResult.value.data.data || []
        subs.forEach((sub) => {
          const famId = sub.familyMemberId || (sub as unknown as Record<string, string>).family_member_id || null
          const propPkgId =
            sub.propertyPackageId || (sub as unknown as Record<string, string>).property_package_id || ''
          const sDate = sub.startDate || (sub as unknown as Record<string, string>).start_date

          if (propPkgId) {
            if (famId) {
              pkgMap[famId] = propPkgId
              existingKeys.add(famId)
              if (sDate) dateMap[famId] = sDate.split('T')[0]
            } else {
              pkgMap['PRIMARY'] = propPkgId
              existingKeys.add('PRIMARY')
              if (sDate) dateMap['PRIMARY'] = sDate.split('T')[0]
            }
          }
        })
      }

      setExistingSubKeys(existingKeys)
      setSelectedPackages(pkgMap)
      setStartDates(dateMap)
    } catch (err) {
      console.error('Failed to load resident package info:', err)
    } finally {
      setLoading(false)
    }
  }, [locId, residentId])

  useEffect(() => {
    let ignore = false
    const loadData = async () => {
      if (!ignore && isOpen) {
        await fetchData()
      }
    }
    void loadData()
    return () => {
      ignore = true
    }
  }, [isOpen, fetchData])

  const handlePackageChange = (personKey: string, propertyPackageId: string) => {
    setSelectedPackages((prev) => ({
      ...prev,
      [personKey]: propertyPackageId,
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isResiding) {
      setErrorMsg('Food package assignment is restricted to currently residing residents.')
      return
    }

    try {
      setSaving(true)
      setErrorMsg('')

      const todayStr = new Date().toISOString().split('T')[0]
      const subscriptionsPayload: Array<{
        familyMemberId: string | null
        propertyPackageId: string | null
        startDate: string
      }> = []

      // Primary Resident
      subscriptionsPayload.push({
        familyMemberId: null,
        propertyPackageId: selectedPackages['PRIMARY'] || null,
        startDate: startDates['PRIMARY'] || todayStr,
      })

      // Family Members
      familyMembers.forEach((fm) => {
        const fmId = fm.id || (fm as unknown as Record<string, string>)._id
        if (fmId) {
          subscriptionsPayload.push({
            familyMemberId: fmId,
            propertyPackageId: selectedPackages[fmId] || null,
            startDate: startDates[fmId] || todayStr,
          })
        }
      })

      const res = await api.post('/fnb/resident-package', {
        residentId,
        subscriptions: subscriptionsPayload,
      })

      if (res.data?.success) {
        notifySuccess(`Food packages updated successfully for ${residentName || 'resident'} & family members!`)
        onClose()
      } else {
        notifyError(res.data?.message || 'Failed to assign food package')
        setErrorMsg(res.data?.message || 'Failed to assign food package')
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      const finalMsg = msg || 'Server connection error'
      notifyError(finalMsg)
      setErrorMsg(finalMsg)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  // All members (Primary + Family)
  const validFamilyMembers = familyMembers.filter((fm) =>
    Boolean(fm.id || (fm as unknown as Record<string, string>)._id),
  )

  const allMembers = [
    { key: 'PRIMARY', name: residentName, relation: 'Primary Resident', isPrimary: true },
    ...validFamilyMembers.map((fm) => {
      const fmId = fm.id || (fm as unknown as Record<string, string>)._id || ''
      return {
        key: fmId,
        name: `${fm.firstName} ${fm.lastName || ''}`.trim(),
        relation: fm.relation || 'Family Member',
        isPrimary: false,
      }
    }),
  ]

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] flex flex-col justify-between my-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-[#005390]">
                <Utensils className="w-5 h-5" />
              </div>
              Assign Food Packages — {residentName}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Select monthly food packages separately for the primary resident and family members.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice for Non-Residing Resident */}
        {!isResiding ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-xs space-y-2">
            <div className="font-bold flex items-center gap-2 text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600" /> Non-Residing Resident Notice
            </div>
            <p>
              This resident is currently marked as <strong>Non-Residing (isResiding = false)</strong>. Food packages can
              only be assigned to residents currently residing at the property.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6 overflow-y-auto pr-1 flex-1">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
              </div>
            )}

            {/* Note banner explaining package changes must be made from Property F&B Settings */}
            <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/80 text-xs text-blue-900 flex items-start gap-2.5 font-medium shadow-2xs">
              <Info className="w-4.5 h-4.5 text-[#005390] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-[#005390]">Note:</span> To change or update a food package for a
                resident after it has been assigned, please do it from{' '}
                <strong className="text-[#005390]">
                  Food & Beverage (F&B) Management &gt; Property Packages & Pricing
                </strong>
                .
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Loading food packages & subscriptions...</div>
            ) : (
              <>
                {/* Person-wise Food Package Selection Table */}
                <div className="border border-gray-200/80 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-200/80 text-xs font-bold text-gray-700 uppercase tracking-wider grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-12 sm:col-span-3">Resident / Family Member</div>
                    <div className="col-span-12 sm:col-span-3">Select Food Package</div>
                    <div className="col-span-12 sm:col-span-2">Start Date</div>
                    <div className="hidden sm:block sm:col-span-2">Included Meals & Diet</div>
                    <div className="hidden sm:block sm:col-span-2 text-right">Package Price</div>
                  </div>

                  <div className="divide-y divide-gray-100 bg-white">
                    {allMembers.map((member) => {
                      const selectedPkgId = selectedPackages[member.key] || ''
                      const selectedPkg = propertyPackages.find((p) => p.id === selectedPkgId)
                      const gPkg = selectedPkg?.globalPackage
                      const isAlreadyAssigned = existingSubKeys.has(member.key)
                      const personStartDate = startDates[member.key] || new Date().toISOString().split('T')[0]

                      return (
                        <div
                          key={member.key}
                          className="p-4 grid grid-cols-12 gap-3 items-center hover:bg-gray-50/50 transition-colors"
                        >
                          {/* Member Name & Badge */}
                          <div className="col-span-12 sm:col-span-3 flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                member.isPrimary
                                  ? 'bg-[#005390] text-white'
                                  : 'bg-purple-100 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {member.isPrimary ? <User className="w-4 h-4" /> : member.name[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-xs">{member.name}</div>
                              <span
                                className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border mt-0.5 ${
                                  member.isPrimary
                                    ? 'bg-blue-50 text-[#005390] border-blue-200'
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                }`}
                              >
                                {member.relation}
                              </span>
                            </div>
                          </div>

                          {/* Food Package Dropdown */}
                          <div className="col-span-12 sm:col-span-3">
                            <select
                              disabled={isAlreadyAssigned}
                              value={selectedPkgId}
                              onChange={(e) => handlePackageChange(member.key, e.target.value)}
                              className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390] font-medium transition-all ${
                                isAlreadyAssigned
                                  ? 'bg-gray-100/90 text-gray-500 cursor-not-allowed border-gray-200 shadow-2xs'
                                  : 'bg-white text-gray-800 border-gray-200'
                              }`}
                            >
                              <option value="">-- No Package (None) --</option>
                              {propertyPackages.map((pkg) => {
                                const dietStr = pkg.globalPackage?.dietaryType
                                  ? ` (${pkg.globalPackage.dietaryType.replace('_', ' ').toUpperCase()})`
                                  : ''
                                return (
                                  <option key={pkg.id} value={pkg.id}>
                                    {pkg.globalPackage?.name || 'Package'}
                                    {dietStr}
                                  </option>
                                )
                              })}
                            </select>
                            {isAlreadyAssigned && (
                              <div className="text-[10px] font-extrabold text-amber-700 mt-1 flex items-center gap-1 uppercase tracking-wider">
                                🔒 Package Assigned
                              </div>
                            )}
                          </div>

                          {/* Start Date */}
                          <div className="col-span-12 sm:col-span-2">
                            <input
                              type="date"
                              disabled={isAlreadyAssigned}
                              value={personStartDate}
                              onChange={(e) => handleStartDateChange(member.key, e.target.value)}
                              className={`w-full px-2.5 py-1.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390] font-medium transition-all ${
                                isAlreadyAssigned
                                  ? 'bg-gray-100/90 text-gray-500 cursor-not-allowed border-gray-200 shadow-2xs'
                                  : 'bg-white text-gray-800 border-gray-200'
                              }`}
                            />
                          </div>

                          {/* Meal Slots & Diet Preview */}
                          <div className="col-span-6 sm:col-span-2 text-xs">
                            {selectedPkg ? (
                              <div className="space-y-1">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold capitalize border ${
                                    gPkg?.dietaryType && gPkg.dietaryType.toLowerCase().includes('non')
                                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                                      : gPkg?.dietaryType && gPkg.dietaryType.toLowerCase().includes('egg')
                                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  }`}
                                >
                                  {gPkg?.dietaryType ? gPkg.dietaryType.replace('_', ' ') : 'Vegetarian'}
                                </span>
                                <div className="text-[11px] text-gray-500 flex flex-wrap gap-1">
                                  {gPkg?.includedMealSlots?.map((slot) => (
                                    <span
                                      key={slot}
                                      className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-gray-200"
                                    >
                                      {getSlotDisplayName(slot)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-[11px]">No package selected</span>
                            )}
                          </div>

                          {/* Price Tag */}
                          <div className="col-span-6 sm:col-span-2 text-right">
                            {selectedPkg ? (
                              <span className="text-xs font-extrabold text-[#005390] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 inline-block">
                                ₹{Number(selectedPkg.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/mo
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 font-mono">₹0.00</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-[#005390] text-white text-xs font-bold rounded-xl hover:bg-[#004070] transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {saving ? 'Saving Subscriptions...' : 'Save Subscriptions'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
