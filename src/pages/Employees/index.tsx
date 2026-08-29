import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Edit, MoreVertical, Plus, Shield, UserCheck } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useDepartmentsQuery } from '@/hooks/react-query/rbac'
import { useUsersQuery, useUpdateUserMutation } from '@/hooks/react-query/user'
import { useLocationStore } from '@/lib/stores/locationStore'
import type { UserItem } from '@/lib/types'
import { notifyError, notifySuccess } from '@/utils/toast'
import { AdminUserManagement } from '@/pages/GlobalSettings/components/AdminUserManagement'

import { useDebounce } from '@/hooks/useDebounce'

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
  initialView?: 'list' | 'create' | 'edit'
}

export default function EmployeeDirectoryPage({ initialView = 'list' }: EmployeeDirectoryPageProps) {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 400)
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('ALL')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL')

  const selectedLocationId = useLocationStore((state) => state.selectedLocationId)
  const selectedLocationName = useLocationStore((state) => state.selectedLocationName)

  const { data: users = [], isLoading } = useUsersQuery(debouncedSearch)
  const { data: departments = [] } = useDepartmentsQuery()
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

  const getAvailableManagers = (targetUser: UserItem) => {
    const targetLoc = targetUser.userLocations?.[0] as LocationRec | undefined
    const targetDeptId = targetLoc?.departmentId || targetLoc?.department_id || ''

    return users.filter((u) => {
      if (u.id === targetUser.id) return false

      const isSuperOrAdmin =
        u.username === 'superadmin' ||
        u.userLocations?.some((ul: LocationRec) =>
          ['ADMIN', 'SUPER_ADMIN'].includes((ul.role?.code || '').toUpperCase()),
        ) ||
        u.userRoles?.some((ur: RoleRec) => ['ADMIN', 'SUPER_ADMIN'].includes((ur.role?.code || '').toUpperCase()))

      if (isSuperOrAdmin) return true

      const hasManagerRole =
        u.userLocations?.some((ul: LocationRec) =>
          ['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes((ul.role?.code || '').toUpperCase()),
        ) ||
        u.userRoles?.some((ur: RoleRec) =>
          ['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes((ur.role?.code || '').toUpperCase()),
        )
      if (!hasManagerRole) return false

      if (targetDeptId) {
        const belongsToDept =
          u.userLocations?.some((ul: LocationRec) => (ul.departmentId || ul.department_id) === targetDeptId) ||
          u.userRoles?.some((ur: RoleRec) => (ur.departmentId || ur.department_id) === targetDeptId)
        if (!belongsToDept) return false
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

  const columns: ColumnDef<UserItem>[] = [
    {
      accessorKey: 'username',
      header: 'Employee',
      cell: ({ row }) => {
        const u = row.original
        const fName = u.profile?.firstName || u.profile?.first_name || ''
        const lName = u.profile?.lastName || u.profile?.last_name || ''
        const fullName = `${fName} ${lName}`.trim() || u.username || 'System User'
        const empCode = u.profile?.employeeCode || u.profile?.employee_code

        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#005390]/10 text-[#005390] flex items-center justify-center font-bold text-xs shrink-0">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-gray-900 dark:text-white text-sm">{fullName}</div>
              {empCode ? (
                <div className="text-[10px] text-gray-400">Code: {empCode}</div>
              ) : (
                <div className="text-[10px] text-gray-400">@{u.username}</div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      id: 'contact',
      header: 'Contact',
      cell: ({ row }) => {
        const u = row.original
        const email = u.email
        const phone = u.phone || u.profile?.phone
        return (
          <div>
            <div className="text-gray-800 dark:text-gray-200 font-semibold text-xs">{email || phone || 'N/A'}</div>
            {phone && email && <div className="text-[10px] text-gray-400">{phone}</div>}
          </div>
        )
      },
    },
    {
      id: 'departmentCategory',
      header: 'Dept & Category',
      cell: ({ row }) => {
        const u = row.original
        const primaryLoc = u.userLocations?.[0] as LocationRec | undefined
        const deptName = primaryLoc?.department?.name || primaryLoc?.departmentName
        const catName = primaryLoc?.jobCategory?.name || primaryLoc?.jobCategoryName

        if (!deptName && !catName) {
          return <span className="text-xs text-gray-400">N/A</span>
        }

        return (
          <div className="space-y-0.5">
            {deptName && <div className="text-xs font-bold text-gray-900 dark:text-white">{deptName}</div>}
            {catName && (
              <span className="inline-block text-[10px] font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700">
                {catName}
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: 'reportingManager',
      header: 'Reporting Manager',
      cell: ({ row }) => {
        const u = row.original
        const primaryLoc = u.userLocations?.[0] as LocationRec | undefined
        const mgr = primaryLoc?.manager

        if (!mgr) {
          return <span className="text-xs text-gray-400 font-medium">Unassigned</span>
        }

        const mgrProfile = mgr.profile || {}
        const fName = mgrProfile.firstName || mgrProfile.first_name || ''
        const lName = mgrProfile.lastName || mgrProfile.last_name || ''
        const mgrName = `${fName} ${lName}`.trim() || mgr.username || 'Manager'
        const mgrCode = mgrProfile.employeeCode || mgrProfile.employee_code

        const mgrLoc = mgr.userLocations?.[0]
        const mgrDept = mgrLoc?.department?.name || mgrLoc?.departmentName
        const mgrCat = mgrLoc?.jobCategory?.name || mgrLoc?.jobCategoryName

        return (
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-[#005390] dark:text-sky-400">{mgrName}</div>
            {mgrCode && <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">Code: {mgrCode}</div>}
            {(mgrDept || mgrCat) && (
              <div className="text-[10px] text-gray-400 italic">{[mgrDept, mgrCat].filter(Boolean).join(' • ')}</div>
            )}
          </div>
        )
      },
    },
    {
      id: 'dateOfJoining',
      header: 'Date of Joining',
      cell: ({ row }) => (
        <span className="text-gray-700 dark:text-gray-300 text-xs font-medium font-mono">
          {row.original.profile?.dateOfJoining || row.original.profile?.date_of_joining || 'N/A'}
        </span>
      ),
    },
    {
      id: 'employeeCode',
      header: 'Employee Code',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-[#005390] dark:text-[#38bdf8] bg-[#005390]/10 dark:bg-[#005390]/30 px-2 py-1 rounded-md">
          {row.original.profile?.employeeCode || row.original.profile?.employee_code || 'N/A'}
        </span>
      ),
    },
    {
      id: 'roles',
      header: 'Assigned Roles',
      cell: ({ row }) => {
        const user = row.original
        const roleSet = new Set<string>()

        const uRecord = user as unknown as Record<string, unknown>
        const uRoleObj = uRecord.role as { name?: string; code?: string } | undefined
        if (uRoleObj?.name) roleSet.add(uRoleObj.name)
        else if (uRoleObj?.code) roleSet.add(uRoleObj.code)

        user.userRoles?.forEach((ur: RoleRec) => {
          const rName = ur.role?.name || ur.role?.code || ur.name || ur.code
          if (rName && typeof rName === 'string' && rName.trim()) {
            roleSet.add(rName.trim())
          }
        })

        user.userLocations?.forEach((ul: LocationRec) => {
          const rName = ul.role?.name || ul.role?.code || ul.name || ul.code
          if (rName && typeof rName === 'string' && rName.trim()) {
            roleSet.add(rName.trim())
          }
        })

        const rolesList = Array.from(roleSet)

        return (
          <div className="flex flex-wrap gap-1.5">
            {rolesList.length > 0 ? (
              rolesList.map((r, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#005390]/10 text-[#005390] border border-[#005390]/20"
                >
                  <Shield className="w-3 h-3 shrink-0 text-[#005390]" />
                  {r}
                </span>
              ))
            ) : (
              <span className="text-gray-400 text-[10px]">Staff</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const u = row.original
        const isActive = u.isActive && u.status === 'ACTIVE'
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-400'
            }`}
          >
            <Check className="w-3 h-3" />
            {isActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const u = row.original
        return (
          <div className="text-right">
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
                  onClick={() => navigate(`/admin/employees/edit/${u.id}`)}
                  className="flex items-center gap-2 text-xs font-semibold cursor-pointer rounded-xl px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <Edit className="h-3.5 w-3.5 text-[#005390]" />
                  Edit Profile
                </DropdownMenuItem>

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
              </DropdownMenuContent>
            </DropdownMenu>
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
            Manage employee profiles, assigned properties, and module access permissions for{' '}
            {selectedLocationName || 'NCL'}.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => navigate('/admin/employees/create')}
        >
          Add Employee
        </Button>
      </div>

      {/* ── Main Data Table ─────────────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search employees by name, code, phone, or email..."
        filterActions={
          <div className="flex items-center gap-2">
            <select
              value={selectedDepartmentFilter}
              onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
              className="h-9 rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 dark:border-gray-800 dark:bg-slate-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005390]/20 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 dark:border-gray-800 dark:bg-slate-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005390]/20 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Statuses</option>
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
                </strong>{' '}
                at location <strong className="text-[#005390]">{selectedLocationName || 'Current Location'}</strong>.
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
