import React, { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { differenceInYears, format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns'
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarDays,
  Clock,
  Edit,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldAlert,
  User,
  UserCheck,
} from 'lucide-react'
import { useUserByIdQuery } from '@/hooks/react-query/user'
import { useListEmployeeShifts } from '@/hooks/react-query/roster'
import { useLocationContext } from '@/hooks/useLocation'
import { Button } from '@/components/ui/button'
import { RoleBadges } from '@/components/employees/EmployeeCells'
import { HeroFact, InfoList, NotAdded, Panel } from '@/components/common/DetailPanel'
import { cn, getFileUrl } from '@/lib/utils'
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

export interface EmployeeDetailsScreenProps {
  isGlobalMode?: boolean
}

const parseDate = (value?: string | null) => {
  if (!value) return null
  const date = parseISO(value)
  return isValid(date) ? date : null
}

/** "17 Sep 2026", or null when missing. */
const formatDate = (value?: string | null, pattern = 'dd MMM yyyy') => {
  const date = parseDate(value)
  return date ? format(date, pattern) : null
}

const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

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

  const shiftAssignments: EmployeeShiftAssignment[] = useMemo(() => {
    const rows = shiftsRes?.data
    return Array.isArray(rows) ? rows.filter((a) => !a.isDeleted) : []
  }, [shiftsRes])

  const backLabel = isGlobal ? 'Back to Global Employee Directory' : 'Back to Employee Directory'
  const backButton = (
    <button
      type="button"
      onClick={() => navigate(backUrl)}
      className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-gray-600 transition-colors hover:text-[#005390]"
    >
      <ArrowLeft className="h-4 w-4" />
      {backLabel}
    </button>
  )

  if (isLoading) {
    return (
      <div className="w-full space-y-6 pb-12">
        {backButton}
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-sm text-gray-400">
          <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-[#005390]" />
          Loading employee profile…
        </div>
      </div>
    )
  }

  const errorMsg =
    queryError instanceof Error ? queryError.message : queryError ? 'Failed to load employee profile' : null

  if (errorMsg || !user) {
    return (
      <div className="w-full space-y-6 pb-12">
        {backButton}
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-xs font-bold text-rose-700">
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

  const joinedOn = parseDate(profile?.dateOfJoining || profile?.date_of_joining)
  const birthDate = parseDate(profile?.dateOfBirth || profile?.date_of_birth)
  const weekOff = (profile?.weekOffDays || profile?.week_off_days || []).map((d) => String(d).toLowerCase())
  const emergency = profile?.emergencyContact || profile?.emergency_contact
  const consultantFee = profile?.consultantFee ?? profile?.consultant_fee
  const hasConsultantFee = consultantFee != null && consultantFee !== ''
  const initials = fullName
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="w-full space-y-5 pb-16">
      {backButton}

      {/* Summary: who this is and where they sit */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs dark:border-gray-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#005390] to-sky-600 text-xl font-bold text-white shadow-sm">
              {photoUrl ? (
                <img src={getFileUrl(photoUrl)} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white md:text-2xl">{fullName}</h1>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                    isActive
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-gray-100 text-gray-500',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-emerald-500' : 'bg-gray-400')} />
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="font-mono text-xs text-gray-500">{empCode || `@${user.username ?? ''}`}</p>
              <RoleBadges user={user} />
            </div>
          </div>

          {canUpdateEmployee && (
            <Button
              variant="primary"
              icon={<Edit className="h-4 w-4" />}
              onClick={() => navigate(editUrl)}
              className="shrink-0 self-start rounded-xl sm:self-center"
            >
              Edit Profile
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-gray-100 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4 md:px-6 dark:border-gray-800">
          <HeroFact
            icon={Briefcase}
            label="Department"
            value={deptName ? `${deptName}${catName ? ` · ${catName}` : ''}` : <NotAdded />}
          />
          <HeroFact
            icon={UserCheck}
            label="Reports to"
            value={
              mgrName ? (
                `${mgrName}${mgrCode ? ` (${mgrCode})` : ''}`
              ) : (
                <span className="font-normal text-gray-400">No manager assigned</span>
              )
            }
          />
          <HeroFact
            icon={CalendarDays}
            label="Joined"
            value={
              joinedOn ? (
                <>
                  {format(joinedOn, 'dd MMM yyyy')}
                  <span className="ml-1 text-xs font-normal text-gray-500">
                    ({joinedOn > new Date() ? 'starts soon' : formatDistanceToNowStrict(joinedOn)})
                  </span>
                </>
              ) : (
                <NotAdded />
              )
            }
          />
          <HeroFact
            icon={Phone}
            label="Phone"
            value={
              phone ? (
                <a href={`tel:${phone}`} className="hover:text-[#005390]">
                  {phone}
                </a>
              ) : (
                <NotAdded />
              )
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel icon={Briefcase} title="Work details">
            <InfoList
              rows={[
                ['Department', deptName ?? null],
                ['Job category', catName ?? null],
                ['Qualification', profile?.qualification || null],
                ['Experience', profile?.experience ? `${profile.experience} year(s)` : null],
                ...(hasConsultantFee
                  ? ([['Consultant fee', `₹${String(consultantFee)}`]] as Array<[string, React.ReactNode]>)
                  : []),
                ...(user.specializations && user.specializations.length > 0
                  ? ([
                      [
                        'Specializations',
                        <div key="spec" className="flex flex-wrap gap-1.5">
                          {user.specializations.map((sp) => (
                            <span
                              key={sp.id}
                              className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700"
                            >
                              {sp.name}
                              {sp.isPrimary ? ' · Primary' : ''}
                            </span>
                          ))}
                        </div>,
                      ],
                    ] as Array<[string, React.ReactNode]>)
                  : []),
                [
                  'Weekly off',
                  <div key="off" className="flex flex-wrap gap-1">
                    {WEEK_DAYS.map((day) => {
                      const off = weekOff.includes(day)
                      return (
                        <span
                          key={day}
                          title={off ? 'Day off' : 'Working day'}
                          className={cn(
                            'w-10 rounded-md border py-0.5 text-center text-[11px] font-semibold capitalize',
                            off ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-gray-200 bg-white text-gray-500',
                          )}
                        >
                          {day.slice(0, 3)}
                        </span>
                      )
                    })}
                  </div>,
                ],
              ]}
            />
            {weekOff.length === 0 && <p className="mt-1 text-[11px] text-gray-400">No weekly off days set.</p>}
          </Panel>

          <Panel
            icon={Clock}
            title={`Shift roster${shiftAssignments.length ? ` (${shiftAssignments.length})` : ''}`}
            action={
              id && !isGlobal ? (
                <Button
                  variant="secondary"
                  className="h-8 rounded-xl text-xs"
                  onClick={() => navigate(`/admin/shift-roster-management/employees/${id}`)}
                >
                  View full roster
                </Button>
              ) : null
            }
          >
            {shiftsLoading ? (
              <div className="p-6 text-center text-xs text-gray-400">
                <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#005390]" />
                Loading shifts…
              </div>
            ) : shiftAssignments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs text-gray-400">
                No shifts assigned yet.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {shiftAssignments.map((a) => {
                  const shiftTime =
                    a.shift?.startTime && a.shift?.endTime
                      ? `${a.shift.startTime.slice(0, 5)} – ${a.shift.endTime.slice(0, 5)}`
                      : a.slotTimeRange || null
                  const locationParts: string[] = []
                  if (a.area?.areaName) locationParts.push(a.area.areaName)
                  if (a.block?.block_name) locationParts.push(a.block.block_name)
                  if (a.floor?.floor_name || a.floor?.floor_number != null) {
                    locationParts.push(a.floor.floor_name || `Floor ${a.floor.floor_number}`)
                  }
                  if (a.unit?.unit_number) locationParts.push(`Unit ${a.unit.unit_number}`)
                  const from = formatDate(a.startDate, 'dd MMM')
                  const to = formatDate(a.endDate, 'dd MMM yyyy')

                  return (
                    <li
                      key={a.id}
                      className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {a.shift?.name || 'Shift'}
                          {shiftTime && (
                            <span className="ml-2 font-mono text-xs font-medium text-gray-500">{shiftTime}</span>
                          )}
                        </p>
                        {locationParts.length > 0 && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            {locationParts.join(' · ')}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-[11px]">
                        {(from || to) && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                            {from ?? '…'} → {to ?? '…'}
                          </span>
                        )}
                        {a.workingDays && a.workingDays.length > 0 && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
                            {a.workingDays.length} days/week
                          </span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel icon={Phone} title="Contact">
            <InfoList
              rows={[
                [
                  'Email',
                  user.email ? (
                    <a href={`mailto:${user.email}`} className="flex items-center gap-1.5 hover:text-[#005390]">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="truncate">{user.email}</span>
                    </a>
                  ) : null,
                ],
                ['Phone', phone || null],
                [
                  'Emergency',
                  emergency ? (
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      {emergency}
                    </span>
                  ) : null,
                ],
              ]}
            />
          </Panel>

          <Panel icon={User} title="Personal">
            <InfoList
              rows={[
                ['Gender', profile?.gender ? <span className="capitalize">{profile.gender.toLowerCase()}</span> : null],
                [
                  'Date of birth',
                  birthDate
                    ? `${format(birthDate, 'dd MMM yyyy')} (${differenceInYears(new Date(), birthDate)} yrs)`
                    : null,
                ],
                ['Blood group', profile?.bloodGroup || profile?.blood_group || null],
                ['Address', profile?.address || null],
              ]}
            />
          </Panel>

          <Panel icon={KeyRound} title="Account">
            <InfoList
              rows={[
                ['Username', user.username ? <span className="font-mono text-xs">{user.username}</span> : null],
                ['Created', formatDate(user.createdAt)],
                [
                  'Last login',
                  formatDate(lastLogin, 'dd MMM yyyy, h:mm a') ?? (
                    <span className="font-normal text-gray-400">Never</span>
                  ),
                ],
              ]}
            />
            {assignedProperties.length > 0 && (
              <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                <p className="mb-2 text-xs text-gray-500">Properties</p>
                <div className="flex flex-wrap gap-1.5">
                  {assignedProperties.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-gray-700"
                    >
                      <Building2 className="h-3 w-3 text-[#005390]" />
                      {p.property_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

export default EmployeeDetailsScreen
