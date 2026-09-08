import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
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
  Clock,
  CalendarDays,
  Sparkles,
} from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import {
  useCareTasksQuery,
  useCreateCareTaskMutation,
  useUpdateCareTaskMutation,
  useDeleteCareTaskMutation,
} from '@/hooks/react-query/medical'
import type { CareTask, PriceOption, Task } from '@/lib/types/medical'
import { notifyError, notifySuccess } from '@/utils/toast'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { z } from 'zod'

export type { PriceOption, CareTask, Task }

export interface TasksTabProps {
  isPropertyMode?: boolean
  forcedPropertyId?: string | null
}

const careTaskFormSchema = z.object({
  careTaskName: z.string().trim().min(1, 'Care Task Name is required').max(255),
  careTaskDescription: z.string().trim().optional(),
  dailyRate: z.union([z.number(), z.string()]).optional().nullable(),
  monthlyRate: z.union([z.number(), z.string()]).optional().nullable(),
  sessionRate: z.union([z.number(), z.string()]).optional().nullable(),
  careTaskImage: z.string().optional().nullable(),
  propertyId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

type CareTaskFormValues = z.infer<typeof careTaskFormSchema>

const defaultFormValues: CareTaskFormValues = {
  careTaskName: '',
  careTaskDescription: '',
  dailyRate: 0,
  monthlyRate: 0,
  sessionRate: 0,
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
    reset,
    formState: { errors },
  } = useForm<CareTaskFormValues>({
    resolver: zodResolver(careTaskFormSchema),
    defaultValues: defaultFormValues,
  })

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
      setEditingTask(task)
      setImageFile(null)
      setImagePreviewUrl(task.careTaskImage || '')
      setErrorMsg('')
      reset({
        careTaskName: task.careTaskName,
        careTaskDescription: task.careTaskDescription || '',
        dailyRate: task.dailyRate ?? 0,
        monthlyRate: task.monthlyRate ?? 0,
        sessionRate: task.sessionRate ?? 0,
      })
      setIsModalOpen(true)
    },
    [reset],
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

      formData.append('dailyRate', String(parseNum(data.dailyRate)))
      formData.append('monthlyRate', String(parseNum(data.monthlyRate)))
      formData.append('sessionRate', String(parseNum(data.sessionRate)))

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
  const handleOpenDelete = useCallback((task: CareTask) => {
    setTaskToDelete(task)
    setIsDeleteModalOpen(true)
  }, [])

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
        accessorKey: 'dailyRate',
        header: 'Daily Rate',
        cell: ({ row }) => {
          const rate = Number(row.original.dailyRate) || 0
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200/60 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-sky-600" />₹{rate.toLocaleString('en-IN')}
              <span className="text-[10px] text-sky-500 font-normal">/day</span>
            </span>
          )
        },
      },
      {
        accessorKey: 'monthlyRate',
        header: 'Monthly Rate',
        cell: ({ row }) => {
          const rate = Number(row.original.monthlyRate) || 0
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-2xs">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />₹{rate.toLocaleString('en-IN')}
              <span className="text-[10px] text-indigo-500 font-normal">/mo</span>
            </span>
          )
        },
      },
      {
        accessorKey: 'sessionRate',
        header: 'Session Wise',
        cell: ({ row }) => {
          const rate = Number(row.original.sessionRate) || 0
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />₹{rate.toLocaleString('en-IN')}
              <span className="text-[10px] text-amber-500 font-normal">/session</span>
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
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenEdit(row.original)}
              className="p-1.5 rounded-lg text-[#005390] hover:bg-blue-50 transition-colors cursor-pointer"
              title="Edit Care Task"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenDelete(row.original)}
              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Delete Care Task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [handleOpenEdit, handleOpenDelete],
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
                    Configure task details and set prices for all 3 categories simultaneously.
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

              {/* 3. Pricing Configuration (Enter rates for all applicable categories) * */}
              <div>
                <span className="block text-xs font-bold text-gray-700 mb-1.5">
                  3. Pricing Configuration (Enter rates for all applicable categories){' '}
                  <span className="text-rose-500">*</span>
                </span>
                <div className="grid grid-cols-3 gap-3">
                  {/* Daily Rate */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors shadow-2xs">
                    <div className="flex items-center gap-1.5 mb-2 text-gray-700">
                      <Clock className="w-4 h-4 text-sky-600" />
                      <span className="text-xs font-bold text-gray-800">Daily Rate</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        {...register('dailyRate')}
                        placeholder="0"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-900 placeholder:text-gray-400 focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20"
                      />
                    </div>
                  </div>

                  {/* Monthly Rate */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors shadow-2xs">
                    <div className="flex items-center gap-1.5 mb-2 text-gray-700">
                      <CalendarDays className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-bold text-gray-800">Monthly Rate</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        {...register('monthlyRate')}
                        placeholder="0"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-900 placeholder:text-gray-400 focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20"
                      />
                    </div>
                  </div>

                  {/* Session Wise */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors shadow-2xs">
                    <div className="flex items-center gap-1.5 mb-2 text-gray-700">
                      <Sparkles className="w-4 h-4 text-cyan-600" />
                      <span className="text-xs font-bold text-gray-800">Session Wise</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        {...register('sessionRate')}
                        placeholder="0"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-900 placeholder:text-gray-400 focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20"
                      />
                    </div>
                  </div>
                </div>
                {(errors.dailyRate || errors.monthlyRate || errors.sessionRate) && (
                  <p className="text-[11px] text-rose-500 mt-1">
                    {errors.dailyRate?.message || errors.monthlyRate?.message || errors.sessionRate?.message}
                  </p>
                )}
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
