import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { RosterCalendarEvent } from './RosterDetailDialog'

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
            {events.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelectEvent(event)}
                className="w-full text-left rounded-md border border-gray-200 overflow-hidden hover:border-[#2a517c]/40 hover:shadow-sm transition-colors"
              >
                <div className="bg-[#2a517c] px-3 py-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white truncate uppercase tracking-wide">
                    {event.shiftName}
                  </span>
                  <span className="text-[11px] text-white/90 font-semibold shrink-0">
                    {event.slotTimeRange || event.shiftTime}
                  </span>
                </div>
                <div className="bg-gray-50 px-3 py-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#1e3a5a] truncate">{event.employeeName}</div>
                    {event.departmentName && (
                      <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mt-0.5">
                        {event.departmentName}
                      </div>
                    )}
                    {(event.locationLabel || event.areaName) && (
                      <div className="text-xs text-gray-500 mt-1 truncate">{event.locationLabel || event.areaName}</div>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className={`shrink-0 ${statusColor[event.status] || 'bg-gray-100 text-gray-700'}`}
                  >
                    {formatStatus(event.status)}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default RosterDayListDialog
