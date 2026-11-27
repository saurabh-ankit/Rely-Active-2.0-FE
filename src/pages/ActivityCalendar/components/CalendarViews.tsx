import { useEffect, useState, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { CalendarCheck2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CalendarDaySummary, CalendarItem } from '@/lib/services/activityCalendarService'
import {
  CATEGORY_META,
  WEEKDAYS,
  addDays,
  formatDayLong,
  fromYmd,
  itemsOnDay,
  monthGridDays,
  summariesOnDay,
  viewRange,
} from '../calendarUtils'
import { ActivityChip, CountPill, ItemCard, Stagger, SummaryRow } from './ActivityParts'

interface ViewProps {
  cursor: string
  today: string
  items: CalendarItem[]
  summaries: CalendarDaySummary[]
  /** Open the day panel with every activity of that date. */
  onOpenDay: (day: string) => void
  /** Switch to the day view of that date. */
  onGoToDay: (day: string) => void
}

const SHELL = 'overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]'

const DayNumber = ({
  day,
  today,
  muted,
  onClick,
  large,
}: {
  day: string
  today: string
  muted?: boolean
  onClick: () => void
  large?: boolean
}) => {
  const d = fromYmd(day)
  const isToday = day === today
  return (
    <button
      type="button"
      title={`Open ${formatDayLong(day)} in day view`}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'flex shrink-0 cursor-pointer items-center justify-center rounded-full px-1 transition-all duration-150',
        large ? 'h-10 min-w-10 text-xl' : 'h-7 min-w-7 text-[13px]',
        isToday
          ? 'bg-gradient-to-br from-[#0a6cb5] to-[#005390] font-bold text-white shadow-[0_0_0_4px_rgba(0,83,144,0.12)] hover:scale-105'
          : muted
            ? 'font-medium text-gray-400 hover:bg-gray-100'
            : 'font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900',
      )}
    >
      {d.getDate() === 1 && !large && !isToday
        ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : d.getDate()}
    </button>
  )
}

const keyActivate = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    fn()
  }
}

// ── Month ─────────────────────────────────────────────────────────────────────

const MONTH_LINES = 3

export const MonthView = ({ cursor, today, items, summaries, onOpenDay, onGoToDay }: ViewProps) => {
  const days = monthGridDays(cursor)
  const month = fromYmd(cursor).getMonth()
  return (
    <div className={SHELL}>
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={cn(
              'py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.12em]',
              i === 0 || i === 6 ? 'text-gray-400' : 'text-gray-500',
            )}
          >
            {d}
          </div>
        ))}
      </div>
      {/* gap-px over a light background draws the grid lines */}
      <div className="grid grid-cols-7 gap-px bg-gray-100">
        {days.map((day, index) => {
          const dayItems = itemsOnDay(items, day)
          const daySummaries = summariesOnDay(summaries, day)
          const inMonth = fromYmd(day).getMonth() === month
          const weekend = [0, 6].includes(fromYmd(day).getDay())
          const isToday = day === today
          const lines = dayItems.length > MONTH_LINES ? MONTH_LINES - 1 : MONTH_LINES
          const shown = dayItems.slice(0, lines)
          const hidden = dayItems.length - shown.length
          const total = dayItems.length + daySummaries.length
          return (
            <motion.div
              key={day}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, delay: Math.min(index * 0.006, 0.2) }}
              role="button"
              tabIndex={0}
              aria-label={`${formatDayLong(day)}: ${total ? `${total} entries` : 'nothing scheduled'}`}
              onClick={() => onOpenDay(day)}
              onKeyDown={keyActivate(() => onOpenDay(day))}
              className={cn(
                'group relative flex min-h-[76px] cursor-pointer flex-col gap-1 p-1 outline-none transition-colors duration-150 sm:min-h-[128px] sm:p-1.5',
                'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#005390]/50',
                isToday
                  ? 'bg-gradient-to-b from-sky-50 via-white to-white ring-1 ring-inset ring-[#005390]/15'
                  : !inMonth
                    ? 'bg-gray-50/80 hover:bg-gray-50'
                    : weekend
                      ? 'bg-slate-50/50 hover:bg-sky-50/40'
                      : 'bg-white hover:bg-sky-50/40',
              )}
            >
              <div className="flex items-start justify-center gap-1 sm:justify-between">
                <DayNumber day={day} today={today} muted={!inMonth} onClick={() => onGoToDay(day)} />
                {daySummaries.length > 0 && (
                  <div className={cn('hidden flex-wrap justify-end gap-0.5 pt-1 sm:flex', !inMonth && 'opacity-50')}>
                    {daySummaries.map((s) => (
                      <CountPill key={`${s.category}-${s.label}`} summary={s} onOpen={() => onOpenDay(day)} />
                    ))}
                  </div>
                )}
              </div>
              <div className={cn('hidden min-w-0 space-y-[3px] sm:block', !inMonth && 'opacity-50')}>
                {shown.map((item) => (
                  <ActivityChip key={item.id} item={item} day={day} />
                ))}
                {hidden > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenDay(day)
                    }}
                    className="w-full cursor-pointer rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#005390]"
                  >
                    +{hidden} more
                  </button>
                )}
              </div>
              {/* Phones: coloured dots instead of chips */}
              {total > 0 && (
                <div className="mt-auto flex flex-wrap justify-center gap-0.5 sm:hidden">
                  {[...new Set([...dayItems, ...daySummaries].map((e) => e.category))].slice(0, 4).map((c) => (
                    <span key={c} className={cn('h-1.5 w-1.5 rounded-full', CATEGORY_META[c].dot)} />
                  ))}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ── Week ──────────────────────────────────────────────────────────────────────

export const WeekView = ({ cursor, today, items, summaries, onOpenDay, onGoToDay }: ViewProps) => {
  const { from } = viewRange('week', cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  return (
    <div className={cn(SHELL, 'overflow-x-auto')}>
      <div className="grid min-w-[760px] grid-cols-7 gap-px bg-gray-100">
        {days.map((day) => {
          const d = fromYmd(day)
          const isToday = day === today
          const dayItems = itemsOnDay(items, day)
          const daySummaries = summariesOnDay(summaries, day)
          return (
            <div
              key={day}
              className={cn(
                'flex min-h-[460px] flex-col bg-white',
                isToday && 'bg-gradient-to-b from-sky-50/70 to-white',
              )}
            >
              <div className="flex flex-col items-center gap-1 border-b border-gray-100 py-2.5">
                <span
                  className={cn(
                    'text-[11px] font-bold uppercase tracking-[0.12em]',
                    isToday ? 'text-[#005390]' : 'text-gray-500',
                  )}
                >
                  {WEEKDAYS[d.getDay()]}
                </span>
                <DayNumber day={day} today={today} onClick={() => onGoToDay(day)} large />
                {daySummaries.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-0.5 px-1">
                    {daySummaries.map((s) => (
                      <CountPill key={`${s.category}-${s.label}`} summary={s} onOpen={() => onOpenDay(day)} />
                    ))}
                  </div>
                )}
              </div>
              <div
                role="button"
                tabIndex={0}
                aria-label={`Open ${formatDayLong(day)}`}
                onClick={() => onOpenDay(day)}
                onKeyDown={keyActivate(() => onOpenDay(day))}
                className="flex flex-1 cursor-pointer flex-col gap-1 p-1.5 outline-none transition-colors hover:bg-sky-50/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#005390]/50"
              >
                {dayItems.map((item, i) => (
                  <Stagger key={item.id} index={i}>
                    <ActivityChip item={item} day={day} />
                  </Stagger>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Day (hourly timeline, every item) ─────────────────────────────────────────

const hourLabel = (h: number) => `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`

/** The current time, refreshed every minute. */
const useNow = () => {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

export const DayView = ({ cursor, today, items }: Pick<ViewProps, 'cursor' | 'today' | 'items'>) => {
  const now = useNow()
  const isToday = cursor === today
  const dayItems = itemsOnDay(items, cursor)
  // Timed on this day: single-day items with a time, or a multi-day item's first day
  const hourOf = (i: CalendarItem): number | null =>
    i.startTime && i.startDate === cursor ? Number(i.startTime.slice(0, 2)) : null
  const allDay = dayItems.filter((i) => hourOf(i) === null)
  const timed = dayItems.filter((i) => hourOf(i) !== null)
  const usedHours = [...timed.map((i) => hourOf(i)!), ...(isToday ? [now.getHours()] : [])]
  const firstHour = Math.min(7, ...usedHours)
  const lastHour = Math.max(21, ...usedHours)
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i)

  if (!dayItems.length && !isToday) return <EmptyState text={`Nothing scheduled on ${formatDayLong(cursor)}`} />

  let order = 0
  return (
    <div className={SHELL}>
      {allDay.length > 0 && (
        <div className="grid grid-cols-[64px_1fr] border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white sm:grid-cols-[84px_1fr]">
          <div className="px-2 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
            All day
          </div>
          <div className="space-y-1.5 p-2">
            {allDay.map((item) => (
              <Stagger key={item.id} index={order++}>
                <ItemCard item={item} day={cursor} />
              </Stagger>
            ))}
          </div>
        </div>
      )}
      {hours.map((h) => {
        const inHour = timed.filter((i) => hourOf(i) === h)
        const nowHere = isToday && now.getHours() === h
        return (
          <div
            key={h}
            className="relative grid min-h-[48px] grid-cols-[64px_1fr] border-b border-gray-100 last:border-b-0 sm:grid-cols-[84px_1fr]"
          >
            <div
              className={cn(
                'px-2 pt-2 text-right text-[11px] font-semibold tabular-nums',
                nowHere ? 'text-red-500' : 'text-gray-400',
              )}
            >
              {hourLabel(h)}
            </div>
            <div className={cn('space-y-1.5 border-l border-gray-100', inHour.length ? 'p-2' : 'p-0')}>
              {inHour.map((item) => (
                <Stagger key={item.id} index={order++}>
                  <ItemCard item={item} day={cursor} />
                </Stagger>
              ))}
            </div>
            {nowHere && (
              // Google-style "now" line
              <div
                className="pointer-events-none absolute left-[60px] right-0 z-10 flex items-center sm:left-[80px]"
                style={{ top: `${(now.getMinutes() / 60) * 100}%` }}
                aria-label="Current time"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                <span className="h-0.5 flex-1 bg-red-500/80" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Agenda (next 30 days, as a list) ──────────────────────────────────────────

export const AgendaView = ({ cursor, today, items, summaries, onOpenDay }: Omit<ViewProps, 'onGoToDay'>) => {
  const { from, to } = viewRange('agenda', cursor)
  const days: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d)
  const withContent = days.filter((d) => itemsOnDay(items, d).length || summariesOnDay(summaries, d).length)
  if (!withContent.length) return <EmptyState text="Nothing scheduled in these 30 days" />

  return (
    <div className="space-y-3">
      {withContent.map((day, index) => {
        const d = fromYmd(day)
        const isToday = day === today
        const daySummaries = summariesOnDay(summaries, day)
        return (
          <Stagger key={day} index={index}>
            <div className={cn(SHELL, 'flex flex-col sm:flex-row', isToday && 'ring-2 ring-[#005390]/20')}>
              <button
                type="button"
                onClick={() => onOpenDay(day)}
                className={cn(
                  'flex shrink-0 cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors sm:w-36 sm:flex-col sm:items-start sm:justify-start sm:border-b-0 sm:border-r',
                  isToday
                    ? 'bg-gradient-to-br from-[#0a6cb5] to-[#005390] text-white'
                    : 'bg-gray-50/60 hover:bg-gray-100/70',
                )}
              >
                <span className={cn('text-3xl font-bold leading-none tabular-nums', !isToday && 'text-gray-900')}>
                  {d.getDate()}
                </span>
                <span className="flex flex-col">
                  <span
                    className={cn(
                      'text-xs font-bold uppercase tracking-wide',
                      isToday ? 'text-white/90' : 'text-gray-500',
                    )}
                  >
                    {d.toLocaleDateString('en-IN', { weekday: 'long' })}
                  </span>
                  <span className={cn('text-xs', isToday ? 'text-white/80' : 'text-gray-400')}>
                    {isToday ? 'Today' : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                </span>
              </button>
              <div className="min-w-0 flex-1 space-y-1.5 p-2.5">
                {daySummaries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-0.5">
                    {daySummaries.map((s) => (
                      <SummaryRow key={`${s.category}-${s.label}`} summary={s} onOpen={() => onOpenDay(day)} />
                    ))}
                  </div>
                )}
                {itemsOnDay(items, day).map((item) => (
                  <ItemCard key={item.id} item={item} day={day} />
                ))}
              </div>
            </div>
          </Stagger>
        )
      })}
    </div>
  )
}

export const EmptyState = ({ text }: { text: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.25 }}
    className={cn(SHELL, 'flex flex-col items-center justify-center gap-3 py-20 text-center')}
  >
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50">
      <CalendarCheck2 className="h-7 w-7 text-[#005390]/60" />
    </span>
    <p className="text-sm font-semibold text-gray-700">{text}</p>
    <p className="text-xs text-gray-400">Enjoy the quiet — or pick another date.</p>
  </motion.div>
)
