import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { FieldErrors } from 'react-hook-form'
import {
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Building2,
  CheckSquare,
  Square,
  X,
  Upload,
  Image as ImageIcon,
  Briefcase,
} from 'lucide-react'
import api from '@/lib/api/axios'
import { getPropertiesAPI } from '@/lib/services/propertyService'
import { notifyError, notifySuccess } from '@/utils/toast'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import {
  globalServiceFormDefaultValues,
  globalServiceFormSchema,
  type GlobalServiceFormValues,
  type PropertyAssignmentFormValues,
} from '@/validations/globalServiceForm.validation'

const fieldInputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20'

export interface Property {
  id: string
  name?: string
  property_name?: string
  propertyName?: string
  locationCode?: string
}

export interface GlobalService {
  id: string
  name: string
  basePrice: number
  description?: string
  imageUrl?: string
  isActive: boolean
  propertyServices?: Array<{
    id: string
    locId: string
    price: number
    quantity?: number
    isActive?: boolean
    property?: Property
  }>
}

interface PropertyAssignment extends PropertyAssignmentFormValues {
  propertyName: string
}

const getPropName = (p: Property): string => p.property_name || p.propertyName || p.name || 'Unnamed Property'

const buildPropertyAssignments = (properties: Property[], service?: GlobalService | null): PropertyAssignment[] => {
  const existingPriceMap = new Map<string, number>()
  const existingQuantityMap = new Map<string, number>()
  service?.propertyServices?.forEach((ps) => {
    existingPriceMap.set(ps.locId, ps.price)
    existingQuantityMap.set(ps.locId, ps.quantity ?? 1)
  })

  return properties.map((p) => ({
    locId: p.id,
    propertyName: getPropName(p),
    enabled: service ? existingPriceMap.has(p.id) : false,
    price: existingPriceMap.has(p.id) ? existingPriceMap.get(p.id)! : service?.basePrice || 0,
    quantity: existingQuantityMap.has(p.id) ? existingQuantityMap.get(p.id)! : 1,
  }))
}

export function GlobalServicesTab() {
  const [services, setServices] = useState<GlobalService[]>([])
  const [availableProperties, setAvailableProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<GlobalService | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GlobalServiceFormValues>({
    resolver: zodResolver(globalServiceFormSchema),
    defaultValues: globalServiceFormDefaultValues,
    mode: 'onChange',
  })

  const propertyAssignments = watch('propertyAssignments') as PropertyAssignment[]
  const basePrice = watch('basePrice')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [servicesRes, propsRes] = await Promise.allSettled([
        api.get('/global-services'),
        getPropertiesAPI().catch(async () => {
          const res = await api.get('/property')
          return res.data?.data || res.data
        }),
      ])

      if (servicesRes.status === 'fulfilled') {
        const data = servicesRes.value.data
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
        setServices(list)
      }

      if (propsRes.status === 'fulfilled') {
        const rawProps = propsRes.value
        const props = Array.isArray(rawProps) ? rawProps : Array.isArray(rawProps?.data) ? rawProps.data : []
        setAvailableProperties(props)
      }
    } catch (err) {
      console.error('Failed to fetch global services:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!ignore) await fetchData()
    }
    void load()
    return () => {
      ignore = true
    }
  }, [fetchData])

  const isAllPropsSelected = propertyAssignments.length > 0 && propertyAssignments.every((pa) => pa.enabled)

  const handleSelectAllProperties = () => {
    const shouldEnable = !isAllPropsSelected
    const updated = propertyAssignments.map((pa) => ({
      ...pa,
      enabled: shouldEnable,
      price: shouldEnable && (!pa.price || pa.price === 0) ? basePrice || 0 : pa.price,
      quantity: shouldEnable && (!pa.quantity || Number(pa.quantity) < 1) ? 1 : pa.quantity,
    }))
    setValue('propertyAssignments', updated, { shouldValidate: true })
  }

  const handleOpenCreate = () => {
    setEditingService(null)
    setImageFile(null)
    setImagePreviewUrl('')
    reset({
      ...globalServiceFormDefaultValues,
      propertyAssignments: buildPropertyAssignments(availableProperties),
    })
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (service: GlobalService) => {
    setEditingService(service)
    setImageFile(null)
    setImagePreviewUrl(service.imageUrl || '')
    reset({
      name: service.name,
      basePrice: service.basePrice,
      description: service.description || '',
      propertyAssignments: buildPropertyAssignments(availableProperties, service),
    })
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const togglePropertyAssignment = (index: number) => {
    const updated = [...propertyAssignments]
    updated[index] = {
      ...updated[index],
      enabled: !updated[index].enabled,
    }
    if (updated[index].enabled && (!updated[index].price || Number(updated[index].price) === 0)) {
      updated[index].price = basePrice || 0
    }
    if (updated[index].enabled && (!updated[index].quantity || Number(updated[index].quantity) < 1)) {
      updated[index].quantity = 1
    }
    setValue('propertyAssignments', updated, { shouldValidate: true })
  }

  const handlePropertyPriceChange = (index: number, val: string) => {
    const updated = [...propertyAssignments]
    updated[index] = { ...updated[index], price: val }
    setValue('propertyAssignments', updated, { shouldValidate: true })
  }

  const handlePropertyQuantityChange = (index: number, val: string) => {
    const updated = [...propertyAssignments]
    updated[index] = { ...updated[index], quantity: val }
    setValue('propertyAssignments', updated, { shouldValidate: true })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreviewUrl(URL.createObjectURL(file))
    }
  }

  const onInvalid = (fieldErrors: FieldErrors<GlobalServiceFormValues>) => {
    const firstError = Object.values(fieldErrors)[0]
    const message =
      (firstError && 'message' in firstError ? firstError.message : undefined) || 'Please fix the form errors'
    setErrorMsg(String(message))
    notifyError(String(message))
  }

  const onSubmit = async (values: GlobalServiceFormValues) => {
    try {
      setSaving(true)
      setErrorMsg('')

      const enabledAssignments = values.propertyAssignments.filter((pa) => pa.enabled)
      const selectedPropAssignments = enabledAssignments.map((pa) => ({
        locId: pa.locId,
        price: Number(pa.price) || Number(values.basePrice) || 0,
        quantity: Number(pa.quantity) || 1,
      }))

      const formData = new FormData()
      formData.append('name', values.name.trim())
      formData.append('basePrice', String(values.basePrice || 0))
      formData.append('description', values.description || '')
      formData.append('propertyAssignments', JSON.stringify(selectedPropAssignments))

      if (imageFile) {
        formData.append('image', imageFile)
      } else if (editingService?.imageUrl) {
        formData.append('imageUrl', editingService.imageUrl)
      }

      const res = editingService
        ? await api.put(`/global-services/${editingService.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        : await api.post('/global-services', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })

      if (res.data?.success) {
        notifySuccess(`Global service ${editingService ? 'updated' : 'created'} successfully!`)
        setIsModalOpen(false)
        fetchData()
      } else {
        setErrorMsg(res.data?.message || 'Failed to save service')
        notifyError(res.data?.message || 'Failed to save service')
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setErrorMsg(msg || 'Server connection error')
      notifyError(msg || 'Server connection error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (service: GlobalService) => {
    if (!window.confirm(`Are you sure you want to delete "${service.name}"?`)) return
    try {
      const res = await api.delete(`/global-services/${service.id}`)
      if (res.data?.success) {
        notifySuccess('Global service deleted successfully!')
        fetchData()
      } else {
        notifyError(res.data?.message || 'Failed to delete service')
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      notifyError(msg || 'Failed to delete service')
    }
  }

  const filteredServices = useMemo(() => {
    if (!searchTerm.trim()) return services
    const q = searchTerm.toLowerCase()
    return services.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q)),
    )
  }, [services, searchTerm])

  const columns: ColumnDef<GlobalService>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Service',
        cell: ({ row }) => {
          const service = row.original
          return (
            <div className="flex items-center gap-3">
              {service.imageUrl ? (
                <img
                  src={service.imageUrl}
                  alt={service.name}
                  className="w-10 h-10 rounded-xl object-cover border border-gray-100 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#005390] flex items-center justify-center font-extrabold text-sm border border-blue-100 shrink-0">
                  {service.name[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-bold text-gray-900 text-xs">{service.name}</div>
                {service.description && (
                  <div className="text-[11px] text-gray-400 line-clamp-1 max-w-sm mt-0.5">{service.description}</div>
                )}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'basePrice',
        header: 'Base Price',
        cell: ({ row }) => (
          <span className="font-extrabold text-gray-900 text-xs">
            ₹{Number(row.original.basePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        id: 'properties',
        header: 'Assigned Properties',
        cell: ({ row }) => {
          const assignments = row.original.propertyServices?.filter((ps) => ps.isActive !== false) || []
          if (assignments.length === 0) {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-gray-50 text-gray-400 border border-gray-200 italic">
                <Building2 className="w-3 h-3 text-gray-300" /> No Properties
              </span>
            )
          }
          return (
            <div className="flex flex-wrap gap-1.5 max-w-xs">
              {assignments.map((ps) => {
                const propName = ps.property ? getPropName(ps.property) : 'Property'
                return (
                  <span
                    key={ps.id || ps.locId}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-[11px] bg-blue-50 text-[#005390] border border-blue-100"
                  >
                    <Building2 className="w-3 h-3" />
                    {propName}: ₹{Number(ps.price).toLocaleString('en-IN')} × {ps.quantity ?? 1}
                  </span>
                )
              })}
            </div>
          )
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
              row.original.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {row.original.isActive ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => handleOpenEdit(row.original)}
              className="p-2 rounded-lg text-[#005390] hover:bg-blue-50 transition-colors cursor-pointer"
              title="Edit service"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row.original)}
              className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Delete service"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availableProperties],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#005390]" /> Global Services
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Create and manage global service templates with property-specific pricing.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#005390] hover:bg-[#004070] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Global Service
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filteredServices}
        isLoading={loading}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search services by name or description..."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#005390]" />
                  {editingService ? 'Edit Global Service' : 'Add Global Service'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Configure service details and assign property pricing directly.
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

            <form
              onSubmit={handleSubmit(onSubmit, onInvalid)}
              noValidate
              className="space-y-6 overflow-y-auto px-1 flex-1"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Input
                    id="service-name-input"
                    label="Service Name *"
                    type="text"
                    {...register('name')}
                    error={errors.name?.message}
                    placeholder="e.g. Housekeeping"
                    className="text-sm"
                  />

                  <Input
                    id="service-base-price-input"
                    label="Base Price *"
                    type="number"
                    step="0.01"
                    min="0"
                    icon={<span className="text-gray-500 text-sm font-medium">₹</span>}
                    {...register('basePrice', { valueAsNumber: true })}
                    error={errors.basePrice?.message}
                    placeholder="0.00"
                    className="text-sm"
                  />

                  <div>
                    <label htmlFor="service-image-input" className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Service Image
                    </label>
                    <div className="flex items-center gap-4 border border-gray-200 rounded-2xl p-4 bg-gray-50/50">
                      {imagePreviewUrl ? (
                        <img
                          src={imagePreviewUrl}
                          alt="Preview"
                          className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center border border-gray-200 shrink-0">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                      <div className="flex-1 space-y-1">
                        <input
                          type="file"
                          accept="image/*"
                          id="service-image-input"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="service-image-input"
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#005390]" />
                          {imageFile ? 'Change Uploaded File' : 'Choose Image File'}
                        </label>
                        <p className="text-[11px] text-gray-400">PNG, JPG, WEBP up to 10MB.</p>
                      </div>
                    </div>
                  </div>

                  <Input
                    id="service-desc-input"
                    label="Description"
                    type="textarea"
                    rows={3}
                    {...register('description')}
                    placeholder="Optional details about this service..."
                    className="text-sm"
                  />
                </div>

                <div className="space-y-4">
                  {errors.propertyAssignments?.message && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs">
                      {errors.propertyAssignments.message}
                    </div>
                  )}
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
                      No properties available.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {propertyAssignments.map((pa, idx) => (
                        <div
                          key={pa.locId}
                          className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col gap-2.5 ${
                            pa.enabled
                              ? 'border-[#005390] bg-blue-50/40 shadow-xs'
                              : 'border-gray-200 bg-gray-50/50 opacity-70'
                          }`}
                        >
                          <label className="flex items-center gap-3 cursor-pointer select-none font-semibold text-gray-800">
                            <input
                              type="checkbox"
                              checked={pa.enabled}
                              onChange={() => togglePropertyAssignment(idx)}
                              className="w-4 h-4 rounded text-[#005390] focus:ring-[#005390] cursor-pointer"
                            />
                            <span>{pa.propertyName}</span>
                          </label>

                          {pa.enabled && (
                            <div className="flex items-center gap-2 pl-7">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500 font-medium text-[10px]">Qty</span>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={pa.quantity}
                                  onChange={(e) => handlePropertyQuantityChange(idx, e.target.value)}
                                  placeholder="Qty"
                                  className={`${fieldInputClass} w-16 px-2 py-1.5 text-xs font-bold`}
                                  required={pa.enabled}
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-500 font-medium">₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={pa.price}
                                  onChange={(e) => handlePropertyPriceChange(idx, e.target.value)}
                                  placeholder="Price"
                                  className={`${fieldInputClass} w-24 px-2.5 py-1.5 text-xs font-bold`}
                                  required={pa.enabled}
                                />
                              </div>
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
                  {saving ? 'Saving...' : 'Save Service & Assignments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
