import { format, isValid, parseISO } from 'date-fns'

export const formatDisplayDate = (date: string | Date | null | undefined): string => {
  if (!date) return '—'

  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`
    }
  }

  try {
    const parsedDate = date instanceof Date ? date : parseISO(String(date))
    if (isValid(parsedDate)) return format(parsedDate, 'dd/MM/yyyy')

    const fallbackDate = new Date(date)
    if (isValid(fallbackDate)) return format(fallbackDate, 'dd/MM/yyyy')
  } catch {
    // Ignore parsing errors and fall back to the original value.
  }

  return String(date)
}

export const formatDateDDMMYYYY = formatDisplayDate
