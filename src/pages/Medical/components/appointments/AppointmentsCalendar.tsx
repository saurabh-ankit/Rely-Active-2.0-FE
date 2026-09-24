import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDepartmentsQuery } from '@/hooks/react-query/rbac'
import { useUsersQuery } from '@/hooks/react-query/user'
import { useEnsureAppointmentShiftDate } from '@/hooks/react-query/appointments'
import type { EmployeeShiftAssignment, ShiftEmployeeDate, WeekDay } from '@/lib/services/rosterService'
import {
  getUserDisplayName,
  getUserJobCategoryLabel,
  resolveLifecycleRosterStatus,
  userMatchesMedicalRosterRole,
} from '@/pages/ShiftRoster/utils'
import { useListEmployeeShifts, useListShiftEmployeeDates } from '@/hooks/react-query/roster'
import { AppointmentsDayListDialog, type AppointmentCalendarEvent } from './AppointmentsDayListDialog'
import { toast } from 'sonner'

const MAX_VISIBLE = 2
const WEEKDAYS: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const getLocalDateStr = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseLocalDate = (dateStr: string) => {
  const parts = dateStr.split('T')[0]!.split('-')
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
}

const getStatusClasses = (status: string) => {
  const base = 'text-[10px] px-2 py-1.5 rounded-md border shadow-sm'
  if (status === 'covered') return `${base} bg-amber-50 text-amber-700 border-amber-200`
  if (status === 'day_off') return `${base} bg-gray-50 text-gray-400 border-gray-200`
  if (status === 'completed') return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`
  if (status === 'absent') return `${base} bg-red-50 text-red-700 border-red-200`
  return `${base} bg-[#2a517c]/5 text-[#2a517c] border-[#2a517c]/10`
}

export const AppointmentsCalendar = () => {
  const navigate = useNavigate()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [navigating, setNavigating] = useState(false)
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const todayStr = getLocalDateStr(new Date())

  const { data: shiftsData, isLoading: shiftsLoading } = useListEmployeeShifts()
  const { data: datesData, isLoading: datesLoading } = useListShiftEmployeeDates()
  const { data: users } = useUsersQuery()
  const { data: departments = [] } = useDepartmentsQuery()
  const ensureShiftDate = useEnsureAppointmentShiftDate()

  const medicalDepartment = useMemo(() => {
    return (departments || []).find((d) => {
      const name = (d.name || '').toLowerCase()
      const code = ((d as { code?: string }).code || '').toUpperCase()
      return name.includes('medical') || code === 'MEDICAL' || code === 'MED'
    })
  }, [departments])

  const medicalJobCategoryCatalog = useMemo(() => {
    return medicalDepartment?.jobCategories || []
  }, [medicalDepartment])

  const visitingDoctorIds = useMemo(() => {
    const ids = new Set<string>()
    for (const user of users || []) {
      if (userMatchesMedicalRosterRole(user, 'DOCTOR_VISITING', medicalDepartment?.id, medicalJobCategoryCatalog)) {
        ids.add(user.id)
      }
    }
    return ids
  }, [users, medicalDepartment?.id, medicalJobCategoryCatalog])

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>()
    for (const user of users || []) {
      map.set(user.id, getUserDisplayName(user))
    }
    return map
  }, [users])

  const labelByUserId = useMemo(() => {
    const map = new Map<string, string>()
    for (const user of users || []) {
      map.set(user.id, getUserJobCategoryLabel(user, medicalDepartment?.id, medicalJobCategoryCatalog) || 'Visiting')
    }
    return map
  }, [users, medicalDepartment?.id, medicalJobCategoryCatalog])

  const eventsByDate = useMemo(() => {
    const events: Record<string, AppointmentCalendarEvent[]> = {}
    const assignments = (Array.isArray(shiftsData?.data) ? shiftsData.data : []) as EmployeeShiftAssignment[]
    const shiftDates = (Array.isArray(datesData?.data) ? datesData.data : []) as ShiftEmployeeDate[]

    const overrideMap = new Map<string, ShiftEmployeeDate>()
    for (const sd of shiftDates) {
      overrideMap.set(`${sd.employeeShiftAssignmentId}_${sd.date}`, sd)
    }

    const assignmentById = new Map(assignments.map((a) => [a.id, a]))
    const pushed = new Set<string>()

    const pushEvent = (assignment: EmployeeShiftAssignment, dateStr: string, override?: ShiftEmployeeDate) => {
      const eventKey = `${assignment.id}_${dateStr}`
      if (pushed.has(eventKey)) return
      if (override && (override.isDeleted || (override as { status?: string }).status === 'deleted')) return

      const employeeId = assignment.employeeId || assignment.employee?.id
      if (!employeeId || !visitingDoctorIds.has(employeeId)) return

      let employeeName =
        `${assignment.employee?.profile?.firstName || ''} ${assignment.employee?.profile?.lastName || ''}`.trim() ||
        nameByUserId.get(employeeId) ||
        'Doctor'

      const rawStatus = override?.status || 'upcoming'
      const status = resolveLifecycleRosterStatus(
        rawStatus,
        dateStr,
        assignment.shift?.startTime,
        assignment.shift?.endTime,
        assignment.slotTimeRange,
      )

      if (status === 'covered' && override?.coveringEmployee) {
        const coverId = override.coveringEmployee.id
        employeeName =
          `${override.coveringEmployee.profile?.firstName || ''} ${override.coveringEmployee.profile?.lastName || ''}`.trim() ||
          nameByUserId.get(coverId) ||
          employeeName
        employeeName = `${employeeName} (Cover)`
      } else if (status === 'day_off') {
        employeeName = `${employeeName} (Day Off)`
      }

      if (!events[dateStr]) events[dateStr] = []
      events[dateStr].push({
        id: eventKey,
        assignmentId: assignment.id,
        shiftEmployeeDateId: override?.id,
        date: dateStr,
        employeeId,
        employeeName,
        jobLabel: labelByUserId.get(employeeId) || 'Visiting',
        shiftName: assignment.shift?.name || 'Unknown Shift',
        shiftTime: `${assignment.shift?.startTime || ''} - ${assignment.shift?.endTime || ''}`,
        slotTimeRange: assignment.slotTimeRange,
        status,
      })
      pushed.add(eventKey)
    }

    for (const assignment of assignments) {
      if (!assignment.startDate || !assignment.endDate) continue
      const start = parseLocalDate(assignment.startDate)
      const end = parseLocalDate(assignment.endDate)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (assignment.workingDays && Array.isArray(assignment.workingDays) && assignment.workingDays.length > 0) {
          const dayName = WEEKDAYS[d.getDay()]
          if (!dayName || !assignment.workingDays.includes(dayName)) continue
        }
        const dateStr = getLocalDateStr(d)
        pushEvent(assignment, dateStr, overrideMap.get(`${assignment.id}_${dateStr}`))
      }
    }

    for (const sd of shiftDates) {
      if (sd.isDeleted) continue
      if (sd.status === 'day_off' && (sd.leaveType === 'week_off' || !sd.leaveType)) {
        const assignment = assignmentById.get(sd.employeeShiftAssignmentId)
        const workingDays = assignment?.workingDays
        if (workingDays && workingDays.length > 0) {
          const dayName = WEEKDAYS[parseLocalDate(sd.date).getDay()]
          if (!dayName || !workingDays.includes(dayName)) continue
        } else if (sd.leaveType === 'week_off') {
          continue
        }
      }
      const assignment =
        assignmentById.get(sd.employeeShiftAssignmentId) || (sd.shiftAssignment as EmployeeShiftAssignment | undefined)
      if (!assignment?.id) continue
      pushEvent(
        {
          ...assignment,
          employee: assignment.employee || sd.shiftAssignment?.employee,
          shift: assignment.shift || sd.shiftAssignment?.shift,
        },
        sd.date,
        sd,
      )
    }

    return events
  }, [shiftsData, datesData, visitingDoctorIds, nameByUserId, labelByUserId])

  const openAppointments = async (event: AppointmentCalendarEvent) => {
    if (event.status === 'day_off' || event.status === 'absent') {
      toast.error('Cannot open appointments for day off or absent shifts')
      return
    }

    setNavigating(true)
    try {
      let shiftEmployeeDateId = event.shiftEmployeeDateId
      if (!shiftEmployeeDateId) {
        const result = await ensureShiftDate.mutateAsync({
          assignmentId: event.assignmentId,
          date: event.date,
        })
        shiftEmployeeDateId = result.data?.shiftEmployeeDateId
      }
      if (!shiftEmployeeDateId) {
        toast.error('Could not resolve doctor shift date')
        return
      }
      navigate(`/admin/medical/appointments/${shiftEmployeeDateId}`)
    } finally {
      setNavigating(false)
    }
  }

  const startWeekday = new Date(year, month, 1).getDay()
  const cells: Array<{ day: number | null; key: string }> = []
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, key: `e-${i}` })
  for (let d = 1; d <= lastDay; d++) cells.push({ day: d, key: `d-${d}` })

  const monthLabel = cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const isLoading = shiftsLoading || datesLoading

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Visiting Doctor Appointments</h3>
          <p className="text-xs text-gray-500 mt-0.5">Click a doctor shift to view resident appointment bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-36 text-center">{monthLabel}</span>
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading || navigating ? (
        <p className="text-sm text-gray-500 py-8 text-center">
          {navigating ? 'Opening appointments…' : 'Loading calendar…'}
        </p>
      ) : (
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              className="bg-gray-100 text-[11px] font-semibold text-gray-600 text-center py-2 uppercase tracking-wide"
            >
              {d}
            </div>
          ))}
          {cells.map(({ day, key }) => {
            if (day === null) {
              return <div key={key} className="min-h-[120px] bg-white" />
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayEvents = eventsByDate[dateStr] || []
            const isToday = dateStr === todayStr
            const visibleEvents = dayEvents.slice(0, MAX_VISIBLE)
            const overflowCount = Math.max(0, dayEvents.length - MAX_VISIBLE)

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDay(dateStr)}
                className={`min-h-[120px] p-2 bg-white flex flex-col gap-1 text-left w-full hover:bg-gray-50 transition-colors cursor-pointer ${
                  isToday ? 'bg-[#2a517c]/5' : ''
                }`}
              >
                <span className={`text-sm font-semibold ${isToday ? 'text-[#2a517c]' : 'text-gray-900'}`}>{day}</span>

                <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                  {visibleEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      className="space-y-0.5 text-left w-full cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        void openAppointments(event)
                      }}
                    >
                      <div className="bg-[#2a517c] px-1.5 py-0.5 rounded-sm flex items-center justify-between gap-1">
                        <span className="text-[8px] font-black text-white truncate uppercase tracking-tighter block max-w-[70%]">
                          {event.shiftName}
                        </span>
                        <span className="text-[7px] text-white/90 font-bold tracking-tighter shrink-0">
                          {event.slotTimeRange || event.shiftTime}
                        </span>
                      </div>
                      <div className={getStatusClasses(event.status)}>
                        <div className="font-semibold truncate text-[#1e3a5a]">{event.employeeName}</div>
                        <div className="text-[8px] font-medium text-gray-500 uppercase tracking-wider mt-0.5">
                          {event.jobLabel}
                        </div>
                      </div>
                    </button>
                  ))}
                  {overflowCount > 0 && (
                    <span className="text-[11px] font-semibold text-[#2a517c] pl-0.5">+{overflowCount}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <AppointmentsDayListDialog
        open={!!selectedDay}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null)
        }}
        date={selectedDay}
        events={selectedDay ? eventsByDate[selectedDay] || [] : []}
        onSelectEvent={(event) => {
          setSelectedDay(null)
          void openAppointments(event)
        }}
      />
    </div>
  )
}

export default AppointmentsCalendar
