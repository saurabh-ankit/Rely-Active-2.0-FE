import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDepartmentsQuery } from '@/hooks/react-query/rbac'
import { useUsersQuery } from '@/hooks/react-query/user'
import type { EmployeeShiftAssignment, ShiftEmployeeDate } from '@/lib/services/rosterService'
import { useLocationStore } from '@/lib/stores/locationStore'
import {
  WEEKDAY_BY_INDEX,
  buildLocationLabel,
  getUserDepartmentIds,
  getUserDepartmentName,
  getUserDisplayName,
  getUserRoleCodes,
  groupRostersByShift,
  parseLocalDate,
  resolveLifecycleRosterStatus,
  toDateKey,
  todayYmdLocal,
} from '../../utils'
import { RosterPermission } from '../RosterPermission'
import AssignShiftDialog from '../dialogs/AssignShiftDialog'
import DepartmentFilter, { ALL_DEPARTMENTS } from '../Employees/DepartmentFilter'
import RosterDayListDialog from '../dialogs/RosterDayListDialog'
import RosterDetailDialog, { type RosterCalendarEvent } from '../dialogs/RosterDetailDialog'
import RosterGridView from './RosterGridView'
import { useListEmployeeShifts, useListShiftEmployeeDates } from '@/hooks/react-query/roster'

const VIEW_MODES = ['month', 'grid'] as const
type RosterViewMode = (typeof VIEW_MODES)[number]

/** Left edge colour of an employee row, by roster status. */
const statusEdge: Record<string, string> = {
  upcoming: 'border-l-[#2a517c]/40',
  on_duty: 'border-l-sky-500',
  completed: 'border-l-emerald-500',
  absent: 'border-l-red-500',
  covered: 'border-l-amber-500',
  day_off: 'border-l-gray-300',
}

const RosterCalendar = () => {
  const [createOpen, setCreateOpen] = useState(false)
  const [detailEvent, setDetailEvent] = useState<RosterCalendarEvent | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [departmentFilter, setDepartmentFilter] = useState(ALL_DEPARTMENTS)
  const [viewMode, setViewMode] = useState<RosterViewMode>('month')
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const todayStr = todayYmdLocal()
  const locationId = useLocationStore((s) => s.selectedLocationId)

  const { data: shiftsData, isLoading: shiftsLoading } = useListEmployeeShifts()
  // Deleted days are needed too: without them a deleted day would be filled back in from the roster period.
  const { data: datesData, isLoading: datesLoading } = useListShiftEmployeeDates({ includeDeleted: 'true' })
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
      const key = `${sd.employeeShiftAssignmentId}_${toDateKey(sd.date)}`
      // A day deleted and later re-added has both rows; the active one wins.
      const existing = overrideMap.get(key)
      if (existing && !existing.isDeleted && sd.isDeleted) continue
      overrideMap.set(key, sd)
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
          const dayName = WEEKDAY_BY_INDEX[d.getDay()]
          if (!dayName || !assignment.workingDays.includes(dayName)) continue
        }

        const dateStr = todayYmdLocal(d)
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
          const dayName = WEEKDAY_BY_INDEX[parseLocalDate(sd.date).getDay()]
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
        toDateKey(sd.date),
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
          {viewMode === 'month' && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setCursor(new Date(year, month - 1, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-36 text-center">{monthLabel}</span>
              <Button size="sm" variant="outline" onClick={() => setCursor(new Date(year, month + 1, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Tabs
            value={viewMode}
            onValueChange={(val) => setViewMode(val as RosterViewMode)}
            className="gap-0 w-full sm:w-auto"
          >
            <div className="rounded-full bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/70 dark:border-slate-700/80 p-1 shadow-2xs flex w-full sm:w-auto">
              <TabsList className="grid grid-cols-3 w-full sm:w-auto items-center gap-1 bg-transparent p-0 h-auto">
                {VIEW_MODES.map((mode) => (
                  <TabsTrigger
                    key={mode}
                    value={mode}
                    className="flex h-7.5 w-full items-center justify-center rounded-full px-3 text-xs font-semibold capitalize text-slate-600 hover:text-slate-900 hover:bg-black/5 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 [&[data-active]]:!bg-[#005390] [&[data-active]]:!text-white [&[data-active]:hover]:!bg-[#005390] [&[data-active]:hover]:!text-white data-active:shadow-xs focus-visible:!ring-0 transition-all cursor-pointer"
                  >
                    {mode}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
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

      {viewMode === 'grid' ? (
        <RosterGridView
          employeeIds={employeeIdsInDepartment}
          nameByUserId={nameByUserId}
          onSelectDate={setSelectedDay}
        />
      ) : isLoading ? (
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
              return <div key={key} className="h-[210px] bg-white" />
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayEvents = eventsByDate[dateStr] || []
            const isToday = dateStr === todayStr
            const shiftGroups = groupRostersByShift(dayEvents)
            const staffCount = shiftGroups.reduce((sum, group) => sum + group.employees.length, 0)

            return (
              // A day cell (not a <button>, since each employee inside is one): clicking the
              // free space opens the day's list; clicking an employee opens their roster directly.
              <div
                key={key}
                role="button"
                tabIndex={0}
                aria-label={`Rosters on ${dateStr}`}
                onClick={() => setSelectedDay(dateStr)}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    setSelectedDay(dateStr)
                  }
                }}
                className={`h-[210px] p-2 bg-white flex flex-col gap-1.5 text-left w-full hover:bg-gray-50 transition-colors cursor-pointer ${
                  isToday ? 'bg-[#2a517c]/5' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-sm font-semibold ${isToday ? 'text-[#2a517c]' : 'text-gray-900'}`}>{day}</span>
                  {staffCount > 0 && (
                    <span className="text-[10px] font-semibold text-gray-400">{staffCount} staff</span>
                  )}
                </div>

                {/* Every shift that day, each once, with its employees under it; scrolls when it doesn't fit. */}
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
                  {shiftGroups.map((group) => (
                    <div key={group.key} className="overflow-hidden rounded-md border border-[#2a517c]/15">
                      <div className="flex items-center justify-between gap-1 bg-[#2a517c] px-2 py-1">
                        <span className="truncate text-[11px] font-bold uppercase tracking-wide text-white">
                          {group.shiftName}
                        </span>
                        <span className="shrink-0 text-[10px] font-semibold tabular-nums text-white/90">
                          {group.time}
                        </span>
                      </div>
                      <ul className="divide-y divide-gray-100 bg-white">
                        {group.employees.map(({ key: employeeKey, employeeName, events: areaEvents }) => {
                          const [first] = areaEvents
                          const multiArea = areaEvents.length > 1
                          const areas = areaEvents
                            .map((event) => event.locationLabel || event.areaName)
                            .filter(Boolean)
                            .join(' · ')
                          return (
                            <li key={employeeKey}>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // One roster opens directly; several areas open the day list to pick one.
                                  if (multiArea) setSelectedDay(dateStr)
                                  else setDetailEvent(first)
                                }}
                                title={
                                  multiArea
                                    ? `${employeeName}: ${areaEvents.length} areas on this shift`
                                    : `Open ${employeeName}'s roster for this day`
                                }
                                className={`h-auto p-0 rounded-none block w-full cursor-pointer border-l-[3px] px-2 py-1.5 text-left transition-colors hover:bg-[#2a517c]/5 whitespace-normal font-normal ${statusEdge[first.status] || statusEdge.upcoming}`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <p className="truncate text-[13px] font-semibold leading-tight text-[#1e3a5a]">
                                    {employeeName}
                                  </p>
                                  {multiArea && (
                                    <span className="shrink-0 rounded bg-[#2a517c]/10 px-1 text-[9px] font-bold uppercase text-[#2a517c]">
                                      {areaEvents.length} areas
                                    </span>
                                  )}
                                </div>
                                {first.departmentName && (
                                  <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                    {first.departmentName}
                                  </p>
                                )}
                                {multiArea && areas && (
                                  <p className="mt-0.5 truncate text-[10px] text-gray-500">{areas}</p>
                                )}
                              </Button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
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
