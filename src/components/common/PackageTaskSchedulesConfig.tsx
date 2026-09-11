import React from 'react'
import { Clock, Trash2, Sparkles, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PackageTaskItemInfo {
  taskId: string
  taskName: string
  billingType?: string
  complimentaryCount?: number
  price?: number
}

export interface TaskScheduleConfig {
  taskId: string
  taskName: string
  frequency: number
  times: string[]
}

export interface PackageTaskSchedulesConfigProps {
  tasks: PackageTaskItemInfo[]
  schedules: Record<string, TaskScheduleConfig>
  onChange: (updatedSchedules: Record<string, TaskScheduleConfig>) => void
  className?: string
}

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

export const PackageTaskSchedulesConfig: React.FC<PackageTaskSchedulesConfigProps> = ({
  tasks,
  schedules,
  onChange,
  className,
}) => {
  if (!tasks || tasks.length === 0) {
    return null
  }

  const handleFrequencyChange = (taskId: string, taskName: string, newFreq: number) => {
    const current = schedules[taskId] || { taskId, taskName, frequency: 1, times: ['10:00'] }
    const defaultsMap: Record<number, string[]> = {
      1: ['10:00'],
      2: ['10:00', '18:00'],
      3: ['08:00', '14:00', '20:00'],
      4: ['08:00', '12:00', '16:00', '20:00'],
      5: ['08:00', '11:00', '14:00', '17:00', '20:00'],
    }
    const defaultList =
      defaultsMap[newFreq] || Array.from({ length: newFreq }, (_, i) => `${String(8 + i * 2).padStart(2, '0')}:00`)
    const updatedTimes = Array.from({ length: newFreq }, (_, i) => current.times[i] || defaultList[i] || '12:00')

    onChange({
      ...schedules,
      [taskId]: {
        taskId,
        taskName,
        frequency: newFreq,
        times: updatedTimes,
      },
    })
  }

  const handleAddSlot = (taskId: string, taskName: string) => {
    const current = schedules[taskId] || { taskId, taskName, frequency: 1, times: ['10:00'] }
    const nextFreq = current.frequency + 1
    const lastTime = current.times[current.times.length - 1] || '12:00'
    const updatedTimes = [...current.times, lastTime]

    onChange({
      ...schedules,
      [taskId]: {
        taskId,
        taskName,
        frequency: nextFreq,
        times: updatedTimes,
      },
    })
  }

  const handleRemoveSlot = (taskId: string, taskName: string, slotIndex: number) => {
    const current = schedules[taskId] || { taskId, taskName, frequency: 1, times: ['10:00'] }
    if (current.times.length <= 1) return
    const updatedTimes = current.times.filter((_, i) => i !== slotIndex)

    onChange({
      ...schedules,
      [taskId]: {
        taskId,
        taskName,
        frequency: updatedTimes.length,
        times: updatedTimes,
      },
    })
  }

  const handleTimeChange = (taskId: string, taskName: string, slotIndex: number, newTime: string) => {
    const current = schedules[taskId] || { taskId, taskName, frequency: 1, times: ['10:00'] }
    const updatedTimes = [...current.times]
    updatedTimes[slotIndex] = newTime

    onChange({
      ...schedules,
      [taskId]: {
        taskId,
        taskName,
        frequency: current.frequency,
        times: updatedTimes,
      },
    })
  }

  return (
    <div className={cn('space-y-3.5', className)}>
      <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 dark:border-gray-800">
        <div>
          <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Clock className="size-4 text-[#005390] dark:text-sky-400" />
            <span>Configure Package Care Tasks Schedule & Timing</span>
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            Set daily frequency and scheduled timing for each task included in this package.
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-extrabold text-[#005390] dark:bg-blue-950/60 dark:text-blue-300">
          {tasks.length} Package Task{tasks.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {tasks.map((t) => {
          const sched = schedules[t.taskId] || {
            taskId: t.taskId,
            taskName: t.taskName,
            frequency: 1,
            times: ['10:00'],
          }
          const freq = sched.frequency || sched.times.length || 1
          const compCount = t.complimentaryCount ?? 0

          return (
            <div
              key={t.taskId}
              className="rounded-2xl border border-sky-100/80 bg-white p-3.5 shadow-2xs transition-all dark:border-gray-800 dark:bg-slate-800/80"
            >
              {/* Task Header & Complimentary Info */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100/80 pb-2.5 dark:border-gray-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">{t.taskName}</span>
                  {compCount > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300">
                      <Sparkles className="size-2.5 text-purple-600" />
                      <span>{compCount} complimentary sessions</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <CheckCircle2 className="size-2.5 text-emerald-600" />
                      <span>Included Free</span>
                    </span>
                  )}
                </div>

                <span className="text-[11px] font-bold text-[#005390] dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg">
                  {freq} time{freq > 1 ? 's' : ''} daily ({freq} distinct record{freq > 1 ? 's' : ''})
                </span>
              </div>

              {/* Frequency Selector & Time Pickers */}
              <div className="mt-3 space-y-2.5">
                {/* Quick Frequency Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Frequency:</span>
                  <div className="grid grid-cols-6 gap-1.5 flex-1 max-w-sm">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleFrequencyChange(t.taskId, t.taskName, num)}
                        className={cn(
                          'rounded-lg py-1 px-1 text-center font-bold text-xs transition-all border cursor-pointer',
                          freq === num
                            ? 'border-[#005390] bg-[#005390] text-white shadow-2xs ring-1 ring-[#005390]/30'
                            : 'border-gray-200 bg-gray-50/70 text-gray-700 hover:border-sky-300 hover:bg-sky-50 dark:border-gray-700 dark:bg-slate-700 dark:text-gray-300',
                        )}
                      >
                        {num}x
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddSlot(t.taskId, t.taskName)}
                      className={cn(
                        'rounded-lg py-1 px-1 text-center font-bold text-xs transition-all border cursor-pointer',
                        freq > 5
                          ? 'border-[#005390] bg-[#005390] text-white shadow-2xs ring-1 ring-[#005390]/30'
                          : 'border-dashed border-sky-300 bg-sky-50/60 text-[#005390] hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
                      )}
                      title="Add another time slot"
                    >
                      {freq > 5 ? `${freq}x` : '+ Slot'}
                    </button>
                  </div>
                </div>

                {/* Dynamic Time Slot Inputs */}
                <div
                  className={cn(
                    'grid gap-2',
                    freq === 1
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : freq === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-1 sm:grid-cols-3',
                  )}
                >
                  {sched.times.map((slotTime, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 bg-slate-50/60 p-2 dark:border-gray-700 dark:bg-slate-900/60"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Slot {idx + 1}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-sky-100 px-1.5 py-0.2 text-[9px] font-extrabold text-[#005390] dark:bg-sky-950 dark:text-sky-300">
                            {formatTimeTo12h(slotTime)}
                          </span>
                          {sched.times.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSlot(t.taskId, t.taskName, idx)}
                              className="rounded p-0.5 text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                              title="Remove slot"
                            >
                              <Trash2 className="size-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="time"
                        value={slotTime}
                        onChange={(e) => handleTimeChange(t.taskId, t.taskName, idx, e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 transition-colors focus:border-[#005390] focus:outline-none dark:border-gray-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PackageTaskSchedulesConfig
