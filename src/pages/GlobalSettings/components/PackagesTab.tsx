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
  Boxes,
  CalendarClock,
  ReceiptIndianRupee,
  Building2,
  CheckSquare,
  Gift,
  Minus,
  HeartHandshake,
} from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import {
  useCarePackagesQuery,
  useCreateCarePackageMutation,
  useUpdateCarePackageMutation,
  useDeleteCarePackageMutation,
  useCareTasksQuery,
} from '@/hooks/react-query/medical'
import type { CarePackage, PackageTaskItem, CareTask } from '@/lib/types/medical'
import { notifyError, notifySuccess } from '@/utils/toast'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { z } from 'zod'

export type Task = CareTask
export type Package = CarePackage
export type { PackageTaskItem }

export interface PackageMatrix {
  totalPackages: number
  monthlyPackages: number
  yearlyPackages: number
}

interface PackagesTabProps {
  isPropertyMode?: boolean
  forcedPropertyId?: string | null
}

const packageFormSchema = z
  .object({
    packageName: z.string().trim().min(1, 'Package name is required').max(255),
    packageCost: z.union([z.number(), z.string()]),
    duration: z.enum(['Monthly', 'Yearly']),
    description: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    const num = Number(data.packageCost)
    if (data.packageCost === undefined || data.packageCost === '' || isNaN(num) || num < 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Cost must be 0 or greater',
        path: ['packageCost'],
      })
    }
  })

type PackageFormValues = z.infer<typeof packageFormSchema>

const defaultFormValues: PackageFormValues = {
  packageName: '',
  packageCost: 0,
  duration: 'Monthly',
  description: '',
}

const fieldInputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20'

export const PackagesTab: React.FC<PackagesTabProps> = ({ isPropertyMode = false, forcedPropertyId = null }) => {
  const { selectedLocationId, selectedLocationName } = useLocationContext()
  const effectivePropertyId = forcedPropertyId || selectedLocationId

  const [errorMsg, setErrorMsg] = useState('')

  // Filter States
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

  // React Query: Fetch Packages
  const packageQueryParams = useMemo(() => {
    return {
      page: currentPage,
      limit: pageSize,
      search: debouncedSearch.trim() || undefined,
      propertyId: isPropertyMode && effectivePropertyId ? effectivePropertyId : undefined,
      includeGlobal: isPropertyMode && effectivePropertyId ? true : undefined,
    }
  }, [currentPage, pageSize, debouncedSearch, isPropertyMode, effectivePropertyId])

  const { data: packagesData, isLoading } = useCarePackagesQuery(packageQueryParams)

  const packages = useMemo(() => {
    const raw = packagesData?.data || []
    return Array.isArray(raw) ? raw : []
  }, [packagesData])

  const pagination = useMemo(() => {
    if (packagesData?.pagination) {
      return packagesData.pagination
    }
    return {
      total: packages.length,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(packages.length / pageSize) || 0,
    }
  }, [packagesData, packages.length, currentPage, pageSize])

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [selectedTasks, setSelectedTasks] = useState<PackageTaskItem[]>([])
  const [taskSearchQuery, setTaskSearchQuery] = useState('')
  const [debouncedTaskSearch, setDebouncedTaskSearch] = useState('')

  // Debounce task picker search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTaskSearch(taskSearchQuery)
    }, 300)
    return () => clearTimeout(handler)
  }, [taskSearchQuery])

  // React Query: Fetch available tasks for picker (10 items, search supported)
  const pickerQueryParams = useMemo(() => {
    return {
      limit: 10,
      search: debouncedTaskSearch.trim() || undefined,
      propertyId: isPropertyMode && effectivePropertyId ? effectivePropertyId : undefined,
      includeGlobal: isPropertyMode && effectivePropertyId ? true : undefined,
    }
  }, [debouncedTaskSearch, isPropertyMode, effectivePropertyId])

  const { data: pickerTasksData, isLoading: isLoadingPickerTasks } = useCareTasksQuery(pickerQueryParams, isModalOpen)

  const availableTasks = useMemo(() => {
    const raw = pickerTasksData?.data || []
    return Array.isArray(raw) ? raw : []
  }, [pickerTasksData])

  // React Query: Mutations
  const createCarePackageMutation = useCreateCarePackageMutation()
  const updateCarePackageMutation = useUpdateCarePackageMutation()
  const deleteCarePackageMutation = useDeleteCarePackageMutation()

  const isSubmitting = createCarePackageMutation.isPending || updateCarePackageMutation.isPending
  const isDeleting = deleteCarePackageMutation.isPending

  // Delete Confirmation Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [packageToDelete, setPackageToDelete] = useState<Package | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: defaultFormValues,
  })

  // Modal Open Handlers
  const handleOpenCreate = () => {
    setEditingPackage(null)
    setSelectedTasks([])
    setTaskSearchQuery('')
    setDebouncedTaskSearch('')
    setErrorMsg('')
    reset({
      packageName: '',
      packageCost: 0,
      duration: 'Monthly',
      description: '',
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = useCallback(
    (pkg: Package) => {
      setEditingPackage(pkg)
      setSelectedTasks(Array.isArray(pkg.tasks) ? [...pkg.tasks] : [])
      setTaskSearchQuery('')
      setDebouncedTaskSearch('')
      setErrorMsg('')
      reset({
        packageName: pkg.packageName,
        packageCost: pkg.packageCost,
        duration: 'Monthly',
        description: pkg.description || '',
      })
      setIsModalOpen(true)
    },
    [reset],
  )

  // Task Selection & Complimentary Counter Handlers
  const handleToggleTask = (task: Task) => {
    setSelectedTasks((prev) => {
      const existing = prev.find((t) => t.taskId === task.id)
      if (existing) {
        // Remove
        return prev.filter((t) => t.taskId !== task.id)
      } else {
        const name = task.careTaskName || task.taskName || 'Care Task'
        const monthlyRate = Number(
          task.monthlyRate ??
            (task.careTaskPrice !== undefined && task.careTaskPrice !== null ? task.careTaskPrice : task.price) ??
            0,
        )
        return [
          ...prev,
          {
            taskId: task.id,
            taskName: name,
            careTaskName: name,
            dailyRate: Number(task.dailyRate) || 0,
            monthlyRate,
            sessionRate: Number(task.sessionRate) || 0,
            priceOption: 'Monthly',
            price: monthlyRate,
            careTaskPrice: monthlyRate,
            complimentaryCount: 1,
          },
        ]
      }
    })
  }

  const handleUpdateComplimentaryCount = (taskId: string, deltaOrValue: number, isDirect = false) => {
    setSelectedTasks((prev) =>
      prev.map((t) => {
        if (t.taskId !== taskId) return t
        const currentCount = t.complimentaryCount ? Number(t.complimentaryCount) : 1
        const newCount = isDirect ? deltaOrValue : currentCount + deltaOrValue
        return {
          ...t,
          complimentaryCount: Math.max(1, newCount),
        }
      }),
    )
  }

  // Form Submission
  const handleFormSubmit = async (data: PackageFormValues) => {
    try {
      setErrorMsg('')

      const payload = {
        packageName: data.packageName.trim(),
        packageCost: Number(data.packageCost) || 0,
        duration: data.duration,
        description: data.description?.trim() || '',
        tasks: selectedTasks.map((t) => {
          const matched = availableTasks.find((at) => at.id === t.taskId)
          const name = t.careTaskName || t.taskName || matched?.careTaskName || matched?.taskName || 'Care Task'
          const monthlyRate = Number(
            t.monthlyRate ??
              matched?.monthlyRate ??
              (t.careTaskPrice !== undefined && t.careTaskPrice !== null
                ? t.careTaskPrice
                : (matched?.careTaskPrice ?? matched?.price)) ??
              0,
          )

          return {
            taskId: t.taskId,
            taskName: name,
            careTaskName: name,
            dailyRate: Number(t.dailyRate ?? matched?.dailyRate ?? 0),
            monthlyRate,
            sessionRate: Number(t.sessionRate ?? matched?.sessionRate ?? 0),
            priceOption: 'Monthly',
            price: monthlyRate,
            careTaskPrice: monthlyRate,
            complimentaryCount: Math.max(1, Number(t.complimentaryCount) || 1),
          }
        }),
        ...(isPropertyMode ? { propertyId: effectivePropertyId || null } : {}),
      }

      if (editingPackage) {
        await updateCarePackageMutation.mutateAsync({
          id: editingPackage.id,
          payload,
        })
        notifySuccess('Package updated successfully!')
        setIsModalOpen(false)
      } else {
        await createCarePackageMutation.mutateAsync(payload)
        notifySuccess('Package created successfully!')
        setIsModalOpen(false)
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      const message = axiosErr?.response?.data?.message || (err instanceof Error ? err.message : 'Operation failed')
      setErrorMsg(message)
      notifyError('Save Error', message)
    }
  }

  // Delete Action Handlers
  const handleOpenDeleteConfirm = useCallback((pkg: Package) => {
    setPackageToDelete(pkg)
    setIsDeleteModalOpen(true)
  }, [])

  const handleConfirmDelete = async () => {
    if (!packageToDelete) return
    try {
      await deleteCarePackageMutation.mutateAsync(packageToDelete.id)
      notifySuccess('Package deleted successfully!')
      setIsDeleteModalOpen(false)
      setPackageToDelete(null)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      const message =
        axiosErr?.response?.data?.message || (err instanceof Error ? err.message : 'Failed to delete package')
      notifyError('Delete Error', message)
    }
  }

  // Available tasks from BE for picker (including 0 cost / Free tasks)
  const filteredAvailableTasks = useMemo(() => {
    return availableTasks
  }, [availableTasks])

  // Table Columns Definition
  const columns: ColumnDef<Package>[] = useMemo(
    () => [
      {
        accessorKey: 'packageName',
        header: 'Package Name',
        cell: ({ row }) => {
          const pkg = row.original
          return (
            <div className="flex items-start gap-3 py-1">
              <div className="w-9 h-9 rounded-xl bg-[#005390]/10 flex items-center justify-center shrink-0 border border-[#005390]/20">
                <Boxes className="w-4 h-4 text-[#005390]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-gray-900 truncate">{pkg.packageName}</div>
                {pkg.description ? (
                  <div className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{pkg.description}</div>
                ) : (
                  <div className="text-[10px] text-gray-400 italic">No description provided</div>
                )}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'duration',
        header: 'Duration',
        cell: ({ row }) => {
          const isMonthly = row.original.duration === 'Monthly'
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                isMonthly
                  ? 'bg-sky-50 text-sky-700 border border-sky-200/60'
                  : 'bg-purple-50 text-purple-700 border border-purple-200/60'
              }`}
            >
              <CalendarClock className="w-3 h-3" />
              {row.original.duration}
            </span>
          )
        },
      },
      {
        accessorKey: 'packageCost',
        header: 'Package Cost',
        cell: ({ row }) => {
          const cost = Number(row.original.packageCost) || 0
          const duration = row.original.duration === 'Yearly' ? '/ year' : '/ month'
          if (cost <= 0) {
            return (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                Free
              </span>
            )
          }
          return (
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-extrabold text-[#005390]">₹{cost.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-gray-400 font-medium">{duration}</span>
            </div>
          )
        },
      },
      {
        id: 'tasks',
        header: 'Included Complimentary Tasks',
        cell: ({ row }) => {
          const taskItems = row.original.tasks || []
          if (taskItems.length === 0) {
            return <span className="text-xs text-gray-400 italic">No tasks assigned</span>
          }
          const totalComplimentary = taskItems.reduce(
            (sum, t) => sum + (t.complimentaryCount ? Number(t.complimentaryCount) : 0),
            0,
          )

          return (
            <div className="flex flex-col gap-1.5 max-w-md py-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                  <Gift className="w-2.5 h-2.5 text-amber-600" />
                  {taskItems.length} {taskItems.length === 1 ? 'Task' : 'Tasks'}
                  {totalComplimentary > 0 && ` (${totalComplimentary} total comp.)`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {taskItems.slice(0, 3).map((t, idx) => {
                  const taskName = t.careTaskName || t.taskName || 'Care Task'
                  return (
                    <span
                      key={`${t.taskId}-${idx}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-gray-50 border border-gray-200 text-gray-700"
                    >
                      <span className="truncate max-w-[130px]">{taskName}</span>
                      <span className="font-bold text-[#005390] bg-blue-50 px-1 rounded">
                        ×{t.complimentaryCount || 1}
                      </span>
                    </span>
                  )
                })}
                {taskItems.length > 3 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-500">
                    +{taskItems.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )
        },
      },

      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenEdit(row.original)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-[#005390] hover:bg-[#005390]/10 transition-colors cursor-pointer"
              title="Edit Package"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenDeleteConfirm(row.original)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Delete Package"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [handleOpenEdit, handleOpenDeleteConfirm],
  )

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#005390]/10 text-[#005390]">
                <Boxes className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Packages</h2>
              {isPropertyMode && selectedLocationName && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Building2 className="w-3 h-3 text-emerald-600" />
                  {selectedLocationName}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isPropertyMode
                ? `Configure and manage Care Packages bundled with complimentary tasks and duration for ${selectedLocationName || 'this property'}.`
                : 'Configure and manage Global Care Packages with bundled complimentary tasks, cost, and duration.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#005390] text-white text-xs font-bold shadow-md hover:bg-[#004170] transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Package
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
            placeholder="Search by package name, description..."
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

      {/* Data Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-2">
        <DataTable
          columns={columns}
          data={packages}
          isLoading={isLoading}
          manualPagination={true}
          pageCount={pagination.totalPages}
          pageIndex={currentPage - 1}
          onPageChange={(newPageIndex) => setCurrentPage(newPageIndex + 1)}
          totalCount={pagination.total}
          pageSize={pageSize}
        />
      </div>

      {/* Create / Edit Package Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50/80 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#005390]/10 flex items-center justify-center text-[#005390]">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">
                    {editingPackage ? 'Edit Care Package' : 'Create Care Package'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isPropertyMode
                      ? `Configure package specifications for ${selectedLocationName || 'active property'}`
                      : 'Define global care package template'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">
                {errorMsg && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200/60 flex items-start gap-2.5 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* 1. Package Name */}
                <div>
                  <label htmlFor="packageName" className="block text-xs font-bold text-gray-700 mb-1.5">
                    1. Package Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="packageName"
                    type="text"
                    {...register('packageName')}
                    placeholder="e.g. Comprehensive Care Tier-1, Senior Vital Care"
                    className={fieldInputClass}
                  />
                  {errors.packageName && (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.packageName.message}</p>
                  )}
                </div>

                {/* 2. Package Cost & 4. Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 2. Package Cost */}
                  <div>
                    <label htmlFor="packageCost" className="block text-xs font-bold text-gray-700 mb-1.5">
                      2. Package Cost (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <ReceiptIndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="packageCost"
                        type="number"
                        step="0.01"
                        min="0"
                        {...register('packageCost')}
                        placeholder="0.00"
                        className={`${fieldInputClass} pl-9`}
                      />
                    </div>
                    {errors.packageCost && (
                      <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.packageCost.message}</p>
                    )}
                  </div>

                  {/* 4. Duration (Monthly only) */}
                  <div>
                    <span className="block text-xs font-bold text-gray-700 mb-1.5">
                      4. Duration <span className="text-red-500">*</span>
                    </span>
                    <div className="p-1 bg-gray-100/70 rounded-xl border border-gray-200/50">
                      <button
                        type="button"
                        onClick={() => setValue('duration', 'Monthly')}
                        className="w-full py-2 rounded-lg text-xs font-bold transition-all bg-white text-[#005390] shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CalendarClock className="w-3.5 h-3.5 text-[#005390]" />
                        Monthly
                      </button>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="packageDescription" className="block text-xs font-bold text-gray-700 mb-1.5">
                    Description <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    id="packageDescription"
                    rows={2}
                    {...register('description')}
                    placeholder="Brief description or terms of what is covered in this package..."
                    className={fieldInputClass}
                  />
                </div>

                {/* 3. Select Tasks with Complimentary (manes 1 2 3 4 5 6) */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="block text-xs font-bold text-gray-800">
                        3. Select Tasks with Complimentary Sets
                      </span>
                      <p className="text-[11px] text-gray-500">
                        Choose included tasks and specify complimentary count (e.g. 1, 2, 3, 4, 5, 6...)
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-[#005390] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                      {selectedTasks.length} selected
                    </span>
                  </div>

                  {/* Selected Tasks List with Quantity Steppers */}
                  {selectedTasks.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedTasks.map((st) => {
                        const matched = availableTasks.find((t) => t.id === st.taskId)
                        const name =
                          st.careTaskName || st.taskName || matched?.careTaskName || matched?.taskName || 'Care Task'
                        const monthlyRate = Number(
                          st.monthlyRate ??
                            matched?.monthlyRate ??
                            (st.careTaskPrice !== undefined && st.careTaskPrice !== null
                              ? st.careTaskPrice
                              : (matched?.careTaskPrice ?? matched?.price)) ??
                            0,
                        )

                        return (
                          <div
                            key={st.taskId}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200/80 bg-gray-50/70 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-blue-100 text-[#005390]">
                                <HeartHandshake className="w-3.5 h-3.5" />
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xs font-bold text-gray-900 truncate">{name}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold shrink-0 border bg-indigo-50 text-indigo-700 border-indigo-200/60">
                                    Monthly
                                  </span>
                                </div>
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                  Monthly Rate: {monthlyRate > 0 ? `₹${monthlyRate.toLocaleString('en-IN')}` : 'Free'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Complimentary Counter */}
                              <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-200">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateComplimentaryCount(st.taskId, -1)}
                                  className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:bg-gray-100 cursor-pointer"
                                  title="Decrease complimentary count"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max="999"
                                  value={st.complimentaryCount || 1}
                                  onChange={(e) =>
                                    handleUpdateComplimentaryCount(st.taskId, Number(e.target.value) || 1, true)
                                  }
                                  className="w-10 text-center text-xs font-bold text-[#005390] border-0 focus:outline-none p-0"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateComplimentaryCount(st.taskId, 1)}
                                  className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:bg-gray-100 cursor-pointer"
                                  title="Increase complimentary count"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Quick Presets (1, 2, 4, 6) */}
                              <div className="hidden sm:flex items-center gap-0.5">
                                {[1, 2, 4, 6].map((cnt) => (
                                  <button
                                    key={cnt}
                                    type="button"
                                    onClick={() => handleUpdateComplimentaryCount(st.taskId, cnt, true)}
                                    className={`w-6 h-6 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                                      st.complimentaryCount === cnt
                                        ? 'bg-[#005390] text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    {cnt}
                                  </button>
                                ))}
                              </div>

                              {/* Remove from selection */}
                              <button
                                type="button"
                                onClick={() => handleToggleTask({ id: st.taskId } as Task)}
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Task Picker Search */}
                  <div className="rounded-2xl border border-gray-200 p-3 bg-gray-50/50">
                    <div className="relative mb-2.5">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={taskSearchQuery}
                        onChange={(e) => setTaskSearchQuery(e.target.value)}
                        placeholder="Search tasks from task master..."
                        className="w-full pl-8 pr-12 py-1.5 text-xs bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#005390]"
                      />
                      {isLoadingPickerTasks ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-3.5 h-3.5 border-2 border-[#005390] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : taskSearchQuery ? (
                        <button
                          type="button"
                          onClick={() => setTaskSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      ) : null}
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {isLoadingPickerTasks && filteredAvailableTasks.length === 0 ? (
                        <div className="text-center py-6 text-xs text-gray-400">
                          <div className="w-5 h-5 border-2 border-[#005390] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <span>Searching care tasks...</span>
                        </div>
                      ) : filteredAvailableTasks.length === 0 ? (
                        <div className="text-center py-4 text-xs text-gray-400">
                          {taskSearchQuery
                            ? `No care tasks matching "${taskSearchQuery}"`
                            : 'No care tasks available to add'}
                        </div>
                      ) : (
                        filteredAvailableTasks.map((task) => {
                          const isSelected = selectedTasks.some((t) => t.taskId === task.id)
                          const name = task.careTaskName || task.taskName || 'Care Task'
                          const monthlyRate = Number(
                            task.monthlyRate ??
                              (task.careTaskPrice !== undefined && task.careTaskPrice !== null
                                ? task.careTaskPrice
                                : task.price) ??
                              0,
                          )

                          return (
                            <button
                              key={task.id}
                              type="button"
                              onClick={() => handleToggleTask(task)}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#005390]/10 border border-[#005390]/30 text-[#005390]'
                                  : 'bg-white hover:bg-gray-100 border border-transparent text-gray-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-4 h-4 rounded flex items-center justify-center border ${
                                    isSelected ? 'bg-[#005390] border-[#005390] text-white' : 'border-gray-300'
                                  }`}
                                >
                                  {isSelected && <CheckSquare className="w-3 h-3" />}
                                </span>
                                <span className="font-semibold truncate">{name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                  Monthly
                                </span>
                              </div>
                              <span
                                className={`text-[11px] font-bold shrink-0 ${monthlyRate > 0 ? 'text-gray-600' : 'text-emerald-600'}`}
                              >
                                {monthlyRate > 0 ? `₹${monthlyRate.toLocaleString('en-IN')}` : 'Free'}
                              </span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#005390] text-white text-xs font-bold shadow-md hover:bg-[#004170] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingPackage ? 'Update Package' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && packageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-gray-900">Delete Care Package?</h4>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to delete{' '}
                <span className="font-bold text-gray-800">"{packageToDelete.packageName}"</span>? This will remove the
                package template.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setPackageToDelete(null)
                }}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold shadow-md hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PackagesTab
