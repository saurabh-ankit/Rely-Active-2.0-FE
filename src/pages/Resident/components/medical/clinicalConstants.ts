import { MedicationMealTiming, MedicationRoute } from '@/lib/constants/medication'
import type { DiagnosisCondition, LabReportSeverity, MedicationTimeOfDay } from '@/lib/types/resident'
import type { LabPaymentMethod } from '@/lib/types/medical'

export const TIME_OF_DAY_LABELS: Record<MedicationTimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
}

export const TIME_OF_DAY_DEFAULT_TIMES: Record<MedicationTimeOfDay, string> = {
  morning: '08:00',
  afternoon: '13:00',
  evening: '18:00',
  night: '21:00',
}

export const ROUTE_LABELS: Record<MedicationRoute, string> = {
  [MedicationRoute.ORAL]: 'Oral',
  [MedicationRoute.IV]: 'IV',
  [MedicationRoute.IM]: 'IM',
  [MedicationRoute.SC]: 'SC',
  [MedicationRoute.TOPICAL]: 'Topical',
  [MedicationRoute.INHALATION]: 'Inhalation',
  [MedicationRoute.RECTAL]: 'Rectal',
  [MedicationRoute.OTHER]: 'Other',
}

/** Table display; "none" renders nothing. */
export const MEAL_TIMING_LABELS: Record<MedicationMealTiming, string> = {
  [MedicationMealTiming.BEFORE_FOOD]: 'Before food',
  [MedicationMealTiming.AFTER_FOOD]: 'After food',
  [MedicationMealTiming.WITH_FOOD]: 'With food',
  [MedicationMealTiming.NONE]: '',
}

export const MEAL_TIMING_OPTIONS: Array<{ value: MedicationMealTiming; label: string }> = [
  { value: MedicationMealTiming.BEFORE_FOOD, label: 'Before food' },
  { value: MedicationMealTiming.AFTER_FOOD, label: 'After food' },
  { value: MedicationMealTiming.WITH_FOOD, label: 'With food' },
  { value: MedicationMealTiming.NONE, label: 'Any time' },
]

/** Compact chip label on the medication timing tiles; "none" renders nothing. */
export const MEAL_TIMING_SHORT_LABELS: Record<MedicationMealTiming, string> = {
  [MedicationMealTiming.BEFORE_FOOD]: 'Before',
  [MedicationMealTiming.AFTER_FOOD]: 'After',
  [MedicationMealTiming.WITH_FOOD]: 'With',
  [MedicationMealTiming.NONE]: '',
}

/** Pack types issued whole (matches the backend); their doses are not counted in pack units. */
export const WHOLE_PACK_TYPES = ['bottle', 'tube', 'vial', 'ampoule', 'jar', 'can', 'container']

export const LAB_REPORT_SEVERITY_LABELS: Record<LabReportSeverity, string> = {
  normal: 'Normal',
  abnormal: 'Abnormal',
  severe: 'Severe',
}

export const PAYMENT_METHOD_LABELS: Record<LabPaymentMethod, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  UPI: 'UPI',
  NEFT: 'NEFT',
  RTGS: 'RTGS',
  CARD: 'Card',
  OTHER: 'Other',
}

export const CONDITION_STYLES: Record<DiagnosisCondition, string> = {
  CRITICAL: 'border-rose-200 bg-rose-50 text-rose-700',
  STABLE: 'border-blue-200 bg-blue-50 text-blue-700',
  RECOVERING: 'border-amber-200 bg-amber-50 text-amber-700',
  GOOD: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

export const CONDITION_DOT_STYLES: Record<DiagnosisCondition, string> = {
  CRITICAL: 'bg-rose-500',
  STABLE: 'bg-blue-500',
  RECOVERING: 'bg-amber-500',
  GOOD: 'bg-emerald-500',
}

export const CONDITION_OPTIONS: Array<{ value: DiagnosisCondition; label: string }> = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'STABLE', label: 'Stable' },
  { value: 'RECOVERING', label: 'Recovering' },
  { value: 'GOOD', label: 'Good' },
]
