import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useCarePackagesQuery, useChangePackageMutation } from '@/hooks/react-query/medical'
import type { CarePackage } from '@/lib/types/medical'
import { notifyError, notifySuccess } from '@/utils/toast'
import { Boxes, RefreshCw, Search, Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChangePackageDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  subscriptionId: string
  locationId?: string | null
  currentPackageId?: string
  residentName?: string
  onSuccess?: () => void
}

import {
  PackageTaskSchedulesConfig,
  type PackageTaskItemInfo,
  type TaskScheduleConfig,
} from './PackageTaskSchedulesConfig'

function formatTimeTo12h(time24: string): string {
  if (!time24) return '10:00 AM'
  const match = time24.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return time24
  let hours = parseInt(match[1], 10)
  const minutes = match[2]
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${String(hours).padStart(2, '0')}:${minutes} ${meridiem}`
}

export const ChangePackageDialog: React.FC<ChangePackageDialogProps> = ({
  isOpen,
  onOpenChange,
  subscriptionId,
  locationId,
  currentPackageId,
  residentName,
  onSuccess,
}) => {
  const [selectedPackageId, setSelectedPackageId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false)
  const [taskSchedules, setTaskSchedules] = useState<Record<string, TaskScheduleConfig>>({})
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { data: carePackagesData, isLoading } = useCarePackagesQuery(
    { propertyId: locationId, includeGlobal: true },
    isOpen,
  )
  const changePackageMutation = useChangePackageMutation()

  const carePackages = useMemo<CarePackage[]>(() => carePackagesData?.data || [], [carePackagesData?.data])
  const availablePackages = useMemo(
    () => carePackages.filter((pkg) => pkg.id !== currentPackageId),
    [carePackages, currentPackageId],
  )

  const selectedPkg = useMemo(
    () => availablePackages.find((pkg) => pkg.id === selectedPackageId),
    [availablePackages, selectedPackageId],
  )

  const packageTasks: PackageTaskItemInfo[] = useMemo(() => {
    if (!selectedPkg) return []
    if (selectedPkg.features && selectedPkg.features.length > 0) {
      return selectedPkg.features.map((f) => ({
        taskId: f.id,
        taskName: f.taskName || f.careTaskName || 'Care Task',
        complimentaryCount: f.CarePackageFeaturesMap?.complimentaryCount ?? 0,
        billingType: f.billingType || 'SESSION',
        price: f.price || 0,
      }))
    }
    if (selectedPkg.tasks && selectedPkg.tasks.length > 0) {
      return selectedPkg.tasks.map((t) => ({
        taskId: t.taskId,
        taskName: t.taskName || t.careTaskName || 'Care Task',
        complimentaryCount: t.complimentaryCount ?? 0,
        billingType: t.billingType || 'SESSION',
        price: t.price || 0,
      }))
    }
    return []
  }, [selectedPkg])

  const handleSelectPackage = (pkg: CarePackage) => {
    setSelectedPackageId(pkg.id)
    setIsDropdownOpen(false)
    setSearchQuery('')

    const tasks =
      pkg.features && pkg.features.length > 0
        ? pkg.features.map((f) => ({
            taskId: f.id,
            taskName: f.taskName || f.careTaskName || 'Care Task',
          }))
        : pkg.tasks && pkg.tasks.length > 0
          ? pkg.tasks.map((t) => ({
              taskId: t.taskId,
              taskName: t.taskName || t.careTaskName || 'Care Task',
            }))
          : []

    const initialSchedules: Record<string, TaskScheduleConfig> = {}
    for (const t of tasks) {
      initialSchedules[t.taskId] = {
        taskId: t.taskId,
        taskName: t.taskName,
        frequency: 1,
        times: ['10:00'],
      }
    }
    setTaskSchedules(initialSchedules)
  }

  const handleClearPackage = () => {
    setSelectedPackageId('')
    setTaskSchedules({})
    setSearchQuery('')
  }

  const filteredPackages = useMemo(() => {
    if (!searchQuery.trim()) return availablePackages
    const query = searchQuery.trim().toLowerCase()
    return availablePackages.filter((pkg) => {
      const nameMatch = (pkg.packageName || '').toLowerCase().includes(query)
      const durationMatch = (pkg.duration || '').toLowerCase().includes(query)
      const costMatch = String(pkg.packageCost || '').includes(query)
      return nameMatch || durationMatch || costMatch
    })
  }, [availablePackages, searchQuery])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isDropdownOpen])

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
        setSearchQuery('')
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPackageId) {
      notifyError('Selection Required', 'Please select a new care package.')
      return
    }

    const formattedTaskSchedules = Object.values(taskSchedules).map((sched) => ({
      taskId: sched.taskId,
      taskName: sched.taskName,
      frequency: sched.frequency,
      times: sched.times.map((t) => formatTimeTo12h(t)),
    }))

    try {
      await changePackageMutation.mutateAsync({
        subscriptionId,
        payload: {
          newCarePackageId: selectedPackageId,
          startDate: new Date().toISOString().split('T')[0],
          taskSchedules: formattedTaskSchedules,
        },
      })
      notifySuccess('Package Changed', `Care package updated successfully for ${residentName || 'resident'}.`)
      setSelectedPackageId('')
      setSearchQuery('')
      setIsDropdownOpen(false)
      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change care package.'
      notifyError('Package Change Failed', msg)
    }
  }

  const handleClose = () => {
    setSelectedPackageId('')
    setSearchQuery('')
    setIsDropdownOpen(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <Boxes className="h-5 w-5 text-[#005390]" />
            Change Care Package
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
            Select a new package for {residentName ? <strong>{residentName}</strong> : 'this resident'}. The previous
            package will be ended today and the new package tasks will become available immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="space-y-2 relative" ref={dropdownRef}>
            <Label htmlFor="new-package-select" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              New Care Package *
            </Label>
            {isLoading ? (
              <div className="py-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#005390]" />
                Loading packages...
              </div>
            ) : (
              <div className="relative">
                {/* Searchable Trigger Button */}
                <button
                  type="button"
                  id="new-package-select"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className={cn(
                    'w-full h-11 px-3.5 py-2 text-xs rounded-xl border bg-white dark:bg-slate-800 text-left flex items-center justify-between transition-all cursor-pointer shadow-2xs',
                    isDropdownOpen
                      ? 'border-[#005390] ring-2 ring-[#005390]/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Boxes className="size-4 shrink-0 text-gray-400" />
                    {selectedPkg ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-gray-900 dark:text-white truncate">
                          {selectedPkg.packageName}
                        </span>
                        <span className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#005390] border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300">
                          ₹{Number(selectedPkg.packageCost).toLocaleString('en-IN')} / {selectedPkg.duration}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">Select a package...</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {selectedPkg && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleClearPackage()
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            handleClearPackage()
                          }
                        }}
                        className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 cursor-pointer"
                        title="Clear selection"
                      >
                        <X className="size-3.5" />
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        'size-4 text-gray-400 transition-transform duration-200',
                        isDropdownOpen && 'rotate-180 text-[#005390]',
                      )}
                    />
                  </div>
                </button>

                {/* Dropdown Menu with Search Input */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden dark:border-gray-800 dark:bg-slate-900 animate-in fade-in-0 zoom-in-95 duration-100">
                    {/* Search Input Box */}
                    <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search packages by name, duration, price..."
                          className="w-full rounded-xl border border-gray-200 bg-white py-2 pr-8 pl-9 text-xs text-gray-900 placeholder:text-gray-400 focus:border-[#005390] focus:outline-none focus:ring-1 focus:ring-[#005390] dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filtered Packages List */}
                    <div className="max-h-56 overflow-y-auto p-1.5 divide-y divide-gray-50 dark:divide-gray-800/50">
                      {filteredPackages.length === 0 ? (
                        <div className="py-6 text-center text-xs text-gray-400">
                          <Boxes className="mx-auto size-6 text-gray-300 dark:text-gray-600 mb-1" />
                          {searchQuery ? (
                            <p>No packages matching "{searchQuery}"</p>
                          ) : (
                            <p>No alternative care packages available</p>
                          )}
                        </div>
                      ) : (
                        filteredPackages.map((pkg) => {
                          const isSelected = pkg.id === selectedPackageId
                          return (
                            <button
                              key={pkg.id}
                              type="button"
                              onClick={() => handleSelectPackage(pkg)}
                              className={cn(
                                'w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-colors cursor-pointer',
                                isSelected
                                  ? 'bg-blue-50/80 text-[#005390] dark:bg-blue-950/50 dark:text-blue-300 font-semibold'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-gray-700 dark:text-gray-300',
                              )}
                            >
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                                  {pkg.packageName}
                                </span>
                                <span className="text-[10px] text-gray-400 line-clamp-1">
                                  Duration: {pkg.duration || 'Monthly'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-extrabold text-[#005390] dark:text-blue-300">
                                  ₹{Number(pkg.packageCost).toLocaleString('en-IN')}
                                </span>
                                {isSelected && <Check className="size-4 text-[#005390] dark:text-blue-400" />}
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Selected Package Details Pill/Card */}
            {selectedPkg && (
              <div className="mt-2 rounded-2xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900/40 dark:bg-blue-950/30 flex items-center justify-between animate-in fade-in-50">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#005390] dark:text-blue-400">
                    Selected Package
                  </span>
                  <div className="text-xs font-bold text-gray-900 dark:text-white">{selectedPkg.packageName}</div>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="text-xs font-extrabold text-[#005390] dark:text-blue-400">
                    ₹{Number(selectedPkg.packageCost).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{selectedPkg.duration}</div>
                </div>
              </div>
            )}

            {/* Package Tasks Frequency & Times Schedule Configuration */}
            {selectedPkg && packageTasks.length > 0 && (
              <PackageTaskSchedulesConfig
                tasks={packageTasks}
                schedules={taskSchedules}
                onChange={setTaskSchedules}
                className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800"
              />
            )}

            {availablePackages.length === 0 && !isLoading && (
              <p className="text-[11px] text-amber-600 font-medium">
                No alternative care packages available for this property.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={changePackageMutation.isPending}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedPackageId || changePackageMutation.isPending}
              className="bg-[#005390] hover:bg-[#003d6b] text-white rounded-xl"
            >
              {changePackageMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Changing...
                </span>
              ) : (
                'Confirm & Change Package'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ChangePackageDialog
