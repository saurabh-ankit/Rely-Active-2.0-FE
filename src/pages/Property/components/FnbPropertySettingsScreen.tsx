import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
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
  Home,
  Package,
  Search,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react'
import api from '@/lib/api/axios'
import { notifyError, notifySuccess } from '@/utils/toast'
import { useScrollLock } from '@/hooks/useScrollLock'
import { useDebounce } from '@/hooks/useDebounce'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

interface GlobalPackage {
  id: string
  name: string
  code: string
  dietaryType: string
  includedMealSlots: string[]
}

interface OptedResidentSub {
  id: string
  residentId?: string | null
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
    resident?: OptedResidentSub['resident']
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

interface UnitGroup {
  unitId: string
  unitNumber: string
  blockName: string
  floorName: string
  primaryResidentName: string
  primaryResidentPhone?: string
  primaryResidentEmail?: string
  totalMonthlyPrice: number
  subscriptions: OptedResidentSub[]
}

interface FnbPropertySettingsScreenProps {
  locId: string
  initialViewMode?: 'unit' | 'package' | 'meal-slots'
  hideSubHeader?: boolean
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

interface PropertyMealSlot {
  id: string
  locId: string
  globalMealSlotId: string
  name: string
  code: string
  description?: string
  startTime: string
  endTime: string
  price: number
  globalStartTime: string
  globalEndTime: string
  globalPrice: number
  isActive: boolean
}

interface PropertySpecialSlotItem {
  id: string
  globalSpecialSlotId: string
  locId: string
  name: string
  description?: string
  price: number
  isActive: boolean
}

export function FnbPropertySettingsScreen({
  locId,
  initialViewMode = 'unit',
  hideSubHeader = false,
}: FnbPropertySettingsScreenProps) {
  const [globalPackages, setGlobalPackages] = useState<GlobalPackage[]>([])
  const [propertyPackages, setPropertyPackages] = useState<PropertyPackage[]>([])
  const [propertyMealSlots, setPropertyMealSlots] = useState<PropertyMealSlot[]>([])
  const [propertySpecialSlots, setPropertySpecialSlots] = useState<PropertySpecialSlotItem[]>([])
  const [globalMealSlots, setGlobalMealSlots] = useState<Array<{ id: string; name: string; code?: string }>>([])
  const [mealSlotsSubTab, setMealSlotsSubTab] = useState<'regular' | 'special'>('regular')
  const [loading, setLoading] = useState(true)

  const getSlotDisplayName = (slot: string): string => {
    if (!slot) return ''
    const slotLower = slot.toLowerCase()
    if (slotLower === 'breakfast') return 'Break Fast'
    if (slotLower === 'lunch') return 'Lunch'
    if (slotLower === 'snacks') return 'Evening Snacks'
    if (slotLower === 'dinner') return 'Dinner'

    const matchedPropSlot = propertyMealSlots.find(
      (ps) =>
        ps.id === slot ||
        ps.globalMealSlotId === slot ||
        (ps.code && ps.code.toLowerCase() === slotLower) ||
        (ps.name && ps.name.toLowerCase() === slotLower),
    )
    if (matchedPropSlot) return matchedPropSlot.name

    const matchedGlobalSlot = globalMealSlots.find(
      (ms) =>
        ms.id === slot ||
        (ms.code && ms.code.toLowerCase() === slotLower) ||
        (ms.name && ms.name.toLowerCase() === slotLower),
    )
    if (matchedGlobalSlot) return matchedGlobalSlot.name

    return slot
  }

  // View Mode: 'unit' (By Property Unit / Flat) or 'package' (By Package Template) or 'meal-slots' (Property Meal Slots)
  const [viewMode, setViewMode] = useState<'unit' | 'package' | 'meal-slots'>(initialViewMode)

  // Search state with Debounce from BE
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 400)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Accordion State
  const [expandedPkgId, setExpandedPkgId] = useState<string | null>(null)
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null)

  // Edit Pricing Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingGlobalPkg, setEditingGlobalPkg] = useState<GlobalPackage | null>(null)
  const [editPrice, setEditPrice] = useState<number | string>(0)
  const [editHasOpted, setEditHasOpted] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit Property Meal Slot Modal State
  const [editingMealSlot, setEditingMealSlot] = useState<PropertyMealSlot | null>(null)
  const [slotStartTime, setSlotStartTime] = useState('')
  const [slotEndTime, setSlotEndTime] = useState('')
  const [slotPrice, setSlotPrice] = useState('')
  const [slotIsActive, setSlotIsActive] = useState(true)
  const [isMealSlotModalOpen, setIsMealSlotModalOpen] = useState(false)
  const [savingSlot, setSavingSlot] = useState(false)

  // Edit Property Special Slot Modal State
  const [editingSpecialSlot, setEditingSpecialSlot] = useState<PropertySpecialSlotItem | null>(null)
  const [specialSlotPrice, setSpecialSlotPrice] = useState('')
  const [isSpecialSlotModalOpen, setIsSpecialSlotModalOpen] = useState(false)
  const [savingSpecialSlot, setSavingSpecialSlot] = useState(false)

  const handleOpenSpecialSlotModal = (slot: PropertySpecialSlotItem) => {
    setEditingSpecialSlot(slot)
    setSpecialSlotPrice(String(slot.price ?? 0))
    setIsSpecialSlotModalOpen(true)
  }

  const handleSaveSpecialSlotPrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSpecialSlot) return

    try {
      setSavingSpecialSlot(true)
      const res = await api.put(`/fnb/property-special-slots/${editingSpecialSlot.id}`, {
        price: Number(specialSlotPrice) || 0,
      })

      if (res.data?.success) {
        notifySuccess(`Price updated for ${editingSpecialSlot.name}!`)
        setIsSpecialSlotModalOpen(false)
        fetchData()
      } else {
        notifyError(res.data?.message || 'Failed to update special slot price')
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      notifyError(msg || 'Failed to update special slot price')
    } finally {
      setSavingSpecialSlot(false)
    }
  }

  // Pause / Resume State
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Change Package Modal State
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false)
  const [changingSub, setChangingSub] = useState<OptedResidentSub | null>(null)
  const [newPropertyPkgId, setNewPropertyPkgId] = useState<string>('')
  const [changeNotes, setChangeNotes] = useState<string>('')
  const [changingPackage, setChangingPackage] = useState(false)

  useScrollLock(isEditModalOpen || isChangeModalOpen || isMealSlotModalOpen || isSpecialSlotModalOpen)

  const propertySlotCollisionError = useMemo(() => {
    if (!editingMealSlot || !slotIsActive || !slotStartTime || !slotEndTime) return null

    const parseTimeToMinutes = (tStr: string): number => {
      if (!tStr) return 0
      const parts = tStr.split(':').map((p) => parseInt(p, 10) || 0)
      return (parts[0] || 0) * 60 + (parts[1] || 0)
    }

    const getSlotIntervals = (startStr: string, endStr: string) => {
      const s = parseTimeToMinutes(startStr)
      const e = parseTimeToMinutes(endStr)
      if (s === e) return [{ start: 0, end: 1440 }]
      if (s < e) return [{ start: s, end: e }]
      return [
        { start: s, end: 1440 },
        { start: 0, end: e },
      ]
    }

    const isTimeOverlapping = (start1Str: string, end1Str: string, start2Str: string, end2Str: string): boolean => {
      const intervals1 = getSlotIntervals(start1Str, end1Str)
      const intervals2 = getSlotIntervals(start2Str, end2Str)
      for (const i1 of intervals1) {
        for (const i2 of intervals2) {
          if (i1.start < i2.end && i1.end > i2.start) return true
        }
      }
      return false
    }

    for (const slot of propertyMealSlots) {
      if (slot.id === editingMealSlot.id) continue
      if (!slot.isActive) continue
      if (isTimeOverlapping(slotStartTime, slotEndTime, slot.startTime, slot.endTime)) {
        return `Timing (${slotStartTime} - ${slotEndTime}) collides with existing property slot "${slot.name}" (${slot.startTime} - ${slot.endTime}).`
      }
    }
    return null
  }, [editingMealSlot, slotIsActive, slotStartTime, slotEndTime, propertyMealSlots])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const searchParam = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ''
      const [gRes, pRes, slotsRes, globalSlotsRes, specSlotsRes] = await Promise.all([
        api.get('/fnb/global-packages'),
        api.get(`/fnb/properties/${locId}/packages${searchParam}`),
        api.get(`/fnb/property-meal-slots?locId=${locId}`),
        api.get('/fnb/global-meal-slots').catch(() => ({ data: { success: false } })),
        api.get(`/fnb/property-special-slots?locId=${locId}`).catch(() => ({ data: { success: false } })),
      ])

      if (gRes.data?.success) setGlobalPackages(gRes.data.data || [])
      if (pRes.data?.success) setPropertyPackages(pRes.data.data || [])
      if (globalSlotsRes.data?.success) setGlobalMealSlots(globalSlotsRes.data.data || [])
      if (specSlotsRes.data?.success) setPropertySpecialSlots(specSlotsRes.data.data || [])

      if (slotsRes.data?.success) {
        const rawSlots = slotsRes.data.data || []
        const parseTimeToMinutes = (tStr: string): number => {
          if (!tStr) return 0
          const parts = tStr.split(':').map((p) => parseInt(p, 10) || 0)
          return (parts[0] || 0) * 60 + (parts[1] || 0)
        }
        const sortedSlots = [...rawSlots].sort(
          (a: { startTime?: string }, b: { startTime?: string }) =>
            parseTimeToMinutes(a.startTime || '00:00') - parseTimeToMinutes(b.startTime || '00:00'),
        )
        setPropertyMealSlots(sortedSlots)
      }
    } catch (err) {
      console.error('Failed to load property F&B settings:', err)
    } finally {
      setLoading(false)
    }
  }, [locId, debouncedSearch])

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

  // Group packages by Property Unit / Flat
  const unitGroups = useMemo(() => {
    const map = new Map<string, UnitGroup>()

    propertyPackages.forEach((pPkg) => {
      const subs = pPkg.optedResidents || []
      subs.forEach((sub) => {
        const res = sub.resident || sub.familyMember?.resident
        if (!res || !res.unit) return

        const unitId = res.unit.id || res.unit.unit_number
        const unitNum = res.unit.unit_number || 'A-11'
        const blockName = res.unit.floor?.block?.block_name || 'Tower A'
        const floorObj = res.unit.floor
        const floorName =
          floorObj?.floor_name ||
          (floorObj?.floor_number !== undefined ? `Floor ${floorObj.floor_number}` : 'Ground Floor')
        const primaryName = `${res.firstName} ${res.lastName || ''}`.trim()

        if (!map.has(unitId)) {
          map.set(unitId, {
            unitId,
            unitNumber: unitNum,
            blockName,
            floorName,
            primaryResidentName: primaryName,
            primaryResidentPhone: res.phone,
            primaryResidentEmail: res.email,
            totalMonthlyPrice: 0,
            subscriptions: [],
          })
        }

        const grp = map.get(unitId)!
        if (!grp.subscriptions.some((s) => s.id === sub.id)) {
          const subPrice = Number(sub.propertyPackage?.price || pPkg.price || 0)
          const isCancelled = sub.status === 'cancelled' || sub.status === 'CANCELLED'
          grp.subscriptions.push({
            ...sub,
            propertyPackage: sub.propertyPackage || {
              id: pPkg.id,
              price: pPkg.price,
              globalPackage: pPkg.globalPackage,
            },
          })
          if (!isCancelled) {
            grp.totalMonthlyPrice += subPrice
          }
        }
      })
    })

    return Array.from(map.values()).sort((a, b) => a.unitNumber.localeCompare(b.unitNumber))
  }, [propertyPackages])

  // Paginated Unit Groups
  const paginatedUnitGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return unitGroups.slice(start, start + pageSize)
  }, [unitGroups, currentPage, pageSize])

  const totalUnitPages = Math.ceil(unitGroups.length / pageSize) || 1

  // Paginated Global Packages
  const paginatedGlobalPackages = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return globalPackages.slice(start, start + pageSize)
  }, [globalPackages, currentPage, pageSize])

  const totalPackagePages = Math.ceil(globalPackages.length / pageSize) || 1

  const togglePackageAccordion = (gPkgId: string) => {
    setExpandedPkgId((prev) => (prev === gPkgId ? null : gPkgId))
  }

  const toggleUnitAccordion = (unitId: string) => {
    setExpandedUnitId((prev) => (prev === unitId ? null : unitId))
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
    setNewPropertyPkgId('') // Reset selection so user must select a new package
    setChangeNotes(sub.allergiesNotes || '')
    setIsChangeModalOpen(true)
  }

  const handleSaveChangePackage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!changingSub || !newPropertyPkgId || newPropertyPkgId === changingSub.propertyPackageId) return

    try {
      setChangingPackage(true)
      const todayStr = new Date().toISOString().split('T')[0]
      const res = await api.post('/fnb/resident-package/change', {
        subscriptionId: changingSub.id,
        newPropertyPackageId: newPropertyPkgId,
        startDate: todayStr,
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
  const totalSubscribedUnits = unitGroups.length

  const handleOpenMealSlotModal = (slot: PropertyMealSlot) => {
    setEditingMealSlot(slot)
    setSlotStartTime(slot.startTime)
    setSlotEndTime(slot.endTime)
    setSlotPrice(String(slot.price))
    setSlotIsActive(slot.isActive)
    setIsMealSlotModalOpen(true)
  }

  const handleSaveMealSlotOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMealSlot) return

    // Client side time collision validation
    if (slotIsActive) {
      const parseTimeToMinutes = (tStr: string): number => {
        if (!tStr) return 0
        const parts = tStr.split(':').map((p) => parseInt(p, 10) || 0)
        return (parts[0] || 0) * 60 + (parts[1] || 0)
      }

      const isTimeOverlapping = (start1Str: string, end1Str: string, start2Str: string, end2Str: string): boolean => {
        const s1 = parseTimeToMinutes(start1Str)
        let e1 = parseTimeToMinutes(end1Str)
        const s2 = parseTimeToMinutes(start2Str)
        let e2 = parseTimeToMinutes(end2Str)

        if (e1 <= s1) e1 += 1440
        if (e2 <= s2) e2 += 1440

        return s1 < e2 && e1 > s2
      }

      const sMin = parseTimeToMinutes(slotStartTime)
      let eMin = parseTimeToMinutes(slotEndTime)
      if (eMin <= sMin) eMin += 1440
      if (sMin >= eMin) {
        notifyError('Start time must be before end time.')
        return
      }

      for (const slot of propertyMealSlots) {
        if (slot.id === editingMealSlot.id) continue
        if (!slot.isActive) continue
        if (isTimeOverlapping(slotStartTime, slotEndTime, slot.startTime, slot.endTime)) {
          notifyError(
            `Timing (${slotStartTime} - ${slotEndTime}) collides with existing property slot "${slot.name}" (${slot.startTime} - ${slot.endTime}).`,
          )
          return
        }
      }
    }

    try {
      setSavingSlot(true)
      const res = await api.put(`/fnb/property-meal-slots/${editingMealSlot.id}`, {
        startTime: slotStartTime,
        endTime: slotEndTime,
        price: Number(slotPrice),
        isActive: slotIsActive,
      })

      if (res.data?.success) {
        notifySuccess(`Property meal slot override saved for ${editingMealSlot.name}!`)
        setIsMealSlotModalOpen(false)
        fetchData()
      } else {
        notifyError(res.data?.message || 'Failed to save meal slot override')
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      notifyError(msg || 'Failed to save meal slot override')
    } finally {
      setSavingSlot(false)
    }
  }

  return (
    <div className="space-y-6">
      {!hideSubHeader && (
        <>
          {/* Header Stat Cards */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Utensils className="w-6 h-6 text-[#005390]" />
                Property F&B Settings
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Manage food package subscriptions by <strong>Property Unit / Flat</strong> or by{' '}
                <strong>Package Template</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-100 text-xs">
                <span className="text-blue-700/70 font-semibold uppercase block text-[10px]">Subscribed Flats</span>
                <span className="font-bold text-[#005390]">{totalSubscribedUnits} Units</span>
              </div>
              <div className="bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-200 text-xs">
                <span className="text-gray-400 font-semibold uppercase block text-[10px]">Total Packages</span>
                <span className="font-bold text-gray-800">{totalGlobalCount} Templates</span>
              </div>
              <div className="bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-100 text-xs">
                <span className="text-emerald-700/70 font-semibold uppercase block text-[10px]">Opted Residents</span>
                <span className="font-bold text-emerald-800">{totalOptedCount} Subscribed</span>
              </div>
            </div>
          </div>

          {/* View Switcher & Debounced Backend Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setViewMode('unit')}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'unit' ? 'bg-white text-[#005390] shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Home className="w-4 h-4" /> By Property Unit / Flat
              </button>
              <button
                type="button"
                onClick={() => setViewMode('package')}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'package' ? 'bg-white text-[#005390] shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Package className="w-4 h-4" /> By Package Template
              </button>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search flat number, resident, or package (debounced)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390] bg-white shadow-2xs"
              />
            </div>
          </div>
        </>
      )}

      {/* View Mode 1: Property Unit / Flat View */}
      {viewMode === 'unit' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden flex flex-col justify-between">
          {unitGroups.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              {searchQuery
                ? 'No property units found matching search query.'
                : 'No property units with active food packages.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 uppercase tracking-wider font-bold text-[11px]">
                      <th className="py-3.5 px-4 w-10"></th>
                      <th className="py-3.5 px-4">Property Flat / Unit</th>
                      <th className="py-3.5 px-4">Primary Resident</th>
                      <th className="py-3.5 px-4">Flat Total Rate</th>
                      <th className="py-3.5 px-4 text-center">Active Subs</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedUnitGroups.map((grp) => {
                      const isExpanded = expandedUnitId === grp.unitId
                      const activeSubs = grp.subscriptions.filter(
                        (s) =>
                          s.status === 'active' ||
                          s.status === 'ACTIVE' ||
                          s.status === 'paused' ||
                          s.status === 'PAUSED',
                      )

                      return (
                        <React.Fragment key={grp.unitId}>
                          {/* Main Unit Row */}
                          <tr
                            className={`transition-colors cursor-pointer hover:bg-blue-50/30 ${
                              isExpanded ? 'bg-blue-50/40' : ''
                            }`}
                            onClick={() => toggleUnitAccordion(grp.unitId)}
                          >
                            <td className="py-4 px-4 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleUnitAccordion(grp.unitId)
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
                              <div className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-[#005390]" />
                                <span>Flat {grp.unitNumber}</span>
                              </div>
                              <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                                {grp.blockName} • {grp.floorName}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-bold text-gray-900 text-xs">{grp.primaryResidentName}</div>
                              {grp.primaryResidentPhone && (
                                <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3 text-gray-400" /> {grp.primaryResidentPhone}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-sm font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 inline-block">
                                ₹{Number(grp.totalMonthlyPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                /mo
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs bg-blue-100 text-[#005390] border border-blue-200">
                                <Users className="w-3.5 h-3.5" />
                                {activeSubs.length} {activeSubs.length === 1 ? 'Active' : 'Active'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => toggleUnitAccordion(grp.unitId)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-[#005390] text-white hover:bg-[#004070] transition-colors cursor-pointer shadow-xs"
                              >
                                {isExpanded ? 'Hide Details' : 'View Breakdown'}
                              </button>
                            </td>
                          </tr>

                          {/* Accordion Expanded Sub-Row for Unit */}
                          {isExpanded && (
                            <tr className="bg-gray-50/70 border-b border-gray-200">
                              <td colSpan={6} className="p-4 sm:p-6">
                                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-4">
                                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                    <div className="flex items-center gap-2">
                                      <Home className="w-4 h-4 text-[#005390]" />
                                      <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                                        Food Package Subscriptions History for Flat {grp.unitNumber} ({grp.blockName})
                                      </h4>
                                    </div>
                                    <span className="text-xs font-bold text-[#005390] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                      {grp.subscriptions.length} Subscriptions Recorded
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-gray-100/80 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                                          <th className="py-2.5 px-3">Resident / Family Member</th>
                                          <th className="py-2.5 px-3">Assigned Food Package</th>
                                          <th className="py-2.5 px-3">Included Meal Slots</th>
                                          <th className="py-2.5 px-3">Monthly Rate</th>
                                          <th className="py-2.5 px-3">Diet Preference</th>
                                          <th className="py-2.5 px-3">Start Date</th>
                                          <th className="py-2.5 px-3">End Date</th>
                                          <th className="py-2.5 px-3">Status</th>
                                          <th className="py-2.5 px-3">Notes</th>
                                          <th className="py-2.5 px-3 text-right">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {grp.subscriptions.map((sub) => {
                                          const isFamily = Boolean(sub.familyMember)
                                          const displayName = isFamily
                                            ? `${sub.familyMember?.firstName} ${sub.familyMember?.lastName || ''}`.trim()
                                            : grp.primaryResidentName

                                          const pkgName = sub.propertyPackage?.globalPackage?.name || 'Package'
                                          const price = sub.propertyPackage?.price || 0
                                          const slots =
                                            (
                                              sub.propertyPackage?.globalPackage as unknown as {
                                                includedMealSlots?: string[]
                                              }
                                            )?.includedMealSlots || []
                                          const isPaused = sub.status === 'paused' || sub.status === 'PAUSED'
                                          const isCancelled = sub.status === 'cancelled' || sub.status === 'CANCELLED'

                                          return (
                                            <tr
                                              key={sub.id}
                                              className={
                                                isCancelled ? 'bg-rose-50/20 hover:bg-rose-50/40' : 'hover:bg-gray-50'
                                              }
                                            >
                                              <td className="py-2.5 px-3">
                                                <div className="font-bold text-gray-900">{displayName}</div>
                                                {isFamily ? (
                                                  <span className="inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 mt-0.5">
                                                    Family ({sub.familyMember?.relation || 'Member'})
                                                  </span>
                                                ) : (
                                                  <span className="inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-[#005390] border border-blue-200 mt-0.5">
                                                    Primary Resident
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2.5 px-3 font-bold text-gray-900">{pkgName}</td>
                                              <td className="py-2.5 px-3">
                                                <div className="flex flex-wrap gap-1">
                                                  {slots.map((s) => (
                                                    <span
                                                      key={s}
                                                      className="px-1.5 py-0.5 bg-blue-50 text-[#005390] rounded text-[10px] font-semibold border border-blue-100"
                                                    >
                                                      {getSlotDisplayName(s)}
                                                    </span>
                                                  ))}
                                                </div>
                                              </td>
                                              <td className="py-2.5 px-3 font-extrabold text-emerald-700">
                                                ₹{Number(price).toLocaleString('en-IN')}/mo
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
                                                {sub.endDate ? (
                                                  <span className="text-rose-700 font-bold">
                                                    {sub.endDate.split('T')[0]}
                                                  </span>
                                                ) : (
                                                  'N/A'
                                                )}
                                              </td>
                                              <td className="py-2.5 px-3">
                                                <span
                                                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                                    isCancelled
                                                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                                      : isPaused
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
                                                {isCancelled ? (
                                                  <span className="text-xs text-rose-600 font-semibold italic">
                                                    Cancelled
                                                  </span>
                                                ) : (
                                                  <>
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
                                                  </>
                                                )}
                                              </td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
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

              {/* Data-Table Pagination Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-6 border-t border-gray-100 bg-white">
                <div className="text-xs text-gray-500 font-medium">
                  Showing{' '}
                  <span className="font-bold text-gray-900">
                    {unitGroups.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-bold text-gray-900">{Math.min(currentPage * pageSize, unitGroups.length)}</span>{' '}
                  of <span className="font-bold text-gray-900">{unitGroups.length}</span> units • Page{' '}
                  <span className="font-bold text-gray-900">{currentPage}</span> of{' '}
                  <span className="font-bold text-gray-900">{totalUnitPages}</span>
                </div>

                <Pagination className="w-auto mx-0">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (currentPage > 1) setCurrentPage((prev) => prev - 1)
                        }}
                        className={
                          currentPage <= 1
                            ? 'pointer-events-none opacity-50 bg-gray-50 text-gray-400 border-gray-200'
                            : 'cursor-pointer bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                        }
                      />
                    </PaginationItem>

                    {Array.from({ length: totalUnitPages }).map((_, idx) => (
                      <PaginationItem key={idx}>
                        <PaginationLink
                          href="#"
                          isActive={idx + 1 === currentPage}
                          onClick={(e) => {
                            e.preventDefault()
                            setCurrentPage(idx + 1)
                          }}
                          className="cursor-pointer text-xs h-8 w-8 rounded-xl font-bold"
                        >
                          {idx + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (currentPage < totalUnitPages) setCurrentPage((prev) => prev + 1)
                        }}
                        className={
                          currentPage >= totalUnitPages
                            ? 'pointer-events-none opacity-50 bg-gray-50 text-gray-400 border-gray-200'
                            : 'cursor-pointer bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </div>
      )}

      {/* View Mode 2: Package Template View */}
      {viewMode === 'package' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden flex flex-col justify-between">
          {globalPackages.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No global package templates available.</div>
          ) : (
            <>
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
                    {paginatedGlobalPackages.map((gPkg) => {
                      const assigned = propertyPackages.find((p) => p.globalPackageId === gPkg.id)
                      const isExpanded = expandedPkgId === gPkg.id
                      const allOptedSubs = assigned?.optedResidents || []
                      const activeOptedSubs = allOptedSubs.filter(
                        (s) =>
                          s.status === 'active' ||
                          s.status === 'ACTIVE' ||
                          s.status === 'paused' ||
                          s.status === 'PAUSED',
                      )
                      const cancelledOptedSubs = allOptedSubs.filter(
                        (s) => s.status === 'cancelled' || s.status === 'CANCELLED',
                      )
                      const optedCount = activeOptedSubs.length
                      const isOpted = optedCount > 0

                      return (
                        <React.Fragment key={gPkg.id}>
                          {/* Main Table Row */}
                          <tr
                            className={`transition-colors cursor-pointer hover:bg-blue-50/30 ${
                              isExpanded ? 'bg-blue-50/40' : ''
                            }`}
                            onClick={() => togglePackageAccordion(gPkg.id)}
                          >
                            <td className="py-4 px-4 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  togglePackageAccordion(gPkg.id)
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
                                    className="px-2.5 py-1 bg-blue-50 text-[#005390] rounded-lg text-[11px] font-semibold border border-blue-100"
                                  >
                                    {getSlotDisplayName(slot)}
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
                              <div className="inline-flex items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs ${
                                    optedCount > 0
                                      ? 'bg-blue-100 text-[#005390] border border-blue-200'
                                      : 'bg-gray-100 text-gray-500 border border-gray-200'
                                  }`}
                                >
                                  <Users className="w-3.5 h-3.5" />
                                  {optedCount} {optedCount === 1 ? 'Active' : 'Active'}
                                </span>
                                {cancelledOptedSubs.length > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                                    {cancelledOptedSubs.length} Cancelled
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                disabled={isOpted}
                                onClick={() => handleOpenEditModal(gPkg, assigned)}
                                title={
                                  isOpted
                                    ? 'Pricing cannot be modified while residents are currently opted into this package'
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
                                        Subscribed Residents History for "{gPkg.name}"
                                      </h4>
                                    </div>
                                    <span className="text-xs font-bold text-[#005390] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                      {allOptedSubs.length} Subscriptions Recorded ({optedCount} Active
                                      {cancelledOptedSubs.length > 0 ? `, ${cancelledOptedSubs.length} Cancelled` : ''})
                                    </span>
                                  </div>

                                  {allOptedSubs.length === 0 ? (
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
                                          {allOptedSubs.map((sub) => {
                                            const primaryName = sub.resident
                                              ? `${sub.resident.firstName} ${sub.resident.lastName || ''}`.trim()
                                              : 'Resident'
                                            const isFamily = Boolean(sub.familyMember)
                                            const displayName = isFamily
                                              ? `${sub.familyMember?.firstName} ${sub.familyMember?.lastName || ''}`.trim()
                                              : primaryName

                                            const targetRes = sub.resident || sub.familyMember?.resident
                                            const blockName = targetRes?.unit?.floor?.block?.block_name
                                            const floorObj = targetRes?.unit?.floor
                                            const floorStr =
                                              floorObj?.floor_name ||
                                              (floorObj?.floor_number !== undefined
                                                ? `Floor ${floorObj.floor_number}`
                                                : 'Floor')
                                            const unitNum = targetRes?.unit?.unit_number
                                            const unitDisplay = unitNum
                                              ? `${blockName ? `${blockName} - ` : ''}${floorStr} - Flat ${unitNum}`
                                              : 'Unit -'

                                            const isPaused = sub.status === 'paused' || sub.status === 'PAUSED'
                                            const isCancelled = sub.status === 'cancelled' || sub.status === 'CANCELLED'

                                            return (
                                              <tr
                                                key={sub.id}
                                                className={
                                                  isCancelled ? 'bg-rose-50/20 hover:bg-rose-50/40' : 'hover:bg-gray-50'
                                                }
                                              >
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
                                                  {sub.endDate ? (
                                                    <span className="text-rose-700 font-bold">
                                                      {sub.endDate.split('T')[0]}
                                                    </span>
                                                  ) : (
                                                    'N/A'
                                                  )}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                  <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                                      isCancelled
                                                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                                        : isPaused
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
                                                  {isCancelled ? (
                                                    <span className="text-xs text-rose-600 font-semibold italic">
                                                      Cancelled
                                                    </span>
                                                  ) : (
                                                    <>
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
                                                    </>
                                                  )}
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

              {/* Data-Table Pagination Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-6 border-t border-gray-100 bg-white">
                <div className="text-xs text-gray-500 font-medium">
                  Showing{' '}
                  <span className="font-bold text-gray-900">
                    {globalPackages.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-bold text-gray-900">
                    {Math.min(currentPage * pageSize, globalPackages.length)}
                  </span>{' '}
                  of <span className="font-bold text-gray-900">{globalPackages.length}</span> templates • Page{' '}
                  <span className="font-bold text-gray-900">{currentPage}</span> of{' '}
                  <span className="font-bold text-gray-900">{totalPackagePages}</span>
                </div>

                <Pagination className="w-auto mx-0">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (currentPage > 1) setCurrentPage((prev) => prev - 1)
                        }}
                        className={
                          currentPage <= 1
                            ? 'pointer-events-none opacity-50 bg-gray-50 text-gray-400 border-gray-200'
                            : 'cursor-pointer bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                        }
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPackagePages }).map((_, idx) => (
                      <PaginationItem key={idx}>
                        <PaginationLink
                          href="#"
                          isActive={idx + 1 === currentPage}
                          onClick={(e) => {
                            e.preventDefault()
                            setCurrentPage(idx + 1)
                          }}
                          className="cursor-pointer text-xs h-8 w-8 rounded-xl font-bold"
                        >
                          {idx + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (currentPage < totalPackagePages) setCurrentPage((prev) => prev + 1)
                        }}
                        className={
                          currentPage >= totalPackagePages
                            ? 'pointer-events-none opacity-50 bg-gray-50 text-gray-400 border-gray-200'
                            : 'cursor-pointer bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </div>
      )}

      {/* View Mode 3: Property Meal Slots & Timings */}
      {viewMode === 'meal-slots' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#005390]" /> Property Meal Slots & Service Timings
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Customize meal slot timings and pricing specific to this property location.
              </p>
            </div>

            {/* Sub-Tabs: Regular Meal Slots vs Special Meal Slots */}
            <div className="inline-flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200 shrink-0">
              <button
                type="button"
                onClick={() => setMealSlotsSubTab('regular')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  mealSlotsSubTab === 'regular'
                    ? 'bg-[#005390] text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" /> Regular Meal Slots
              </button>
              <button
                type="button"
                onClick={() => setMealSlotsSubTab('special')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  mealSlotsSubTab === 'special'
                    ? 'bg-[#005390] text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Special Meal Slots
              </button>
            </div>
          </div>

          {/* Sub-Tab 1: Regular Meal Slots */}
          {mealSlotsSubTab === 'regular' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {propertyMealSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="bg-gray-50/70 rounded-2xl border border-gray-200 p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-gray-900">{slot.name}</span>
                      <span className="text-[10px] font-mono font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                        {slot.code}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-medium text-[11px]">Timing:</span>
                        <span className="font-extrabold text-[#005390]">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-medium text-[11px]">Price:</span>
                        <span className="font-black text-emerald-700">
                          ₹{Number(slot.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenMealSlotModal(slot)}
                    className="w-full py-2 bg-white hover:bg-blue-50 text-[#005390] border border-blue-200 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Override Timings & Price
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Sub-Tab 2: Special Meal Slots */}
          {mealSlotsSubTab === 'special' && (
            <div>
              {propertySpecialSlots.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-xs italic bg-gray-50/50 rounded-2xl border border-gray-200">
                  No special meal slots assigned to this property location. Go to Global Settings to assign special
                  slots.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  {propertySpecialSlots.map((spSlot) => (
                    <div
                      key={spSlot.id}
                      className="bg-amber-50/40 rounded-2xl border border-amber-200/80 p-4 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-gray-900">{spSlot.name}</span>
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase">
                            Special
                          </span>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-amber-100">
                            <span className="text-gray-400 font-medium text-[11px]">Timing:</span>
                            <span className="font-extrabold text-amber-900">All-Day / Special</span>
                          </div>
                          <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-amber-100">
                            <span className="text-gray-400 font-medium text-[11px]">Location Price:</span>
                            <span className="font-black text-emerald-700">
                              ₹{Number(spSlot.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenSpecialSlotModal(spSlot)}
                        className="w-full py-2 bg-white hover:bg-amber-100/70 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Override Special Price
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Property Meal Slot Modal */}
      {isMealSlotModalOpen &&
        editingMealSlot &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 relative animate-in fade-in zoom-in duration-150">
              <button
                type="button"
                onClick={() => setIsMealSlotModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#005390]" /> Override {editingMealSlot.name} Timings & Price
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Set property-specific start/end times and price for {editingMealSlot.name}.
                </p>
              </div>

              <form onSubmit={handleSaveMealSlotOverride} className="space-y-4 text-xs pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="slot-start-time" className="font-bold text-gray-700 block mb-1">
                      Start Time (24h)
                    </label>
                    <input
                      id="slot-start-time"
                      type="time"
                      required
                      value={slotStartTime}
                      onChange={(e) => setSlotStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl font-semibold text-xs focus:ring-2 focus:ring-[#005390]/20 focus:border-[#005390] outline-hidden"
                    />
                  </div>
                  <div>
                    <label htmlFor="slot-end-time" className="font-bold text-gray-700 block mb-1">
                      End Time (24h)
                    </label>
                    <input
                      id="slot-end-time"
                      type="time"
                      required
                      value={slotEndTime}
                      onChange={(e) => setSlotEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl font-semibold text-xs focus:ring-2 focus:ring-[#005390]/20 focus:border-[#005390] outline-hidden"
                    />
                  </div>
                </div>

                {propertySlotCollisionError && (
                  <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/80 text-xs text-rose-800 flex items-start gap-2.5 font-medium animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-rose-900 mb-0.5">Time Collision Detected</div>
                      <div className="text-[11px] text-rose-700 leading-relaxed">{propertySlotCollisionError}</div>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="slot-price" className="font-bold text-gray-700 block mb-1">
                    Property Override Price (₹)
                  </label>
                  <input
                    id="slot-price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={slotPrice}
                    onChange={(e) => setSlotPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs focus:ring-2 focus:ring-[#005390]/20 focus:border-[#005390] outline-hidden"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Global Base Price: ₹{editingMealSlot.globalPrice.toFixed(2)}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsMealSlotModalOpen(false)}
                    className="px-4 py-2 font-bold text-xs rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSlot || Boolean(propertySlotCollisionError)}
                    className="bg-[#005390] hover:bg-[#004070] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingSlot ? 'Saving...' : 'Save Override'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Edit Pricing Modal */}
      {isEditModalOpen &&
        editingGlobalPkg &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
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
                  <span>
                    Note: Pricing cannot be edited while residents are currently opted into this food package.
                  </span>
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
                        className="px-3 py-1.5 bg-blue-50 text-[#005390] rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-blue-100"
                      >
                        {getSlotDisplayName(slot)}
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
          </div>,
          document.body,
        )}

      {/* Change Package Modal */}
      {isChangeModalOpen &&
        changingSub &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
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
                    Select a new package to replace the current active package.
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

                {/* Select New Package (Excludes Currently Subscribed Package) */}
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
                    {propertyPackages
                      .filter((pkg) => pkg.id !== changingSub.propertyPackageId)
                      .map((pkg) => {
                        const dietStr = pkg.globalPackage?.dietaryType
                          ? ` (${pkg.globalPackage.dietaryType.replace('_', ' ').toUpperCase()})`
                          : ''
                        return (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.globalPackage?.name || 'Package'}
                            {dietStr} — ₹{Number(pkg.price).toLocaleString('en-IN')}/mo
                          </option>
                        )
                      })}
                  </select>
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

                {/* Action buttons - Enabled ONLY when a new different package is selected */}
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
                    disabled={
                      changingPackage || !newPropertyPkgId || newPropertyPkgId === changingSub.propertyPackageId
                    }
                    className="px-5 py-2 bg-[#005390] text-white text-xs font-bold rounded-xl hover:bg-[#004070] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                  >
                    {changingPackage ? 'Saving Changes...' : 'Confirm Change Package'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Edit Property Special Meal Slot Price Modal */}
      {isSpecialSlotModalOpen &&
        editingSpecialSlot &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 relative animate-in fade-in zoom-in duration-150">
              <button
                type="button"
                onClick={() => setIsSpecialSlotModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" /> Override {editingSpecialSlot.name} Price
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Set property-specific location price for {editingSpecialSlot.name}.
                </p>
              </div>

              <form onSubmit={handleSaveSpecialSlotPrice} className="space-y-4 text-xs pt-1">
                <div>
                  <label htmlFor="special-slot-price" className="font-bold text-gray-700 block mb-1">
                    Property Special Price (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-gray-400 font-bold">₹</span>
                    <input
                      id="special-slot-price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={specialSlotPrice}
                      onChange={(e) => setSpecialSlotPrice(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl font-bold text-xs focus:ring-2 focus:ring-[#005390]/20 focus:border-[#005390] outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsSpecialSlotModalOpen(false)}
                    className="px-4 py-2 font-bold text-xs rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSpecialSlot}
                    className="bg-[#005390] hover:bg-[#004070] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {savingSpecialSlot ? 'Saving...' : 'Save Special Price'}
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
