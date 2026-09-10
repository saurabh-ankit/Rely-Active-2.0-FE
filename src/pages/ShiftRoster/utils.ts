import { useMemo } from 'react'
import type { UserItem } from '@/lib/types'

const MEDICAL_ROLE_CODES = ['DOCTOR', 'NURSE', 'CARETAKER']

export const getUserDisplayName = (user: UserItem): string => {
  const first = user.profile?.firstName || user.profile?.first_name || ''
  const last = user.profile?.lastName || user.profile?.last_name || ''
  const name = `${first} ${last}`.trim()
  return name || user.email || user.username || 'Unknown'
}

export const getUserRoleCodes = (user: UserItem): string[] => {
  const fromLocations = user.userLocations?.map((ul) => ul.role?.code || ul.role?.name || '').filter(Boolean) || []
  const fromRoles = user.userRoles?.map((ur) => ur.role?.code || ur.role?.name || '').filter(Boolean) || []
  return [...fromLocations, ...fromRoles].map((c) => c.toUpperCase())
}

/** First role label for display (e.g. "doctor", "admin"). */
export const getUserRoleLabel = (user: UserItem): string => {
  const fromLocation = user.userLocations?.find((ul) => ul.role?.name || ul.role?.code)
  const fromRole = user.userRoles?.find((ur) => ur.role?.name || ur.role?.code)
  const label =
    fromLocation?.role?.name || fromLocation?.role?.code || fromRole?.role?.name || fromRole?.role?.code || ''
  return label ? String(label).toLowerCase() : ''
}

export const getUserDepartmentIds = (user: UserItem, locationId?: string | null): string[] => {
  return (user.userLocations || [])
    .filter((ul) => !locationId || ul.locId === locationId)
    .map((ul) => ul.departmentId || (ul as { department_id?: string }).department_id || '')
    .filter(Boolean)
}

/** First matching department name for a user at the given location. */
export const getUserDepartmentName = (
  user: UserItem | null | undefined,
  departments: Array<{ id: string; name: string }>,
  locationId?: string | null,
): string => {
  if (!user) return ''
  const ids = getUserDepartmentIds(user, locationId)
  if (ids.length === 0) return ''
  const byId = new Map(departments.map((d) => [d.id, d.name]))
  for (const id of ids) {
    const name = byId.get(id)
    if (name) return name
  }
  return ''
}

export const usersShareDepartment = (a: UserItem, b: UserItem, locationId?: string | null): boolean => {
  const aDepts = new Set(getUserDepartmentIds(a, locationId))
  if (aDepts.size === 0) return false
  return getUserDepartmentIds(b, locationId).some((id) => aDepts.has(id))
}

export const isSameRoleGroup = (roleA?: string, roleB?: string): boolean => {
  if (!roleA || !roleB) return true
  const a = roleA.toLowerCase()
  const b = roleB.toLowerCase()
  if (a.includes('doctor') && b.includes('doctor')) return true
  if (a.includes('nurse') && b.includes('nurse')) return true
  if (a.includes('caretaker') && b.includes('caretaker')) return true
  return a.trim() === b.trim()
}

const isMedicalStaff = (user: UserItem): boolean => {
  const codes = getUserRoleCodes(user)
  return codes.some((code) => MEDICAL_ROLE_CODES.some((r) => code.includes(r)))
}

export const useMedicalEmployees = (users: UserItem[] | undefined) =>
  useMemo(() => (users || []).filter(isMedicalStaff), [users])

export const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

/** Weekday names for Date#getDay() (Sunday-first). */
const WEEKDAY_BY_INDEX = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

/** Local YYYY-MM-DD → Date at local midnight. */
export const parseLocalYmd = (ymd: string): Date => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1)
}

/** Weekdays that occur at least once in [startYmd, endYmd], in WEEK_DAYS order. */
export const weekdaysInDateRange = (startYmd: string, endYmd: string): Array<(typeof WEEK_DAYS)[number]> => {
  if (!startYmd || !endYmd || endYmd < startYmd) return []
  const found = new Set<(typeof WEEK_DAYS)[number]>()
  const start = parseLocalYmd(startYmd)
  const end = parseLocalYmd(endYmd)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const name = WEEKDAY_BY_INDEX[d.getDay()]
    if (name) found.add(name)
    if (found.size === 7) break
  }
  return WEEK_DAYS.filter((day) => found.has(day))
}

/** True when two HH:mm windows overlap (supports overnight). */
export const doTimeWindowsOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string): boolean => {
  const as = parseHHmmToMinutes(aStart)
  const ae = parseHHmmToMinutes(aEnd)
  const bs = parseHHmmToMinutes(bStart)
  const be = parseHHmmToMinutes(bEnd)
  if (as === null || ae === null || bs === null || be === null) return false

  const expand = (s: number, e: number): Array<[number, number]> =>
    s <= e
      ? [[s, e]]
      : [
          [s, 1440],
          [0, e],
        ]

  const A = expand(as, ae)
  const B = expand(bs, be)
  return A.some(([x0, x1]) => B.some(([y0, y1]) => Math.max(x0, y0) < Math.min(x1, y1)))
}

export const resolveAssignmentWindow = (
  shiftStart?: string | null,
  shiftEnd?: string | null,
  slotTimeRange?: string | null,
): { start: string; end: string } | null => {
  if (slotTimeRange && slotTimeRange.trim()) {
    const parts = slotTimeRange.split('-').map((p) => p.trim())
    if (parts.length === 2 && parts[0] && parts[1]) {
      return { start: parts[0], end: parts[1] }
    }
  }
  if (shiftStart && shiftEnd) return { start: shiftStart, end: shiftEnd }
  return null
}

type BusyDateLike = {
  id: string
  date: string
  status: string
  isDeleted?: boolean
  coveredByEmployeeId?: string | null
  shiftAssignment?: {
    employeeId?: string
    slotTimeRange?: string | null
    shift?: { startTime?: string; endTime?: string } | null
  } | null
}

/** True when the employee already has an active overlapping duty on that date/slot. */
const isEmployeeBusyOnDateSlot = (
  employeeId: string,
  date: string,
  window: { start: string; end: string },
  allDates: BusyDateLike[],
  excludeDateIds?: Iterable<string>,
): boolean => {
  const excluded = new Set(excludeDateIds || [])
  for (const d of allDates) {
    if (!d || d.isDeleted || excluded.has(d.id)) continue
    if (d.date !== date) continue
    if (d.status === 'day_off') continue

    const assignedEmpId = d.shiftAssignment?.employeeId
    const isCovering = d.status === 'covered' && d.coveredByEmployeeId === employeeId
    const isOwnActiveDuty = assignedEmpId === employeeId && d.status !== 'covered' && d.status !== 'day_off'

    if (!isCovering && !isOwnActiveDuty) continue

    const existingWindow = resolveAssignmentWindow(
      d.shiftAssignment?.shift?.startTime,
      d.shiftAssignment?.shift?.endTime,
      d.shiftAssignment?.slotTimeRange,
    )
    if (!existingWindow) continue
    if (doTimeWindowsOverlap(window.start, window.end, existingWindow.start, existingWindow.end)) {
      return true
    }
  }
  return false
}

export const isEmployeeAvailableForDateSlot = (
  employeeId: string,
  date: string,
  window: { start: string; end: string },
  allDates: BusyDateLike[],
  excludeDateIds?: Iterable<string>,
): boolean => !isEmployeeBusyOnDateSlot(employeeId, date, window, allDates, excludeDateIds)

export const AREA_TYPES = [
  'Lobby Area',
  'Security Area',
  'Maintenance Area',
  'Kitchen Area',
  'Parking Area',
  'Office Area',
  'Storage Area',
  'Recreation Area',
  'Medical Area',
  'Others',
] as const

export const LEAVE_TYPES = [
  { value: 'week_off', label: 'Week Off' },
  { value: 'sick', label: 'Sick' },
  { value: 'casual', label: 'Casual' },
  { value: 'planned', label: 'Planned' },
  { value: 'holiday', label: 'Holiday' },
] as const

/** Local YYYY-MM-DD (not UTC). */
export const todayYmdLocal = (now = new Date()): string => {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const parseHHmmToMinutes = (hhmm: string): number | null => {
  const parts = hhmm.trim().split(':')
  if (parts.length !== 2) return null
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null
  return h * 60 + m
}

const minutesToHHmm = (total: number): string => {
  const normalized = ((total % 1440) + 1440) % 1440
  const h = Math.floor(normalized / 60)
  const m = normalized % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const parseSlotRange = (range: string): { start: string; end: string; startMin: number; endMin: number } | null => {
  const parts = range.split('-').map((p) => p.trim())
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  const startMin = parseHHmmToMinutes(parts[0])
  const endMin = parseHHmmToMinutes(parts[1])
  if (startMin === null || endMin === null) return null
  return { start: parts[0], end: parts[1], startMin, endMin }
}

/** Generate HH:mm - HH:mm slots inside a shift window (supports overnight). */
export const generateShiftSlots = (
  startTime: string,
  endTime: string,
  durationMinutes = 60,
): Array<{ value: string; label: string }> => {
  const start = parseHHmmToMinutes(startTime)
  const end = parseHHmmToMinutes(endTime)
  if (start === null || end === null || durationMinutes < 1) return []

  const slots: Array<{ value: string; label: string }> = []
  const overnight = end <= start
  const absoluteEnd = overnight ? end + 1440 : end

  for (let cursor = start; cursor + durationMinutes <= absoluteEnd; cursor += durationMinutes) {
    const slotStart = minutesToHHmm(cursor)
    const slotEnd = minutesToHHmm(cursor + durationMinutes)
    const value = `${slotStart} - ${slotEnd}`
    slots.push({ value, label: value })
  }
  return slots
}

/** Total minutes in a shift window (overnight-aware). */
export const getShiftDurationMinutes = (startTime: string, endTime: string): number | null => {
  const start = parseHHmmToMinutes(startTime)
  const end = parseHHmmToMinutes(endTime)
  if (start === null || end === null) return null
  return end <= start ? end + 1440 - start : end - start
}

/**
 * Split a shift into N equal slots. Adjacent slots start 1 minute after the previous
 * end so previews look like (08:00-08:30), (08:31-09:00), …
 */
export const generateSlotsByCount = (
  startTime: string,
  endTime: string,
  numberOfSlots: number,
): Array<{ value: string; label: string; start: string; end: string }> => {
  const start = parseHHmmToMinutes(startTime)
  const end = parseHHmmToMinutes(endTime)
  if (start === null || end === null || numberOfSlots < 1) return []

  const overnight = end <= start
  const absoluteEnd = overnight ? end + 1440 : end
  const total = absoluteEnd - start
  if (total < numberOfSlots) return []

  const duration = Math.floor(total / numberOfSlots)
  if (duration < 1) return []

  const slots: Array<{ value: string; label: string; start: string; end: string }> = []
  for (let i = 0; i < numberOfSlots; i++) {
    const contiguousStart = start + i * duration
    const contiguousEnd = i === numberOfSlots - 1 ? absoluteEnd : start + (i + 1) * duration
    const slotStartMin = i === 0 ? contiguousStart : contiguousStart + 1
    const slotStart = minutesToHHmm(slotStartMin)
    const slotEnd = minutesToHHmm(contiguousEnd)
    const value = `${slotStart} - ${slotEnd}`
    slots.push({ value, label: value, start: slotStart, end: slotEnd })
  }
  return slots
}

/** Derive slot duration (minutes) from shift window + slot count. */
export const calcSlotDurationFromCount = (startTime: string, endTime: string, numberOfSlots: number): number | null => {
  const total = getShiftDurationMinutes(startTime, endTime)
  if (total === null || numberOfSlots < 1) return null
  return Math.floor(total / numberOfSlots)
}

/** Derive how many full slots fit for a given duration. */
export const calcSlotCountFromDuration = (
  startTime: string,
  endTime: string,
  durationMinutes: number,
): number | null => {
  const total = getShiftDurationMinutes(startTime, endTime)
  if (total === null || durationMinutes < 1) return null
  return Math.floor(total / durationMinutes)
}

export const isSlotWithinShift = (slotRange: string, shiftStart: string, shiftEnd: string): boolean => {
  const slot = parseSlotRange(slotRange)
  const sStart = parseHHmmToMinutes(shiftStart)
  const sEnd = parseHHmmToMinutes(shiftEnd)
  if (!slot || sStart === null || sEnd === null) return false

  const overnight = sEnd <= sStart
  const shiftEndAbs = overnight ? sEnd + 1440 : sEnd
  let slotStartAbs = slot.startMin
  let slotEndAbs = slot.endMin <= slot.startMin ? slot.endMin + 1440 : slot.endMin
  if (overnight && slotStartAbs < sStart) {
    slotStartAbs += 1440
    slotEndAbs += 1440
  }
  return slotStartAbs >= sStart && slotEndAbs <= shiftEndAbs
}

/**
 * True when the shift/slot start has already passed on the given local date.
 * Used to block creating a roster for today after the window has started.
 */
export const hasWindowStartPassedOnDate = (dateYmd: string, startHHmm: string, now = new Date()): boolean => {
  const today = todayYmdLocal(now)
  if (dateYmd < today) return true
  if (dateYmd > today) return false
  const startMin = parseHHmmToMinutes(startHHmm)
  if (startMin === null) return false
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return nowMin >= startMin
}

/** Add (or subtract) whole days from a YYYY-MM-DD local calendar date. */
export const addDaysYmd = (dateYmd: string, days: number): string => {
  const parts = dateYmd.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (y === undefined || m === undefined || d === undefined) return dateYmd
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return todayYmdLocal(dt)
}

export type TimeBasedShiftStatus = 'upcoming' | 'on_duty' | 'completed'

/**
 * Derive upcoming / on_duty / completed from roster date + duty window (local time).
 * Overnight windows (end <= start) spill into the next calendar day.
 */
export const resolveTimeBasedShiftStatus = (
  dateYmd: string,
  startHHmm: string,
  endHHmm: string,
  now = new Date(),
): TimeBasedShiftStatus => {
  const today = todayYmdLocal(now)
  const startMin = parseHHmmToMinutes(startHHmm)
  const endMin = parseHHmmToMinutes(endHHmm)

  if (startMin === null || endMin === null) {
    if (dateYmd < today) return 'completed'
    return 'upcoming'
  }

  const overnight = endMin <= startMin
  const endDateYmd = overnight ? addDaysYmd(dateYmd, 1) : dateYmd
  const nowMin = now.getHours() * 60 + now.getMinutes()

  if (today < dateYmd) return 'upcoming'
  if (today > endDateYmd) return 'completed'

  if (!overnight) {
    if (nowMin < startMin) return 'upcoming'
    if (nowMin >= endMin) return 'completed'
    return 'on_duty'
  }

  if (today === dateYmd) {
    if (nowMin < startMin) return 'upcoming'
    return 'on_duty'
  }
  if (nowMin >= endMin) return 'completed'
  return 'on_duty'
}

/**
 * Advance only time-driven statuses (upcoming / on_duty). Leaves covered, day_off, absent alone.
 */
export const resolveLifecycleRosterStatus = (
  currentStatus: string,
  dateYmd: string,
  shiftStart?: string | null,
  shiftEnd?: string | null,
  slotTimeRange?: string | null,
  now = new Date(),
): string => {
  if (currentStatus !== 'upcoming' && currentStatus !== 'on_duty') return currentStatus
  const window = resolveAssignmentWindow(shiftStart, shiftEnd, slotTimeRange)
  if (!window) {
    if (dateYmd < todayYmdLocal(now)) return 'completed'
    return currentStatus
  }
  return resolveTimeBasedShiftStatus(dateYmd, window.start, window.end, now)
}
