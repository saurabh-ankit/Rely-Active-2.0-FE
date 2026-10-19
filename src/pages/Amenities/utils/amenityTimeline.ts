import type { AmenitySlotItem } from '@/lib/services/amenitySlotService'

export interface AmenityScheduleInput {
  openMinutes: number
  closeMinutes: number
  daysOfWeek: number[]
}

export interface SlotMetrics {
  totalCapacity: number
  totalBooked: number
  nextFreeStartMinutes: number | null
}

export interface ZonedDateParts {
  ymd: string
  minutes: number
  dayMon0: number
}

const DAY_ORDER = [0, 1, 2, 3, 4, 5, 6]

const clampMinutes = (value: number) => Math.max(0, Math.min(value, 24 * 60))

export const formatMinutesAmPm = (minutes: number): string => {
  const safe = clampMinutes(minutes)
  const hour = Math.floor(safe / 60)
  const minute = safe % 60
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`
}

export const getDayMon0 = (date: Date): number => {
  const day = date.getDay()
  return day === 0 ? 6 : day - 1
}

const weekMap: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
}

export const getZonedDateParts = (date: Date, timeZone: string): ZonedDateParts => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  const parts = formatter.formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes): string => parts.find((part) => part.type === type)?.value || '0'

  const year = read('year')
  const month = read('month')
  const day = read('day')
  const hour = Number(read('hour'))
  const minute = Number(read('minute'))
  const weekday = read('weekday')

  return {
    ymd: `${year}-${month}-${day}`,
    minutes: hour * 60 + minute,
    dayMon0: weekMap[weekday] ?? 0,
  }
}

const normalizeDays = (days: number[]): number[] => {
  const valid = days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  const unique = new Set(valid)
  return DAY_ORDER.filter((day) => unique.has(day))
}

const findDaysAhead = (todayMon0: number, activeDays: number[]): number[] => {
  if (!activeDays.length) return []
  const ahead: number[] = []
  for (let step = 0; step < 7; step += 1) {
    const day = (todayMon0 + step) % 7
    if (activeDays.includes(day)) ahead.push(step)
  }
  return ahead
}

export const getAmenityOpenState = (
  schedule: AmenityScheduleInput | null,
  nowDayMon0: number,
  nowMinutes: number,
): { isOpen: boolean; message: string } | null => {
  if (!schedule) return null

  const openMinutes = clampMinutes(schedule.openMinutes)
  const closeMinutes = clampMinutes(schedule.closeMinutes)
  if (closeMinutes <= openMinutes) return null

  const activeDays = normalizeDays(schedule.daysOfWeek)
  if (activeDays.length === 0) return { isOpen: false, message: 'Closed now' }

  const openToday = activeDays.includes(nowDayMon0)
  const openNow = openToday && nowMinutes >= openMinutes && nowMinutes < closeMinutes
  if (openNow) {
    return {
      isOpen: true,
      message: `Open now - closes ${formatMinutesAmPm(closeMinutes)}`,
    }
  }

  if (openToday && nowMinutes < openMinutes) {
    return {
      isOpen: false,
      message: `Closed now - opens ${formatMinutesAmPm(openMinutes)}`,
    }
  }

  const nextDays = findDaysAhead(nowDayMon0, activeDays)
  const nextOffset = nextDays.find((value) => value > 0)
  if (nextOffset !== undefined) {
    return {
      isOpen: false,
      message: `Closed now - opens ${formatMinutesAmPm(openMinutes)}`,
    }
  }

  return { isOpen: false, message: 'Closed now' }
}

export const computeSlotMetrics = (slots: AmenitySlotItem[], nowMinutes: number): SlotMetrics => {
  return slots.reduce<SlotMetrics>(
    (acc, slot) => {
      if (!slot.isLegacy) {
        acc.totalCapacity += slot.capacity
        acc.totalBooked += slot.bookedCount
      }

      const isFutureFree =
        !slot.isPast &&
        !slot.isBlocked &&
        slot.remainingCount > 0 &&
        (slot.status === 'AVAILABLE' || slot.status === 'PARTIALLY_BOOKED' || slot.status === 'BOOKED') &&
        slot.startMinutes >= nowMinutes

      if (isFutureFree && (acc.nextFreeStartMinutes === null || slot.startMinutes < acc.nextFreeStartMinutes)) {
        acc.nextFreeStartMinutes = slot.startMinutes
      }
      return acc
    },
    { totalCapacity: 0, totalBooked: 0, nextFreeStartMinutes: null },
  )
}

export const isCurrentSlot = (slot: AmenitySlotItem, nowMinutes: number): boolean => {
  if (slot.isPast) return false
  return nowMinutes >= slot.startMinutes && nowMinutes < slot.endMinutes
}
