import React, { useCallback, useEffect, useState } from 'react'
import {
  Utensils,
  ChevronDown,
  ChevronRight,
  Edit2,
  Users,
  AlertCircle,
  X,
  Save,
  Phone,
  Pause,
  Play,
  RefreshCw,
} from 'lucide-react'
import api from '@/lib/api/axios'
import { notifyError, notifySuccess } from '@/utils/toast'

interface GlobalPackage {
  id: string
  name: string
  code: string
  dietaryType: string
  includedMealSlots: string[]
}

interface OptedResidentSub {
  id: string
  residentId: string
  familyMemberId?: string | null
  startDate: string
  endDate?: string | null
  dietaryPreference: string
  allergiesNotes?: string
  status: string
  propertyPackageId: string
  propertyPackage?: {
    id: string
    price: number
    globalPackage?: {
      name: string
      code: string
    }
  }
  resident?: {
    id: string
    firstName: string
    lastName?: string
    phone?: string
    email?: string
    residentType?: string
    isResiding?: boolean
    unit?: {
      id: string
      unit_number: string
      floor?: {
        id: string
        floor_number?: number
        floor_name?: string
        block?: {
          id: string
          block_name?: string
        }
      }
    }
  }
  familyMember?: {
    id: string
    firstName: string
    lastName?: string
    relation?: string
    phone?: string
  }
}

interface PropertyPackage {
  id: string
  globalPackageId: string
  price: number
  isActive: boolean
  hasOptedResidents?: boolean
  optedCount?: number
  optedResidents?: OptedResidentSub[]
  globalPackage?: GlobalPackage
}

interface FnbPropertySettingsScreenProps {
  locId: string
}

const getDietBadgeStyle = (dietType?: string) => {
  if (!dietType) return 'bg-gray-100 text-gray-700 border-gray-200'
  const lower = dietType.toLowerCase()
  if (lower.includes('non')) {
    return 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
  }
  if (lower.includes('veg')) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-100'
  }
  return 'bg-blue-50 text-[#005390] border-blue-100'
}

export function FnbPropertySettingsScreen({ locId }: FnbPropertySettingsScreenProps) {
  const [globalPackages, setGlobalPackages] = useState<GlobalPackage[]>([])
  const [propertyPackages, setPropertyPackages] = useState<PropertyPackage[]>([])
  const [loading, setLoading] = useState(true)

  // Accordion State: Track expanded package ID
  const [expandedPkgId, setExpandedPkgId] = useState<string | null>(null)

  // Edit Pricing Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingGlobalPkg, setEditingGlobalPkg] = useState<GlobalPackage | null>(null)
  const [editPrice, setEditPrice] = useState<number | string>(0)
  const [editHasOpted, setEditHasOpted] = useState(false)
  const [saving, setSaving] = useState(false)

  // Pause / Resume State
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Change Package Modal State
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false)
  const [changingSub, setChangingSub] = useState<OptedResidentSub | null>(null)
  const [newPropertyPkgId, setNewPropertyPkgId] = useState<string>('')
  const [changeStartDate, setChangeStartDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [changeNotes, setChangeNotes] = useState<string>('')
  const [changingPackage, setChangingPackage] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [gRes, pRes] = await Promise.all([
        api.get('/fnb/global-packages'),
        api.get(`/fnb/properties/${locId}/packages`),
      ])

      if (gRes.data?.success) setGlobalPackages(gRes.data.data || [])
      if (pRes.data?.success) setPropertyPackages(pRes.data.data || [])
    } catch (err) {
      console.error('Failed to load property F&B settings:', err)
    } finally {
      setLoading(false)
    }
  }, [locId])

  useEffect(() => {
    let ignore = false
    const loadData = async () => {
      if (!ignore) {
        await fetchData()
      }
    }
    void loadData()
    return () => {
      ignore = true
    }
  }, [fetchData])

  const toggleAccordion = (gPkgId: string) => {
    setExpandedPkgId((prev) => (prev === gPkgId ? null : gPkgId))
  }

  const handleOpenEditModal = (gPkg: GlobalPackage, assigned?: PropertyPackage) => {
    if (assigned && (assigned.optedCount || 0) > 0) {
      notifyError('Pricing editing is disabled because residents are currently opted into this package.')
      return
    }
    setEditingGlobalPkg(gPkg)
    setEditPrice(assigned ? assigned.price : 0)
    setEditHasOpted(assigned?.hasOptedResidents || false)
    setIsEditModalOpen(true)
  }

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingGlobalPkg) return

    try {
      setSaving(true)
      const res = await api.post('/fnb/property-packages', {
        locId,
        globalPackageId: editingGlobalPkg.id,
        price: Number(editPrice) || 0,
        isActive: true,
      })

      if (res.data?.success) {
        notifySuccess(`Monthly pricing saved for ${editingGlobalPkg.name}!`)
        setIsEditModalOpen(false)
        fetchData()
      } else {
        notifyError(res.data?.message || 'Failed to save property package pricing')
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      notifyError(msg || 'Failed to save property package pricing')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePause = async (sub: OptedResidentSub) => {
    try {
      setActionLoading(sub.id)
      const res = await api.patch(`/fnb/resident-package/${sub.id}/toggle-pause`)
      if (res.data?.success) {
        notifySuccess(res.data.message || 'Subscription status updated')
        fetchData()
      } else {
        notifyError(res.data?.message || 'Failed to update subscription status')
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      notifyError(msg || 'Failed to update subscription status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleOpenChangeModal = (sub: OptedResidentSub) => {
    setChangingSub(sub)
    setNewPropertyPkgId(sub.propertyPackageId || '')
    setChangeStartDate(new Date().toISOString().split('T')[0])
    setChangeNotes(sub.allergiesNotes || '')
    setIsChangeModalOpen(true)
  }

  const handleSaveChangePackage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!changingSub || !newPropertyPkgId) return

    try {
      setChangingPackage(true)
      const res = await api.post('/fnb/resident-package/change', {
        subscriptionId: changingSub.id,
        newPropertyPackageId: newPropertyPkgId,
        startDate: changeStartDate,
        allergiesNotes: changeNotes,
      })

      if (res.data?.success) {
        notifySuccess('Package changed successfully!')
        setIsChangeModalOpen(false)
        fetchData()
      } else {
        notifyError(res.data?.message || 'Failed to change package')
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      notifyError(msg || 'Failed to change package')
    } finally {
      setChangingPackage(false)
    }
  }

  if (loading) return <div className="p-12 text-center text-gray-400">Loading Property Food Packages...</div>

  // Stats calculation
  const totalGlobalCount = globalPackages.length
  const totalOptedCount = propertyPackages.reduce((acc, p) => acc + (p.optedCount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-[#005390]" /> Property Food Packages & Pricing
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Configure monthly package rates for this location and view subscribed resident breakdowns in expandable
            rows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-200 text-xs">
            <span className="text-gray-400 font-semibold uppercase block text-[10px]">Total Pacakges</span>
            <span className="font-bold text-gray-800">{totalGlobalCount} Packages</span>
          </div>
          <div className="bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-100 text-xs">
            <span className="text-emerald-700/70 font-semibold uppercase block text-[10px]">Opted Residents</span>
            <span className="font-bold text-emerald-800">{totalOptedCount} Subscribed</span>
          </div>
        </div>
      </div>

      {/* Packages Table View */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {globalPackages.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No global package templates available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 uppercase tracking-wider font-bold text-[11px]">
                  <th className="py-3.5 px-4 w-10"></th>
                  <th className="py-3.5 px-4">Package Name</th>
                  <th className="py-3.5 px-4">Dietary Type</th>
                  <th className="py-3.5 px-4">Included Meal Slots</th>
                  <th className="py-3.5 px-4">Monthly Price</th>
                  <th className="py-3.5 px-4 text-center">Opted Residents</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {globalPackages.map((gPkg) => {
                  const assigned = propertyPackages.find((p) => p.globalPackageId === gPkg.id)
                  const isExpanded = expandedPkgId === gPkg.id
                  const optedSubs = assigned?.optedResidents || []
                  const optedCount = assigned?.optedCount || 0
                  const isOpted = optedCount > 0

                  return (
                    <React.Fragment key={gPkg.id}>
                      {/* Main Table Row */}
                      <tr
                        className={`transition-colors cursor-pointer hover:bg-blue-50/30 ${
                          isExpanded ? 'bg-blue-50/40' : ''
                        }`}
                        onClick={() => toggleAccordion(gPkg.id)}
                      >
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleAccordion(gPkg.id)
                            }}
                            className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#005390]" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <span>{gPkg.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-gray-100 text-gray-600 border border-gray-200">
                              {gPkg.code}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full font-semibold capitalize border inline-block ${getDietBadgeStyle(gPkg.dietaryType)}`}
                          >
                            {gPkg.dietaryType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {gPkg.includedMealSlots?.map((slot) => (
                              <span
                                key={slot}
                                className="px-2.5 py-1 bg-blue-50 text-[#005390] rounded-lg text-[11px] font-semibold capitalize border border-blue-100"
                              >
                                {slot === 'breakfast' && '🌅 Breakfast'}
                                {slot === 'lunch' && '☀️ Lunch'}
                                {slot === 'snacks' && '🌇 Evening Snacks'}
                                {slot === 'dinner' && '🌙 Dinner'}
                                {!['breakfast', 'lunch', 'snacks', 'dinner'].includes(slot) && slot}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {assigned ? (
                            <span className="text-sm font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 inline-block">
                              ₹{Number(assigned.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/mo
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 inline-block">
                              Not Configured
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs ${
                              optedCount > 0
                                ? 'bg-blue-100 text-[#005390] border border-blue-200'
                                : 'bg-gray-100 text-gray-500 border border-gray-200'
                            }`}
                          >
                            <Users className="w-3.5 h-3.5" />
                            {optedCount} {optedCount === 1 ? 'Resident' : 'Residents'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={isOpted}
                            onClick={() => handleOpenEditModal(gPkg, assigned)}
                            title={
                              isOpted
                                ? 'Pricing cannot be modified while residents are opted into this package'
                                : 'Edit pricing'
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors shadow-xs ${
                              isOpted
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                : 'bg-[#005390] text-white hover:bg-[#004070] cursor-pointer'
                            }`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            {assigned ? 'Edit Pricing' : 'Configure Pricing'}
                          </button>
                        </td>
                      </tr>

                      {/* Accordion Expanded Sub-Row */}
                      {isExpanded && (
                        <tr className="bg-gray-50/70 border-b border-gray-200">
                          <td colSpan={7} className="p-4 sm:p-6">
                            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-4">
                              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-[#005390]" />
                                  <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                                    Subscribed Residents for "{gPkg.name}"
                                  </h4>
                                </div>
                                <span className="text-xs font-bold text-[#005390] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                  {optedCount} Active Subscriptions
                                </span>
                              </div>

                              {optedSubs.length === 0 ? (
                                <div className="p-6 text-center text-gray-400 text-xs bg-gray-50 rounded-lg">
                                  No residents currently opted into this food package.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-gray-100/80 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                                        <th className="py-2.5 px-3">Resident Name</th>
                                        <th className="py-2.5 px-3">Unit</th>
                                        <th className="py-2.5 px-3">Contact</th>
                                        <th className="py-2.5 px-3">Diet Preference</th>
                                        <th className="py-2.5 px-3">Start Date</th>
                                        <th className="py-2.5 px-3">End Date</th>
                                        <th className="py-2.5 px-3">Status</th>
                                        <th className="py-2.5 px-3">Allergies / Notes</th>
                                        <th className="py-2.5 px-3 text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {optedSubs.map((sub) => {
                                        const primaryName = sub.resident
                                          ? `${sub.resident.firstName} ${sub.resident.lastName || ''}`.trim()
                                          : 'Resident'
                                        const isFamily = Boolean(sub.familyMember)
                                        const displayName = isFamily
                                          ? `${sub.familyMember?.firstName} ${sub.familyMember?.lastName || ''}`.trim()
                                          : primaryName

                                        const blockName = sub.resident?.unit?.floor?.block?.block_name
                                        const floorObj = sub.resident?.unit?.floor
                                        const floorStr =
                                          floorObj?.floor_name ||
                                          (floorObj?.floor_number !== undefined
                                            ? `Floor ${floorObj.floor_number}`
                                            : null)
                                        const flatNum = sub.resident?.unit?.unit_number || 'N/A'

                                        const unitDisplay = [
                                          blockName ? `Block ${blockName}` : null,
                                          floorStr
                                            ? floorStr.toLowerCase().includes('floor')
                                              ? floorStr
                                              : `Floor ${floorStr}`
                                            : null,
                                          flatNum !== 'N/A' ? `Flat ${flatNum}` : 'N/A',
                                        ]
                                          .filter(Boolean)
                                          .join(' • ')

                                        const isPaused = sub.status === 'paused'

                                        return (
                                          <tr key={sub.id} className="hover:bg-gray-50/80">
                                            <td className="py-2.5 px-3">
                                              <div className="font-bold text-gray-900">{displayName}</div>
                                              {isFamily ? (
                                                <span className="inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                                  Family ({sub.familyMember?.relation || 'Member'})
                                                </span>
                                              ) : (
                                                <span className="inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-[#005390] border border-blue-200">
                                                  Primary Resident
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-2.5 px-3 font-semibold text-gray-700">
                                              <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-mono text-[11px] inline-block">
                                                {unitDisplay}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-gray-600">
                                              {sub.familyMember?.phone || sub.resident?.phone ? (
                                                <span className="flex items-center gap-1">
                                                  <Phone className="w-3 h-3 text-gray-400" />
                                                  {sub.familyMember?.phone || sub.resident?.phone}
                                                </span>
                                              ) : (
                                                '-'
                                              )}
                                            </td>
                                            <td className="py-2.5 px-3">
                                              <span
                                                className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize border inline-block ${getDietBadgeStyle(sub.dietaryPreference)}`}
                                              >
                                                {sub.dietaryPreference.replace('_', ' ')}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-gray-600 font-medium">
                                              {sub.startDate ? sub.startDate.split('T')[0] : '-'}
                                            </td>
                                            <td className="py-2.5 px-3 text-gray-600 font-medium">
                                              {sub.endDate ? sub.endDate.split('T')[0] : 'N/A'}
                                            </td>
                                            <td className="py-2.5 px-3">
                                              <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                  isPaused
                                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                    : 'bg-blue-100 text-[#005390] border border-blue-200'
                                                }`}
                                              >
                                                {sub.status}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-gray-500 italic max-w-xs truncate">
                                              {sub.allergiesNotes || '-'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right space-x-2">
                                              <button
                                                type="button"
                                                onClick={() => handleTogglePause(sub)}
                                                disabled={actionLoading === sub.id}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${
                                                  isPaused
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                                }`}
                                              >
                                                {isPaused ? (
                                                  <>
                                                    <Play className="w-3 h-3" /> Resume
                                                  </>
                                                ) : (
                                                  <>
                                                    <Pause className="w-3 h-3" /> Pause
                                                  </>
                                                )}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenChangeModal(sub)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-[#005390] border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                                              >
                                                <RefreshCw className="w-3 h-3" /> Change Package
                                              </button>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Pricing Modal */}
      {isEditModalOpen && editingGlobalPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-[#005390]" /> Configure Property Pricing
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Set monthly subscription rate for <strong>"{editingGlobalPkg.name}"</strong> at this property.
              </p>
            </div>

            {editHasOpted && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Note: Pricing cannot be edited while residents are currently opted into this food package.</span>
              </div>
            )}

            <form onSubmit={handleSavePricing} className="space-y-4">
              <div>
                <label htmlFor="monthly-price-input" className="block text-xs font-semibold text-gray-700 mb-1">
                  Monthly Package Price (₹) <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  id="monthly-price-input"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={editHasOpted}
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390] disabled:bg-gray-100 disabled:text-gray-400"
                  required
                />
              </div>

              <div>
                <span className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                  Included Meal Breakdown
                </span>
                <div className="flex flex-wrap gap-2">
                  {editingGlobalPkg.includedMealSlots?.map((slot) => (
                    <span
                      key={slot}
                      className="px-3 py-1.5 bg-blue-50 text-[#005390] rounded-xl text-xs font-semibold capitalize flex items-center gap-1.5 border border-blue-100"
                    >
                      {slot === 'breakfast' && '🌅 Breakfast'}
                      {slot === 'lunch' && '☀️ Lunch'}
                      {slot === 'snacks' && '🌇 Evening Snacks'}
                      {slot === 'dinner' && '🌙 Dinner'}
                      {!['breakfast', 'lunch', 'snacks', 'dinner'].includes(slot) && slot}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || editHasOpted}
                  className="inline-flex items-center gap-2 bg-[#005390] text-white px-5 py-2 rounded-xl font-medium text-xs hover:bg-[#004070] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Property Pricing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Package Modal */}
      {isChangeModalOpen && changingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 relative my-auto">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-[#005390]">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  Change Food Package
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Replaces current active package and sets an end date for it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeModalOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChangePackage} className="space-y-4">
              {/* Resident Info Summary */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 text-xs space-y-1">
                <div className="text-gray-400 font-semibold uppercase text-[10px]">Resident / Member</div>
                <div className="font-bold text-gray-900 text-sm">
                  {changingSub.familyMember
                    ? `${changingSub.familyMember.firstName} ${changingSub.familyMember.lastName || ''}`.trim()
                    : `${changingSub.resident?.firstName || ''} ${changingSub.resident?.lastName || ''}`.trim()}
                </div>
                <div className="text-gray-500 text-[11px]">
                  Current Package:{' '}
                  <span className="font-semibold text-gray-700">
                    {changingSub.propertyPackage?.globalPackage?.name || 'Package'}
                  </span>
                </div>
              </div>

              {/* Select New Package */}
              <div>
                <label htmlFor="new-pkg-select" className="block text-xs font-semibold text-gray-700 mb-1">
                  Select New Food Package <span className="text-red-500 font-bold">*</span>
                </label>
                <select
                  id="new-pkg-select"
                  value={newPropertyPkgId}
                  onChange={(e) => setNewPropertyPkgId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390] bg-white"
                  required
                >
                  <option value="">-- Select New Package --</option>
                  {propertyPackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.globalPackage?.name || 'Package'} — ₹{Number(pkg.price).toLocaleString('en-IN')}/mo
                    </option>
                  ))}
                </select>
              </div>

              {/* Effective Start Date */}
              <div>
                <label htmlFor="change-start-date-input" className="block text-xs font-semibold text-gray-700 mb-1">
                  Effective Start Date <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  id="change-start-date-input"
                  type="date"
                  value={changeStartDate}
                  onChange={(e) => setChangeStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390]"
                  required
                />
              </div>

              {/* Allergies / Special Notes */}
              <div>
                <label htmlFor="change-notes-input" className="block text-xs font-semibold text-gray-700 mb-1">
                  Allergies & Special Instructions
                </label>
                <input
                  id="change-notes-input"
                  type="text"
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  placeholder="e.g. Peanut allergy, low sodium..."
                  className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390]"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsChangeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPackage || !newPropertyPkgId}
                  className="px-5 py-2 bg-[#005390] text-white text-xs font-bold rounded-xl hover:bg-[#004070] transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {changingPackage ? 'Saving Changes...' : 'Confirm Change Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
