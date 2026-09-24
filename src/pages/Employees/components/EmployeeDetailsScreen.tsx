import React, { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  HeartPulse,
  Mail,
  Phone,
  RefreshCw,
  Shield,
  UserCheck,
  Users,
  CalendarDays,
} from 'lucide-react'
import { useUserByIdQuery } from '@/hooks/react-query/user'
import { useListEmployeeShifts } from '@/hooks/react-query/roster'
import { useLocationContext } from '@/hooks/useLocation'
import { Button } from '@/components/ui/button'
import { getFileUrl } from '@/lib/utils'
import type { UserItem } from '@/lib/types'
import type { EmployeeShiftAssignment } from '@/lib/types/roster'

interface LocationRec {
  locId?: string
  loc_id?: string
  locationId?: string
  departmentId?: string
  department_id?: string
  departmentName?: string
  department?: { name?: string; code?: string }
  jobCategoryName?: string
  jobCategory?: { name?: string; code?: string }
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
  }
  role?: { code?: string; name?: string }
  name?: string
  code?: string
  property?: { id?: string; property_name?: string; name?: string }
}

interface RoleRec {
  role?: { code?: string; name?: string }
  name?: string
  code?: string
}

export interface EmployeeDetailsScreenProps {
  isGlobalMode?: boolean
}

function collectRoles(user: UserItem): string[] {
  const roleSet = new Set<string>()
  const uRecord = user as unknown as Record<string, unknown>
  const uRoleObj = uRecord.role as { name?: string; code?: string } | undefined
  if (uRoleObj?.name) roleSet.add(uRoleObj.name)
  else if (uRoleObj?.code) roleSet.add(uRoleObj.code)

  user.userRoles?.forEach((ur: RoleRec) => {
    const rName = ur.role?.name || ur.role?.code || ur.name || ur.code
    if (rName && typeof rName === 'string' && rName.trim()) roleSet.add(rName.trim())
  })

  user.userLocations?.forEach((ul: LocationRec) => {
    const rName = ul.role?.name || ul.role?.code || ul.name || ul.code
    if (rName && typeof rName === 'string' && rName.trim()) roleSet.add(rName.trim())
  })

  return Array.from(roleSet)
}

function formatDate(value?: string | null): string {
  if (!value) return 'N/A'
  return value.includes('T') ? value.split('T')[0]! : value
}

export const EmployeeDetailsScreen: React.FC<EmployeeDetailsScreenProps> = ({ isGlobalMode = false }) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { hasResourcePermission } = useLocationContext()
  const canUpdateEmployee = hasResourcePermission('EMPLOYEE', 'update')

  const { data: user, isLoading, error: queryError } = useUserByIdQuery(id)
  const { data: shiftsRes, isLoading: shiftsLoading } = useListEmployeeShifts(id, !!id)

  const isGlobal = isGlobalMode || window.location.pathname.includes('/global-settings')
  const backUrl = isGlobal ? '/global-settings/users' : '/admin/employees'
  const editUrl = isGlobal ? `/global-settings/edit-user/${id}` : `/admin/employees/edit/${id}`

  const rolesList = useMemo(() => (user ? collectRoles(user) : []), [user])

  const shiftAssignments: EmployeeShiftAssignment[] = useMemo(() => {
    const rows = shiftsRes?.data
    return Array.isArray(rows) ? rows.filter((a) => !a.isDeleted) : []
  }, [shiftsRes])

  if (isLoading) {
    return (
      <div className="w-full space-y-6 pb-12">
        <button
          type="button"
          onClick={() => navigate(backUrl)}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />{' '}
          {isGlobal ? 'Back to Global Employee Directory' : 'Back to Employee Directory'}
        </button>
        <div className="rounded-3xl border border-white/60 bg-white/80 p-12 text-center text-sm text-gray-400 shadow-xl backdrop-blur-xl">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#005390]" />
          Loading employee profile details...
        </div>
      </div>
    )
  }

  const errorMsg =
    queryError instanceof Error ? queryError.message : queryError ? 'Failed to load employee profile' : null

  if (errorMsg || !user) {
    return (
      <div className="w-full space-y-6 pb-12">
        <button
          type="button"
          onClick={() => navigate(backUrl)}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />{' '}
          {isGlobal ? 'Back to Global Employee Directory' : 'Back to Employee Directory'}
        </button>
        <div className="rounded-3xl bg-rose-50 border border-rose-200 p-8 text-center text-xs text-rose-700 font-bold shadow-xs">
          {errorMsg || 'Employee profile not found.'}
        </div>
      </div>
    )
  }

  const profile = user.profile
  const fName = profile?.firstName || profile?.first_name || ''
  const lName = profile?.lastName || profile?.last_name || ''
  const fullName = `${fName} ${lName}`.trim() || user.username || 'System User'
  const empCode = profile?.employeeCode || profile?.employee_code
  const photoUrl = profile?.photoUrl || profile?.photo_url
  const phone = user.phone || profile?.phone
  const isActive = user.isActive && user.status === 'ACTIVE'
  const primaryLoc = user.userLocations?.[0] as LocationRec | undefined
  const deptName = primaryLoc?.department?.name || primaryLoc?.departmentName
  const catName = primaryLoc?.jobCategory?.name || primaryLoc?.jobCategoryName
  const mgr = primaryLoc?.manager
  const mgrProfile = mgr?.profile || {}
  const mgrName = mgr
    ? `${mgrProfile.firstName || mgrProfile.first_name || ''} ${mgrProfile.lastName || mgrProfile.last_name || ''}`.trim() ||
      mgr.username ||
      'Manager'
    : null
  const mgrCode = mgrProfile.employeeCode || mgrProfile.employee_code
  const lastLogin = user.lastLogin || user.last_login
  const assignedProperties =
    user.assignedProperties ||
    user.userLocations
      ?.map((ul) => {
        const loc = ul as LocationRec
        const prop = loc.property
        if (!prop) return null
        return { id: prop.id || loc.locId || '', property_name: prop.property_name || prop.name || 'Property' }
      })
      .filter((p): p is { id: string; property_name: string } => !!p && !!p.id) ||
    []

  return (
    <div className="w-full space-y-6 pb-16">
      <button
        type="button"
        onClick={() => navigate(backUrl)}
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />{' '}
        {isGlobal ? 'Back to Global Employee Directory' : 'Back to Employee Directory'}
      </button>

      {/* Hero */}
      <div className="rounded-3xl border border-white/70 bg-white/90 p-6 md:p-8 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#005390] to-sky-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0 border-2 border-white overflow-hidden">
            {photoUrl ? (
              <img src={getFileUrl(photoUrl)} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              fullName.charAt(0).toUpperCase()
            )}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">{fullName}</h1>
              {empCode && (
                <span className="text-xs font-mono font-bold text-[#005390] bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                  {empCode}
                </span>
              )}
              {user.username && (
                <span className="text-xs font-mono font-semibold text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                  @{user.username}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              {rolesList.length > 0 ? (
                rolesList.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#005390]/10 text-[#005390] border border-[#005390]/20"
                  >
                    <Shield className="w-3 h-3" />
                    {r}
                  </span>
                ))
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                  Staff
                </span>
              )}

              {isActive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>

        {canUpdateEmployee && (
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Button
              variant="primary"
              icon={<Edit className="w-4 h-4" />}
              onClick={() => navigate(editUrl)}
              className="rounded-xl"
            >
              Edit Employee Profile
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal */}
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
            <UserCheck className="w-5 h-5 text-[#005390]" />
            Personal Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Full Name</span>
              <span className="font-bold text-gray-900 dark:text-white text-xs">{fullName}</span>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Gender</span>
              <span className="font-bold text-gray-900 dark:text-white text-xs">{profile?.gender || 'N/A'}</span>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Date of Birth</span>
              <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-[#005390]" />
                {formatDate(profile?.dateOfBirth || profile?.date_of_birth)}
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Blood Group</span>
              <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 text-xs">
                <HeartPulse className="w-3.5 h-3.5" />
                {profile?.bloodGroup || profile?.blood_group || 'N/A'}
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Address</span>
              <span className="font-bold text-gray-900 dark:text-white text-xs">{profile?.address || 'N/A'}</span>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Weekoff Days</span>
              <span className="font-bold text-gray-900 dark:text-white text-xs capitalize">
                {(() => {
                  const days = profile?.weekOffDays || profile?.week_off_days || []
                  if (!Array.isArray(days) || days.length === 0) return 'None'
                  return days.map((d) => String(d).slice(0, 3)).join(', ')
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
            <Phone className="w-5 h-5 text-[#005390]" />
            Contact Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Email</span>
              <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-xs truncate">
                <Mail className="w-3.5 h-3.5 text-[#005390] shrink-0" />
                <span className="truncate">{user.email || 'N/A'}</span>
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Phone</span>
              <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-xs">
                <Phone className="w-3.5 h-3.5 text-[#005390]" />
                {phone || 'N/A'}
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Emergency Contact</span>
              <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 text-xs">
                <Phone className="w-3.5 h-3.5" />
                {profile?.emergencyContact || profile?.emergency_contact || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Professional */}
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
            <Briefcase className="w-5 h-5 text-[#005390]" />
            Professional Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Department</span>
              <span className="font-bold text-gray-900 dark:text-white text-xs">{deptName || 'N/A'}</span>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Job Category</span>
              <span className="font-bold text-gray-900 dark:text-white text-xs">{catName || 'N/A'}</span>
            </div>
            {(profile?.consultantFee != null && profile.consultantFee !== '') ||
            (profile?.consultant_fee != null && profile.consultant_fee !== '') ? (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Consultant Fee</span>
                <span className="font-bold text-gray-900 dark:text-white text-xs">
                  {String(profile?.consultantFee ?? profile?.consultant_fee)}
                </span>
              </div>
            ) : null}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Qualification</span>
              <span className="font-bold text-gray-900 dark:text-white text-xs">{profile?.qualification || 'N/A'}</span>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Experience</span>
              <span className="font-bold text-gray-900 dark:text-white text-xs">
                {profile?.experience ? `${profile.experience} year(s)` : 'N/A'}
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Date of Joining</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(profile?.dateOfJoining || profile?.date_of_joining)}
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Employee Code</span>
              <span className="font-mono font-bold text-[#005390] text-xs">{empCode || 'N/A'}</span>
            </div>
            {user.specializations && user.specializations.length > 0 && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-2">Specializations</span>
                <div className="flex flex-wrap gap-1.5">
                  {user.specializations.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#005390] border border-blue-200"
                    >
                      {s.name}
                      {s.isPrimary ? ' (Primary)' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Assignment */}
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
            <Users className="w-5 h-5 text-[#005390]" />
            Assignment Summary
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Reporting Manager</span>
              {mgrName ? (
                <div>
                  <span className="font-bold text-[#005390] text-xs">{mgrName}</span>
                  {mgrCode && <span className="block text-[10px] text-gray-400 font-mono mt-0.5">Code: {mgrCode}</span>}
                </div>
              ) : (
                <span className="font-medium text-gray-400 text-xs">Unassigned</span>
              )}
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-2">Assigned Roles</span>
              <div className="flex flex-wrap gap-1.5">
                {rolesList.length > 0 ? (
                  rolesList.map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#005390]/10 text-[#005390] border border-[#005390]/20"
                    >
                      <Shield className="w-3 h-3" />
                      {r}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-[10px]">No roles assigned</span>
                )}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-2">Assigned Properties</span>
              {assignedProperties.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {assignedProperties.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-gray-700 border border-gray-200"
                    >
                      <Building2 className="w-3 h-3 text-[#005390]" />
                      {p.property_name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 text-[10px]">No properties assigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-4 md:col-span-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
            <Shield className="w-5 h-5 text-[#005390]" />
            Account Summary
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Status</span>
              <span
                className={`font-bold text-xs ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}
              >
                {user.status || (isActive ? 'ACTIVE' : 'INACTIVE')}
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Username</span>
              <span className="font-mono font-bold text-[#005390] text-xs">{user.username || 'N/A'}</span>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Created At</span>
              <span className="font-bold text-gray-900 dark:text-white text-xs">{formatDate(user.createdAt)}</span>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Last Login</span>
              <span className="font-bold text-gray-900 dark:text-white text-xs">{formatDate(lastLogin)}</span>
            </div>
          </div>

          {user.userLocations && user.userLocations.length > 0 && (
            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-2">Location Role Mappings</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {user.userLocations.map((ul) => {
                  const loc = ul as LocationRec
                  const propName = loc.property?.property_name || loc.property?.name || loc.departmentName || 'Location'
                  const roleName = loc.role?.name || loc.role?.code || 'Staff'
                  const dName = loc.department?.name || loc.departmentName
                  const cName = loc.jobCategory?.name || loc.jobCategoryName
                  return (
                    <div
                      key={ul.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 text-xs space-y-1"
                    >
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#005390]" />
                        {propName}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Role: <span className="font-semibold text-[#005390]">{roleName}</span>
                        {dName ? ` · ${dName}` : ''}
                        {cName ? ` · ${cName}` : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Roster */}
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-4 md:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 gap-3 flex-wrap">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#005390]" />
              Shift Roster
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#005390] bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                {shiftAssignments.length} Assignment(s)
              </span>
              {id && !isGlobal && (
                <Button
                  variant="secondary"
                  className="rounded-xl h-8 text-xs"
                  onClick={() => navigate(`/admin/shift-roster-management/employees/${id}`)}
                >
                  View Full Roster
                </Button>
              )}
            </div>
          </div>

          {shiftsLoading ? (
            <div className="p-8 text-center text-xs text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#005390]" />
              Loading roster assignments...
            </div>
          ) : shiftAssignments.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              No shift roster assignments created for this employee.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {shiftAssignments.map((a) => {
                const shiftName = a.shift?.name || 'Shift'
                const shiftTime =
                  a.shift?.startTime && a.shift?.endTime
                    ? `${a.shift.startTime} – ${a.shift.endTime}`
                    : a.slotTimeRange || null
                const locationParts: string[] = []
                if (a.area?.areaName) locationParts.push(a.area.areaName)
                if (a.block?.block_name) locationParts.push(a.block.block_name)
                if (a.floor?.floor_name || a.floor?.floor_number != null) {
                  locationParts.push(a.floor.floor_name || `Floor ${a.floor.floor_number}`)
                }
                if (a.unit?.unit_number) locationParts.push(`Unit ${a.unit.unit_number}`)
                const locationLabel = locationParts.join(' · ') || null

                return (
                  <div
                    key={a.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 text-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 dark:text-white truncate">{shiftName}</div>
                        {shiftTime && <div className="text-[10px] text-gray-500 mt-0.5">{shiftTime}</div>}
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#005390]/10 text-[#005390] border border-[#005390]/20">
                        <CalendarDays className="w-3 h-3" />
                        Roster
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px] text-gray-500">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 font-semibold">
                        {formatDate(a.startDate)} → {formatDate(a.endDate)}
                      </span>
                      {locationLabel && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-gray-200">
                          <Building2 className="w-3 h-3 text-[#005390]" />
                          {locationLabel}
                        </span>
                      )}
                      {a.workingDays && a.workingDays.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200">
                          {a.workingDays.length} working day(s)
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmployeeDetailsScreen
