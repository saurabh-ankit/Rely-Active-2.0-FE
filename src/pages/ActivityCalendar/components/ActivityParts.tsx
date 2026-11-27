import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, ChevronDown, Clock } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { CalendarDaySummary, CalendarItem } from '@/lib/services/activityCalendarService'
import { CATEGORY_META, formatDayShort, formatTime, itemTimeLabel, statusTone } from '../calendarUtils'

export const StatusBadge = ({ status }: { status: string | null }) =>
  status ? (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        statusTone(status),
      )}
    >
      {status}
    </span>
  ) : null

/** When an item happens, in full: "Thu, 12 Nov · 4:00 PM – 6:00 PM" or a date range. */
const whenText = (item: CalendarItem) => {
  if (item.startDate !== item.endDate) {
    const a = `${formatDayShort(item.startDate)}${item.startTime ? `, ${formatTime(item.startTime)}` : ''}`
    const b = `${formatDayShort(item.endDate)}${item.endTime ? `, ${formatTime(item.endTime)}` : ''}`
    return `${a} – ${b}`
  }
  return `${formatDayShort(item.startDate)} · ${itemTimeLabel(item, item.startDate)}`
}

const OpenLink = ({ item }: { item: CalendarItem }) => {
  const navigate = useNavigate()
  if (!item.link) return null
  const meta = CATEGORY_META[item.category]
  return (
    <button
      type="button"
      onClick={() => navigate(item.link!)}
      className={cn(
        'group/link inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
        meta.soft,
        meta.text,
        'hover:brightness-95',
      )}
    >
      Open in {meta.module}
      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
    </button>
  )
}

/** Full read-only details of one item (popover body and expanded card). */
export const ItemDetails = ({ item }: { item: CalendarItem }) => (
  <div className="space-y-3">
    {item.details.length > 0 && (
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
        {item.details.map((d) => (
          <div key={d.label} className="contents">
            <dt className="text-gray-400">{d.label}</dt>
            <dd className="break-words font-medium text-gray-800">{d.value}</dd>
          </div>
        ))}
      </dl>
    )}
    <OpenLink item={item} />
  </div>
)

/** Coloured chip in month / week cells; opens a details card like Google Calendar. */
export const ActivityChip = ({ item, day }: { item: CalendarItem; day: string }) => {
  const meta = CATEGORY_META[item.category]
  const Icon = meta.icon
  const showTime = item.startTime && (item.startDate === day || item.startDate === item.endDate)
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            title={item.title}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'flex w-full cursor-pointer items-center gap-1 truncate rounded-md border-l-[3px] px-1.5 py-[3px] text-left text-[11px] font-semibold leading-tight',
              'transition-all duration-150 hover:-translate-y-px hover:shadow-sm active:translate-y-0',
              meta.chip,
            )}
          />
        }
      >
        {showTime ? (
          <span className="shrink-0 font-medium tabular-nums opacity-60">{formatTime(item.startTime)}</span>
        ) : (
          <Icon className="h-3 w-3 shrink-0 opacity-60" />
        )}
        <span className="truncate">{item.title}</span>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 overflow-hidden rounded-2xl border-0 p-0 shadow-xl ring-1 ring-black/5"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn('relative px-4 pb-3 pt-4', meta.soft)}>
          <div className={cn('absolute inset-x-0 top-0 h-1', meta.dot)} />
          <div className={cn('flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide', meta.text)}>
            <Icon className="h-3.5 w-3.5" />
            {item.kind}
          </div>
          <p className="mt-1.5 text-[15px] font-semibold leading-snug text-gray-900">{item.title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
            <Clock className="h-3 w-3" />
            {whenText(item)}
          </p>
          {item.status && (
            <div className="mt-2.5">
              <StatusBadge status={item.status} />
            </div>
          )}
        </div>
        <div className="px-4 py-3.5">
          <ItemDetails item={item} />
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Compact count badge ("♥ 3") for categories counted per day (care tasks, shifts, gate
 * entries, meal orders). Hover shows the breakdown; click opens the day.
 */
export const CountPill = ({ summary, onOpen }: { summary: CalendarDaySummary; onOpen: () => void }) => {
  const meta = CATEGORY_META[summary.category]
  const Icon = meta.icon
  const breakdown = Object.entries(summary.breakdown)
    .map(([k, v]) => `${v} ${k.toLowerCase()}`)
    .join(', ')
  return (
    <button
      type="button"
      title={`${summary.total} ${summary.label.toLowerCase()} — ${breakdown}`}
      aria-label={`${summary.total} ${summary.label.toLowerCase()}`}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      className={cn(
        'inline-flex h-5 cursor-pointer items-center gap-0.5 rounded-full px-1.5 text-[10px] font-bold tabular-nums',
        'transition-transform duration-150 hover:scale-110',
        meta.soft,
        meta.text,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {summary.total}
    </button>
  )
}

/** Wider summary row for the agenda view: icon, label and breakdown. */
export const SummaryRow = ({ summary, onOpen }: { summary: CalendarDaySummary; onOpen: () => void }) => {
  const meta = CATEGORY_META[summary.category]
  const Icon = meta.icon
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition-all hover:-translate-y-px hover:shadow-sm',
        meta.soft,
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', meta.text)} />
      <span className={cn('font-bold', meta.text)}>
        {summary.total} {summary.label.toLowerCase()}
      </span>
      <span className="text-gray-500">
        {Object.entries(summary.breakdown)
          .map(([k, v]) => `${v} ${k.toLowerCase()}`)
          .join(' · ')}
      </span>
    </button>
  )
}

/** Row in the day panel, day view and agenda: click to expand the details. */
export const ItemCard = ({ item, day, showTime = true }: { item: CalendarItem; day: string; showTime?: boolean }) => {
  const [open, setOpen] = useState(false)
  const meta = CATEGORY_META[item.category]
  const Icon = meta.icon
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-white transition-all duration-200',
        open ? 'border-gray-200 shadow-md' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
      )}
    >
      <span className={cn('absolute inset-y-0 left-0 w-[3px]', meta.dot)} />
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-start gap-3 py-2.5 pl-4 pr-3 text-left"
      >
        <span
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105',
            meta.soft,
          )}
        >
          <Icon className={cn('h-4 w-4', meta.text)} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {showTime && (
              <span className="text-[11px] font-semibold tabular-nums text-gray-500">{itemTimeLabel(item, day)}</span>
            )}
            <span className={cn('text-[11px] font-semibold', meta.text)}>{item.kind}</span>
          </span>
          <span className="mt-0.5 block text-sm font-semibold leading-snug text-gray-900">{item.title}</span>
          {item.subtitle && <span className="block text-xs text-gray-500">{item.subtitle}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <StatusBadge status={item.status} />
          <ChevronDown
            className={cn('h-4 w-4 text-gray-400 transition-transform duration-200', open && 'rotate-180')}
          />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 py-3 pl-[3.75rem] pr-3">
              <ItemDetails item={item} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Fade-and-rise for list entries; the delay is capped so long lists don't drag. */
export const Stagger = ({ index, children }: { index: number; children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.35), ease: 'easeOut' }}
  >
    {children}
  </motion.div>
)
