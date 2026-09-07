import { useCallback, useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, X, Building2, CheckSquare, Square, Clock, IndianRupee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api/axios'
import { toast } from 'sonner'

export interface GlobalSpecialSlot {
  id: string
  name: string
  description?: string | null
  price?: number
  isActive: boolean
  assignedPropertyCount?: number
  propertySpecialSlots?: Array<{ id: string; locId: string; property?: { id: string; name: string } }>
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

export default function FnbGlobalSpecialSlotsTab() {
  const [specialSlots, setSpecialSlots] = useState<GlobalSpecialSlot[]>([])
  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(false)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<GlobalSpecialSlot | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '0',
  })
  const [propertyAssignments, setPropertyAssignments] = useState<PropertyAssignment[]>([])
  const [submitting, setSubmitting] = useState(false)

  const fetchGlobalSpecialSlots = useCallback(async () => {
    try {
      setLoading(true)
      const [slotsRes, propsRes] = await Promise.all([
        api.get('/fnb/global-special-slots'),
        api.get('/property').catch(() => api.get('/properties')),
      ])

      if (slotsRes.data?.success) {
        setSpecialSlots(slotsRes.data.data || [])
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
      toast.error(msg || 'Failed to load special meal slots')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    const loadData = async () => {
      if (!ignore) {
        await fetchGlobalSpecialSlots()
      }
    }
    void loadData()
    return () => {
      ignore = true
    }
  }, [fetchGlobalSpecialSlots])

  const handleOpenAddModal = () => {
    setEditingSlot(null)
    setFormData({
      name: '',
      description: '',
      price: '0',
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

  const handleOpenEditModal = (slot: GlobalSpecialSlot) => {
    setEditingSlot(slot)
    setFormData({
      name: slot.name || '',
      description: slot.description || '',
      price: String(slot.price ?? 0),
    })

    const assignedLocIds = new Set((slot.propertySpecialSlots || []).map((ps) => ps.locId))

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Special Slot Name is required')
      return
    }

    try {
      setSubmitting(true)
      const selectedLocIds = propertyAssignments.filter((pa) => pa.enabled).map((pa) => pa.locId)

      if (editingSlot) {
        await api.put(`/fnb/global-special-slots/${editingSlot.id}`, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: Number(formData.price || 0),
        })

        await api.post(`/fnb/global-special-slots/${editingSlot.id}/assign-locations`, {
          locationIds: selectedLocIds,
        })

        toast.success('Special meal slot updated successfully')
      } else {
        await api.post('/fnb/global-special-slots', {
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: Number(formData.price || 0),
          assignedLocationIds: selectedLocIds,
        })

        toast.success('Special meal slot created successfully')
      }

      setIsModalOpen(false)
      fetchGlobalSpecialSlots()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(msg || 'Failed to save special meal slot')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSlot = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return
    try {
      await api.delete(`/fnb/global-special-slots/${id}`)
      toast.success('Special meal slot deleted successfully')
      fetchGlobalSpecialSlots()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(msg || 'Failed to delete special meal slot')
    }
  }

  const enabledPropsCount = propertyAssignments.filter((pa) => pa.enabled).length
  const isAllPropsSelected = propertyAssignments.length > 0 && enabledPropsCount === propertyAssignments.length

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Special Meal Slots Master
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure special meal slot categories (e.g. Festival Specials, Chef Specials, Weekend Feasts) and assign
            them to properties.
          </p>
        </div>
        <Button
          onClick={handleOpenAddModal}
          className="bg-[#005390] hover:bg-[#004070] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add Special Meal Slot
        </Button>
      </div>

      {/* Special Slots List */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">
          Loading special meal slots...
        </div>
      ) : specialSlots.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 space-y-3">
          <Clock className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="font-bold text-gray-700 text-sm">No Special Meal Slots Found</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Click "Add Special Meal Slot" to define custom special slots for events or festivals.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {specialSlots.map((slot) => (
            <div
              key={slot.id}
              className="bg-white rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/20 to-white p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-sm text-gray-900 flex items-center gap-1.5">⭐ {slot.name}</h3>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-extrabold uppercase">
                    Special Slot
                  </Badge>
                </div>

                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex items-center justify-between text-gray-600 bg-amber-50/60 px-2.5 py-1.5 rounded-lg border border-amber-100">
                    <span className="font-semibold text-gray-500 text-[11px] flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5 text-amber-600" /> Base Price:
                    </span>
                    <span className="font-extrabold text-amber-700">₹{Number(slot.price || 0)}</span>
                  </div>

                  <div className="flex items-center justify-between text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                    <span className="font-semibold text-gray-500 text-[11px] flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-gray-500" /> Assigned:
                    </span>
                    <span className="font-extrabold text-gray-800">{slot.assignedPropertyCount || 0} Properties</span>
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
                  onClick={() => handleDeleteSlot(slot.id, slot.name)}
                  className="h-8 px-2.5 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Special Meal Slot Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-gray-900">
                  {editingSlot ? 'Edit Special Meal Slot' : 'Add Special Meal Slot'}
                </h3>
                <p className="text-xs text-gray-500">
                  Configure special slot details, base price, and assigned properties.
                </p>
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
                <label htmlFor="global-special-slot-name" className="block text-xs font-bold text-gray-700 mb-1">
                  Special Slot Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="global-special-slot-name"
                  type="text"
                  placeholder="e.g. Festival Special, Sunday Brunch, Chef Special"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#005390] focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label htmlFor="global-special-slot-price" className="block text-xs font-bold text-gray-700 mb-1">
                  Global Base Price (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-gray-400 font-bold">₹</span>
                  <input
                    id="global-special-slot-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#005390] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="global-special-slot-description" className="block text-xs font-bold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="global-special-slot-description"
                  rows={2}
                  placeholder="Optional details about this special meal slot"
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
                  {submitting ? 'Saving...' : editingSlot ? 'Update Special Slot' : 'Create Special Slot'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
