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
  bufferMinutes: number = 0
): OpdSlot[] {
  if (!shiftTime || !shiftTime.includes('-')) return []

  const [startStr, endStr] = shiftTime.split('-').map((s) => s.trim())
  const [startH, startM] = startStr.split(':').map(Number)
  const [endH, endM] = endStr.split(':').map(Number)

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return []

  let startTotalMins = startH * 60 + startM
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

export interface RosterBuilderState {
  rosterName: string
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
