import React from 'react'
import { format } from 'date-fns'
import { CheckCircle2, Moon, Pill, Sun, Sunrise, Sunset, Syringe, XCircle, type LucideIcon } from 'lucide-react'
import { MedicationMealTiming } from '@/lib/constants/medication'
import type { MedicationAdministrationKind, MedicationTimeOfDay, ResidentMedicationItem } from '@/lib/types/resident'
import { cn } from '@/lib/utils'
import { ClinicalRowActions } from './ClinicalRowActions'
import { MEAL_TIMING_SHORT_LABELS, ROUTE_LABELS, TIME_OF_DAY_LABELS } from './clinicalConstants'
import {
  administrationKey,
  doseUnitLabel,
  formatCardDate,
  formatTime12h,
  medicationDayStatus,
  type MedicationDayStatus,
  type TodayAdministrations,
} from './medicationSchedule'

const TIME_OF_DAY_ORDER: MedicationTimeOfDay[] = ['morning', 'afternoon', 'evening', 'night']

const TIME_OF_DAY_ICONS: Record<MedicationTimeOfDay, LucideIcon> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
  night: Moon,
}

const MEAL_CHIP_STYLES: Record<MedicationMealTiming, string> = {
  [MedicationMealTiming.BEFORE_FOOD]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  [MedicationMealTiming.AFTER_FOOD]: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  [MedicationMealTiming.WITH_FOOD]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  [MedicationMealTiming.NONE]: '',
}

const STATUS_BADGES: Record<MedicationDayStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'border-amber-300 bg-amber-50 text-amber-700' },
  COMPLETED: { label: 'Completed', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  CANCELLED: { label: 'Cancelled', className: 'border-orange-300 bg-orange-50 text-orange-700' },
  UPCOMING: { label: 'Upcoming', className: 'border-sky-300 bg-sky-50 text-sky-700' },
  ENDED: { label: 'Ended', className: 'border-gray-300 bg-gray-50 text-gray-500' },
  NOT_SCHEDULED: { label: 'Not scheduled', className: 'border-gray-300 bg-gray-50 text-gray-500' },
}

interface MedicationCardProps {
  med: ResidentMedicationItem
  kind: MedicationAdministrationKind
  today: string
  administrations: TodayAdministrations
  canUpdate: boolean
  onEdit: () => void
  onDelete: () => void
  onViewLog: () => void
}

export const MedicationCard: React.FC<MedicationCardProps> = ({
  med,
  kind,
  today,
  administrations,
  canUpdate,
  onEdit,
  onDelete,
  onViewLog,
}) => {
  const isInsulin = kind === 'INSULIN'
  const KindIcon = isInsulin ? Syringe : Pill
  const unit = doseUnitLabel(kind, med)
  const status = medicationDayStatus(med, kind, today, administrations)
  const badge = STATUS_BADGES[status]
  const showTodayMarks = status === 'PENDING' || status === 'COMPLETED' || status === 'CANCELLED'
  const timings = TIME_OF_DAY_ORDER.map((timeOfDay) => med.timings.find((t) => t.timeOfDay === timeOfDay) ?? null)
  const selectedTimes = timings.flatMap((t) => (t?.selected ? [formatTime12h(t.time)] : []))

  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white p-3.5 shadow-sm space-y-2.5 dark:border-gray-800 dark:from-slate-900 dark:to-slate-900/60',
        status === 'ENDED' && 'opacity-70',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-[180px] flex-1 items-start gap-2.5">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              isInsulin
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300'
                : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300',
            )}
          >
            <KindIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <h4 className="truncate text-sm font-bold text-gray-900 dark:text-white">{med.medicineName}</h4>
            <p className="text-[11px] text-gray-500">
              Start:{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCardDate(med.startDate)}</span>
              <span className="ml-2.5">
                End:{' '}
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {med.isUntilDischarge || !med.endDate ? 'Until discharge' : formatCardDate(med.endDate)}
                </span>
              </span>
            </p>
            <p className="text-[11px] text-gray-500">
              Time:{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {selectedTimes.length ? selectedTimes.join(', ') : '—'}
              </span>
            </p>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-4 gap-1.5">
          {timings.map((timing, index) => {
            const timeOfDay = TIME_OF_DAY_ORDER[index]
            const Icon = TIME_OF_DAY_ICONS[timeOfDay]
            const active = Boolean(timing?.selected)
            const record = active ? administrations.get(administrationKey(kind, med.id, timeOfDay)) : undefined
            const mark = showTodayMarks ? record?.status : undefined
            const markTitle =
              mark === 'COMPLETED'
                ? `Given by ${record?.nurseName || 'Nurse'}${record?.completedAt ? ` at ${format(new Date(record.completedAt), 'hh:mm a')}` : ''}`
                : mark === 'CANCELLED'
                  ? `Cancelled by ${record?.cancelledByName || 'Nurse'}${record?.cancelledAt ? ` at ${format(new Date(record.cancelledAt), 'hh:mm a')}` : ''}`
                  : undefined
            const mealLabel = timing ? MEAL_TIMING_SHORT_LABELS[timing.mealTiming] : ''
            return (
              <div
                key={timeOfDay}
                title={
                  active && timing
                    ? [formatTime12h(timing.time), ROUTE_LABELS[timing.route] || timing.route, markTitle]
                        .filter(Boolean)
                        .join(' • ')
                    : undefined
                }
                className={cn(
                  'relative flex h-[68px] w-[60px] flex-col items-center justify-start gap-0.5 rounded-xl border px-1 pt-1.5 text-center',
                  active
                    ? 'border-orange-200 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/30'
                    : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-slate-900',
                )}
              >
                {mark === 'COMPLETED' && (
                  <CheckCircle2 className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-white text-emerald-600 dark:bg-slate-900" />
                )}
                {mark === 'CANCELLED' && (
                  <XCircle className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-white text-orange-600 dark:bg-slate-900" />
                )}
                <Icon className={cn('h-3.5 w-3.5', active ? 'text-orange-500' : 'text-gray-400')} />
                <span
                  className={cn(
                    'text-[9px] font-semibold leading-tight',
                    active ? 'text-gray-900 dark:text-white' : 'text-gray-400',
                  )}
                >
                  {TIME_OF_DAY_LABELS[timeOfDay]}
                </span>
                {active && timing ? (
                  <>
                    <span className="text-[10px] font-bold leading-tight text-gray-900 dark:text-white">
                      {timing.dose} <span className="text-[8px] font-medium text-gray-500">{unit}</span>
                    </span>
                    {mealLabel && (
                      <span
                        className={cn(
                          'rounded px-1 text-[8px] font-bold leading-tight',
                          MEAL_CHIP_STYLES[timing.mealTiming],
                        )}
                      >
                        {mealLabel}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[10px] text-gray-300 dark:text-gray-600">—</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-slate-100/70 px-2.5 py-1.5 text-[11px] dark:border-gray-800 dark:bg-slate-800/50">
        <span className="font-semibold text-gray-700 dark:text-gray-300">Note:</span>{' '}
        <span className="italic text-gray-500 dark:text-gray-400">{med.note || 'No special instructions'}</span>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-2 dark:border-gray-800">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              badge.className,
            )}
          >
            {badge.label}
          </span>
          <button
            type="button"
            onClick={onViewLog}
            className="text-[11px] font-semibold text-[#005390] hover:underline dark:text-sky-400"
          >
            View log
          </button>
        </div>
        {canUpdate && (
          <ClinicalRowActions label={isInsulin ? 'insulin' : 'medication'} onEdit={onEdit} onDelete={onDelete} />
        )}
      </div>
    </div>
  )
}

export default MedicationCard
