import React, { useEffect, useState } from 'react'
import { ArrowLeft, Building2, Check, Plus, Shield, ShieldCheck, UserCheck } from 'lucide-react'
import { propertyApi } from '@/api/property'
import { rbacApi, type DepartmentItem, type RoleItem, type UserItem } from '@/api/rbac'
import type { Property } from '@/pages/Property/types'
import { CommonButton } from '@/components/common/CommonButton'
import { CommonInput } from '@/components/common/CommonInput'
import { CommonModal } from '@/components/common/CommonModal'
import { notifyError, notifySuccess } from '@/utils/toast'
import { RoleModuleManagement } from './RoleModuleManagement'

const ROLE_HIERARCHY_ORDER: Record<string, number> = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  MANAGER: 3,
  DOCTOR: 4,
  NURSE: 5,
  EMPLOYEE: 6,
  CARETAKER: 7,
  VENDOR: 8,
  RESIDENT: 9,
}

const sortRolesByHierarchy = (roleList: RoleItem[]) => {
  return [...roleList].sort((a, b) => {
    const rankA = ROLE_HIERARCHY_ORDER[a.code] ?? 99
    const rankB = ROLE_HIERARCHY_ORDER[b.code] ?? 99
    if (rankA !== rankB) return rankA - rankB
    return a.name.localeCompare(b.name)
  })
}

export const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([])
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [availableProperties, setAvailableProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Full page view state for managing permissions
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<UserItem | null>(null)

  // Form fields
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [designation, setDesignation] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [selectedRoleCode, setSelectedRoleCode] = useState('EMPLOYEE')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      try {
        const [uData, rData, dData, pData] = await Promise.all([
          rbacApi.getUsers(),
          rbacApi.getRoles(),
          rbacApi.getDepartments(),
          propertyApi.getAll(),
        ])
        if (!isMounted) return
        setUsers(uData)
        setRoles(sortRolesByHierarchy(rData))
        setDepartments(dData)
        setAvailableProperties(pData)
        if (dData.length > 0) setSelectedDepartmentId(dData[0].id)
      } catch (err: unknown) {
        console.warn('Error fetching master data:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [])

  const togglePropertySelection = (pId: string) => {
    setSelectedPropertyIds((prev) => {
      const next = new Set(prev)
      if (next.has(pId)) next.delete(pId)
      else next.add(pId)
      return next
    })
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || (!username && !email && !phone)) {
      setErrorMsg('First name and username (or email/phone) are required.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      await rbacApi.createUser({
        username: username.trim() || undefined,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        password: password || undefined,
        designation,
        employee_code: employeeCode,
        roleCode: selectedRoleCode,
        departmentId: ['MANAGER', 'EMPLOYEE'].includes(selectedRoleCode.toUpperCase())
          ? selectedDepartmentId || undefined
          : undefined,
        propertyIds: Array.from(selectedPropertyIds),
      })

      notifySuccess(`User ${firstName} created successfully!`)
      setShowCreateModal(false)
      // Reset form
      setUsername('')
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      setPassword('')
      setDesignation('')
      setEmployeeCode('')
      setSelectedPropertyIds(new Set())

      const [uData, rData, dData, pData] = await Promise.all([
        rbacApi.getUsers(),
        rbacApi.getRoles(),
        rbacApi.getDepartments(),
        propertyApi.getAll(),
      ])
      setUsers(uData)
      setRoles(sortRolesByHierarchy(rData))
      setDepartments(dData)
      setAvailableProperties(pData)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create user.'
      setErrorMsg(message)
      notifyError('Failed to Create User', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // If user selected an employee to manage permissions, render full PAGE view
  if (selectedUserForPermissions) {
    return (
      <div className="space-y-6 pb-10">
        <button
          type="button"
          onClick={() => setSelectedUserForPermissions(null)}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to User Management
        </button>

        <RoleModuleManagement
          initialUser={selectedUserForPermissions}
          onClose={() => setSelectedUserForPermissions(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            User Management
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage platform users, staff profiles, assigned properties, and module access permissions.
          </p>
        </div>
        <CommonButton variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateModal(true)}>
          Create User / Staff
        </CommonButton>
      </div>

      {/* Users Directory Table */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-lg overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading users directory...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">
            No users found. Click &quot;Create User / Staff&quot; to add your first user.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">User / Staff</th>
                  <th className="py-3.5 px-5">Contact</th>
                  <th className="py-3.5 px-5">Designation</th>
                  <th className="py-3.5 px-5">Assigned Roles</th>
                  <th className="py-3.5 px-5">Assigned Properties</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/70 font-medium">
                {users.map((u) => {
                  const roleBadges = u.userRoles?.map((ur) => ur.role?.name || ur.role?.code) || []
                  const fullName =
                    `${u.profile?.first_name || ''} ${u.profile?.last_name || ''}`.trim() || 'System User'
                  const isSa = u.userRoles?.some((ur) => ur.role?.code === 'SUPER_ADMIN')
                  const propNames = u.assignedProperties?.map((p) => p.property_name) || []

                  return (
                    <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                            {fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{fullName}</div>
                            {u.username && <div className="text-[11px] text-blue-600 font-semibold">@{u.username}</div>}
                            {u.profile?.employee_code && (
                              <div className="text-[10px] text-gray-400">Code: {u.profile.employee_code}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="text-gray-800 font-semibold">{u.email || u.phone || 'N/A'}</div>
                        {u.phone && u.email && <div className="text-[10px] text-gray-400">{u.phone}</div>}
                      </td>
                      <td className="py-4 px-5 text-gray-700">{u.profile?.designation || 'Staff'}</td>
                      <td className="py-4 px-5">
                        <div className="flex flex-wrap gap-1.5">
                          {roleBadges.length > 0 ? (
                            roleBadges.map((r, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                              >
                                <Shield className="w-3 h-3" />
                                {r}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-[10px]">No role</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-wrap gap-1">
                          {isSa ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Building2 className="w-3 h-3" />
                              All Properties (Super Admin)
                            </span>
                          ) : propNames.length > 0 ? (
                            propNames.map((pName, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                              >
                                <Building2 className="w-3 h-3" />
                                {pName}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-[10px]">All / Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3" />
                          {u.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        {!isSa ? (
                          <button
                            type="button"
                            onClick={() => setSelectedUserForPermissions(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-all cursor-pointer border border-blue-200/80 shadow-2xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Manage Permissions
                          </button>
                        ) : (
                          <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                            Full System Access
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <CommonModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create User & Assign Properties"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-600 font-medium">
              {errorMsg}
            </div>
          )}

          <CommonInput
            label="Username (Login Handle)"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. ravi_kumar"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CommonInput
              label="First Name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Ravi"
            />
            <CommonInput
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Kumar"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CommonInput
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin.hyd@rely.com"
            />
            <CommonInput
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>

          <CommonInput
            label="Login Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Set custom login password (defaults to Password@123)"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CommonInput
              label="Designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Property Admin / Head Nurse"
            />
            <CommonInput
              label="Employee Code"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="EMP-202"
            />
          </div>

          {/* Role & Department Dropdowns */}
          {(() => {
            const isDepartmentRole = ['MANAGER', 'EMPLOYEE'].includes(selectedRoleCode.toUpperCase())
            return (
              <div className={`grid grid-cols-1 ${isDepartmentRole ? 'sm:grid-cols-2' : ''} gap-4`}>
                <div>
                  <label htmlFor="role-select" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Assigned System Role
                  </label>
                  <select
                    id="role-select"
                    value={selectedRoleCode}
                    onChange={(e) => setSelectedRoleCode(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
                  >
                    {roles
                      .filter((r) => r.code !== 'SUPER_ADMIN')
                      .map((r) => (
                        <option key={r.id} value={r.code}>
                          {r.name} ({r.code})
                        </option>
                      ))}
                  </select>
                </div>

                {isDepartmentRole && (
                  <div>
                    <label htmlFor="dept-select" className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Assign Operational Department
                    </label>
                    <select
                      id="dept-select"
                      value={selectedDepartmentId}
                      onChange={(e) => setSelectedDepartmentId(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Tick Properties Checkboxes (user_locations mapping) */}
          <div className="space-y-2 border-t border-gray-100 pt-3">
            <div className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              Tick Property Access (`user_locations`):
            </div>
            {availableProperties.length === 0 ? (
              <p className="text-xs text-gray-400">No properties created yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-40 overflow-y-auto p-3 rounded-2xl bg-gray-50/80 border border-gray-200/80">
                {availableProperties.map((p) => {
                  const isChecked = selectedPropertyIds.has(p.id)
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer hover:text-gray-900 font-medium"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePropertySelection(p.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{p.property_name}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <CommonButton variant="cancel" type="button" onClick={() => setShowCreateModal(false)}>
              Cancel
            </CommonButton>
            <CommonButton variant="primary" type="submit" isLoading={isSubmitting}>
              Create User & Save Properties
            </CommonButton>
          </div>
        </form>
      </CommonModal>
    </div>
  )
}
