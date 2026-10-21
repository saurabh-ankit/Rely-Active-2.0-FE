import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { differenceInYears, format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns'
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarDays,
  Edit,
  History,
  KeyRound,
  LayoutGrid,
  Mail,
  Phone,
  RefreshCw,
  ShieldAlert,
  User,
  UserCheck,
} from 'lucide-react'
import { useEmployeeActivitySummary, useUserByIdQuery } from '@/hooks/react-query/user'
import { useLocationStore } from '@/lib/stores/locationStore'
import { Button } from '@/components/ui/button'
import { RoleBadges } from '@/components/employees/EmployeeCells'
import { HeroFact, InfoList, NotAdded, Panel } from '@/components/common/DetailPanel'
import { ResponsiveTabs, type TabItem } from '@/components/common/ResponsiveTabs'
import { DepartmentActivity } from './activity/DepartmentActivity'
import { WorkLogTimeline } from './activity/WorkLogTimeline'
import { EmployeeMonthlyRoster } from './EmployeeMonthlyRoster'
import { RangeFilter } from './activity/shared'
import { ACTIVITY_META, defaultRange, type DateRange } from './activity/utils'
import { cn, getFileUrl } from '@/lib/utils'
import { useResourceAccess } from '@/hooks/useResourceAccess'
import { RESOURCE } from '@/lib/permissions/resourceKeys'

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
  const directoryAccess = useResourceAccess(RESOURCE.EMPLOYEE_DIRECTORY)
  const activityAccess = useResourceAccess(RESOURCE.EMPLOYEE_ACTIVITY)
  const canUpdateEmployee = directoryAccess.canUpdate

  const { data: user, isLoading, error: queryError } = useUserByIdQuery(id)

  const isGlobal = isGlobalMode || window.location.pathname.includes('/global-settings')
  const selectedLocationId = useLocationStore((state) => state.selectedLocationId)
  const activityLocId = isGlobal ? null : selectedLocationId || null
  const [activityRange, setActivityRange] = useState<DateRange>(defaultRange)
  const [activeTab, setActiveTab] = useState('overview')
  const { data: activitySummary, isLoading: activitySummaryLoading } = useEmployeeActivitySummary(
    id,
    {
      ...activityRange,
      locId: activityLocId,
    },
    activityAccess.canView,
  )

  const backUrl = isGlobal ? '/global-settings/users' : '/admin/employees'
  const editUrl = isGlobal ? `/global-settings/edit-user/${id}` : `/admin/employees/edit/${id}`

  const backLabel = isGlobal ? 'Back to Global Employee Directory' : 'Back to Employee Directory'
  const backButton = (
    <Button
      variant="ghost"
      type="button"
      onClick={() => navigate(backUrl)}
      className="p-0 h-auto inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-gray-600 transition-colors hover:text-[#005390] hover:bg-transparent"
    >
      <ArrowLeft className="h-4 w-4" />
      {backLabel}
    </Button>
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

  const activityKind = activitySummary?.kind ?? 'none'
  const activityToolbar = (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-slate-900">
      <p className="text-xs text-gray-500">
        Activity for <span className="font-semibold text-gray-800 dark:text-gray-200">{fullName}</span>
        {activitySummary?.departmentName ? ` · ${activitySummary.departmentName}` : ''}
      </p>
      <RangeFilter value={activityRange} onChange={setActivityRange} />
    </div>
  )
  const activityTabs: TabItem[] = []
  if (id && activityAccess.canView && activityKind !== 'none') {
    const meta = ACTIVITY_META[activityKind]
    activityTabs.push({
      value: 'department',
      label: meta.label,
      shortLabel: meta.shortLabel,
      icon: meta.icon,
      content: (
        <>
          {activityToolbar}
          <DepartmentActivity
            employeeId={id}
            kind={activityKind}
            stats={activitySummary?.stats ?? null}
            statsLoading={activitySummaryLoading}
            range={activityRange}
            locId={activityLocId}
          />
        </>
      ),
    })
  }
  if (id && activityAccess.canView) {
    activityTabs.push({
      value: 'work-log',
      label: 'Work log',
      shortLabel: 'Log',
      icon: History,
      content: (
        <>
          {activityToolbar}
          <WorkLogTimeline employeeId={id} employeeName={fullName} range={activityRange} locId={activityLocId} />
        </>
      ),
    })
  }

  // Overview follows Employee › Directory & profiles; the activity tabs follow Employee › Activity & work log.
  const overviewTab: TabItem = {
    value: 'overview',
    label: 'Overview',
    shortLabel: 'Overview',
    icon: LayoutGrid,
    content: (
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

          {id && <EmployeeMonthlyRoster employeeId={id} showFullRosterLink={!isGlobal} />}
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
    ),
  }
  const visibleTabs: TabItem[] = [...(directoryAccess.canView ? [overviewTab] : []), ...activityTabs]

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

      {visibleTabs.length > 0 ? (
        <ResponsiveTabs
          value={visibleTabs.some((t) => t.value === activeTab) ? activeTab : visibleTabs[0]!.value}
          onValueChange={setActiveTab}
          tabs={visibleTabs}
        />
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">
          You don&apos;t have access to this employee&apos;s profile or activity.
        </div>
      )}
    </div>
  )
}

export default EmployeeDetailsScreen
