import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { ChevronRight, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { useDepartmentsQuery } from '@/hooks/react-query/rbac'
import { useUsersQuery } from '@/hooks/react-query/user'
import type { EmployeeShiftAssignment, ShiftEmployeeDate } from '@/lib/services/rosterService'
import { useLocationStore } from '@/lib/stores/locationStore'
import type { UserItem } from '@/lib/types'
import {
  getUserDepartmentIds,
  getUserDepartmentName,
  getUserDisplayName,
  getUserRoleCodes,
  parseLocalDate,
  todayYmdLocal,
} from '../../utils'
import DepartmentFilter, { ALL_DEPARTMENTS } from './DepartmentFilter'
import { useListEmployeeShifts, useListShiftEmployeeDates } from '@/hooks/react-query/roster'

type RosterSlot = { date: string; shiftName: string; time: string }

/** Where an employee stands on the roster, from their (non-deleted) roster days. */
type RosterInfo = {
  total: number
  /** Working days after today. */
  upcoming: number
  today: RosterSlot | null
  next: RosterSlot | null
  /** Most recent working day before today. */
  lastDate: string | null
  /** Last rostered day from today on. */
  until: string | null
  shifts: string[]
}

type RosterState = 'today' | 'rostered' | 'ended' | 'none'

const ROSTER_STATE: Record<RosterState, { label: string; cls: string; dot: string }> = {
  today: { label: 'On shift today', cls: 'border-sky-200 bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  rostered: { label: 'Rostered', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  ended: { label: 'Roster ended', cls: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  none: { label: 'Not rostered', cls: 'border-gray-200 bg-gray-50 text-gray-500', dot: 'bg-gray-400' },
}

const dayLabel = (ymd: string) => format(parseLocalDate(ymd), 'EEE, d MMM')

type EmployeeRow = {
  employeeId: string
  name: string
  department: string
  email: string
  phone: string
  roles: string[]
  rosterState: RosterState
  roster: RosterInfo | null
  shifts: string[]
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || '?'

const titleCase = (code: string) =>
  code
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

const EmployeesList = () => {
  const navigate = useNavigate()
  const locationId = useLocationStore((s) => s.selectedLocationId)
  const [departmentFilter, setDepartmentFilter] = useState(ALL_DEPARTMENTS)

  const { data: users, isLoading: usersLoading } = useUsersQuery()
  const { data: departments = [] } = useDepartmentsQuery()
  const { data: assignmentsData, isLoading: assignmentsLoading } = useListEmployeeShifts()
  const { data: datesData, isLoading: datesLoading } = useListShiftEmployeeDates()

  const activeDepartments = useMemo(() => (departments || []).filter((d) => d.isActive !== false), [departments])

  const assignments: EmployeeShiftAssignment[] = useMemo(
    () => (Array.isArray(assignmentsData?.data) ? assignmentsData.data : []),
    [assignmentsData],
  )

  const rosterByEmployee = useMemo(() => {
    const map = new Map<string, RosterInfo>()
    const today = todayYmdLocal()
    const dates = (Array.isArray(datesData?.data) ? datesData.data : []) as ShiftEmployeeDate[]

    const infoFor = (empId: string) => {
      let info = map.get(empId)
      if (!info) {
        info = { total: 0, upcoming: 0, today: null, next: null, lastDate: null, until: null, shifts: [] }
        map.set(empId, info)
      }
      return info
    }

    for (const d of dates) {
      if (d.isDeleted) continue
      if (d.status === 'day_off' && (d.leaveType === 'week_off' || !d.leaveType)) continue

      const ownerId = d.shiftAssignment?.employeeId
      const coverId = d.coveredByEmployeeId
      const shift = d.shiftAssignment?.shift
      const shiftName = shift?.name || 'Shift'
      const time =
        d.shiftAssignment?.slotTimeRange ||
        (shift?.startTime && shift?.endTime ? `${shift.startTime.slice(0, 5)}–${shift.endTime.slice(0, 5)}` : '')

      const add = (empId: string, working: boolean) => {
        const info = infoFor(empId)
        info.total += 1
        if (!info.shifts.includes(shiftName)) info.shifts.push(shiftName)
        if (!working) return
        const slot = { date: d.date, shiftName, time }
        if (d.date === today) info.today = slot
        else if (d.date > today) {
          info.upcoming += 1
          if (!info.next || d.date < info.next.date) info.next = slot
          if (!info.until || d.date > info.until) info.until = d.date
        } else if (!info.lastDate || d.date > info.lastDate) info.lastDate = d.date
      }

      // The owner isn't working a day off or a day someone else covers; the cover is.
      if (ownerId) add(ownerId, d.status !== 'day_off' && d.status !== 'covered')
      if (d.status === 'covered' && coverId && coverId !== ownerId) add(coverId, true)
    }

    // Fallback: if dates missing, use assignment periods so shifts still show
    for (const a of assignments) {
      if (map.has(a.employeeId)) continue
      infoFor(a.employeeId).shifts.push(a.shift?.name || 'Shift')
    }

    return map
  }, [datesData, assignments])

  const employeeSource: UserItem[] = useMemo(() => {
    const list = (Array.isArray(users) ? users : []).filter((u) => u.isActive !== false && u.status !== 'INACTIVE')
    // Prefer staff assigned to a department at this location (all departments).
    const withDepartment = list.filter((emp) => getUserDepartmentIds(emp, locationId).length > 0)
    const base = withDepartment.length > 0 ? withDepartment : list

    if (departmentFilter === ALL_DEPARTMENTS) return base
    return base.filter((emp) => getUserDepartmentIds(emp, locationId).includes(departmentFilter))
  }, [users, departmentFilter, locationId])

  const openEmployee = (employeeId: string) => {
    navigate(`/admin/shift-roster-management/employees/${employeeId}`)
  }

  const rows: EmployeeRow[] = useMemo(
    () =>
      employeeSource.map((emp) => {
        const info = rosterByEmployee.get(emp.id)
        const roles = [...new Set(getUserRoleCodes(emp))]
        return {
          employeeId: emp.id,
          name: getUserDisplayName(emp),
          department: getUserDepartmentName(emp, departments || [], locationId) || '',
          email: emp.email || '',
          phone: emp.phone || emp.profile?.phone || '',
          roles,
          rosterState: (!info || info.total === 0
            ? 'none'
            : info.today
              ? 'today'
              : info.upcoming > 0
                ? 'rostered'
                : 'ended') as RosterState,
          roster: info ?? null,
          shifts: (info?.shifts || []).filter((x) => x !== '—'),
        }
      }),
    [employeeSource, rosterByEmployee, departments, locationId],
  )

  const columns: ColumnDef<EmployeeRow>[] = [
    {
      accessorKey: 'name',
      header: 'Employee',
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          className="h-auto p-0 flex min-w-0 cursor-pointer items-center gap-3 text-left whitespace-normal font-normal hover:bg-transparent"
          onClick={() => openEmployee(row.original.employeeId)}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2a517c]/10 text-xs font-bold text-[#2a517c]">
            {initialsOf(row.original.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-gray-900 hover:text-[#2a517c]">{row.original.name}</span>
            {row.original.department && (
              <span className="block truncate text-[11px] font-medium uppercase tracking-wide text-gray-500">
                {row.original.department}
              </span>
            )}
          </span>
        </Button>
      ),
    },
    {
      id: 'contact',
      header: 'Contact',
      cell: ({ row }) => (
        <div className="space-y-0.5 text-xs text-gray-600">
          {row.original.email && (
            <p className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 shrink-0 text-gray-400" />
              <span className="truncate">{row.original.email}</span>
            </p>
          )}
          {row.original.phone && (
            <p className="flex items-center gap-1.5 tabular-nums">
              <Phone className="h-3 w-3 shrink-0 text-gray-400" />
              {row.original.phone}
            </p>
          )}
          {!row.original.email && !row.original.phone && <span className="text-gray-400">—</span>}
        </div>
      ),
    },
    {
      id: 'roles',
      header: 'Role',
      cell: ({ row }) =>
        row.original.roles.length === 0 ? (
          <span className="text-gray-400">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.original.roles.map((role) => (
              <span
                key={role}
                className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-700"
              >
                {titleCase(role)}
              </span>
            ))}
          </div>
        ),
    },
    {
      id: 'next',
      header: 'Next shift',
      cell: ({ row }) => {
        const r = row.original.roster
        if (!r || r.total === 0) return <span className="text-xs text-gray-400">Not rostered</span>
        const slot = r.today ?? r.next
        if (!slot) {
          return (
            <div>
              <p className="text-sm font-medium text-gray-500">No upcoming shifts</p>
              {r.lastDate && <p className="text-[11px] text-gray-400">Last shift {dayLabel(r.lastDate)}</p>}
            </div>
          )
        }
        return (
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {r.today ? 'Today' : dayLabel(slot.date)}
              <span className="font-normal text-gray-500"> · {slot.shiftName}</span>
            </p>
            <p className="text-[11px] text-gray-500">
              {slot.time && <span className="tabular-nums">{slot.time} · </span>}
              {r.upcoming > 0 ? `${r.upcoming} more until ${dayLabel(r.until!)}` : 'last shift on the roster'}
            </p>
          </div>
        )
      },
    },
    {
      id: 'shifts',
      header: 'Shifts',
      cell: ({ row }) =>
        row.original.shifts.length === 0 ? (
          <span className="text-gray-400">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.original.shifts.map((shift) => (
              <span
                key={shift}
                className="rounded-full bg-[#2a517c]/10 px-2 py-0.5 text-[11px] font-semibold text-[#2a517c]"
              >
                {shift}
              </span>
            ))}
          </div>
        ),
    },
    {
      id: 'rosterState',
      header: 'Roster status',
      cell: ({ row }) => {
        const state = ROSTER_STATE[row.original.rosterState]
        return (
          <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${state.cls}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
            {state.label}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-lg text-xs"
          onClick={() => openEmployee(row.original.employeeId)}
        >
          View roster
          <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
    },
  ]

  const isLoading = usersLoading || assignmentsLoading || datesLoading

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Employees</h3>
          <p className="text-xs text-gray-500">
            {rows.length} employee{rows.length === 1 ? '' : 's'} ·{' '}
            {rows.filter((r) => r.rosterState === 'today' || r.rosterState === 'rostered').length} with upcoming shifts.
            Open one to see and manage their shifts.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DepartmentFilter
            id="employees-dept-filter"
            value={departmentFilter}
            onChange={setDepartmentFilter}
            departments={activeDepartments}
          />
        </div>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        filterKey="name"
        searchPlaceholder="Search employees…"
      />
    </div>
  )
}

export default EmployeesList
