import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertCircle, Edit2, FlaskConical, Plus, Trash2, Upload, X } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { notifyError, notifySuccess } from '@/utils/toast'
import {
  createLabTestSettingAPI,
  deleteLabTestSettingAPI,
  getLabTestSettingsAPI,
  updateLabTestSettingAPI,
} from '@/lib/services/labTestSettingService'
import type { CreateLabTestSettingRequest, LabTestSetting } from '@/lib/types/labTestSetting'

interface LabTestFormState {
  name: string
  description: string
  instructions: string
  imageUrl: string
}

const defaultFormData: LabTestFormState = {
  name: '',
  description: '',
  instructions: '',
  imageUrl: '',
}

const readApiError = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string } }; message?: string }
  return err?.response?.data?.message || err?.message || fallback
}

export function LabTestsTab() {
  const [labTests, setLabTests] = useState<LabTestSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<LabTestSetting | null>(null)
  const [formData, setFormData] = useState<LabTestFormState>(defaultFormData)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadLabTests = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getLabTestSettingsAPI({ limit: 100 })
      setLabTests(result.data)
    } catch (error) {
      notifyError(readApiError(error, 'Could not load lab test settings'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    void loadLabTests()
  }, [loadLabTests])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return labTests
    return labTests.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.instructions?.toLowerCase().includes(term),
    )
  }, [labTests, searchTerm])

  const resetForm = () => {
    setFormData(defaultFormData)
    setImageFile(null)
    setImagePreview('')
    setErrorMsg('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenCreate = () => {
    setEditing(null)
    resetForm()
    setIsModalOpen(true)
  }

  const handleOpenEdit = (labTest: LabTestSetting) => {
    setEditing(labTest)
    setFormData({
      name: labTest.name || '',
      description: labTest.description || '',
      instructions: labTest.instructions || '',
      imageUrl: labTest.imageUrl || '',
    })
    setImagePreview(labTest.imageUrl || '')
    setImageFile(null)
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const url = URL.createObjectURL(file)
    setImagePreview(url)
    setFormData((prev) => ({ ...prev, imageUrl: url }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!formData.name.trim()) {
      setErrorMsg('Name is required')
      return
    }
    if (!formData.description.trim()) {
      setErrorMsg('Description is required')
      return
    }

    setSaving(true)
    try {
      if (imageFile) {
        const fd = new FormData()
        fd.append('name', formData.name.trim())
        fd.append('description', formData.description.trim())
        fd.append('instructions', formData.instructions.trim())
        fd.append('image', imageFile)
        if (editing) {
          await updateLabTestSettingAPI(editing.id, fd)
          notifySuccess('Lab test updated')
        } else {
          await createLabTestSettingAPI(fd)
          notifySuccess('Lab test created')
        }
      } else {
        const payload: CreateLabTestSettingRequest = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          instructions: formData.instructions.trim() || null,
          imageUrl: formData.imageUrl && !formData.imageUrl.startsWith('blob:') ? formData.imageUrl : null,
        }
        if (editing) {
          await updateLabTestSettingAPI(editing.id, payload)
          notifySuccess('Lab test updated')
        } else {
          await createLabTestSettingAPI(payload)
          notifySuccess('Lab test created')
        }
      }

      setIsModalOpen(false)
      resetForm()
      setEditing(null)
      await loadLabTests()
    } catch (error) {
      setErrorMsg(readApiError(error, 'Could not save the lab test'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (labTest: LabTestSetting) => {
    const confirmed = window.confirm(`Delete "${labTest.name}"? This cannot be undone.`)
    if (!confirmed) return
    try {
      await deleteLabTestSettingAPI(labTest.id)
      notifySuccess('Lab test deleted')
      await loadLabTests()
    } catch (error) {
      notifyError(readApiError(error, 'Could not delete the lab test'))
    }
  }

  const columns = useMemo<ColumnDef<LabTestSetting>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Lab Test',
        cell: ({ row }) => (
          <div className="flex items-center gap-3 min-w-[220px]">
            {row.original.imageUrl ? (
              <img
                src={row.original.imageUrl}
                alt={row.original.name}
                className="w-9 h-9 rounded-lg object-cover border border-gray-100"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <FlaskConical className="w-4 h-4 text-[#005390]" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-900">{row.original.name}</p>
              {row.original.description ? (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{row.original.description}</p>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'instructions',
        header: 'Instructions',
        cell: ({ row }) => (
          <span className="text-xs text-gray-600 line-clamp-2 max-w-[280px]">{row.original.instructions || '—'}</span>
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
              title="Edit lab test"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row.original)}
              className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Delete lab test"
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#005390]" /> Lab Tests
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Create and manage lab test configurations.
            {labTests.length > 0 ? ` ${labTests.length} lab test${labTests.length === 1 ? '' : 's'} configured.` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#005390] hover:bg-[#004070] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Lab Test
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={loading}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search lab tests by name or description..."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 relative my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{editing ? 'Edit Lab Test' : 'Add New Lab Test'}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {editing ? 'Update this lab test configuration.' : 'Create a new lab test configuration.'}
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

            <form onSubmit={onSubmit} noValidate className="space-y-5 overflow-y-auto px-1 flex-1">
              <Input
                id="lab-test-name"
                label="Name *"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Blood Test"
                className="text-sm"
              />

              <div>
                <label htmlFor="lab-test-description" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Description *
                </label>
                <textarea
                  id="lab-test-description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this lab report measures"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#005390]/30 focus:border-[#005390]"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-gray-700 mb-1.5">Icon</span>
                <div className="flex items-center gap-4 p-3 rounded-xl border border-gray-200 bg-gray-50">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Lab test icon"
                      className="w-14 h-14 rounded-lg object-cover border border-gray-200 bg-white"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                      <FlaskConical className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:border-[#005390] hover:text-[#005390] transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Image
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <p className="text-[10px] text-gray-400 mt-1">PNG or JPG up to 10MB</p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="lab-test-instructions" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Instructions
                </label>
                <textarea
                  id="lab-test-instructions"
                  rows={3}
                  value={formData.instructions}
                  onChange={(e) => setFormData((prev) => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Special test instructions"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#005390]/30 focus:border-[#005390]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-[#005390] hover:bg-[#004070] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {saving ? (editing ? 'Updating...' : 'Creating...') : editing ? 'Update Lab Test' : 'Create Lab Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
