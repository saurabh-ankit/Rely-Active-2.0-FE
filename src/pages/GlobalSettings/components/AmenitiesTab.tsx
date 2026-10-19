import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Edit2, Plus, Trash2, X } from 'lucide-react'
import { z } from 'zod'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { notifyError, notifySuccess } from '@/utils/toast'
import {
  createAmenityAPI,
  deleteAmenityAPI,
  getAmenitiesAPI,
  updateAmenityAPI,
  updateAmenityStatusAPI,
  type Amenity,
} from '@/lib/services/amenityService'

const amenityFormSchema = z.object({
  name: z.string().trim().min(2, 'Amenity name is required'),
  description: z.string().trim().max(500, 'Description must be 500 characters or fewer').optional(),
})

type AmenityFormValues = z.infer<typeof amenityFormSchema>

const defaultValues: AmenityFormValues = {
  name: '',
  description: '',
}

const AMENITY_SUGGESTIONS = [
  'Swimming Pool',
  'Gym',
  'Club House',
  'Party Hall',
  'Tennis Court',
  'Badminton Court',
  'Co-working Lounge',
  'Guest Suites',
]

const readApiError = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string } }; message?: string }
  return err?.response?.data?.message || err?.message || fallback
}

export function AmenitiesTab() {
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<Amenity | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AmenityFormValues>({
    resolver: zodResolver(amenityFormSchema),
    defaultValues,
  })

  const loadAmenities = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAmenitiesAPI()
      setAmenities(data)
    } catch (error) {
      notifyError(readApiError(error, 'Unable to load amenities'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!ignore) await loadAmenities()
    }
    void load()
    return () => {
      ignore = true
    }
  }, [loadAmenities])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return amenities
    return amenities.filter(
      (a) => a.name.toLowerCase().includes(term) || (a.description || '').toLowerCase().includes(term),
    )
  }, [amenities, searchTerm])

  const availableSuggestions = useMemo(() => {
    const taken = new Set(amenities.map((a) => a.name.trim().toLowerCase()))
    return AMENITY_SUGGESTIONS.filter((name) => !taken.has(name.toLowerCase()))
  }, [amenities])

  const handleOpenCreate = () => {
    setEditing(null)
    setErrorMsg('')
    reset(defaultValues)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (amenity: Amenity) => {
    setEditing(amenity)
    setErrorMsg('')
    reset({
      name: amenity.name,
      description: amenity.description || '',
    })
    setIsModalOpen(true)
  }

  const onSubmit = async (values: AmenityFormValues) => {
    setSaving(true)
    setErrorMsg('')
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
    }

    try {
      if (editing) {
        await updateAmenityAPI(editing.id, payload)
        notifySuccess('Amenity updated')
      } else {
        await createAmenityAPI(payload)
        notifySuccess('Amenity created')
      }
      setIsModalOpen(false)
      await loadAmenities()
    } catch (error) {
      setErrorMsg(readApiError(error, 'Could not save the amenity'))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (amenity: Amenity) => {
    try {
      await updateAmenityStatusAPI(amenity.id, !amenity.isActive)
      notifySuccess(amenity.isActive ? 'Amenity deactivated' : 'Amenity activated')
      await loadAmenities()
    } catch (error) {
      notifyError(readApiError(error, 'Could not update status'))
    }
  }

  const handleDelete = async (amenity: Amenity) => {
    const confirmed = window.confirm(`Delete "${amenity.name}"?`)
    if (!confirmed) return

    try {
      await deleteAmenityAPI(amenity.id)
      notifySuccess('Amenity deleted')
      await loadAmenities()
    } catch (error) {
      notifyError(readApiError(error, 'Could not delete amenity'))
    }
  }

  const columns = useMemo<ColumnDef<Amenity>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Amenity',
        cell: ({ row }) => (
          <div className="min-w-[220px]">
            <p className="text-sm font-semibold text-gray-900">{row.original.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{row.original.description || 'No description'}</p>
          </div>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => handleToggleStatus(row.original)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
              row.original.isActive
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title={row.original.isActive ? 'Click to deactivate' : 'Click to activate'}
          >
            {row.original.isActive ? 'Active' : 'Inactive'}
          </button>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => handleOpenEdit(row.original)}
              className="p-2 rounded-lg text-[#005390] hover:bg-blue-50 transition-colors cursor-pointer"
              title="Edit amenity"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row.original)}
              className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Delete amenity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search amenities by name or description"
          className="sm:max-w-sm"
        />
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#005390] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#004274]"
        >
          <Plus className="h-4 w-4" /> Add Amenity
        </button>
      </div>

      <DataTable columns={columns} data={filtered} isLoading={loading} pageSize={10} />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <h3 className="text-sm font-bold text-gray-900">{editing ? 'Edit Amenity' : 'Create Amenity'}</h3>
              <button
                type="button"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="space-y-4 px-5 py-4" onSubmit={handleSubmit(onSubmit)}>
              {errorMsg ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {errorMsg}
                </div>
              ) : null}

              <div className="grid gap-4">
                <div>
                  <label
                    htmlFor="amenity-name"
                    className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600"
                  >
                    Amenity Name *
                  </label>
                  <Input id="amenity-name" {...register('name')} placeholder="e.g. Swimming Pool" />
                  {errors.name && <p className="mt-1 text-[11px] font-medium text-rose-600">{errors.name.message}</p>}
                </div>
              </div>

              <div>
                <label
                  htmlFor="amenity-description"
                  className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600"
                >
                  Description
                </label>
                <textarea
                  id="amenity-description"
                  {...register('description')}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20"
                  placeholder="Optional details for admins and staff"
                />
                {errors.description && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600">{errors.description.message}</p>
                )}
              </div>

              {!editing && availableSuggestions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Quick suggestions</p>
                  <div className="flex flex-wrap gap-2">
                    {availableSuggestions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setValue('name', item, { shouldValidate: true })}
                        className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:border-[#005390]/30 hover:bg-[#005390]/10 hover:text-[#005390]"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#005390] px-4 py-2 text-xs font-bold text-white hover:bg-[#004274] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editing ? 'Update Amenity' : 'Create Amenity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
