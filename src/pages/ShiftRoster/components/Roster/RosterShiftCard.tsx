import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { RosterCalendarEvent } from '../dialogs/RosterDetailDialog'
import {
  formatShiftDuration,
  getShiftAccent,
  resolveDisplayTimeRange,
  statusBadgeClass,
  statusLabelForEvent,
} from '../../utils'

export type RosterCardAction = 'swap' | 'cover' | 'day_off' | 'details' | 'residents'

interface RosterShiftCardProps {
  event: RosterCalendarEvent
  onAction: (action: RosterCardAction) => void
  showAssignedResidents?: boolean
  selectable?: boolean
  selected?: boolean
  onSelectChange?: (selected: boolean) => void
}

const RosterShiftCard = ({
  event,
  onAction,
  selectable = false,
  selected = false,
  onSelectChange,
}: RosterShiftCardProps) => {
  const location = event.locationLabel || event.areaName
  const timeLabel = resolveDisplayTimeRange(event.slotTimeRange, event.shiftTime)
  const duration = formatShiftDuration(event.slotTimeRange, event.shiftTime)
  const accent = getShiftAccent(event.shiftName)
  const statusKey = event.isCoverDuty ? 'covered' : event.status
  const statusLabel = statusLabelForEvent(event)
  // After a task has started (or finished / overdue), Swap & Cover are not available.
  const actionsLocked =
    event.status === 'completed' || event.status === 'overdue' || event.status === 'on_duty' || !!event.taskStartedAt
  const isOnDuty = statusKey === 'on_duty'
  const canSelect = selectable && !event.isCoverDuty && !!event.shiftEmployeeDateId

  return (
    <Card
      className={cn(
        'gap-0 relative flex flex-col overflow-hidden rounded-2xl border bg-white p-4 shadow-none',
        'transition-all duration-200 hover:border-[#2a517c]/30 hover:shadow-[0_8px_24px_rgba(42,81,124,0.08)]',
        isOnDuty ? 'border-[#005390] ring-1 ring-[#005390]/20' : 'border-slate-200/90',
        selected && 'border-[#2a517c]/40 ring-2 ring-[#2a517c]/15',
      )}
    >
      {canSelect && (
        <div className="absolute right-3 top-3 z-10">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectChange?.(checked === true)}
            aria-label={`Select roster on ${event.date}`}
            className="h-4 w-4"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-2 pr-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('size-2.5 shrink-0 rounded-full', accent.dot)} aria-hidden />
          <h4 className="truncate text-[15px] font-semibold tracking-tight text-slate-900">{event.shiftName}</h4>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
            statusBadgeClass(statusKey),
          )}
        >
          {statusLabel}
        </span>
      </div>

      <button type="button" className="mt-3 w-full text-left" onClick={() => onAction('details')}>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-xl font-bold tabular-nums tracking-tight text-slate-900">{timeLabel || '—'}</p>
          {duration ? <p className="text-sm font-medium text-slate-400">{duration}</p> : null}
        </div>

        {location ? (
          <div className="mt-2.5 flex items-start gap-1.5 text-sm text-slate-500">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="leading-snug">{location}</span>
          </div>
        ) : null}

        {event.isCoverDuty && event.originalEmployeeName ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">
            Covering for {event.originalEmployeeName}
          </p>
        ) : null}
      </button>

      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-sm font-semibold text-[#005390] hover:bg-transparent hover:text-[#003d6b]"
          onClick={() => onAction('details')}
        >
          Details
        </Button>
        {!actionsLocked && event.status !== 'day_off' && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-sm font-semibold text-[#005390] hover:bg-transparent hover:text-[#003d6b]"
              onClick={() => onAction('swap')}
            >
              Swap
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-sm font-semibold text-[#005390] hover:bg-transparent hover:text-[#003d6b]"
              onClick={() => onAction('cover')}
            >
              Cover
            </Button>
          </>
        )}
        {event.status === 'day_off' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-sm font-semibold text-[#005390] hover:bg-transparent hover:text-[#003d6b]"
            onClick={() => onAction('day_off')}
          >
            Restore
          </Button>
        )}
      </div>
    </Card>
  )
}

export default RosterShiftCard
