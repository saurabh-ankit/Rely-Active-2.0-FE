// Mirrors the BE `MedicationRoute` / `MedicationMealTiming` enums (src/enums/medication.enum.ts).
export const MedicationRoute = {
  ORAL: 'oral',
  IV: 'iv',
  IM: 'im',
  SC: 'sc',
  TOPICAL: 'topical',
  INHALATION: 'inhalation',
  RECTAL: 'rectal',
  OTHER: 'other',
} as const
export type MedicationRoute = (typeof MedicationRoute)[keyof typeof MedicationRoute]

export const MedicationMealTiming = {
  BEFORE_FOOD: 'before_food',
  AFTER_FOOD: 'after_food',
  WITH_FOOD: 'with_food',
  NONE: 'none',
} as const
export type MedicationMealTiming = (typeof MedicationMealTiming)[keyof typeof MedicationMealTiming]
