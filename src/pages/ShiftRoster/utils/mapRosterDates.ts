import type { RosterGridRow } from '../types'
import { formatTimeRange } from '../types'

export function mapRosterDateToGridRow(d: Record<string, unknown>, resourceNameFallback?: string): RosterGridRow {
  const rawDate = (d.assignmentDate || d.date || '') as string
  const formattedDate = typeof rawDate === 'string' ? rawDate.split('T')[0] : String(rawDate)

  let resourceName = resourceNameFallback || 'Staff Member'
  const resource = d.resource as Record<string, unknown> | undefined
  if (resource && typeof resource === 'object') {
    const u = resource.user as Record<string, unknown> | undefined
    if (u) {
      const profile = (u.profile || {}) as Record<string, unknown>
      resourceName = profile.firstName
        ? `${profile.firstName} ${profile.lastName || ''}`.trim()
        : String(u.username || u.email || 'Staff Member')
    } else if (resource.doctorProfile) {
      const dp = resource.doctorProfile as Record<string, unknown>
      resourceName = `Dr. ${dp.specialization || 'Doctor'}`
    }
  }
  if (
    resourceName === 'Staff Member' &&
    typeof d.resourceSnapshot === 'string' &&
    !d.resourceSnapshot.startsWith('Staff (') &&
    d.resourceSnapshot !== 'Unknown Resource'
  ) {
    resourceName = d.resourceSnapshot
  }

  let shiftName = 'Scheduled Shift'
  if (typeof d.shift === 'string' && d.shift.trim()) {
    shiftName = d.shift
  } else if (typeof d.shift === 'object' && d.shift && (d.shift as Record<string, unknown>).shiftName) {
    shiftName = String((d.shift as Record<string, unknown>).shiftName)
  } else if (d.shiftNameSnapshot) {
    shiftName = String(d.shiftNameSnapshot)
  }

  const timeFromApi = formatTimeRange(d.scheduledStart as string, d.scheduledEnd as string)
  const shiftObj = d.shift as Record<string, unknown> | undefined
  const shiftTimes =
    shiftObj?.startTime && shiftObj?.endTime ? `${shiftObj.startTime} - ${shiftObj.endTime}` : undefined

  return {
    id: String(d.id),
    date: formattedDate,
    resource: resourceName,
    resourceName,
    schedulingResourceId: d.schedulingResourceId as string | undefined,
    resourceUserId: (resource?.userId as string) || (d.resourceUserId as string | undefined),
    type: typeof d.type === 'string' ? d.type : (resource?.resourceType as string) || 'EMPLOYEE',
    dutyType: (d.dutyType as RosterGridRow['dutyType']) || 'SHIFT',
    shift: shiftName,
    time: timeFromApi || (d.time as string) || (d.slotTimeRange as string) || shiftTimes || '08:00 - 16:00',
    target: typeof d.target === 'string' ? d.target : (d.targetSnapshot as string) || 'Location Target',
    status: (d.status as string) || 'UPCOMING',
    opdSlotSummary: d.opdSlotSummary as RosterGridRow['opdSlotSummary'],
  }
}
