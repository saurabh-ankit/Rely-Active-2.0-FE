// Mirrors the BE incident enums (src/enums/incident.enum.ts).
export const IncidentType = {
  FALL_INJURY: 'fall_injury',
  SKIN_WOUND: 'skin_wound',
  BEHAVIOR: 'behavior',
  ENV_TEMP: 'env_temp',
  BATHROOM: 'bathroom',
  REFUSAL: 'refusal',
  OTHER: 'other',
} as const
export type IncidentType = (typeof IncidentType)[keyof typeof IncidentType]

export const IncidentSeverity = {
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const
export type IncidentSeverity = (typeof IncidentSeverity)[keyof typeof IncidentSeverity]

/** Incident types that come with a Standard Operating Procedure checklist. */
export const SOP_INCIDENT_TYPES: readonly IncidentType[] = [IncidentType.SKIN_WOUND, IncidentType.FALL_INJURY]

export const INCIDENT_TYPE_OPTIONS: { value: IncidentType; label: string }[] = [
  { value: IncidentType.FALL_INJURY, label: 'Fall/Injury' },
  { value: IncidentType.SKIN_WOUND, label: 'Skin/Wound' },
  { value: IncidentType.BEHAVIOR, label: 'Behavior' },
  { value: IncidentType.ENV_TEMP, label: 'Env/Temp' },
  { value: IncidentType.BATHROOM, label: 'Bathroom' },
  { value: IncidentType.REFUSAL, label: 'Refusal' },
  { value: IncidentType.OTHER, label: 'Other' },
]

export const INCIDENT_SEVERITY_OPTIONS: { value: IncidentSeverity; label: string; textClassName: string }[] = [
  { value: IncidentSeverity.LOW, label: 'Low', textClassName: 'text-emerald-600 dark:text-emerald-400' },
  { value: IncidentSeverity.MODERATE, label: 'Moderate', textClassName: 'text-amber-600 dark:text-amber-400' },
  { value: IncidentSeverity.HIGH, label: 'High', textClassName: 'text-orange-600 dark:text-orange-400' },
  { value: IncidentSeverity.CRITICAL, label: 'Critical', textClassName: 'text-red-600 dark:text-red-400' },
]
