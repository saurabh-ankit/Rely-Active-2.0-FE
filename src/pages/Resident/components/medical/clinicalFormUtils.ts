import { format } from 'date-fns'

/** ISO timestamp -> value for an `<input type="datetime-local">` in the browser's timezone. */
export const toDateTimeInputValue = (value?: string | null): string => {
  const date = value ? new Date(value) : new Date()
  return format(Number.isNaN(date.getTime()) ? new Date() : date, "yyyy-MM-dd'T'HH:mm")
}

export const fromDateTimeInputValue = (value: string): string => new Date(value).toISOString()

/** Date-only API value (or ISO) -> value for an `<input type="date">`. */
export const toDateInputValue = (value?: string | null): string => (value ? value.slice(0, 10) : '')

export const todayDateInputValue = (): string => format(new Date(), 'yyyy-MM-dd')

/** `YYYY-MM-DD` that is also a real calendar date (rejects e.g. 2026-02-31). */
export const isValidDateInput = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00`)
  return !Number.isNaN(date.getTime()) && format(date, 'yyyy-MM-dd') === value
}

export const isValidDateTimeInput = (value: string): boolean => !!value && !Number.isNaN(new Date(value).getTime())
