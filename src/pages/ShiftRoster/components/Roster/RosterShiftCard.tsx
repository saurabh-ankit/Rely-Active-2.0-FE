import { ArrowLeftRight, CalendarDays, ChevronRight, Clock3, Coffee, MapPin, Users, UserCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RosterPermission } from '../RosterPermission'
import type { RosterCalendarEvent } from '../dialogs/RosterDetailDialog'

const statusDot: Record<string, string> = {
  upcoming: 'bg-sky-500',
  on_duty: 'bg-emerald-500',
  completed: 'bg-slate-400',
  absent: 'bg-red-500',
  covered: 'bg-amber-500',
  day_off: 'bg-violet-500',
}

const statusTone: Record<string, string> = {
  upcoming: 'text-sky-700 bg-sky-50',
  on_duty: 'text-emerald-700 bg-emerald-50',
  completed: 'text-slate-600 bg-slate-100',
  absent: 'text-red-700 bg-red-50',
  covered: 'text-amber-800 bg-amber-50',
  day_off: 'text-violet-700 bg-violet-50',
}

const formatStatus = (status: string) =>
  status
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')

const formatRosterDate = (ymd: string) => {
  const parts = ymd.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return ymd
  const date = new Date(parts[0]!, parts[1]! - 1, parts[2]!)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export type RosterCardAction = 'swap' | 'cover' | 'day_off' | 'details' | 'residents' | 'remove'

interface RosterShiftCardProps {
  event: RosterCalendarEvent
  onAction: (action: RosterCardAction) => void
  removeLabel?: string
  removePending?: boolean
  showAssignedResidents?: boolean
}

const RosterShiftCard = ({
  event,
  onAction,
  removeLabel = 'Remove',
  removePending = false,
  showAssignedResidents = true,
}: RosterShiftCardProps) => {
  const location = event.locationLabel || event.areaName
  const timeLabel = event.slotTimeRange || event.shiftTime
  const actionsDisabled = event.status === 'completed'
  const hideActions = event.status === 'covered' && !event.isCoverDuty
  const statusKey = event.isCoverDuty ? 'covered' : event.status
  const statusLabel = event.isCoverDuty ? 'Cover' : formatStatus(event.status)

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white',
        'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(42,81,124,0.06)]',
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2a517c]/25',
        'hover:shadow-[0_4px_12px_rgba(15,23,42,0.06),0_16px_32px_rgba(42,81,124,0.10)]',
      )}
    >
      <button type="button" onClick={() => onAction('details')} className="w-full text-left">
        <div className="relative bg-gradient-to-br from-[#1e3a5a] via-[#2a517c] to-[#3a6a9a] px-4 py-3.5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_55%)]" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">Shift</p>
              <h4 className="mt-0.5 truncate text-base font-semibold tracking-tight text-white">{event.shiftName}</h4>
            </div>
            {timeLabel ? (
              <div className="shrink-0 rounded-lg bg-white/12 px-2.5 py-1.5 backdrop-blur-sm ring-1 ring-white/15">
                <div className="flex items-center gap-1.5 text-white">
                  <Clock3 className="h-3.5 w-3.5 text-white/80" />
                  <span className="text-xs font-semibold tabular-nums tracking-wide">{timeLabel}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
              <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate font-medium">{formatRosterDate(event.date)}</span>
            </div>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                statusTone[statusKey] || statusTone.completed,
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', statusDot[statusKey] || statusDot.completed)} />
              {statusLabel}
            </span>
          </div>

          {location ? (
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span className="leading-snug">{location}</span>
            </div>
          ) : null}

          {event.departmentName ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">{event.departmentName}</p>
          ) : null}

          {event.isCoverDuty && event.originalEmployeeName ? (
            <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">
              Covering for {event.originalEmployeeName}
            </p>
          ) : null}
        </div>
      </button>

      {showAssignedResidents && (
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={() => onAction('residents')}
            className="flex w-full items-center gap-3 rounded-xl border border-[#2a517c]/10 bg-[#2a517c]/5 px-3 py-2.5 text-left transition-colors hover:bg-[#2a517c]/10"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2a517c]/10">
              <Users className="h-4 w-4 text-[#2a517c]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#2a517c]">Assigned Residents</p>
              <p className="text-xs text-[#2a517c]/70">Configure client-care roster</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#2a517c]/60" />
          </button>
        </div>
      )}

      {!hideActions && (
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-3 py-2.5">
          <RosterPermission action="update">
            <div className="flex flex-wrap gap-1.5">
              {event.status === 'day_off' ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionsDisabled}
                  className="h-8 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-white"
                  onClick={() => onAction('day_off')}
                >
                  Restore
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionsDisabled}
                    className="h-8 rounded-lg border-slate-200 bg-white px-2.5 text-slate-700 shadow-none hover:border-[#2a517c]/30 hover:bg-white hover:text-[#2a517c]"
                    onClick={() => onAction('swap')}
                  >
                    <ArrowLeftRight className="mr-1 h-3.5 w-3.5" />
                    Swap
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionsDisabled}
                    className="h-8 rounded-lg border-slate-200 bg-white px-2.5 text-slate-700 shadow-none hover:border-[#2a517c]/30 hover:bg-white hover:text-[#2a517c]"
                    onClick={() => onAction('cover')}
                  >
                    <UserCheck className="mr-1 h-3.5 w-3.5" />
                    Cover
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionsDisabled}
                    className="h-8 rounded-lg border-slate-200 bg-white px-2.5 text-slate-700 shadow-none hover:border-[#2a517c]/30 hover:bg-white hover:text-[#2a517c]"
                    onClick={() => onAction('day_off')}
                  >
                    <Coffee className="mr-1 h-3.5 w-3.5" />
                    Day Off
                  </Button>
                </>
              )}
            </div>
          </RosterPermission>

          {!event.isCoverDuty && (
            <RosterPermission action="delete">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                disabled={removePending}
                title={removeLabel}
                onClick={() => onAction('remove')}
              >
                <X className="h-4 w-4" />
              </Button>
            </RosterPermission>
          )}
        </div>
      )}
    </article>
  )
}

export default RosterShiftCard
