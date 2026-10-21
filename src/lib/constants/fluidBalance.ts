// Mirrors the BE fluid balance enums (src/enums/fluidBalance.enum.ts).
export const FluidBalanceCategory = {
  INTAKE: 'INTAKE',
  OUTPUT: 'OUTPUT',
  BOWEL: 'BOWEL',
} as const
export type FluidBalanceCategory = (typeof FluidBalanceCategory)[keyof typeof FluidBalanceCategory]

export const FluidIntakeType = {
  ORAL_NG: 'oral_ng',
  NASAL_FEED: 'nasal_feed',
  IV_FLUIDS: 'iv_fluids',
} as const
export type FluidIntakeType = (typeof FluidIntakeType)[keyof typeof FluidIntakeType]

export const IvFluidType = {
  NS: 'ns',
  NS_WITH_INJECTION: 'ns_with_injection',
  DNS: 'dns',
  RL: 'rl',
  D5: 'd5',
  D25: 'd25',
} as const
export type IvFluidType = (typeof IvFluidType)[keyof typeof IvFluidType]

export const FluidOutputType = {
  URINE: 'urine',
  VOMIT_DRAIN: 'vomit_drain',
} as const
export type FluidOutputType = (typeof FluidOutputType)[keyof typeof FluidOutputType]

export const FluidUnit = {
  ML: 'ml',
  L: 'l',
} as const
export type FluidUnit = (typeof FluidUnit)[keyof typeof FluidUnit]

export const StoolType = {
  HARD: 'hard',
  NORMAL: 'normal',
  LOOSE: 'loose',
} as const
export type StoolType = (typeof StoolType)[keyof typeof StoolType]

export const BowelComfortLevel = {
  EASY: 'easy',
  STRAINED: 'strained',
  PAINFUL: 'painful',
} as const
export type BowelComfortLevel = (typeof BowelComfortLevel)[keyof typeof BowelComfortLevel]

export interface FluidOption<T extends string> {
  value: T
  label: string
}

export const FLUID_INTAKE_TYPE_OPTIONS: FluidOption<FluidIntakeType>[] = [
  { value: FluidIntakeType.ORAL_NG, label: 'Oral / NG' },
  { value: FluidIntakeType.NASAL_FEED, label: 'Nasal Feed' },
  { value: FluidIntakeType.IV_FLUIDS, label: 'IV Fluids' },
]

export const IV_FLUID_TYPE_OPTIONS: FluidOption<IvFluidType>[] = [
  { value: IvFluidType.NS, label: 'NS' },
  { value: IvFluidType.NS_WITH_INJECTION, label: 'NS with Injection' },
  { value: IvFluidType.DNS, label: 'DNS' },
  { value: IvFluidType.RL, label: 'RL' },
  { value: IvFluidType.D5, label: 'D5' },
  { value: IvFluidType.D25, label: 'D25' },
]

export const FLUID_OUTPUT_TYPE_OPTIONS: FluidOption<FluidOutputType>[] = [
  { value: FluidOutputType.URINE, label: 'Urine' },
  { value: FluidOutputType.VOMIT_DRAIN, label: 'Vomit / Drain' },
]

export const FLUID_UNIT_OPTIONS: FluidOption<FluidUnit>[] = [
  { value: FluidUnit.ML, label: 'ml' },
  { value: FluidUnit.L, label: 'L' },
]

export const STOOL_TYPE_OPTIONS: FluidOption<StoolType>[] = [
  { value: StoolType.HARD, label: 'Hard' },
  { value: StoolType.NORMAL, label: 'Normal' },
  { value: StoolType.LOOSE, label: 'Loose' },
]

export const BOWEL_COMFORT_OPTIONS: FluidOption<BowelComfortLevel>[] = [
  { value: BowelComfortLevel.EASY, label: 'Easy' },
  { value: BowelComfortLevel.STRAINED, label: 'Strained' },
  { value: BowelComfortLevel.PAINFUL, label: 'Painful' },
]

export const FLUID_CATEGORY_LABELS: Record<FluidBalanceCategory, string> = {
  [FluidBalanceCategory.INTAKE]: 'Intake',
  [FluidBalanceCategory.OUTPUT]: 'Output',
  [FluidBalanceCategory.BOWEL]: 'Bowel',
}
