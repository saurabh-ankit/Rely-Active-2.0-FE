import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit, Eye, MoreVertical, Plus, UserCheck } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useDepartmentsQuery, useRolesQuery } from '@/hooks/react-query/rbac'
import { useUsersQuery, useUpdateUserMutation } from '@/hooks/react-query/user'
import { useLocationStore } from '@/lib/stores/locationStore'
import type { UserItem } from '@/lib/types'
import { notifyError, notifySuccess } from '@/utils/toast'
import { AdminUserManagement } from '@/pages/GlobalSettings/components/AdminUserManagement'
import { EmployeeDetailsScreen } from '@/pages/Employees/components/EmployeeDetailsScreen'
import { useLocationContext } from '@/hooks/useLocation'

import { useDebounce } from '@/hooks/useDebounce'
import {
  DepartmentCell,
  EmployeeContact,
  EmployeeIdentity,
  EmployeeStatus,
  JoinedDate,
  RoleBadges,
} from '@/components/employees/EmployeeCells'

interface LocationRec {
  locId?: string
  loc_id?: string
  locationId?: string
  departmentId?: string
  department_id?: string
  departmentName?: string
  department?: { name?: string }
  jobCategoryName?: string
  jobCategory?: { name?: string }
  managerId?: string
  manager_id?: string
  manager?: {
    id?: string
    username?: string
    profile?: {
      firstName?: string
      first_name?: string
      lastName?: string
      last_name?: string
      employeeCode?: string
      employee_code?: string
    }
    userLocations?: LocationRec[]
  }
  role?: { code?: string; name?: string }
  name?: string
  code?: string
}

interface RoleRec {
  role?: { code?: string; name?: string }
  departmentId?: string
  department_id?: string
  name?: string
  code?: string
}

interface EmployeeDirectoryPageProps {
  initialView?: 'list' | 'create' | 'edit' | 'view'
}

export default function EmployeeDirectoryPage({ initialView = 'list' }: EmployeeDirectoryPageProps) {
  const navigate = useNavigate()
  const { hasResourcePermission } = useLocationContext()
  const canCreateEmployee = hasResourcePermission('EMPLOYEE', 'create')
  const canUpdateEmployee = hasResourcePermission('EMPLOYEE', 'update')

  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 400)
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('ALL')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL')

  const selectedLocationId = useLocationStore((state) => state.selectedLocationId)

  const { data: users = [], isLoading } = useUsersQuery(debouncedSearch)
  const { data: departments = [] } = useDepartmentsQuery()
  const { data: roles = [] } = useRolesQuery()
  const updateUserMutation = useUpdateUserMutation()

  const [selectedUserForManager, setSelectedUserForManager] = useState<UserItem | null>(null)
  const [selectedManagerId, setSelectedManagerId] = useState<string>('')
  const [isSavingManager, setIsSavingManager] = useState(false)

  if (initialView === 'create') {
    return <AdminUserManagement initialMode="create" isLocationScoped={true} />
  }

  if (initialView === 'edit') {
    return <AdminUserManagement initialMode="edit" isLocationScoped={true} />
  }

  if (initialView === 'view') {
    return <EmployeeDetailsScreen isGlobalMode={false} />
  }

  const getAvailableManagers = (targetUser: UserItem) => {
    const targetLoc = targetUser.userLocations?.[0] as LocationRec | undefined
    const targetRole = targetUser.userRoles?.[0] as RoleRec | undefined
    const targetDeptId =
      targetLoc?.departmentId || targetLoc?.department_id || targetRole?.departmentId || targetRole?.department_id || ''

    return users.filter((u) => {
      if (u.id === targetUser.id) return false

      // 1. Candidate must have the Department Manager role (MANAGER)
      const roleCodes: string[] = []
      const roleNames: string[] = []

      const uRecord = u as unknown as Record<string, unknown>
      const uRoleObj = uRecord.role as { name?: string; code?: string } | undefined
      if (uRoleObj?.code) roleCodes.push(uRoleObj.code.toUpperCase())
      if (uRoleObj?.name) roleNames.push(uRoleObj.name.toUpperCase())

      u.userRoles?.forEach((ur: RoleRec) => {
        const code = ur.role?.code || ur.code
        const name = ur.role?.name || ur.name
        if (code) roleCodes.push(code.toUpperCase())
        if (name) roleNames.push(name.toUpperCase())
      })

      u.userLocations?.forEach((ul: LocationRec) => {
        const code = ul.role?.code || ul.code
        const name = ul.role?.name || ul.name
        if (code) roleCodes.push(code.toUpperCase())
        if (name) roleNames.push(name.toUpperCase())
      })

      const isDepartmentManager =
        roleCodes.includes('MANAGER') || roleNames.some((n) => n.includes('DEPARTMENT MANAGER') || n === 'MANAGER')

      if (!isDepartmentManager) return false

      // 2. Candidate manager must belong to the same department as the target user
      if (targetDeptId) {
        const belongsToSameDept =
          u.userLocations?.some((ul: LocationRec) => (ul.departmentId || ul.department_id) === targetDeptId) ||
          u.userRoles?.some((ur: RoleRec) => (ur.departmentId || ur.department_id) === targetDeptId) ||
          false

        if (!belongsToSameDept) return false
      }

      return true
    })
  }

  const handleSaveReportingManager = async () => {
    if (!selectedUserForManager) return
    try {
      setIsSavingManager(true)
      const primaryLoc = selectedUserForManager.userLocations?.[0] as LocationRec | undefined
      const locIdToUse = primaryLoc?.locId || primaryLoc?.loc_id || primaryLoc?.locationId || selectedLocationId || ''

      const payload: Record<string, unknown> = {
        propertyId: locIdToUse,
        managerId: selectedManagerId || null,
      }

      await updateUserMutation.mutateAsync({
        id: selectedUserForManager.id,
        payload,
      })

      notifySuccess('Reporting Manager updated successfully!')
      setSelectedUserForManager(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred'
      notifyError('Failed to update Reporting Manager', msg)
    } finally {
      setIsSavingManager(false)
    }
  }

  // Filter out SUPER_ADMIN and apply search & department filters
  const filteredUsers = users.filter((u) => {
    const primaryLoc = u.userLocations?.[0] as LocationRec | undefined
    const roleCode = (primaryLoc?.role?.code || '').toUpperCase()

    // 1. Exclude Super Admin from everywhere in tables
    if (u.username === 'superadmin' || roleCode === 'SUPER_ADMIN') {
      return false
    }

    // 2. Department match
    const deptId = primaryLoc?.departmentId || primaryLoc?.department_id || ''
    if (selectedDepartmentFilter !== 'ALL' && deptId !== selectedDepartmentFilter) {
      return false
    }

    if (selectedRoleFilter !== 'ALL') {
      const targetRole = selectedRoleFilter.toUpperCase()
      const roleCodes: string[] = []
      const roleNames: string[] = []
      const uRecord = u as unknown as Record<string, unknown>
      const uRoleObj = uRecord.role as { name?: string; code?: string } | undefined
      if (uRoleObj?.code) roleCodes.push(uRoleObj.code.toUpperCase())
      if (uRoleObj?.name) roleNames.push(uRoleObj.name.toUpperCase())
      u.userRoles?.forEach((ur: RoleRec) => {
        const code = ur.role?.code || ur.code
        const name = ur.role?.name || ur.name
        if (code) roleCodes.push(code.toUpperCase())
        if (name) roleNames.push(name.toUpperCase())
      })
      u.userLocations?.forEach((ul: LocationRec) => {
        const code = ul.role?.code || ul.code
        const name = ul.role?.name || ul.name
        if (code) roleCodes.push(code.toUpperCase())
        if (name) roleNames.push(name.toUpperCase())
      })

      if (!roleCodes.includes(targetRole) && !roleNames.includes(targetRole)) return false
    }

    // 3. Status match
    if (selectedStatusFilter === 'ACTIVE' && (!u.isActive || u.status !== 'ACTIVE')) return false
    if (selectedStatusFilter === 'INACTIVE' && u.isActive && u.status === 'ACTIVE') return false

    // 4. Search term match
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()

    const firstName = u.profile?.firstName || u.profile?.first_name || ''
    const lastName = u.profile?.lastName || u.profile?.last_name || ''
    const fullName = `${firstName} ${lastName}`.toLowerCase()
    const username = (u.username || '').toLowerCase()
    const email = (u.email || '').toLowerCase()
    const phone = (u.phone || u.profile?.phone || '').toLowerCase()
    const empCode = (u.profile?.employeeCode || u.profile?.employee_code || '').toLowerCase()
    const dateOfJoining = (u.profile?.dateOfJoining || u.profile?.date_of_joining || '').toLowerCase()

    return (
      fullName.includes(term) ||
      username.includes(term) ||
      email.includes(term) ||
      phone.includes(term) ||
      empCode.includes(term) ||
      dateOfJoining.includes(term)
    )
  })

  const isOperationalStaff = (u: UserItem) => {
    const roleCodes: string[] = []
    const roleNames: string[] = []

    const uRecord = u as unknown as Record<string, unknown>
    const uRoleObj = uRecord.role as { name?: string; code?: string } | undefined
    if (uRoleObj?.code) roleCodes.push(uRoleObj.code.toUpperCase())
    if (uRoleObj?.name) roleNames.push(uRoleObj.name.toUpperCase())

    u.userRoles?.forEach((ur: RoleRec) => {
      const code = ur.role?.code || ur.code
      const name = ur.role?.name || ur.name
      if (code) roleCodes.push(code.toUpperCase())
      if (name) roleNames.push(name.toUpperCase())
    })

    u.userLocations?.forEach((ul: LocationRec) => {
      const code = ul.role?.code || ul.code
      const name = ul.role?.name || ul.name
      if (code) roleCodes.push(code.toUpperCase())
      if (name) roleNames.push(name.toUpperCase())
    })

    const isManagementRole =
      roleCodes.some((c) => ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(c)) ||
      roleNames.some((n) =>
        ['PROPERTY ADMIN', 'SUPER ADMIN', 'DEPARTMENT MANAGER', 'ADMINISTRATOR', 'MANAGER'].includes(n),
      )

    if (isManagementRole) return false

    return (
      roleCodes.includes('EMPLOYEE') ||
      roleNames.some((n) => n.includes('OPERATIONAL STAFF') || n.includes('EMPLOYEE') || n.includes('STAFF')) ||
      roleCodes.length === 0
    )
  }

  const columns: ColumnDef<UserItem>[] = [
    {
      accessorKey: 'username',
      header: 'Employee',
      cell: ({ row }) => <EmployeeIdentity user={row.original} />,
    },
    {
      id: 'contact',
      header: 'Contact',
      cell: ({ row }) => <EmployeeContact user={row.original} />,
    },
    {
      id: 'departmentCategory',
      header: 'Department',
      cell: ({ row }) => {
        const primaryLoc = row.original.userLocations?.[0] as LocationRec | undefined
        const deptName = primaryLoc?.department?.name || primaryLoc?.departmentName
        const catName = primaryLoc?.jobCategory?.name || primaryLoc?.jobCategoryName
        return <DepartmentCell pairs={deptName || catName ? [{ deptName, catName }] : []} />
      },
    },
    {
      id: 'roles',
      header: 'Role',
      cell: ({ row }) => <RoleBadges user={row.original} />,
    },
    {
      id: 'reportingManager',
      header: 'Reports To',
      cell: ({ row }) => {
        const mgr = (row.original.userLocations?.[0] as LocationRec | undefined)?.manager
        if (!mgr) {
          return <span className="text-xs italic text-gray-400">Not assigned</span>
        }
        const mgrProfile = mgr.profile || {}
        const mgrName =
          `${mgrProfile.firstName || mgrProfile.first_name || ''} ${mgrProfile.lastName || mgrProfile.last_name || ''}`.trim() ||
          mgr.username ||
          'Manager'
        const mgrCode = mgrProfile.employeeCode || mgrProfile.employee_code
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-800">
              {mgrName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">{mgrName}</p>
              {mgrCode && <p className="font-mono text-[10px] text-gray-400">{mgrCode}</p>}
            </div>
          </div>
        )
      },
    },
    {
      id: 'dateOfJoining',
      header: 'Joined',
      cell: ({ row }) => <JoinedDate user={row.original} />,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <EmployeeStatus user={row.original} />,
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const u = row.original
        return (
          <div className="text-right">
            {canUpdateEmployee ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-[#005390] hover:bg-[#005390]/10 hover:text-[#005390] transition-colors cursor-pointer shadow-2xs dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                  title="Actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl p-1.5 shadow-xl border border-gray-100 bg-white dark:bg-slate-900 dark:border-gray-800"
                >
                  <DropdownMenuItem
                    onClick={() => navigate(`/admin/employees/details/${u.id}`)}
                    className="flex items-center gap-2 text-xs font-semibold cursor-pointer rounded-xl px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <Eye className="h-3.5 w-3.5 text-[#005390]" />
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate(`/admin/employees/edit/${u.id}`)}
                    className="flex items-center gap-2 text-xs font-semibold cursor-pointer rounded-xl px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <Edit className="h-3.5 w-3.5 text-[#005390]" />
                    Edit Profile
                  </DropdownMenuItem>

                  {isOperationalStaff(u) && (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedUserForManager(u)
                        const primaryLoc = u.userLocations?.[0] as LocationRec | undefined
                        const currentMgrId =
                          primaryLoc?.managerId || primaryLoc?.manager_id || primaryLoc?.manager?.id || ''
                        setSelectedManagerId(currentMgrId)
                      }}
                      className="flex items-center gap-2 text-xs font-semibold cursor-pointer rounded-xl px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-[#005390]" />
                      Assign Reporting Manager
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-[#005390] hover:bg-[#005390]/10 hover:text-[#005390] transition-colors cursor-pointer shadow-2xs dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                  title="Actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl p-1.5 shadow-xl border border-gray-100 bg-white dark:bg-slate-900 dark:border-gray-800"
                >
                  <DropdownMenuItem
                    onClick={() => navigate(`/admin/employees/details/${u.id}`)}
                    className="flex items-center gap-2 text-xs font-semibold cursor-pointer rounded-xl px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <Eye className="h-3.5 w-3.5 text-[#005390]" />
                    View Profile
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 dark:text-white">
            <UserCheck className="w-5 h-5 text-[#005390]" />
            Employee Directory
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage employee profiles, assigned properties, and module access permissions.
          </p>
        </div>
        {canCreateEmployee && (
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/admin/employees/create')}
          >
            Add Employee
          </Button>
        )}
      </div>

      {/* ── Main Data Table ─────────────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search employees by name, code, phone, or email..."
        onRowClick={(u) => navigate(`/admin/employees/details/${u.id}`)}
        filterActions={
          <div className="flex items-center gap-2">
            <select
              value={selectedDepartmentFilter}
              onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
              className="h-9 rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005390]/20 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>

            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="h-9 rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005390]/20 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.code || role.name}>
                  {role.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005390]/20 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        }
      />

      {/* ── Assign Reporting Manager Modal ────────────────────────────────────── */}
      {selectedUserForManager && (
        <Dialog open={!!selectedUserForManager} onOpenChange={(open) => !open && setSelectedUserForManager(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#005390]" />
                Assign Reporting Manager
              </DialogTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Assign a department manager for{' '}
                <strong className="text-gray-800 dark:text-gray-200">
                  {selectedUserForManager.profile?.firstName} {selectedUserForManager.profile?.lastName || ''}
                </strong>
                .
              </p>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Employee Summary Card */}
              <div className="p-3 bg-[#005390]/5 dark:bg-slate-800 rounded-xl border border-[#005390]/10 dark:border-gray-700 flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Employee Code:</span>
                  <span className="font-mono font-bold text-[#005390]">
                    {selectedUserForManager.profile?.employeeCode || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Department & Category:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {[
                      (selectedUserForManager.userLocations?.[0] as LocationRec | undefined)?.department?.name,
                      (selectedUserForManager.userLocations?.[0] as LocationRec | undefined)?.jobCategory?.name,
                    ]
                      .filter(Boolean)
                      .join(' • ') || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Manager Dropdown */}
              <div>
                <label
                  htmlFor="reporting-manager-select"
                  className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Select Reporting Manager
                </label>
                <select
                  id="reporting-manager-select"
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 py-2.5 px-3 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20 font-medium shadow-2xs"
                >
                  <option value="">Unassigned (No Manager)</option>
                  {getAvailableManagers(selectedUserForManager).map((m) => {
                    const fName = m.profile?.firstName || m.profile?.first_name || ''
                    const lName = m.profile?.lastName || m.profile?.last_name || ''
                    const fullName = `${fName} ${lName}`.trim() || m.username || 'System User'
                    const empCodeStr =
                      m.profile?.employeeCode || m.profile?.employee_code
                        ? ` (Code: ${m.profile?.employeeCode || m.profile?.employee_code})`
                        : ''
                    return (
                      <option key={m.id} value={m.id}>
                        {fullName}
                        {empCodeStr}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button
                variant="cancel"
                type="button"
                onClick={() => setSelectedUserForManager(null)}
                disabled={isSavingManager}
              >
                Cancel
              </Button>
              <Button variant="primary" type="button" isLoading={isSavingManager} onClick={handleSaveReportingManager}>
                Save Reporting Manager
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
