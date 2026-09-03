export interface RosterGridRow {
  id: string
  date: string
  resource: string
  resourceName?: string
  schedulingResourceId?: string
  resourceUserId?: string
  type: string
  dutyType: 'SHIFT' | 'OPD_SESSION'
  shift: string
  time: string
  target: string
  status: string
  opdSlotSummary?: { booked: number; total: number; capacity: number }
}

export interface RosterShiftItem {
  id: string
  shiftName: string
  code: string
  startTime: string
  endTime: string
  breakStartTime?: string
  breakEndTime?: string
  description?: string
  slotGenerationMode?: string
  slotDurationMinutes?: number
  numberOfSlots?: number
  shiftCategory?: string
  departmentId?: string
}

export interface SchedulableResource {
  id: string
  name: string
  role: string
  type: 'EMPLOYEE' | 'DOCTOR'
  subType?: 'IN_HOUSE' | 'VISITING'
  specialization?: string
}

export interface TargetLocation {
  id: string
  name: string
  type: 'PROPERTY' | 'BLOCK' | 'FLOOR' | 'AREA' | 'ROOM_UNIT' | 'DEPARTMENT' | 'CLINIC_VENUE' | 'SERVICE'
}

export interface OpdSlot {
  slotNumber: number
  startTime: string
  endTime: string
  duration: number
}

export function calculateOpdSlots(
  shiftTime: string,
  slotDurationMinutes: number,
  bufferMinutes: number = 0,
): OpdSlot[] {
  if (!shiftTime || !shiftTime.includes('-')) return []

  const [startStr, endStr] = shiftTime.split('-').map((s) => s.trim())
  const [startH, startM] = startStr.split(':').map(Number)
  const [endH, endM] = endStr.split(':').map(Number)

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return []

  const startTotalMins = startH * 60 + startM
  let endTotalMins = endH * 60 + endM

  if (endTotalMins <= startTotalMins) {
    endTotalMins += 24 * 60
  }

  const slots: OpdSlot[] = []
  let currentMins = startTotalMins
  let count = 1

  while (currentMins + slotDurationMinutes <= endTotalMins) {
    const slotStartMins = currentMins
    const slotEndMins = currentMins + slotDurationMinutes

    const formatTime = (totalMins: number) => {
      const h = Math.floor((totalMins % (24 * 60)) / 60)
      const m = totalMins % 60
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    slots.push({
      slotNumber: count++,
      startTime: formatTime(slotStartMins),
      endTime: formatTime(slotEndMins),
      duration: slotDurationMinutes,
    })

    currentMins = slotEndMins + bufferMinutes
  }

  return slots
}

export function generateRosterAssignmentName(effectiveFrom: string): string {
  const date = new Date(effectiveFrom)
  if (isNaN(date.getTime())) {
    const today = new Date()
    return `${today.toLocaleString('default', { month: 'long', year: 'numeric' })} Duty Roster`
  }
  return `${date.toLocaleString('default', { month: 'long', year: 'numeric' })} Duty Roster`
}

const DAY_CODE_MAP: Record<number, string> = {
  0: 'SUN',
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: 'SAT',
}

export function parseTimeRangeToMinutes(timeRange: string): { start: number; end: number } | null {
  if (!timeRange || !timeRange.includes('-')) return null
  const [startStr, endStr] = timeRange.split('-').map((s) => s.trim())
  const toMinutes = (value: string) => {
    const [hours, minutes = '0'] = value.split(':')
    const h = Number(hours)
    const m = Number(minutes)
    if (Number.isNaN(h) || Number.isNaN(m)) return null
    return h * 60 + m
  }
  const start = toMinutes(startStr)
  const end = toMinutes(endStr)
  if (start === null || end === null) return null
  return end <= start ? { start, end: end + 24 * 60 } : { start, end }
}

export function timeRangesOverlap(
  first: { start: number; end: number },
  second: { start: number; end: number },
): boolean {
  return first.start < second.end && second.start < first.end
}

export function getBuilderScheduleDates(
  effectiveFrom: string,
  effectiveUntil: string,
  selectedDaysOfWeek: string[],
): string[] {
  if (!effectiveFrom || !effectiveUntil || selectedDaysOfWeek.length === 0) return []

  const dates: string[] = []
  const start = new Date(effectiveFrom)
  const end = new Date(effectiveUntil)
  const current = new Date(start)

  while (current <= end) {
    const dayCode = DAY_CODE_MAP[current.getDay()]
    if (selectedDaysOfWeek.includes(dayCode)) {
      dates.push(current.toISOString().split('T')[0])
    }
    current.setDate(current.getDate() + 1)
  }

  return dates
}

export function staffMatchesRosterDuty(
  staff: SchedulableResource,
  duty: Pick<RosterGridRow, 'resource' | 'schedulingResourceId' | 'resourceUserId'>,
): boolean {
  if (duty.schedulingResourceId === staff.id) return true
  if (duty.resourceUserId === staff.id) return true
  return duty.resource.toLowerCase() === staff.name.toLowerCase()
}

export function isStaffAvailableForShiftOnDate(
  staff: SchedulableResource,
  dateStr: string,
  shiftTimeRange: string,
  rosterDates: RosterGridRow[],
): boolean {
  const proposedRange = parseTimeRangeToMinutes(shiftTimeRange)
  if (!proposedRange) return true

  const conflicts = rosterDates.filter((duty) => {
    if (duty.status === 'CANCELLED') return false
    if (duty.date !== dateStr) return false
    if (!staffMatchesRosterDuty(staff, duty)) return false
    const dutyRange = parseTimeRangeToMinutes(duty.time)
    if (!dutyRange) return true
    return timeRangesOverlap(proposedRange, dutyRange)
  })

  return conflicts.length === 0
}

export function isStaffAvailableForBuilderSchedule(
  staff: SchedulableResource,
  scheduleDates: string[],
  shiftTimeRange: string,
  rosterDates: RosterGridRow[],
): boolean {
  if (scheduleDates.length === 0 || !shiftTimeRange) return true
  return scheduleDates.every((dateStr) => isStaffAvailableForShiftOnDate(staff, dateStr, shiftTimeRange, rosterDates))
}

export interface RosterBuilderState {
  dutyType: 'SHIFT' | 'OPD_SESSION'
  resourceType: 'EMPLOYEE' | 'DOCTOR'
  selectedResourceIds: string[]
  selectedResourceNames: string[]
  targetScopeType: 'PROPERTY' | 'BLOCK' | 'FLOOR' | 'AREA' | 'ROOM_UNIT' | 'DEPARTMENT' | 'CLINIC_VENUE' | 'SERVICE'
  selectedTargetId: string
  selectedTargetName: string
  selectedShiftId: string
  selectedShiftName: string
  selectedShiftTime: string
  frequencyId: string
  frequencyType: 'DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'CUSTOM'
  selectedDaysOfWeek: string[]
  effectiveFrom: string
  effectiveUntil: string
  holidayPolicy: 'IGNORE' | 'SKIP' | 'RESCHEDULE' | 'REQUIRE_COVERAGE'
  instructions: string
  overrideReason: string
  overrideConfirmed: boolean
  enableOpdSlots?: boolean
  opdSlotDurationMinutes?: number
  opdBufferMinutes?: number
}

export function formatTimeRange(scheduledStart?: string, scheduledEnd?: string): string | null {
  if (!scheduledStart || !scheduledEnd) return null
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${fmt(scheduledStart)} - ${fmt(scheduledEnd)}`
}

export function mapSchedulingResourceToStaff(item: {
  id: string
  name?: string
  email?: string
  resourceType: 'EMPLOYEE' | 'DOCTOR'
  departmentId?: string
}): SchedulableResource {
  return {
    id: item.id,
    name: item.name || item.email || 'Staff Member',
    role: item.resourceType === 'DOCTOR' ? 'Doctor' : 'Employee',
    type: item.resourceType,
    subType: item.resourceType === 'DOCTOR' ? 'IN_HOUSE' : undefined,
  }
}

export function getShiftQueryParams(
  dutyType: 'SHIFT' | 'OPD_SESSION',
  targetScopeType: string,
  selectedTargetId: string,
): { departmentId?: string; shiftCategory?: string } {
  if (dutyType === 'OPD_SESSION') return { shiftCategory: 'OPD' }
  if (targetScopeType === 'DEPARTMENT' && selectedTargetId) {
    return { departmentId: selectedTargetId, shiftCategory: 'DEPARTMENT' }
  }
  return {}
}

export function getStaffResourceParams(
  dutyType: 'SHIFT' | 'OPD_SESSION',
  targetScopeType: string,
  selectedTargetId: string,
  resourceType?: 'EMPLOYEE' | 'DOCTOR',
): { departmentId?: string; resourceType: 'EMPLOYEE' | 'DOCTOR' } {
  const resolvedType: 'EMPLOYEE' | 'DOCTOR' = resourceType || (dutyType === 'OPD_SESSION' ? 'DOCTOR' : 'EMPLOYEE')

  if (resolvedType === 'DOCTOR') return { resourceType: 'DOCTOR' }
  if (targetScopeType === 'DEPARTMENT' && selectedTargetId) {
    return { departmentId: selectedTargetId, resourceType: 'EMPLOYEE' }
  }
  return { resourceType: 'EMPLOYEE' }
}
