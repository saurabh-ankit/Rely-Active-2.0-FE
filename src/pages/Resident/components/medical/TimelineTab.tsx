import React, { useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplets,
  ExternalLink,
  FlaskConical,
  HeartPulse,
  History,
  ListChecks,
  Pill,
  Stethoscope,
  Syringe,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar, CalendarDayButton } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { useResidentTimelineQuery } from '@/hooks/react-query/resident'
import type { ResidentTimelineEvent, ResidentTimelineEventType } from '@/lib/types/resident'
import { cn, getFileUrl } from '@/lib/utils'
import { ClinicalCard, ClinicalEmptyState, ClinicalErrorBanner, ClinicalLoadingState } from './ClinicalShared'

const TYPE_STYLES: Record<ResidentTimelineEventType, { label: string; icon: LucideIcon; dot: string; badge: string }> =
  {
    appointment: {
      label: 'Doctor Visit',
      icon: Stethoscope,
      dot: 'bg-[#005390]',
      badge: 'border-blue-200 bg-blue-50 text-[#005390]',
    },
    medication: {
      label: 'Medicine',
      icon: Pill,
      dot: 'bg-emerald-600',
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    insulin: {
      label: 'Insulin',
      icon: Syringe,
      dot: 'bg-teal-600',
      badge: 'border-teal-200 bg-teal-50 text-teal-700',
    },
    vital: {
      label: 'Vitals',
      icon: Activity,
      dot: 'bg-rose-500',
      badge: 'border-rose-200 bg-rose-50 text-rose-700',
    },
    lab: {
      label: 'Lab Report',
      icon: FlaskConical,
      dot: 'bg-violet-600',
      badge: 'border-violet-200 bg-violet-50 text-violet-700',
    },
    allergy: {
      label: 'Allergy',
      icon: AlertTriangle,
      dot: 'bg-amber-500',
      badge: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    care_task: {
      label: 'Care Task',
      icon: ListChecks,
      dot: 'bg-sky-600',
      badge: 'border-sky-200 bg-sky-50 text-sky-700',
    },
    condition: {
      label: 'Condition',
      icon: HeartPulse,
      dot: 'bg-pink-600',
      badge: 'border-pink-200 bg-pink-50 text-pink-700',
    },
    incident: {
      label: 'Incident',
      icon: AlertOctagon,
      dot: 'bg-orange-600',
      badge: 'border-orange-200 bg-orange-50 text-orange-700',
    },
    fluid_balance: {
      label: 'Fluid Balance',
      icon: Droplets,
      dot: 'bg-cyan-600',
      badge: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    },
  }

const TYPE_FILTERS: Array<{ value: ResidentTimelineEventType; label: string }> = [
  { value: 'appointment', label: 'Doctor Visit' },
  { value: 'medication', label: 'Medicine' },
  { value: 'insulin', label: 'Insulin' },
  { value: 'vital', label: 'Vitals' },
  { value: 'lab', label: 'Lab Reports' },
  { value: 'allergy', label: 'Allergies' },
  { value: 'care_task', label: 'Care Tasks' },
  { value: 'condition', label: 'Condition' },
  { value: 'incident', label: 'Incidents' },
  { value: 'fluid_balance', label: 'Fluid Balance' },
]

const PAGE_SIZE = 25

const panelClass = 'rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-slate-900'

const filterLabelClass = 'text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400'

const toDay = (ymd: string) => new Date(`${ymd}T00:00:00`)

const TimelineDayButton = ({ className, ...props }: React.ComponentProps<typeof CalendarDayButton>) => (
  <CalendarDayButton
    className={cn(
      'rounded-full text-xs data-[selected-single=true]:bg-[#005390] data-[selected-single=true]:font-bold data-[selected-single=true]:text-white',
      className,
    )}
    {...props}
  />
)

const TimelineEntry: React.FC<{ event: ResidentTimelineEvent; isLast: boolean }> = ({ event, isLast }) => {
  const style = TYPE_STYLES[event.type] ?? TYPE_STYLES.care_task
  const Icon = style.icon
  const at = new Date(event.at)
  const hasTime = !Number.isNaN(at.getTime())
  return (
    <li className="relative flex gap-4 pb-5">
      {!isLast && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />}
      <div
        className={cn(
          'relative z-10 mt-3 flex size-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-4 ring-white dark:ring-slate-900',
          style.dot,
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-slate-900">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{event.title}</h3>
            <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', style.badge)}>
              {style.label}
            </span>
          </div>
          {hasTime && (
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] font-medium text-gray-500">
              <Clock className="size-3.5" />
              {format(at, 'hh:mm a')} • {format(at, 'dd MMM yyyy')}
            </span>
          )}
        </div>
        {event.description && (
          <p className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-600 dark:text-gray-300">
            {event.description}
          </p>
        )}
        {(event.createdBy?.name || event.fileUrl) && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2 dark:border-gray-800">
            <span className="text-[11px] text-gray-500">
              <span className="font-semibold text-gray-600 dark:text-gray-300">Recorded by:</span>{' '}
              {event.createdBy?.name || '-'}
            </span>
            {event.fileUrl && (
              <a
                href={getFileUrl(event.fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#005390] hover:underline"
              >
                <ExternalLink className="size-3.5" /> View report
              </a>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

interface TimelineTabProps {
  residentId: string
  minDate?: string | null
}

export const TimelineTab: React.FC<TimelineTabProps> = ({ residentId, minDate }) => {
  const today = format(new Date(), 'yyyy-MM-dd')
  const floorDate = minDate && minDate.slice(0, 10) <= today ? minDate.slice(0, 10) : undefined
  const [selectedDate, setSelectedDate] = useState(today)
  const [month, setMonth] = useState(() => toDay(today))
  const [types, setTypes] = useState<ResidentTimelineEventType[]>([])
  const [page, setPage] = useState(1)

  const params = useMemo(
    () => ({
      startDate: selectedDate,
      endDate: selectedDate,
      page,
      limit: PAGE_SIZE,
      types: types.length ? types.join(',') : undefined,
    }),
    [selectedDate, page, types],
  )
  const { data, isLoading, isError, isFetching } = useResidentTimelineQuery(residentId, params)

  const events = data?.events ?? []
  const pagination = data?.pagination
  const total = pagination?.total ?? 0
  const totalPages = pagination?.totalPages ?? 1
  const displayDate = format(toDay(selectedDate), 'dd MMM yyyy')

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return
    setSelectedDate(format(date, 'yyyy-MM-dd'))
    setPage(1)
  }

  const toggleType = (value: ResidentTimelineEventType, checked: boolean) => {
    setTypes((prev) => (checked ? [...prev, value] : prev.filter((t) => t !== value)))
    setPage(1)
  }

  return (
    <ClinicalCard
      icon={History}
      iconClassName="text-[#005390]"
      title={`Resident Timeline (${displayDate})`}
      count={isLoading ? undefined : total}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className={cn(panelClass, 'p-3')}>
            <Calendar
              mode="single"
              required
              selected={toDay(selectedDate)}
              onSelect={handleSelectDate}
              month={month}
              onMonthChange={setMonth}
              startMonth={floorDate ? toDay(floorDate) : undefined}
              endMonth={toDay(today)}
              disabled={[{ after: toDay(today) }, ...(floorDate ? [{ before: toDay(floorDate) }] : [])]}
              className="w-full bg-transparent p-0 [--cell-size:--spacing(8)]"
              classNames={{
                root: 'w-full',
                caption_label: 'text-sm font-bold text-gray-900 dark:text-white',
                today: '[&>button]:ring-1 [&>button]:ring-[#005390] [&>button]:font-bold',
              }}
              components={{ DayButton: TimelineDayButton }}
            />
          </div>

          <div className={panelClass}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
              <span className={filterLabelClass}>Filter by event type</span>
              {types.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTypes([])
                    setPage(1)
                  }}
                  className="text-[11px] font-bold text-[#005390] hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="mt-3 space-y-2.5">
              {TYPE_FILTERS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  <Checkbox
                    checked={types.includes(option.value)}
                    onCheckedChange={(checked) => toggleType(option.value, Boolean(checked))}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          {isError && <ClinicalErrorBanner message="Failed to load the timeline for this resident." />}

          {isLoading ? (
            <ClinicalLoadingState label="Loading timeline..." />
          ) : events.length === 0 ? (
            <ClinicalEmptyState
              icon={History}
              title="No timeline entries"
              description={`No activity recorded on ${displayDate}.`}
            />
          ) : (
            <ol
              className={cn(
                'max-h-[640px] overflow-y-auto overscroll-contain pr-2 transition-opacity',
                isFetching && 'opacity-60',
              )}
            >
              {events.map((event, index) => (
                <TimelineEntry key={event.id} event={event} isLast={index === events.length - 1} />
              ))}
            </ol>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
              <span className="text-[11px] font-medium text-gray-500">
                Page {pagination?.page ?? page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="cancel"
                  size="sm"
                  disabled={!pagination?.hasPrevious || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft /> Previous
                </Button>
                <Button
                  variant="cancel"
                  size="sm"
                  disabled={!pagination?.hasNext || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </ClinicalCard>
  )
}

export default TimelineTab
