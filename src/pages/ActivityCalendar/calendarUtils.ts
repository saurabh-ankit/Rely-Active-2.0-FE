import {
  Armchair,
  CalendarClock,
  Dumbbell,
  HeartPulse,
  MessageSquareText,
  PartyPopper,
  ShieldCheck,
  Stethoscope,
  Ticket,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import type { CalendarCategory, CalendarDaySummary, CalendarItem } from '@/lib/services/activityCalendarService'

export const VIEW_MODES = ['month', 'week', 'day', 'agenda'] as const
export type ViewMode = (typeof VIEW_MODES)[number]

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const AGENDA_DAYS = 30

// ── Dates (YYYY-MM-DD strings in the browser's local calendar) ────────────────

const pad = (n: number) => String(n).padStart(2, '0')

export const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const fromYmd = (ymd: string): Date => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1)
}

export const isValidYmd = (v: string | null): v is string =>
  !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && toYmd(fromYmd(v)) === v

export const addDays = (ymd: string, n: number) => {
  const d = fromYmd(ymd)
  d.setDate(d.getDate() + n)
  return toYmd(d)
}

export const addMonths = (ymd: string, n: number) => {
  const d = fromYmd(ymd)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  // Stay inside the target month (31 Jan + 1 month → 28/29 Feb)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return toYmd(d)
}

export const weekStart = (ymd: string) => addDays(ymd, -fromYmd(ymd).getDay())

/** The days shown in a month grid: whole weeks from the week of the 1st to the week of the last day. */
export const monthGridDays = (ymd: string): string[] => {
  const d = fromYmd(ymd)
  const first = toYmd(new Date(d.getFullYear(), d.getMonth(), 1))
  const last = toYmd(new Date(d.getFullYear(), d.getMonth() + 1, 0))
  const start = weekStart(first)
  const end = addDays(weekStart(last), 6)
  const days: string[] = []
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day)
  return days
}

/** The date range a view needs from the API. */
export const viewRange = (view: ViewMode, cursor: string): { from: string; to: string } => {
  switch (view) {
    case 'day':
      return { from: cursor, to: cursor }
    case 'week': {
      const from = weekStart(cursor)
      return { from, to: addDays(from, 6) }
    }
    case 'agenda':
      return { from: cursor, to: addDays(cursor, AGENDA_DAYS - 1) }
    default: {
      const days = monthGridDays(cursor)
      return { from: days[0]!, to: days[days.length - 1]! }
    }
  }
}

export const formatDayLong = (ymd: string) =>
  fromYmd(ymd).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export const formatDayShort = (ymd: string) =>
  fromYmd(ymd).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

/** Toolbar title for the current view. */
export const viewTitle = (view: ViewMode, cursor: string) => {
  const d = fromYmd(cursor)
  if (view === 'month') return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  if (view === 'day') return formatDayLong(cursor)
  const { from, to } = viewRange(view, cursor)
  const a = fromYmd(from)
  const b = fromYmd(to)
  const sameYear = a.getFullYear() === b.getFullYear()
  const left = a.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  const right = b.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${left} – ${right}`
}

/** "16:30" → "4:30 PM" */
export const formatTime = (hhmm: string | null) => {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h! >= 12 ? 'PM' : 'AM'
  const hour = h! % 12 || 12
  return m ? `${hour}:${pad(m)} ${suffix}` : `${hour} ${suffix}`
}

/** What to show as an item's time on a given day. */
export const itemTimeLabel = (item: CalendarItem, day: string) => {
  const multiDay = item.startDate !== item.endDate
  if (multiDay) {
    if (day === item.startDate && item.startTime) return `From ${formatTime(item.startTime)}`
    if (day === item.endDate && item.endTime) return `Until ${formatTime(item.endTime)}`
    return 'All day'
  }
  if (!item.startTime) return 'All day'
  return item.endTime ? `${formatTime(item.startTime)} – ${formatTime(item.endTime)}` : formatTime(item.startTime)
}

export const itemsOnDay = (items: CalendarItem[], day: string) =>
  items.filter((i) => i.startDate <= day && i.endDate >= day)

export const summariesOnDay = (summaries: CalendarDaySummary[], day: string) => summaries.filter((s) => s.date === day)

// ── Categories ────────────────────────────────────────────────────────────────

export interface CategoryMeta {
  label: string
  /** Name of the module the "Open" link goes to. */
  module: string
  icon: LucideIcon
  dot: string
  chip: string
  soft: string
  text: string
}

export const CATEGORY_META: Record<CalendarCategory, CategoryMeta> = {
  events: {
    label: 'Events',
    module: 'Events',
    icon: PartyPopper,
    dot: 'bg-violet-500',
    chip: 'border-l-violet-500 bg-violet-50 text-violet-900 hover:bg-violet-100',
    soft: 'bg-violet-50',
    text: 'text-violet-700',
  },
  appointments: {
    label: 'Doctor Appointments',
    module: 'Medical',
    icon: Stethoscope,
    dot: 'bg-teal-500',
    chip: 'border-l-teal-500 bg-teal-50 text-teal-900 hover:bg-teal-100',
    soft: 'bg-teal-50',
    text: 'text-teal-700',
  },
  careTasks: {
    label: 'Care Tasks',
    module: 'Medical',
    icon: HeartPulse,
    dot: 'bg-rose-500',
    chip: 'border-l-rose-500 bg-rose-50 text-rose-900 hover:bg-rose-100',
    soft: 'bg-rose-50',
    text: 'text-rose-700',
  },
  shifts: {
    label: 'Staff Shifts',
    module: 'Shift & Roster',
    icon: CalendarClock,
    dot: 'bg-slate-500',
    chip: 'border-l-slate-500 bg-slate-100 text-slate-800 hover:bg-slate-200',
    soft: 'bg-slate-100',
    text: 'text-slate-700',
  },
  amenities: {
    label: 'Amenity Bookings',
    module: 'Amenities',
    icon: Dumbbell,
    dot: 'bg-cyan-500',
    chip: 'border-l-cyan-500 bg-cyan-50 text-cyan-900 hover:bg-cyan-100',
    soft: 'bg-cyan-50',
    text: 'text-cyan-700',
  },
  tickets: {
    label: 'Tickets',
    module: 'Tickets',
    icon: Ticket,
    dot: 'bg-orange-500',
    chip: 'border-l-orange-500 bg-orange-50 text-orange-900 hover:bg-orange-100',
    soft: 'bg-orange-50',
    text: 'text-orange-700',
  },
  assets: {
    label: 'Asset Maintenance',
    module: 'Asset Management',
    icon: Armchair,
    dot: 'bg-amber-500',
    chip: 'border-l-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100',
    soft: 'bg-amber-50',
    text: 'text-amber-700',
  },
  visitors: {
    label: 'Visitors',
    module: 'Gate & Security',
    icon: ShieldCheck,
    dot: 'bg-indigo-500',
    chip: 'border-l-indigo-500 bg-indigo-50 text-indigo-900 hover:bg-indigo-100',
    soft: 'bg-indigo-50',
    text: 'text-indigo-700',
  },
  food: {
    label: 'Meal Orders',
    module: 'Food',
    icon: Utensils,
    dot: 'bg-lime-600',
    chip: 'border-l-lime-600 bg-lime-50 text-lime-900 hover:bg-lime-100',
    soft: 'bg-lime-50',
    text: 'text-lime-700',
  },
  feedback: {
    label: 'Feedback Forms',
    module: 'Feedback',
    icon: MessageSquareText,
    dot: 'bg-pink-500',
    chip: 'border-l-pink-500 bg-pink-50 text-pink-900 hover:bg-pink-100',
    soft: 'bg-pink-50',
    text: 'text-pink-700',
  },
}

export const CATEGORY_ORDER = Object.keys(CATEGORY_META) as CalendarCategory[]

const GOOD = [
  'completed',
  'attended',
  'closed',
  'resolved',
  'delivered',
  'pass',
  'scanned',
  'booked',
  'sent',
  'on duty',
  'approved',
  'confirmed',
]
const BAD = ['missed', 'absent', 'fail', 'cancelled', 'rejected', 'expired', 'overdue', 'no show']
const WAIT = ['pending', 'open', 'due', 'expiring', 'in progress', 'on hold', 'pending approval', 'placed', 'preparing']

/** Badge colours for a status label. */
export const statusTone = (status: string | null) => {
  const s = (status || '').toLowerCase()
  if (GOOD.includes(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (BAD.includes(s)) return 'bg-red-50 text-red-700 border-red-200'
  if (WAIT.includes(s)) return 'bg-amber-50 text-amber-800 border-amber-200'
  return 'bg-gray-50 text-gray-600 border-gray-200'
}
