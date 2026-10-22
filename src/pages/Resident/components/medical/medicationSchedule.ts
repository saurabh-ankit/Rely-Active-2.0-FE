import { format } from 'date-fns'
import type {
  MedicationAdministrationItem,
  MedicationAdministrationKind,
  ResidentMedicationItem,
} from '@/lib/types/resident'
import { WHOLE_PACK_TYPES } from './clinicalConstants'
import { toDateInputValue } from './clinicalFormUtils'

/** Today's administrations keyed by `${kind}:${medicationId}:${timeOfDay}`. */
export type TodayAdministrations = Map<string, MedicationAdministrationItem>

export const administrationKey = (kind: MedicationAdministrationKind, medicationId: string, timeOfDay: string) =>
  `${kind}:${medicationId}:${timeOfDay}`

export type MedicationDayStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'UPCOMING' | 'ENDED' | 'NOT_SCHEDULED'

/** Where a medication stands today, from its dates and today's administrations. */
export function medicationDayStatus(
  med: ResidentMedicationItem,
  kind: MedicationAdministrationKind,
  today: string,
  administrations: TodayAdministrations,
): MedicationDayStatus {
  const start = toDateInputValue(med.startDate)
  const end = med.endDate ? toDateInputValue(med.endDate) : ''
  if (start > today) return 'UPCOMING'
  if (!med.isUntilDischarge && end && end < today) return 'ENDED'

  const selected = med.timings.filter((t) => t.selected)
  if (selected.length === 0) return 'NOT_SCHEDULED'
  const statuses = selected.map((t) => administrations.get(administrationKey(kind, med.id, t.timeOfDay))?.status)
  if (statuses.some((s) => !s)) return 'PENDING'
  return statuses.every((s) => s === 'CANCELLED') ? 'CANCELLED' : 'COMPLETED'
}

/** "20:30" -> "8:30 PM" */
export function formatTime12h(time: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time || '')
  if (!match) return time
  const hours = Number(match[1])
  return `${hours % 12 || 12}:${match[2]} ${hours >= 12 ? 'PM' : 'AM'}`
}

/** "2026-10-10" -> "10 Oct 2026" */
export function formatCardDate(value: string | null): string {
  const ymd = toDateInputValue(value)
  if (!ymd) return '—'
  const date = new Date(`${ymd}T00:00:00`)
  return Number.isNaN(date.getTime()) ? ymd : format(date, 'dd MMM yyyy')
}

/** Unit shown after a dose: insulin in units, whole packs per dose, otherwise the pack unit. */
export function doseUnitLabel(kind: MedicationAdministrationKind, med: ResidentMedicationItem): string {
  if (kind === 'INSULIN') return 'units'
  const packType = (med.packType || '').toLowerCase()
  if (!med.packUnit || WHOLE_PACK_TYPES.includes(packType)) return 'dose'
  return med.packUnit.toLowerCase() === 'piece' ? 'pcs' : med.packUnit
}
