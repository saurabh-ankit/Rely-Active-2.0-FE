import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Check,
  Key,
  Lock,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Shield,
  ShieldCheck,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { propertyApi } from '@/api/property'
import { rbacApi, type DepartmentItem, type RoleItem, type UserItem } from '@/api/rbac'
import type { Property } from '@/pages/Property/types'
import { CommonButton } from '@/components/common/CommonButton'
import { CommonInput } from '@/components/common/CommonInput'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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

interface AdminUserManagementProps {
  initialMode?: 'list' | 'create' | 'edit' | 'permissions'
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ initialMode = 'list' }) => {
  const navigate = useNavigate()
  const { id: paramId, userId: paramUserId } = useParams<{ id?: string; userId?: string }>()

  const [users, setUsers] = useState<UserItem[]>([])
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [availableProperties, setAvailableProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Edit user ID
  const [editingUserId, setEditingUserId] = useState<string | null>(paramId || null)

  // Form fields
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [designation, setDesignation] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [gender, setGender] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [qualification, setQualification] = useState('')
  const [experience, setExperience] = useState('')
  const [address, setAddress] = useState('')

  const [selectedRoleCode, setSelectedRoleCode] = useState('EMPLOYEE')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set())

  const populateFormForUser = (u: UserItem) => {
    setEditingUserId(u.id)
    setUsername(u.username || '')
    setFirstName(u.profile?.firstName || u.profile?.first_name || '')
    setLastName(u.profile?.lastName || u.profile?.last_name || '')
    setEmail(u.email || '')
    setPhone(u.phone || u.profile?.phone || '')
    setPassword('')
    setDesignation(u.profile?.designation || '')
    setEmployeeCode(u.profile?.employeeCode || u.profile?.employee_code || '')
    setGender(u.profile?.gender || '')
    setDateOfBirth(u.profile?.dateOfBirth || u.profile?.date_of_birth || '')
    setEmergencyContact(u.profile?.emergencyContact || u.profile?.emergency_contact || '')
    setBloodGroup(u.profile?.bloodGroup || u.profile?.blood_group || '')
    setQualification(u.profile?.qualification || '')
    setExperience(u.profile?.experience || '')
    setAddress(u.profile?.address || '')
    setSelectedRoleCode(u.userRoles?.[0]?.role?.code || 'EMPLOYEE')
    setSelectedDepartmentId(u.userRoles?.[0]?.department_id || '')
    setSelectedPropertyIds(new Set(u.assignedProperties?.map((p) => p.id) || []))
  }

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

        // If in edit mode with paramId, populate form
        if ((initialMode === 'edit' || paramId) && paramId) {
          const target = uData.find((u) => u.id === paramId)
          if (target) {
            populateFormForUser(target)
          }
        }
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
  }, [initialMode, paramId])

  const resetForm = () => {
    setEditingUserId(null)
    setUsername('')
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setPassword('')
    setDesignation('')
    setEmployeeCode('')
    setGender('')
    setDateOfBirth('')
    setEmergencyContact('')
    setBloodGroup('')
    setQualification('')
    setExperience('')
    setAddress('')
    setSelectedRoleCode('EMPLOYEE')
    if (departments.length > 0) setSelectedDepartmentId(departments[0].id)
    setSelectedPropertyIds(new Set())
    setErrorMsg(null)
  }

  const togglePropertySelection = (pId: string) => {
    setSelectedPropertyIds((prev) => {
      const next = new Set(prev)
      if (next.has(pId)) next.delete(pId)
      else next.add(pId)
      return next
    })
  }

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || (!username && !email && !phone)) {
      setErrorMsg('First name and username (or email/phone) are required.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      const payload = {
        username: username.trim() || undefined,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        password: password || undefined,
        designation,
        employee_code: employeeCode,
        gender: gender || undefined,
        date_of_birth: dateOfBirth || undefined,
        emergency_contact: emergencyContact || undefined,
        blood_group: bloodGroup || undefined,
        qualification: qualification || undefined,
        experience: experience || undefined,
        address: address || undefined,
        roleCode: selectedRoleCode,
        departmentId: ['MANAGER', 'EMPLOYEE'].includes(selectedRoleCode.toUpperCase())
          ? selectedDepartmentId || undefined
          : undefined,
        propertyIds: Array.from(selectedPropertyIds),
      }

      const isEditMode = initialMode === 'edit' || !!editingUserId || !!paramId
      const targetId = editingUserId || paramId

      if (isEditMode && targetId) {
        await rbacApi.updateUser(targetId, payload)
        notifySuccess(`User ${firstName} updated successfully!`)
      } else {
        await rbacApi.createUser(payload)
        notifySuccess(`User ${firstName} created successfully!`)
      }

      resetForm()
      navigate('/global-settings/users')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save user.'
      setErrorMsg(message)
      notifyError('Failed to Save User', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // If mode is permissions, render Role & Module Permissions screen directly
  if (initialMode === 'permissions' || paramUserId) {
    return (
      <div className="space-y-6 pb-10">
        <button
          type="button"
          onClick={() => navigate('/global-settings/users')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to User Management
        </button>

        <RoleModuleManagement onClose={() => navigate('/global-settings/users')} />
      </div>
    )
  }

  // If mode is create or edit, render FULL PAGE form view directly
  if (initialMode === 'create' || initialMode === 'edit' || paramId) {
    const isDepartmentRole = ['MANAGER', 'EMPLOYEE'].includes(selectedRoleCode.toUpperCase())
    const isEditMode = initialMode === 'edit' || !!editingUserId || !!paramId

    return (
      <div className="space-y-6 pb-12">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => {
            resetForm()
            navigate('/global-settings/users')
          }}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to User Management
        </button>

        {/* Page Header */}
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#005390]/10 text-[#005390] shadow-xs">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                {isEditMode ? 'Edit User & Assign Properties' : 'Create User & Assign Properties'}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEditMode
                  ? 'Update staff member profile details, authorization role, operational department, and property locations.'
                  : 'Add a new staff member account, assign system authorization role, operational department, credentials, and property locations.'}
              </p>
            </div>
          </div>
        </div>

        {/* Full Page Form Container */}
        <form onSubmit={handleSaveUser} className="space-y-6">
          {errorMsg && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 font-bold flex items-center gap-2 shadow-xs">
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Personal Details */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <User className="w-5 h-5 text-[#005390]" />
              Personal & Employee Profile
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <CommonInput
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin.hyd@rely.com"
                icon={<Mail className="h-4 w-4 text-gray-400" />}
              />
              <CommonInput
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                icon={<Phone className="h-4 w-4 text-gray-400" />}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="gender-select" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Gender
                </label>
                <select
                  id="gender-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3.5 text-xs text-gray-900 focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20 font-medium shadow-2xs"
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <CommonInput
                label="Date of Birth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <CommonInput
                label="Emergency Contact"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="+91 98765 00000"
                icon={<Phone className="h-4 w-4 text-gray-400" />}
              />
              <div>
                <label htmlFor="bloodgroup-select" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Blood Group
                </label>
                <select
                  id="bloodgroup-select"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3.5 text-xs text-gray-900 focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20 font-medium shadow-2xs"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <CommonInput
                label="Qualification"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="e.g. B.Sc Nursing, MBBS, MBA"
              />
              <CommonInput
                label="Experience (Years)"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="e.g. 5"
              />
            </div>

            <div>
              <label htmlFor="user-address" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Residential Address
              </label>
              <textarea
                id="user-address"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter full residential address..."
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3.5 text-xs text-gray-900 focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20 font-medium shadow-2xs"
              />
            </div>
          </div>

          {/* Section 2: Role & Department Assignment */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <ShieldCheck className="w-5 h-5 text-[#005390]" />
              Role & Operational Department
            </h2>

            <div className={`grid grid-cols-1 ${isDepartmentRole ? 'md:grid-cols-2' : ''} gap-5`}>
              <div>
                <label htmlFor="role-select-page" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Assigned System Role <span className="text-red-500">*</span>
                </label>
                <select
                  id="role-select-page"
                  value={selectedRoleCode}
                  onChange={(e) => setSelectedRoleCode(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3.5 text-xs text-gray-900 focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20 font-medium shadow-2xs"
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
                  <label htmlFor="dept-select-page" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Assign Operational Department
                  </label>
                  <select
                    id="dept-select-page"
                    value={selectedDepartmentId}
                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3.5 text-xs text-gray-900 focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20 font-medium shadow-2xs"
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
          </div>

          {/* Section 3: User Account Credentials (positioned directly ABOVE Property Locations) */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Key className="w-5 h-5 text-[#005390]" />
              User Account Credentials
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <CommonInput
                label="Username (Login Handle)"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ravi_kumar"
                icon={<User className="h-4 w-4 text-gray-400" />}
              />
              <CommonInput
                label={isEditMode ? 'New Password (Optional)' : 'Login Password'}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  isEditMode
                    ? 'Leave blank to keep existing password'
                    : 'Set custom password (defaults to Password@123)'
                }
                icon={<Lock className="h-4 w-4 text-gray-400" />}
              />
            </div>
          </div>

          {/* Section 4: Property Location Scopes (user_locations mapping) */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Building2 className="w-5 h-5 text-[#005390]" />
                Assign Property Access Locations (`user_locations`)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Select the property locations this user is authorized to access and operate.
              </p>
            </div>

            {availableProperties.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 bg-gray-50/50 rounded-2xl">
                No properties created yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {availableProperties.map((p) => {
                  const isChecked = selectedPropertyIds.has(p.id)
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => togglePropertySelection(p.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                        isChecked
                          ? 'bg-[#005390]/10 border-[#005390] text-[#005390] shadow-sm'
                          : 'bg-white border-gray-200 text-gray-800 hover:border-[#005390]/30 hover:bg-[#005390]/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isChecked ? 'bg-[#005390] text-white' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold">{p.property_name}</h4>
                          <span className="text-[10px] text-gray-400 block">{p.city || 'Facility Property'}</span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-[#005390] text-white' : 'border border-gray-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Full Page Footer Bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200/80">
            <CommonButton
              variant="cancel"
              type="button"
              onClick={() => {
                resetForm()
                navigate('/global-settings/users')
              }}
            >
              Cancel
            </CommonButton>
            <CommonButton variant="primary" type="submit" isLoading={isSubmitting}>
              {isEditMode ? 'Update User & Save Properties' : 'Create User & Save Properties'}
            </CommonButton>
          </div>
        </form>
      </div>
    )
  }

  // Main User Management Directory View
  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#005390]" />
            Employee Directory
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage employee profiles, assigned properties, and module access permissions.
          </p>
        </div>
        <CommonButton
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            resetForm()
            navigate('/global-settings/create-user')
          }}
        >
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
                  const fName = u.profile?.firstName || u.profile?.first_name || ''
                  const lName = u.profile?.lastName || u.profile?.last_name || ''
                  const fullName = `${fName} ${lName}`.trim() || u.username || 'System User'
                  const empCode = u.profile?.employeeCode || u.profile?.employee_code
                  const isSa = u.userRoles?.some((ur) => ur.role?.code === 'SUPER_ADMIN')
                  const propNames = u.assignedProperties?.map((p) => p.property_name) || []

                  return (
                    <tr key={u.id} className="hover:bg-[#005390]/5 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#005390]/10 text-[#005390] flex items-center justify-center font-bold text-xs">
                            {fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{fullName}</div>
                            {empCode && <div className="text-[10px] text-gray-400">Code: {empCode}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="text-gray-800 font-semibold">
                          {u.email || u.phone || u.profile?.phone || 'N/A'}
                        </div>
                        {(u.phone || u.profile?.phone) && u.email && (
                          <div className="text-[10px] text-gray-400">{u.phone || u.profile?.phone}</div>
                        )}
                      </td>
                      <td className="py-4 px-5 text-gray-700">{u.profile?.designation || 'Staff'}</td>
                      <td className="py-4 px-5">
                        <div className="flex flex-wrap gap-1.5">
                          {roleBadges.length > 0 ? (
                            roleBadges.map((r, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#005390]/10 text-[#005390] border border-[#005390]/20"
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
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-[#005390] hover:bg-[#005390]/10 hover:text-[#005390] transition-colors cursor-pointer shadow-2xs"
                            title="Actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 rounded-2xl p-1.5 shadow-xl border border-gray-100 bg-white"
                          >
                            <DropdownMenuItem
                              onClick={() => navigate(`/global-settings/edit-user/${u.id}`)}
                              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-[#005390]/10 hover:text-[#005390] rounded-xl cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5 text-[#005390]" />
                              Edit User Details
                            </DropdownMenuItem>
                            {!isSa && (
                              <DropdownMenuItem
                                onClick={() => navigate(`/global-settings/permissions/${u.id}`)}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-[#005390]/10 hover:text-[#005390] rounded-xl cursor-pointer"
                              >
                                <ShieldCheck className="h-3.5 w-3.5 text-[#005390]" />
                                Manage Permissions
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
