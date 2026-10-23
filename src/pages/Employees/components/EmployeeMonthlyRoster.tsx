import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Clock, Loader2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useListShiftEmployeeDates } from '@/hooks/react-query/roster'
import { Panel } from '@/components/common/DetailPanel'
import { cn } from '@/lib/utils'
import type { ShiftEmployeeDate } from '@/lib/types/roster'
import { buildLocationLabel, resolveLifecycleRosterStatus } from '@/pages/ShiftRoster/utils'

interface RosterDay {
  id: string
  date: string
  shiftName: string
  time: string | null
  location: string | null
  status: string
  isCover: boolean
  leaveType: string | null
}

/** One look per roster state; the legend under the calendar uses the same list. */
const STATE_STYLE: Record<string, { label: string; chip: string; dot: string }> = {
  upcoming: { label: 'Scheduled', chip: 'border-[#005390]/20 bg-[#005390]/5 text-[#005390]', dot: 'bg-[#005390]' },
  on_duty: { label: 'On duty now', chip: 'border-sky-300 bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  completed: { label: 'Completed', chip: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  covering: {
    label: 'Covering for someone',
    chip: 'border-violet-200 bg-violet-50 text-violet-700',
    dot: 'bg-violet-500',
  },
  leave: { label: 'Leave / absent', chip: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
  week_off: { label: 'Week off', chip: 'border-gray-200 bg-gray-50 text-gray-500', dot: 'bg-gray-400' },
}

const stateOf = (d: RosterDay) => {
  if (d.isCover) return 'covering'
  if (d.status === 'day_off') return d.leaveType === 'week_off' || !d.leaveType ? 'week_off' : 'leave'
  if (d.status === 'absent') return 'leave'
  if (d.status === 'covered') return 'leave' // someone else took this shift
  return STATE_STYLE[d.status] ? d.status : 'upcoming'
}

const chipLabel = (d: RosterDay) => {
  const state = stateOf(d)
  if (state === 'week_off') return 'Week off'
  if (state === 'leave') return d.leaveType ? `${d.leaveType.replace(/_/g, ' ')} leave` : 'Absent'
  return d.shiftName
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** The employee's shifts for one month as a calendar, starting on the current month. */
export const EmployeeMonthlyRoster = ({
  employeeId,
  showFullRosterLink,
}: {
  employeeId: string
  showFullRosterLink: boolean
}) => {
  const navigate = useNavigate()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const from = format(month, 'yyyy-MM-dd')
  const to = format(endOfMonth(month), 'yyyy-MM-dd')

  const { data, isLoading, isFetching } = useListShiftEmployeeDates({ employeeId, from, to })

  const byDate = useMemo(() => {
    const map = new Map<string, RosterDay[]>()
    for (const d of (Array.isArray(data?.data) ? data.data : []) as ShiftEmployeeDate[]) {
      if (d.isDeleted) continue
      const a = d.shiftAssignment
      const start = a?.shift?.startTime?.slice(0, 5)
      const end = a?.shift?.endTime?.slice(0, 5)
      const isCover = d.coveredByEmployeeId === employeeId && a?.employeeId !== employeeId
      const day: RosterDay = {
        id: d.id,
        date: d.date,
        shiftName: a?.shift?.name || 'Shift',
        time: a?.slotTimeRange || (start && end ? `${start}–${end}` : null),
        location: a ? buildLocationLabel(a as Parameters<typeof buildLocationLabel>[0]) : null,
        status: resolveLifecycleRosterStatus(
          d.status,
          d.date,
          a?.shift?.startTime,
          a?.shift?.endTime,
          a?.slotTimeRange,
        ),
        isCover,
        leaveType: d.leaveType ?? null,
      }
      map.set(d.date, [...(map.get(d.date) ?? []), day])
    }
    return map
  }, [data, employeeId])

  const days = eachDayOfInterval({
    start: startOfWeek(month, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  })
  const entries = [...byDate.values()].flat().sort((a, b) => a.date.localeCompare(b.date))
  const working = entries.filter((e) => !['week_off', 'leave'].includes(stateOf(e)))
  const leaves = entries.filter((e) => stateOf(e) === 'leave')
  const isCurrentMonth = isSameMonth(month, new Date())

  return (
    <Panel
      icon={Clock}
      title="Shift roster"
      action={
        showFullRosterLink ? (
          <Button
            type="button"
            variant="link"
            onClick={() => navigate(`/admin/shift-roster-management/employees/${employeeId}`)}
            className="h-auto p-0 cursor-pointer text-xs font-semibold text-[#005390] hover:text-[#004274] hover:bg-transparent hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          >
            Manage roster →
          </Button>
        ) : null
      }
    >
      {/* Month switcher and the month at a glance */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg border-gray-200 text-gray-600 hover:bg-slate-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-slate-800"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[128px] text-center text-sm font-bold text-gray-900 dark:text-white">
            {format(month, 'MMMM yyyy')}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg border-gray-200 text-gray-600 hover:bg-slate-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-slate-800"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentMonth && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMonth(startOfMonth(new Date()))}
              className="ml-1 h-auto rounded-lg px-2 py-1 text-xs font-semibold text-[#005390] hover:text-[#004274] hover:bg-[#005390]/5 dark:text-sky-400 dark:hover:text-sky-300"
            >
              This month
            </Button>
          )}
          {isFetching && !isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
        </div>
        <p className="text-xs text-gray-500">
          <span className="font-bold text-gray-900 dark:text-white">{working.length}</span>{' '}
          {working.length === 1 ? 'shift' : 'shifts'}
          {leaves.length > 0 && (
            <>
              {' · '}
              <span className="font-bold text-rose-600">{leaves.length}</span> leave
            </>
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-primary" />
          Loading roster…
        </div>
      ) : (
        <>
          {/* Calendar (tablet and up) */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-100 sm:block dark:border-gray-800">
            <div className="grid grid-cols-7 border-b border-gray-100 bg-slate-50 dark:border-gray-800 dark:bg-slate-800/50">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const key = format(day, 'yyyy-MM-dd')
                const inMonth = isSameMonth(day, month)
                const dayEntries = inMonth ? (byDate.get(key) ?? []) : []
                return (
                  <div
                    key={key}
                    className={cn(
                      'min-h-[84px] border-gray-100 p-1.5 dark:border-gray-800',
                      i % 7 !== 6 && 'border-r',
                      i < days.length - 7 && 'border-b',
                      !inMonth && 'bg-slate-50/60 dark:bg-slate-900/40',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                        !inMonth && 'text-gray-300 dark:text-gray-600',
                        inMonth && 'font-semibold text-gray-700 dark:text-gray-300',
                        inMonth && isToday(day) && 'bg-[#005390] font-bold text-white',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayEntries.map((e) => {
                        const style = STATE_STYLE[stateOf(e)]
                        return (
                          <div
                            key={e.id}
                            title={[chipLabel(e), e.time, e.location, style.label].filter(Boolean).join(' · ')}
                            className={cn('rounded-md border px-1.5 py-1 text-[11px] leading-tight', style.chip)}
                          >
                            <p className="truncate font-semibold capitalize">{chipLabel(e)}</p>
                            {e.time && !['week_off', 'leave'].includes(stateOf(e)) && (
                              <p className="truncate font-mono text-[10px] opacity-80">{e.time}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Day list (phones) */}
          <div className="sm:hidden">
            {entries.length === 0 ? null : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {entries.map((e) => {
                  const style = STATE_STYLE[stateOf(e)]
                  const date = parseISO(e.date)
                  return (
                    <li key={e.id} className="flex items-center gap-3 py-2.5">
                      <div className="w-10 shrink-0 text-center">
                        <p className="text-[10px] font-bold uppercase text-gray-400">{format(date, 'EEE')}</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{format(date, 'd')}</p>
                      </div>
                      <div className={cn('min-w-0 flex-1 rounded-lg border px-2.5 py-1.5', style.chip)}>
                        <p className="truncate text-xs font-semibold capitalize">{chipLabel(e)}</p>
                        <p className="truncate text-[11px] opacity-80">
                          {[e.time, e.location, style.label].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {entries.length === 0 && (
            <p className="mt-3 rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400 sm:mt-3 dark:border-gray-700">
              No shifts scheduled in {format(month, 'MMMM')}.
            </p>
          )}

          {/* Where they work this month */}
          {working.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
              {[...new Set(working.map((e) => e.location).filter(Boolean))].map((loc) => (
                <span key={loc} className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {loc}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
            {Object.entries(STATE_STYLE).map(([key, s]) => (
              <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className={cn('h-2 w-2 rounded-full', s.dot)} />
                {s.label}
              </span>
            ))}
          </div>
        </>
      )}
    </Panel>
  )
}
