import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Activity, AlertCircle, Edit2, Plus, Trash2, Upload, X } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { notifyError, notifySuccess } from '@/utils/toast'
import {
  createVitalSettingAPI,
  deleteVitalSettingAPI,
  getVitalSettingsAPI,
  updateVitalSettingAPI,
} from '@/lib/services/vitalSettingService'
import type { CreateVitalSettingRequest, VitalInputType, VitalSetting } from '@/lib/types/vitalSetting'

type ThresholdField = 'lowRiskyBelow' | 'lowBelow' | 'normalMin' | 'normalMax' | 'highAbove' | 'highRiskyAbove'

interface VitalFormState {
  name: string
  description: string
  imageUrl: string
  unit: string
  inputType: VitalInputType
  lowRiskyBelow: string
  lowBelow: string
  normalMin: string
  normalMax: string
  highAbove: string
  highRiskyAbove: string
}

const DEFAULT_ICON =
  'https://reverelycrm.s3.ap-south-1.amazonaws.com/a05a2f40-5c05-41bd-8b8a-45631465aff2/WightCheck.png'

const defaultFormData: VitalFormState = {
  name: '',
  description: '',
  imageUrl: DEFAULT_ICON,
  unit: '',
  inputType: 'single',
  lowRiskyBelow: '',
  lowBelow: '',
  normalMin: '',
  normalMax: '',
  highAbove: '',
  highRiskyAbove: '',
}

const PREDEFINED_VITALS = [
  {
    name: 'Body Temperature',
    unit: '°F',
    imageUrl: 'https://reverelycrm.s3.ap-south-1.amazonaws.com/cbe35a57-584c-4a73-95fb-0ff844c0162f/temp.png',
  },
  {
    name: 'Heart Rate',
    unit: 'bpm',
    imageUrl: 'https://reverelycrm.s3.ap-south-1.amazonaws.com/d0420936-e502-42dd-b249-6d2ea391f474/icon3.png',
  },
  {
    name: 'Blood Pressure',
    unit: 'mmHg',
    imageUrl: 'https://reverelycrm.s3.ap-south-1.amazonaws.com/e5c1867a-fb1a-48b4-ab66-80e2af31c75c/Bp.png',
  },
  {
    name: 'Respiratory Rate',
    unit: 'breaths/min',
    imageUrl: 'https://reverelycrm.s3.ap-south-1.amazonaws.com/a6aa0f44-e9cc-40ac-9c0e-ad69318a25b9/icon2.png',
  },
  {
    name: 'Oxygen Saturation',
    unit: '%',
    imageUrl: 'https://reverelycrm.s3.ap-south-1.amazonaws.com/7f34d120-5cb6-46c0-985d-7e04d9aa2a33/icon1.png',
  },
  {
    name: 'Blood Glucose Level',
    unit: 'mg/dL',
    imageUrl: 'https://reverelycrm.s3.ap-south-1.amazonaws.com/2a13d9dc-0c3b-49df-acd8-dd6d39796a0f/BloodSugar.png',
  },
  {
    name: 'Weight',
    unit: 'Kgs',
    imageUrl: 'https://reverelycrm.s3.ap-south-1.amazonaws.com/a05a2f40-5c05-41bd-8b8a-45631465aff2/WightCheck.png',
  },
  {
    name: 'Height',
    unit: 'cm',
    imageUrl:
      'https://reverelycrm.s3.ap-south-1.amazonaws.com/rely_assist/d7c7966b-3d01-439f-932a-bf90c7d59484/Height-Image-URL.jpg',
  },
  {
    name: 'Body Mass Index',
    unit: 'kg/m2',
    imageUrl: 'https://reverelycrm.s3.ap-south-1.amazonaws.com/013f5bec-da26-4bfe-ac26-5bea08b8eda7/completed.png',
  },
  {
    name: 'Pain Score',
    unit: '0-10',
    imageUrl:
      'https://reverelycrm.s3.ap-south-1.amazonaws.com/rely_assist/3e6d086f-1ab0-44f0-a6ac-a84eb6e9cb90/Pain%20-Scor.jpg',
  },
]

const THRESHOLD_FIELDS: ThresholdField[] = [
  'lowRiskyBelow',
  'highRiskyAbove',
  'lowBelow',
  'highAbove',
  'normalMin',
  'normalMax',
]

const PLACEHOLDERS: Record<ThresholdField, string> = {
  lowRiskyBelow: 'Low Risky',
  lowBelow: 'Low',
  normalMin: 'Min',
  normalMax: 'Max',
  highAbove: 'High',
  highRiskyAbove: 'High Risky',
}

const toNumericOrNull = (value: string): number | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

const getThresholdError = (formData: VitalFormState): string | null => {
  const values = [
    { val: toNumericOrNull(formData.lowRiskyBelow), label: 'Low risky' },
    { val: toNumericOrNull(formData.lowBelow), label: 'Low' },
    { val: toNumericOrNull(formData.normalMin), label: 'Normal min' },
    { val: toNumericOrNull(formData.normalMax), label: 'Normal max' },
    { val: toNumericOrNull(formData.highAbove), label: 'High' },
    { val: toNumericOrNull(formData.highRiskyAbove), label: 'High risky' },
  ].filter((v) => v.val !== null) as { val: number; label: string }[]

  for (let i = 0; i < values.length - 1; i++) {
    if (values[i].val >= values[i + 1].val) {
      return `${values[i].label} (${values[i].val}) must be less than ${values[i + 1].label} (${values[i + 1].val})`
    }
  }
  return null
}

const getThresholdSummary = (vital: VitalSetting) => {
  const parts: string[] = []
  if (vital.normalMin != null && vital.normalMax != null) {
    parts.push(`Normal: ${vital.normalMin}-${vital.normalMax}`)
  } else if (vital.normalMax != null) {
    parts.push(`Normal up to ${vital.normalMax}`)
  }
  if (vital.highRiskyAbove != null) parts.push(`Risky > ${vital.highRiskyAbove}`)
  if (vital.lowRiskyBelow != null) parts.push(`Risky < ${vital.lowRiskyBelow}`)
  return parts.length > 0 ? parts.join(' | ') : 'Thresholds not configured'
}

const getThresholdLabel = (field: ThresholdField, vitalName: string) => {
  const name = vitalName || 'Vital'
  switch (field) {
    case 'lowRiskyBelow':
      return `${name} becomes critically low under`
    case 'lowBelow':
      return `${name} becomes low under`
    case 'highAbove':
      return `${name} becomes high above`
    case 'highRiskyAbove':
      return `${name} becomes critically high above`
    case 'normalMin':
      return 'Normal Min'
    case 'normalMax':
      return 'Normal Max'
    default:
      return ''
  }
}

const readApiError = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string } }; message?: string }
  return err?.response?.data?.message || err?.message || fallback
}

const buildPayloadFields = (formData: VitalFormState) => ({
  lowRiskyBelow: toNumericOrNull(formData.lowRiskyBelow),
  lowBelow: toNumericOrNull(formData.lowBelow),
  normalMin: toNumericOrNull(formData.normalMin),
  normalMax: toNumericOrNull(formData.normalMax),
  highAbove: toNumericOrNull(formData.highAbove),
  highRiskyAbove: toNumericOrNull(formData.highRiskyAbove),
})

export function VitalsTab() {
  const [vitals, setVitals] = useState<VitalSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<VitalSetting | null>(null)
  const [formData, setFormData] = useState<VitalFormState>(defaultFormData)
  const [showPredefined, setShowPredefined] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(DEFAULT_ICON)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadVitals = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getVitalSettingsAPI({ limit: 100 })
      setVitals(result.data)
    } catch (error) {
      notifyError(readApiError(error, 'Unable to load vital settings'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    void loadVitals()
  }, [loadVitals])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return vitals
    return vitals.filter(
      (v) =>
        v.name.toLowerCase().includes(term) ||
        v.unit.toLowerCase().includes(term) ||
        (v.description || '').toLowerCase().includes(term),
    )
  }, [vitals, searchTerm])

  const availablePredefined = useMemo(() => {
    const taken = new Set(vitals.map((v) => v.name.trim().toLowerCase()))
    return PREDEFINED_VITALS.filter((p) => !taken.has(p.name.toLowerCase()))
  }, [vitals])

  const resetForm = () => {
    setFormData(defaultFormData)
    setImageFile(null)
    setImagePreview(DEFAULT_ICON)
    setShowPredefined(false)
    setErrorMsg('')
  }

  const handleOpenCreate = () => {
    setEditing(null)
    resetForm()
    setIsModalOpen(true)
  }

  const handleOpenEdit = (vital: VitalSetting) => {
    setEditing(vital)
    setErrorMsg('')
    setShowPredefined(false)
    setImageFile(null)
    setImagePreview(vital.imageUrl || DEFAULT_ICON)
    setFormData({
      name: vital.name,
      description: vital.description || '',
      imageUrl: vital.imageUrl || DEFAULT_ICON,
      unit: vital.unit || '',
      inputType: vital.inputType || 'single',
      lowRiskyBelow: vital.lowRiskyBelow?.toString() ?? '',
      lowBelow: vital.lowBelow?.toString() ?? '',
      normalMin: vital.normalMin?.toString() ?? '',
      normalMax: vital.normalMax?.toString() ?? '',
      highAbove: vital.highAbove?.toString() ?? '',
      highRiskyAbove: vital.highRiskyAbove?.toString() ?? '',
    })
    setIsModalOpen(true)
  }

  const handleSelectPredefined = (preset: (typeof PREDEFINED_VITALS)[0]) => {
    setFormData((prev) => ({
      ...prev,
      name: preset.name,
      unit: preset.unit,
      imageUrl: preset.imageUrl,
    }))
    setImagePreview(preset.imageUrl)
    setImageFile(null)
    setShowPredefined(false)
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
      setErrorMsg('Vital name is required')
      return
    }
    if (!formData.unit.trim()) {
      setErrorMsg('Unit is required')
      return
    }

    const thresholdError = getThresholdError(formData)
    if (thresholdError) {
      setErrorMsg(thresholdError)
      return
    }

    if (!imageFile && (!formData.imageUrl || formData.imageUrl.startsWith('blob:'))) {
      setErrorMsg('Please upload an image or choose a predefined vital')
      return
    }

    setSaving(true)
    try {
      const thresholdPayload = buildPayloadFields(formData)

      if (imageFile) {
        const fd = new FormData()
        fd.append('name', formData.name.trim())
        fd.append('description', formData.description.trim())
        fd.append('unit', formData.unit.trim())
        fd.append('inputType', formData.inputType)
        for (const [key, value] of Object.entries(thresholdPayload)) {
          fd.append(key, value === null ? '' : String(value))
        }
        fd.append('image', imageFile)
        if (editing) {
          await updateVitalSettingAPI(editing.id, fd)
          notifySuccess('Vital setting updated')
        } else {
          await createVitalSettingAPI(fd)
          notifySuccess('Vital setting created')
        }
      } else {
        const payload: CreateVitalSettingRequest = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          imageUrl: formData.imageUrl,
          unit: formData.unit.trim(),
          inputType: formData.inputType,
          ...thresholdPayload,
        }
        if (editing) {
          await updateVitalSettingAPI(editing.id, payload)
          notifySuccess('Vital setting updated')
        } else {
          await createVitalSettingAPI(payload)
          notifySuccess('Vital setting created')
        }
      }

      setIsModalOpen(false)
      resetForm()
      setEditing(null)
      await loadVitals()
    } catch (error) {
      setErrorMsg(readApiError(error, 'Could not save the vital setting'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (vital: VitalSetting) => {
    const confirmed = window.confirm(`Delete "${vital.name}"? This cannot be undone.`)
    if (!confirmed) return
    try {
      await deleteVitalSettingAPI(vital.id)
      notifySuccess('Vital setting deleted')
      await loadVitals()
    } catch (error) {
      notifyError(readApiError(error, 'Could not delete the vital setting'))
    }
  }

  const columns = useMemo<ColumnDef<VitalSetting>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Vital',
        cell: ({ row }) => (
          <div className="flex items-center gap-3 min-w-[200px]">
            {row.original.imageUrl ? (
              <img
                src={row.original.imageUrl}
                alt={row.original.name}
                className="w-9 h-9 rounded-lg object-cover border border-gray-100"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#005390]" />
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
        accessorKey: 'unit',
        header: 'Unit',
        cell: ({ row }) => (
          <span className="inline-flex px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-bold">
            {row.original.unit}
          </span>
        ),
      },
      {
        accessorKey: 'inputType',
        header: 'Type',
        cell: ({ row }) => (
          <span className="capitalize text-xs font-semibold text-gray-700">{row.original.inputType}</span>
        ),
      },
      {
        id: 'thresholds',
        header: 'Thresholds',
        cell: ({ row }) => <span className="text-xs text-gray-600">{getThresholdSummary(row.original)}</span>,
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
              title="Edit vital"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row.original)}
              className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Delete vital"
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
            <Activity className="w-5 h-5 text-[#005390]" /> Vital Settings
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Create and manage vitals for patient monitoring.
            {vitals.length > 0 ? ` ${vitals.length} vital${vitals.length === 1 ? '' : 's'} configured.` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#005390] hover:bg-[#004070] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Vital
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={loading}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search vitals by name or unit..."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 relative my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editing ? 'Edit Vital Setting' : 'Add New Vital Setting'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {editing ? 'Update existing vital configuration.' : 'Create a new vital for patient monitoring.'}
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
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="vital-name" className="block text-xs font-semibold text-gray-700">
                    Vital Name *
                  </label>
                  {!editing && (
                    <button
                      type="button"
                      onClick={() => setShowPredefined((v) => !v)}
                      className="text-[11px] font-bold text-[#005390] hover:underline cursor-pointer"
                    >
                      {showPredefined ? 'Hide Predefined' : 'Choose Predefined'}
                    </button>
                  )}
                </div>
                <Input
                  id="vital-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Body Temperature"
                  className="text-sm"
                />
                {showPredefined && availablePredefined.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {availablePredefined.map((preset) => (
                      <button
                        type="button"
                        key={preset.name}
                        onClick={() => handleSelectPredefined(preset)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                          formData.name === preset.name
                            ? 'bg-[#005390] border-[#005390] text-white'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-[#005390] hover:text-[#005390]'
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Input
                id="vital-unit"
                label="Unit *"
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                placeholder="e.g. °C"
                className="text-sm"
              />

              <div>
                <span className="block text-xs font-semibold text-gray-700 mb-1.5">Icon Image</span>
                <div className="flex items-center gap-4 p-3 rounded-xl border border-gray-200 bg-gray-50">
                  <img
                    src={imagePreview}
                    alt="Vital icon"
                    className="w-14 h-14 rounded-lg object-cover border border-gray-200 bg-white"
                  />
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
                <label htmlFor="vital-description" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  id="vital-description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this vital measures"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#005390]/30 focus:border-[#005390]"
                />
              </div>

              <div>
                <p className="block text-xs font-semibold text-gray-700 mb-1.5">Input Type</p>
                <div className="inline-flex rounded-xl border border-gray-200 p-1 bg-gray-50">
                  {(['single', 'composite'] as VitalInputType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, inputType: type }))}
                      className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                        formData.inputType === type
                          ? 'bg-[#005390] text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 space-y-3">
                <p className="text-xs font-bold text-gray-800">Thresholds</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {THRESHOLD_FIELDS.map((field) => (
                    <div key={field}>
                      <label
                        htmlFor={`vital-threshold-${field}`}
                        className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1"
                      >
                        {getThresholdLabel(field, formData.name)}
                      </label>
                      <input
                        id={`vital-threshold-${field}`}
                        type="number"
                        step="any"
                        value={formData[field]}
                        onChange={(e) => setFormData((prev) => ({ ...prev, [field]: e.target.value }))}
                        placeholder={PLACEHOLDERS[field]}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#005390]/30 focus:border-[#005390] bg-white"
                      />
                    </div>
                  ))}
                </div>
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
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Vital'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default VitalsTab
