import { format, parseISO } from 'date-fns'
import type { ReportColumnType } from '@/lib/types/report'

const money = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

/** A preview cell as the Excel file shows it: dates as `05 Nov 2026`, amounts as `₹1,23,456.00`. */
export function formatCell(type: ReportColumnType, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  if (type === 'money' || type === 'number') {
    const n = Number(value)
    if (!Number.isFinite(n)) return String(value)
    return type === 'money' ? `₹${money.format(n)}` : number.format(n)
  }
  if (type === 'date' || type === 'datetime') {
    const d = parseISO(String(value).replace(' ', 'T'))
    if (Number.isNaN(d.getTime())) return String(value)
    return format(d, type === 'date' ? 'dd MMM yyyy' : 'dd MMM yyyy, hh:mm a')
  }
  return String(value)
}

export const isNumeric = (type: ReportColumnType) => type === 'money' || type === 'number'
