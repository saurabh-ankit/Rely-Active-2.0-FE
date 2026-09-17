import React, { useState, useMemo } from 'react'
import { X, Loader2, Clock, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocationContext } from '@/hooks/useLocation'
import { useResidentsQuery } from '@/hooks/react-query/resident'
import { useCareTasksQuery, useCreateCareTaskAssignmentMutation } from '@/hooks/react-query/medical'
import type { CareTask } from '@/lib/types/medical'
import type { ResidentItem } from '@/lib/types'
import { notifyError, notifySuccess } from '@/utils/toast'
import { Button } from '@/components/ui/button'

function formatTimeTo12h(time24: string): string {
  if (!time24) return '12:00 PM'
  const match = time24.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return time24
  let hours = parseInt(match[1], 10)
  const minutes = match[2]
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${String(hours).padStart(2, '0')}:${minutes} ${meridiem}`
}

export interface AssignCareTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialResidentId?: string | null
  initialPropertyId?: string | null
  onSuccess?: () => void
}

interface AssignCareTaskDialogContentProps {
  onOpenChange: (open: boolean) => void
  initialResidentId?: string | null
  initialPropertyId?: string | null
  onSuccess?: () => void
}

const AssignCareTaskDialogContent: React.FC<AssignCareTaskDialogContentProps> = ({
  onOpenChange,
  initialResidentId,
  initialPropertyId,
  onSuccess,
}) => {
  const { selectedLocationId } = useLocationContext()
  const effectiveLocationId = initialPropertyId || selectedLocationId

  // Form states initialized directly on mount
  const [selectedResidentId, setSelectedResidentId] = useState<string>(initialResidentId || '')
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [frequency, setFrequency] = useState<number>(1)
  const [times, setTimes] = useState<string[]>(['10:00'])
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState<string>('')
  const [instructions, setInstructions] = useState<string>('')

  const handleFrequencyChange = (newFreq: number) => {
    setFrequency(newFreq)
    const defaultsMap: Record<number, string[]> = {
      1: ['10:00'],
      2: ['10:00', '18:00'],
      3: ['08:00', '14:00', '20:00'],
      4: ['08:00', '12:00', '16:00', '20:00'],
      5: ['08:00', '11:00', '14:00', '17:00', '20:00'],
    }
    const defaultList =
      defaultsMap[newFreq] || Array.from({ length: newFreq }, (_, i) => `${String(8 + i * 2).padStart(2, '0')}:00`)
    const updated = Array.from({ length: newFreq }, (_, i) => times[i] || defaultList[i] || '12:00')
    setTimes(updated)
  }

  const handleAddSlot = () => {
    const nextFreq = frequency + 1
    const nextTime = times.length > 0 ? times[times.length - 1] : '12:00'
    setFrequency(nextFreq)
    setTimes([...times, nextTime])
  }

  const handleRemoveSlot = (index: number) => {
    if (times.length <= 1) return
    const updated = times.filter((_, i) => i !== index)
    setTimes(updated)
    setFrequency(updated.length)
  }

  // Residents react-query hook
  const residentFilter = useMemo(() => {
    if (initialResidentId) return undefined
    return effectiveLocationId ? { locId: effectiveLocationId } : undefined
  }, [initialResidentId, effectiveLocationId])

  const { data: residentsData, isLoading: loadingResidents } = useResidentsQuery(residentFilter)
  const residents: ResidentItem[] = useMemo(() => (Array.isArray(residentsData) ? residentsData : []), [residentsData])

  // Care tasks query
  const { data: tasksData, isLoading: loadingTasks } = useCareTasksQuery({
    propertyId: effectiveLocationId || 'all',
    isActive: true,
  })
  const careTasks: CareTask[] = useMemo(() => tasksData?.data || [], [tasksData])

  const createAssignmentMutation = useCreateCareTaskAssignmentMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedResidentId) {
      notifyError('Please select a resident')
      return
    }

    if (!selectedTaskId) {
      notifyError('Please select a care task')
      return
    }

    if (!startDate) {
      notifyError('Start date is required')
      return
    }

    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      notifyError('End date cannot be earlier than start date')
      return
    }

    const formattedTimes = times.map((t) => formatTimeTo12h(t))

    try {
      await createAssignmentMutation.mutateAsync({
        residentId: selectedResidentId,
        taskId: selectedTaskId,
        startDate,
        endDate: endDate ? endDate : null,
        time: formattedTimes[0] || '12:00 PM',
        times: formattedTimes,
        frequency,
        customInstructions: instructions ? instructions.trim() : null,
      })

      notifySuccess(
        formattedTimes.length > 1
          ? `Care task successfully assigned with ${formattedTimes.length} daily time slots`
          : 'Care task successfully assigned',
      )
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to assign care task'
      notifyError(msg)
    }
  }

  return (
    <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/40 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-slate-900 sm:p-7">
      {/* Modal Header */}
      <div className="flex items-start justify-between border-b pb-4 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Assign Care Task</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Assign a care task to a resident with customized schedule and timing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300 transition-colors"
        >
          <X className="size-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* 1. Select Resident */}
        <div className="space-y-1.5">
          <label htmlFor="assign-resident-select" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            1. Select Resident <span className="text-rose-500">*</span>
          </label>
          <select
            id="assign-resident-select"
            value={selectedResidentId}
            onChange={(e) => setSelectedResidentId(e.target.value)}
            disabled={Boolean(initialResidentId) || loadingResidents}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs text-gray-900 transition-colors focus:border-[#005390] focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-slate-800 dark:text-white sm:text-sm"
          >
            <option value="">{loadingResidents ? 'Loading residents...' : '-- Select Resident --'}</option>
            {residents.map((r) => {
              const name = `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'Resident'
              const unit = r.unit?.unit_number ? ` (Flat ${r.unit.unit_number})` : ''
              return (
                <option key={r.id} value={r.id}>
                  {name}
                  {unit}
                </option>
              )
            })}
          </select>
        </div>

        {/* 2. Select Care Task */}
        <div className="space-y-1.5">
          <label htmlFor="assign-task-select" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            2. Select Care Task <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              id="assign-task-select"
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              disabled={loadingTasks}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs text-gray-900 transition-colors focus:border-[#005390] focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-slate-800 dark:text-white sm:text-sm"
            >
              <option value="">{loadingTasks ? 'Loading tasks...' : '-- Select Care Task --'}</option>
              {careTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.careTaskName} ({t.billingType || 'Session'} • ₹{Number(t.price || 0)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Daily Frequency & Scheduled Times */}
        <div className="space-y-3 rounded-2xl border border-sky-100 bg-sky-50/40 p-4 dark:border-sky-950/60 dark:bg-sky-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              3. Daily Frequency <span className="text-rose-500">*</span>
            </span>
            <span className="rounded-md bg-[#005390]/10 px-2 py-0.5 text-[11px] font-bold text-[#005390] dark:bg-sky-950 dark:text-sky-300">
              {frequency} time{frequency > 1 ? 's' : ''} per day
            </span>
          </div>

          {/* Quick Frequency Buttons */}
          <div className="grid grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleFrequencyChange(num)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center font-bold transition-all border cursor-pointer',
                  frequency === num
                    ? 'border-[#005390] bg-[#005390] text-white shadow-sm ring-2 ring-[#005390]/20'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-sky-300 hover:bg-sky-50/60 dark:border-gray-800 dark:bg-slate-800 dark:text-gray-300 dark:hover:border-sky-700',
                )}
              >
                <span className="text-sm">{num}x</span>
                <span className="text-[9px] font-medium opacity-85">{num === 1 ? 'Daily' : `${num} slots`}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={handleAddSlot}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center font-bold transition-all border cursor-pointer',
                frequency > 5
                  ? 'border-[#005390] bg-[#005390] text-white shadow-sm ring-2 ring-[#005390]/20'
                  : 'border-dashed border-sky-300 bg-sky-50/70 text-[#005390] hover:bg-sky-100 hover:border-sky-400 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
              )}
              title="Add another time slot"
            >
              <div className="flex items-center justify-center gap-0.5">
                <Plus className="size-3.5" />
                <span className="text-xs">{frequency > 5 ? `${frequency}x` : 'New'}</span>
              </div>
              <span className="text-[9px] font-medium opacity-85">{frequency > 5 ? 'Custom' : '+ Slot'}</span>
            </button>
          </div>

          {/* Dynamic Time Slots */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <Clock className="size-3.5 text-[#005390] dark:text-sky-400" />
                <span>Scheduled Timing</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  Creates {frequency} record{frequency > 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#005390] hover:underline dark:text-sky-400 cursor-pointer"
                >
                  <Plus className="size-3" />
                  <span>Add Time</span>
                </button>
              </div>
            </div>

            <div
              className={cn(
                'grid gap-2.5',
                frequency === 1 ? 'grid-cols-1' : frequency === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3',
              )}
            >
              {times.map((slotTime, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200/80 bg-white p-2.5 shadow-2xs dark:border-gray-800 dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Time {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-extrabold text-[#005390] dark:bg-sky-950 dark:text-sky-300">
                        {formatTimeTo12h(slotTime)}
                      </span>
                      {times.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(idx)}
                          className="rounded p-0.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Remove this slot"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="time"
                    aria-label={`Time slot ${idx + 1}`}
                    value={slotTime}
                    onChange={(e) => {
                      const updated = [...times]
                      updated[idx] = e.target.value
                      setTimes(updated)
                    }}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2.5 py-1.5 text-xs text-gray-900 transition-colors focus:border-[#005390] focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-slate-900 dark:text-white cursor-pointer"
                    required
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Dates & Notes */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="assign-start-date-input" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Start Date <span className="text-rose-500">*</span>
            </label>
            <input
              id="assign-start-date-input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 transition-colors focus:border-[#005390] focus:outline-none dark:border-gray-800 dark:bg-slate-800 dark:text-white sm:text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="assign-end-date-input" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              End Date <span className="text-gray-400 font-normal">(Optional — Lifetime if empty)</span>
            </label>
            <input
              id="assign-end-date-input"
              type="date"
              min={startDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 transition-colors focus:border-[#005390] focus:outline-none dark:border-gray-800 dark:bg-slate-800 dark:text-white sm:text-sm"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label
              htmlFor="assign-instructions-input"
              className="text-xs font-semibold text-gray-700 dark:text-gray-300"
            >
              Instructions / Clinical Notes (Optional)
            </label>
            <input
              id="assign-instructions-input"
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Special notes for nursing staff..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 transition-colors focus:border-[#005390] focus:outline-none dark:border-gray-800 dark:bg-slate-800 dark:text-white sm:text-sm"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <Button
            type="submit"
            disabled={createAssignmentMutation.isPending}
            className="rounded-xl bg-[#005390] px-5 py-2 text-xs font-bold text-white hover:bg-[#004375] cursor-pointer shadow-sm"
          >
            {createAssignmentMutation.isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
            Assign Task to Resident
          </Button>
        </div>
      </form>
    </div>
  )
}

export const AssignCareTaskDialog: React.FC<AssignCareTaskDialogProps> = ({
  open,
  onOpenChange,
  initialResidentId,
  initialPropertyId,
  onSuccess,
}) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <AssignCareTaskDialogContent
        key={`${initialResidentId || 'all'}-${initialPropertyId || 'all'}`}
        onOpenChange={onOpenChange}
        initialResidentId={initialResidentId}
        initialPropertyId={initialPropertyId}
        onSuccess={onSuccess}
      />
    </div>
  )
}

export default AssignCareTaskDialog
