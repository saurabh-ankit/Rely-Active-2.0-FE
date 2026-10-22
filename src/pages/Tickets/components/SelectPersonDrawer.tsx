import { useState, useEffect } from 'react'
import { X, Loader2, Check, CalendarClock, MapPin, ChevronDown, UserCheck, Users } from 'lucide-react'
import apiClient from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuth } from '@/hooks/useAuth'
import { notifyError, notifySuccess } from '@/utils/toast'
import type { AssignableEmployee, EmployeeShiftInfo, Ticket } from '@/lib/types'

interface Props {
  isOpen: boolean
  ticket: Ticket | null
  locationId: string | null
  onClose: () => void
  onAssignSuccess: () => void
}

const SELF_ID = '__self__'

/** "09:00:00" -> "9:00 AM" */
const formatTime = (value?: string | null) => {
  if (!value) return null
  const [rawHours, rawMinutes] = value.split(':')
  const hours = Number(rawHours)
  if (Number.isNaN(hours)) return value
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${rawMinutes || '00'} ${suffix}`
}

const formatShiftWindow = (shift: EmployeeShiftInfo) => {
  const start = formatTime(shift.startTime)
  const end = formatTime(shift.endTime)
  if (start && end) return `${start} – ${end}`
  return start || end || 'Timing not set'
}

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()

/** On shift / Off shift / no roster entry, as a coloured pill. */
function ShiftBadge({ shift }: { shift?: EmployeeShiftInfo | null }) {
  if (!shift) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
        No shift today
      </span>
    )
  }
  if (shift.isOnShift) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        On shift
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
      {shift.isScheduledToday ? 'Off hours' : 'Not scheduled today'}
    </span>
  )
}

function ShiftDetails({ shift }: { shift?: EmployeeShiftInfo | null }) {
  if (!shift) {
    return (
      <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-[11px] font-medium text-gray-500">
        No roster entry covering today. Assign a shift in Shift &amp; Roster to see timings here.
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-2 text-[11px] font-bold text-gray-800">
        <CalendarClock className="w-3.5 h-3.5 text-[#005390]" />
        {shift.shiftName || 'Shift'} · {formatShiftWindow(shift)}
      </div>
      {shift.areaName && (
        <div className="flex items-center gap-2 text-[11px] font-medium text-gray-600">
          <MapPin className="w-3.5 h-3.5 text-gray-400" />
          {shift.areaName}
          {shift.slotTimeRange ? ` · ${shift.slotTimeRange}` : ''}
        </div>
      )}
      {shift.workingDays.length > 0 && (
        <div className="text-[11px] font-medium text-gray-600">
          Working days: {shift.workingDays.map(titleCase).join(', ')}
        </div>
      )}
      {(shift.startDate || shift.endDate) && (
        <div className="text-[11px] font-medium text-gray-500">
          Roster: {shift.startDate || '—'} to {shift.endDate || '—'}
        </div>
      )}
    </div>
  )
}

export function SelectPersonDrawer({ isOpen, ticket, locationId, onClose, onAssignSuccess }: Props) {
  const { user } = useAuth()
  const [employees, setEmployees] = useState<AssignableEmployee[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>(SELF_ID)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  /** Staff outside the ticket's department stay collapsed until asked for. */
  const [showOtherStaff, setShowOtherStaff] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen || !ticket) return

    let ignore = false
    const fetchEmployees = async () => {
      setIsLoading(true)
      setSelectedUserId(SELF_ID)
      setExpandedId(null)
      setShowOtherStaff(false)
      try {
        const url = API_ENDPOINTS.tickets.assignableEmployees(
          locationId,
          ticket.departmentId || undefined,
          ticket.jobCategoryId || undefined,
        )
        const res = await apiClient.get(url)
        if (!ignore && res.data?.data) {
          setEmployees(res.data.data)
        }
      } catch (err) {
        console.error('Failed to fetch assignable employees:', err)
        if (!ignore) notifyError('Could not load staff for this ticket')
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    fetchEmployees()
    return () => {
      ignore = true
    }
  }, [isOpen, ticket, locationId])

  if (!isOpen || !ticket) return null

  // The logged-in user is offered as "Self", so drop the duplicate row.
  const otherEmployees = employees.filter((emp) => {
    if (user?.id && emp.id === user.id) return false
    if (user?.email && emp.email?.toLowerCase() === user.email.toLowerCase()) return false
    return true
  })

  const currentUserMetrics = employees.find(
    (emp) => (user?.id && emp.id === user.id) || (user?.email && emp.email?.toLowerCase() === user.email.toLowerCase()),
  )

  const onShiftCount = otherEmployees.filter((emp) => emp.shift?.isOnShift).length

  // The API tags each staff member against the ticket's department / job
  // category; group by that so the right people are offered first.
  const categoryMatches = otherEmployees.filter((emp) => emp.matchLevel === 'JOB_CATEGORY')
  const departmentMates = otherEmployees.filter((emp) => emp.matchLevel === 'DEPARTMENT')
  const otherStaff = otherEmployees.filter((emp) => !emp.matchLevel || emp.matchLevel === 'OTHER')
  const inDepartmentCount = categoryMatches.length + departmentMates.length

  const departmentName = ticket.department?.name || null
  const jobCategoryName = ticket.jobCategory?.name || null

  /** "Concierge · Laundry" — where this staff member is posted. */
  const postingLabel = (emp: AssignableEmployee) =>
    [emp.department?.name, emp.jobCategory?.name].filter(Boolean).join(' · ') || 'No department assigned'

  const handleAssign = async () => {
    setIsSubmitting(true)
    try {
      const url = API_ENDPOINTS.tickets.assign(ticket.id, locationId)
      const targetUserId = selectedUserId === SELF_ID ? user?.id || null : selectedUserId
      await apiClient.patch(url, { assignedToUserId: targetUserId })
      notifySuccess('Ticket assigned')
      onAssignSuccess()
      onClose()
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not assign this ticket'
      notifyError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderCard = (options: {
    id: string
    name: string
    initials: string
    avatarClass: string
    totalAssigned: number
    openCount: number
    closedCount: number
    shift?: EmployeeShiftInfo | null
    subtitle?: string
    meta?: string
  }) => {
    const isSelected = selectedUserId === options.id
    const isExpanded = expandedId === options.id

    return (
      <div
        key={options.id}
        className={`rounded-2xl border transition-all ${
          isSelected ? 'border-[#005390] bg-blue-50/40 shadow-2xs' : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setSelectedUserId(options.id)
            setExpandedId(isExpanded ? null : options.id)
          }}
          className="w-full text-left p-3.5 flex items-start gap-3 cursor-pointer"
        >
          <div
            className={`w-10 h-10 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 ${options.avatarClass}`}
          >
            {options.initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-gray-900 truncate">{options.name}</span>
              <ShiftBadge shift={options.shift} />
            </div>

            {options.subtitle && <div className="text-[11px] text-gray-500 mt-0.5">{options.subtitle}</div>}

            {options.meta && (
              <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-600">
                <Users className="w-3 h-3 text-gray-400" />
                {options.meta}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-[11px] font-semibold text-gray-600">{options.totalAssigned} assigned</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                Open : {options.openCount}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                Closed : {options.closedCount}
              </span>
              {options.shift?.isOnShift && (
                <span className="text-[11px] font-semibold text-emerald-700">{formatShiftWindow(options.shift)}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5 shrink-0">
            {isSelected && <Check className="w-4.5 h-4.5 text-[#005390]" />}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isExpanded && <div className="px-3.5 pb-3.5">{<ShiftDetails shift={options.shift} />}</div>}
      </div>
    )
  }

  /** A titled block of staff cards; renders nothing when the group is empty. */
  const renderGroup = (group: AssignableEmployee[], title: string, hint: string) => {
    if (group.length === 0) return null

    return (
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-2 px-1 pt-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-700">
            {title} <span className="text-gray-400">({group.length})</span>
          </h3>
          <span className="text-[10px] font-medium text-gray-400 truncate">{hint}</span>
        </div>

        {group.map((emp) =>
          renderCard({
            id: emp.id,
            name: emp.name,
            initials: emp.initials,
            avatarClass: emp.shift?.isOnShift ? 'bg-emerald-600' : 'bg-gray-400',
            totalAssigned: emp.totalAssigned,
            openCount: emp.openCount,
            closedCount: emp.closedCount,
            shift: emp.shift,
            subtitle: emp.email,
            meta: postingLabel(emp),
          }),
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#005390]" />
              Assign Ticket
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-mono font-bold text-gray-700">{ticket.ticketNumber}</span>
              {[departmentName, jobCategoryName].filter(Boolean).length > 0
                ? ` · ${[departmentName, jobCategoryName].filter(Boolean).join(' · ')}`
                : ''}
              {!isLoading && inDepartmentCount > 0 ? ` · ${inDepartmentCount} in this department` : ''}
              {!isLoading && otherEmployees.length > 0 ? ` · ${onShiftCount} on shift now` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Staff list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#005390]" />
              <p className="text-xs font-medium">Loading department staff…</p>
            </div>
          ) : (
            <>
              {renderCard({
                id: SELF_ID,
                name: 'Self',
                initials: 'S',
                avatarClass: 'bg-[#005390]',
                totalAssigned: currentUserMetrics?.totalAssigned ?? 0,
                openCount: currentUserMetrics?.openCount ?? 0,
                closedCount: currentUserMetrics?.closedCount ?? 0,
                shift: currentUserMetrics?.shift ?? null,
                subtitle: user?.email || undefined,
              })}

              {renderGroup(
                categoryMatches,
                jobCategoryName ? `${jobCategoryName} specialists` : 'Matching category',
                'Posted to this ticket\u2019s category',
              )}

              {renderGroup(
                departmentMates,
                departmentName ? `${departmentName} \u2014 other categories` : 'Same department',
                'Same department, a different category',
              )}

              {inDepartmentCount === 0 && otherStaff.length > 0 && (departmentName || jobCategoryName) && (
                <p className="px-1 py-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl">
                  No staff are posted to{' '}
                  {[jobCategoryName, departmentName].filter(Boolean).join(' in ') || 'this ticket\u2019s category'}.
                  Showing everyone at this property instead.
                </p>
              )}

              {otherStaff.length > 0 &&
                (inDepartmentCount === 0 || showOtherStaff ? (
                  renderGroup(otherStaff, 'Other departments', 'Outside this ticket\u2019s department')
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowOtherStaff(true)}
                    className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 text-[11px] font-bold text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors cursor-pointer"
                  >
                    Show staff from other departments ({otherStaff.length})
                  </button>
                ))}

              {otherEmployees.length === 0 && (
                <p className="py-8 text-center text-xs font-semibold text-gray-400">
                  No other staff available for this department.
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-3xl flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-[#005390] hover:bg-[#004070] disabled:opacity-60 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-2 min-w-[120px]"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign Ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}
