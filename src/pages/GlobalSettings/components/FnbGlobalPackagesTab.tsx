import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Utensils,
  AlertCircle,
  Building2,
  Lock,
  X,
  CheckSquare,
  Square,
} from 'lucide-react'
import api from '@/lib/api/axios'
import { getPropertiesAPI } from '@/lib/services/propertyService'
import { notifyError, notifySuccess } from '@/utils/toast'
import type { GlobalMealSlot } from './FnbGlobalMealSlotsTab'

export interface Property {
  id: string
  name?: string
  property_name?: string
  propertyName?: string
  locationCode?: string
}

const getPropName = (p: Property): string => p.property_name || p.propertyName || p.name || 'Unnamed Property'

export interface GlobalPackage {
  id: string
  name: string
  code: string
  description?: string
  dietaryType: 'veg' | 'non_veg' | 'egg' | 'jain' | 'mixed' | 'vegan'
  includedMealSlots: string[]
  isActive: boolean
  hasOptedResidents?: boolean
  propertyPackages?: Array<{
    id: string
    locId: string
    price: number
    property?: Property
  }>
}

interface PropertyAssignment {
  locId: string
  propertyName: string
  enabled: boolean
  price: number | string
}

export function FnbGlobalPackagesTab() {
  const [packages, setPackages] = useState<GlobalPackage[]>([])
  const [availableProperties, setAvailableProperties] = useState<Property[]>([])
  const [globalMealSlots, setGlobalMealSlots] = useState<
    Array<{
      id: string
      name: string
      code: string
      startTime: string
      endTime: string
      propertyMealSlots?: Array<{ locId: string }>
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPkg, setEditingPkg] = useState<GlobalPackage | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [dietaryType, setDietaryType] = useState<'veg' | 'non_veg' | 'egg' | 'jain' | 'mixed' | 'vegan'>('veg')
  const [includedSlots, setIncludedSlots] = useState<string[]>([])
  const [propertyAssignments, setPropertyAssignments] = useState<PropertyAssignment[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const enabledPropAssignments = propertyAssignments.filter((pa) => pa.enabled)
  const enabledPropIds = enabledPropAssignments.map((pa) => pa.locId)
  const selectedPropNames = enabledPropAssignments.map((pa) => pa.propertyName).join(', ')

  // Filter global meal slots to only those available in ALL currently selected properties
  const availableMealSlotsForSelectedProps = useMemo(() => {
    if (enabledPropIds.length === 0) return []
    return globalMealSlots.filter((ms) => {
      const propSlots = ms.propertyMealSlots || []
      const assignedLocIds = new Set(propSlots.map((ps: { locId: string }) => ps.locId))
      return enabledPropIds.every((locId) => assignedLocIds.has(locId))
    })
  }, [globalMealSlots, enabledPropIds])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [pkgResResult, propResResult, slotsResResult] = await Promise.allSettled([
        api.get('/fnb/global-packages'),
        getPropertiesAPI().catch(async () => {
          const res = await api.get('/property')
          return res.data?.data || res.data
        }),
        api.get('/fnb/global-meal-slots'),
      ])

      if (pkgResResult.status === 'fulfilled') {
        const pkgData = pkgResResult.value.data
        const pkgs = Array.isArray(pkgData?.data) ? pkgData.data : Array.isArray(pkgData) ? pkgData : []
        setPackages(pkgs)
      }

      if (propResResult.status === 'fulfilled') {
        const rawProps = propResResult.value
        const props = Array.isArray(rawProps) ? rawProps : Array.isArray(rawProps?.data) ? rawProps.data : []
        setAvailableProperties(props)
      }

      if (slotsResResult.status === 'fulfilled') {
        const slotsData = slotsResResult.value.data
        const rawSlots = Array.isArray(slotsData?.data) ? slotsData.data : []
        const parseTimeToMinutes = (tStr: string): number => {
          if (!tStr) return 0
          const parts = tStr.split(':').map((p) => parseInt(p, 10) || 0)
          return (parts[0] || 0) * 60 + (parts[1] || 0)
        }
        const sortedSlots = [...rawSlots].sort(
          (a: GlobalMealSlot, b: GlobalMealSlot) =>
            parseTimeToMinutes(a.startTime || '00:00') - parseTimeToMinutes(b.startTime || '00:00'),
        )
        setGlobalMealSlots(sortedSlots)
      }
    } catch (err) {
      console.error('Failed to fetch global packages & properties:', err)
    } finally {
      setLoading(false)
    }
  }, [])

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

  const isAllPropsSelected = propertyAssignments.length > 0 && propertyAssignments.every((pa) => pa.enabled)

  const handleSelectAllProperties = () => {
    const shouldEnable = !isAllPropsSelected
    setPropertyAssignments((prev) =>
      prev.map((pa) => ({
        ...pa,
        enabled: shouldEnable,
      })),
    )
  }

  const handleOpenCreate = () => {
    setEditingPkg(null)
    setName('')
    setCode('')
    setDescription('')
    setDietaryType('veg')
    setIncludedSlots([])
    setPropertyAssignments(
      availableProperties.map((p) => ({
        locId: p.id,
        propertyName: getPropName(p),
        enabled: false,
        price: 0,
      })),
    )
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (pkg: GlobalPackage) => {
    if (pkg.hasOptedResidents) {
      notifyError('This package cannot be edited because one or more residents are currently opted into it.')
      return
    }
    setEditingPkg(pkg)
    setName(pkg.name)
    setCode(pkg.code)
    setDescription(pkg.description || '')
    setDietaryType(pkg.dietaryType)
    setIncludedSlots(pkg.includedMealSlots || [])

    const existingMap = new Map<string, number>()
    if (pkg.propertyPackages) {
      pkg.propertyPackages.forEach((pp) => {
        existingMap.set(pp.locId, pp.price)
      })
    }

    setPropertyAssignments(
      availableProperties.map((p) => ({
        locId: p.id,
        propertyName: getPropName(p),
        enabled: existingMap.has(p.id),
        price: existingMap.has(p.id) ? existingMap.get(p.id)! : 0,
      })),
    )
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const toggleSlot = (slot: string) => {
    if (includedSlots.includes(slot)) {
      setIncludedSlots(includedSlots.filter((s) => s !== slot))
    } else {
      setIncludedSlots([...includedSlots, slot])
    }
  }

  const togglePropertyAssignment = (index: number) => {
    const updated = [...propertyAssignments]
    updated[index].enabled = !updated[index].enabled
    setPropertyAssignments(updated)
  }

  const handlePropertyPriceChange = (index: number, val: string) => {
    const updated = [...propertyAssignments]
    updated[index].price = val
    setPropertyAssignments(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim()) {
      setErrorMsg('Package Name and Package Code are required.')
      return
    }

    if (includedSlots.length === 0) {
      setErrorMsg('Please select at least one meal slot.')
      return
    }

    try {
      setSaving(true)
      setErrorMsg('')

      const selectedPropAssignments = propertyAssignments
        .filter((pa) => pa.enabled)
        .map((pa) => ({
          locId: pa.locId,
          price: Number(pa.price) || 0,
        }))

      const payload = {
        name,
        code,
        description,
        dietaryType,
        includedMealSlots: includedSlots,
        propertyAssignments: selectedPropAssignments,
      }

      const res = editingPkg
        ? await api.put(`/fnb/global-packages/${editingPkg.id}`, payload)
        : await api.post('/fnb/global-packages', payload)

      if (res.data?.success) {
        notifySuccess(editingPkg ? 'Global package updated successfully!' : 'Global package created successfully!')
        setIsModalOpen(false)
        fetchData()
      } else {
        notifyError(res.data?.message || 'Failed to save package')
        setErrorMsg(res.data?.message || 'Failed to save package')
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

  const handleDelete = async (pkg: GlobalPackage) => {
    if (pkg.hasOptedResidents) {
      notifyError('This package cannot be deleted because one or more residents are currently opted into it.')
      return
    }
    if (!window.confirm(`Are you sure you want to delete "${pkg.name}" global package?`)) return
    try {
      const res = await api.delete(`/fnb/global-packages/${pkg.id}`)
      if (res.data?.success) {
        notifySuccess('Global package deleted successfully!')
        fetchData()
      } else {
        notifyError(res.data?.message || 'Failed to delete global package')
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      console.error(err)
      notifyError(msg || 'Failed to delete global package')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-[#005390]" /> Global Food Package Templates
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Create global meal package blueprints and assign specific property locations.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#005390] hover:bg-[#004070] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Global Package
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center text-gray-400">
          Loading global packages...
        </div>
      ) : packages.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center text-gray-400">
          No global package templates defined yet. Click "Create Global Package" to add your first template.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{pkg.name}</h3>
                    <span className="inline-block mt-0.5 text-[11px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                      {pkg.code}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      pkg.dietaryType === 'veg'
                        ? 'bg-emerald-50 text-emerald-700'
                        : pkg.dietaryType === 'non_veg'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {pkg.dietaryType.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs text-gray-500 line-clamp-2">{pkg.description || 'No description provided.'}</p>

                <div>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Included Meals
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {pkg.includedMealSlots?.map((slot) => {
                      if (!slot) return null
                      const slotLower = typeof slot === 'string' ? slot.toLowerCase() : ''
                      const matchedSlot = globalMealSlots.find(
                        (ms) =>
                          ms.id === slot ||
                          (ms.code && ms.code.toLowerCase() === slotLower) ||
                          (ms.name && ms.name.toLowerCase() === slotLower),
                      )
                      const displayName = matchedSlot ? matchedSlot.name : slot

                      return (
                        <span
                          key={slot}
                          className="px-2 py-0.5 bg-blue-50/60 text-[#005390] rounded-md text-[11px] font-semibold border border-blue-100/60"
                        >
                          {displayName}
                        </span>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Assigned Properties
                  </h4>
                  {pkg.propertyPackages && pkg.propertyPackages.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {pkg.propertyPackages.map((pp) => (
                        <span
                          key={pp.id}
                          className="px-2 py-0.5 bg-blue-50 text-[#005390] rounded-md text-[11px] font-semibold"
                        >
                          {pp.property ? getPropName(pp.property) : pp.locId}: ₹{pp.price}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Unassigned (Global Template Only)</span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Status: {pkg.isActive ? <span className="text-emerald-600 font-bold">Active</span> : 'Inactive'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(pkg)}
                    className="p-2 text-gray-500 hover:text-[#005390] hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                    title="Edit Package"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(pkg)}
                    disabled={pkg.hasOptedResidents}
                    className={`p-2 transition-colors cursor-pointer rounded-xl ${
                      pkg.hasOptedResidents
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title={
                      pkg.hasOptedResidents ? 'Cannot delete package with active opted residents' : 'Delete Package'
                    }
                  >
                    {pkg.hasOptedResidents ? <Lock className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative my-auto max-h-[90vh] flex flex-col justify-between">
              <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-[#005390]" />
                    {editingPkg ? 'Edit Global Package Template' : 'Create Global Package Template'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Configure package features and assign property pricing directly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-1 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Basic Details */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="pkg-name-input" className="block text-xs font-semibold text-gray-700 mb-1">
                        Package Name <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        id="pkg-name-input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Full Board - 4 Meals"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390]"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="pkg-code-input" className="block text-xs font-semibold text-gray-700 mb-1">
                        Package Code <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        id="pkg-code-input"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="e.g. PKG-FULL"
                        disabled={Boolean(editingPkg)}
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390] disabled:bg-gray-50"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="pkg-dietary-select" className="block text-xs font-semibold text-gray-700 mb-1">
                        Dietary Type
                      </label>
                      <select
                        id="pkg-dietary-select"
                        value={dietaryType}
                        onChange={(e) =>
                          setDietaryType(e.target.value as 'veg' | 'non_veg' | 'egg' | 'jain' | 'mixed' | 'vegan')
                        }
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390]"
                      >
                        <option value="veg">Vegetarian</option>
                        <option value="non_veg">Non-Vegetarian</option>
                        <option value="egg">Eggitarian</option>
                        <option value="jain">Jain</option>
                        <option value="vegan">Vegan</option>
                        <option value="mixed">Mixed / Choice</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-gray-700">Included Meal Slots</span>
                        {enabledPropIds.length > 1 && (
                          <span className="text-[10px] font-bold text-[#005390] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                            Common Slots in {enabledPropIds.length} Locations
                          </span>
                        )}
                      </div>

                      {enabledPropIds.length === 0 ? (
                        <div className="p-3.5 rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 text-xs text-amber-800 flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-amber-900 mb-0.5">No Property Selected</div>
                            <div className="text-[11px] text-amber-700 leading-relaxed">
                              Please select property location(s) under <strong>ASSIGN TO PROPERTIES</strong> to view
                              their available meal slots.
                            </div>
                          </div>
                        </div>
                      ) : availableMealSlotsForSelectedProps.length === 0 ? (
                        <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/70 text-xs text-rose-800 flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-rose-900 mb-0.5">No Common Meal Slots Found</div>
                            <div className="text-[11px] text-rose-700 leading-relaxed">
                              The selected locations (<strong>{selectedPropNames}</strong>) do not share any common
                              configured meal slots. Please ensure matching meal slots are assigned to all target
                              properties.
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {/* Prominent Clear Banner Note */}
                          <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/60 text-xs text-blue-900 flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-[#005390] shrink-0 mt-0.5" />
                            <div className="text-[11px] leading-relaxed">
                              {enabledPropIds.length === 1 ? (
                                <>
                                  Displaying meal slots configured for{' '}
                                  <strong>{enabledPropAssignments[0].propertyName}</strong>.
                                </>
                              ) : (
                                <>
                                  <strong>Common Meal Slots Note:</strong> Showing meal slots commonly available across
                                  all selected locations (<strong>{selectedPropNames}</strong>). Only meal slots present
                                  in all target properties can be included in this package template.
                                </>
                              )}
                            </div>
                          </div>

                          {/* Meal Slots Grid */}
                          <div className="grid grid-cols-2 gap-2">
                            {availableMealSlotsForSelectedProps.map((ms) => {
                              const codeLower = (ms.code || ms.name || '').toLowerCase()
                              const selected = includedSlots.includes(ms.id) || includedSlots.includes(codeLower)
                              return (
                                <button
                                  key={ms.id}
                                  type="button"
                                  onClick={() => toggleSlot(ms.id)}
                                  className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-colors flex items-center justify-between cursor-pointer ${
                                    selected
                                      ? 'border-[#005390] bg-blue-50/50 text-[#005390] ring-1 ring-[#005390]'
                                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  <div>
                                    <div className="font-bold text-gray-900">{ms.name}</div>
                                    <div className="text-[10px] text-gray-400 font-mono">
                                      {ms.startTime} - {ms.endTime}
                                    </div>
                                  </div>
                                  {selected && <CheckCircle className="w-4 h-4 text-[#005390]" />}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="pkg-desc-textarea" className="block text-xs font-semibold text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        id="pkg-desc-textarea"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Optional details about this package template..."
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390]"
                      />
                    </div>
                  </div>

                  {/* Right Column: Property Assignments */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#005390]" /> Assign to Properties (
                        {propertyAssignments.filter((pa) => pa.enabled).length}/{propertyAssignments.length})
                      </h4>
                      {propertyAssignments.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectAllProperties}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#005390] hover:text-[#004070] cursor-pointer"
                        >
                          {isAllPropsSelected ? (
                            <>
                              <CheckSquare className="w-4 h-4 text-[#005390]" /> Deselect All
                            </>
                          ) : (
                            <>
                              <Square className="w-4 h-4 text-gray-400" /> Select All ({propertyAssignments.length})
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {propertyAssignments.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl text-xs">
                        No properties available in location.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                        {propertyAssignments.map((pa, idx) => (
                          <div
                            key={pa.locId}
                            className={`p-3.5 rounded-xl border transition-all text-xs flex items-center justify-between gap-3 ${
                              pa.enabled
                                ? 'border-[#005390] bg-blue-50/40 shadow-xs'
                                : 'border-gray-200 bg-gray-50/50 opacity-70'
                            }`}
                          >
                            <label className="flex items-center gap-3 cursor-pointer select-none font-semibold text-gray-800 flex-1">
                              <input
                                type="checkbox"
                                checked={pa.enabled}
                                onChange={() => togglePropertyAssignment(idx)}
                                className="w-4 h-4 rounded text-[#005390] focus:ring-[#005390] cursor-pointer"
                              />
                              <span>{pa.propertyName}</span>
                            </label>

                            {pa.enabled && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-500 font-medium">₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={pa.price}
                                  onChange={(e) => handlePropertyPriceChange(idx, e.target.value)}
                                  placeholder="Price / mo"
                                  className="w-28 px-2.5 py-1.5 text-xs font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005390] bg-white"
                                  required={pa.enabled}
                                />
                                <span className="text-[10px] text-gray-400">/mo</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-[#005390] text-white text-sm font-medium rounded-xl hover:bg-[#004070] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Package & Assignments'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
