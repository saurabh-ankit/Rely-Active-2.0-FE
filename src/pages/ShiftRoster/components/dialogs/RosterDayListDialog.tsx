import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { RosterCalendarEvent } from './RosterDetailDialog'
import { groupRostersByShift } from '../../utils'

const statusColor: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-800',
  on_duty: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  absent: 'bg-red-100 text-red-800',
  covered: 'bg-amber-100 text-amber-800',
  day_off: 'bg-purple-100 text-purple-800',
}

const formatStatus = (status: string) =>
  status
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')

const StatusBadge = ({ status }: { status: string }) => (
  <Badge variant="secondary" className={`shrink-0 ${statusColor[status] || 'bg-gray-100 text-gray-700'}`}>
    {formatStatus(status)}
  </Badge>
)

const rowClass =
  'h-auto p-0 flex w-full items-start justify-between gap-2 bg-gray-50 px-3 py-2.5 text-left transition-colors hover:bg-[#2a517c]/5 whitespace-normal font-normal rounded-none'

interface RosterDayListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string | null
  events: RosterCalendarEvent[]
  onSelectEvent: (event: RosterCalendarEvent) => void
}

const RosterDayListDialog = ({ open, onOpenChange, date, events, onSelectEvent }: RosterDayListDialogProps) => {
  const titleDate = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Day'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rosters — {titleDate}</DialogTitle>
        </DialogHeader>

        {events.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">No rosters for this day.</p>
        ) : (
          <div className="space-y-3">
            {/* Each shift once, with everyone on it listed below. */}
            {groupRostersByShift(events).map((group) => (
              <section key={group.key} className="overflow-hidden rounded-md border border-gray-200">
                <div className="flex items-center justify-between gap-2 bg-[#2a517c] px-3 py-2">
                  <span className="truncate text-sm font-bold uppercase tracking-wide text-white">
                    {group.shiftName}
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-white/90">{group.time}</span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {group.employees.map(({ key, employeeName, events: areaEvents }) => {
                    const [first] = areaEvents
                    // A single roster stays one clickable row; several areas get a header with a row per area.
                    if (areaEvents.length === 1) {
                      return (
                        <li key={key}>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onSelectEvent(first)}
                            className={rowClass}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-[#1e3a5a]">{employeeName}</div>
                              {first.departmentName && (
                                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-gray-500">
                                  {first.departmentName}
                                </div>
                              )}
                              {(first.locationLabel || first.areaName) && (
                                <div className="mt-1 truncate text-xs text-gray-500">
                                  {first.locationLabel || first.areaName}
                                </div>
                              )}
                            </div>
                            <StatusBadge status={first.status} />
                          </Button>
                        </li>
                      )
                    }
                    return (
                      <li key={key} className="bg-gray-50 px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[#1e3a5a]">{employeeName}</div>
                            {first.departmentName && (
                              <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-gray-500">
                                {first.departmentName}
                              </div>
                            )}
                          </div>
                          <span className="shrink-0 rounded-md bg-[#2a517c]/10 px-2 py-0.5 text-[11px] font-semibold text-[#2a517c]">
                            {areaEvents.length} areas
                          </span>
                        </div>
                        <ul className="mt-2 overflow-hidden rounded-md border border-gray-200 divide-y divide-gray-100 bg-white">
                          {areaEvents.map((event) => (
                            <li key={event.id}>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onSelectEvent(event)}
                                className="h-auto w-full items-center justify-between gap-2 rounded-none px-3 py-2 text-left font-normal whitespace-normal hover:bg-[#2a517c]/5"
                              >
                                <span className="flex min-w-0 items-center gap-1.5 text-xs text-gray-600">
                                  <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                  <span className="truncate">{event.locationLabel || event.areaName || 'No area'}</span>
                                </span>
                                <StatusBadge status={event.status} />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default RosterDayListDialog
