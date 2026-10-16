import { Badge } from '@/components/ui/badge'
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
                  {group.events.map((event) => (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => onSelectEvent(event)}
                        className="flex w-full items-start justify-between gap-2 bg-gray-50 px-3 py-2.5 text-left transition-colors hover:bg-[#2a517c]/5"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-[#1e3a5a]">{event.employeeName}</div>
                          {event.departmentName && (
                            <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-gray-500">
                              {event.departmentName}
                            </div>
                          )}
                          {(event.locationLabel || event.areaName) && (
                            <div className="mt-1 truncate text-xs text-gray-500">
                              {event.locationLabel || event.areaName}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className={`shrink-0 ${statusColor[event.status] || 'bg-gray-100 text-gray-700'}`}
                        >
                          {formatStatus(event.status)}
                        </Badge>
                      </button>
                    </li>
                  ))}
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
