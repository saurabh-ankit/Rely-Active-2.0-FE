import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Search,
  X,
  HeartHandshake,
  Upload,
  ImageIcon,
  Building2,
  CalendarDays,
  Sparkles,
  Lock,
} from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import {
  useCareTasksQuery,
  useCreateCareTaskMutation,
  useUpdateCareTaskMutation,
  useDeleteCareTaskMutation,
} from '@/hooks/react-query/medical'
import type { CareTask, BillingType, Task } from '@/lib/types/medical'
import { notifyError, notifySuccess } from '@/utils/toast'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { z } from 'zod'

export type { BillingType, CareTask, Task }

export interface TasksTabProps {
  isPropertyMode?: boolean
  forcedPropertyId?: string | null
}

const careTaskFormSchema = z.object({
  careTaskName: z.string().trim().min(1, 'Care Task Name is required').max(255),
  careTaskDescription: z.string().trim().optional(),
  billingType: z.enum(['MONTHLY', 'SESSION'], {
    message: 'Billing Type is mandatory (MONTHLY or SESSION)',
  }),
  price: z.union([z.number(), z.string()]).refine(
    (val) => {
      const n = Number(val)
      return !isNaN(n) && n >= 0
    },
    { message: 'Price must be 0 or greater' },
  ),
  careTaskImage: z.string().optional().nullable(),
  propertyId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

type CareTaskFormValues = z.infer<typeof careTaskFormSchema>

const defaultFormValues: CareTaskFormValues = {
  careTaskName: '',
  careTaskDescription: '',
  billingType: 'MONTHLY',
  price: 0,
}

const fieldInputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20'

export const TasksTab: React.FC<TasksTabProps> = ({ isPropertyMode = false, forcedPropertyId = null }) => {
  const { selectedLocationId, selectedLocationName } = useLocationContext()
  const effectivePropertyId = forcedPropertyId || selectedLocationId

  const [errorMsg, setErrorMsg] = useState('')

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // React Query: Fetch care tasks
  const queryParams = useMemo(() => {
    return {
      page: currentPage,
      limit: pageSize,
      search: debouncedSearch.trim() || undefined,
      propertyId: isPropertyMode && effectivePropertyId ? effectivePropertyId : undefined,
      includeGlobal: isPropertyMode && effectivePropertyId ? true : undefined,
    }
  }, [currentPage, pageSize, debouncedSearch, isPropertyMode, effectivePropertyId])

  const { data: queryResult, isLoading } = useCareTasksQuery(queryParams)

  const careTasks = useMemo(() => {
    const raw = queryResult?.data || []
    return Array.isArray(raw) ? raw : []
  }, [queryResult])

  const pagination = useMemo(() => {
    if (queryResult?.pagination) {
      return queryResult.pagination
    }
    return {
      total: careTasks.length,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(careTasks.length / pageSize) || 0,
    }
  }, [queryResult, careTasks.length, currentPage, pageSize])

  // React Query Mutations
  const createCareTaskMutation = useCreateCareTaskMutation()
  const updateCareTaskMutation = useUpdateCareTaskMutation()
  const deleteCareTaskMutation = useDeleteCareTaskMutation()

  const isSubmitting = createCareTaskMutation.isPending || updateCareTaskMutation.isPending
  const isDeleting = deleteCareTaskMutation.isPending

  const isTaskAssigned = useCallback((task: CareTask) => {
    return Boolean(task.isAssigned)
  }, [])

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<CareTask | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('')

  // Delete Confirmation Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<CareTask | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<CareTaskFormValues>({
    resolver: zodResolver(careTaskFormSchema),
    defaultValues: defaultFormValues,
  })

  const watchBillingType = useWatch({ control, name: 'billingType' }) || 'MONTHLY'

  // Modal Handlers
  const handleOpenCreate = () => {
    setEditingTask(null)
    setImageFile(null)
    setImagePreviewUrl('')
    setErrorMsg('')
    reset({
      ...defaultFormValues,
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = useCallback(
    (task: CareTask) => {
      if (isTaskAssigned(task)) {
        notifyError('Notice', 'Cannot edit this care task because it is already assigned to residents.')
        return
      }
      setEditingTask(task)
      setImageFile(null)
      setImagePreviewUrl(task.careTaskImage || '')
      setErrorMsg('')
      const rawB = String(task.billingType || '').toUpperCase()
      const bType: 'MONTHLY' | 'SESSION' = rawB.startsWith('SESS') ? 'SESSION' : 'MONTHLY'
      const price = Number(task.price ?? 0)
      reset({
        careTaskName: task.careTaskName,
        careTaskDescription: task.careTaskDescription || '',
        billingType: bType,
        price,
      })
      setIsModalOpen(true)
    },
    [reset, isTaskAssigned],
  )

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        notifyError('File too large', 'Please select an image smaller than 10MB')
        return
      }
      setImageFile(file)
      setImagePreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreviewUrl('')
  }

  const handleFormSubmit = async (data: CareTaskFormValues) => {
    try {
      setErrorMsg('')

      const formData = new FormData()
      formData.append('careTaskName', data.careTaskName.trim())
      if (data.careTaskDescription) {
        formData.append('careTaskDescription', data.careTaskDescription.trim())
      }

      const parseNum = (val: unknown) => {
        if (val === undefined || val === null || val === '') return 0
        const n = Number(val)
        return isNaN(n) || n < 0 ? 0 : n
      }

      const priceVal = parseNum(data.price)
      formData.append('billingType', data.billingType)
      formData.append('price', String(priceVal))

      if (imageFile) {
        formData.append('careTaskImage', imageFile)
      } else if (imagePreviewUrl) {
        formData.append('careTaskImage', imagePreviewUrl)
      } else {
        formData.append('careTaskImage', '')
      }

      if (isPropertyMode) {
        formData.append('propertyId', effectivePropertyId || '')
      }

      if (editingTask) {
        await updateCareTaskMutation.mutateAsync({
          id: editingTask.id,
          formData,
        })
        notifySuccess('Care Task updated successfully!')
        setIsModalOpen(false)
      } else {
        await createCareTaskMutation.mutateAsync(formData)
        notifySuccess('Care Task created successfully!')
        setIsModalOpen(false)
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      const message = axiosErr?.response?.data?.message || (err instanceof Error ? err.message : 'Operation failed')
      setErrorMsg(message)
      notifyError('Failed to Save Care Task', message)
    }
  }

  // Delete Handlers
  const handleOpenDelete = useCallback(
    (task: CareTask) => {
      if (isTaskAssigned(task)) {
        notifyError('Notice', 'Cannot delete this care task because it is already assigned to residents.')
        return
      }
      setTaskToDelete(task)
      setIsDeleteModalOpen(true)
    },
    [isTaskAssigned],
  )

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return
    try {
      await deleteCareTaskMutation.mutateAsync(taskToDelete.id)
      notifySuccess('Care Task deleted successfully!')
      setIsDeleteModalOpen(false)
      setTaskToDelete(null)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      const message = axiosErr?.response?.data?.message || (err instanceof Error ? err.message : 'Delete failed')
      notifyError('Failed to Delete', message)
    }
  }

  // Columns definition
  const columns = useMemo<ColumnDef<CareTask>[]>(
    () => [
      {
        accessorKey: 'careTaskName',
        header: 'Care Task',
        cell: ({ row }) => {
          const task = row.original
          return (
            <div className="flex items-center gap-3 py-1">
              {task.careTaskImage ? (
                <img
                  src={task.careTaskImage}
                  alt={task.careTaskName}
                  className="w-9 h-9 rounded-xl object-cover shrink-0 border border-gray-200 shadow-xs"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-[#005390] border border-blue-100">
                  <HeartHandshake className="w-4 h-4" />
                </div>
              )}
              <span className="font-bold text-gray-900 text-xs">{task.careTaskName}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'careTaskDescription',
        header: 'Description',
        cell: ({ row }) => {
          const desc = row.original.careTaskDescription
          if (!desc) {
            return <span className="text-gray-400 text-xs italic">—</span>
          }
          return (
            <p className="text-xs text-gray-600 line-clamp-2 max-w-xs" title={desc}>
              {desc}
            </p>
          )
        },
      },
      {
        accessorKey: 'billingType',
        header: 'Billing Type',
        cell: ({ row }) => {
          const rawB = String(row.original.billingType || 'MONTHLY').toUpperCase()
          const isSession = rawB.startsWith('SESS')
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                isSession
                  ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200/60'
              }`}
            >
              {isSession ? (
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
              )}
              {isSession ? 'SESSION' : 'MONTHLY'}
            </span>
          )
        },
      },
      {
        accessorKey: 'price',
        header: 'Rate / Price',
        cell: ({ row }) => {
          const task = row.original
          const rawB = String(task.billingType || 'MONTHLY').toUpperCase()
          const isSession = rawB.startsWith('SESS')
          const rate = Number(task.price ?? 0)
          return (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-900">
              ₹{rate.toLocaleString('en-IN')}
              <span className="text-[10px] text-gray-400 font-normal">{isSession ? '/session' : '/mo'}</span>
            </span>
          )
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              row.original.isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${row.original.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            {row.original.isActive ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const task = row.original
          const isAssigned = isTaskAssigned(task)

          if (isAssigned) {
            return (
              <div className="flex items-center justify-end">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200/80 cursor-default select-none dark:bg-slate-800 dark:border-gray-700 dark:text-gray-400"
                  title="This care task is already assigned to residents. Editing and deletion are disabled."
                >
                  <Lock className="w-3 h-3 text-gray-400" />
                  Assigned
                </span>
              </div>
            )
          }

          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => handleOpenEdit(task)}
                className="p-1.5 rounded-lg text-[#005390] hover:bg-blue-50 transition-colors cursor-pointer dark:hover:bg-sky-950/40"
                title="Edit Care Task"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleOpenDelete(task)}
                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer dark:hover:bg-rose-950/40"
                title="Delete Care Task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        },
      },
    ],
    [handleOpenEdit, handleOpenDelete, isTaskAssigned],
  )

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#005390]/10 text-[#005390]">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Care Tasks</h2>
              {isPropertyMode && selectedLocationName && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Building2 className="w-3 h-3 text-emerald-600" />
                  {selectedLocationName}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isPropertyMode
                ? `Configure and manage Care Tasks for ${selectedLocationName || 'this property'}.`
                : 'Configure and manage Care Tasks with multi-tier pricing and images.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#005390] text-white text-xs font-bold shadow-md hover:bg-[#004170] transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Care Task
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search care tasks by name, description..."
            className="pl-9 h-10 text-xs bg-white rounded-xl border-gray-200"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="font-semibold">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-[#005390] focus:outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-3xl p-5 shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-[#005390] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-gray-500 font-medium">Loading care tasks...</p>
          </div>
        ) : careTasks.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3 border border-gray-100">
              <HeartHandshake className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">No Care Tasks Found</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              {searchQuery ? 'Try adjusting your search terms.' : 'Get started by creating your first Care Task.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#005390] text-white text-xs font-bold hover:bg-[#004170] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Create Care Task
              </button>
            )}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={careTasks}
            isLoading={isLoading}
            manualPagination={true}
            pageCount={pagination.totalPages}
            pageIndex={currentPage - 1}
            onPageChange={(newPageIndex) => setCurrentPage(newPageIndex + 1)}
            totalCount={pagination.total}
            pageSize={pageSize}
          />
        )}
      </div>

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in fade-in duration-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#005390]/10 text-[#005390]">
                  {editingTask ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    {editingTask ? 'Edit Care Task' : 'Create Care Task'}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Configure task details, select billing type (Monthly or Session), and set task rate.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit(handleFormSubmit)} className="p-5 space-y-4 overflow-y-auto flex-1">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Care Task Name (Required) */}
              <div>
                <label htmlFor="careTaskName" className="block text-xs font-bold text-gray-700 mb-1">
                  1. Care Task Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="careTaskName"
                  type="text"
                  {...register('careTaskName')}
                  placeholder="e.g. Wound Dressing, Vital Monitoring, Mobility Support"
                  className={fieldInputClass}
                />
                {errors.careTaskName && <p className="text-[11px] text-rose-500 mt-1">{errors.careTaskName.message}</p>}
              </div>

              {/* 2. Care Task Description (Optional) */}
              <div>
                <label htmlFor="careTaskDescription" className="block text-xs font-bold text-gray-700 mb-1">
                  2. Care Task Description <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  id="careTaskDescription"
                  {...register('careTaskDescription')}
                  rows={3}
                  placeholder="Provide instructions, protocol notes, or care guidelines for staff executing this task..."
                  className={fieldInputClass}
                />
              </div>

              {/* 3. Billing Type & Pricing Configuration (Mandatory Billing Type & Price) */}
              <div>
                <span className="block text-xs font-bold text-gray-700 mb-1">
                  3. Billing Type & Rate Configuration <span className="text-rose-500">*</span>
                </span>
                <p className="text-[11px] text-gray-500 mb-2.5">
                  Select the billing frequency model. One of them is mandatory.
                </p>

                {/* Billing Type Toggle Selection */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Monthly */}
                  <button
                    type="button"
                    onClick={() => setValue('billingType', 'MONTHLY')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      watchBillingType === 'MONTHLY'
                        ? 'border-[#005390] bg-blue-50/50 ring-2 ring-[#005390]/20 shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        watchBillingType === 'MONTHLY' ? 'bg-[#005390] text-white' : 'bg-indigo-50 text-indigo-600'
                      }`}
                    >
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900">Monthly</span>
                        {watchBillingType === 'MONTHLY' && <span className="w-2 h-2 rounded-full bg-[#005390]" />}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">Fixed recurring monthly charge</p>
                    </div>
                  </button>

                  {/* Session */}
                  <button
                    type="button"
                    onClick={() => setValue('billingType', 'SESSION')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      watchBillingType === 'SESSION'
                        ? 'border-[#005390] bg-blue-50/50 ring-2 ring-[#005390]/20 shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        watchBillingType === 'SESSION' ? 'bg-[#005390] text-white' : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900">Session</span>
                        {watchBillingType === 'SESSION' && <span className="w-2 h-2 rounded-full bg-[#005390]" />}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">Pay per completed session</p>
                    </div>
                  </button>
                </div>
                {errors.billingType && (
                  <p className="text-[11px] text-rose-500 mb-2 font-medium">{errors.billingType.message}</p>
                )}

                {/* Price Input */}
                <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-3.5">
                  <label htmlFor="care-task-price" className="block text-xs font-bold text-gray-800 mb-1.5">
                    {watchBillingType === 'SESSION' ? 'Session Rate (₹)' : 'Monthly Rate (₹)'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                      ₹
                    </span>
                    <input
                      id="care-task-price"
                      type="number"
                      min="0"
                      step="0.01"
                      {...register('price')}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-gray-200 bg-white pl-8 pr-20 py-2.5 text-xs font-bold text-gray-900 placeholder:text-gray-400 focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400">
                      {watchBillingType === 'SESSION' ? '/session' : '/month'}
                    </span>
                  </div>
                  {errors.price && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.price.message}</p>}
                </div>
              </div>

              {/* 4. Task Image (Optional) */}
              <div>
                <label htmlFor="care-task-image-input" className="block text-xs font-bold text-gray-700 mb-1">
                  4. Task Image <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="flex items-center gap-3.5 border border-gray-200 rounded-2xl p-3 bg-gray-50/50">
                  {imagePreviewUrl ? (
                    <div className="relative group shrink-0">
                      <img
                        src={imagePreviewUrl}
                        alt="Care Task Preview"
                        className="w-14 h-14 rounded-xl object-cover border border-gray-200 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-1 shadow-sm hover:bg-rose-600 transition-colors cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center border border-gray-200 shrink-0">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      id="care-task-image-input"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="care-task-image-input"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#005390]" />
                      {imageFile || imagePreviewUrl ? 'Change Image' : 'Choose Image'}
                    </label>
                    <p className="text-[11px] text-gray-400">PNG, JPG, WEBP up to 10MB.</p>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#005390] text-white text-xs font-bold shadow-md hover:bg-[#004170] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {editingTask ? 'Save Changes' : 'Create Care Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden p-6 text-center animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Delete Care Task?</h3>
            <p className="text-xs text-gray-500 mt-1">
              Are you sure you want to delete{' '}
              <strong className="text-gray-800 font-semibold">{taskToDelete.careTaskName}</strong>?
            </p>

            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Delete Care Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TasksTab
