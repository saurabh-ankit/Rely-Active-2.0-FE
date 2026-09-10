import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ListFilter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDeleteEmployeeShift, useListEmployeeShifts } from '@/hooks/react-query/employeeShifts'
import { useListShiftEmployeeDates, useUnmarkDayOff } from '@/hooks/react-query/shiftEmployeeDates'
import { useDepartmentsQuery } from '@/hooks/react-query/rbac'
import { useUsersQuery } from '@/hooks/react-query/user'
import type { EmployeeShiftAssignment } from '@/lib/services/employeeShiftService'
import type { ShiftEmployeeDate } from '@/lib/services/shiftEmployeeDateService'
import { useLocationStore } from '@/lib/stores/locationStore'
import {
  getUserDepartmentName,
  getUserDisplayName,
  getUserRoleCodes,
  resolveLifecycleRosterStatus,
  todayYmdLocal,
} from '../../utils'
import RosterDetailDialog, { type RosterCalendarEvent } from '../dialogs/RosterDetailDialog'
import RosterShiftCard, { type RosterCardAction } from '../Roster/RosterShiftCard'

const ROSTER_PAGE_SIZE = 9
const ALL_STATUS = 'all'

const ROSTER_STATUS_FILTERS = [
  { value: ALL_STATUS, label: 'All statuses' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'on_duty', label: 'On duty' },
  { value: 'completed', label: 'Completed' },
  { value: 'covered', label: 'Cover' },
  { value: 'day_off', label: 'Day off' },
  { value: 'absent', label: 'Absent' },
] as const

type RosterStatusFilter = (typeof ROSTER_STATUS_FILTERS)[number]['value']

const matchesRosterFilter = (event: RosterCalendarEvent, filter: RosterStatusFilter, today: string) => {
  if (filter === ALL_STATUS) return true
  if (filter === 'today') return event.date === today
  if (filter === 'covered') return event.status === 'covered' || !!event.isCoverDuty
  return event.status === filter
}

const buildLocationLabel = (assignment?: EmployeeShiftAssignment | null): string | null => {
  if (!assignment) return null
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

const EmployeeDetail = () => {
  const { employeeId } = useParams<{ employeeId: string }>()
  const navigate = useNavigate()
  const { data: users } = useUsersQuery()
  const { data: departments = [] } = useDepartmentsQuery()
  const locationId = useLocationStore((s) => s.selectedLocationId)
  const { data, isLoading: assignmentsLoading } = useListEmployeeShifts(employeeId)
  const { data: datesData, isLoading: datesLoading } = useListShiftEmployeeDates(undefined, !!employeeId)
  const deleteAssignment = useDeleteEmployeeShift()
  const unmarkDayOff = useUnmarkDayOff()

  const employee = useMemo(() => (users || []).find((u) => u.id === employeeId), [users, employeeId])

  const assignments: EmployeeShiftAssignment[] = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data])

  const assignmentById = useMemo(() => {
    const map = new Map<string, EmployeeShiftAssignment>()
    for (const a of assignments) map.set(a.id, a)
    return map
  }, [assignments])

  const rosterEvents: RosterCalendarEvent[] = useMemo(() => {
    const dates = (Array.isArray(datesData?.data) ? datesData.data : []) as ShiftEmployeeDate[]
    const role = employee ? getUserRoleCodes(employee)[0] || '' : ''
    const name = employee ? getUserDisplayName(employee) : 'Employee'
    const departmentName = employee ? getUserDepartmentName(employee, departments || [], locationId) : ''

    const toEvent = (
      d: ShiftEmployeeDate,
      opts: { isCoverDuty: boolean; displayName: string; displayRole: string },
    ): RosterCalendarEvent => {
      const assignment =
        assignmentById.get(d.employeeShiftAssignmentId) || (d.shiftAssignment as EmployeeShiftAssignment | undefined)
      const shiftName = assignment?.shift?.name || d.shiftAssignment?.shift?.name || 'Shift'
      const shiftStart = assignment?.shift?.startTime || d.shiftAssignment?.shift?.startTime || null
      const shiftEnd = assignment?.shift?.endTime || d.shiftAssignment?.shift?.endTime || null
      const shiftTime = shiftStart && shiftEnd ? `${shiftStart} - ${shiftEnd}` : ''
      const slotTimeRange = assignment?.slotTimeRange || d.shiftAssignment?.slotTimeRange || null
      const originalName =
        `${d.shiftAssignment?.employee?.profile?.firstName || ''} ${d.shiftAssignment?.employee?.profile?.lastName || ''}`.trim()

      return {
        id: opts.isCoverDuty ? `${d.id}-cover` : d.id,
        assignmentId: d.employeeShiftAssignmentId,
        shiftEmployeeDateId: d.id,
        date: d.date,
        employeeId: opts.isCoverDuty ? employeeId : d.shiftAssignment?.employeeId || employeeId,
        employeeName: opts.displayName,
        role: opts.displayRole,
        departmentName: departmentName || null,
        shiftName,
        shiftTime,
        slotTimeRange,
        status: resolveLifecycleRosterStatus(d.status, d.date, shiftStart, shiftEnd, slotTimeRange),
        startDate: assignment?.startDate || d.date,
        endDate: assignment?.endDate || d.date,
        workingDays: assignment?.workingDays || d.shiftAssignment?.workingDays || null,
        notes: d.notes || assignment?.notes || null,
        leaveType: d.leaveType || null,
        leaveNote: d.leaveNote || null,
        areaName: assignment?.area?.areaName || null,
        locationLabel: buildLocationLabel(assignment || null),
        assignment: assignment || null,
        isCoverDuty: opts.isCoverDuty,
        coveredByEmployeeId: d.coveredByEmployeeId || null,
        originalEmployeeName: opts.isCoverDuty ? originalName || null : null,
      }
    }

    const ownRosters = dates
      .filter((d) => {
        if (d.isDeleted) return false
        if (d.shiftAssignment?.employeeId !== employeeId) return false
        if (d.status === 'day_off' && (d.leaveType === 'week_off' || !d.leaveType)) return false
        return true
      })
      .map((d) => toEvent(d, { isCoverDuty: false, displayName: name, displayRole: role }))

    const coverRosters = dates
      .filter((d) => {
        if (d.isDeleted) return false
        if (d.status !== 'covered') return false
        if (d.coveredByEmployeeId !== employeeId) return false
        // Avoid duplicating if somehow same employee
        if (d.shiftAssignment?.employeeId === employeeId) return false
        return true
      })
      .map((d) => toEvent(d, { isCoverDuty: true, displayName: name, displayRole: role }))

    return [...ownRosters, ...coverRosters].sort(
      (a, b) => a.date.localeCompare(b.date) || a.shiftTime.localeCompare(b.shiftTime),
    )
  }, [datesData, employeeId, employee, assignmentById, departments, locationId])

  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [detailEvent, setDetailEvent] = useState<RosterCalendarEvent | null>(null)
  const [initialAction, setInitialAction] = useState<'swap' | 'cover' | 'day_off' | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [statusFilter, setStatusFilter] = useState<RosterStatusFilter>('today')
  const [rosterEmployeeId, setRosterEmployeeId] = useState(employeeId)

  if (employeeId !== rosterEmployeeId) {
    setRosterEmployeeId(employeeId)
    setPageIndex(0)
    setStatusFilter('today')
  }

  const isLoading = assignmentsLoading || datesLoading
  const today = todayYmdLocal()

  const filteredEvents = useMemo(
    () => rosterEvents.filter((event) => matchesRosterFilter(event, statusFilter, today)),
    [rosterEvents, statusFilter, today],
  )

  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / ROSTER_PAGE_SIZE))
  const safePageIndex = Math.min(pageIndex, pageCount - 1)

  const handleStatusFilterChange = (value: RosterStatusFilter) => {
    setStatusFilter(value)
    setPageIndex(0)
  }

  const pagedEvents = useMemo(() => {
    const start = safePageIndex * ROSTER_PAGE_SIZE
    return filteredEvents.slice(start, start + ROSTER_PAGE_SIZE)
  }, [filteredEvents, safePageIndex])

  const rangeStart = filteredEvents.length === 0 ? 0 : safePageIndex * ROSTER_PAGE_SIZE + 1
  const rangeEnd = Math.min((safePageIndex + 1) * ROSTER_PAGE_SIZE, filteredEvents.length)

  const handleCardAction = async (event: RosterCalendarEvent, action: RosterCardAction) => {
    if (action === 'residents') {
      navigate(`/admin/shift-roster-management/employees/${employeeId}/residents`)
      return
    }

    if (action === 'remove') {
      if (confirmId === event.assignmentId) {
        await deleteAssignment.mutateAsync(event.assignmentId)
        setConfirmId(null)
      } else {
        setConfirmId(event.assignmentId)
      }
      return
    }

    if (action === 'day_off' && event.status === 'day_off' && event.shiftEmployeeDateId) {
      await unmarkDayOff.mutateAsync(event.shiftEmployeeDateId)
      return
    }

    if (action === 'swap' || action === 'cover' || action === 'day_off') {
      setInitialAction(action)
      setDetailEvent(event)
      return
    }

    setInitialAction(null)
    setDetailEvent(event)
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(42,81,124,0.05)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1e3a5a] via-[#2a517c] to-[#5b8bb8]" />
        <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3">
            <Button
              size="sm"
              variant="ghost"
              className="mt-0.5 h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50"
              onClick={() => navigate('/admin/shift-roster-management?tab=employees')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2a517c] to-[#476587] text-sm font-bold tracking-wide text-white shadow-sm">
                {employee
                  ? getUserDisplayName(employee)
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase() || '')
                      .join('') || '?'
                  : '?'}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold tracking-tight text-slate-900">
                  {employee ? getUserDisplayName(employee) : 'Employee'}
                </h2>
                <p className="mt-0.5 truncate text-sm text-slate-500">{employee?.email || employeeId}</p>
                {employee ? (
                  <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#2a517c]/80">
                    {getUserDepartmentName(employee, departments || [], locationId) ||
                      getUserRoleCodes(employee)[0] ||
                      'Staff'}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center sm:min-w-[110px]">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Rosters</p>
            <p className="text-2xl font-semibold tabular-nums text-[#2a517c]">{rosterEvents.length}</p>
          </div>
        </div>
      </div>

      <div className="pb-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Assigned rosters</h3>
            <p className="text-sm text-slate-500">Shift coverage for this employee</p>
          </div>
          <Select value={statusFilter} onValueChange={(v) => handleStatusFilterChange(v as RosterStatusFilter)}>
            <SelectTrigger className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-xs sm:w-[200px] hover:border-gray-400 hover:bg-gray-50 focus-visible:border-[#2a517c] focus-visible:ring-2 focus-visible:ring-[#2a517c]/20">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <ListFilter className="h-4 w-4 shrink-0 text-gray-400" />
                <SelectValue placeholder="Filter by status" />
              </span>
            </SelectTrigger>
            <SelectContent className="min-w-[200px] rounded-lg border border-gray-200 bg-white shadow-lg">
              {ROSTER_STATUS_FILTERS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
            Loading…
          </div>
        ) : rosterEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
            No rosters created for this employee.
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
            No rosters match this filter.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pagedEvents.map((event) => (
                <RosterShiftCard
                  key={event.id}
                  event={event}
                  showAssignedResidents={false}
                  removePending={deleteAssignment.isPending && confirmId === event.assignmentId}
                  removeLabel={confirmId === event.assignmentId ? 'Confirm remove' : 'Remove'}
                  onAction={(action) => handleCardAction(event, action)}
                />
              ))}
            </div>

            <div className="mt-5 mb-6 flex flex-col items-center justify-between gap-4 px-1 py-2 sm:flex-row">
              <div className="text-xs font-medium text-gray-500">
                Showing{' '}
                <span className="font-bold text-gray-900">
                  {rangeStart}–{rangeEnd}
                </span>{' '}
                of <span className="font-bold text-gray-900">{filteredEvents.length}</span>
                <span className="mx-1.5">•</span>
                Page <span className="font-bold text-gray-900">{safePageIndex + 1}</span> of{' '}
                <span className="font-bold text-gray-900">{pageCount}</span>
              </div>

              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (safePageIndex > 0) setPageIndex(safePageIndex - 1)
                      }}
                      className={
                        safePageIndex === 0
                          ? 'pointer-events-none border-gray-200 bg-gray-50 text-gray-400 opacity-50'
                          : 'cursor-pointer border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }
                    />
                  </PaginationItem>

                  {Array.from({ length: pageCount }).map((_, idx) => {
                    if (idx === 0 || idx === pageCount - 1 || (idx >= safePageIndex - 1 && idx <= safePageIndex + 1)) {
                      return (
                        <PaginationItem key={idx}>
                          <PaginationLink
                            href="#"
                            isActive={idx === safePageIndex}
                            onClick={(e) => {
                              e.preventDefault()
                              setPageIndex(idx)
                            }}
                            className="h-8 w-8 cursor-pointer rounded-xl text-xs font-bold"
                          >
                            {idx + 1}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    }
                    if ((idx === 1 && safePageIndex > 2) || (idx === pageCount - 2 && safePageIndex < pageCount - 3)) {
                      return (
                        <PaginationItem key={`ellipsis-${idx}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )
                    }
                    return null
                  })}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (safePageIndex < pageCount - 1) setPageIndex(safePageIndex + 1)
                      }}
                      className={
                        safePageIndex >= pageCount - 1
                          ? 'pointer-events-none border-gray-200 bg-gray-50 text-gray-400 opacity-50'
                          : 'cursor-pointer border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </>
        )}
        {confirmId && (
          <p className="mt-3 text-xs text-red-600">Click the × again on the same card to confirm removal.</p>
        )}
      </div>

      <RosterDetailDialog
        key={`${detailEvent?.id || 'none'}-${initialAction || 'details'}`}
        open={!!detailEvent}
        onOpenChange={(open) => {
          if (!open) {
            setDetailEvent(null)
            setInitialAction(null)
          }
        }}
        event={detailEvent}
        initialAction={initialAction}
      />
    </div>
  )
}

export default EmployeeDetail
