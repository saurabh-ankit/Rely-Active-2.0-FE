import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  Clock,
  IndianRupee,
  X,
  Sparkles,
  Building2,
  CheckSquare,
  Square,
  AlertCircle,
  Utensils,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api/axios'
import { toast } from 'sonner'
import FnbGlobalSpecialSlotsTab from './FnbGlobalSpecialSlotsTab'

export interface GlobalMealSlot {
  id: string
  name: string
  code?: string
  startTime: string
  endTime: string
  price: number
  description?: string | null
  isActive: boolean
  assignedPropertyCount?: number
  propertyMealSlots?: Array<{ id: string; locId: string }>
}

interface PropertyItem {
  id: string
  name: string
}

interface PropertyAssignment {
  locId: string
  propertyName: string
  enabled: boolean
}

const parseTimeToMinutes = (tStr: string): number => {
  if (!tStr) return 0
  const parts = tStr.split(':').map((p) => parseInt(p, 10) || 0)
  return (parts[0] || 0) * 60 + (parts[1] || 0)
}

interface TimeInterval {
  start: number
  end: number
}

const getSlotIntervals = (startStr: string, endStr: string): TimeInterval[] => {
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

export default function FnbGlobalMealSlotsTab() {
  const [activeSubTab, setActiveSubTab] = useState<'regular' | 'special'>('regular')

  const [mealSlots, setMealSlots] = useState<GlobalMealSlot[]>([])
  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(false)

  // Modal State for Regular Meal Slots
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<GlobalMealSlot | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    startTime: '07:30',
    endTime: '10:00',
    price: '0.00',
    description: '',
  })
  const [propertyAssignments, setPropertyAssignments] = useState<PropertyAssignment[]>([])
  const [submitting, setSubmitting] = useState(false)

  const fetchGlobalMealSlots = useCallback(async () => {
    try {
      setLoading(true)
      const [slotsRes, propsRes] = await Promise.all([
        api.get('/fnb/global-meal-slots'),
        api.get('/property').catch(() => api.get('/properties')),
      ])

      if (slotsRes.data?.success) {
        const rawSlots = (slotsRes.data.data || []) as GlobalMealSlot[]
        const sortedSlots = [...rawSlots].sort(
          (a, b) => parseTimeToMinutes(a.startTime || '00:00') - parseTimeToMinutes(b.startTime || '00:00'),
        )
        setMealSlots(sortedSlots)
      }

      const propData = propsRes.data?.data || propsRes.data || []
      if (Array.isArray(propData)) {
        const mappedProps = propData.map(
          (p: { id: string; property_name?: string; propertyName?: string; name?: string }) => ({
            id: p.id,
            name: p.property_name || p.propertyName || p.name || 'Unnamed Property',
          }),
        )
        setProperties(mappedProps)
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(msg || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    const loadData = async () => {
      if (!ignore) {
        await fetchGlobalMealSlots()
      }
    }
    void loadData()
    return () => {
      ignore = true
    }
  }, [fetchGlobalMealSlots])

  const handleOpenAddModal = () => {
    setEditingSlot(null)
    setFormData({
      name: '',
      startTime: '07:30',
      endTime: '10:00',
      price: '0.00',
      description: '',
    })
    setPropertyAssignments(
      properties.map((p) => ({
        locId: p.id,
        propertyName: p.name,
        enabled: false,
      })),
    )
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (slot: GlobalMealSlot) => {
    setEditingSlot(slot)
    setFormData({
      name: slot.name || '',
      startTime: slot.startTime || '07:30',
      endTime: slot.endTime || '10:00',
      price: String(slot.price || 0),
      description: slot.description || '',
    })

    const assignedLocIds = new Set((slot.propertyMealSlots || []).map((ps) => ps.locId))

    setPropertyAssignments(
      properties.map((p) => ({
        locId: p.id,
        propertyName: p.name,
        enabled: assignedLocIds.has(p.id),
      })),
    )
    setIsModalOpen(true)
  }

  const togglePropertyAssignment = (locId: string) => {
    setPropertyAssignments((prev) => prev.map((pa) => (pa.locId === locId ? { ...pa, enabled: !pa.enabled } : pa)))
  }

  const toggleAllProperties = () => {
    const allEnabled = propertyAssignments.every((pa) => pa.enabled)
    setPropertyAssignments((prev) => prev.map((pa) => ({ ...pa, enabled: !allEnabled })))
  }

  const timeCollisionError = useMemo(() => {
    if (!formData.startTime || !formData.endTime) return null
    for (const slot of mealSlots) {
      if (editingSlot && slot.id === editingSlot.id) continue
      if (!slot.isActive) continue
      if (isTimeOverlapping(formData.startTime, formData.endTime, slot.startTime, slot.endTime)) {
        return `Timing (${formData.startTime} - ${formData.endTime}) collides with existing global slot "${slot.name}" (${slot.startTime} - ${slot.endTime}).`
      }
    }
    return null
  }, [formData.startTime, formData.endTime, mealSlots, editingSlot])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Meal Slot Name is required')
      return
    }

    if (timeCollisionError) {
      toast.error(timeCollisionError)
      return
    }

    const assignedPropertyIds = propertyAssignments.filter((pa) => pa.enabled).map((pa) => pa.locId)

    try {
      setSubmitting(true)
      if (editingSlot) {
        const res = await api.put(`/fnb/global-meal-slots/${editingSlot.id}`, {
          name: formData.name,
          startTime: formData.startTime,
          endTime: formData.endTime,
          price: Number(formData.price),
          description: formData.description,
          assignedPropertyIds,
        })
        if (res.data?.success) {
          toast.success('Global meal slot updated successfully')
          setIsModalOpen(false)
          fetchGlobalMealSlots()
        }
      } else {
        const res = await api.post('/fnb/global-meal-slots', {
          name: formData.name,
          startTime: formData.startTime,
          endTime: formData.endTime,
          price: Number(formData.price),
          description: formData.description,
          assignedPropertyIds,
        })
        if (res.data?.success) {
          toast.success('Global meal slot created successfully')
          setIsModalOpen(false)
          fetchGlobalMealSlots()
        }
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(msg || 'Failed to save global meal slot')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this global meal slot? This will remove property meal slot assignments.',
      )
    )
      return

    try {
      const res = await api.delete(`/fnb/global-meal-slots/${id}`)
      if (res.data?.success) {
        toast.success('Global meal slot deleted')
        fetchGlobalMealSlots()
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(msg || 'Failed to delete global meal slot')
    }
  }

  const enabledPropsCount = propertyAssignments.filter((pa) => pa.enabled).length
  const isAllPropsSelected = propertyAssignments.length > 0 && enabledPropsCount === propertyAssignments.length

  return (
    <div className="space-y-6">
      {/* Top Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-neutral-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('regular')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'regular'
              ? 'bg-[#005390] text-white shadow-sm'
              : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Utensils className="w-4 h-4" /> Regular Meal Slots
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('special')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'special'
              ? 'bg-[#005390] text-white shadow-sm'
              : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" /> Special Meal Slots
        </button>
      </div>

      {/* Special Meal Slots View */}
      {activeSubTab === 'special' ? (
        <FnbGlobalSpecialSlotsTab />
      ) : (
        /* Regular Meal Slots View Master */
        <div className="space-y-6">
          {/* Top Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#005390]" />
                Regular Meal Slots Master
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Define regular meal slot categories (Breakfast, Lunch, Snacks, Dinner, Midnight Snacks), default
                timings, base prices, and property assignments.
              </p>
            </div>
            <Button
              onClick={handleOpenAddModal}
              className="bg-[#005390] hover:bg-[#004070] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Regular Meal Slot
            </Button>
          </div>

          {/* Meal Slots List */}
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">
              Loading regular meal slots...
            </div>
          ) : mealSlots.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 space-y-3">
              <Clock className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="font-bold text-gray-700 text-sm">No Regular Meal Slots Found</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Click "Add Regular Meal Slot" to define your community meal slot schedules and pricing.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {mealSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-black text-sm text-gray-900">{slot.name}</h3>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-extrabold uppercase">
                        Active
                      </Badge>
                    </div>

                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex items-center justify-between text-gray-600 bg-blue-50/50 px-2.5 py-1.5 rounded-lg border border-blue-100/60">
                        <span className="font-semibold text-gray-500 text-[11px] flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#005390]" /> Timing:
                        </span>
                        <span className="font-extrabold text-[#005390]">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-gray-600 bg-emerald-50/50 px-2.5 py-1.5 rounded-lg border border-emerald-100/60">
                        <span className="font-semibold text-gray-500 text-[11px] flex items-center gap-1">
                          <IndianRupee className="w-3.5 h-3.5 text-emerald-600" /> Base Price:
                        </span>
                        <span className="font-extrabold text-emerald-700">₹{Number(slot.price || 0)}</span>
                      </div>

                      <div className="flex items-center justify-between text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                        <span className="font-semibold text-gray-500 text-[11px] flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-gray-500" /> Assigned:
                        </span>
                        <span className="font-extrabold text-gray-800">
                          {slot.assignedPropertyCount || 0} Properties
                        </span>
                      </div>
                    </div>

                    {slot.description && (
                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{slot.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditModal(slot)}
                      className="h-8 px-2.5 text-xs text-gray-600 hover:text-[#005390] hover:bg-blue-50 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(slot.id)}
                      className="h-8 px-2.5 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add / Edit Regular Meal Slot Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-gray-100 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900">
                      {editingSlot ? 'Edit Regular Meal Slot' : 'Add Regular Meal Slot'}
                    </h3>
                    <p className="text-xs text-gray-500">Configure slot timing, pricing, and assigned properties.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="global-meal-slot-name" className="block text-xs font-bold text-gray-700 mb-1">
                      Meal Slot Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="global-meal-slot-name"
                      type="text"
                      placeholder="e.g. Breakfast, Lunch, Mid Night Snacks"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#005390] focus:bg-white transition-all"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="global-meal-slot-start-time"
                        className="block text-xs font-bold text-gray-700 mb-1"
                      >
                        Start Time (24h)
                      </label>
                      <input
                        id="global-meal-slot-start-time"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-bold text-[#005390] focus:outline-none focus:border-[#005390] focus:bg-white transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="global-meal-slot-end-time" className="block text-xs font-bold text-gray-700 mb-1">
                        End Time (24h)
                      </label>
                      <input
                        id="global-meal-slot-end-time"
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-bold text-[#005390] focus:outline-none focus:border-[#005390] focus:bg-white transition-all"
                        required
                      />
                    </div>
                  </div>

                  {timeCollisionError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{timeCollisionError}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="global-meal-slot-price" className="block text-xs font-bold text-gray-700 mb-1">
                      Base Price (₹)
                    </label>
                    <input
                      id="global-meal-slot-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#005390] focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="global-meal-slot-description"
                      className="block text-xs font-bold text-gray-700 mb-1"
                    >
                      Description
                    </label>
                    <textarea
                      id="global-meal-slot-description"
                      rows={2}
                      placeholder="Optional notes or details about this meal slot"
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#005390] focus:bg-white transition-all"
                    />
                  </div>

                  {/* Property Assignments Section */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="block text-xs font-bold text-gray-700">Assign to Properties</span>
                      <button
                        type="button"
                        onClick={toggleAllProperties}
                        className="text-xs text-[#005390] font-bold hover:underline cursor-pointer"
                      >
                        {isAllPropsSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {propertyAssignments.map((pa) => (
                        <button
                          type="button"
                          key={pa.locId}
                          onClick={() => togglePropertyAssignment(pa.locId)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            pa.enabled
                              ? 'bg-blue-50/70 border-blue-200 text-[#005390] font-bold'
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                            {pa.propertyName}
                          </span>
                          {pa.enabled ? (
                            <CheckSquare className="w-4 h-4 text-[#005390]" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsModalOpen(false)}
                      className="text-xs font-bold text-gray-500"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-[#005390] hover:bg-[#004070] text-white font-bold text-xs px-5 py-2 rounded-xl shadow-xs"
                    >
                      {submitting ? 'Saving...' : editingSlot ? 'Update Meal Slot' : 'Create Meal Slot'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
