import { Building, Building2, Castle, Home, Warehouse, type LucideIcon } from 'lucide-react'
import type { BlockInput, EntityInput, EntityType, LevelLabels, StructureLevel, UnitInput, UnitType } from '../../types'

export interface EntityPreset {
  label: string
  /** Default name for a new entity of this type. */
  name: string
  hint: string
  icon: LucideIcon
  levels: StructureLevel[]
  labels: LevelLabels
  unitType: UnitType
  /** Unit number prefix, e.g. "V-" gives V-01, V-02… */
  prefix: string
  /** Extra unit details shown as inputs in the generic unit table, stored in unit.attributes. */
  attributes: Array<{ key: string; label: string; suffix?: string }>
  defaultAttributes?: Record<string, unknown>
}

export const ENTITY_PRESETS: Record<EntityType, EntityPreset> = {
  apartment: {
    label: 'Apartment',
    name: 'Apartment',
    hint: 'Towers with floors and flats',
    icon: Building2,
    levels: ['block', 'floor', 'unit'],
    labels: { block: 'Tower', floor: 'Floor', unit: 'Flat' },
    unitType: '2BHK',
    prefix: 'A',
    attributes: [],
  },
  villa: {
    label: 'Villa',
    name: 'Villa',
    hint: 'Independent houses',
    icon: Home,
    levels: ['unit'],
    labels: { unit: 'Villa' },
    unitType: '3BHK',
    prefix: 'V-',
    attributes: [],
  },
  duplex: {
    label: 'Duplex',
    name: 'Duplex',
    hint: 'Two-storey homes',
    icon: Castle,
    levels: ['unit'],
    labels: { unit: 'Duplex' },
    unitType: '3BHK',
    prefix: 'D-',
    attributes: [],
  },
  triplex: {
    label: 'Triplex',
    name: 'Triplex',
    hint: 'Three-storey homes',
    icon: Castle,
    levels: ['unit'],
    labels: { unit: 'Triplex' },
    unitType: '3BHK',
    prefix: 'T-',
    attributes: [],
  },
}

export const ENTITY_TYPES = Object.keys(ENTITY_PRESETS) as EntityType[]

/** The four allowed nestings, in the order the builder offers them. */
export const LEVEL_OPTIONS: Array<{ levels: StructureLevel[]; label: string; hint: string; icon: LucideIcon }> = [
  { levels: ['block', 'floor', 'unit'], label: 'Block → Floor → Unit', hint: 'e.g. apartment towers', icon: Building2 },
  { levels: ['block', 'unit'], label: 'Block → Unit', hint: 'e.g. flats grouped by wing', icon: Warehouse },
  { levels: ['floor', 'unit'], label: 'Floor → Unit', hint: 'e.g. flats in one building', icon: Building },
  { levels: ['unit'], label: 'Units only', hint: 'e.g. a few standalone flats', icon: Home },
]

export const UNIT_TYPE_OPTIONS: UnitType[] = [
  '1BHK',
  '2BHK',
  '3BHK',
  '4BHK',
  '5BHK',
  'studio',
  'penthouse',
  'villa',
  'duplex',
  'triplex',
  'shop',
  'office',
]

export const sameLevels = (a: StructureLevel[], b: StructureLevel[]) =>
  a.length === b.length && a.every((level, i) => level === b[i])

export const isTowerEntity = (entity: Pick<EntityInput, 'levels'>) =>
  sameLevels(entity.levels, ['block', 'floor', 'unit'])

/** Villas, duplexes and triplexes are a simple list of homes, each edited on its own. */
export const isHomeEntity = (entity: Pick<EntityInput, 'levels' | 'entity_type'>) =>
  entity.entity_type !== 'apartment' && sameLevels(entity.levels, ['unit'])

export const HOME_BHK_OPTIONS: UnitType[] = ['1BHK', '2BHK', '3BHK', '4BHK', '5BHK']
export const CONFIGURATION_OPTIONS = ['G', 'G+1', 'G+2', 'G+3']
export const ASSET_FORM_OPTIONS = ['Apartment', 'Independent House', 'Row House']

const DEFAULT_LABELS: Record<StructureLevel, string> = { block: 'Block', floor: 'Floor', unit: 'Unit' }

/** What this entity calls a level, e.g. "Tower" for blocks or "Villa" for units. */
export const levelLabel = (entity: Pick<EntityInput, 'level_labels'>, level: StructureLevel) =>
  entity.level_labels?.[level]?.trim() || DEFAULT_LABELS[level]

export const newTower = (index: number): BlockInput => {
  const letter = String.fromCharCode(65 + (index % 26))
  return {
    block_name: `Tower ${letter}`,
    prefix: letter,
    total_floors: 3,
    units_per_floor: 3,
    nomenclature_template: '{{TowerPrefix}}-{{FloorNumber}}{{Position}}',
    bhk_templates: [],
    floors: [],
  }
}

// ─── Homes: villas, duplexes, triplexes ─────────────────────────────────────

/** Details a home carries, read from / written to its unit fields and attributes. */
export interface HomeDetails {
  plotArea: number | null
  carpetArea: number | null
  configuration: string | null
  assetForm: string | null
  bhk: UnitType
  pricePerSqft: number | null
}

const attr = (unit: UnitInput, key: string) => {
  const value = unit.attributes?.[key]
  return value === undefined || value === null || value === '' ? null : value
}

export const readHome = (unit: UnitInput): HomeDetails => ({
  plotArea: unit.built_up_area ?? (attr(unit, 'plot_area') as number | null),
  carpetArea: unit.carpet_area ?? null,
  configuration: (attr(unit, 'configuration') as string | null) ?? null,
  assetForm: (attr(unit, 'asset_form') as string | null) ?? null,
  bhk: unit.unit_type,
  pricePerSqft: unit.price_per_sqft ?? null,
})

/** Villas are priced on the plot; duplexes/triplexes on carpet area. */
export const homePrice = (entity: Pick<EntityInput, 'entity_type'>, home: HomeDetails) => {
  const basis = entity.entity_type === 'villa' ? home.plotArea : home.carpetArea
  return home.pricePerSqft && basis ? Math.round(home.pricePerSqft * basis) : null
}

/** Writes `details` onto a unit, keeping its number, id, status and other attributes. */
export function writeHome(entity: Pick<EntityInput, 'entity_type'>, unit: UnitInput, details: HomeDetails): UnitInput {
  const isVilla = entity.entity_type === 'villa'
  return {
    ...unit,
    unit_type: details.bhk,
    built_up_area: details.plotArea,
    carpet_area: isVilla ? null : details.carpetArea,
    price_per_sqft: details.pricePerSqft,
    price: homePrice(entity, details),
    attributes: {
      ...(unit.attributes ?? {}),
      plot_area: details.plotArea,
      configuration: isVilla ? details.configuration : null,
      asset_form: isVilla ? null : details.assetForm,
    },
  }
}

export const defaultHomeDetails = (entity: Pick<EntityInput, 'entity_type'>): HomeDetails =>
  entity.entity_type === 'villa'
    ? { plotArea: 2400, carpetArea: null, configuration: 'G+1', assetForm: null, bhk: '3BHK', pricePerSqft: 5000 }
    : {
        plotArea: null,
        carpetArea: null,
        configuration: null,
        assetForm: 'Independent House',
        bhk: '3BHK',
        pricePerSqft: 5000,
      }

export function newHome(
  entity: Pick<EntityInput, 'entity_type'>,
  unitNumber: string,
  details?: HomeDetails,
): UnitInput {
  const base: UnitInput = { unit_number: unitNumber, unit_type: '3BHK', status: 'available' }
  return writeHome(entity, base, details ?? defaultHomeDetails(entity))
}

/** The next `count` free numbers like V-04, V-05… (the prefix comes from the entity's kind). */
export function nextHomeNumbers(entity: EntityInput, taken: string[], count: number): string[] {
  const prefix = ENTITY_PRESETS[entity.entity_type].prefix
  const used = new Set(taken.map((n) => n.trim().toLowerCase()))
  const result: string[] = []
  for (let i = 1; result.length < count && i < 100000; i++) {
    const candidate = `${prefix}${String(i).padStart(2, '0')}`
    if (!used.has(candidate.toLowerCase())) result.push(candidate)
  }
  return result
}

/** Problems with one home, e.g. "V-01: Plot size should be greater than 0." */
export function homeErrors(entity: Pick<EntityInput, 'entity_type'>, unit: UnitInput): string[] {
  const errors: string[] = []
  const name = unit.unit_number.trim() || 'This home'
  const home = readHome(unit)
  if (!unit.unit_number.trim()) errors.push('Number is required.')
  if (entity.entity_type === 'villa' && !((home.plotArea ?? 0) > 0)) {
    errors.push(`${name}: Plot size should be greater than 0.`)
  }
  if (entity.entity_type !== 'villa' && !((home.carpetArea ?? 0) > 0)) {
    errors.push(`${name}: Carpet area should be greater than 0.`)
  }
  if ((home.plotArea ?? 0) < 0) errors.push(`${name}: Plot size can’t be negative.`)
  if ((home.pricePerSqft ?? 0) < 0) errors.push(`${name}: Price per sqft can’t be negative.`)
  return errors
}

/** The entity's homes plus `count` new ones with `units[sourceIndex]`'s details and the next free numbers. */
export function addHomesLike(entity: EntityInput, sourceIndex: number, count: number, taken: string[]): UnitInput[] {
  const units = [...(entity.units ?? [])]
  const source = units[sourceIndex]
  const details = source ? readHome(source) : defaultHomeDetails(entity)
  const numbers = nextHomeNumbers(entity, [...taken, ...units.map((u) => u.unit_number)], count)
  return [...units, ...numbers.map((n) => newHome(entity, n, details))]
}

/** Every home gets `units[sourceIndex]`'s details; numbers, ids and status stay their own. */
export function applyHomeToAll(entity: EntityInput, sourceIndex: number): UnitInput[] {
  const units = entity.units ?? []
  const source = units[sourceIndex]
  if (!source) return units
  const details = readHome(source)
  return units.map((u, i) => (i === sourceIndex ? u : writeHome(entity, u, details)))
}

// ─── Entities ───────────────────────────────────────────────────────────────

/** A new entity of the given type, with starter content so the builder isn't empty. */
export function createEntity(
  type: EntityType,
  overrides: Partial<Pick<EntityInput, 'name' | 'levels' | 'level_labels'>> = {},
): EntityInput {
  const preset = ENTITY_PRESETS[type]
  const levels = overrides.levels ?? preset.levels
  const entity: EntityInput = {
    entity_type: type,
    name: overrides.name ?? preset.name,
    levels,
    level_labels: overrides.level_labels ?? preset.labels,
  }
  const top = levels[0]
  if (sameLevels(levels, ['block', 'floor', 'unit'])) entity.blocks = [newTower(0)]
  else if (isHomeEntity(entity)) entity.units = [newHome(entity, `${preset.prefix}01`)]
  else if (top === 'block') entity.blocks = [{ block_name: `${levelLabel(entity, 'block')} 1`, units: [] }]
  else if (top === 'floor') entity.floors = [{ floor_number: 0, floor_name: 'Ground', units: [] }]
  else entity.units = []
  return entity
}

/** Number of units the entity holds (tower units are counted from floors × units per floor). */
export function countUnits(entity: EntityInput): number {
  if (isTowerEntity(entity)) {
    return (entity.blocks ?? []).reduce((sum, b) => sum + (b.total_floors || 0) * (b.units_per_floor || 0), 0)
  }
  return (
    (entity.units?.length ?? 0) +
    (entity.floors ?? []).reduce((sum, f) => sum + (f.units?.length ?? 0), 0) +
    (entity.blocks ?? []).reduce((sum, b) => sum + (b.units?.length ?? 0), 0)
  )
}

/** Every unit number in the property, for duplicate checks and quick-add. */
export function allUnitNumbers(entities: EntityInput[]): string[] {
  return entities
    .flatMap((e) => [
      ...(e.units ?? []),
      ...(e.floors ?? []).flatMap((f) => f.units ?? []),
      ...(e.blocks ?? []).flatMap((b) => [...(b.units ?? []), ...(b.floors ?? []).flatMap((f) => f.units ?? [])]),
    ])
    .map((u) => u.unit_number)
}

export const newUnit = (entity: EntityInput, unitNumber: string): UnitInput => {
  const preset = ENTITY_PRESETS[entity.entity_type]
  return {
    unit_number: unitNumber,
    unit_type: preset.unitType,
    status: 'available',
    attributes: preset.defaultAttributes ? { ...preset.defaultAttributes } : null,
  }
}

const NUMERIC_BLOCK_FIELDS = ['price_per_sqft', 'total_floors', 'units_per_floor'] as const
const NUMERIC_UNIT_FIELDS = ['carpet_area', 'built_up_area', 'super_built_up_area', 'price', 'price_per_sqft'] as const

const toNumbers = <T extends object>(row: T, keys: readonly string[]): T => {
  const next = { ...row } as Record<string, unknown>
  for (const key of keys) {
    const value = next[key]
    if (typeof value === 'string') next[key] = value.trim() === '' ? null : Number(value)
  }
  return next as T
}

/** The API returns DECIMAL columns as strings ("5000.00"); turn them back into numbers for the editors. */
export function normalizeEntity(entity: EntityInput): EntityInput {
  return {
    ...entity,
    blocks: entity.blocks?.map((block) => toNumbers(block, NUMERIC_BLOCK_FIELDS)),
    units: entity.units?.map((unit) => toNumbers(unit, NUMERIC_UNIT_FIELDS)),
  }
}

// ─── Towers: copy & bulk add ────────────────────────────────────────────────

/** Next tower with an unused letter/prefix (Tower E after A–D). */
export function nextFreeTower(blocks: BlockInput[]): BlockInput {
  const used = new Set(blocks.flatMap((b) => [b.prefix?.trim().toUpperCase(), b.block_name.trim().toUpperCase()]))
  for (let i = 0; i < 26 * 4; i++) {
    const letter = i < 26 ? String.fromCharCode(65 + i) : `${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26)}`
    if (!used.has(letter) && !used.has(`TOWER ${letter}`)) {
      return { ...newTower(0), block_name: `Tower ${letter}`, prefix: letter }
    }
  }
  return newTower(blocks.length)
}

/**
 * `target` with `source`'s tower setup. The tower keeps its own name, prefix and ids (block,
 * floors, units), so its units keep their own numbering and anything linked to them stays attached.
 */
export function copyBlockSetup(source: BlockInput, target: BlockInput): BlockInput {
  const floors = (source.floors ?? []).map((f) => {
    const existing = target.floors?.find((tf) => tf.floor_number === f.floor_number)
    return {
      floor_number: f.floor_number,
      floor_name: f.floor_name ?? null,
      floor_type: f.floor_type ?? null,
      ...(f.is_sellable !== undefined ? { is_sellable: f.is_sellable } : {}),
      ...(existing?.id ? { id: existing.id } : {}),
      // The tower's own units (and ids) stay; they're regenerated from the copied setup.
      units: existing?.units ?? [],
    }
  })
  return {
    ...target,
    total_floors: source.total_floors ?? null,
    units_per_floor: source.units_per_floor ?? null,
    price_per_sqft: source.price_per_sqft ?? null,
    nomenclature_template: source.nomenclature_template ?? null,
    bhk_templates: structuredClone(source.bhk_templates ?? []),
    floors,
  }
}

/** The entity's towers plus `count` new ones set up like `blocks[sourceIndex]`. */
export function addBlocksLike(entity: EntityInput, sourceIndex: number, count: number): BlockInput[] {
  const blocks = [...(entity.blocks ?? [])]
  const source = blocks[sourceIndex]
  if (!source) return blocks
  for (let i = 0; i < count; i++) {
    blocks.push(copyBlockSetup(source, { ...nextFreeTower(blocks), floors: [] }))
  }
  return blocks
}

// ─── Occupancy (units with residents can't be deleted) ──────────────────────

const isOccupied = (unit: UnitInput) =>
  (unit.residents ?? []).some((r) => !r.isDeleted && r.status !== 'INACTIVE' && r.status !== 'MOVED_OUT')

const blockUnits = (block: BlockInput): UnitInput[] => [
  ...(block.units ?? []),
  ...(block.floors ?? []).flatMap((f) => f.units ?? []),
]

/** Numbers of the occupied units in a tower/block, e.g. ["A-11", "A-12"]. */
export const occupiedInBlock = (block: BlockInput) =>
  blockUnits(block)
    .filter(isOccupied)
    .map((u) => u.unit_number)

/** Numbers of the occupied units anywhere in an entity. */
export const occupiedInEntity = (entity: EntityInput) =>
  [
    ...(entity.units ?? []),
    ...(entity.floors ?? []).flatMap((f) => f.units ?? []),
    ...(entity.blocks ?? []).flatMap(blockUnits),
  ]
    .filter(isOccupied)
    .map((u) => u.unit_number)

export const isUnitOccupied = isOccupied

/** "A-11, A-12 and 3 more" */
export const listNumbers = (numbers: string[], max = 3) =>
  numbers.length <= max ? numbers.join(', ') : `${numbers.slice(0, max).join(', ')} and ${numbers.length - max} more`
