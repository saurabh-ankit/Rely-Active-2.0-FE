import { useMemo } from 'react'
import { format, isToday, isValid, isYesterday, parseISO } from 'date-fns'
import { ArrowRight, HeartPulse, History, LogIn, MessageSquareText, Stethoscope, Truck, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEmployeeWorkLog } from '@/hooks/react-query/user'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/common/DetailPanel'
import { cn } from '@/lib/utils'
import type { WorkLogEvent } from '@/lib/types/employeeActivity'
import { EmptyState, LoadingState, StatusPill } from './shared'
import type { DateRange } from './utils'

const MODULE_STYLE: Record<WorkLogEvent['module'], { icon: LucideIcon; label: string; cls: string }> = {
  ticket: { icon: Wrench, label: 'Ticket', cls: 'bg-[#005390]/10 text-[#005390]' },
  gate: { icon: LogIn, label: 'Gate', cls: 'bg-indigo-50 text-indigo-600' },
  fnb: { icon: Truck, label: 'Delivery', cls: 'bg-orange-50 text-orange-600' },
  care: { icon: HeartPulse, label: 'Care', cls: 'bg-rose-50 text-rose-600' },
  clinical: { icon: Stethoscope, label: 'Clinical', cls: 'bg-teal-50 text-teal-600' },
}

const dayLabel = (date: Date) =>
  isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'EEEE, dd MMM yyyy')

const LogEntry = ({ event }: { event: WorkLogEvent }) => {
  const style = MODULE_STYLE[event.module]
  const at = parseISO(event.at)
  return (
    <li className="grid grid-cols-[56px_28px_minmax(0,1fr)] gap-x-3">
      <span className="pt-1 text-right font-mono text-[11px] text-gray-400">
        {isValid(at) ? format(at, 'h:mm a') : ''}
      </span>

      {/* Rail: module icon on a vertical line that joins the entries of a day */}
      <div className="relative flex justify-center">
        <span className="absolute inset-y-0 w-px bg-gray-100 dark:bg-gray-800" />
        <span className={cn('relative z-10 flex h-7 w-7 items-center justify-center rounded-full', style.cls)}>
          <style.icon className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="min-w-0 pb-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{event.action}</span>
          {event.code && (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {event.code}
            </span>
          )}
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-gray-400">{style.label}</span>
        </div>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{event.title}</p>
        {event.subtitle && <p className="text-xs text-gray-500">{event.subtitle}</p>}

        {(event.fromStatus || event.toStatus) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {event.fromStatus && <StatusPill value={event.fromStatus} />}
            <ArrowRight className="h-3 w-3 text-gray-400" />
            {event.toStatus && <StatusPill value={event.toStatus} />}
          </div>
        )}
        {event.note && (
          <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-gray-600 dark:bg-slate-800 dark:text-gray-300">
            <MessageSquareText className="mt-px h-3.5 w-3.5 shrink-0 text-gray-400" />
            {event.note}
          </p>
        )}
        {event.actor && <p className="mt-1 text-[11px] text-gray-400">by {event.actor}</p>}
      </div>
    </li>
  )
}

/** Every recorded action by this employee across modules, newest first and grouped by day. */
export const WorkLogTimeline = ({
  employeeId,
  employeeName,
  range,
  locId,
}: {
  employeeId: string
  employeeName: string
  range: DateRange
  locId: string | null
}) => {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useEmployeeWorkLog(employeeId, {
    ...range,
    locId,
    limit: 25,
  })

  const days = useMemo(() => {
    const groups: Array<{ key: string; label: string; events: WorkLogEvent[] }> = []
    for (const event of data?.pages.flatMap((p) => p.rows) ?? []) {
      const date = parseISO(event.at)
      const key = isValid(date) ? format(date, 'yyyy-MM-dd') : 'unknown'
      const last = groups[groups.length - 1]
      if (last?.key === key) last.events.push(event)
      else groups.push({ key, label: isValid(date) ? dayLabel(date) : 'Unknown date', events: [event] })
    }
    return groups
  }, [data])

  return (
    <Panel icon={History} title="Work log">
      <p className="-mt-1 mb-4 text-xs text-gray-500">
        Everything {employeeName} did in the app during the selected dates, newest first.
      </p>
      {isLoading ? (
        <LoadingState label="Loading work log…" />
      ) : days.length === 0 ? (
        <EmptyState
          label="No recorded work in this period"
          hint={`Actions show up here when ${employeeName} is assigned work or starts, updates or completes it — tickets, gate check-ins, deliveries, care tasks or consultations.`}
        />
      ) : (
        <div className="space-y-4">
          {days.map(({ key, label, events }) => (
            <section key={key}>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200">{label}</h3>
                <span className="text-[11px] text-gray-400">
                  {events.length} {events.length === 1 ? 'action' : 'actions'}
                </span>
                <span className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
              </div>
              <ol>
                {events.map((event) => (
                  <LogEntry key={event.id} event={event} />
                ))}
              </ol>
            </section>
          ))}
          {hasNextPage && (
            <div className="text-center">
              <Button
                variant="secondary"
                className="h-8 rounded-xl text-xs"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {isFetchingNextPage ? 'Loading…' : 'Show older activity'}
              </Button>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}
