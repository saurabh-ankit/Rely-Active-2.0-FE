import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { CalendarCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/common/BackButton'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { useDepartmentsQuery } from '@/hooks/react-query/rbac'
import { useUsersQuery } from '@/hooks/react-query/user'
import type { EmployeeShiftAssignment, ShiftEmployeeDate } from '@/lib/services/rosterService'
import { useLocationStore } from '@/lib/stores/locationStore'
import { cn } from '@/lib/utils'
import {
  formatExtraTimeLabel,
  getShiftAccent,
  getUserDepartmentName,
  getUserDisplayName,
  getUserRoleCodes,
  resolveLifecycleRosterStatus,
  todayYmdLocal,
} from '../../utils'
import RosterDetailDialog, { type RosterCalendarEvent } from '../dialogs/RosterDetailDialog'
import RosterShiftCard, { type RosterCardAction } from '../Roster/RosterShiftCard'
import { RosterPermission } from '../RosterPermission'
import {
  useBulkDeleteShiftEmployeeDates,
  useListEmployeeShifts,
  useListShiftEmployeeDates,
  useUnmarkDayOff,
} from '@/hooks/react-query/roster'
import { floorLabel } from '@/utils/unitLabel'

const ROSTER_PAGE_SIZE = 6
const ALL_STATUS = 'all'

const ROSTER_STATUS_FILTERS = [
  { value: 'today', label: 'Today' },
  { value: ALL_STATUS, label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'on_duty', label: 'On duty' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
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
  if (assignment.amenity?.name) return assignment.amenity.name
  if (assignment.area?.areaName) return assignment.area.areaName
  const parts: string[] = []
  if (assignment.block?.block_name) parts.push(assignment.block.block_name)
  const floorText = floorLabel(assignment.floor)
  if (floorText) parts.push(floorText)
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
  const bulkDeleteDates = useBulkDeleteShiftEmployeeDates()
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
        status: resolveLifecycleRosterStatus(
          d.status,
          d.date,
          shiftStart,
          shiftEnd,
          slotTimeRange,
          undefined,
          d.housekeepingCompletion?.status,
        ),
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
        taskStartedAt: d.housekeepingCompletion?.startedAt || null,
        taskCompletedAt: d.housekeepingCompletion?.completedAt || null,
        taskComment: d.housekeepingCompletion?.comment || null,
        taskPhotos: (d.housekeepingCompletion?.attachments?.photos || [])
          .filter((p): p is { url: string; originalName?: string } => !!p?.url)
          .map((p) => ({ url: p.url, originalName: p.originalName })),
        extraMinutes: d.housekeepingCompletion?.extraMinutes ?? null,
        extraTimeLabel: formatExtraTimeLabel(d.housekeepingCompletion?.extraMinutes),
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

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [detailEvent, setDetailEvent] = useState<RosterCalendarEvent | null>(null)
  const [initialAction, setInitialAction] = useState<'swap' | 'cover' | 'day_off' | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [statusFilter, setStatusFilter] = useState<RosterStatusFilter>('today')
  const [rosterEmployeeId, setRosterEmployeeId] = useState(employeeId)

  if (employeeId !== rosterEmployeeId) {
    setRosterEmployeeId(employeeId)
    setPageIndex(0)
    setStatusFilter('today')
    setSelectedIds([])
  }

  const isLoading = assignmentsLoading || datesLoading
  const today = todayYmdLocal()

  const filterCounts = useMemo(
    () =>
      Object.fromEntries(
        ROSTER_STATUS_FILTERS.map((opt) => [
          opt.value,
          rosterEvents.filter((event) => matchesRosterFilter(event, opt.value, today)).length,
        ]),
      ) as Record<RosterStatusFilter, number>,
    [rosterEvents, today],
  )

  const filteredEvents = useMemo(
    () => rosterEvents.filter((event) => matchesRosterFilter(event, statusFilter, today)),
    [rosterEvents, statusFilter, today],
  )

  const todayEvents = useMemo(() => rosterEvents.filter((event) => event.date === today), [rosterEvents, today])

  const shiftLegend = useMemo(() => {
    const seen = new Map<string, string>()
    for (const event of todayEvents) {
      if (!seen.has(event.shiftName)) seen.set(event.shiftName, getShiftAccent(event.shiftName).dot)
    }
    return [...seen.entries()].map(([name, dot]) => ({ name, dot }))
  }, [todayEvents])

  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / ROSTER_PAGE_SIZE))
  const safePageIndex = Math.min(pageIndex, pageCount - 1)

  const handleStatusFilterChange = (value: RosterStatusFilter) => {
    setStatusFilter(value)
    setPageIndex(0)
    setSelectedIds([])
  }

  const pagedEvents = useMemo(() => {
    const start = safePageIndex * ROSTER_PAGE_SIZE
    return filteredEvents.slice(start, start + ROSTER_PAGE_SIZE)
  }, [filteredEvents, safePageIndex])

  const selectablePagedIds = useMemo(
    () =>
      pagedEvents.filter((e) => !e.isCoverDuty && e.shiftEmployeeDateId).map((e) => e.shiftEmployeeDateId as string),
    [pagedEvents],
  )

  const allPageSelected = selectablePagedIds.length > 0 && selectablePagedIds.every((id) => selectedIds.includes(id))

  const toggleSelectAllPage = (checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...selectablePagedIds])))
    } else {
      const pageSet = new Set(selectablePagedIds)
      setSelectedIds((prev) => prev.filter((id) => !pageSet.has(id)))
    }
  }

  const toggleSelectOne = (dateId: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, dateId] : prev.filter((id) => id !== dateId)))
  }

  const rangeStart = filteredEvents.length === 0 ? 0 : safePageIndex * ROSTER_PAGE_SIZE + 1
  const rangeEnd = Math.min((safePageIndex + 1) * ROSTER_PAGE_SIZE, filteredEvents.length)

  const handleCardAction = async (event: RosterCalendarEvent, action: RosterCardAction) => {
    if (action === 'residents') {
      navigate(`/admin/shift-roster-management/employees/${employeeId}/residents`)
      return
    }

    if (action === 'day_off' && event.status === 'day_off' && event.shiftEmployeeDateId) {
      await unmarkDayOff.mutateAsync(event.shiftEmployeeDateId)
      return
    }

    if (action === 'swap' || action === 'cover' || action === 'day_off') {
      // Started / on-duty / completed / overdue cannot be swapped, covered, or marked day off.
      if (
        event.status === 'completed' ||
        event.status === 'overdue' ||
        event.status === 'on_duty' ||
        event.taskStartedAt
      ) {
        setInitialAction(null)
        setDetailEvent(event)
        return
      }
      setInitialAction(action)
      setDetailEvent(event)
      return
    }

    setInitialAction(null)
    setDetailEvent(event)
  }

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return
    bulkDeleteDates.mutate(selectedIds, {
      onSuccess: () => {
        setSelectedIds([])
        setIsBulkDeleteOpen(false)
      },
    })
  }

  const employeeInitials = employee
    ? getUserDisplayName(employee)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || '')
        .join('') || '?'
    : '?'

  const departmentLabel = employee
    ? getUserDepartmentName(employee, departments || [], locationId) || getUserRoleCodes(employee)[0] || 'Staff'
    : 'Staff'

  return (
    <div className="space-y-5 pb-10">
      <BackButton onClick={() => navigate('/admin/shift-roster-management?tab=employees')}>
        Back to employee roster
      </BackButton>

      <Card className="gap-0 rounded-2xl border-slate-200/80 bg-white px-4 py-4 shadow-none sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1e3a5a] text-sm font-bold text-white">
              {employeeInitials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-slate-900">
                  {employee ? getUserDisplayName(employee) : 'Employee'}
                </h2>
                <span className="rounded-full bg-[#005390]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#005390]">
                  {departmentLabel}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {[employee?.email || employeeId, employee?.phone || employee?.profile?.phone]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:min-w-[360px]">
            {(
              [
                ['today', 'Today'],
                ['upcoming', 'Upcoming'],
                ['completed', 'Completed'],
                ['day_off', 'Days off'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => handleStatusFilterChange(value)}
                className={cn(
                  'rounded-xl px-2.5 py-2 text-center transition-colors',
                  statusFilter === value ? 'bg-[#005390]/10' : 'bg-slate-50 hover:bg-slate-100',
                )}
              >
                <p className="text-lg font-bold tabular-nums text-slate-900">{filterCounts[value] ?? 0}</p>
                <p className="text-[11px] font-medium text-slate-500">{label}</p>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="gap-0 rounded-2xl border-slate-200/80 bg-white p-4 shadow-none sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Today · {format(new Date(), 'EEE, d MMM')}</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {todayEvents.length} shift{todayEvents.length === 1 ? '' : 's'} · {rosterEvents.length} in total. Select a
              card to view details, swap, cover, or mark a day off.
            </p>
          </div>
          {shiftLegend.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              {shiftLegend.map((item) => (
                <span key={item.name} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <span className={cn('size-2 rounded-full', item.dot)} />
                  {item.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter rosters">
          {ROSTER_STATUS_FILTERS.map((opt) => {
            const active = statusFilter === opt.value
            const count = filterCounts[opt.value] ?? 0
            return (
              <Button
                key={opt.value}
                type="button"
                variant="ghost"
                role="tab"
                aria-selected={active}
                onClick={() => handleStatusFilterChange(opt.value)}
                className={cn(
                  'h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors',
                  active
                    ? 'border-[#1e3a5a] bg-[#1e3a5a] text-white hover:bg-[#1e3a5a] hover:text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                {opt.label}
                <span className={cn('ml-1.5 tabular-nums', active ? 'text-white/85' : 'text-slate-400')}>{count}</span>
              </Button>
            )
          })}
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-600">
          {statusFilter === 'today'
            ? `Today's shifts`
            : statusFilter === 'all'
              ? 'All shifts'
              : `${ROSTER_STATUS_FILTERS.find((f) => f.value === statusFilter)?.label || 'Shifts'}`}
          <span className="ml-1.5 text-slate-400">({filteredEvents.length})</span>
        </p>
        <RosterPermission action="delete">
          <div className="flex items-center gap-2">
            {selectablePagedIds.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-600 select-none">
                <Checkbox
                  checked={allPageSelected}
                  onCheckedChange={(checked) => toggleSelectAllPage(checked === true)}
                  aria-label="Select all on page"
                />
                <span>Select page</span>
              </div>
            )}
            {selectedIds.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={bulkDeleteDates.isPending}
                onClick={() => setIsBulkDeleteOpen(true)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete selected ({selectedIds.length})
              </Button>
            )}
          </div>
        </RosterPermission>
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
        statusFilter === 'today' ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[#005390]/30 bg-[#005390]/5 py-12 text-center">
            <CalendarCheck className="h-8 w-8 text-[#005390]/60" />
            <p className="text-sm font-semibold text-slate-800">No shifts scheduled for today</p>
            <p className="text-xs text-slate-500">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
            {filterCounts.upcoming > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => handleStatusFilterChange('upcoming')}
              >
                View {filterCounts.upcoming} upcoming
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
            No rosters match this filter.
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pagedEvents.map((event) => (
              <RosterShiftCard
                key={event.id}
                event={event}
                showAssignedResidents={false}
                selectable
                selected={!!event.shiftEmployeeDateId && selectedIds.includes(event.shiftEmployeeDateId)}
                onSelectChange={(checked) => {
                  if (event.shiftEmployeeDateId) toggleSelectOne(event.shiftEmployeeDateId, checked)
                }}
                onAction={(action) => handleCardAction(event, action)}
              />
            ))}
          </div>

          <div className="mt-5 mb-2 flex flex-col items-center justify-between gap-4 px-1 py-2 sm:flex-row">
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

      <Dialog open={isBulkDeleteOpen} onOpenChange={(open) => !open && setIsBulkDeleteOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete selected shifts</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.length} selected shift
              {selectedIds.length === 1 ? '' : 's'}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsBulkDeleteOpen(false)} disabled={bulkDeleteDates.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleteDates.isPending}>
              {bulkDeleteDates.isPending
                ? 'Deleting…'
                : `Delete ${selectedIds.length} shift${selectedIds.length === 1 ? '' : 's'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
