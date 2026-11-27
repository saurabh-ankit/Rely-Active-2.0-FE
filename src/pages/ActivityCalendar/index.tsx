import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { CalendarRange, ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/hooks/useAuth'
import { useLocation } from '@/hooks/useLocation'
import { useActivityCalendar } from '@/hooks/react-query/activityCalendar'
import type { CalendarCategory } from '@/lib/services/activityCalendarService'
import { cn } from '@/lib/utils'
import { isManagerAtLocation } from '@/utils/departmentManager'
import {
  AGENDA_DAYS,
  CATEGORY_META,
  CATEGORY_ORDER,
  VIEW_MODES,
  addDays,
  addMonths,
  fromYmd,
  isValidYmd,
  toYmd,
  viewRange,
  viewTitle,
  type ViewMode,
} from './calendarUtils'
import { AgendaView, DayView, MonthView, WeekView } from './components/CalendarViews'
import { DayDetailSheet } from './components/DayDetailSheet'

const HIDDEN_KEY = 'rely-task-calendar-hidden'
const EASE = [0.22, 1, 0.36, 1] as const

const loadHidden = (): Set<CalendarCategory> => {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY)
    const list = raw ? (JSON.parse(raw) as string[]) : []
    return new Set(list.filter((c): c is CalendarCategory => c in CATEGORY_META))
  } catch {
    return new Set()
  }
}

const saveHidden = (hidden: Set<CalendarCategory>) => {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]))
  } catch {
    // Storage unavailable (private window): filters just aren't remembered
  }
}

const PANEL = 'rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]'

const Notice = ({ text }: { text: string }) => (
  <div className={cn(PANEL, 'flex flex-col items-center gap-3 py-20 text-center')}>
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
      <Lock className="h-6 w-6 text-gray-400" />
    </span>
    <p className="text-sm font-semibold text-gray-700">{text}</p>
  </div>
)

const TaskCalendarPage = () => {
  const { user } = useAuth()
  const { selectedLocationId, selectedLocationName } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const localToday = toYmd(new Date())

  // The URL holds the view and date, so refresh / back keep your place. Default: today, month.
  const viewParam = searchParams.get('view') as ViewMode | null
  const view: ViewMode = viewParam && VIEW_MODES.includes(viewParam) ? viewParam : 'month'
  const dateParam = searchParams.get('date')
  const cursor = isValidYmd(dateParam) ? dateParam : localToday

  const [openDay, setOpenDay] = useState<string | null>(null)
  const [hidden, setHidden] = useState<Set<CalendarCategory>>(loadHidden)
  /** Which way the last navigation went, so the grid slides that way. */
  const [direction, setDirection] = useState(0)

  const range = useMemo(() => viewRange(view, cursor), [view, cursor])
  const isManager = isManagerAtLocation(user, selectedLocationId)
  const { data, isFetching, isError, error } = useActivityCalendar(range, !isManager)
  const { data: todayData } = useActivityCalendar({ from: localToday, to: localToday }, !isManager)
  const today = data?.today ?? localToday

  const setPlace = useCallback(
    (next: { view?: ViewMode; date?: string }) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('view', next.view ?? view)
          p.set('date', next.date ?? cursor)
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams, view, cursor],
  )

  const step = (dir: 1 | -1) => {
    setDirection(dir)
    if (view === 'month') setPlace({ date: addMonths(cursor, dir) })
    else if (view === 'week') setPlace({ date: addDays(cursor, 7 * dir) })
    else if (view === 'agenda') setPlace({ date: addDays(cursor, AGENDA_DAYS * dir) })
    else setPlace({ date: addDays(cursor, dir) })
  }

  const jumpTo = (date: string, nextView?: ViewMode) => {
    setDirection(date === cursor ? 0 : date > cursor ? 1 : -1)
    setPlace({ date, view: nextView })
  }

  const goToDay = (day: string) => {
    setOpenDay(null)
    jumpTo(day, 'day')
  }

  const toggle = (c: CalendarCategory) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      saveHidden(next)
      return next
    })
  }
  const setAll = (show: boolean) => {
    const next = new Set<CalendarCategory>(show ? [] : (data?.categories.map((c) => c.key) ?? []))
    saveHidden(next)
    setHidden(next)
  }

  const available = useMemo(() => data?.categories.map((c) => c.key) ?? [], [data])
  const items = useMemo(() => (data?.items ?? []).filter((i) => !hidden.has(i.category)), [data, hidden])
  const summaries = useMemo(() => (data?.summaries ?? []).filter((s) => !hidden.has(s.category)), [data, hidden])

  /** How many entries each category has in the visible range. */
  const counts = useMemo(() => {
    const out: Partial<Record<CalendarCategory, number>> = {}
    for (const i of data?.items ?? []) {
      if (i.endDate >= range.from && i.startDate <= range.to) out[i.category] = (out[i.category] ?? 0) + 1
    }
    for (const s of data?.summaries ?? []) {
      if (s.date >= range.from && s.date <= range.to) out[s.category] = (out[s.category] ?? 0) + s.total
    }
    return out
  }, [data, range])

  /** Today at a glance: every activity today, per category. */
  const glance = useMemo(() => {
    const out: Array<{ category: CalendarCategory; count: number }> = []
    if (!todayData || todayData.from !== localToday) return null
    for (const c of CATEGORY_ORDER) {
      const count = todayData.items.filter((i) => i.category === c).length
      if (count) out.push({ category: c, count })
    }
    return out
  }, [todayData, localToday])

  if (isManager) {
    return <Notice text="The Task Calendar isn't available to Department Managers." />
  }

  const status = (error as { response?: { status?: number } } | null)?.response?.status
  const title = viewTitle(view, cursor)

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-4">
        <PageHeader
          title="Task Calendar"
          icon={CalendarRange}
          description={`All activities at ${selectedLocationName || 'this property'}, day by day. Read only — open an activity to manage it in its own module.`}
          actions={
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-gray-500">Today</span>
              {glance === null ? (
                [0, 1].map((i) => <span key={i} className="h-7 w-20 animate-pulse rounded-lg bg-gray-100" />)
              ) : glance.length === 0 ? (
                <span className="text-xs text-gray-400">Nothing scheduled</span>
              ) : (
                glance.map((g, i) => {
                  const meta = CATEGORY_META[g.category]
                  const Icon = meta.icon
                  return (
                    <motion.button
                      key={g.category}
                      type="button"
                      title={`Open today's ${meta.label.toLowerCase()}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.05, ease: EASE }}
                      onClick={() => setOpenDay(localToday)}
                      className={cn(
                        'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border border-transparent px-2 text-xs font-semibold transition-all hover:-translate-y-px hover:shadow-xs',
                        meta.soft,
                        meta.text,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="tabular-nums">{g.count}</span>
                      <span className="font-medium">{meta.label}</span>
                    </motion.button>
                  )
                })
              )}
            </div>
          }
        />

        {/* Toolbar */}
        <div
          className={cn(
            PANEL,
            'relative flex flex-col gap-3 overflow-hidden p-3 sm:flex-row sm:items-center sm:justify-between',
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex shrink-0 items-center rounded-xl border border-gray-200 bg-gray-50 p-0.5">
              <button
                type="button"
                aria-label="Previous"
                onClick={() => step(-1)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-600 transition-all hover:bg-white hover:text-[#005390] hover:shadow-xs active:scale-95"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => jumpTo(localToday)}
                className="h-8 cursor-pointer rounded-lg px-3 text-xs font-semibold text-gray-700 transition-all hover:bg-white hover:text-[#005390] hover:shadow-xs active:scale-95"
              >
                Today
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={() => step(1)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-600 transition-all hover:bg-white hover:text-[#005390] hover:shadow-xs active:scale-95"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="relative min-w-0 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.h2
                  key={title}
                  initial={{ opacity: 0, y: direction >= 0 ? 10 : -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: direction >= 0 ? -10 : 10 }}
                  transition={{ duration: 0.16 }}
                  className="truncate text-base font-bold text-gray-900 sm:text-lg"
                >
                  {title}
                </motion.h2>
              </AnimatePresence>
            </div>
            {isFetching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-300" aria-label="Loading" />}
          </div>

          {/* View switcher with a gliding pill */}
          <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-0.5">
            {VIEW_MODES.map((mode) => (
              <button
                type="button"
                key={mode}
                aria-pressed={view === mode}
                onClick={() => {
                  setDirection(0)
                  setPlace({ view: mode })
                }}
                className={cn(
                  'relative h-8 flex-1 cursor-pointer rounded-lg px-3.5 text-xs font-semibold capitalize transition-colors sm:flex-none',
                  view === mode ? 'text-white' : 'text-gray-600 hover:text-gray-900',
                )}
              >
                {view === mode && (
                  <motion.span
                    layoutId="task-calendar-view-pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#0a6cb5] to-[#005390] shadow-sm"
                  />
                )}
                <span className="relative">{mode}</span>
              </button>
            ))}
          </div>

          {/* Loading bar */}
          <AnimatePresence>
            {isFetching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-sky-100"
              >
                <motion.span
                  className="block h-full w-2/5 rounded-full bg-gradient-to-r from-transparent via-[#005390] to-transparent"
                  animate={{ x: ['-100%', '260%'] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Left panel: mini month + category filters */}
          <motion.aside
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: EASE }}
            className="space-y-4"
          >
            <div className={cn(PANEL, 'hidden overflow-hidden lg:block')}>
              <Calendar
                key={cursor.slice(0, 7)}
                mode="single"
                selected={fromYmd(cursor)}
                defaultMonth={fromYmd(cursor)}
                onSelect={(d) => {
                  if (!d) return
                  const day = toYmd(d)
                  jumpTo(day)
                  setOpenDay(day)
                }}
                className="w-full"
              />
            </div>
            <div className={cn(PANEL, 'p-3')}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">Categories</h3>
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    title="Show all"
                    aria-label="Show all categories"
                    onClick={() => setAll(true)}
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Hide all"
                    aria-label="Hide all categories"
                    onClick={() => setAll(false)}
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {data && available.length === 0 && (
                <p className="px-1 text-xs text-gray-500">
                  You don't have access to any module shown in this calendar.
                </p>
              )}
              <div className="grid grid-cols-1 gap-0.5 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-1">
                {CATEGORY_ORDER.filter((c) => available.includes(c)).map((c) => {
                  const meta = CATEGORY_META[c]
                  const Icon = meta.icon
                  const on = !hidden.has(c)
                  const id = `cal-filter-${c}`
                  const count = counts[c] ?? 0
                  return (
                    <label
                      key={c}
                      htmlFor={id}
                      className={cn(
                        'flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 transition-all duration-200 hover:bg-gray-50',
                        !on && 'opacity-45',
                      )}
                    >
                      <Checkbox id={id} checked={on} onCheckedChange={() => toggle(c)} />
                      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', meta.soft)}>
                        <Icon className={cn('h-3.5 w-3.5', meta.text)} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-700">{meta.label}</span>
                      <span
                        className={cn(
                          'min-w-6 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums',
                          count ? cn(meta.soft, meta.text) : 'text-gray-300',
                        )}
                      >
                        {count}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          </motion.aside>

          <main className="min-w-0">
            {isError ? (
              <Notice
                text={
                  status === 403
                    ? "You don't have access to the Task Calendar at this property."
                    : 'Could not load the calendar.'
                }
              />
            ) : !selectedLocationId ? (
              <Notice text="Select a property to see its calendar." />
            ) : (
              <motion.div
                key={`${view}-${range.from}`}
                initial={{ opacity: 0, x: direction * 32 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                {view === 'month' ? (
                  <MonthView
                    cursor={cursor}
                    today={today}
                    items={items}
                    summaries={summaries}
                    onOpenDay={setOpenDay}
                    onGoToDay={goToDay}
                  />
                ) : view === 'week' ? (
                  <WeekView
                    cursor={cursor}
                    today={today}
                    items={items}
                    summaries={summaries}
                    onOpenDay={setOpenDay}
                    onGoToDay={goToDay}
                  />
                ) : view === 'day' ? (
                  data && data.from === cursor ? (
                    <DayView cursor={cursor} today={today} items={items} />
                  ) : (
                    <div className={cn(PANEL, 'flex items-center justify-center gap-2 py-20 text-sm text-gray-500')}>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  )
                ) : (
                  <AgendaView
                    cursor={cursor}
                    today={today}
                    items={items}
                    summaries={summaries}
                    onOpenDay={setOpenDay}
                  />
                )}
              </motion.div>
            )}
          </main>
        </div>

        <DayDetailSheet
          day={openDay}
          today={today}
          hidden={hidden}
          onClose={() => setOpenDay(null)}
          onGoToDay={goToDay}
        />
      </div>
    </MotionConfig>
  )
}

export default TaskCalendarPage
