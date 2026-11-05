import { differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth, subDays, subMonths } from 'date-fns'
import { formatDateToYmd } from '@/components/ui/date-picker'

export type DatePreset = 'today' | 'last7' | 'thisMonth' | 'lastMonth' | 'last3Months'

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'last3Months', label: 'Last 3 months' },
]

/** The From / To days (`YYYY-MM-DD`) of a quick-pick range. */
export function presetRange(preset: DatePreset): [string, string] {
  const today = new Date()
  const ymd = formatDateToYmd
  switch (preset) {
    case 'today':
      return [ymd(today), ymd(today)]
    case 'last7':
      return [ymd(subDays(today, 6)), ymd(today)]
    case 'thisMonth':
      return [ymd(startOfMonth(today)), ymd(today)]
    case 'lastMonth': {
      const last = subMonths(today, 1)
      return [ymd(startOfMonth(last)), ymd(endOfMonth(last))]
    }
    case 'last3Months':
      return [ymd(startOfMonth(subMonths(today, 2))), ymd(today)]
  }
}

/** The quick pick that gives exactly this range, if any. */
export const matchingPreset = (from: string, to: string) =>
  DATE_PRESETS.find((p) => {
    const [f, t] = presetRange(p.value)
    return f === from && t === to
  })?.value ?? null

const isYmd = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseISO(value).getTime())

export const rangeDays = (from: string, to: string) =>
  isYmd(from) && isYmd(to) ? differenceInCalendarDays(parseISO(to), parseISO(from)) + 1 : 0

/** Why the range can't be used, or null when it is fine. */
export function rangeError(from: string, to: string, maxDays: number): string | null {
  if (!isYmd(from) || !isYmd(to)) return 'Choose both a From and a To date.'
  const days = rangeDays(from, to)
  if (days < 1) return 'The From date must be on or before the To date.'
  if (days > maxDays) return `The date range can be at most ${maxDays} days. Choose a shorter range.`
  return null
}

export const prettyDay = (ymd: string) => format(parseISO(ymd), 'dd MMM yyyy')
