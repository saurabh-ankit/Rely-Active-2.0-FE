import React, { useCallback, useEffect, useState } from 'react'
import { Utensils, AlertCircle, ShieldAlert, X, User } from 'lucide-react'
import api from '@/lib/api/axios'
import type { ResidentFamilyMember } from '@/lib/types'
import { notifyError, notifySuccess } from '@/utils/toast'

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
  const [loading, setLoading] = useState(true)

  // Map of personId (or 'PRIMARY') -> selected propertyPackageId
  const [selectedPackages, setSelectedPackages] = useState<Record<string, string>>({})
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [allergiesNotes, setAllergiesNotes] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [pkgsRes, activeSubsRes] = await Promise.all([
        api.get(`/fnb/properties/${locId}/packages`),
        api.get(`/fnb/resident-package/${residentId}`),
      ])

      if (pkgsRes.data?.success) {
        setPropertyPackages(pkgsRes.data.data || [])
      }

      const pkgMap: Record<string, string> = {}
      if (activeSubsRes.data?.success && Array.isArray(activeSubsRes.data.data)) {
        const subs: ActiveSubscription[] = activeSubsRes.data.data
        subs.forEach((sub) => {
          if (sub.familyMemberId) {
            pkgMap[sub.familyMemberId] = sub.propertyPackageId
          } else {
            pkgMap['PRIMARY'] = sub.propertyPackageId
          }
          if (sub.allergiesNotes) {
            setAllergiesNotes(sub.allergiesNotes)
          }
          if (sub.startDate) {
            setStartDate(sub.startDate.split('T')[0])
          }
        })
      }

      setSelectedPackages(pkgMap)
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

      const subscriptionsPayload: Array<{ familyMemberId: string | null; propertyPackageId: string | null }> = []

      // Primary Resident
      subscriptionsPayload.push({
        familyMemberId: null,
        propertyPackageId: selectedPackages['PRIMARY'] || null,
      })

      // Family Members
      familyMembers.forEach((fm) => {
        if (fm.id) {
          subscriptionsPayload.push({
            familyMemberId: fm.id,
            propertyPackageId: selectedPackages[fm.id] || null,
          })
        }
      })

      const res = await api.post('/fnb/resident-package', {
        residentId,
        startDate,
        allergiesNotes,
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
  const validFamilyMembers = familyMembers.filter((fm): fm is ResidentFamilyMember & { id: string } => Boolean(fm.id))

  const allMembers = [
    { key: 'PRIMARY', name: residentName, relation: 'Primary Resident', isPrimary: true },
    ...validFamilyMembers.map((fm) => ({
      key: fm.id,
      name: `${fm.firstName} ${fm.lastName || ''}`.trim(),
      relation: fm.relation || 'Family Member',
      isPrimary: false,
    })),
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
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

            {loading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Loading food packages & subscriptions...</div>
            ) : (
              <>
                {/* Person-wise Food Package Selection Table */}
                <div className="border border-gray-200/80 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-200/80 text-xs font-bold text-gray-700 uppercase tracking-wider grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-4 sm:col-span-3">Resident / Family Member</div>
                    <div className="col-span-8 sm:col-span-4">Select Food Package</div>
                    <div className="hidden sm:block sm:col-span-3">Included Meal Slots & Diet</div>
                    <div className="hidden sm:block sm:col-span-2 text-right">Package Price</div>
                  </div>

                  <div className="divide-y divide-gray-100 bg-white">
                    {allMembers.map((member) => {
                      const selectedPkgId = selectedPackages[member.key] || ''
                      const selectedPkg = propertyPackages.find((p) => p.id === selectedPkgId)
                      const gPkg = selectedPkg?.globalPackage

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
                          <div className="col-span-12 sm:col-span-4">
                            <select
                              value={selectedPkgId}
                              onChange={(e) => handlePackageChange(member.key, e.target.value)}
                              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390] bg-white font-medium text-gray-800"
                            >
                              <option value="">-- No Package (None) --</option>
                              {propertyPackages.map((pkg) => (
                                <option key={pkg.id} value={pkg.id}>
                                  {pkg.globalPackage?.name || 'Package'} — ₹{Number(pkg.price).toLocaleString('en-IN')}
                                  /mo
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Meal Slots & Diet Preview */}
                          <div className="col-span-6 sm:col-span-3 text-xs">
                            {selectedPkg ? (
                              <div className="space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 capitalize">
                                  {gPkg?.dietaryType ? gPkg.dietaryType.replace('_', ' ') : 'Vegetarian'}
                                </span>
                                <div className="text-[11px] text-gray-500 flex flex-wrap gap-1">
                                  {gPkg?.includedMealSlots?.map((slot) => (
                                    <span
                                      key={slot}
                                      className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-medium capitalize"
                                    >
                                      {slot}
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

                {/* Common Subscription Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label htmlFor="fnb-start-date-input" className="block text-xs font-semibold text-gray-700 mb-1">
                      Start Date <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      id="fnb-start-date-input"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390]"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="fnb-allergies-input" className="block text-xs font-semibold text-gray-700 mb-1">
                      Allergies & Special Instructions
                    </label>
                    <input
                      id="fnb-allergies-input"
                      type="text"
                      value={allergiesNotes}
                      onChange={(e) => setAllergiesNotes(e.target.value)}
                      placeholder="e.g. Peanut allergy, low sodium, lactose intolerant..."
                      className="w-full px-3.5 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390]"
                    />
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
    </div>
  )
}
