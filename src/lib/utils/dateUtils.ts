import { format, isValid, parseISO } from 'date-fns'

export const formatDisplayDate = (date: string | Date | null | undefined): string => {
  if (!date) return 'N/A'

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
