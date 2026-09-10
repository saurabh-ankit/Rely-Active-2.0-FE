import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useListEmployeeShifts } from '@/hooks/react-query/employeeShifts'
import { useDepartmentsQuery } from '@/hooks/react-query/rbac'
import { useListShiftEmployeeDates } from '@/hooks/react-query/shiftEmployeeDates'
import { useUsersQuery } from '@/hooks/react-query/user'
import type { EmployeeShiftAssignment, WeekDay } from '@/lib/services/employeeShiftService'
import type { ShiftEmployeeDate } from '@/lib/services/shiftEmployeeDateService'
import { useLocationStore } from '@/lib/stores/locationStore'
import {
  getUserDepartmentIds,
  getUserDepartmentName,
  getUserDisplayName,
  getUserRoleCodes,
  resolveLifecycleRosterStatus,
} from '../../utils'
import { RosterPermission } from '../RosterPermission'
import AssignShiftDialog from '../dialogs/AssignShiftDialog'
import DepartmentFilter, { ALL_DEPARTMENTS } from '../Employees/DepartmentFilter'
import RosterDayListDialog from '../dialogs/RosterDayListDialog'
import RosterDetailDialog, { type RosterCalendarEvent } from '../dialogs/RosterDetailDialog'

const MAX_VISIBLE_ROSTERS = 2

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

const buildLocationLabel = (assignment: EmployeeShiftAssignment): string | null => {
  if (assignment.area?.areaName) return assignment.area.areaName
  const parts: string[] = []
  if (assignment.block?.block_name) parts.push(assignment.block.block_name)
  if (assignment.floor) {
    parts.push(assignment.floor.floor_name || `Floor ${assignment.floor.floor_number}`)
  }
  if (assignment.unit?.unit_number) parts.push(assignment.unit.unit_number)
  else if (assignment.floorId && !assignment.unitId) parts.push('Entire floor')
  else if (assignment.blockId && !assignment.floorId) parts.push('Entire block')
  return parts.length ? parts.join(' · ') : null
}

const getStatusClasses = (status: string) => {
  const base = 'text-[10px] px-2 py-1.5 rounded-md border shadow-sm'
  if (status === 'covered') {
    return `${base} bg-amber-50 text-amber-700 border-amber-200`
  }
  if (status === 'day_off') {
    return `${base} bg-gray-50 text-gray-400 border-gray-200`
  }
  if (status === 'completed') {
    return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`
  }
  if (status === 'absent') {
    return `${base} bg-red-50 text-red-700 border-red-200`
  }
  return `${base} bg-[#2a517c]/5 text-[#2a517c] border-[#2a517c]/10`
}

const RosterCalendar = () => {
  const [createOpen, setCreateOpen] = useState(false)
  const [detailEvent, setDetailEvent] = useState<RosterCalendarEvent | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [departmentFilter, setDepartmentFilter] = useState(ALL_DEPARTMENTS)
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const todayStr = getLocalDateStr(new Date())
  const locationId = useLocationStore((s) => s.selectedLocationId)

  const { data: shiftsData, isLoading: shiftsLoading } = useListEmployeeShifts()
  const { data: datesData, isLoading: datesLoading } = useListShiftEmployeeDates()
  const { data: users } = useUsersQuery()
  const { data: departments = [] } = useDepartmentsQuery()

  const activeDepartments = useMemo(() => (departments || []).filter((d) => d.isActive !== false), [departments])

  const employeeIdsInDepartment = useMemo(() => {
    if (departmentFilter === ALL_DEPARTMENTS) return null
    const ids = new Set<string>()
    for (const user of users || []) {
      if (getUserDepartmentIds(user, locationId).includes(departmentFilter)) {
        ids.add(user.id)
      }
    }
    return ids
  }, [departmentFilter, users, locationId])

  const roleByUserId = useMemo(() => {
    const map = new Map<string, string>()
    for (const user of users || []) {
      const codes = getUserRoleCodes(user)
      map.set(user.id, codes[0] || '')
    }
    return map
  }, [users])

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>()
    for (const user of users || []) {
      map.set(user.id, getUserDisplayName(user))
    }
    return map
  }, [users])

  const departmentByUserId = useMemo(() => {
    const map = new Map<string, string>()
    const deptList = activeDepartments.map((d) => ({ id: d.id, name: d.name }))
    for (const user of users || []) {
      const name = getUserDepartmentName(user, deptList, locationId)
      if (name) map.set(user.id, name)
    }
    return map
  }, [users, activeDepartments, locationId])

  const eventsByDate = useMemo(() => {
    const events: Record<string, RosterCalendarEvent[]> = {}
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
      if (override && (override.isDeleted || (override as { status?: string }).status === 'deleted')) {
        return
      }

      const employeeId = assignment.employeeId || assignment.employee?.id
      if (employeeIdsInDepartment && (!employeeId || !employeeIdsInDepartment.has(employeeId))) {
        return
      }

      let employeeName =
        `${assignment.employee?.profile?.firstName || ''} ${assignment.employee?.profile?.lastName || ''}`.trim() ||
        (employeeId ? nameByUserId.get(employeeId) : '') ||
        'Staff'
      let role = employeeId ? roleByUserId.get(employeeId) || '' : ''
      let departmentName = employeeId ? departmentByUserId.get(employeeId) || '' : ''
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
        role = roleByUserId.get(coverId) || role
        departmentName = departmentByUserId.get(coverId) || departmentName
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
        role,
        departmentName: departmentName || null,
        shiftName: assignment.shift?.name || 'Unknown Shift',
        shiftTime: `${assignment.shift?.startTime || ''} - ${assignment.shift?.endTime || ''}`,
        slotTimeRange: assignment.slotTimeRange,
        status,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        workingDays: assignment.workingDays,
        notes: override?.notes || assignment.notes,
        leaveType: override?.leaveType || null,
        leaveNote: override?.leaveNote || null,
        areaName: assignment.area?.areaName || null,
        locationLabel: buildLocationLabel(assignment),
        assignment,
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

    // Include persisted date rows for edge cases, but skip auto week-off fillers
    // (non-working weekdays stored as day_off — those must not appear as struck-through roster cards)
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
  }, [shiftsData, datesData, roleByUserId, nameByUserId, departmentByUserId, employeeIdsInDepartment])

  const startWeekday = new Date(year, month, 1).getDay()
  const cells: Array<{ day: number | null; key: string }> = []
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, key: `e-${i}` })
  for (let d = 1; d <= lastDay; d++) cells.push({ day: d, key: `d-${d}` })

  const monthLabel = cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const isLoading = shiftsLoading || datesLoading

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900">Roster Calendar</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <DepartmentFilter
            id="roster-dept-filter"
            value={departmentFilter}
            onChange={setDepartmentFilter}
            departments={activeDepartments}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setCursor(new Date(year, month - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-36 text-center">{monthLabel}</span>
            <Button size="sm" variant="outline" onClick={() => setCursor(new Date(year, month + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <RosterPermission action="create">
            <Button
              size="sm"
              className="bg-[#2a517c] hover:bg-[#476587] text-white"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Roster
            </Button>
          </RosterPermission>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading calendar…</p>
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
            const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_ROSTERS)
            const overflowCount = Math.max(0, dayEvents.length - MAX_VISIBLE_ROSTERS)

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
                    <div key={event.id} className="space-y-0.5 pointer-events-none">
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
                        {event.departmentName && (
                          <div className="text-[8px] font-medium text-gray-500 uppercase tracking-wider mt-0.5">
                            {event.departmentName}
                          </div>
                        )}
                      </div>
                    </div>
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

      <AssignShiftDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RosterDayListDialog
        open={!!selectedDay}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null)
        }}
        date={selectedDay}
        events={selectedDay ? eventsByDate[selectedDay] || [] : []}
        onSelectEvent={(event) => {
          setSelectedDay(null)
          setDetailEvent(event)
        }}
      />
      <RosterDetailDialog
        open={!!detailEvent}
        onOpenChange={(open) => {
          if (!open) setDetailEvent(null)
        }}
        event={detailEvent}
      />
    </div>
  )
}

export default RosterCalendar
