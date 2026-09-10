import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { useListEmployeeShifts } from '@/hooks/react-query/employeeShifts'
import { useDepartmentsQuery } from '@/hooks/react-query/rbac'
import { useListShiftEmployeeDates } from '@/hooks/react-query/shiftEmployeeDates'
import { useUsersQuery } from '@/hooks/react-query/user'
import type { EmployeeShiftAssignment } from '@/lib/services/employeeShiftService'
import type { ShiftEmployeeDate } from '@/lib/services/shiftEmployeeDateService'
import { useLocationStore } from '@/lib/stores/locationStore'
import type { UserItem } from '@/lib/types'
import { getUserDepartmentIds, getUserDisplayName, getUserRoleCodes } from '../../utils'
import DepartmentFilter, { ALL_DEPARTMENTS } from './DepartmentFilter'

type EmployeeRow = {
  employeeId: string
  name: string
  email: string
  phone: string
  roles: string
  status: string
  rosterCount: number
  shifts: string
}

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
    const map = new Map<string, { count: number; shifts: string[] }>()
    const dates = (Array.isArray(datesData?.data) ? datesData.data : []) as ShiftEmployeeDate[]

    for (const d of dates) {
      if (d.isDeleted) continue
      if (d.status === 'day_off' && (d.leaveType === 'week_off' || !d.leaveType)) continue

      const ownerId = d.shiftAssignment?.employeeId
      const coverId = d.coveredByEmployeeId
      const shiftLabel = d.shiftAssignment?.shift?.name || '—'

      const bump = (empId: string) => {
        const existing = map.get(empId)
        if (existing) {
          existing.count += 1
          if (!existing.shifts.includes(shiftLabel)) existing.shifts.push(shiftLabel)
        } else {
          map.set(empId, { count: 1, shifts: [shiftLabel] })
        }
      }

      if (ownerId) bump(ownerId)
      // Covered roster also counts for the covering employee
      if (d.status === 'covered' && coverId && coverId !== ownerId) bump(coverId)
    }

    // Fallback: if dates missing, use assignment periods so shifts still show
    for (const a of assignments) {
      if (map.has(a.employeeId)) continue
      const shiftLabel = a.shift?.name || '—'
      map.set(a.employeeId, { count: 0, shifts: [shiftLabel] })
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
          email: emp.email || '—',
          phone: emp.phone || emp.profile?.phone || '—',
          roles: roles.length > 0 ? roles.join(', ') : '—',
          status: emp.status || (emp.isActive ? 'ACTIVE' : 'INACTIVE'),
          rosterCount: info?.count ?? 0,
          shifts: info?.shifts.join(', ') || '—',
        }
      }),
    [employeeSource, rosterByEmployee],
  )

  const columns: ColumnDef<EmployeeRow>[] = [
    {
      accessorKey: 'name',
      header: 'Employee',
      cell: ({ row }) => (
        <button
          type="button"
          className="font-medium text-[#2a517c] hover:underline text-left"
          onClick={() => openEmployee(row.original.employeeId)}
        >
          {row.original.name}
        </button>
      ),
    },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'phone', header: 'Phone' },
    {
      accessorKey: 'roles',
      header: 'Role',
      cell: ({ row }) =>
        row.original.roles === '—' ? (
          '—'
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.original.roles.split(', ').map((role) => (
              <Badge key={role} variant="secondary" className="text-xs">
                {role}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'ACTIVE' ? 'default' : 'secondary'}
          className={row.original.status === 'ACTIVE' ? 'bg-[#2a517c]' : ''}
        >
          {row.original.status}
        </Badge>
      ),
    },
    { accessorKey: 'rosterCount', header: 'Rosters' },
    { accessorKey: 'shifts', header: 'Shifts' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button size="sm" variant="ghost" onClick={() => openEmployee(row.original.employeeId)}>
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      ),
    },
  ]

  const isLoading = usersLoading || assignmentsLoading || datesLoading

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {rows.length} employee{rows.length === 1 ? '' : 's'}
        </p>
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
