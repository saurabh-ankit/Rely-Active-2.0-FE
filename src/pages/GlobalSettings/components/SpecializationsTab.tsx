import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Edit2, Plus, Stethoscope, Trash2, Users, X } from 'lucide-react'
import { z } from 'zod'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { notifyError, notifySuccess } from '@/utils/toast'
import {
  createSpecializationAPI,
  deleteSpecializationAPI,
  getSpecializationsAPI,
  updateSpecializationAPI,
  updateSpecializationStatusAPI,
  type Specialization,
} from '@/lib/services/specializationService'

const specializationFormSchema = z.object({
  name: z.string().trim().min(2, 'Specialization name is required'),
  code: z.string().trim().optional(),
  description: z.string().trim().max(500, 'Description must be 500 characters or fewer').optional(),
})

type SpecializationFormValues = z.infer<typeof specializationFormSchema>

const defaultValues: SpecializationFormValues = {
  name: '',
  code: '',
  description: '',
}

/** Quick-fill options for the create dialog; not stored until the admin saves one. */
const SPECIALIZATION_SUGGESTIONS = [
  'General Physician',
  'Cardiology',
  'Orthopaedics',
  'Dermatology',
  'Paediatrics',
  'Gynaecology',
  'Neurology',
  'Psychiatry',
  'Physiotherapy',
  'Dentistry',
  'Ophthalmology',
  'ENT',
  'Urology',
  'Pulmonology',
  'Endocrinology',
  'Nutrition & Dietetics',
]

const readApiError = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string } }; message?: string }
  return err?.response?.data?.message || err?.message || fallback
}

export function SpecializationsTab() {
  const [specializations, setSpecializations] = useState<Specialization[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<Specialization | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<SpecializationFormValues>({
    resolver: zodResolver(specializationFormSchema),
    defaultValues,
  })

  const loadSpecializations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSpecializationsAPI({ includeDoctorCount: true })
      setSpecializations(data)
    } catch (error) {
      notifyError(readApiError(error, 'Unable to load specializations'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!ignore) await loadSpecializations()
    }
    load()
    return () => {
      ignore = true
    }
  }, [loadSpecializations])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return specializations
    return specializations.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.code.toLowerCase().includes(term) ||
        (s.description || '').toLowerCase().includes(term),
    )
  }, [specializations, searchTerm])

  const currentName = useWatch({ control, name: 'name' })
  const availableSuggestions = useMemo(() => {
    const taken = new Set(specializations.map((s) => s.name.trim().toLowerCase()))
    return SPECIALIZATION_SUGGESTIONS.filter((name) => !taken.has(name.toLowerCase()))
  }, [specializations])

  const handleOpenCreate = () => {
    setEditing(null)
    setErrorMsg('')
    reset(defaultValues)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (specialization: Specialization) => {
    setEditing(specialization)
    setErrorMsg('')
    reset({
      name: specialization.name,
      code: specialization.code,
      description: specialization.description || '',
    })
    setIsModalOpen(true)
  }

  const onSubmit = async (values: SpecializationFormValues) => {
    setSaving(true)
    setErrorMsg('')
    const payload = {
      name: values.name.trim(),
      ...(values.code?.trim() ? { code: values.code.trim() } : {}),
      description: values.description?.trim() || undefined,
    }

    try {
      if (editing) {
        await updateSpecializationAPI(editing.id, payload)
        notifySuccess('Specialization updated')
      } else {
        await createSpecializationAPI(payload)
        notifySuccess('Specialization created')
      }
      setIsModalOpen(false)
      await loadSpecializations()
    } catch (error) {
      setErrorMsg(readApiError(error, 'Could not save the specialization'))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (specialization: Specialization) => {
    try {
      await updateSpecializationStatusAPI(specialization.id, !specialization.isActive)
      notifySuccess(specialization.isActive ? 'Specialization deactivated' : 'Specialization activated')
      await loadSpecializations()
    } catch (error) {
      notifyError(readApiError(error, 'Could not update the status'))
    }
  }

  const handleDelete = async (specialization: Specialization) => {
    const confirmed = window.confirm(
      `Delete "${specialization.name}"? Doctors can no longer be assigned this specialization.`,
    )
    if (!confirmed) return

    try {
      await deleteSpecializationAPI(specialization.id)
      notifySuccess('Specialization deleted')
      await loadSpecializations()
    } catch (error) {
      // The API refuses to delete while doctors still hold it.
      notifyError(readApiError(error, 'Could not delete the specialization'))
    }
  }

  const columns = useMemo<ColumnDef<Specialization>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Specialization',
        cell: ({ row }) => (
          <div className="min-w-[200px]">
            <p className="text-sm font-semibold text-gray-900">{row.original.name}</p>
            {row.original.description ? (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{row.original.description}</p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ row }) => (
          <span className="inline-flex px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-bold tracking-wide">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: 'doctorCount',
        header: 'Doctors',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <Users className="w-3.5 h-3.5 text-[#005390]" />
            {row.original.doctorCount ?? 0}
          </span>
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
              title="Edit specialization"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row.original)}
              className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Delete specialization"
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

  const activeCount = specializations.filter((s) => s.isActive).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-[#005390]" /> Doctor Specializations
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Manage the specializations used when assigning doctors to residents and booking appointment slots.
            {specializations.length > 0 ? ` ${activeCount} of ${specializations.length} active.` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#005390] hover:bg-[#004070] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Specialization
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={loading}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search specializations by name or code..."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-[#005390]" />
                  {editing ? 'Edit Specialization' : 'Add Specialization'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Doctors can hold more than one specialization from this list.
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

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 overflow-y-auto px-1 flex-1">
              <Input
                id="specialization-name-input"
                label="Specialization Name *"
                type="text"
                {...register('name')}
                error={errors.name?.message}
                placeholder="e.g. Cardiology"
                className="text-sm"
              />

              {!editing && availableSuggestions.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 mb-2">Common specializations</p>
                  <div className="flex flex-wrap gap-2">
                    {availableSuggestions.map((suggestion) => {
                      const selected = currentName?.trim().toLowerCase() === suggestion.toLowerCase()
                      return (
                        <button
                          type="button"
                          key={suggestion}
                          onClick={() => setValue('name', suggestion, { shouldValidate: true, shouldDirty: true })}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                            selected
                              ? 'bg-[#005390] border-[#005390] text-white'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-[#005390] hover:text-[#005390]'
                          }`}
                        >
                          {suggestion}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <Input
                id="specialization-code-input"
                label="Code"
                type="text"
                {...register('code')}
                error={errors.code?.message}
                placeholder="Leave blank to generate from the name"
                className="text-sm"
              />

              <div>
                <label
                  htmlFor="specialization-description-input"
                  className="block text-xs font-semibold text-gray-700 mb-1.5"
                >
                  Description
                </label>
                <textarea
                  id="specialization-description-input"
                  rows={3}
                  {...register('description')}
                  placeholder="What this specialization covers"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#005390]/30 focus:border-[#005390]"
                />
                {errors.description?.message && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.description.message}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#005390] hover:bg-[#004070] disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Specialization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SpecializationsTab
