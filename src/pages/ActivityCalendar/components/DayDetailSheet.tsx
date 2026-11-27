import { CalendarDays, Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useActivityCalendar } from '@/hooks/react-query/activityCalendar'
import type { CalendarCategory, CalendarItem } from '@/lib/services/activityCalendarService'
import { CATEGORY_META, CATEGORY_ORDER, fromYmd, itemsOnDay } from '../calendarUtils'
import { ItemCard, Stagger } from './ActivityParts'
import { EmptyState } from './CalendarViews'

interface DayDetailSheetProps {
  day: string | null
  today: string
  hidden: Set<CalendarCategory>
  onClose: () => void
  onGoToDay: (day: string) => void
}

/** Side panel with every activity on one date, grouped by category. Read-only. */
export const DayDetailSheet = ({ day, today, hidden, onClose, onGoToDay }: DayDetailSheetProps) => {
  const { data, isError } = useActivityCalendar({ from: day ?? '', to: day ?? '' }, !!day)
  // Placeholder data may still be another day's while the new one loads
  const fresh = data && data.from === day ? data : undefined
  const items = day && fresh ? itemsOnDay(fresh.items, day).filter((i) => !hidden.has(i.category)) : []

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((i) => i.category === category),
  })).filter((g) => g.items.length > 0)

  const d = day ? fromYmd(day) : null
  const isToday = day === today
  let order = 0

  return (
    <Sheet open={!!day} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 bg-gray-50 p-0 sm:max-w-xl data-[side=right]:sm:max-w-xl [&_[data-slot=sheet-close]]:z-10 [&_[data-slot=sheet-close]]:text-white [&_[data-slot=sheet-close]]:hover:bg-white/20 [&_[data-slot=sheet-close]]:hover:text-white"
      >
        <SheetHeader className="relative overflow-hidden bg-gradient-to-br from-[#0a6cb5] via-[#005390] to-[#003a66] px-5 pb-4 pt-5 text-white">
          {/* soft decorative glow */}
          <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <span className="pointer-events-none absolute -bottom-16 left-10 h-32 w-32 rounded-full bg-sky-300/20 blur-2xl" />
          {d && (
            <div className="relative flex items-end gap-3 pr-8">
              <span className="text-5xl font-bold leading-none tabular-nums">{d.getDate()}</span>
              <div className="pb-0.5">
                <SheetTitle className="text-base font-bold text-white">
                  {d.toLocaleDateString('en-IN', { weekday: 'long' })}
                  {isToday && (
                    <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide">
                      Today
                    </span>
                  )}
                </SheetTitle>
                <SheetDescription className="text-xs text-white/75">
                  {d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} ·{' '}
                  {fresh ? `${items.length} ${items.length === 1 ? 'activity' : 'activities'}` : 'Loading…'}
                </SheetDescription>
              </div>
            </div>
          )}
          {fresh && groups.length > 0 && (
            <div className="relative flex flex-wrap gap-1.5 pt-3">
              {groups.map((g) => {
                const meta = CATEGORY_META[g.category]
                const Icon = meta.icon
                return (
                  <a
                    key={g.category}
                    href={`#day-${g.category}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                  >
                    <Icon className="h-3 w-3" />
                    {meta.label}
                    <span className="rounded-full bg-white/25 px-1.5 tabular-nums">{g.items.length}</span>
                  </a>
                )
              })}
            </div>
          )}
          {day && (
            <button
              type="button"
              onClick={() => onGoToDay(day)}
              className="relative mt-3 inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-[#005390] shadow-sm transition-transform hover:-translate-y-px"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Open in day view
            </button>
          )}
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {!fresh && !isError && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading activities…
            </div>
          )}
          {isError && (
            <p className="py-16 text-center text-sm text-red-600">Could not load this day. Please try again.</p>
          )}
          {fresh && groups.length === 0 && <EmptyState text="Nothing scheduled on this day" />}
          {day &&
            groups.map((g) => (
              <CategoryGroup
                key={g.category}
                category={g.category}
                items={g.items}
                day={day}
                start={(order += g.items.length) - g.items.length}
              />
            ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

const CategoryGroup = ({
  category,
  items,
  day,
  start,
}: {
  category: CalendarCategory
  items: CalendarItem[]
  day: string
  start: number
}) => {
  const meta = CATEGORY_META[category]
  const Icon = meta.icon
  return (
    <section id={`day-${category}`} className="scroll-mt-4">
      <h3 className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-gray-700">
        <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', meta.soft)}>
          <Icon className={cn('h-3.5 w-3.5', meta.text)} />
        </span>
        {meta.label}
        <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] tabular-nums', meta.soft, meta.text)}>
          {items.length}
        </span>
      </h3>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <Stagger key={item.id} index={start + i}>
            <ItemCard item={item} day={day} />
          </Stagger>
        ))}
      </div>
    </section>
  )
}
