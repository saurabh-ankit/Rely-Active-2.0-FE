import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface AppointmentCalendarEvent {
  id: string
  assignmentId: string
  shiftEmployeeDateId?: string
  date: string
  employeeId?: string
  employeeName: string
  jobLabel: string
  shiftName: string
  shiftTime: string
  slotTimeRange?: string | null
  status: string
}

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

interface AppointmentsDayListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string | null
  events: AppointmentCalendarEvent[]
  onSelectEvent: (event: AppointmentCalendarEvent) => void
}

export const AppointmentsDayListDialog = ({
  open,
  onOpenChange,
  date,
  events,
  onSelectEvent,
}: AppointmentsDayListDialogProps) => {
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
          <DialogTitle>Visiting Doctors — {titleDate}</DialogTitle>
        </DialogHeader>

        {events.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">No visiting doctor shifts for this day.</p>
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
                <div className="px-3 py-2.5 bg-white flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{event.employeeName}</div>
                    <div className="text-[11px] text-gray-500 uppercase tracking-wide mt-0.5">{event.jobLabel}</div>
                  </div>
                  <Badge className={statusColor[event.status] || 'bg-gray-100 text-gray-700'}>
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

export default AppointmentsDayListDialog
