import type { EventOccurrence, FrequencyType } from '@/lib/services/eventService'

export interface RecurrenceConfig {
  recurrenceDayOfWeek?: number
  recurrenceDaysOfWeek?: number[]
  recurrenceDayOfMonth?: number
  recurrenceMonth?: number
}

export const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export const getWeeklyRecurrenceDays = (config: RecurrenceConfig = {}): number[] => {
  if (Array.isArray(config.recurrenceDaysOfWeek) && config.recurrenceDaysOfWeek.length > 0) {
    return [...new Set(config.recurrenceDaysOfWeek.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b)
  }
  if (config.recurrenceDayOfWeek !== undefined && config.recurrenceDayOfWeek >= 0 && config.recurrenceDayOfWeek <= 6) {
    return [config.recurrenceDayOfWeek]
  }
  return []
}

export const formatWeeklyDayLabels = (days: number[]): string => {
  if (days.length === 0) return 'selected day'
  if (days.length === 1) {
    return WEEKDAYS.find((day) => day.value === days[0])?.label || 'selected day'
  }
  const labels = days.map((d) => WEEKDAYS.find((day) => day.value === d)?.label).filter(Boolean) as string[]
  if (labels.length <= 1) return labels[0] || 'selected days'
  return `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`
}

const pad = (n: number) => String(n).padStart(2, '0')

export const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const daysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate()

export const getOccurrenceDates = (
  frequencyType: FrequencyType,
  startDate: string,
  endDate: string,
  config: RecurrenceConfig = {},
): string[] => {
  if (!startDate || !endDate) return []

  const start = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00`)
  const end = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59`)

  const rangeStart = new Date(start)
  rangeStart.setHours(0, 0, 0, 0)
  const rangeEnd = new Date(end)
  rangeEnd.setHours(23, 59, 59, 999)

  const dates: string[] = []

  if (frequencyType === 'once') {
    return [toDateKey(start)]
  }

  if (frequencyType === 'daily') {
    const current = new Date(rangeStart)
    while (current <= rangeEnd) {
      dates.push(toDateKey(current))
      current.setDate(current.getDate() + 1)
    }
    return dates
  }

  if (frequencyType === 'weekly') {
    const weeklyDays = getWeeklyRecurrenceDays(config)
    if (weeklyDays.length === 0) return []
    const daysSet = new Set(weeklyDays)
    const current = new Date(rangeStart)
    while (current <= rangeEnd) {
      if (daysSet.has(current.getDay())) {
        dates.push(toDateKey(current))
      }
      current.setDate(current.getDate() + 1)
    }
    return dates.sort()
  }

  if (frequencyType === 'monthly') {
    if (!config.recurrenceDayOfMonth) return []
    const dayOfMonth = config.recurrenceDayOfMonth
    let year = rangeStart.getFullYear()
    let month = rangeStart.getMonth()

    while (year < rangeEnd.getFullYear() || (year === rangeEnd.getFullYear() && month <= rangeEnd.getMonth())) {
      const maxDay = daysInMonth(year, month)
      if (dayOfMonth <= maxDay) {
        const candidate = new Date(year, month, dayOfMonth)
        if (candidate >= rangeStart && candidate <= rangeEnd) {
          dates.push(toDateKey(candidate))
        }
      }
      month += 1
      if (month > 11) {
        month = 0
        year += 1
      }
    }
    return dates
  }

  if (frequencyType === 'yearly') {
    if (!config.recurrenceMonth || !config.recurrenceDayOfMonth) return []
    const month = config.recurrenceMonth - 1
    const dayOfMonth = config.recurrenceDayOfMonth

    for (let year = rangeStart.getFullYear(); year <= rangeEnd.getFullYear(); year += 1) {
      const maxDay = daysInMonth(year, month)
      if (dayOfMonth <= maxDay) {
        const candidate = new Date(year, month, dayOfMonth)
        if (candidate >= rangeStart && candidate <= rangeEnd) {
          dates.push(toDateKey(candidate))
        }
      }
    }
    return dates
  }

  return dates
}

export const combineDateAndTime = (dateKey: string, time: string): string => {
  const [hours, minutes] = time.split(':').map(Number)
  const [y, m, d] = dateKey.split('-').map(Number)
  const combined = new Date(y!, m! - 1, d, hours, minutes)
  return combined.toISOString()
}

export const buildEventOccurrences = (
  dateKeys: string[],
  times: Record<string, { startTime: string; endTime: string }>,
): EventOccurrence[] => {
  return dateKeys
    .map((dateKey) => {
      const slot = times[dateKey]
      if (!slot?.startTime || !slot?.endTime) return null
      return {
        startDate: combineDateAndTime(dateKey, slot.startTime),
        endDate: combineDateAndTime(dateKey, slot.endTime),
      }
    })
    .filter((occ): occ is EventOccurrence => occ !== null)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
}

export const getLocalMonthDateRange = (referenceDate = new Date()) => {
  const year = referenceDate.getFullYear()
  const monthIndex = referenceDate.getMonth()
  return {
    dateFrom: new Date(year, monthIndex, 1, 0, 0, 0, 0).toISOString(),
    dateTo: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999).toISOString(),
  }
}

export const getLocalDayStart = (referenceDate = new Date()) => {
  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
    0,
  ).toISOString()
}

export const formatOccurrenceDateLabel = (dateKey: string): string => {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y!, m! - 1, d)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export const addMinutesToTime = (time: string, minutes: number): string => {
  if (!time) return time
  const [hours, mins] = time.split(':').map(Number)
  const totalMinutes = hours! * 60 + mins! + minutes
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const nextHours = Math.floor(normalized / 60)
  const nextMinutes = normalized % 60
  return `${pad(nextHours)}:${pad(nextMinutes)}`
}

export const getMinEndTime = (startTime: string): string => (startTime ? addMinutesToTime(startTime, 1) : '')

export const isEndTimeAfterStart = (startTime: string, endTime: string): boolean =>
  !!startTime && !!endTime && endTime > startTime

export const getNoOccurrencesMessage = (frequencyType: FrequencyType, config: RecurrenceConfig): string => {
  if (frequencyType === 'weekly') {
    const dayLabel = formatWeeklyDayLabels(getWeeklyRecurrenceDays(config))
    return `No ${dayLabel} falls within the selected start and end date range`
  }
  if (frequencyType === 'monthly') {
    return 'No matching dates fall within the selected start and end date range for the chosen day of month'
  }
  if (frequencyType === 'yearly') {
    return 'No matching dates fall within the selected start and end date range for the chosen date'
  }
  return 'No dates fall within the selected start and end date range'
}
